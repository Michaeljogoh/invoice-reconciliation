import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';

describe('TenantController', () => {
  let controller: TenantController;
  let tenantService: jest.Mocked<TenantService>;

  const mockTenantService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [{ provide: TenantService, useValue: mockTenantService }],
    }).compile();

    controller = module.get<TenantController>(TenantController);
    tenantService = module.get(TenantService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /tenants', () => {
    it('should create a tenant via service', async () => {
      const dto: CreateTenantDto = { name: 'Acme', slug: 'acme' };
      const expected = { id: 't1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      tenantService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(result).toEqual(expected);
      expect(tenantService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /tenants', () => {
    it('should return array of tenants', async () => {
      const expected = [
        { id: 't1', name: 'A', slug: 'a', createdAt: new Date(), updatedAt: new Date() },
      ];
      tenantService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(result).toEqual(expected);
      expect(tenantService.findAll).toHaveBeenCalled();
    });
  });
});