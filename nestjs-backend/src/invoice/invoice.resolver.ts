// import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
// import { InvoiceService } from './invoice.service';
// import { SuperAdminGuard } from '../guards/super-admin.guard';
// import { invoices } from '@/db/schema';
// import { CreateInvoiceDto } from '@/dto/create-invoice.dto';
// import { Invoice } from './invoice.service';

// @Resolver('Invoice')
// export class InvoiceResolver {
//   constructor(private readonly invoiceService: InvoiceService) {}

//   @Query(() => [], {name: 'invoices'})
//   async invoices(
//     @Args('tenantId') tenantId: string,
//     @Args('filters') filters: any,
//     @Context() context: any,
//   ) {
//     return this.invoiceService.findAll(tenantId, filters);
//   }

//   @Mutation(() => invoices, {name: 'createInvoice' })
//   async createInvoice(
//     @Args('tenantId') tenantId: string,
//     @Args('input') input: any,
//     @Context() context: any,
//   ) {
//     return this.invoiceService.create(tenantId, input);
//   }

//   @Mutation(() => invoices, { name: 'deleteInvoice' })
//   async deleteInvoice(
//     @Args('tenantId') tenantId: string,
//     @Args('invoiceId') invoiceId: string,
//     @Context() context: any,
//   ) {
//     await this.invoiceService.delete(tenantId, invoiceId);
//     return { success: true };
//   }
// }


import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { InvoiceService } from './invoice.service';
import { Invoice } from './invoice.model';
import { CreateInvoiceInput, InvoiceFiltersInput } from './create-invoice.input';

@Resolver(() => Invoice)
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Query(() => [Invoice], { name: 'invoices' })
  async invoices(
    @Args('tenantId', { type: () => String }) tenantId: string,
     @Args('filters', { type: () => InvoiceFiltersInput, nullable: true })
  filters?: InvoiceFiltersInput,
  ): Promise<Invoice[]> {
    return this.invoiceService.findAll(tenantId, filters);
  }

  @Mutation(() => Invoice, { name: 'createInvoice' })
  async createInvoice(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('input', { type: () => CreateInvoiceInput }) input: CreateInvoiceInput,
  ): Promise<Invoice> {
    return this.invoiceService.create(tenantId, input);
  }

  @Mutation(() => Boolean, { name: 'deleteInvoice' })
  async deleteInvoice(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('invoiceId', { type: () => String }) invoiceId: string,
  ): Promise<boolean> {
    await this.invoiceService.delete(tenantId, invoiceId);
    return true;
  }
}
