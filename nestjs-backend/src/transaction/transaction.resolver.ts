import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { TransactionService } from './transaction.service';
import { ImportResult } from './transaction.service';
import { BankTransaction } from './bank-transaction.model';
import { BulkImportTransactionsInput } from './transaction.input';


@Resolver('BankTransaction')
export class TransactionResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @Query(() => [BankTransaction], { name:'bankTransactions'})
  async bankTransactions(
    @Args('tenantId') tenantId: string,
    @Context() context: any,
  ) {

    return this.transactionService.findAll(tenantId);
  }

  @Mutation(() => BankTransaction, { name:'importBankTransactions'})
  async importBankTransactions(
    @Args('tenantId') tenantId: string,
    @Args('input') input: BulkImportTransactionsInput,
    @Args('idempotencyKey') idempotencyKey: string,
    @Context() context: any,
  ): Promise<ImportResult> {
    return this.transactionService.bulkImport(
      tenantId,
      input,
      idempotencyKey,
      '/graphql',
      'POST'
    );
  }


}