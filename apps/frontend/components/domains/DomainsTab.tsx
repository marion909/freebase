'use client';

import { useCallback, useEffect, useState } from 'react';
import domainsApi, { Domain, DnsInstructions } from '@/lib/domainsApi';
import { CheckCircle, Clock, AlertCircle, Copy, Plus, Trash2, RefreshCw } from 'lucide-react';

interface DomainsTabProps {
  projectId: string;
  projectSlug: string;
}

export default function DomainsTab({ projectId, projectSlug }: DomainsTabProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const standardDomain = `${projectSlug}.Neuhauser.network`;

  const loadDomains = useCallback(async () => {
    try {
      setLoading(true);
      const data = await domainsApi.listDomains(projectId);
      setDomains(data);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    try {
      setError(null);
      const response = await domainsApi.createDomain(projectId, {
        domain: newDomain.trim(),
        isCustom: true,
      });

      setDomains([...domains, response.domain]);
      setDnsInstructions(response.dnsInstructions || null);
      setNewDomain('');
      
      if (!response.dnsInstructions) {
        setShowAddModal(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domain: string) => {
    try {
      setVerifying(domain);
      setError(null);
      const response = await domainsApi.verifyDomain(projectId, domain);

      if (response.verified) {
        // Update domain in list
        setDomains(
          domains.map((d) =>
            d.domain === domain ? { ...d, dnsVerified: true } : d,
          ),
        );
        alert('Domain verified successfully!');
      } else {
        setError('DNS verification failed. Please check your TXT record.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify domain');
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (domain: string) => {
    if (!confirm(`Are you sure you want to delete ${domain}?`)) {
      return;
    }

    try {
      await domainsApi.deleteDomain(projectId, domain);
      setDomains(domains.filter((d) => d.domain !== domain));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = (domain: Domain) => {
    if (!domain.isCustom) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <CheckCircle size={16} />
          Active
        </span>
      );
    }

    if (domain.dnsVerified) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <CheckCircle size={16} />
          Verified
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-yellow-600 text-sm">
        <Clock size={16} />
        Pending Verification
      </span>
    );
  };

  if (loading) {
    return <div className="p-6">Loading domains...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Standard Domain */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Standard Domain</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={standardDomain}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <button
            onClick={() => copyToClipboard(standardDomain)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Copy size={16} />
            Copy
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Your project is automatically accessible at this domain.
        </p>
      </div>

      {/* Custom Domains */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Custom Domains</h3>
          <button
            onClick={() => {
              setShowAddModal(true);
              setDnsInstructions(null);
              setError(null);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus size={16} />
            Add Domain
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Custom Domains List */}
        {domains.filter((d) => d.isCustom).length === 0 ? (
          <p className="text-gray-500">No custom domains yet.</p>
        ) : (
          <div className="space-y-3">
            {domains
              .filter((d) => d.isCustom)
              .map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{domain.domain}</span>
                      {getStatusBadge(domain)}
                    </div>
                    {domain.sslCertExpiry && (
                      <p className="text-sm text-gray-500 mt-1">
                        SSL expires: {new Date(domain.sslCertExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!domain.dnsVerified && (
                      <button
                        onClick={() => handleVerifyDomain(domain.domain)}
                        disabled={verifying === domain.domain}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={14}
                          className={verifying === domain.domain ? 'animate-spin' : ''}
                        />
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDomain(domain.domain)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {dnsInstructions ? 'DNS Setup Instructions' : 'Add Custom Domain'}
            </h3>

            {!dnsInstructions ? (
              <>
                <p className="text-gray-600 mb-4">
                  Enter your custom domain name (e.g., example.com or subdomain.example.com)
                </p>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleAddDomain}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Add Domain
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewDomain('');
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 mb-2">
                    <strong>Step 1:</strong> Add the following TXT record to your DNS settings:
                  </p>
                  <div className="bg-white p-3 rounded border border-blue-300 font-mono text-sm">
                    <div className="grid grid-cols-3 gap-4 mb-2">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <p className="font-semibold">{dnsInstructions.recordType}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-semibold break-all">{dnsInstructions.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Value:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold break-all">{dnsInstructions.value}</p>
                          <button
                            onClick={() => copyToClipboard(dnsInstructions.value)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Example:</span>
                      <p className="text-xs break-all">{dnsInstructions.example.replace(/"/g, '&quot;')}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-900">
                    <strong>Step 2:</strong> Wait for DNS propagation (usually 5-30 minutes), then
                    click the &quot;Verify&quot; button on the domain in your domains list.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setDnsInstructions(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
