process.env.NODE_ENV = 'test';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USERNAME ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_DATABASE ??= 'med_desafio_test';
process.env.RUN_MIGRATIONS_ON_START = 'false';
