import { Test, TestingModule } from '@nestjs/testing';
import { TenantResolver } from './tenant.resolver';
import { TenantService } from './tenant.service';
import { CreateTenantInput } from './create-tenant.input';

describe('TenantResolver', () => {
  let resolver: TenantResolver;
  let tenantService: jest.Mocked<TenantService>;

  const mockTenantService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantResolver,
        { provide: TenantService, useValue: mockTenantService },
      ],
    }).compile();

    resolver = module.get<TenantResolver>(TenantResolver);
    tenantService = module.get(TenantService);
  });

  afterEach(() => jest.clearAllMocks());

  /* ------------------------------------------------------------------ */
  /* tenants() query                                                    */
  /* ------------------------------------------------------------------ */
  describe('tenants', () => {
    it('should return array of tenants via service', async () => {
      const expected = [
        { id: 't1', name: 'A', slug: 'a', createdAt: new Date(), updatedAt: new Date() },
      ];
      tenantService.findAll.mockResolvedValue(expected);

      const result = await resolver.tenants();
      expect(result).toEqual(expected);
      expect(tenantService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /* createTenant() mutation                                            */
  /* ------------------------------------------------------------------ */
  describe('createTenant', () => {
    it('should create and return a tenant', async () => {
      const input: CreateTenantInput = { name: 'Acme', slug: 'acme' };
      const expected = { id: 't1', ...input, createdAt: new Date(), updatedAt: new Date() };
      tenantService.create.mockResolvedValue(expected);

      const result = await resolver.createTenant(input);
      expect(result).toEqual(expected);
      expect(tenantService.create).toHaveBeenCalledWith(input);
    });
  });
});