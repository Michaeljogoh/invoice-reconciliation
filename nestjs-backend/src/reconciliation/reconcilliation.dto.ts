import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/* ------------ nested DTO ------------ */
@ObjectType()
export class ScoreBreakdown {
  @Field(() => Int) exactAmount: number;
  @Field(() => Int) dateProximity: number;
  @Field(() => Int) textSimilarity: number;
  @Field(() => Int) vendorMatch: number;
  @Field(() => Int) total: number;
}

@ObjectType()
export class ReconciliationCandidate {
  @Field(() => String) invoiceId: string;
  @Field(() => String) transactionId: string;
  @Field(() => Int) score: number;
  @Field(() => String) explanation: string;
  @Field(() => ScoreBreakdown) scoreBreakdown: ScoreBreakdown;
}

/* ------------ top-level DTOs ------------ */
@ObjectType()
export class ReconcileResult {              // returned by reconcile()
  @Field(() => [ReconciliationCandidate]) candidates: ReconciliationCandidate[];
  @Field(() => Int) processedInvoices: number;
  @Field(() => Int) processedTransactions: number;
  @Field(() => Int) durationMs: number;
}

@ObjectType()
export class ReconcileExplanation {         // returned by explain()
  @Field(() => String) explanation: string;
  @Field(() => String) confidence: string;
  @Field(() => ScoreBreakdown) scoreBreakdown: ScoreBreakdown;
  @Field(() => Boolean) aiGenerated: boolean;
}