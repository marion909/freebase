import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool, PoolClient } from 'pg';
import { Project } from '../../projects/entities/project.entity';
import { QueryLog } from '../entities/query-log.entity';
import { QueryValidatorService } from './query-validator.service';
import { EncryptionService } from '../../projects/services/encryption.service';
import {
  QueryResult,
  TableMetadata,
  ColumnMetadata,
  IndexMetadata,
  ConstraintMetadata,
} from '../dto/database.dto';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly connectionPools = new Map<string, Pool>();
  private readonly MAX_RESULT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  private readonly MAX_ROWS = 10000;
  private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(QueryLog)
    private readonly queryLogRepository: Repository<QueryLog>,
    private readonly queryValidator: QueryValidatorService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get or create connection pool for a project's database
   */
  private async getPool(projectId: string): Promise<Pool> {
    // Check if pool exists
    const existingPool = this.connectionPools.get(projectId);
    if (existingPool) {
      return existingPool;
    }

    // Get project details
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    if (project.status !== 'active') {
      throw new BadRequestException(`Project ${project.name} is not active`);
    }

    // Decrypt database password
    const dbPassword = await this.encryptionService.decrypt(
      project.databasePasswordEncrypted || '',
    );

    // Create new pool
    const pool = new Pool({
      host: project.databaseHost ?? 'localhost',
      port: project.databasePort,
      database: project.databaseName ?? 'postgres',
      user: project.databaseUser ?? 'postgres',
      password: dbPassword,
      max: 5, // Maximum 5 connections per project
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // 10s connection timeout
    });

    // Handle pool errors
    pool.on('error', (err: Error) => {
      this.logger.error(`Pool error for project ${projectId}:`, err);
      this.connectionPools.delete(projectId);
    });

    this.connectionPools.set(projectId, pool);
    this.logger.log(`Created connection pool for project ${projectId}`);

    return pool;
  }

  /**
   * Execute SQL query with validation, timeout, and logging
   */
  async executeQuery(
    projectId: string,
    userId: string,
    query: string,
    options?: { limit?: number; timeout?: number },
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const queryHash = this.queryValidator.generateQueryHash(query);

    // Validate query
    const validation = this.queryValidator.validate(query);
    if (!validation.isValid) {
      await this.logQuery(projectId, userId, query, queryHash, {
        success: false,
        errorMessage: validation.reason,
        durationMs: Date.now() - startTime,
      });
      throw new BadRequestException(validation.reason);
    }

    const sanitizedQuery = validation.sanitizedQuery;
    const limit = options?.limit || this.MAX_ROWS;
    const timeout = options?.timeout || this.DEFAULT_TIMEOUT_MS;

    let client: PoolClient | undefined;
    try {
      const pool = await this.getPool(projectId);
      client = await pool.connect();

      // Set statement timeout
      await client.query(`SET statement_timeout = ${timeout}`);

      // Execute query
      const result = await client.query<any>(sanitizedQuery);
      const durationMs = Date.now() - startTime;

      // Check result size
      const resultSize = JSON.stringify(result.rows).length;
      if (resultSize > this.MAX_RESULT_SIZE_BYTES) {
        throw new BadRequestException(
          `Query result too large (${(resultSize / 1024 / 1024).toFixed(2)}MB). Maximum allowed: 10MB`,
        );
      }

      // Limit rows
      const rows = result.rows.slice(0, limit);
      const rowCount = result.rowCount || 0;

      // Log successful query
      await this.logQuery(projectId, userId, query, queryHash, {
        success: true,
        durationMs,
        rowsAffected: rowCount,
      });

      this.logger.log(
        `Query executed for project ${projectId}: ${rowCount} rows in ${durationMs}ms`,
      );

      return {
        rows,
        rowCount,
        durationMs,
        queryHash,
        success: true,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed query
      await this.logQuery(projectId, userId, query, queryHash, {
        success: false,
        errorMessage,
        durationMs,
      });

      this.logger.error(
        `Query failed for project ${projectId}: ${errorMessage}`,
      );

      throw new InternalServerErrorException(`Query execution failed: ${errorMessage}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get list of all tables in the project database
   */
  async getTables(projectId: string): Promise<TableMetadata[]> {
    const query = `
      SELECT 
        t.table_name,
        t.table_schema,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = t.table_schema AND table_name = t.table_name) as row_count,
        pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as size_bytes,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) as size_pretty
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const pool = await this.getPool(projectId);
    const result = await pool.query(query);

    const tables: TableMetadata[] = [];
    for (const row of result.rows) {
      const columns = await this.getTableColumns(projectId, row.table_name, row.table_schema);
      const indexes = await this.getTableIndexes(projectId, row.table_name, row.table_schema);
      const constraints = await this.getTableConstraints(projectId, row.table_name, row.table_schema);

      tables.push({
        tableName: row.table_name,
        schemaName: row.table_schema,
        rowCount: parseInt(row.row_count, 10) || 0,
        sizeBytes: parseInt(row.size_bytes, 10) || 0,
        sizePretty: row.size_pretty,
        columns,
        indexes,
        constraints,
      });
    }

    return tables;
  }

  /**
   * Get table structure and metadata
   */
  async getTableMetadata(
    projectId: string,
    tableName: string,
  ): Promise<TableMetadata> {
    const sanitizedTable = this.queryValidator.sanitizeIdentifier(tableName);
    
    const tables = await this.getTables(projectId);
    const table = tables.find((t) => t.tableName === sanitizedTable);

    if (!table) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }

    return table;
  }

  /**
   * Get columns for a table
   */
  private async getTableColumns(
    projectId: string,
    tableName: string,
    schemaName: string,
  ): Promise<ColumnMetadata[]> {
    const query = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable = 'YES' as is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        (SELECT COUNT(*) > 0 FROM information_schema.key_column_usage k 
         WHERE k.table_schema = c.table_schema 
           AND k.table_name = c.table_name 
           AND k.column_name = c.column_name
           AND k.constraint_name LIKE '%_pkey') as is_primary_key,
        (SELECT COUNT(*) > 0 FROM information_schema.key_column_usage k 
         WHERE k.table_schema = c.table_schema 
           AND k.table_name = c.table_name 
           AND k.column_name = c.column_name
           AND k.constraint_name LIKE '%_fkey') as is_foreign_key
      FROM information_schema.columns c
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

    const pool = await this.getPool(projectId);
    const result = await pool.query(query, [schemaName, tableName]);

    return result.rows.map((row: any) => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable,
      columnDefault: row.column_default,
      characterMaximumLength: row.character_maximum_length,
      numericPrecision: row.numeric_precision,
      isPrimaryKey: row.is_primary_key,
      isForeignKey: row.is_foreign_key,
    }));
  }

  /**
   * Get indexes for a table
   */
  private async getTableIndexes(
    projectId: string,
    tableName: string,
    schemaName: string,
  ): Promise<IndexMetadata[]> {
    const query = `
      SELECT
        i.indexname as index_name,
        i.indexdef,
        (i.indexdef LIKE '%UNIQUE%') as is_unique,
        (c.contype = 'p') as is_primary
      FROM pg_indexes i
      LEFT JOIN pg_constraint c ON c.conname = i.indexname
      WHERE i.schemaname = $1
        AND i.tablename = $2;
    `;

    const pool = await this.getPool(projectId);
    const result = await pool.query(query, [schemaName, tableName]);

    return result.rows.map((row: any) => ({
      indexName: row.index_name,
      columnNames: this.extractColumnsFromIndexDef(row.indexdef),
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    }));
  }

  /**
   * Get constraints for a table
   */
  private async getTableConstraints(
    projectId: string,
    tableName: string,
    schemaName: string,
  ): Promise<ConstraintMetadata[]> {
    const query = `
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        array_agg(kcu.column_name) as column_names,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name) as referenced_columns
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
      GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name;
    `;

    const pool = await this.getPool(projectId);
    const result = await pool.query(query, [schemaName, tableName]);

    return result.rows.map((row: any) => ({
      constraintName: row.constraint_name,
      constraintType: row.constraint_type,
      columnNames: row.column_names,
      referencedTable: row.referenced_table,
      referencedColumns: row.referenced_columns,
    }));
  }

  /**
   * Extract column names from index definition
   */
  private extractColumnsFromIndexDef(indexDef: string): string[] {
    const match = indexDef.match(/\(([^)]+)\)/);
    if (!match) return [];
    return match[1].split(',').map((col) => col.trim());
  }

  /**
   * Log query execution to database
   */
  private async logQuery(
    projectId: string,
    userId: string,
    queryText: string,
    queryHash: string,
    options: {
      success: boolean;
      durationMs: number;
      rowsAffected?: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    try {
      await this.queryLogRepository.save({
        projectId,
        executedByUserId: userId,
        queryText,
        queryHash,
        success: options.success,
        durationMs: options.durationMs,
        rowsAffected: options.rowsAffected || 0,
        errorMessage: options.errorMessage,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to log query: ${errorMsg}`);
    }
  }

  /**
   * Close connection pool for a project
   */
  async closePool(projectId: string): Promise<void> {
    const pool = this.connectionPools.get(projectId);
    if (pool) {
      await pool.end();
      this.connectionPools.delete(projectId);
      this.logger.log(`Closed connection pool for project ${projectId}`);
    }
  }

  /**
   * Close all connection pools
   */
  async closeAllPools(): Promise<void> {
    for (const [projectId, pool] of this.connectionPools.entries()) {
      await pool.end();
      this.logger.log(`Closed connection pool for project ${projectId}`);
    }
    this.connectionPools.clear();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.closeAllPools();
  }
}
