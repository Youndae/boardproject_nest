import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BadRequestException } from '#common/exceptions/badRequest.exception';
import type { Request, Response } from 'express';


const allowedProviders = ['google', 'kakao', 'naver'];
type Provider = (typeof allowedProviders)[number];

function createDynamicAuthGuard(provider: Provider) {
  return new (AuthGuard(provider))();
}

@Injectable()
export class OAuthGuard extends AuthGuard('') implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    console.log('OAuthGuard!');

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const provider = req.params?.provider as Provider | undefined;

    console.log('OAuthGuard :: provider : ', provider);

    if (!provider || !allowedProviders.includes(provider)) {
      console.log('oauth guard wrong provider : ', provider);
      throw new BadRequestException();
    }

    const guard = createDynamicAuthGuard(provider);

    console.log('OAuthGuard :: guard create');

    const result = await guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any);

    return result as boolean;
  }
}