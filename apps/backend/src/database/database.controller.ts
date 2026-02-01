import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DatabaseService } from './services/database.service';
import { ExecuteQueryDto, QueryResult, TableMetadata } from './dto/database.dto';

@ApiTags('Database')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/db')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute SQL query' })
  @ApiResponse({
    status: 200,
    description: 'Query executed successfully',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async executeQuery(
    @Param('projectId') projectId: string,
    @Body() dto: ExecuteQueryDto,
    @Request() req: any,
  ): Promise<QueryResult> {
    return this.databaseService.executeQuery(
      projectId,
      req.user.userId,
      dto.query,
      {
        limit: dto.limit,
        timeout: dto.timeout,
      },
    );
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get list of all tables' })
  @ApiResponse({
    status: 200,
    description: 'Tables retrieved successfully',
    type: Array,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getTables(
    @Param('projectId') projectId: string,
  ): Promise<TableMetadata[]> {
    return this.databaseService.getTables(projectId);
  }

  @Get('tables/:tableName')
  @ApiOperation({ summary: 'Get table metadata' })
  @ApiResponse({
    status: 200,
    description: 'Table metadata retrieved successfully',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async getTableMetadata(
    @Param('projectId') projectId: string,
    @Param('tableName') tableName: string,
  ): Promise<TableMetadata> {
    return this.databaseService.getTableMetadata(projectId, tableName);
  }
}
