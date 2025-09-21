Operational runbook for ayotrip

1) Required environment variables (set in Vercel - Project Settings -> Environment Variables)

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- VITE_CLOUDINARY_CLOUD_NAME
- VITE_CLOUDINARY_UPLOAD_PRESET
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET (server-only)

2) Rotate leaked keys

- Supabase: Project -> Settings -> API -> Regenerate service_role key. Update Vercel env.
- Cloudinary: Console -> Settings -> API Keys -> Regenerate API Secret. Update Vercel env.

3) Backups

- Supabase: enable scheduled backups or PITR in Supabase Dashboard -> Backups.
- Test restore periodically.

4) Quick smoke test

- Homepage: curl -I https://ayotrip.vercel.app
- Admin create invoice (requires user access token):
  - Get user token via Supabase Auth (grant_type=password)
  - Call POST /api/create-invoice with Authorization: Bearer <token>

5) Logs & Troubleshooting

- Vercel: Project -> Deployments -> open latest -> Logs. Filter by function name (create-invoice).
- Supabase: Database -> Logs / Auth -> Logs.

6) CI

- Minimal CI configured: .github/workflows/ci.yml runs npm ci and npm run build on push.

7) Contact

- Document who has access to Supabase & Cloudinary admin consoles.
