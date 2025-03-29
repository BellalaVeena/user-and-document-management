/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UserRole } from '../user/entities/user.entity';
import { DocumentStatus } from './entities/document.entity';
import { User } from '../user/entities/user.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: { type: 'string' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiResponse({ status: 201, description: 'Document successfully uploaded' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @GetUser() user: User,
  ) {
    const documentData = {
      ...createDocumentDto,
      filename: file.originalname,
      filePath: file.path,
    };
    return this.documentService.create(documentData, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Return all documents' })
  async findAll(@GetUser() user: User) {
    return this.documentService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id' })
  @ApiResponse({ status: 200, description: 'Return the document' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(@Param('id') id: string, @GetUser() user: User) {
    this.logger.log(`Fetching document with ID: ${id}`);
    return this.documentService.findOne(+id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({ status: 200, description: 'Document successfully updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @GetUser() user: User,
  ) {
    this.logger.log(`Updating document with ID: ${id}`);
    return this.documentService.update(+id, updateDocumentDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document successfully deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(@Param('id') id: string, @GetUser() user: User) {
    this.logger.log(`Removing document with ID: ${id}`);
    return this.documentService.remove(+id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update document status' })
  @ApiResponse({
    status: 200,
    description: 'Document status successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: DocumentStatus,
    @GetUser() user: User,
  ) {
    this.logger.log(`Updating status for document with ID: ${id}`);
    return this.documentService.updateStatus(+id, status, user);
  }
}
