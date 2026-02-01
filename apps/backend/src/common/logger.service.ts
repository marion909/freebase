import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

interface LogPayload {
  message: string;
  context?: string;
  trace?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private readonly transporter?: nodemailer.Transporter;
  private readonly alertRecipients: string[];
  private lastAlertAt = 0;
  private readonly alertCooldownMs = 60000;

  constructor(private readonly configService: ConfigService) {
    const level = (this.configService.get<string>('LOG_LEVEL') || 'info').toLowerCase();
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const logDir = this.configService.get<string>('LOG_DIR') || '/var/log/freebase';

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level,
      }),
    ];

    if (isProduction) {
      transports.push(
        new DailyRotateFile({
          level,
          dirname: logDir,
          filename: 'freebase-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '7d',
          zippedArchive: true,
        }),
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const smtpPort = this.configService.get<number>('SMTP_PORT');

    const recipients = this.configService.get<string>('LOG_ALERT_RECIPIENTS');
    this.alertRecipients = recipients
      ? recipients.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

    if (smtpHost && smtpUser && smtpPass && smtpPort && this.alertRecipients.length > 0) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  log(message: any, context?: string) {
    this.write('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    const payload = this.write('error', message, context, trace);
    void this.sendErrorAlert(payload);
  }

  warn(message: any, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.write('verbose', message, context);
  }

  private write(level: string, message: any, context?: string, trace?: string): LogPayload {
    const normalized = this.normalizeMessage(message);
    const payload: LogPayload = {
      message: normalized.message,
      context,
      trace,
      userId: normalized.userId,
      metadata: normalized.metadata,
    };

    this.logger.log({
      level,
      message: payload.message,
      module: context,
      user_id: payload.userId,
      context: payload.metadata,
      trace: payload.trace,
    });

    return payload;
  }

  private normalizeMessage(message: any): { message: string; userId?: string; metadata?: Record<string, unknown> } {
    if (typeof message === 'string') {
      return { message };
    }

    if (message instanceof Error) {
      return {
        message: message.message,
        metadata: {
          stack: message.stack,
        },
      };
    }

    if (message && typeof message === 'object') {
      const { userId, user_id, ...rest } = message as Record<string, unknown>;
      return {
        message: rest.message ? String(rest.message) : 'Log event',
        userId: (userId || user_id) ? String(userId || user_id) : undefined,
        metadata: rest,
      };
    }

    return { message: String(message) };
  }

  private async sendErrorAlert(payload: LogPayload): Promise<void> {
    if (!this.transporter || this.alertRecipients.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - this.lastAlertAt < this.alertCooldownMs) {
      return;
    }
    this.lastAlertAt = now;

    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Freebase';
    const fromAddress = this.configService.get<string>('SMTP_USER') || 'noreply@localhost';

    const subject = 'Freebase ERROR Alert';
    const body = JSON.stringify(
      {
        message: payload.message,
        context: payload.context,
        trace: payload.trace,
        userId: payload.userId,
        metadata: payload.metadata,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: this.alertRecipients.join(','),
      subject,
      text: body,
    });
  }
}
