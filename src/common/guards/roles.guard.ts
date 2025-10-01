import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '#common/decorators/roles.decorator';
import { LoggerService } from '#config/logger/logger.service';
import { RequestUserType } from '#common/types/requestUser.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: LoggerService
  ) { }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        ctx.getHandler(),
        ctx.getClass(),
      ]
    );

    // @Roles가 없다면 권한체크가 필요 없음.
    if(!requiredRoles || requiredRoles.length == 0)
      return true;

    const req = ctx.switchToHttp().getRequest();
    const user: RequestUserType | undefined = req.user;

    if(!user || !user.userId || !user.roles) {
      this.logger.error('AuthGuard :: Anonymous User Request.');
      throw new ForbiddenException();
    }

    const hasRole = requiredRoles.some(role => user.roles.includes(role));

    if(!hasRole) {
      this.logger.error('AuthGuard :: FORBIDDEN Role. ', { user });
      throw new ForbiddenException();
    }

    return true;
  }
}