import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentService } from './document.service';
import { Document, DocumentStatus } from './entities/document.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { User, UserRole } from '../user/entities/user.entity';

describe('DocumentService', () => {
  let service: DocumentService;
  let documentRepository: Repository<Document>;

  const mockDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
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

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockDocument]),
    getOne: jest.fn().mockResolvedValue(mockDocument),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));

    mockDocumentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document successfully', async () => {
      const createDocumentDto: CreateDocumentDto = {
        title: 'New Document',
        filename: 'new.pdf',
        filePath: '/uploads/new.pdf',
        content: 'New content',
        metadata: { pages: 5, size: '500KB' },
      };

      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      const result = await service.create(createDocumentDto, mockUser);
      expect(result).toEqual(mockDocument);
      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        ...createDocumentDto,
        uploadedBy: mockUser,
        uploadedById: mockUser.id,
        status: DocumentStatus.PENDING,
      });
      expect(mockDocumentRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all documents for admin users', async () => {
      const result = await service.findAll(mockUser);
      expect(result).toEqual([mockDocument]);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should return only user documents for non-admin users', async () => {
      await service.findAll(mockNonAdminUser);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.uploadedById = :userId', { userId: mockNonAdminUser.id });
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document if found for admin users', async () => {
      const result = await service.findOne(1, mockUser);
      expect(result).toEqual(mockDocument);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: 1 });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should return a document if found for non-admin users who uploaded it', async () => {
      mockQueryBuilder.where.mockReturnValueOnce({
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockDocument),
      });

      const result = await service.findOne(1, mockNonAdminUser);
      expect(result).toEqual(mockDocument);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: 1 });
    });

    it('should throw NotFoundException if document is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: 999 });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the document', async () => {
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
        metadata: { pages: 15, size: '2MB' },
      };

      const updatedDocument = { ...mockDocument, ...updateDocumentDto };
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);

      const result = await service.update(1, updateDocumentDto, mockUser);
      expect(result).toEqual(updatedDocument);
      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        ...updateDocumentDto,
      });
    });

    it('should throw NotFoundException if document to update is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
      };

      await expect(service.update(999, updateDocumentDto, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockDocumentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the document successfully', async () => {
      await service.remove(1, mockUser);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: 1 });
      expect(mockDocumentRepository.remove).toHaveBeenCalledWith(mockDocument);
    });

    it('should throw NotFoundException if document to remove is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.remove(999, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockDocumentRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the document status', async () => {
      await service.updateStatus(1, DocumentStatus.COMPLETED, mockUser);
      expect(mockDocumentRepository.createQueryBuilder).toHaveBeenCalledWith('document');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('document.uploadedBy', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: 1 });
      expect(mockDocumentRepository.update).toHaveBeenCalledWith(1, { status: DocumentStatus.COMPLETED });
    });

    it('should throw NotFoundException if document is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.updateStatus(999, DocumentStatus.COMPLETED, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockDocumentRepository.update).not.toHaveBeenCalled();
    });
  });
}); 