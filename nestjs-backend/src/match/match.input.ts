import { InputType, Field, registerEnumType } from "@nestjs/graphql";
import { MatchStatus } from "@/common/enums/match-status.enum";


registerEnumType(MatchStatus, {
  name: "MatchStatus",
});



@InputType()
export class MatchStatusInput {
  @Field(() => MatchStatus, { nullable: true })
  status?: MatchStatus;

  @Field({ nullable: true })
  vendorId?: string;
}
