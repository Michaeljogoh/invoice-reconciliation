import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchStatusInput } from './match.input';
import { MatchCandidateDto } from './match.dto';

@Resolver(() => MatchCandidateDto)   // optional, but keeps things grouped
export class MatchResolver {
  constructor(private readonly matchService: MatchService) {}

  @Query(() => [MatchCandidateDto], { name: 'matchCandidates' })
  async matchCandidates(
    @Args('tenantId') tenantId: string,
    @Args('filters', { type: () => MatchStatusInput, nullable: true })
    filters?: MatchStatusInput,
  ) {
    const status = filters?.status;
    return this.matchService.findCandidates(tenantId, status);
  }

  @Mutation(() => MatchCandidateDto, { name: 'confirmMatch' })
  async confirmMatch(
    @Args('tenantId') tenantId: string,
    @Args('matchId') matchId: string,
  ) {
    return this.matchService.confirm(tenantId, matchId);
  }
}