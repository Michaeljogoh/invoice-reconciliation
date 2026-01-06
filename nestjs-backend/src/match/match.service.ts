import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { MatchStatus } from '../common/enums/match-status.enum';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';

export interface MatchCandidate {
  id: string;
  tenantId: string;
  invoiceId: string;
  bankTransactionId: string;
  score: number;
  status: MatchStatus;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
  invoice?: any;
  transaction?: any;
}

@Injectable()
export class MatchService {
  constructor(
    private configService: ConfigService,
    private invoiceService: InvoiceService,
  ) {}

  private get db() {
    return getDatabase(this.configService);
  }

  async findCandidates(tenantId: string, status?: MatchStatus): Promise<MatchCandidate[]> {
    let query = this.db
      .select({
        match: schema.matchCandidates,
        invoice: schema.invoices,
        transaction: schema.bankTransactions,
      })
      .from(schema.matchCandidates)
      .leftJoin(schema.invoices, eq(schema.matchCandidates.invoiceId, schema.invoices.id))
      .leftJoin(
        schema.bankTransactions,
        eq(schema.matchCandidates.bankTransactionId, schema.bankTransactions.id)
      )
      .$dynamic() 
      .where(eq(schema.matchCandidates.tenantId, tenantId));

    if (status) {
      query = query.where(eq(schema.matchCandidates.status, status));
    }

    const results = await query.orderBy(schema.matchCandidates.score);

    return results.map((result) => ({
      ...this.mapToCandidate(result.match),
      invoice: result.invoice,
      transaction: result.transaction,
    }));
  }

  async findById(tenantId: string, id: string): Promise<MatchCandidate | null> {
    const [result] = await this.db
      .select({
        match: schema.matchCandidates,
        invoice: schema.invoices,
        transaction: schema.bankTransactions,
      })
      .from(schema.matchCandidates)
      .leftJoin(schema.invoices, eq(schema.matchCandidates.invoiceId, schema.invoices.id))
      .leftJoin(
        schema.bankTransactions,
        eq(schema.matchCandidates.bankTransactionId, schema.bankTransactions.id)
      )
      .where(
        and(
          eq(schema.matchCandidates.id, id),
          eq(schema.matchCandidates.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      ...this.mapToCandidate(result.match),
      invoice: result.invoice,
      transaction: result.transaction,
    };
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<MatchCandidate> {
    const match = await this.findById(tenantId, id);
    if (!match) {
      throw new NotFoundException(`Match candidate with ID ${id} not found`);
    }
    return match;
  }

  async confirm(tenantId: string, matchId: string): Promise<MatchCandidate> {
    return this.db.transaction(async (tx) => {
      // Get the match candidate
      const match = await this.findByIdOrThrow(tenantId, matchId);

      // Check if already confirmed
      if (match.status === MatchStatus.CONFIRMED) {
        throw new ConflictException('Match is already confirmed');
      }

      // Check if invoice already has a confirmed match
      const existingConfirmed = await tx
        .select()
        .from(schema.matchCandidates)
        .where(
          and(
            eq(schema.matchCandidates.invoiceId, match.invoiceId),
            eq(schema.matchCandidates.status, MatchStatus.CONFIRMED)
          )
        )
        .limit(1);

      if (existingConfirmed.length > 0) {
        throw new ConflictException(
          'Invoice already has a confirmed match. Please reject the existing match first.'
        );
      }

      // Update match status
      const [updatedMatch] = await tx
        .update(schema.matchCandidates)
        .set({
          status: MatchStatus.CONFIRMED,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.matchCandidates.id, matchId),
            eq(schema.matchCandidates.tenantId, tenantId)
          )
        )
        .returning();

      // Update invoice status
      await tx
        .update(schema.invoices)
        .set({ status: InvoiceStatus.PAID })
        .where(eq(schema.invoices.id, match.invoiceId));

      // Reject other candidates for the same invoice
      await tx
        .update(schema.matchCandidates)
        .set({
          status: MatchStatus.REJECTED,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.matchCandidates.invoiceId, match.invoiceId),
            eq(schema.matchCandidates.tenantId, tenantId),
            eq(schema.matchCandidates.status, MatchStatus.PROPOSED)
          )
        );

      return this.mapToCandidate(updatedMatch);
    });
  }

  async reject(tenantId: string, matchId: string): Promise<MatchCandidate> {
    const [updatedMatch] = await this.db
      .update(schema.matchCandidates)
      .set({
        status: MatchStatus.REJECTED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.matchCandidates.id, matchId),
          eq(schema.matchCandidates.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedMatch) {
      throw new NotFoundException(`Match candidate with ID ${matchId} not found`);
    }

    return this.mapToCandidate(updatedMatch);
  }

  async createCandidate(
    tenantId: string,
    invoiceId: string,
    transactionId: string,
    score: number,
    explanation?: string
  ): Promise<MatchCandidate> {
    // Check for existing candidate
    const [existing] = await this.db
      .select()
      .from(schema.matchCandidates)
      .where(
        and(
          eq(schema.matchCandidates.tenantId, tenantId),
          eq(schema.matchCandidates.invoiceId, invoiceId),
          eq(schema.matchCandidates.bankTransactionId, transactionId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing candidate
      const [updated] = await this.db
        .update(schema.matchCandidates)
        .set({
          score,
          explanation,
          updatedAt: new Date(),
        })
        .where(eq(schema.matchCandidates.id, existing.id))
        .returning();

      return this.mapToCandidate(updated);
    }

    // Create new candidate
    const [created] = await this.db
      .insert(schema.matchCandidates)
      .values({
        tenantId,
        invoiceId,
        bankTransactionId: transactionId,
        score,
        status: MatchStatus.PROPOSED,
        explanation,
      })
      .returning();

    return this.mapToCandidate(created);
  }

  private mapToCandidate(data: any): MatchCandidate {
    return {
      id: data.id,
      tenantId: data.tenantId,
      invoiceId: data.invoiceId,
      bankTransactionId: data.bankTransactionId,
      score: data.score,
      status: data.status,
      explanation: data.explanation,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}