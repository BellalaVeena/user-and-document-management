import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({
    example: 'Project Report',
    description: 'Title of the document',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'report.pdf', description: 'Name of the file' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: '/uploads/report.pdf',
    description: 'Path to the file',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiProperty({
    example: { author: 'John Doe', category: 'Report' },
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
