import { InputType, Field, registerEnumType } from "@nestjs/graphql";
import { Currency } from "@/common/enums/currency.enum";
import { InvoiceStatus } from "@/common/enums/invoice-status.enum";

registerEnumType(Currency, {
  name: "Currency",
});


registerEnumType(InvoiceStatus, {
  name: 'InvoiceStatus',
});

@InputType()
export class CreateInvoiceInput {
  @Field(() => Currency)
  currency: Currency;

  @Field()
  vendorId: string;

  @Field()
  invoiceNumber: string;

  @Field()
  amount: string;

  @Field({ nullable: true })
  invoiceDate?: Date;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class InvoiceFiltersInput {
  @Field(() => InvoiceStatus, { nullable: true })
  status?: InvoiceStatus;

  @Field({ nullable: true })
  vendorId?: string;
}
