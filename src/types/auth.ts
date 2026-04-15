export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
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
    username: string;
  };
  requiresMFA?: boolean;
  email?: string;
}

export interface AuthSubmission {
  email: string;
  username: string;
  password: string;
}
