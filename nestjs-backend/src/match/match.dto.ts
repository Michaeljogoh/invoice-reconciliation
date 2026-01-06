import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { MatchStatus } from '@/common/enums/match-status.enum';

registerEnumType(MatchStatus, { name: 'MatchStatus' });

@ObjectType()
export class MatchCandidateDto {
  @Field(() => String) id: string;
  @Field(() => String) tenantId: string;
  @Field(() => String) invoiceId: string;
  @Field(() => String) bankTransactionId: string;
  @Field(() => MatchStatus) status: MatchStatus;
  @Field(() => Number) score: number;
  @Field(() => String) explanation: string;
  @Field(() => Date) createdAt: Date;
  @Field(() => Date, { nullable: true }) updatedAt?: Date;
}