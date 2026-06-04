import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import type { Request, Response } from 'express';
import { LoggerService } from '#config/logger/logger.service';


const allowedProviders = ['google', 'kakao', 'naver'];
type Provider = (typeof allowedProviders)[number];

function createDynamicAuthGuard(provider: Provider) {
  return new (AuthGuard(provider))();
}

@Injectable()
export class OAuthGuard extends AuthGuard('') implements CanActivate {
  private readonly logger: LoggerService;

  constructor(private readonly originalLogger: LoggerService) {
    super();
    this.logger = this.originalLogger.setContext(OAuthGuard.name);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const provider = req.params?.provider as Provider | undefined;

    if (!provider || !allowedProviders.includes(provider)) {
      this.logger.warn('oauth guard wrong provider : ', provider);
      throw new BadRequestException();
    }

    const guard = createDynamicAuthGuard(provider);

    const result = await guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any);

    return result as boolean;
  }
}