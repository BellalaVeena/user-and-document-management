import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ingestion } from './entities/ingestion.entity';
import { Document } from '../document/entities/document.entity';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Ingestion, Document])],
  controllers: [IngestionController],
  providers: [IngestionService, RolesGuard],
  exports: [IngestionService],
})
export class IngestionModule {}
