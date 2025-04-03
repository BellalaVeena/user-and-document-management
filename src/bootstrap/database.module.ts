import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Document } from '../document/entities/document.entity';
import { Ingestion } from '../ingestion/entities/ingestion.entity';
import { TokenBlacklist } from '../auth/entities/token-blacklist.entity';
import * as os from 'os';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', os.userInfo().username),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'user_document_db'),
        entities: [User, Document, Ingestion, TokenBlacklist],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: 5,
        retryDelay: 3000, // 3 seconds
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
