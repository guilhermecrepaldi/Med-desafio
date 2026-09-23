import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule, RequestIdMiddleware } from './common';
import { DatabaseModule } from './database/database.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ExamesModule } from './exames/exames.module';
import { HealthModule } from './health/health.module';
import { IntegrationModule } from './integration';
import { PedidosModule } from './pedidos/pedidos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    CommonModule,
    DatabaseModule,
    IntegrationModule,
    PedidosModule,
    DocumentosModule,
    ExamesModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
