import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { LoggerService } from '#config/logger/logger.service';

@Injectable()
export class AnonymousGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {
  }
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    if(req.user?.userId) {
      this.logger.error('AnonymousGuard :: login User Request. ', { userId: req.user.userId });
      throw new ForbiddenException();
    }

    return true;
  }
}