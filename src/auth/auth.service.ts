/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import {
  JwtPayload,
  LoginResponse,
  TokenResponse,
  UserResponse,
} from './types/auth.types';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { UserRole } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly loginAttempts = new Map<
    string,
    { count: number; timestamp: number }
  >();

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  private validatePassword(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new HttpException(
        `Password must be at least ${minLength} characters long`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new HttpException(
        'Password must contain uppercase, lowercase, numbers and special characters',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private checkLoginAttempts(username: string): void {
    const attempts = this.loginAttempts.get(username);
    if (attempts) {
      if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        const lockoutTime = attempts.timestamp + this.LOCKOUT_DURATION;
        if (Date.now() < lockoutTime) {
          const remainingTime = Math.ceil(
            (lockoutTime - Date.now()) / 1000 / 60,
          );
          throw new HttpException(
            `Account is locked. Try again in ${remainingTime} minutes`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          this.loginAttempts.delete(username);
        }
      }
    }
  }

  private updateLoginAttempts(username: string, success: boolean): void {
    if (success) {
      this.loginAttempts.delete(username);
    } else {
      const attempts = this.loginAttempts.get(username) || {
        count: 0,
        timestamp: Date.now(),
      };
      attempts.count += 1;
      attempts.timestamp = Date.now();
      this.loginAttempts.set(username, attempts);
    }
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<UserResponse | null> {
    try {
      this.logger.log(`Validating user: ${username}`);
      const user = await this.userService.findByUsername(username);

      if (!user) {
        this.logger.warn(`User not found: ${username}`);
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${username}`);
        return null;
      }

      this.logger.log(`Successfully validated user: ${username}`);
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to validate user: ${username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Validation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(user): Promise<LoginResponse> {
    try {
      this.logger.log(`Generating tokens for user: ${user.username}`);
      const payload: JwtPayload = {
        username: user.username,
        sub: user.id,
        role: user.role,
        type: 'access',
      };
      const refreshPayload: JwtPayload = {
        ...payload,
        type: 'refresh',
      };

      const access_token = await this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      });
      const refresh_token = await this.jwtService.signAsync(refreshPayload, {
        expiresIn: '7d',
      });

      this.logger.log(
        `Successfully generated tokens for user: ${user.username}`,
      );
      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate tokens for user: ${user.username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async register(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<UserResponse> {
    try {
      this.validatePassword(password);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.userService.create({
        username,
        password: hashedPassword,
        role,
        isActive: true,
      });

      const { password: _, ...result } = user;
      this.logger.log(`Successfully registered user: ${username}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to register user: ${username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async refreshToken(refresh_token: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refresh_token);
      if (payload.type !== 'refresh') {
        throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      const { access_token, refresh_token: new_refresh_token } =
        await this.login(user);
      return {
        access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error) {
      this.logger.error(
        'Failed to refresh token',
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || !('exp' in decoded)) {
        throw new UnauthorizedException('Invalid token');
      }

      const expiresAt = new Date(decoded.exp * 1000);
      await this.tokenBlacklistService.blacklistToken(token, expiresAt);
      this.logger.log('Successfully processed logout request');
    } catch (error) {
      this.logger.error(
        'Failed to process logout request',
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Logout failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
