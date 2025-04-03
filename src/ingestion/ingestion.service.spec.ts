import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from './ingestion.service';
import { Ingestion, IngestionStatus } from './entities/ingestion.entity';
import { Document, DocumentStatus } from '../document/entities/document.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateIngestionDto } from './dto/create-ingestion.dto';
import { UpdateIngestionDto } from './dto/update-ingestion.dto';
import { NotFoundException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');

describe('IngestionService', () => {
  let service: IngestionService;
  let ingestionRepository: Repository<Ingestion>;
  let documentRepository: Repository<Document>;
  let configService: ConfigService;

  const mockIngestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockDocumentRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5000'),
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNonAdminUser: User = {
    id: 2,
    username: 'editoruser',
    password: 'hashedPassword',
    role: UserRole.EDITOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument: Document = {
    id: 1,
    title: 'Test Document',
    filename: 'test.pdf',
    filePath: '/uploads/test.pdf',
    content: 'Test content',
    status: DocumentStatus.PENDING,
    metadata: { pages: 10, size: '1MB' },
    uploadedBy: mockUser,
    uploadedById: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIngestion: Ingestion = {
    id: 1,
    document: mockDocument,
    documentId: mockDocument.id,
    status: IngestionStatus.PENDING,
    result: null,
    error: null,
    triggeredBy: mockUser,
    triggeredById: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockIngestion]),
    getOne: jest.fn().mockResolvedValue(mockIngestion),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(Ingestion),
          useValue: mockIngestionRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ingestionRepository = module.get<Repository<Ingestion>>(getRepositoryToken(Ingestion));
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
    configService = module.get<ConfigService>(ConfigService);

    mockIngestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ingestion successfully', async () => {
      const createIngestionDto: CreateIngestionDto = {
        documentId: 1,
        parameters: { ocr: true },
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockIngestionRepository.create.mockReturnValue(mockIngestion);
      mockIngestionRepository.save.mockResolvedValue(mockIngestion);
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      const result = await service.create(createIngestionDto, mockUser);
      expect(result).toEqual(mockIngestion);
      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: createIngestionDto.documentId },
      });
      expect(mockIngestionRepository.create).toHaveBeenCalledWith({
        document: mockDocument,
        documentId: mockDocument.id,
        triggeredBy: mockUser,
        triggeredById: mockUser.id,
        status: IngestionStatus.PENDING,
      });
      expect(mockIngestionRepository.save).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/process', {
        ingestionId: mockIngestion.id,
        filePath: mockDocument.filePath,
        parameters: createIngestionDto.parameters,
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      const createIngestionDto: CreateIngestionDto = {
        documentId: 999,
        parameters: { ocr: true },
      };

      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createIngestionDto, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockIngestionRepository.create).not.toHaveBeenCalled();
      expect(mockIngestionRepository.save).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle processing failure', async () => {
      const createIngestionDto: CreateIngestionDto = {
        documentId: 1,
        parameters: { ocr: true },
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockIngestionRepository.create.mockReturnValue(mockIngestion);
      mockIngestionRepository.save.mockResolvedValue(mockIngestion);
      (axios.post as jest.Mock).mockRejectedValue(new Error('Processing failed'));

      await expect(service.create(createIngestionDto, mockUser)).rejects.toThrow('Processing failed');
      expect(mockIngestionRepository.update).toHaveBeenCalledWith(mockIngestion.id, {
        status: IngestionStatus.FAILED,
        error: 'Processing failed',
      });
    });
  });

  describe('findAll', () => {
    it('should return all ingestions for admin users', async () => {
      const result = await service.findAll(mockUser);
      expect(result).toEqual([mockIngestion]);
      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith('ingestion');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.document', 'document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.triggeredBy', 'user');
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should return only user ingestions for non-admin users', async () => {
      await service.findAll(mockNonAdminUser);
      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith('ingestion');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.document', 'document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.triggeredBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ingestion.triggeredById = :userId', { userId: mockNonAdminUser.id });
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an ingestion if found for admin users', async () => {
      const result = await service.findOne(1, mockUser);
      expect(result).toEqual(mockIngestion);
      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith('ingestion');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.document', 'document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.triggeredBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ingestion.id = :id', { id: 1 });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should return an ingestion if found for non-admin users who triggered it', async () => {
      await service.findOne(1, mockNonAdminUser);
      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith('ingestion');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.document', 'document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.triggeredBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ingestion.id = :id', { id: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ingestion.triggeredById = :userId', { userId: mockNonAdminUser.id });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if ingestion is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith('ingestion');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.document', 'document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('ingestion.triggeredBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ingestion.id = :id', { id: 999 });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the ingestion', async () => {
      const updateIngestionDto: UpdateIngestionDto = {
        status: IngestionStatus.COMPLETED,
        result: { processedPages: 10, extractedData: { text: 'Extracted content' } },
      };

      const updatedIngestion = { ...mockIngestion, ...updateIngestionDto };
      mockIngestionRepository.save.mockResolvedValue(updatedIngestion);

      const result = await service.update(1, updateIngestionDto, mockUser);
      expect(result).toEqual(updatedIngestion);
      expect(mockIngestionRepository.save).toHaveBeenCalledWith({
        ...mockIngestion,
        ...updateIngestionDto,
      });
    });

    it('should throw NotFoundException if ingestion to update is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const updateIngestionDto: UpdateIngestionDto = {
        status: IngestionStatus.COMPLETED,
      };

      await expect(service.update(999, updateIngestionDto, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockIngestionRepository.save).not.toHaveBeenCalled();
    });
  });
}); 