import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '#config/logger/logger.service';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
    private readonly logger: LoggerService,
  ) {}

  async getTokenValue(redisKey: string): Promise<string | null> {
    try {
      return await this.redisClient.get(redisKey);
    }catch (error) {
      this.logger.error('Redis getTokenValue error', error);
      throw new InternalServerErrorException();
    }
  }

  async setTokenValue(redisKey: string, tokenValue: string, expiresIn: number): Promise<void> {
    try {
      await this.redisClient.set(redisKey, tokenValue, { EX: expiresIn });
    }catch (error) {
      this.logger.error('Redis setTokenValue error', error);
      throw new InternalServerErrorException();
    }
  }

  async deleteTokenValue(redisKey: string): Promise<void> {
    try {
      await this.redisClient.del(redisKey);
    }catch (error) {
      this.logger.error('Redis deleteTokenValue error', error);
      throw new InternalServerErrorException();
    }
  }
}