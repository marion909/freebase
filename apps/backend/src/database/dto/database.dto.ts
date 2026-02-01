import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteQueryDto {
  @ApiProperty({
    description: 'SQL query to execute',
    example: 'SELECT * FROM users LIMIT 10',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Maximum number of rows to return',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiProperty({
    description: 'Query timeout in milliseconds',
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeout?: number;
}

export class ImportDataDto {
  @ApiProperty({
    description: 'Table name to import data into',
    example: 'users',
  })
  @IsNotEmpty()
  @IsString()
  tableName: string;

  @ApiProperty({
    description: 'CSV data or SQL script',
    example: 'name,email\nJohn,john@example.com',
  })
  @IsNotEmpty()
  @IsString()
  data: string;

  @ApiProperty({
    description: 'Data format: csv or sql',
    example: 'csv',
  })
  @IsNotEmpty()
  @IsString()
  format: 'csv' | 'sql';
}

export interface TableMetadata {
  tableName: string;
  schemaName: string;
  rowCount: number;
  sizeBytes: number;
  sizePretty: string;
  columns: ColumnMetadata[];
  indexes: IndexMetadata[];
  constraints: ConstraintMetadata[];
}

export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface IndexMetadata {
  indexName: string;
  columnNames: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface ConstraintMetadata {
  constraintName: string;
  constraintType: string;
  columnNames: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  durationMs: number;
  queryHash: string;
  success: boolean;
  errorMessage?: string;
}
