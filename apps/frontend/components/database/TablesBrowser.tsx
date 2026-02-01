'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, ChevronDown, ChevronRight, Database, Key, Link as LinkIcon } from 'lucide-react';
import { databaseApi, TableMetadata } from '@/lib/databaseApi';
import toast from 'react-hot-toast';

interface TablesBrowserProps {
  projectId: string;
}

export default function TablesBrowser({ projectId }: TablesBrowserProps) {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await databaseApi.getTables(projectId);
      setTables(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load tables';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const getDataTypeColor = (dataType: string): string => {
    const type = dataType.toLowerCase();
    if (type.includes('int') || type.includes('serial')) return 'text-blue-600';
    if (type.includes('varchar') || type.includes('text') || type.includes('char'))
      return 'text-green-600';
    if (type.includes('bool')) return 'text-purple-600';
    if (type.includes('timestamp') || type.includes('date') || type.includes('time'))
      return 'text-orange-600';
    if (type.includes('uuid')) return 'text-pink-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading tables...</p>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">No tables found in this database</p>
          <p className="text-xs mt-2">Create your first table using the SQL Editor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Database Tables ({tables.length})
        </h3>
        <button
          onClick={loadTables}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {tables.map((table) => {
          const isExpanded = expandedTables.has(table.tableName);
          return (
            <div
              key={table.tableName}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Table Header */}
              <div
                onClick={() => toggleTable(table.tableName)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <Table className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{table.tableName}</h4>
                    <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                      {table.schemaName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{table.rowCount.toLocaleString()} rows</span>
                    <span>{table.sizePretty}</span>
                    <span>{table.columns.length} columns</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {/* Columns */}
                  <div className="p-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Columns</h5>
                    <div className="space-y-2">
                      {table.columns.map((column) => (
                        <div
                          key={column.columnName}
                          className="flex items-center gap-3 px-3 py-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {column.isPrimaryKey && (
                              <Key className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Primary Key" />
                            )}
                            {column.isForeignKey && (
                              <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" title="Foreign Key" />
                            )}
                            <span className="font-mono text-sm text-gray-900 font-medium">
                              {column.columnName}
                            </span>
                          </div>
                          <span className={`font-mono text-xs font-medium ${getDataTypeColor(column.dataType)}`}>
                            {column.dataType}
                            {column.characterMaximumLength && `(${column.characterMaximumLength})`}
                          </span>
                          {!column.isNullable && (
                            <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 rounded">
                              NOT NULL
                            </span>
                          )}
                          {column.columnDefault && (
                            <span className="px-2 py-0.5 text-xs text-gray-600 bg-gray-100 rounded font-mono">
                              default: {column.columnDefault}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Indexes */}
                  {table.indexes.length > 0 && (
                    <div className="px-4 pb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Indexes</h5>
                      <div className="space-y-2">
                        {table.indexes.map((index) => (
                          <div
                            key={index.indexName}
                            className="flex items-center gap-3 px-3 py-2 bg-white rounded border border-gray-200"
                          >
                            <span className="font-mono text-sm text-gray-900 flex-1">
                              {index.indexName}
                            </span>
                            <span className="text-xs text-gray-600 font-mono">
                              ({index.columnNames.join(', ')})
                            </span>
                            {index.isUnique && (
                              <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded">
                                UNIQUE
                              </span>
                            )}
                            {index.isPrimary && (
                              <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded">
                                PRIMARY
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {table.constraints.length > 0 && (
                    <div className="px-4 pb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Constraints</h5>
                      <div className="space-y-2">
                        {table.constraints.map((constraint) => (
                          <div
                            key={constraint.constraintName}
                            className="flex items-center gap-3 px-3 py-2 bg-white rounded border border-gray-200"
                          >
                            <span className="font-mono text-sm text-gray-900 flex-1 truncate">
                              {constraint.constraintName}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-50 rounded">
                              {constraint.constraintType}
                            </span>
                            {constraint.referencedTable && (
                              <span className="text-xs text-gray-600">
                                → {constraint.referencedTable}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
