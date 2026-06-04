import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { LoggerService } from '#config/logger/logger.service';

@Injectable()
export class AnonymousGuard implements CanActivate {
  private readonly logger: LoggerService;

  constructor(private readonly originalLogger: LoggerService) {
    this.logger = this.originalLogger.setContext(AnonymousGuard.name);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    if(req.user?.userId) {
      this.logger.error('login User Request. ', { userId: req.user.userId });
      throw new ForbiddenException();
    }

    return true;
  }
}