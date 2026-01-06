// tenant.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { TenantService } from './tenant.service';
import * as schema from '../db/schema';

/* ------------------------------------------------------------------ */
/* Mock drizzle query-builder                                         */
/* ------------------------------------------------------------------ */
const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockSelect = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ limit: mockLimit }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
};

/* ------------------------------------------------------------------ */
/* Mock getDatabase                                                   */
/* ------------------------------------------------------------------ */
jest.mock('../db/database.config', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

/* ------------------------------------------------------------------ */
/* Helper to quickly reset all mocks between tests                    */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  jest.clearAllMocks();
});

/* ================================================================== */
/* Test suite                                                         */
/* ================================================================== */
describe('TenantService', () => {
  let service: TenantService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() }, // <─ we never really need values
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* -------------------------------------------------------------- */
  /* create()                                                       */
  /* -------------------------------------------------------------- */
  describe('create', () => {
    it('should insert a tenant and return mapped DTO', async () => {
      const dto = { name: 'Acme', slug: 'acme' };
      const raw = {
        id: 't1',
        name: 'Acme',
        slug: 'acme',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockReturning.mockResolvedValue([raw]);

      const res = await service.create(dto);

      expect(mockInsert).toHaveBeenCalledWith(schema.tenants);
      expect(mockValues).toHaveBeenCalledWith({
        name: dto.name,
        slug: dto.slug,
      });
      expect(res).toEqual({
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      });
    });
  });

  /* -------------------------------------------------------------- */
  /* findAll()                                                      */
  /* -------------------------------------------------------------- */
  describe('findAll', () => {
    it('should return an array of tenants', async () => {
      const raw = [
        {
          id: 't1',
          name: 'A',
          slug: 'a',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 't2',
          name: 'B',
          slug: 'b',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue(raw),
      } as any);

      const res = await service.findAll();

      expect(mockSelect).toHaveBeenCalledWith();
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('t1');
      expect(res[1].id).toBe('t2');
    });

    it('should return empty array when no tenants', async () => {
      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([]),
      } as any);

      const res = await service.findAll();
      expect(res).toEqual([]);
    });
  });

  /* -------------------------------------------------------------- */
  /* findById()                                                     */
  /* -------------------------------------------------------------- */
  describe('findById', () => {
    it('should return tenant when found', async () => {
      const raw = {
        id: 't1',
        name: 'Foo',
        slug: 'foo',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([raw]),
          }),
        }),
      } as any);

      const res = await service.findById('t1');

      expect(mockSelect).toHaveBeenCalledWith();
      expect(eq(schema.tenants.id, 't1')).toBeTruthy();
      expect(res!.id).toBe('t1');
    });

    it('should return null when not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const res = await service.findById('unknown');
      expect(res).toBeNull();
    });
  });

  /* -------------------------------------------------------------- */
  /* findBySlug()                                                   */
  /* -------------------------------------------------------------- */
  describe('findBySlug', () => {
    it('should return tenant when found', async () => {
      const raw = {
        id: 't1',
        name: 'Foo',
        slug: 'foo',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([raw]),
          }),
        }),
      } as any);

      const res = await service.findBySlug('foo');
      expect(res!.slug).toBe('foo');
    });

    it('should return null when not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const res = await service.findBySlug('unknown');
      expect(res).toBeNull();
    });
  });

  /* -------------------------------------------------------------- */
  /* findByIdOrThrow()                                              */
  /* -------------------------------------------------------------- */
  describe('findByIdOrThrow', () => {
    it('should return tenant if exists', async () => {
      jest.spyOn(service, 'findById').mockResolvedValueOnce({
        id: 't1',
        name: 'Foo',
        slug: 'foo',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.findByIdOrThrow('t1');
      expect(res.id).toBe('t1');
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      jest.spyOn(service, 'findById').mockResolvedValueOnce(null);

      await expect(service.findByIdOrThrow('bad')).rejects.toThrow(
        new NotFoundException('Tenant with ID bad not found'),
      );
    });
  });
});