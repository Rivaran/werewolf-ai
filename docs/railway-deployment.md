# Railway deployment

Configure these variables on the `werewolf-ai` service in the target Railway environment:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role or server secret key
- `WEREWOLF_MCP_TOKEN`: sufficiently long secret used by remote AI connectors

Do not prefix these names with `NEXT_PUBLIC_`. The service-role key must remain server-only.

The expected database schema is in `docs/supabase-schema.sql`.

## Remote MCP

After deployment, configure each AI connector with:

```text
https://werewolf-ai-production.up.railway.app/mcp?token=<WEREWOLF_MCP_TOKEN>
```

Anyone who knows this URL can operate the game. Do not include the token in public
articles or screenshots. Rotate `WEREWOLF_MCP_TOKEN` in Railway if it leaks.
