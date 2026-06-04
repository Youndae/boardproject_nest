import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE } from '#common/decorators/response-message.decorator';
import { SKIP_TRANSFORM_KEY } from '#common/decorators/file/skip-transform.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isSkip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if(isSkip)
      return next.handle();

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    if(statusCode === 204)
      return next.handle();

    return next.handle().pipe(
      map((data) => {
        const message = this.reflector.get(RESPONSE_MESSAGE, context.getHandler())
        || (statusCode >= 200 && statusCode < 300 ? 'success' : 'error');

        return new ApiResponse(statusCode, message, data);
      }),
    );
  }
}