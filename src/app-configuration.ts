import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { GlobalExceptionFilter, HttpLoggingInterceptor, REQUEST_ID_SCHEMA } from './common';

export function configureApplication(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(app.get(HttpLoggingInterceptor));
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Med-desafio API')
    .setDescription(
      'API para receber pedidos, documentos e exames em qualquer ordem e reconciliá-los por AccessionNumber.',
    )
    .setVersion('1.0.0')
    .addTag('Pedidos')
    .addTag('Documentos')
    .addTag('Exames')
    .addTag('Operação')
    .addGlobalParameters({
      name: 'x-request-id',
      in: 'header',
      required: false,
      description:
        'Identificador opcional de correlação. Se ausente ou inválido, a API gera um UUID e o devolve na resposta.',
      schema: REQUEST_ID_SCHEMA,
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
  });
}
