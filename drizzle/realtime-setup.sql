-- Configuración de Supabase Realtime (NO la maneja drizzle-kit).
-- Las tablas que el frontend escucha por postgres_changes deben estar en la
-- publicación `supabase_realtime`. Esto se aplica una sola vez por proyecto
-- Supabase (idempotente con el guard de abajo).
--
-- match_points → tabla de posiciones (puntos en vivo / al finalizar)
-- matches      → marcador en vivo (FixtureRealtime en dashboard y admin)
--
-- Si falta `matches`, el marcador en vivo NO se refresca solo en ninguna vista.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_points'
  ) then
    alter publication supabase_realtime add table match_points;
  end if;
end $$;
