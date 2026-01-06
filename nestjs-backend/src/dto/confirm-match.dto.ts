import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMatchResponseDto {
  @ApiProperty({
    description: 'Match candidate ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated match status',
    example: 'confirmed',
  })
  status: string;

  @ApiProperty({
    description: 'Confirmation timestamp',
    example: '2024-01-20T10:30:00.000Z',
  })
  updatedAt: Date;
}