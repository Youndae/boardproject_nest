import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  setContext(context: string) {
    this.context = context;
    return this;
  }

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    // log directory
    const logDir = path.join(process.cwd(), 'logs');
    if(!fs.existsSync(logDir))
      fs.mkdirSync(logDir, { recursive: true });

    // timestamp format
    const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });
    const printfFormat = winston.format.printf(({ timestamp, level, message, stack, context, ...meta }) => {
      const contextStr = context ? ` [${context}]` : '';
      const stackStr = stack ? ` - ${stack}` : '';
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';

      return `${timestamp} ${level}${contextStr} ${message}${metaStr}${stackStr}`;
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
      filename: 'info-%DATE%.log',
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
        : winston.format.combine(winston.format.colorize({ level: true }), timestampFormat, printfFormat),
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

  log(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    this.logger.info(message, { context, ...meta });
  }

  info(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    const stack = optionalParams.find(p => p instanceof Error)?.stack || undefined;
    this.logger.error(message, { context, stack, ...meta });
  }

  warn(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, ...optionalParams: any[]) {
    const { meta, context } = this.parseParams(optionalParams);
    this.logger.verbose(message, { context, ...meta });
  }

  private parseParams(params: any[]) {
    let context: string | undefined = this.context;
    let meta: Record<string, any> = {};

    params.forEach((param) => {
      if(typeof param === 'string')
        context = param;
      else if(typeof param === 'object' && param !== null) {
        if(!(param instanceof Error))
          meta = { ...meta, ...param };
      }
    });

    return { context, meta};
  }

  // winston.Logger 객체 직접 접근 가능
  getLogger(): winston.Logger {
    return this.logger;
  }

}