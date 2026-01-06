import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
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
  ApiHeader,
} from '@nestjs/swagger';

import { ImportResult } from './transaction.service';


import { TransactionService } from './transaction.service';
import { BulkImportTransactionsDto } from '../dto/bulk-import-transactions.dto';

@ApiTags('Bank Transactions')
@ApiBearerAuth()
@Controller('tenants/:tenantId/bank-transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk import bank transactions with idempotency' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent requests (recommended: UUID v4)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transactions imported successfully',
    schema: {
      example: {
        imported: 3,
        duplicates: 1,
        errors: [],
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            tenantId: '123e4567-e89b-12d3-a456-426614174000',
            externalId: 'BT-2024-0001',
            postedAt: '2024-01-15T10:30:00.000Z',
            amount: '1500.00',
            currency: 'USD',
            description: 'Payment to Office Supplies Co',
            reference: 'REF-001',
            createdAt: '2024-01-20T10:30:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotency key used with different payload',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - wrong tenant' })
  async bulkImport(
    @Param('tenantId') tenantId: string,
    @Body(ValidationPipe) bulkImportDto: BulkImportTransactionsDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ImportResult> {
    return this.transactionService.bulkImport(
      tenantId,
      bulkImportDto,
      idempotencyKey,
      `/tenants/${tenantId}/bank-transactions/import`,
      'POST'
    );
  }
}