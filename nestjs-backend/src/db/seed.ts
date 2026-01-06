import * as dotenv from 'dotenv';
import postgres = require('postgres');
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as bcrypt from 'bcryptjs';
dotenv.config({ path: '../../.env' });


async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(schema.matchCandidates);
    await db.delete(schema.bankTransactions);
    await db.delete(schema.invoices);
    await db.delete(schema.vendors);
    await db.delete(schema.users);
    await db.delete(schema.tenants);

    // Create tenants
    console.log('🏢 Creating tenants...');
    const [tenant1] = await db
      .insert(schema.tenants)
      .values([
        {
          name: 'Acme Corporation',
          slug: 'acme-corp',
        },
        {
          name: 'TechStart Inc',
          slug: 'techstart-inc',
        },
      ])
      .returning();

    const [tenant2] = await db
      .insert(schema.tenants)
      .values({
        name: 'Global Enterprises',
        slug: 'global-enterprises',
      })
      .returning();

    // Create users
    console.log('👤 Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    await db.insert(schema.users).values([
      {
        tenantId: tenant1.id,
        email: 'admin@acme.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        roles: 'admin',
      },
      {
        tenantId: tenant1.id,
        email: 'user@acme.com',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Smith',
        roles: 'user',
      },
      {
        tenantId: tenant2.id,
        email: 'admin@global.com',
        passwordHash,
        firstName: 'Bob',
        lastName: 'Johnson',
        roles: 'admin',
      },
    ]);

    // Create vendors
    console.log('🏪 Creating vendors...');
    const [vendor1] = await db
      .insert(schema.vendors)
      .values([
        {
          tenantId: tenant1.id,
          name: 'Office Supplies Co',
        },
        {
          tenantId: tenant1.id,
          name: 'Tech Solutions LLC',
        },
        {
          tenantId: tenant2.id,
          name: 'Marketing Pros',
        },
      ])
      .returning();

    // Create invoices
    console.log('📄 Creating invoices...');
    await db.insert(schema.invoices).values([
      {
        tenantId: tenant1.id,
        vendorId: vendor1.id,
        invoiceNumber: 'INV-001',
        amount: '1500.00',
        currency: 'USD',
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        description: 'Office supplies - January 2024',
        status: 'open',
      },
      {
        tenantId: tenant1.id,
        vendorId: vendor1.id,
        invoiceNumber: 'INV-002',
        amount: '2750.50',
        currency: 'USD',
        invoiceDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        description: 'Office supplies - February 2024',
        status: 'open',
      },
      {
        tenantId: tenant1.id,
        vendorId: vendor1.id,
        invoiceNumber: 'INV-003',
        amount: '999.99',
        currency: 'USD',
        invoiceDate: new Date('2024-01-25'),
        dueDate: new Date('2024-02-25'),
        description: 'Office supplies - March 2024',
        status: 'paid',
      },
      {
        tenantId: tenant2.id,
        amount: '5000.00',
        currency: 'USD',
        invoiceDate: new Date('2024-01-10'),
        dueDate: new Date('2024-02-10'),
        description: 'Marketing campaign Q1',
        status: 'open',
      },
    ]);

    // Create bank transactions
    console.log('🏦 Creating bank transactions...');
    await db.insert(schema.bankTransactions).values([
      {
        tenantId: tenant1.id,
        externalId: 'BT-2024-0001',
        postedAt: new Date('2024-01-16T10:30:00Z'),
        amount: '1500.00',
        currency: 'USD',
        description: 'Payment to Office Supplies Co',
        reference: 'REF-001',
      },
      {
        tenantId: tenant1.id,
        externalId: 'BT-2024-0002',
        postedAt: new Date('2024-01-22T14:15:00Z'),
        amount: '2750.50',
        currency: 'USD',
        description: 'ACH Transfer - Office Supplies',
        reference: 'REF-002',
      },
      {
        tenantId: tenant1.id,
        externalId: 'BT-2024-0003',
        postedAt: new Date('2024-01-26T09:45:00Z'),
        amount: '999.99',
        currency: 'USD',
        description: 'Wire transfer - Office Supplies Co Payment',
        reference: 'REF-003',
      },
      {
        tenantId: tenant2.id,
        externalId: 'BT-2024-0004',
        postedAt: new Date('2024-01-12T16:20:00Z'),
        amount: '5000.00',
        currency: 'USD',
        description: 'Marketing services payment',
        reference: 'REF-004',
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('  Tenant 1 (Acme Corp): admin@acme.com / password123');
    console.log('  Tenant 2 (Global):    admin@global.com / password123');
    console.log('');
    console.log('🔍 Sample Data:');
    console.log('  - Tenant 1: 3 invoices, 3 transactions');
    console.log('  - Tenant 2: 1 invoice, 1 transaction');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seed();
}