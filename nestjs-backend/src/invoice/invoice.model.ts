import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Invoice {
  @Field(() => ID)
  id: string;

  @Field()
  tenantId: string;

  @Field({ nullable: true })
  vendorId?: string;

  @Field({ nullable: true })
  invoiceNumber?: string;

  @Field()
  amount: string;

  @Field()
  currency: string;

  @Field({ nullable: true })
  invoiceDate?: Date;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
