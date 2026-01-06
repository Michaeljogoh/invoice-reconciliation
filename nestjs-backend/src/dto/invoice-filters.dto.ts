import { IsOptional, IsEnum, IsDecimal, Min, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { Currency } from '../common/enums/currency.enum';

export class InvoiceFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: InvoiceStatus,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Minimum amount filter',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsDecimal()
  @Min(0)
  minAmount?: string;

  @ApiPropertyOptional({
    description: 'Maximum amount filter',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsDecimal()
  @Min(0)
  maxAmount?: string;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by currency',
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}