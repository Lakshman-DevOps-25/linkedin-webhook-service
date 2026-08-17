// Liveness/readiness probe: returns ok plus a timestamp.
export function healthz(_req, res) {
  res.json({ ok: true, ts: new Date().toISOString() });
}
