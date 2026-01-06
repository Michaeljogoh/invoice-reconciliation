import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { Currency } from '@/common/enums/currency.enum';

registerEnumType(Currency, { name: 'Currency' });

@InputType()
export class BankTransactionImportInput {
  @Field(() => String) externalId: string;
  @Field(() => Date) postedAt: Date;
  @Field(() => String) amount: string;
  @Field(() => Currency, { nullable: true }) currency?: Currency = Currency.USD;
  @Field(() => String) description: string;
  @Field(() => String, { nullable: true }) reference?: string;
}

@InputType()
export class BulkImportTransactionsInput {
  @Field(() => [BankTransactionImportInput])
  transactions: BankTransactionImportInput[];
}