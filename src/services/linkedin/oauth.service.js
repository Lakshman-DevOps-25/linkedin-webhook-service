import crypto from "node:crypto";
import { config } from "../../config/index.js";
import { HttpError } from "../../utils/backoff.js";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

const states = new Map();

// Build the LinkedIn authorization URL and remember its CSRF state token.
export function buildAuthUrl() {
  const state = crypto.randomBytes(16).toString("hex");
  states.set(state, Date.now());
  const q = new URLSearchParams({
    response_type: "code",
    client_id: config.LINKEDIN_CLIENT_ID,
    redirect_uri: config.LINKEDIN_REDIRECT_URI,
    scope: config.LINKEDIN_SCOPE,
    state,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

// Validate and one-time-consume a CSRF state token from the auth request.
export function consumeState(state) {
  const ok = states.has(state);
  states.delete(state);
  return ok;
}

// Exchange an authorization code for an access token (3-legged OAuth).
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.LINKEDIN_CLIENT_ID,
    client_secret: config.LINKEDIN_CLIENT_SECRET,
    redirect_uri: config.LINKEDIN_REDIRECT_URI,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new HttpError(res.status, `token exchange failed: ${await res.text()}`);
  return res.json();
}

// Exchange a refresh token for a new access token (only if the app is provisioned for refresh tokens).
export async function refreshToken(refresh_token) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: config.LINKEDIN_CLIENT_ID,
    client_secret: config.LINKEDIN_CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new HttpError(res.status, `token refresh failed: ${await res.text()}`);
  return res.json();
}
