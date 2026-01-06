import { ApiProperty } from '@nestjs/swagger';

export class AiExplanationResponseDto {
  @ApiProperty({
    description: 'Natural language explanation of the match',
    example: 'This invoice and transaction match perfectly with the same amount of $1,500.00 and similar descriptions.',
  })
  explanation: string;

  @ApiProperty({
    description: 'Confidence level of the match',
    example: 'high',
    enum: ['high', 'medium', 'low'],
  })
  confidence: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: 'Scoring details',
    example: {
      exactAmount: 1000,
      dateProximity: 300,
      textSimilarity: 200,
      total: 1500,
    },
  })
  scoreBreakdown: Record<string, number>;

  @ApiProperty({
    description: 'Whether AI was used or fallback was triggered',
    example: true,
  })
  aiGenerated: boolean;
}