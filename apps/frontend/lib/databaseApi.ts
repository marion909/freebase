import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface QueryResult {
  rows: any[];
  rowCount: number;
  durationMs: number;
  queryHash: string;
  success: boolean;
  errorMessage?: string;
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

export const databaseApi = {
  /**
   * Execute SQL query
   */
  executeQuery: async (
    projectId: string,
    query: string,
    options?: { limit?: number; timeout?: number },
  ): Promise<QueryResult> => {
    const response = await axios.post(
      `${API_BASE_URL}/projects/${projectId}/db/query`,
      { query, ...options },
    );
    return response.data;
  },

  /**
   * Get list of all tables
   */
  getTables: async (projectId: string): Promise<TableMetadata[]> => {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/db/tables`);
    return response.data;
  },

  /**
   * Get table metadata
   */
  getTableMetadata: async (projectId: string, tableName: string): Promise<TableMetadata> => {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/db/tables/${tableName}`,
    );
    return response.data;
  },
};
