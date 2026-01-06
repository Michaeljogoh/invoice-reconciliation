import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getDatabaseClient, closeDatabase } from '../src/db/database.config';

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
  };
}

describe('Invoice Controller (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let jwtToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigService>(ConfigService);
    await app.init();

    // Login to get JWT token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'password123',
      });

    const authBody: AuthResponse = loginResponse.body;
    jwtToken = authBody.accessToken;
    tenantId = authBody.user.tenantId;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('/tenants/:tenantId/invoices (POST)', () => {
    it('should create a new invoice', async () => {
      const createInvoiceDto = {
        amount: '2500.00',
        currency: 'USD',
        description: 'Test invoice for E2E testing',
        invoiceDate: '2024-01-20',
        dueDate: '2024-02-20',
      };

      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/invoices`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createInvoiceDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe(createInvoiceDto.amount);
      expect(response.body.currency).toBe(createInvoiceDto.currency);
      expect(response.body.status).toBe('open');
    });

    it('should fail with invalid tenant', async () => {
      const createInvoiceDto = {
        amount: '2500.00',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/tenants/invalid-tenant-id/invoices')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createInvoiceDto)
        .expect(403);
    });
  });

  describe('/tenants/:tenantId/invoices (GET)', () => {
    it('should list invoices with filters', async () => {
      // Create test invoices
      const testInvoices = [
        { amount: '1000.00', currency: 'USD', description: 'Test 1' },
        { amount: '2000.00', currency: 'USD', description: 'Test 2' },
        { amount: '3000.00', currency: 'USD', description: 'Test 3' },
      ];

      for (const invoice of testInvoices) {
        await request(app.getHttpServer())
          .post(`/tenants/${tenantId}/invoices`)
          .set('Authorization', `Bearer ${jwtToken}`)
          .send(invoice);
      }

      // Test filtering by min amount
      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/invoices`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .query({ minAmount: '2000' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      
      for (const invoice of response.body) {
        expect(parseFloat(invoice.amount)).toBeGreaterThanOrEqual(2000);
      }
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/invoices`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .query({ status: 'open' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      for (const invoice of response.body) {
        expect(invoice.status).toBe('open');
      }
    });
  });

  describe('/tenants/:tenantId/invoices/:id (DELETE)', () => {
    it('should delete an invoice', async () => {
      // Create an invoice first
      const createResponse = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/invoices`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: '999.99',
          currency: 'USD',
          description: 'Invoice to delete',
        });

      const invoiceId = createResponse.body.id;

      // Delete the invoice
      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/invoices`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          const invoice = response.body.find((inv: any) => inv.id === invoiceId);
          expect(invoice).toBeUndefined();
        });
    });
  });
});