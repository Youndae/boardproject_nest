import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from '#common/services/redis.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisClientType> => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<string>('REDIS_PORT');
        const client: RedisClientType = createClient({
          url: `redis://${host}:${port}`,
        });

        client.on('error', (err) => {
          console.error('RedisClient Error', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        await client.connect();
        return client;
      },
    },
    RedisService
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType
  ) {}

  async onModuleDestroy() {
    if(this.redisClient?.isOpen)
      await this.redisClient.quit();
  }
}