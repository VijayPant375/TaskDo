export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthSessionResponse {
  googleOAuthEnabled: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
}
