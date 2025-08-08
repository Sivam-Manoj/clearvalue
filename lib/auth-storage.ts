export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = 'cv_access_token';
const REFRESH_KEY = 'cv_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {}
}

export function setAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
  } catch {}
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}
