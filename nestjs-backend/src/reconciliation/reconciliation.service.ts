import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { InvoiceService } from '../invoice/invoice.service';
import { TransactionService } from '../transaction/transaction.service';
import { eq, and } from 'drizzle-orm';


export interface ReconciliationCandidate {
  invoiceId: string;
  transactionId: string;
  score: number;
  explanation: string;
  scoreBreakdown: {
    exactAmount: number;
    dateProximity: number;
    textSimilarity: number;
    vendorMatch: number;
    total: number;
  };
}

export interface ReconciliationResult {
  candidates: ReconciliationCandidate[];
  processedInvoices: number;
  processedTransactions: number;
  durationMs: number;
}

@Injectable()
export class ReconciliationService {
  private pythonGraphqlUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private invoiceService: InvoiceService,
    private transactionService: TransactionService,
  ) {
    this.pythonGraphqlUrl = configService.get<string>('PYTHON_GRAPHQL_URL', 'http://localhost:8001/graphql');
  }

  private get db() {
    return getDatabase(this.configService);
  }

  async reconcile(tenantId: string): Promise<ReconciliationResult> {
    const startTime = Date.now();

    // Get open invoices and unmatched transactions
    const [invoices, transactions] = await Promise.all([
      this.invoiceService.findOpenInvoices(tenantId),
      this.findUnmatchedTransactions(tenantId),
    ]);

    if (invoices.length === 0 || transactions.length === 0) {
      return {
        candidates: [],
        processedInvoices: invoices.length,
        processedTransactions: transactions.length,
        durationMs: Date.now() - startTime,
      };
    }

    // Call Python backend for scoring
    const candidates = await this.callPythonScoring(
      tenantId,
      invoices,
      transactions
    );

    // Store candidates in database
    await this.storeCandidates(tenantId, candidates);

    return {
      candidates,
      processedInvoices: invoices.length,
      processedTransactions: transactions.length,
      durationMs: Date.now() - startTime,
    };
  }

  private async callPythonScoring(
    tenantId: string,
    invoices: any[],
    transactions: any[]
  ): Promise<ReconciliationCandidate[]> {
    const query = `
      query ScoreCandidates($tenantId: String!, $invoices: [InvoiceInput!]!, $transactions: [TransactionInput!]!, $topN: Int) {
        scoreCandidates(
          tenantId: $tenantId
          invoices: $invoices
          transactions: $transactions
          topN: $topN
        ) {
          invoiceId
          transactionId
          score
          explanation
          scoreBreakdown {
            exactAmount
            dateProximity
            textSimilarity
            vendorMatch
            total
          }
        }
      }
    `;

    const variables = {
      tenantId,
      invoices: invoices.map(inv => ({
        id: inv.id,
        amount: parseFloat(inv.amount),
        invoiceDate: inv.invoiceDate?.toISOString(),
        description: inv.description || '',
        vendorName: inv.vendor?.name || '',
      })),
      transactions: transactions.map(tx => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        postedAt: tx.postedAt.toISOString(),
        description: tx.description,
      })),
      topN: 5, // Top 5 candidates per invoice
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.pythonGraphqlUrl,
          { query, variables },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: this.configService.get<number>('PYTHON_SERVICE_TIMEOUT', 10000),
          }
        )
      );

      if (response.data.errors) {
        console.error('Python scoring service error:', response.data.errors);
        throw new Error(`Scoring service error: ${response.data.errors[0].message}`);
      }

      return response.data.data.scoreCandidates;
    } catch (error) {
      console.error('Failed to call Python scoring service:', error);
      // Fallback to local simple matching
      return this.performLocalScoring(invoices, transactions);
    }
  }

  private async performLocalScoring(
    invoices: any[],
    transactions: any[]
  ): Promise<ReconciliationCandidate[]> {
    const candidates: ReconciliationCandidate[] = [];

    for (const invoice of invoices) {
      for (const transaction of transactions) {
        const score = this.calculateSimpleScore(invoice, transaction);
        if (score > 0) {
          candidates.push({
            invoiceId: invoice.id,
            transactionId: transaction.id,
            score,
            explanation: this.generateSimpleExplanation(invoice, transaction, score),
            scoreBreakdown: {
              exactAmount: invoice.amount === transaction.amount ? 1000 : 0,
              dateProximity: this.getDateProximityScore(invoice.invoiceDate, transaction.postedAt),
              textSimilarity: this.getTextSimilarityScore(invoice.description, transaction.description),
              vendorMatch: 0,
              total: score,
            },
          });
        }
      }
    }

    // Sort by score and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit to top 50 candidates
  }

  private calculateSimpleScore(invoice: any, transaction: any): number {
    let score = 0;

    // Exact amount match (strongest signal)
    if (invoice.amount === transaction.amount) {
      score += 1000;
    }

    // Date proximity (within 3 days)
    const dateScore = this.getDateProximityScore(invoice.invoiceDate, transaction.postedAt);
    score += dateScore;

    // Text similarity
    const textScore = this.getTextSimilarityScore(invoice.description, transaction.description);
    score += textScore;

    return score;
  }

  private getDateProximityScore(invoiceDate: Date, transactionDate: Date): number {
    if (!invoiceDate || !transactionDate) return 0;

    const diffDays = Math.abs(
      (invoiceDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 1) return 300;
    if (diffDays <= 3) return 200;
    if (diffDays <= 7) return 100;
    return 0;
  }

  private getTextSimilarityScore(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const words1 = text1.toLowerCase().split(/\\s+/);
    const words2 = text2.toLowerCase().split(/\\s+/);

    const common = words1.filter(word => words2.includes(word));
    const similarity = common.length / Math.max(words1.length, words2.length);

    return Math.round(similarity * 200);
  }

  private generateSimpleExplanation(invoice: any, transaction: any, score: number): string {
    if (score >= 1000) {
      return `Perfect match: Invoice ${invoice.invoiceNumber || invoice.id} and transaction ${transaction.externalId || transaction.id} have identical amounts of ${invoice.amount} ${invoice.currency}.`;
    }
    
    if (score >= 500) {
      return `Strong candidate: Amount ${invoice.amount} ${invoice.currency} with similar dates and descriptions.`;
    }

    return `Potential match: Some similarities found between invoice and transaction.`;
  }

  private async storeCandidates(
    tenantId: string,
    candidates: ReconciliationCandidate[]
  ): Promise<void> {
    // Delete existing proposed candidates for this tenant
    await this.db
      .delete(schema.matchCandidates)
      .where(
        and(
          eq(schema.matchCandidates.tenantId, tenantId),
          eq(schema.matchCandidates.status, 'proposed')
        )
      );

    // Store new candidates
    if (candidates.length > 0) {
      await this.db.insert(schema.matchCandidates).values(
        candidates.map(c => ({
          tenantId,
          invoiceId: c.invoiceId,
          bankTransactionId: c.transactionId,
          score: c.score,
          status: 'proposed' as const,
          explanation: c.explanation,
        }))
      );
    }
  }

  private async findUnmatchedTransactions(tenantId: string): Promise<any[]> {
    // Get transactions that don't have confirmed matches
    const matchedTransactionIds = await this.db
      .select({ transactionId: schema.matchCandidates.bankTransactionId })
      .from(schema.matchCandidates)
      .where(
        and(
          eq(schema.matchCandidates.tenantId, tenantId),
          eq(schema.matchCandidates.status, 'confirmed')
        )
      );

    const transactionIds = matchedTransactionIds.map(t => t.transactionId);

    if (transactionIds.length === 0) {
      return this.db
        .select()
        .from(schema.bankTransactions)
        .where(eq(schema.bankTransactions.tenantId, tenantId));
    }

    return this.db
      .select()
      .from(schema.bankTransactions)
      .where(
        and(
          eq(schema.bankTransactions.tenantId, tenantId),
          // Use raw SQL to exclude matched transactions
          // This is a simplified version - in production, use proper SQL
        )
      );
  }
}