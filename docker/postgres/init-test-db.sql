SELECT format('CREATE DATABASE %I OWNER %I', 'med_desafio_test', current_user)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = 'med_desafio_test'
)
\gexec
