import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// import  request from 'supertest';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getDatabaseClient, closeDatabase } from '../src/db/database.config';

describe('Row Level Security (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1Id: string;
  let tenant2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigService>(ConfigService);
    await app.init();

    // Login as tenant 1 user
    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'password123',
      });

    tenant1Token = login1.body.accessToken;
    tenant1Id = login1.body.user.tenantId;

    // Login as tenant 2 user
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@global.com',
        password: 'password123',
      });

    tenant2Token = login2.body.accessToken;
    tenant2Id = login2.body.user.tenantId;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('RLS Cross-Tenant Access Prevention', () => {
    it('should prevent tenant1 from accessing tenant2 invoices', async () => {
      // Try to access tenant2 invoices with tenant1 token
      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenant2Id}/invoices`)
        .set('Authorization', `Bearer ${tenant1Token}`)
        .expect(403);

      expect(response.body.message).toContain('access');
    });

    it('should prevent tenant1 from creating invoices for tenant2', async () => {
      const createInvoiceDto = {
        amount: '1000.00',
        currency: 'USD',
        description: 'This should fail',
      };

      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenant2Id}/invoices`)
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send(createInvoiceDto)
        .expect(403);

      expect(response.body.message).toContain('access');
    });

    it('should prevent tenant1 from deleting tenant2 invoices', async () => {
      // First, get an invoice ID from tenant2
      const tenant2Invoices = await request(app.getHttpServer())
        .get(`/tenants/${tenant2Id}/invoices`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(200);

      if (tenant2Invoices.body.length > 0) {
        const invoiceId = tenant2Invoices.body[0].id;

        // Try to delete with tenant1 token
        await request(app.getHttpServer())
          .delete(`/tenants/${tenant2Id}/invoices/${invoiceId}`)
          .set('Authorization', `Bearer ${tenant1Token}`)
          .expect(403);
      }
    });

    it('should allow each tenant to access only their own data', async () => {
      // Get tenant1 invoices
      const tenant1Invoices = await request(app.getHttpServer())
        .get(`/tenants/${tenant1Id}/invoices`)
        .set('Authorization', `Bearer ${tenant1Token}`)
        .expect(200);

      // Get tenant2 invoices
      const tenant2Invoices = await request(app.getHttpServer())
        .get(`/tenants/${tenant2Id}/invoices`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(200);

      // Verify they have different data
      const tenant1Ids = new Set(tenant1Invoices.body.map((inv: any) => inv.id));
      const tenant2Ids = new Set(tenant2Invoices.body.map((inv: any) => inv.id));

      // Check for overlap (there shouldn't be any)
      const intersection = new Set([...tenant1Ids].filter(id => tenant2Ids.has(id)));
      expect(intersection.size).toBe(0);
    });
  });

  describe('Direct Database RLS Testing', () => {
    it('should enforce RLS at database level', async () => {
      const client = getDatabaseClient(configService);

      // Try to access data without setting RLS context (should fail)
      try {
        await client.unsafe('SELECT * FROM invoices LIMIT 1');
        // If we get here, RLS is not working properly
        fail('RLS should have prevented access without context');
      } catch (error) {
        // Expected behavior - RLS should block access
        expect(error.message).toContain('permission denied');
      }

      // Set RLS context for tenant1
      await client.unsafe(`SET app.current_org_id = '${tenant1Id}'`);
      await client.unsafe(`SET app.is_super_admin = 'false'`);

      // Now access should work
      const result = await client.unsafe('SELECT * FROM invoices LIMIT 1');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});