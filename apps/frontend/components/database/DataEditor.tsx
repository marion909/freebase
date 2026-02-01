'use client';

import { useState, useEffect } from 'react';
import { Table, Edit2, Trash2, RefreshCw, Download, Search } from 'lucide-react';
import { databaseApi, TableMetadata } from '@/lib/databaseApi';
import toast from 'react-hot-toast';

interface DataEditorProps {
  projectId: string;
}

export default function DataEditor({ projectId }: DataEditorProps) {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<any>({});

  useEffect(() => {
    loadTables();
  }, [projectId]);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      const data = await databaseApi.getTables(projectId);
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].tableName);
      }
    } catch (err: any) {
      toast.error('Failed to load tables');
    }
  };

  const loadTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const result = await databaseApi.executeQuery(
        projectId,
        `SELECT * FROM ${tableName} LIMIT 100`,
      );
      setTableData(result.rows);
      if (result.rows.length > 0) {
        setColumns(Object.keys(result.rows[0]));
      }
    } catch (err: any) {
      toast.error('Failed to load table data');
      setTableData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (index: number) => {
    setEditingRow(index);
    setEditedValues({ ...tableData[index] });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedValues({});
  };

  const handleSaveRow = async (index: number) => {
    const row = tableData[index];
    const primaryKey = columns[0]; // Assume first column is primary key
    
    const updates = Object.entries(editedValues)
      .filter(([key]) => key !== primaryKey)
      .map(([key, value]) => {
        if (value === null) return `${key} = NULL`;
        if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
        return `${key} = ${value}`;
      })
      .join(', ');

    const query = `UPDATE ${selectedTable} SET ${updates} WHERE ${primaryKey} = '${row[primaryKey]}'`;

    try {
      await databaseApi.executeQuery(projectId, query);
      toast.success('Row updated successfully');
      loadTableData(selectedTable);
      setEditingRow(null);
      setEditedValues({});
    } catch (err: any) {
      toast.error('Failed to update row');
    }
  };

  const handleDeleteRow = async (row: any) => {
    if (!confirm('Are you sure you want to delete this row?')) return;

    const primaryKey = columns[0];
    const query = `DELETE FROM ${selectedTable} WHERE ${primaryKey} = '${row[primaryKey]}'`;

    try {
      await databaseApi.executeQuery(projectId, query);
      toast.success('Row deleted successfully');
      loadTableData(selectedTable);
    } catch (err: any) {
      toast.error('Failed to delete row');
    }
  };

  const handleExportCSV = () => {
    if (tableData.length === 0) return;

    const headers = columns.join(',');
    const rows = tableData.map((row) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const filteredData = tableData.filter((row) =>
    columns.some((col) =>
      String(row[col]).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-gray-500" />
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {tables.map((table) => (
              <option key={table.tableName} value={table.tableName}>
                {table.tableName} ({table.rowCount} rows)
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={() => loadTableData(selectedTable)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        <button
          onClick={handleExportCSV}
          disabled={tableData.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading data...</p>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Table className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No data found</p>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3 text-sm whitespace-nowrap">
                      {editingRow === rowIndex ? (
                        <input
                          type="text"
                          value={editedValues[column] ?? row[column] ?? ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [column]: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      ) : row[column] === null ? (
                        <span className="text-gray-400 italic">NULL</span>
                      ) : typeof row[column] === 'boolean' ? (
                        <span className={row[column] ? 'text-green-600' : 'text-red-600'}>
                          {row[column].toString()}
                        </span>
                      ) : (
                        <span className="text-gray-900">{String(row[column])}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {editingRow === rowIndex ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSaveRow(rowIndex)}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditRow(rowIndex)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit row"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        Showing {filteredData.length} of {tableData.length} rows
      </div>
    </div>
  );
}
