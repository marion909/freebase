'use client';

import { useState } from 'react';
import { Upload, FileText, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { databaseApi } from '@/lib/databaseApi';
import toast from 'react-hot-toast';

interface ImportToolProps {
  projectId: string;
}

export default function ImportTool({ projectId }: ImportToolProps) {
  const [importType, setImportType] = useState<'csv' | 'sql'>('sql');
  const [sqlContent, setSqlContent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [tableName, setTableName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSqlImport = async () => {
    if (!sqlContent.trim()) {
      toast.error('Please enter SQL content');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Split SQL by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let successCount = 0;
      for (const statement of statements) {
        try {
          await databaseApi.executeQuery(projectId, statement);
          successCount++;
        } catch (err: any) {
          toast.error(`Failed to execute: ${statement.substring(0, 50)}...`);
          throw err;
        }
      }

      setResult({
        success: true,
        message: `Successfully executed ${successCount} SQL statement(s)`,
      });
      toast.success('SQL import completed');
      setSqlContent('');
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setCsvFile(file);

    // Preview first 5 rows
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // Header + 5 rows
      const preview = lines.map((line) =>
        line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
      );
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!tableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header and one data row');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const dataRows = lines.slice(1);

      // Create table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${headers.map((header) => `${header} TEXT`).join(', ')}
        )
      `;
      await databaseApi.executeQuery(projectId, createTableQuery);

      // Insert data
      let insertedCount = 0;
      for (const row of dataRows) {
        const values = row
          .split(',')
          .map((v) => {
            const value = v.trim().replace(/^"|"$/g, '');
            if (value === 'NULL' || value === '') return 'NULL';
            return `'${value.replace(/'/g, "''")}'`;
          })
          .join(', ');

        const insertQuery = `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values})`;
        
        try {
          await databaseApi.executeQuery(projectId, insertQuery);
          insertedCount++;
        } catch (err) {
          console.error('Failed to insert row:', row, err);
        }
      }

      setResult({
        success: true,
        message: `Successfully imported ${insertedCount} rows into table '${tableName}'`,
      });
      toast.success('CSV import completed');
      setCsvFile(null);
      setCsvPreview([]);
      setTableName('');
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Data</h2>
        <p className="text-sm text-gray-600">
          Import data from CSV files or execute SQL scripts
        </p>
      </div>

      {/* Import Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setImportType('sql')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg border-2 transition-all ${
            importType === 'sql'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="font-medium">SQL Script</span>
        </button>
        <button
          onClick={() => setImportType('csv')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg border-2 transition-all ${
            importType === 'csv'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">CSV File</span>
        </button>
      </div>

      {/* SQL Import */}
      {importType === 'sql' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SQL Script
            </label>
            <textarea
              value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
              placeholder="-- Enter your SQL script here
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');"
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSqlImport}
              disabled={importing || !sqlContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Executing...' : 'Execute SQL'}
            </button>
            <button
              onClick={() => {
                setSqlContent('');
                setResult(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* CSV Import */}
      {importType === 'csv' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="users"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Table will be created if it doesn&apos;t exist
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {csvFile ? csvFile.name : 'Choose CSV file or drag here'}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {csvPreview.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview (first 5 rows)
                </label>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvPreview[0].map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvPreview.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2 text-sm text-gray-900">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleCsvImport}
                disabled={importing || !csvFile || !tableName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <button
                onClick={() => {
                  setCsvFile(null);
                  setCsvPreview([]);
                  setTableName('');
                  setResult(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div
          className={`mt-6 p-4 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4
                className={`text-sm font-semibold mb-1 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.success ? 'Import Successful' : 'Import Failed'}
              </h4>
              <p
                className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
