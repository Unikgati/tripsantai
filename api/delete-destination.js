// api/delete-destination.js
// Serverless endpoint to delete a destination using SUPABASE_SERVICE_ROLE_KEY.
// Expects JSON body: { id: <number> }
// Environment variables required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  };

  setCors();
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });

  // Expect Authorization: Bearer <user_access_token>
  const authHeader = (req.headers.authorization || '');
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    // verify user token
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SERVICE_ROLE_KEY }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // check admin table
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Accept': 'application/json' }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text().catch(() => '<no body>');
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

    const payload = req.body;
    const id = payload && (payload.id ?? payload.destinationId ?? payload.destination_id);
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // perform delete using service role
    const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/destinations?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    });

    if (!deleteResp.ok) {
      const txt = await deleteResp.text().catch(() => '<no body>');
      console.error('delete-destination: PostgREST delete failed', deleteResp.status, txt);
      return res.status(deleteResp.status || 500).json({ error: 'Delete failed', status: deleteResp.status, detail: txt });
    }

    let deleted;
    try { deleted = await deleteResp.json(); } catch (e) { deleted = null; }
    return res.status(200).json({ data: deleted });

  } catch (err) {
    console.error('delete-destination error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
