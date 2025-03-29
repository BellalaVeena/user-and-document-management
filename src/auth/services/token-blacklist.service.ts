import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBlacklist } from '../entities/token-blacklist.entity';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {}

  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    try {
      this.logger.log('Blacklisting token');
      const blacklistedToken = this.tokenBlacklistRepository.create({
        token,
        expiresAt,
      });
      await this.tokenBlacklistRepository.save(blacklistedToken);
      this.logger.log('Token successfully blacklisted');
    } catch (error) {
      this.logger.error(
        'Failed to blacklist token',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.tokenBlacklistRepository.findOne({
        where: { token },
      });
      return !!blacklistedToken;
    } catch (error) {
      this.logger.error(
        'Failed to check token blacklist status',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      this.logger.log('Cleaning up expired blacklisted tokens');
      await this.tokenBlacklistRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now: new Date() })
        .execute();
      this.logger.log('Successfully cleaned up expired blacklisted tokens');
    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired blacklisted tokens',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
} 