import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '#config/logger/logger.service';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  constructor(private readonly  logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    if(exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse() as string | object;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    this.logger.error(
      `${request.method} ${request.url} -> Status: ${status} - Message: ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul'}),
      path: request.url,
      message,
    });
  }
}