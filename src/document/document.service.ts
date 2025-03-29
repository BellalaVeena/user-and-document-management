import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { User, UserRole } from '../user/entities/user.entity';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    user: User,
  ): Promise<Document> {
    try {
      const document = this.documentRepository.create({
        ...createDocumentDto,
        uploadedBy: user,
        uploadedById: user.id,
        status: DocumentStatus.PENDING,
      });

      const savedDocument = await this.documentRepository.save(document);
      this.logger.log(
        `Successfully created document: ${createDocumentDto.title}`,
      );
      return savedDocument;
    } catch (error) {
      this.logger.error(
        `Failed to create document: ${createDocumentDto.title}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findAll(user: User): Promise<Document[]> {
    try {
      this.logger.log('Fetching all documents');
      const query = this.documentRepository
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.uploadedBy', 'user');

      if (user.role !== UserRole.ADMIN) {
        query.where('document.uploadedById = :userId', { userId: user.id });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error(
        'Failed to fetch documents',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findOne(id: number, user: User): Promise<Document> {
    try {
      const query = this.documentRepository
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.uploadedBy', 'user')
        .where('document.id = :id', { id });

      if (user.role !== UserRole.ADMIN) {
        query.andWhere('document.uploadedById = :userId', { userId: user.id });
      }

      const document = await query.getOne();

      if (!document) {
        this.logger.warn(`Document not found with ID: ${id}`);
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      return document;
    } catch (error) {
      this.logger.error(
        `Failed to fetch document with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    user: User,
  ): Promise<Document> {
    try {
      const document = await this.findOne(id, user);

      const updatedDocument = await this.documentRepository.save({
        ...document,
        ...updateDocumentDto,
      });

      this.logger.log(`Successfully updated document with ID: ${id}`);
      return updatedDocument;
    } catch (error) {
      this.logger.error(
        `Failed to update document with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async remove(id: number, user: User): Promise<void> {
    try {
      const document = await this.findOne(id, user);
      await this.documentRepository.remove(document);
      this.logger.log(`Successfully removed document with ID: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove document with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateStatus(
    id: number,
    status: DocumentStatus,
    user: User,
  ): Promise<Document> {
    try {
      const document = await this.findOne(id, user);

      const updatedDocument = await this.documentRepository.save({
        ...document,
        status,
      });

      this.logger.log(`Successfully updated document status with ID: ${id}`);
      return updatedDocument;
    } catch (error) {
      this.logger.error(
        `Failed to update document status with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
