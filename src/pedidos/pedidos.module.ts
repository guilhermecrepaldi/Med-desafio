import { Module } from '@nestjs/common';

import { IntegrationModule } from '../integration';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [IntegrationModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
