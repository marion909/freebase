'use client';

import { useState } from 'react';
import SqlEditor from '@/components/database/SqlEditor';
import TablesBrowser from '@/components/database/TablesBrowser';
import DataEditor from '@/components/database/DataEditor';
import ImportTool from '@/components/database/ImportTool';

interface DatabaseDashboardProps {
  projectId: string;
}

export default function DatabaseDashboard({ projectId }: DatabaseDashboardProps) {
  const [activeTab, setActiveTab] = useState('sql-editor');

  return (
    <div className="h-full flex flex-col">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('sql-editor')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sql-editor'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SQL Editor
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tables'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Import
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sql-editor' && <SqlEditor projectId={projectId} />}

        {activeTab === 'tables' && (
          <div className="h-full overflow-auto p-4">
            <TablesBrowser projectId={projectId} />
          </div>
        )}

        {activeTab === 'data' && <DataEditor projectId={projectId} />}

        {activeTab === 'import' && <ImportTool projectId={projectId} />}
      </div>
    </div>
  );
}
