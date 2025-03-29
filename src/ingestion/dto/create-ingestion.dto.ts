import { IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIngestionDto {
  @ApiProperty({ example: 1, description: 'ID of the document to ingest' })
  @IsNumber()
  documentId: number;

  @ApiProperty({ example: { priority: 'high', batchSize: 1000 }, description: 'Additional ingestion parameters', required: false })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
} 