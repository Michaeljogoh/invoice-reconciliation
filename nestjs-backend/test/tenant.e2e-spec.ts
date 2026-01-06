import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// import request from 'supertest';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { getDatabaseClient, closeDatabase } from '../src/db/database.config';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

describe('Tenant Controller (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigService>(ConfigService);
    await app.init();

    // Create a super admin user and get JWT token
    const client = getDatabaseClient(configService);
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await client.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, roles, is_active)
      VALUES (
        gen_random_uuid(),
        (SELECT id FROM tenants WHERE slug = 'acme-corp'),
        'superadmin@test.com',
        '${passwordHash}',
        'super_admin',
        true
      )
    `);

    // Get JWT token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'superadmin@test.com',
        password: 'admin123',
      });

    jwtToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('/tenants (POST)', () => {
    it('should create a new tenant', async () => {
      const createTenantDto = {
        name: 'Test Corporation',
        slug: 'test-corp',
      };

      const response = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createTenantDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createTenantDto.name);
      expect(response.body.slug).toBe(createTenantDto.slug);
    });

    it('should fail without authentication', async () => {
      const createTenantDto = {
        name: 'Test Corporation 2',
        slug: 'test-corp-2',
      };

      await request(app.getHttpServer())
        .post('/tenants')
        .send(createTenantDto)
        .expect(401);
    });
  });

  describe('/tenants (GET)', () => {
    it('should list all tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});