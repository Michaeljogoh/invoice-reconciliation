import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceFiltersDto } from '../dto/invoice-filters.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('tenants/:tenantId/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: null,
        invoiceNumber: 'INV-001',
        amount: '1500.00',
        currency: 'USD',
        invoiceDate: '2024-01-15T00:00:00.000Z',
        dueDate: '2024-02-15T00:00:00.000Z',
        description: 'Office supplies - January 2024',
        status: 'open',
        createdAt: '2024-01-20T10:30:00.000Z',
        updatedAt: '2024-01-20T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - wrong tenant' })
  async create(
    @Param('tenantId') tenantId: string,
    @Body(ValidationPipe) createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoiceService.create(tenantId, createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices with optional filters' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'matched', 'paid', 'cancelled'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'minAmount',
    required: false,
    description: 'Minimum amount filter',
  })
  @ApiQuery({
    name: 'maxAmount',
    required: false,
    description: 'Maximum amount filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of invoices',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          vendorId: null,
          invoiceNumber: 'INV-001',
          amount: '1500.00',
          currency: 'USD',
          invoiceDate: '2024-01-15T00:00:00.000Z',
          dueDate: '2024-02-15T00:00:00.000Z',
          description: 'Office supplies - January 2024',
          status: 'open',
          createdAt: '2024-01-20T10:30:00.000Z',
          updatedAt: '2024-01-20T10:30:00.000Z',
          vendor: null,
        },
      ],
    },
  })
  async findAll(
    @Param('tenantId') tenantId: string,
    @Query(ValidationPipe) filters?: InvoiceFiltersDto,
  ) {
    return this.invoiceService.findAll(tenantId, filters);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invoice not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - wrong tenant' })
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.invoiceService.delete(tenantId, id);
  }
}