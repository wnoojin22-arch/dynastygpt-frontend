<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Billy's standing local flow

`localhost:3000` FE against **local uvicorn on 8000** with `DEV_AUTH_BYPASS=true` set in the BE `.env`. This is how all FE testing has been done for 12 months. `.env.local` must have `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (the `next.config.ts` rewrite rewrites `localhost` → `127.0.0.1` because uvicorn binds v4 only).

Do NOT point local FE at prod API — the FE uses a dev-instance Clerk publishable key (`pk_test_...` → `definite-mollusk-32.clerk.accounts.dev`) whose tokens do not verify against the prod Clerk JWKS the prod BE checks (`clerk.app.dynastygpt.com`). Every authenticated `/api/*` call 401s. Local uvicorn with `DEV_AUTH_BYPASS=true` sidesteps the whole verification path — that is the whole point of the setup.
<!-- END:nextjs-agent-rules -->
