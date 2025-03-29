/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';
import { CreateIngestionDto } from './dto/create-ingestion.dto';
import { UpdateIngestionDto } from './dto/update-ingestion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../user/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('ingestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingestions')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Create a new ingestion job' })
  @ApiResponse({
    status: 201,
    description: 'The ingestion job has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async create(
    @Body() createIngestionDto: CreateIngestionDto,
    @CurrentUser() user: User,
  ) {
    return this.ingestionService.create(createIngestionDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ingestion jobs' })
  @ApiResponse({ status: 200, description: 'Return all ingestion jobs.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(@CurrentUser() user: User) {
    return this.ingestionService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an ingestion job by id' })
  @ApiResponse({ status: 200, description: 'Return the ingestion job.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Ingestion job not found.' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ingestionService.findOne(+id, user);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update an ingestion job' })
  @ApiResponse({
    status: 200,
    description: 'The ingestion job has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Ingestion job not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateIngestionDto: UpdateIngestionDto,
    @CurrentUser() user: User,
  ) {
    return this.ingestionService.update(+id, updateIngestionDto, user);
  }
}
