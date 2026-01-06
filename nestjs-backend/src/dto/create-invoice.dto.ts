import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDecimal,
  Min,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../common/enums/currency.enum';


export class CreateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Vendor ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Invoice number',
    example: 'INV-001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @ApiProperty({
    description: 'Invoice amount',
    example: 1500.0,
    minimum: 0,
  })
  @IsDecimal()
  @Min(0)
  amount: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    enum: Currency,
    default: Currency.USD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.USD;

  @ApiPropertyOptional({
    description: 'Invoice date (ISO 8601)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  invoiceDate?: Date;

  @ApiPropertyOptional({
    description: 'Due date (ISO 8601)',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Invoice description',
    example: 'Office supplies - January 2024',
  })
  @IsOptional()
  @IsString()
  description?: string;
}