import { Module, Global, OnModuleDestroy, Inject, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisClientType> => {
        const host = configService.get<string>('REDIS_HOST')??'';
        const port: number = parseInt(configService.get<string>('REDIS_PORT')??'0');

        const client: RedisClientType = createClient({
          socket: {
            host: host,
            port: port,
            connectTimeout: 5000,
          }
        });

        client.on('error', (err) => {
          console.error('RedisClient Error', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        try {
          await client.connect();

          return client;
        }catch (error) {
          console.error('Failed to connect to Redis : ', error);
          throw error;
        }
      },
    },
  ],
  exports: [REDIS_CLIENT],
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