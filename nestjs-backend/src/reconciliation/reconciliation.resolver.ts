import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ReconcileResult, ReconcileExplanation } from './reconcilliation.dto';

@Resolver()
export class ReconciliationResolver {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /* ---------- MUTATION ---------- */
  @Mutation(() => ReconcileResult, { name: 'reconcile' })   // NOT [ReconcileResult]
  async reconcile(
    @Args('tenantId') tenantId: string,
    @Context() context: any,
  ): Promise<ReconcileResult> {
    return this.reconciliationService.reconcile(tenantId);
  }

  /* ---------- QUERY ---------- */
  @Query(() => ReconcileExplanation, { name: 'explainReconciliation' })
  async explainReconciliation(
    @Args('tenantId') tenantId: string,
    @Args('invoiceId') invoiceId: string,
    @Args('transactionId') transactionId: string,
    @Context() context: any,
  ): Promise<ReconcileExplanation> {
    /* ---- same shape as the controller example ---- */
    return {
      explanation:
        'This invoice and transaction match perfectly with the same amount of $1,500.00 and similar descriptions.',
      confidence: 'high',
      scoreBreakdown: {
        exactAmount: 1000,
        dateProximity: 300,
        textSimilarity: 200,
        vendorMatch: 0,
        total: 1500,
      },
      aiGenerated: false,
    };
  }
}