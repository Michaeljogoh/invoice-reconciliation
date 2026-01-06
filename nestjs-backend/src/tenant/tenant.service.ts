import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { eq } from 'drizzle-orm';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantService {
  constructor(private configService: ConfigService) {}

  private get db() {
    return getDatabase(this.configService);
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const [tenant] = await this.db
      .insert(schema.tenants)
      .values({
        name: dto.name,
        slug: dto.slug,
      })
      .returning();

    return this.mapToTenant(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    const tenants = await this.db.select().from(schema.tenants);
    return tenants.map(this.mapToTenant);
  }

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, id))
      .limit(1);

    return tenant ? this.mapToTenant(tenant) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);

    return tenant ? this.mapToTenant(tenant) : null;
  }

  async findByIdOrThrow(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  private mapToTenant(data: any): Tenant {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}