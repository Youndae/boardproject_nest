import { Injectable } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    // log directory
    const logDir = path.join(process.cwd(), 'logs');
    if(!fs.existsSync(logDir))
      fs.mkdirSync(logDir, { recursive: true });

    // timestamp format
    const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });
    const printfFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `${timestamp} [${level}] ${message} - ${stack}`
        : `${timestamp} [${level}] ${message}`;
    });
    const timestampAndJsonFormat = winston.format.combine(timestampFormat, winston.format.json());

    // DailyRotateFile common option
    const fileOptions = {
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    };
    const handlerMaxFiles = '30d';

    //transports
    const infoTransport = new DailyRotateFile({
      dirname: logDir,
      filename: 'info-$DATE%.log',
      level: 'info',
      format: timestampAndJsonFormat,
      createSymlink: true,
      symlinkName: 'current-info.log',
      options: { flags: 'a', encoding: 'utf-8' },
      ...fileOptions
    });

    const errorTransport = new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      level: 'error',
      format: timestampAndJsonFormat,
      createSymlink: true,
      symlinkName: 'current-error.log',
      options: { flags: 'a', encoding: 'utf-8' },
      ...fileOptions,
    });

    const consoleTransport = new winston.transports.Console({
      level: nodeEnv === 'production' ? 'info' : 'debug',
      format: nodeEnv === 'production'
        ? timestampAndJsonFormat
        : winston.format.combine(winston.format.colorize(), timestampFormat, printfFormat),
    });

    // create logger
    this.logger = winston.createLogger({
      transports: [consoleTransport, infoTransport, errorTransport],
    });

    // uncaughtException / unhandleRejection
    this.logger.exceptions.handle(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'exceptions-%DATE%.log',
        ...fileOptions,
        maxFiles: handlerMaxFiles,
        format: timestampAndJsonFormat,
      }),
    );

    this.logger.rejections.handle(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'rejections-%DATE%.log',
        ...fileOptions,
        maxFiles: handlerMaxFiles,
        format: timestampAndJsonFormat
      }),
    );
  }

  info(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, meta?: any, context?: string) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any, context?: string) {
    this.logger.warn(message, meta, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // winston.Logger 객체 직접 접근 가능
  getLogger(): winston.Logger {
    return this.logger;
  }

}