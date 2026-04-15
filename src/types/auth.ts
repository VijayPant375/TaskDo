export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  mfaEnabled?: boolean;
  username?: string;
}

export interface AuthSessionResponse {
  googleOAuthEnabled: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
}

export interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    mfaEnabled?: boolean;
    username: string;
  };
  requiresMFA?: boolean;
  email?: string;
  mfaToken?: string;
}

export interface AuthSubmission {
  email: string;
  username: string;
  password: string;
}
