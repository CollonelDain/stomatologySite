export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
}

export interface TokenRefreshResponse {
  access: string;
}