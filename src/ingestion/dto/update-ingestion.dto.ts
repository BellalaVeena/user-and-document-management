import { IsEnum, IsOptional, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IngestionStatus } from '../entities/ingestion.entity';

export class UpdateIngestionDto {
  @ApiProperty({ enum: IngestionStatus, example: IngestionStatus.COMPLETED, description: 'Status of the ingestion', required: false })
  @IsEnum(IngestionStatus)
  @IsOptional()
  status?: IngestionStatus;

  @ApiProperty({ example: { processedPages: 100, extractedData: { /* ... */ } }, description: 'Results of the ingestion', required: false })
  @IsObject()
  @IsOptional()
  result?: Record<string, any>;

  @ApiProperty({ example: 'Failed to process page 5', description: 'Error message if ingestion failed', required: false })
  @IsString()
  @IsOptional()
  error?: string;
} 