import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '../entities/document.entity';

export class UpdateDocumentDto {
  @ApiProperty({
    example: 'Updated Project Report',
    description: 'Title of the document',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'updated-report.pdf',
    description: 'Name of the file',
    required: false,
  })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiProperty({
    example: '/uploads/updated-report.pdf',
    description: 'Path to the file',
    required: false,
  })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiProperty({
    example: { author: 'John Doe', category: 'Report', version: '2.0' },
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    enum: DocumentStatus,
    example: DocumentStatus.COMPLETED,
    description: 'Status of the document',
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}
