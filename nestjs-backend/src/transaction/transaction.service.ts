import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { BulkImportTransactionsDto } from '../dto/bulk-import-transactions.dto';
import { eq, and, inArray } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface BankTransaction {
  id: string;
  tenantId: string;
  externalId?: string;
  postedAt: Date;
  amount: string;
  currency: string;
  description: string;
  reference?: string;
  createdAt: Date;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: string[];
  transactions: BankTransaction[];
}

@Injectable()
export class TransactionService {
  constructor(private configService: ConfigService) {}

  private get db() {
    return getDatabase(this.configService);
  }

  async bulkImport(
    tenantId: string,
    dto: BulkImportTransactionsDto,
    idempotencyKey?: string,
    requestPath?: string,
    requestMethod?: string
  ): Promise<ImportResult> {
    // Handle idempotency
    if (idempotencyKey) {
      const cachedResult = await this.handleIdempotency(
        tenantId,
        idempotencyKey,
        dto,
        requestPath,
        requestMethod
      );
      if (cachedResult) {
        return cachedResult;
      }
    }

    const results: ImportResult = {
      imported: 0,
      duplicates: 0,
      errors: [],
      transactions: [],
    };

    // Process transactions in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < dto.transactions.length; i += batchSize) {
      batches.push(dto.transactions.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchResult = await this.processBatch(tenantId, batch);
      results.imported += batchResult.imported;
      results.duplicates += batchResult.duplicates;
      results.errors.push(...batchResult.errors);
      results.transactions.push(...batchResult.transactions);
    }

    // Cache result for idempotency
    if (idempotencyKey) {
      await this.cacheIdempotencyResult(
        tenantId,
        idempotencyKey,
        dto,
        requestPath,
        requestMethod,
        results
      );
    }

    return results;
  }

  private async processBatch(
    tenantId: string,
    batch: any[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      duplicates: 0,
      errors: [],
      transactions: [],
    };

    // Check for existing transactions by external ID
    const externalIds = batch
      .filter(t => t.externalId)
      .map(t => t.externalId);

    let existingExternalIds: string[] = [];
    if (externalIds.length > 0) {
      const existing = await this.db
        .select({ externalId: schema.bankTransactions.externalId })
        .from(schema.bankTransactions)
        .where(
          and(
            eq(schema.bankTransactions.tenantId, tenantId),
            inArray(schema.bankTransactions.externalId, externalIds)
          )
        );
      
      existingExternalIds = existing.map(t => t.externalId);
    }

    // Filter out duplicates
    const newTransactions = batch.filter(
      t => !t.externalId || !existingExternalIds.includes(t.externalId)
    );

    result.duplicates = batch.length - newTransactions.length;

    if (newTransactions.length > 0) {
      try {
        const inserted = await this.db
          .insert(schema.bankTransactions)
          .values(
            newTransactions.map(t => ({
              tenantId,
              externalId: t.externalId,
              postedAt: t.postedAt,
              amount: t.amount,
              currency: t.currency,
              description: t.description,
              reference: t.reference,
            }))
          )
          .returning();

        result.imported = inserted.length;
        result.transactions = inserted.map(this.mapToTransaction);
      } catch (error) {
        result.errors.push(`Batch import failed: ${error.message}`);
      }
    }

    return result;
  }

  private async handleIdempotency(
    tenantId: string,
    idempotencyKey: string,
    dto: BulkImportTransactionsDto,
    requestPath?: string,
    requestMethod?: string
  ): Promise<ImportResult | null> {
    const requestHash = this.generateRequestHash(dto);

    const [existing] = await this.db
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(schema.idempotencyKeys.tenantId, tenantId),
          eq(schema.idempotencyKeys.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);

    if (existing) {
      // Check if request is identical
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key used with different request payload'
        );
      }

      // Return cached result
      if (existing.responseBody) {
        return JSON.parse(existing.responseBody);
      }
    }

    return null;
  }

  private async cacheIdempotencyResult(
    tenantId: string,
    idempotencyKey: string,
    dto: BulkImportTransactionsDto,
    requestPath: string | undefined,
    requestMethod: string | undefined,
    result: ImportResult
  ): Promise<void> {
    const requestHash = this.generateRequestHash(dto);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.db.insert(schema.idempotencyKeys).values({
      tenantId,
      idempotencyKey,
      requestPath: requestPath || '',
      requestMethod: requestMethod || '',
      requestHash,
      responseStatus: 200,
      responseBody: JSON.stringify(result),
      expiresAt,
    });
  }

  private generateRequestHash(dto: BulkImportTransactionsDto): string {
    const normalized = JSON.stringify(dto, Object.keys(dto).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  async findAll(tenantId: string): Promise<BankTransaction[]> {
    const transactions = await this.db
      .select()
      .from(schema.bankTransactions)
      .where(eq(schema.bankTransactions.tenantId, tenantId))
      .orderBy(schema.bankTransactions.postedAt);

    return transactions.map(this.mapToTransaction);
  }

  async findById(tenantId: string, id: string): Promise<BankTransaction | null> {
    const [transaction] = await this.db
      .select()
      .from(schema.bankTransactions)
      .where(
        and(
          eq(schema.bankTransactions.id, id),
          eq(schema.bankTransactions.tenantId, tenantId)
        )
      )
      .limit(1);

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<BankTransaction> {
    const transaction = await this.findById(tenantId, id);
    if (!transaction) {
      throw new NotFoundException(`Bank transaction with ID ${id} not found`);
    }
    return transaction;
  }

  async findByExternalId(
    tenantId: string,
    externalId: string
  ): Promise<BankTransaction | null> {
    const [transaction] = await this.db
      .select()
      .from(schema.bankTransactions)
      .where(
        and(
          eq(schema.bankTransactions.tenantId, tenantId),
          eq(schema.bankTransactions.externalId, externalId)
        )
      )
      .limit(1);

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  private mapToTransaction(data: any): BankTransaction {
    return {
      id: data.id,
      tenantId: data.tenantId,
      externalId: data.externalId,
      postedAt: data.postedAt,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      reference: data.reference,
      createdAt: data.createdAt,
    };
  }
}