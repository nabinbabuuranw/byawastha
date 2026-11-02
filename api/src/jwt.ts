// Clerk session-token verification (RS256 via the instance's public JWKS). No secret is needed to verify.
export interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }
export interface Claims { sub: string; iss: string; exp: number; nbf?: number; iat?: number; azp?: string; sid?: string; email?: string; name?: string; email_verified?: string | boolean; [k: string]: unknown }
export class AuthError extends Error { constructor(public code: string) { super(code); } }

const b64uToBytes = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const dec = new TextDecoder();

let cache: { url: string; at: number; keys: Jwk[] } | null = null;
export async function fetchJwks(url: string, fetcher: typeof fetch = fetch): Promise<Jwk[]> {
  if (cache && cache.url === url && Date.now() - cache.at < 10 * 60_000) return cache.keys;
  const r = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new AuthError('jwks_unavailable');
  const j: any = await r.json();
  if (!Array.isArray(j?.keys)) throw new AuthError('jwks_unavailable');
  cache = { url, at: Date.now(), keys: j.keys };
  return j.keys;
}
export function clearJwksCache() { cache = null; }

export interface VerifyOpts { issuer: string; keys: Jwk[] | (() => Promise<Jwk[]>); authorizedParties?: string[]; now?: number; leewaySec?: number }
export async function verifyJwt(token: string, o: VerifyOpts): Promise<Claims> {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new AuthError('token_malformed');
  let header: any, claims: Claims;
  try { header = JSON.parse(dec.decode(b64uToBytes(parts[0]))); claims = JSON.parse(dec.decode(b64uToBytes(parts[1]))); } catch { throw new AuthError('token_malformed'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new AuthError('token_alg');
  const keys = typeof o.keys === 'function' ? await o.keys() : o.keys;
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw new AuthError('token_unknown_key');
  const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true } as JsonWebKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new AuthError('token_signature');
  const now = Math.floor((o.now ?? Date.now()) / 1000); const leeway = o.leewaySec ?? 5;
  if (typeof claims.exp !== 'number' || claims.exp + leeway < now) throw new AuthError('token_expired');
  if (typeof claims.nbf === 'number' && claims.nbf - leeway > now) throw new AuthError('token_not_yet_valid');
  if (claims.iss !== o.issuer) throw new AuthError('token_issuer');
  if (typeof claims.sub !== 'string' || !/^user_[A-Za-z0-9]+$/.test(claims.sub)) throw new AuthError('token_subject');
  if (claims.azp && o.authorizedParties && o.authorizedParties.length && !o.authorizedParties.includes(claims.azp)) throw new AuthError('token_azp');
  return claims;
}

/** Clerk publishable keys are base64("<frontend-api-host>$"); the issuer is https://<host>. */
export function issuerFromPublishableKey(pk: string): string {
  const m = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(pk || '');
  if (!m) return '';
  try { const host = atob(m[2].replace(/-/g, '+').replace(/_/g, '/')).replace(/\$$/, ''); return /^[a-z0-9.-]+$/i.test(host) ? 'https://' + host : ''; } catch { return ''; }
}
