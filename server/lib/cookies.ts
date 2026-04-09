import type { Response } from 'express';

export const accessCookieName = 'taskdo_access_token';
export const refreshCookieName = 'taskdo_refresh_token';

export function parseCookies(header: string | undefined) {
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((accumulator, part) => {
    const [name, ...valueParts] = part.trim().split('=');
    if (!name) {
      return accumulator;
    }

    accumulator[name] = decodeURIComponent(valueParts.join('='));
    return accumulator;
  }, {});
}

function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function setAuthCookies(
  response: Response,
  input: {
    accessToken: string;
    accessTokenMaxAgeSeconds: number;
    refreshToken: string;
    refreshTokenMaxAgeSeconds: number;
    secureCookies: boolean;
  }
) {
  response.append(
    'Set-Cookie',
    serializeCookie(accessCookieName, input.accessToken, {
      httpOnly: true,
      maxAge: input.accessTokenMaxAgeSeconds,
      path: '/',
      sameSite: 'Lax',
      secure: input.secureCookies,
    })
  );
  response.append(
    'Set-Cookie',
    serializeCookie(refreshCookieName, input.refreshToken, {
      httpOnly: true,
      maxAge: input.refreshTokenMaxAgeSeconds,
      path: '/',
      sameSite: 'Lax',
      secure: input.secureCookies,
    })
  );
}

export function clearAuthCookies(response: Response, secureCookies: boolean) {
  response.append(
    'Set-Cookie',
    serializeCookie(accessCookieName, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'Lax',
      secure: secureCookies,
    })
  );
  response.append(
    'Set-Cookie',
    serializeCookie(refreshCookieName, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'Lax',
      secure: secureCookies,
    })
  );
}
