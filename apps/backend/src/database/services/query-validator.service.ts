import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedQuery?: string;
}

@Injectable()
export class QueryValidatorService {
  private readonly logger = new Logger(QueryValidatorService.name);

  // Whitelisted SQL commands
  private readonly ALLOWED_COMMANDS = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE TABLE',
    'ALTER TABLE',
    'DROP TABLE',
    'CREATE INDEX',
    'DROP INDEX',
    'CREATE VIEW',
    'DROP VIEW',
    'TRUNCATE',
  ];

  // Dangerous patterns that should be blocked
  private readonly DANGEROUS_PATTERNS = [
    /DROP\s+DATABASE/i,
    /CREATE\s+DATABASE/i,
    /ALTER\s+DATABASE/i,
    /DROP\s+SCHEMA/i,
    /CREATE\s+SCHEMA/i,
    /ALTER\s+SCHEMA/i,
    /GRANT\s+/i,
    /REVOKE\s+/i,
    /CREATE\s+USER/i,
    /DROP\s+USER/i,
    /ALTER\s+USER/i,
    /CREATE\s+ROLE/i,
    /DROP\s+ROLE/i,
    /ALTER\s+ROLE/i,
    /COPY\s+.*FROM\s+PROGRAM/i,
    /pg_read_file/i,
    /pg_write_file/i,
    /pg_ls_dir/i,
    /lo_import/i,
    /lo_export/i,
  ];

  /**
   * Validate SQL query for safety and compliance
   */
  validate(query: string): ValidationResult {
    const trimmedQuery = query.trim();

    // Check for empty query
    if (!trimmedQuery) {
      return {
        isValid: false,
        reason: 'Query cannot be empty',
      };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedQuery)) {
        this.logger.warn(`Blocked dangerous query: ${trimmedQuery.substring(0, 100)}`);
        return {
          isValid: false,
          reason: `Query contains forbidden operation: ${pattern.source}`,
        };
      }
    }

    // Extract first command
    const firstCommand = this.extractFirstCommand(trimmedQuery);
    const isAllowed = this.ALLOWED_COMMANDS.some((cmd) =>
      firstCommand.toUpperCase().startsWith(cmd),
    );

    if (!isAllowed) {
      return {
        isValid: false,
        reason: `Command '${firstCommand}' is not allowed. Allowed commands: ${this.ALLOWED_COMMANDS.join(', ')}`,
      };
    }

    // Check for multiple statements (basic SQL injection protection)
    const statementCount = this.countStatements(trimmedQuery);
    if (statementCount > 1) {
      return {
        isValid: false,
        reason: 'Multiple SQL statements are not allowed. Execute queries one at a time.',
      };
    }

    return {
      isValid: true,
      sanitizedQuery: trimmedQuery,
    };
  }

  /**
   * Generate SHA-256 hash of query for logging and deduplication
   */
  generateQueryHash(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Extract first SQL command from query
   */
  private extractFirstCommand(query: string): string {
    const match = query.match(/^\s*(\w+(?:\s+\w+)?)/i);
    return match ? match[1].trim() : '';
  }

  /**
   * Count number of SQL statements (basic check for semicolons)
   */
  private countStatements(query: string): number {
    // Remove string literals to avoid counting semicolons inside strings
    const withoutStrings = query.replace(/'[^']*'/g, '');
    const statements = withoutStrings.split(';').filter((s) => s.trim().length > 0);
    return statements.length;
  }

  /**
   * Sanitize table/column names to prevent SQL injection
   */
  sanitizeIdentifier(identifier: string): string {
    // Only allow alphanumeric characters, underscores, and hyphens
    const sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (sanitized !== identifier) {
      throw new BadRequestException(
        `Invalid identifier: "${identifier}". Only alphanumeric characters, underscores, and hyphens are allowed.`,
      );
    }

    return sanitized;
  }

  /**
   * Check if query is a read-only SELECT query
   */
  isReadOnlyQuery(query: string): boolean {
    const trimmedQuery = query.trim().toUpperCase();
    return trimmedQuery.startsWith('SELECT') || 
           trimmedQuery.startsWith('SHOW') || 
           trimmedQuery.startsWith('DESCRIBE') ||
           trimmedQuery.startsWith('EXPLAIN');
  }
}
