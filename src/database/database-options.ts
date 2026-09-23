import { config } from 'dotenv';
import type { DataSourceOptions } from 'typeorm';

import {
  DocumentoEntity,
  DocumentoExameEntity,
  ExameEntity,
  ItemPedidoEntity,
  PedidoEntity,
} from './entities';
import { InitialSchema1710000000000 } from './migrations/1710000000000-initial-schema';

config({ quiet: true });

function readPort(value: string | undefined): number {
  const port = Number(value ?? '5432');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT deve ser uma porta válida entre 1 e 65535.');
  }

  return port;
}

export function createDatabaseOptions(
  environment: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const isTest = environment.NODE_ENV === 'test';

  return {
    type: 'postgres',
    host: environment.DB_HOST ?? 'localhost',
    port: readPort(environment.DB_PORT),
    username: environment.DB_USERNAME ?? 'postgres',
    password: environment.DB_PASSWORD ?? 'postgres',
    database: environment.DB_DATABASE ?? (isTest ? 'med_desafio_test' : 'med_desafio'),
    entities: [PedidoEntity, ItemPedidoEntity, ExameEntity, DocumentoEntity, DocumentoExameEntity],
    migrations: [InitialSchema1710000000000],
    migrationsRun: environment.RUN_MIGRATIONS_ON_START === 'true',
    synchronize: false,
    logging: false,
  };
}
