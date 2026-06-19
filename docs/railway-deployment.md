# Railway deployment

Configure these variables on the `werewolf-ai` service in the target Railway environment:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role or server secret key

Do not prefix these names with `NEXT_PUBLIC_`. The service-role key must remain server-only.

The expected database schema is in `docs/supabase-schema.sql`.

