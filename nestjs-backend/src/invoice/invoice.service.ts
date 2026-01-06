import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceFiltersDto } from '../dto/invoice-filters.dto';
import { eq, and, gte, lte, ilike, inArray } from 'drizzle-orm';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';

export interface Invoice {
  id: string;
  tenantId: string;
  vendorId?: string;
  invoiceNumber?: string;
  amount: string;
  currency: string;
  invoiceDate?: Date;
  dueDate?: Date;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  vendor?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class InvoiceService {
  constructor(private configService: ConfigService) {}

  private get db() {
    return getDatabase(this.configService);
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const [invoice] = await this.db
      .insert(schema.invoices)
      .values({
        tenantId,
        vendorId: dto.vendorId,
        invoiceNumber: dto.invoiceNumber,
        amount: dto.amount,
        currency: dto.currency,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        description: dto.description,
        status: InvoiceStatus.OPEN,
      })
      .returning();

    return this.mapToInvoice(invoice);
  }

  async findAll(tenantId: string, filters?: InvoiceFiltersDto): Promise<Invoice[]> {
    let query = this.db
      .select({
        invoice: schema.invoices,
        vendor: {
          id: schema.vendors.id,
          name: schema.vendors.name,
        },
      })
      .from(schema.invoices)
      .leftJoin(schema.vendors, eq(schema.invoices.vendorId, schema.vendors.id))
      .where(eq(schema.invoices.tenantId, tenantId)).$dynamic();

    // Apply filters
    if (filters) {
      const conditions = [eq(schema.invoices.tenantId, tenantId)];

      if (filters.status) {
        conditions.push(eq(schema.invoices.status, filters.status));
      }

      if (filters.vendorId) {
        conditions.push(eq(schema.invoices.vendorId, filters.vendorId));
      }

      if (filters.minAmount) {
        conditions.push(gte(schema.invoices.amount, filters.minAmount));
      }

      if (filters.maxAmount) {
        conditions.push(lte(schema.invoices.amount, filters.maxAmount));
      }

      if (filters.startDate) {
        conditions.push(gte(schema.invoices.invoiceDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(schema.invoices.invoiceDate, filters.endDate));
      }

      if (filters.currency) {
        conditions.push(eq(schema.invoices.currency, filters.currency));
      }

      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(schema.invoices.createdAt);

    return results.map((result) => ({
      ...this.mapToInvoice(result.invoice),
      vendor: result.vendor,
    }));
  }

  async findById(tenantId: string, id: string): Promise<Invoice | null> {
    const [result] = await this.db
      .select({
        invoice: schema.invoices,
        vendor: {
          id: schema.vendors.id,
          name: schema.vendors.name,
        },
      })
      .from(schema.invoices)
      .leftJoin(schema.vendors, eq(schema.invoices.vendorId, schema.vendors.id))
      .where(
        and(
          eq(schema.invoices.id, id),
          eq(schema.invoices.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      ...this.mapToInvoice(result.invoice),
      vendor: result.vendor,
    };
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findById(tenantId, id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const result = await this.db
      .delete(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, id),
          eq(schema.invoices.tenantId, tenantId)
        )
      );

    if (result.count === 0) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
  }


  async findOpenInvoices(tenantId: string): Promise<Invoice[]> {
    return this.findAll(tenantId, { status: InvoiceStatus.OPEN });
  }

  private mapToInvoice(data: any): Invoice {
    return {
      id: data.id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      currency: data.currency,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      description: data.description,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}