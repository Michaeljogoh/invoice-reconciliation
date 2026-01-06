import { IsArray, IsNotEmpty, ValidateNested, IsString, IsDecimal, Min, IsDateString, IsEnum, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Currency } from '../common/enums/currency.enum';

class BankTransactionImportDto {
  @ApiProperty({
    description: 'External transaction ID (for idempotency)',
    example: 'BT-2024-0001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalId: string;

  @ApiProperty({
    description: 'Transaction posting date (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  postedAt: Date;

  @ApiProperty({
    description: 'Transaction amount',
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

  @ApiProperty({
    description: 'Transaction description',
    example: 'Payment to Office Supplies Co',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Transaction reference',
    example: 'REF-001',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}

export class BulkImportTransactionsDto {
  @ApiProperty({
    description: 'List of transactions to import',
    type: [BankTransactionImportDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankTransactionImportDto)
  transactions: BankTransactionImportDto[];
}

