import { Module } from '@nestjs/common';

import { IntegrationModule } from '../integration';
import { ExamesController } from './exames.controller';
import { ExamesService } from './exames.service';

@Module({
  imports: [IntegrationModule],
  controllers: [ExamesController],
  providers: [ExamesService],
})
export class ExamesModule {}
