import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from '../user/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { UserResponse } from './types/auth.types';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let tokenBlacklistService: TokenBlacklistService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedPassword',
    role: UserRole.VIEWER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse: UserResponse = {
    id: 1,
    username: 'testuser',
    role: UserRole.VIEWER,
    isActive: true,
  };

  const mockUserService = {
    findByUsername: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockTokenBlacklistService = {
    blacklistToken: jest.fn(),
    isBlacklisted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      mockUserService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');
      expect(result).toEqual(mockUserResponse);
      expect(mockUserService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    it('should return null when user is not found', async () => {
      mockUserService.findByUsername.mockRejectedValue(new Error('User not found'));

      const result = await service.validateUser('nonexistentuser', 'password123');
      expect(result).toBeNull();
      expect(mockUserService.findByUsername).toHaveBeenCalledWith('nonexistentuser');
    });

    it('should return null when password is invalid', async () => {
      mockUserService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');
      expect(result).toBeNull();
      expect(mockUserService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    });
  });

  describe('login', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.signAsync.mockResolvedValueOnce('access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh_token');

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
          isActive: mockUser.isActive,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('register', () => {
    it('should register a new user and return user data without password', async () => {
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await service.register('newuser', 'Password123!', UserRole.VIEWER);

      expect(result).toEqual(mockUserResponse);
      expect(mockUserService.create).toHaveBeenCalled();
    });

    it('should throw an error with invalid password', async () => {
      await expect(service.register('newuser', 'weak', UserRole.VIEWER)).rejects.toThrow(HttpException);
      expect(mockUserService.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const payload = {
        username: 'testuser',
        sub: 1,
        role: UserRole.VIEWER,
        type: 'refresh',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce('new_access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('new_refresh_token');

      const result = await service.refreshToken('valid_refresh_token');

      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });

      expect(jwtService.verify).toHaveBeenCalledWith('valid_refresh_token');
      expect(userService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw unauthorized exception with invalid token type', async () => {
      const payload = {
        username: 'testuser',
        sub: 1,
        role: UserRole.VIEWER,
        type: 'access',
      };

      mockJwtService.verify.mockReturnValue(payload);

      await expect(service.refreshToken('invalid_type_token')).rejects.toThrow(HttpException);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('should throw unauthorized exception when user not found', async () => {
      const payload = {
        username: 'testuser',
        sub: 999,
        role: UserRole.VIEWER,
        type: 'refresh',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('valid_refresh_token')).rejects.toThrow(HttpException);
    });
  });

  describe('logout', () => {
    it('should blacklist the token successfully', async () => {
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockTokenBlacklistService.blacklistToken.mockResolvedValue(undefined);

      await expect(service.logout('valid_token')).resolves.not.toThrow();
      
      expect(jwtService.decode).toHaveBeenCalledWith('valid_token');
      expect(tokenBlacklistService.blacklistToken).toHaveBeenCalledWith(
        'valid_token',
        expect.any(Date)
      );
    });

    it('should throw unauthorized exception with invalid token', async () => {
      mockJwtService.decode.mockReturnValue(null);

      await expect(service.logout('invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(tokenBlacklistService.blacklistToken).not.toHaveBeenCalled();
    });

    it('should throw unauthorized exception with token missing expiration', async () => {
      mockJwtService.decode.mockReturnValue({});

      await expect(service.logout('invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(tokenBlacklistService.blacklistToken).not.toHaveBeenCalled();
    });
  });
}); 