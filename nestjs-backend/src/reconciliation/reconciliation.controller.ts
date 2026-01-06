import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Reconciliation')
@ApiBearerAuth()
@Controller('tenants/:tenantId/reconcile')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run reconciliation to find matching candidates' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reconciliation completed successfully',
    schema: {
      example: {
        candidates: [
          {
            invoiceId: '123e4567-e89b-12d3-a456-426614174000',
            transactionId: '456e7890-e89b-12d3-a456-426614174001',
            score: 1500,
            explanation: 'Perfect match: Invoice INV-001 and transaction BT-2024-0001 have identical amounts of 1500.00 USD.',
            scoreBreakdown: {
              exactAmount: 1000,
              dateProximity: 300,
              textSimilarity: 200,
              vendorMatch: 0,
              total: 1500,
            },
          },
        ],
        processedInvoices: 5,
        processedTransactions: 12,
        durationMs: 245,
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - wrong tenant' })
  async reconcile(@Param('tenantId') tenantId: string) {
    return this.reconciliationService.reconcile(tenantId);
  }

  @Get('explain')
  @ApiOperation({ summary: 'Get AI explanation for a potential match' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'invoice_id',
    description: 'Invoice ID',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'transaction_id',
    description: 'Transaction ID',
    required: true,
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI explanation generated',
    schema: {
      example: {
        explanation: 'This invoice and transaction match perfectly with the same amount of $1,500.00 and similar descriptions.',
        confidence: 'high',
        scoreBreakdown: {
          exactAmount: 1000,
          dateProximity: 300,
          textSimilarity: 200,
          total: 1500,
        },
        aiGenerated: true,
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invoice or transaction not found' })
  async explainMatch(
    @Param('tenantId') tenantId: string,
    @Query('invoice_id') invoiceId: string,
    @Query('transaction_id') transactionId: string,
  ) {
    // This will be implemented in the AI service
    return {
      explanation: 'This is a fallback explanation. AI service integration pending.',
      confidence: 'high',
      scoreBreakdown: {
        exactAmount: 1000,
        dateProximity: 300,
        textSimilarity: 200,
        total: 1500,
      },
      aiGenerated: false,
    };
  }
}