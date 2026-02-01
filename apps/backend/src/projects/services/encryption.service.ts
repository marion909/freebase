import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 16;
  private readonly tagLength = 16;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Encrypt a string using AES-256-GCM
   */
  async encrypt(text: string): Promise<string> {
    try {
      const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured');
      }

      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derive key from encryption key using scrypt
      const key = (await scryptAsync(encryptionKey, salt, this.keyLength)) as Buffer;

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine: salt + iv + authTag + encrypted
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Decrypt a string using AES-256-GCM
   */
  async decrypt(encryptedText: string): Promise<string> {
    try {
      const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured');
      }

      // Decode from base64
      const combined = Buffer.from(encryptedText, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const authTag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Derive key from encryption key using scrypt
      const key = (await scryptAsync(encryptionKey, salt, this.keyLength)) as Buffer;

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }
}
