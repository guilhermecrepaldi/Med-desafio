import { NestFactory } from '@nestjs/core';

import { configureApplication } from './app-configuration';
import { AppModule } from './app.module';
import { StructuredLogger } from './common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const logger = app.get(StructuredLogger);

  configureApplication(app);

  const port = parsePort(process.env.PORT);
  await app.listen(port, '0.0.0.0');
  logger.info('aplicacao.iniciada', { port });
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser uma porta válida entre 1 e 65535.');
  }

  return port;
}

void bootstrap();
