import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { createReadStream } from 'fs';
import { LoggerService } from '#config/logger/logger.service';

@Injectable()
export class ImageRenderInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;
  constructor(private readonly originalLogger: LoggerService) {
    this.logger = this.originalLogger.setContext(ImageRenderInterceptor.name);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((payload: { path: string; contentType: string}) => {
        if(!payload || !payload.path) {
          throw new NotFoundException();
        }

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Type', payload.contentType);

        const file = createReadStream(payload.path);
        
        file.on('error', (err) => {
          this.logger.error('ImageRenderInterceptor :: Image streaming error', { err });
        })
        
        return new StreamableFile(file);
      })
    )
  }
}