import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JWTTokenProvider } from '#auth/providers/jwt-token.provider';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '#config/logger/logger.service';
import { TokenInvalidException } from '#common/exceptions/token-invalid.exception';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { TokenStealingException } from '#common/exceptions/token-stealing.exception';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenProvider: JWTTokenProvider,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    let username: string | null = null;
    const request = ctx.switchToHttp().getRequest();
    try {
      const res = ctx.switchToHttp().getResponse();
      const { accessToken, refreshToken, ino } = this.getTokenCookies(request);

      if(ino) {
        if(accessToken && refreshToken) {
          if(!this.checkTokenPrefix(accessToken) || !this.checkTokenPrefix(refreshToken)) {
            this.logger.warn('Invalid Token Prefix: ', { accessToken, refreshToken });
            this.tokenProvider.deleteAllTokenCookie(res);
            throw new TokenInvalidException();
          }else {
            try {
              const accessTokenVerifyValue: string = await this.tokenProvider.verifyAccessToken(accessToken, ino, res);
              username = accessTokenVerifyValue;
            }catch (error) {
              if(error.status === ResponseStatusConstants.UNAUTHORIZED && error.message === ResponseStatusConstants.TOKEN_EXPIRED.MESSAGE) {
                try {
                  const decodedAccessToken: string = this.tokenProvider.decodeToken(accessToken).userId;
                  const refreshTokenVerifyValue: string | undefined = await this.tokenProvider.verifyRefreshToken(refreshToken, ino, res);

                  if(decodedAccessToken === refreshTokenVerifyValue) {
                    await this.tokenProvider.issuedToken(decodedAccessToken, ino, res);
                    username = decodedAccessToken;
                  }else {
                    await this.tokenProvider.deleteTokenDataAndCookie(refreshTokenVerifyValue, ino, res);
                    throw new TokenStealingException();
                  }
                }catch(error) {
                  throw error;
                }
              }else
                throw error;
            }
          }
        } else if(!accessToken && !refreshToken) {
          return true;
        } else {
          let verifyValue: string | null = null;
          if(accessToken)
            verifyValue = this.tokenProvider.decodeToken(accessToken).userId;
          else if(refreshToken)
            verifyValue = this.tokenProvider.decodeToken(refreshToken).userId;

          if(verifyValue){
            await this.tokenProvider.deleteTokenDataAndCookie(verifyValue, ino, res);
            throw new TokenStealingException();
          }
        }
      }
    }catch(error) {
      throw error;
    }

    request.user = { userId: username }
    return true;
  }

  private checkTokenPrefix(token: string): boolean {
    return token.startsWith(this.configService.get<string>('TOKEN_PREFIX')!);
  }


  private getTokenCookies(req) {
    const accessHeader: string | undefined = this.configService.get<string>('ACCESS_HEADER');
    const refreshHeader: string | undefined = this.configService.get<string>('REFRESH_HEADER');
    const inoHeader: string | undefined = this.configService.get<string>('INO_HEADER');

    const accessToken = req.cookies?.[accessHeader!];
    const refreshToken = req.cookies?.[refreshHeader!];
    const ino = req.cookies?.[inoHeader!];

    return {
      accessToken,
      refreshToken,
      ino
    }
  }
}