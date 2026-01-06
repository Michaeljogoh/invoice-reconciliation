import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class BankTransaction {
  @Field(() => ID)
  id: string;

  @Field()
  tenantId: string;

  @Field()
  amount: string;

  @Field()
  currency: string;

  @Field()
  transactionDate: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;
}
