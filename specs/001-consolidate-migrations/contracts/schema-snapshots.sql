-- Schema snapshot queries (determinísticos) para validar paridade baseline vs full-chain
--
-- Objetivo: cobrir pontos cegos conhecidos de tooling (publication, buckets, flags de segurança).

-- Publications
select *
from pg_publication
order by pubname;

select *
from pg_publication_tables
order by pubname, schemaname, tablename;

-- Policies (RLS)
select schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
from pg_policies
order by schemaname, tablename, policyname;

-- RLS flags por tabela
select n.nspname as schemaname,
       c.relname as tablename,
       c.relrowsecurity,
       c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p')
  and n.nspname not in ('pg_catalog','information_schema')
order by n.nspname, c.relname;

-- Storage buckets (dados que representam configuração do produto)
-- Observação: isso exige que o schema storage exista e a tabela buckets esteja acessível.
select id,
       name,
       public,
       file_size_limit,
       allowed_mime_types
from storage.buckets
order by name;

-- Grants (tabelas)
select table_schema,
       table_name,
       privilege_type,
       grantee
from information_schema.role_table_grants
where table_schema not in ('pg_catalog','information_schema')
order by table_schema, table_name, privilege_type, grantee;

-- Grants (rotinas)
select routine_schema,
       routine_name,
       privilege_type,
       grantee
from information_schema.role_routine_grants
where routine_schema not in ('pg_catalog','information_schema')
order by routine_schema, routine_name, privilege_type, grantee;
