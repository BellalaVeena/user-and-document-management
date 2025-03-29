/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(
        registerDto.username,
        registerDto.password,
        registerDto.role,
      );
      this.logger.log(`Successfully registered user: ${registerDto.username}`);
      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to register user: ${registerDto.username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const user = await this.authService.validateUser(
        loginDto.username,
        loginDto.password,
      );
      if (!user) {
        this.logger.warn(`Failed login attempt for user: ${loginDto.username}`);
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
      this.logger.log(`Successfully logged in user: ${loginDto.username}`);
      return this.authService.login(user);
    } catch (error: unknown) {
      this.logger.error(
        `Login failed for user: ${loginDto.username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Login failed',
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Headers('authorization') authHeader: string,
    @GetUser() user: User,
  ) {
    try {
      this.logger.log(`Logging out user: ${user.username}`);
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
      }
      await this.authService.logout(token);
      return { message: 'Successfully logged out' };
    } catch (error: unknown) {
      this.logger.error(
        `Logout failed for user: ${user.username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Logout failed',
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
