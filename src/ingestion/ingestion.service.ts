/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingestion, IngestionStatus } from './entities/ingestion.entity';
import { CreateIngestionDto } from './dto/create-ingestion.dto';
import { UpdateIngestionDto } from './dto/update-ingestion.dto';
import { Document } from '../document/entities/document.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly pythonBackendUrl: string;

  constructor(
    @InjectRepository(Ingestion)
    private ingestionRepository: Repository<Ingestion>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private configService: ConfigService,
  ) {
    this.pythonBackendUrl =
      this.configService.get<string>('PYTHON_BACKEND_URL') ||
      'http://localhost:5000';
  }

  async create(
    createIngestionDto: CreateIngestionDto,
    user: User,
  ): Promise<Ingestion> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: createIngestionDto.documentId },
      });

      if (!document) {
        this.logger.warn(
          `Document not found with ID: ${createIngestionDto.documentId}`,
        );
        throw new NotFoundException(
          `Document with ID ${createIngestionDto.documentId} not found`,
        );
      }

      const ingestion = this.ingestionRepository.create({
        document,
        documentId: document.id,
        triggeredBy: user,
        triggeredById: user.id,
        status: IngestionStatus.PENDING,
      });

      const savedIngestion = await this.ingestionRepository.save(ingestion);

      // Trigger the Python backend processing
      await this.triggerProcessing(
        savedIngestion.id,
        document.filePath,
        createIngestionDto.parameters,
      );

      this.logger.log(
        `Successfully created ingestion with ID: ${savedIngestion.id}`,
      );
      return savedIngestion;
    } catch (error) {
      this.logger.error(
        `Failed to create ingestion for document ID: ${createIngestionDto.documentId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findAll(user: User): Promise<Ingestion[]> {
    try {
      const query = this.ingestionRepository
        .createQueryBuilder('ingestion')
        .leftJoinAndSelect('ingestion.document', 'document')
        .leftJoinAndSelect('ingestion.triggeredBy', 'user');

      if (user.role !== UserRole.ADMIN) {
        query.where('ingestion.triggeredById = :userId', { userId: user.id });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error(
        'Failed to fetch ingestions',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findOne(id: number, user: User): Promise<Ingestion> {
    try {
      const query = this.ingestionRepository
        .createQueryBuilder('ingestion')
        .leftJoinAndSelect('ingestion.document', 'document')
        .leftJoinAndSelect('ingestion.triggeredBy', 'user')
        .where('ingestion.id = :id', { id });

      if (user.role !== UserRole.ADMIN) {
        query.andWhere('ingestion.triggeredById = :userId', {
          userId: user.id,
        });
      }

      const ingestion = await query.getOne();

      if (!ingestion) {
        this.logger.warn(`Ingestion not found with ID: ${id}`);
        throw new NotFoundException(`Ingestion with ID ${id} not found`);
      }

      return ingestion;
    } catch (error) {
      this.logger.error(
        `Failed to fetch ingestion with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updateIngestionDto: UpdateIngestionDto,
    user: User,
  ): Promise<Ingestion> {
    try {
      const ingestion = await this.findOne(id, user);

      const updatedIngestion = await this.ingestionRepository.save({
        ...ingestion,
        ...updateIngestionDto,
      });

      this.logger.log(`Successfully updated ingestion with ID: ${id}`);
      return updatedIngestion;
    } catch (error) {
      this.logger.error(
        `Failed to update ingestion with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async triggerProcessing(
    ingestionId: number,
    filePath: string,
    parameters?: Record<string, any>,
  ): Promise<void> {
    try {
      // Update ingestion status to processing
      await this.ingestionRepository.update(ingestionId, {
        status: IngestionStatus.IN_PROGRESS,
      });

      // Call Python backend
      await axios.post(`${this.pythonBackendUrl}/process`, {
        ingestionId,
        filePath,
        parameters,
      });

      this.logger.log(
        `Successfully triggered processing for ingestion ID: ${ingestionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger processing for ingestion ID: ${ingestionId}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Update ingestion status to failed
      await this.ingestionRepository.update(ingestionId, {
        status: IngestionStatus.FAILED,
        error: error instanceof Error ? error.message : 'Processing failed',
      });

      throw error;
    }
  }
}
