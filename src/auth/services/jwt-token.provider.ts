import { JwtService, JsonWebTokenError, TokenExpiredError, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';
import { uuidv4 } from 'uuidv7';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '#config/logger/logger.service';
import { RedisService } from '#common/services/redis.service';
import { Injectable } from '@nestjs/common';
import { TokenStealingException } from '#common/exceptions/token-stealing.exception';
import { TokenExpiredException } from '#common/exceptions/token-expired.exception';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';
import { TokenInvalidException } from '#common/exceptions/token-invalid.exception';
import { BadRequestException } from '#common/exceptions/bad-request.exception';

@Injectable()
export class JWTTokenProvider {

  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  private readonly accessExpire: string;
  private readonly refreshExpire: string;
  private readonly inoExpire: string;

  private readonly accessHeader: string;
  private readonly refreshHeader: string;
  private readonly inoHeader: string;

  private readonly accessKeyPrefix: string;
  private readonly refreshKeyPrefix: string;

  private readonly tokenPrefix: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    const missingKey: string[] = [];

    this.accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') ?? missingKey.push('JWT_ACCESS_SECRET') as any;
    this.refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? missingKey.push('JWT_REFRESH_SECRET') as any;
    this.accessExpire = this.configService.get<string>('JWT_ACCESS_EXPIRE') ?? missingKey.push('JWT_ACCESS_EXPIRE') as any;
    this.refreshExpire = this.configService.get<string>('JWT_REFRESH_EXPIRE') ?? missingKey.push('JWT_REFRESH_EXPIRE') as any;
    this.inoExpire = this.configService.get<string>('JWT_INO_EXPIRE') ?? missingKey.push('JWT_INO_EXPIRE') as any;

    this.accessHeader = this.configService.get<string>('JWT_ACCESS_HEADER') ?? missingKey.push('JWT_ACCESS_HEADER') as any;
    this.refreshHeader = this.configService.get<string>('JWT_REFRESH_HEADER') ?? missingKey.push('JWT_REFRESH_HEADER') as any;
    this.inoHeader = this.configService.get<string>('JWT_INO_HEADER') ?? missingKey.push('JWT_INO_HEADER') as any;

    this.accessKeyPrefix = this.configService.get<string>('JWT_ACCESS_KEY_PREFIX') ?? missingKey.push('JWT_ACCESS_KEY_PREFIX') as any;
    this.refreshKeyPrefix = this.configService.get<string>('JWT_REFRESH_KEY_PREFIX') ?? missingKey.push('JWT_REFRESH_KEY_PREFIX') as any;

    this.tokenPrefix = this.configService.get<string>('JWT_TOKEN_PREFIX') ?? missingKey.push('JWT_TOKEN_PREFIX') as any;

    if(missingKey.length > 0){
      throw new Error(
        `Missing required environment variables: ${missingKey.join(', ')}. Application will not start.`,
      );
    }
  }

  decodeToken(token: string): { userId: string } {
    const replacedToken = this.replaceTokenValue(token);

    return this.jwtService.decode(replacedToken);
  }

  replaceTokenValue(token: string): string {
    return token.replace(this.tokenPrefix, '');
  }

  private createPayload(userId: string): {userId: string} {
    return {
      userId,
    }
  }

  async verifyAccessToken(token: string, inoValue: string, res: Response): Promise<string> {
    const replacedToken: string = this.replaceTokenValue(token);
    const verifyValue: string = this.verifyToken(replacedToken, this.accessSecret).userId;
    const redisKey: string = this.getRedisKey(this.accessKeyPrefix, verifyValue, inoValue);
    const redisValue: string | null = await this.redisService.getTokenValue(redisKey);

    if(redisValue === replacedToken)
      return verifyValue;
    else if(redisValue === null){
      this.logger.error('Redis Token Value is Null. ', { replacedToken });
      throw new TokenStealingException();
    } else {
      this.logger.error('Access Token Stealing. ', { redisValue, replacedToken });
      this.deleteAllTokenCookie(res);
      const refreshKey = this.getRedisKey(this.refreshKeyPrefix, verifyValue, inoValue);
      await this.redisService.deleteTokenValue(redisKey);
      await this.redisService.deleteTokenValue(refreshKey);
      throw new TokenStealingException();
    }
  }

  async verifyRefreshToken(token: string, inoValue: string, res: Response): Promise<string> {
    const replacedToken: string = this.replaceTokenValue(token);
    const verifyValue: string = this.verifyToken(replacedToken, this.refreshSecret).userId;
    const redisKey: string = this.getRedisKey(this.refreshKeyPrefix, verifyValue, inoValue);
    const redisValue = await this.redisService.getTokenValue(redisKey);

    if(redisValue === replacedToken)
      return verifyValue;
    else if(redisValue === null) {
      this.logger.error('Redis Token Value is Null. ', { replacedToken });
      throw new TokenStealingException();
    }else {
      this.logger.error('Refresh Token Stealing. ', { redisValue, replacedToken });
      this.deleteAllTokenCookie(res);
      const accessKey = this.getRedisKey(this.accessKeyPrefix, verifyValue, inoValue);
      await this.redisService.deleteTokenValue(accessKey);
      await this.redisService.deleteTokenValue(redisKey);
      throw new TokenStealingException();
    }
  }

  private verifyToken(tokenValue: string, secret: string): { userId: string } {
    try {
      const verifyValue: { userId: string } = this.jwtService.verify(tokenValue, { secret });

      return verifyValue;
    }catch (error) {
      if(error instanceof TokenExpiredError) {
        this.logger.info('Token Expired', error.message);
        throw new TokenExpiredException();
      }else if(error instanceof JsonWebTokenError) {
        this.logger.info('Invalid Token', error.message);
        throw new TokenInvalidException();
      }else  {
        this.logger.error('token verify error', error.message);
        throw new InternalServerErrorException();
      }
    }
  }

  private getRedisKey(keyPrefix: string, verifyValue: string, inoValue: string) {
    return `${keyPrefix}${inoValue}${verifyValue}`;
  }

  async deleteTokenData(userId: string, inoValue: string): Promise<void> {
    const accessKey: string = this.getRedisKey(this.accessKeyPrefix, userId, inoValue);
    const refreshKey: string = this.getRedisKey(this.refreshKeyPrefix, userId, inoValue);

    await this.redisService.deleteTokenValue(accessKey);
    await this.redisService.deleteTokenValue(refreshKey);
  }

  deleteAllTokenCookie(res: Response) {
    res.clearCookie(this.accessHeader);
    res.clearCookie(this.refreshHeader);
    res.clearCookie(this.inoHeader);
  }

  private setTokenCookie(token: string, expiresIn: number, name: string, res: Response): void {
    res.cookie(
      name,
      token,
      {
        httpOnly: true,
        secure: true,
        maxAge: expiresIn,
        sameSite: 'strict',
      }
    )
  }

  async issuedAccessToken(userId: string, inoValue: string): Promise<string> {
    const payload: {userId: string} = this.createPayload(userId);
    const token: string = this.createToken(payload, this.accessSecret, this.accessExpire);
    const redisKey: string = this.getRedisKey(this.accessKeyPrefix, userId, inoValue);
    await this.redisService.setTokenValue(redisKey, token, this.convertExpiresToMillisecond(this.accessExpire));

    return this.setTokenPrefix(token);
  }

  async issuedRefreshToken(userId: string, inoValue: string): Promise<string> {
    const payload: { userId: string } = this.createPayload(userId);
    const token: string = this.createToken(payload, this.refreshSecret, this.refreshExpire);
    const redisKey: string = this.getRedisKey(this.refreshKeyPrefix, userId, inoValue);
    await this.redisService.setTokenValue(redisKey, token, this.convertExpiresToMillisecond(this.refreshExpire));

    return this.setTokenPrefix(token);
  }

  private setTokenPrefix(token: string): string {
    return `${this.tokenPrefix}${token}`;
  }

  private createToken(payload: { userId: string }, secret: string, expiresIn: string): string {
    const options: JwtSignOptions = {
      secret,
      expiresIn,
      subject: 'boardProject_nest',
      algorithm: 'HS512',
    }

    return this.jwtService.sign(payload, options);
  }

  async issuedToken(userId: string, inoValue: string, res: Response): Promise<void> {
    const accessToken: string = await this.issuedAccessToken(userId, inoValue);
    const refreshToken: string = await this.issuedRefreshToken(userId, inoValue);
    this.setTokenCookie(accessToken, this.convertExpiresToMillisecond(this.accessExpire), this.accessHeader, res);
    this.setTokenCookie(refreshToken, this.convertExpiresToMillisecond(this.refreshExpire), this.refreshHeader, res);
  }

  async issuedAllToken(userId: string, res: Response): Promise<void> {
    const inoValue: string = this.issuedIno();
    await this.issuedToken(userId, inoValue, res);

    this.setTokenCookie(inoValue, this.convertExpiresToMillisecond(this.inoExpire), this.inoHeader, res);
  }

  issuedIno() {
    return uuidv4().replaceAll('-', '');
  }

  async deleteTokenDataAndCookie(userId: string, inoValue: string, res: Response): Promise<void> {
    await this.deleteTokenData(userId, inoValue);
    this.deleteAllTokenCookie(res);
  }

  private convertExpiresToMillisecond(expiresIn: string) {
    const unit: string = expiresIn.slice(-1);
    const value: number = parseInt(expiresIn.slice(0, -1));

    switch(unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new BadRequestException('Invalid convertExpiresToMillisecond');
    }
  }
}