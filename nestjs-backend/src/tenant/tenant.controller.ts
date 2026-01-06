import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        createdAt: '2024-01-20T10:30:00.000Z',
        updatedAt: '2024-01-20T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires super admin' })
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List all tenants (super admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tenants',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          createdAt: '2024-01-20T10:30:00.000Z',
          updatedAt: '2024-01-20T10:30:00.000Z',
        },
      ],
    },
  })
  async findAll() {
    return this.tenantService.findAll();
  }
}