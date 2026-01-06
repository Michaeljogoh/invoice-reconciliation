import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { MatchResolver } from './match.resolver';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [MatchController],
  providers: [MatchService, MatchResolver],
  exports: [MatchService],
})
export class MatchModule {}