import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { ConfigService } from '@nestjs/config';

export class TestTokenUtil {
  constructor(
    private readonly tokenProvider: JWTTokenProvider,
    private readonly configService: ConfigService,
  ) {}

  async createToken(userId: string): Promise<{
    ino: string;
    accessToken: string;
    refreshToken: string;
  }> {
    const ino: string = this.tokenProvider.issuedIno();
    const accessToken: string = await this.tokenProvider.issuedAccessToken(userId, ino);
    const refreshToken: string = await this.tokenProvider.issuedRefreshToken(userId, ino);

    return { ino, accessToken, refreshToken };
  }

  createTokenCookies(
    accessToken: string,
    refreshToken: string,
    ino: string,
  ): string[] {
    let undefinedHeader: string[] = [];
    const accessHeader: string = this.configService.get<string>('JWT_ACCESS_HEADER') ??
                                    (undefinedHeader.push('ACCESS_HEADER') as any);
    const refreshHeader: string = this.configService.get<string>('JWT_REFRESH_HEADER') ??
                                    (undefinedHeader.push('REFRESH_HEADER') as any);
    const inoHeader: string = this.configService.get<string>('JWT_INO_HEADER') ??
                                    (undefinedHeader.push('INO_HEADER') as any);

    if (undefinedHeader.length > 0)
      throw new Error('testTokenUtils.createTokenCookies :: token header is undefined');

    return [
      `${accessHeader}=${accessToken}`,
      `${refreshHeader}=${refreshToken}`,
      `${inoHeader}=${ino}`,
    ];
  }

  async createTokenAndCookies(userId: string): Promise<string[]> {
    const { ino, accessToken, refreshToken } = await this.createToken(userId);

    return this.createTokenCookies(accessToken, refreshToken, ino);
  }
}