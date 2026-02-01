'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Database, Settings, Globe, HardDrive, AlertCircle } from 'lucide-react';
import DatabaseDashboard from '@/components/database/DatabaseDashboard';
import DomainsTab from '@/components/domains/DomainsTab';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  slug: string;
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
  status: string;
  createdAt: string;
}

interface StorageUsage {
  storageBytes: number;
  storageMb: number;
  storageGb: number;
  limitBytes: number;
  limitMb: number;
  limitGb: number;
  usagePercent: number;
  exceeded: boolean;
  warningLevel: 'normal' | 'warning' | 'critical';
}

interface ResourceUsage {
  storage: StorageUsage;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  lastCheckedAt: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [usage, setUsage] = useState<ResourceUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('database');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteCooldown, setDeleteCooldown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/v1/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const data = await response.json();
      setProject(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load project');
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const loadUsage = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/v1/projects/${projectId}/usage`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (err: any) {
      console.error('Failed to load usage:', err);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadUsage();
  }, [loadProject, loadUsage]);

  const getStorageColor = (warningLevel: string) => {
    if (warningLevel === 'critical') return 'bg-red-500';
    if (warningLevel === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStorageTextColor = (warningLevel: string) => {
    if (warningLevel === 'critical') return 'text-red-700';
    if (warningLevel === 'warning') return 'text-yellow-700';
    return 'text-green-700';
  };

  const openDeleteModal = () => {
    setDeleteConfirm('');
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async () => {
    if (!project || deleteCooldown || isDeleting) return;
    if (deleteConfirm !== project.name) {
      toast.error('Project name does not match');
      return;
    }

    setIsDeleting(true);
    setDeleteCooldown(true);

    setTimeout(() => {
      setDeleteCooldown(false);
    }, 3000);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/v1/projects/${projectId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      toast.success('Project deleted');
      router.push('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-500">{project.slug}</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  project.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {project.status}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4">
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'database'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4" />
            Database
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'domains'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            Domains
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'database' && <DatabaseDashboard projectId={projectId} />}

        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            {/* Storage Usage Section */}
            {usage && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage Usage
                </h2>

                {/* Warning Banner */}
                {usage.storage.exceeded && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Storage Limit Exceeded</p>
                      <p className="text-sm text-red-700 mt-1">
                        Your project has exceeded the 1GB storage limit. Please delete data to continue using your database.
                      </p>
                    </div>
                  </div>
                )}

                {usage.storage.warningLevel === 'warning' && !usage.storage.exceeded && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Storage Warning</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your project is using over 80% of the storage limit. Consider cleaning up data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Storage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Used</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {usage.storage.storageMb.toFixed(2)} MB
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Limit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {usage.storage.limitMb} MB
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Available</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(usage.storage.limitMb - usage.storage.storageMb).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Storage Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Storage Usage</span>
                    <span className={`font-semibold ${getStorageTextColor(usage.storage.warningLevel)}`}>
                      {usage.storage.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${getStorageColor(usage.storage.warningLevel)}`}
                      style={{
                        width: `${Math.min(usage.storage.usagePercent, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Last checked: {new Date(usage.lastCheckedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Database Connection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Database Connection
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Host</label>
                  <input
                    type="text"
                    value={project.databaseHost}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="text"
                    value={project.databasePort}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Database Name</label>
                  <input
                    type="text"
                    value={project.databaseName}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User</label>
                  <input
                    type="text"
                    value={project.databaseUser}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="text"
                    value={project.databasePassword}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Delete Project */}
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-2">Delete Project</h2>
              <p className="text-sm text-gray-600 mb-4">
                This action permanently deletes the project, its database, container, and network.
              </p>
              <button
                onClick={openDeleteModal}
                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <DomainsTab projectId={projectId} projectSlug={project.slug} />
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Type the project name to confirm deletion. This cannot be undone.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={project.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={
                  isDeleting ||
                  deleteCooldown ||
                  deleteConfirm !== project.name
                }
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  isDeleting || deleteCooldown || deleteConfirm !== project.name
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
