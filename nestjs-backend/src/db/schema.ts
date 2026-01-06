import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  pgEnum,
  boolean,
  integer,
  text,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// Enums
export const invoiceStatusEnum = pgEnum('invoice_status', ['open', 'matched', 'paid', 'cancelled']);
export const matchStatusEnum = pgEnum('match_status', ['proposed', 'confirmed', 'rejected']);
export const currencyEnum = pgEnum('currency', ['USD', 'EUR', 'GBP', 'CAD', 'AUD']);

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Vendors table (optional but recommended)
export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      tenantIdIdx: index('vendors_tenant_id_idx').on(table.tenantId),
      tenantNameUnique: unique('vendors_tenant_name_unique').on(table.tenantId, table.name),
    };
  }
);

// Invoices table
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull().default('USD'),
    invoiceDate: timestamp('invoice_date', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    description: text('description'),
    status: invoiceStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      tenantIdIdx: index('invoices_tenant_id_idx').on(table.tenantId),
      vendorIdIdx: index('invoices_vendor_id_idx').on(table.vendorId),
      statusIdx: index('invoices_status_idx').on(table.status),
      amountIdx: index('invoices_amount_idx').on(table.amount),
      invoiceDateIdx: index('invoices_invoice_date_idx').on(table.invoiceDate),
    };
  }
);

// Bank transactions table
export const bankTransactions = pgTable(
  'bank_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 255 }),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull().default('USD'),
    description: text('description').notNull(),
    reference: varchar('reference', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      tenantIdIdx: index('bank_transactions_tenant_id_idx').on(table.tenantId),
      externalIdIdx: index('bank_transactions_external_id_idx').on(table.externalId),
      postedAtIdx: index('bank_transactions_posted_at_idx').on(table.postedAt),
      amountIdx: index('bank_transactions_amount_idx').on(table.amount),
      tenantExternalUnique: unique('bank_transactions_tenant_external_unique').on(
        table.tenantId,
        table.externalId
      ),
    };
  }
);

// Match candidates table
export const matchCandidates = pgTable(
  'match_candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    bankTransactionId: uuid('bank_transaction_id')
      .notNull()
      .references(() => bankTransactions.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(), // 0-1000
    status: matchStatusEnum('status').notNull().default('proposed'),
    explanation: text('explanation'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      tenantIdIdx: index('match_candidates_tenant_id_idx').on(table.tenantId),
      invoiceIdIdx: index('match_candidates_invoice_id_idx').on(table.invoiceId),
      transactionIdIdx: index('match_candidates_transaction_id_idx').on(table.bankTransactionId),
      statusIdx: index('match_candidates_status_idx').on(table.status),
      scoreIdx: index('match_candidates_score_idx').on(table.score),
      tenantInvoiceTransactionUnique: unique('match_candidates_tenant_invoice_transaction_unique').on(
        table.tenantId,
        table.invoiceId,
        table.bankTransactionId
      ),
    };
  }
);

// Idempotency keys table
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    requestPath: varchar('request_path', { length: 255 }).notNull(),
    requestMethod: varchar('request_method', { length: 10 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(), // SHA-256
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      tenantKeyIdx: index('idempotency_keys_tenant_key_idx').on(
        table.tenantId,
        table.idempotencyKey
      ),
      expiresAtIdx: index('idempotency_keys_expires_at_idx').on(table.expiresAt),
      tenantKeyUnique: unique('idempotency_keys_tenant_key_unique').on(
        table.tenantId,
        table.idempotencyKey
      ),
    };
  }
);

// Users table (for authentication)
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    roles: varchar('roles', { length: 255 }).notNull().default('user'), // comma-separated
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId),
      emailIdx: index('users_email_idx').on(table.email),
      tenantEmailUnique: unique('users_tenant_email_unique').on(table.tenantId, table.email),
    };
  }
);