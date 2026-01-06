import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BankTransaction } from './bank-transaction.model';

@ObjectType()
export class ImportResult {
  @Field(() => Int)
  imported: number;

  @Field(() => Int)
  duplicates: number;

  @Field(() => [String])
  errors: string[];

  @Field(() => [BankTransaction])
  transactions: BankTransaction[];
}
