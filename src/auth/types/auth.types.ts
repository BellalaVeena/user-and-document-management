import { UserRole } from '../dto/register.dto';

export interface JwtPayload {
  username: string;
  sub: number;
  role: UserRole;
  type: 'access' | 'refresh';
  exp?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserResponse {
  id: number;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
} 