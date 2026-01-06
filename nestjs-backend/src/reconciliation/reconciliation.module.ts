import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationResolver } from './reconciliation.resolver';
import { InvoiceModule } from '../invoice/invoice.module';
import { TransactionModule } from '../transaction/transaction.module';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [
    HttpModule,
    InvoiceModule,
    TransactionModule,
    MatchModule,
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationResolver],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}