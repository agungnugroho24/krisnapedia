# KRISNApedia self-hosted migration

Target: React/TanStack Router, custom React admin at `/studio`, Node API, PostgreSQL, and project-owned uploads.

The current Cloudflare Worker target must be replaced for a direct PostgreSQL TCP connection. If Cloudflare is required, expose PostgreSQL through a private HTTP API instead of importing a PostgreSQL driver into the Worker.

Apply `database/schema.sql` to an empty local database. `long_description` and FAQ `answer` remain JSONB so the existing Portable Text format can be migrated without losing formatting.

Migration order:

1. Export the Sanity dataset and assets before removing credentials.
2. Import categories, content, FAQs, and assets into PostgreSQL/local uploads.
3. Run the local API read-only and compare record counts with Sanity.
4. Switch public queries to the local API.
5. Enable admin authentication and CRUD in `/studio`.
6. Move view counters from Supabase to `content_views`.
7. Remove Sanity, Supabase, and Lovable packages/configuration after smoke tests.

Required environment:

```env
DATABASE_URL=postgres://krisnapedia:password@127.0.0.1:5432/krisnapedia
SESSION_SECRET=replace-with-a-long-random-value
UPLOAD_DIR=./uploads
```
