import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CreateTenantInput } from './create-tenant.input';
import { Tenant } from './tenant.model';


@Resolver('Tenant')
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @Query(() => [Tenant], { name:'tenants'})
  @UseGuards(SuperAdminGuard)
  async tenants() {
    return this.tenantService.findAll();
  }


  @Mutation(() => Tenant, {name:'createTenant'})
  @UseGuards(SuperAdminGuard)
  async createTenant(@Args('input', { type: () => CreateTenantInput })
    input: CreateTenantInput) {
    return this.tenantService.create(input);
  }
}