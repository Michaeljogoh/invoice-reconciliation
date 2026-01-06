import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantResolver } from './tenant.resolver';

@Module({
  controllers: [TenantController],
  providers: [TenantService, TenantResolver],
  exports: [TenantService],
})
export class TenantModule {}