export class CreateDomainDto {
  domain: string;
  isCustom?: boolean;
}

export class VerifyDomainDto {
  domain: string;
}

export interface DomainStatus {
  domain: string;
  isCustom: boolean;
  dnsVerified: boolean;
  dnsToken?: string;
  sslCertExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DnsInstructions {
  recordType: 'TXT';
  name: string;
  value: string;
  example: string;
}
