import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Domain {
  id: string;
  projectId: string;
  domain: string;
  isCustom: boolean;
  dnsVerified: boolean;
  dnsToken: string | null;
  sslCertExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainDto {
  domain: string;
  isCustom?: boolean;
}

export interface DnsInstructions {
  recordType: string;
  name: string;
  value: string;
  example: string;
}

export interface CreateDomainResponse {
  domain: Domain;
  dnsInstructions?: DnsInstructions;
}

export interface VerifyDomainResponse {
  verified: boolean;
  domain: Domain;
}

const domainsApi = {
  /**
   * Create a new domain for a project
   */
  createDomain: async (
    projectId: string,
    data: CreateDomainDto,
  ): Promise<CreateDomainResponse> => {
    const response = await api.post(`/projects/${projectId}/domains`, data);
    return response.data;
  },

  /**
   * Get all domains for a project
   */
  listDomains: async (projectId: string): Promise<Domain[]> => {
    const response = await api.get(`/projects/${projectId}/domains`);
    return response.data;
  },

  /**
   * Get a specific domain
   */
  getDomain: async (projectId: string, domain: string): Promise<Domain> => {
    const response = await api.get(`/projects/${projectId}/domains/${domain}`);
    return response.data;
  },

  /**
   * Verify DNS configuration for a custom domain
   */
  verifyDomain: async (
    projectId: string,
    domain: string,
  ): Promise<VerifyDomainResponse> => {
    const response = await api.post(
      `/projects/${projectId}/domains/${domain}/verify`,
    );
    return response.data;
  },

  /**
   * Delete a domain
   */
  deleteDomain: async (projectId: string, domain: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/domains/${domain}`);
  },
};

export default domainsApi;
