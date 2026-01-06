import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MatchService } from './match.service';
import { ConfirmMatchResponseDto } from '../dto/confirm-match.dto';

@ApiTags('Matches')
@ApiBearerAuth()
@Controller('tenants/:tenantId/matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post(':matchId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a proposed match' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'matchId',
    description: 'Match candidate ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Match confirmed successfully',
    type: ConfirmMatchResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Match candidate not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Match already confirmed or invoice has another confirmed match' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - wrong tenant' })
  async confirmMatch(
    @Param('tenantId') tenantId: string,
    @Param('matchId') matchId: string,
  ): Promise<ConfirmMatchResponseDto> {
    const match = await this.matchService.confirm(tenantId, matchId);

    return {
      id: match.id,
      status: match.status,
      updatedAt: match.updatedAt,
    };
  }
}