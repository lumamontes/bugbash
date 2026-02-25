import { decodeJwt } from 'jose';

const baseUrl = () => import.meta.env.KEYCLOAK_BASE_URL || process.env.KEYCLOAK_BASE_URL || '';
const realm = () => import.meta.env.KEYCLOAK_REALM || process.env.KEYCLOAK_REALM || 'backoffice';
const clientId = () => import.meta.env.KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || '';
const clientSecret = () => import.meta.env.KEYCLOAK_CLIENT_SECRET || process.env.KEYCLOAK_CLIENT_SECRET || '';

function tokenEndpoint(): string {
  return `${baseUrl()}/realms/${realm()}/protocol/openid-connect/token`;
}

function revokeEndpoint(): string {
  return `${baseUrl()}/realms/${realm()}/protocol/openid-connect/revoke`;
}

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

export async function exchangeCredentials(
  email: string,
  password: string,
): Promise<{ tokens: KeycloakTokenResponse; userInfo: KeycloakUserInfo }> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId(),
    client_secret: clientSecret(),
    username: email,
    password,
    scope: 'openid',
  });

  const res = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Keycloak auth failed: ${res.status} ${errBody}`);
  }

  const tokens = (await res.json()) as KeycloakTokenResponse;
  const userInfo = parseAccessToken(tokens.access_token);

  return { tokens, userInfo };
}

export function parseAccessToken(accessToken: string): KeycloakUserInfo {
  const payload = decodeJwt(accessToken) as Record<string, any>;

  return {
    sub: payload.sub || '',
    email: payload.email || payload.preferred_username || '',
    name: payload.name || payload.preferred_username || '',
    roles: payload.realm_access?.roles || [],
  };
}

export function mapKeycloakRole(roles: string[]): 'admin' | 'facilitator' | 'participant' {
  if (roles.includes('admin') || roles.includes('realm-admin')) return 'admin';
  if (roles.includes('facilitator') || roles.includes('manager')) return 'facilitator';
  return 'participant';
}

export async function refreshTokens(refreshToken: string): Promise<KeycloakTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
  });

  const res = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Keycloak token refresh failed: ${res.status}`);
  }

  return (await res.json()) as KeycloakTokenResponse;
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });

  try {
    await fetch(revokeEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    // Silently ignore revocation errors — local session will be deleted anyway
  }
}
