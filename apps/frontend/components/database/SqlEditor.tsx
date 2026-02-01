'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Copy, Trash2, Clock, Database } from 'lucide-react';
import { databaseApi, QueryResult } from '@/lib/databaseApi';
import toast from 'react-hot-toast';

interface SqlEditorProps {
  projectId: string;
}

export default function SqlEditor({ projectId }: SqlEditorProps) {
  const [query, setQuery] = useState('-- Enter your SQL query here\nSELECT * FROM users LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const result = await databaseApi.executeQuery(projectId, query);
      setResult(result);
      toast.success(`Query executed in ${result.durationMs}ms`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to execute query';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    toast.success('Query copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Section */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">SQL Editor</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyQuery}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Copy query"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Clear editor"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleExecuteQuery}
                disabled={isExecuting}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="h-[300px]">
            <Editor
              height="300px"
              defaultLanguage="sql"
              theme="vs-light"
              value={query}
              onChange={(value) => setQuery(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 text-red-500">⚠️</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-1">Query Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Database className="w-4 h-4" />
                <span className="font-medium">{result.rowCount}</span> rows
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{result.durationMs}ms</span>
              </div>
              <div className="ml-auto text-xs text-gray-500">
                Hash: {result.queryHash.substring(0, 8)}...
              </div>
            </div>

            {/* Results Table */}
            {result.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(result.rows[0]).map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {Object.values(row).map((value: any, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                          >
                            {value === null ? (
                              <span className="text-gray-400 italic">NULL</span>
                            ) : typeof value === 'object' ? (
                              <span className="text-blue-600">{JSON.stringify(value)}</span>
                            ) : typeof value === 'boolean' ? (
                              <span className={value ? 'text-green-600' : 'text-red-600'}>
                                {value.toString()}
                              </span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Query executed successfully, no rows returned</p>
              </div>
            )}
          </div>
        )}

        {!result && !error && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Execute a query to see results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
