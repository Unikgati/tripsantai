// api/upsert-destination.js
// Serverless endpoint to upsert a destination using SUPABASE_SERVICE_ROLE_KEY.
// Environment variables required:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS: allow browser preflight and cross-origin requests from the frontend
  const setCors = () => {
    // In production replace '*' with your origin (e.g. https://your-site.com)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  };

  setCors();

  // Respond to preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  // Expect Authorization: Bearer <user_access_token>
  const authHeader = (req.headers.authorization || '');
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    // 1) Verify user token via Supabase auth endpoint
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': SERVICE_ROLE_KEY,
      }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // 2) Check admins table using service_role key (bypass RLS)
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text();
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

    // 3) Validate payload shape (basic)
    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });

    // Minimal allowed fields; map camelCase keys to DB column names (lowercased)
    const allowed = ['id','title','slug','shortDescription','longDescription','imageUrl','priceTiers','features','tags','duration'];
    const keyMap = {
      id: 'id',
      title: 'title',
      slug: 'slug',
      shortDescription: 'shortdescription',
      longDescription: 'longdescription',
      imageUrl: 'imageurl',
      priceTiers: 'pricetiers',
      features: 'features',
      tags: 'tags',
      duration: 'duration'
    };
    const safePayload = {};
    for (const k of allowed) {
      if (k in payload) {
        const col = keyMap[k] || k.toLowerCase();
        safePayload[col] = payload[k];
      }
    }

    // 4) Perform upsert via PostgREST (REST) using service role
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/destinations`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([safePayload])
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text();
      return res.status(500).json({ error: 'Upsert failed', detail: errText });
    }

    const inserted = await insertResp.json();
    return res.status(200).json({ data: inserted[0] });

  } catch (err) {
    console.error('upsert-destination error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
