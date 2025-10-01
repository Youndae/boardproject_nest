import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { PassportConfigModule } from './passport/passport.module';
import { AuthController } from './controllers/auth.controller';
import { RedisModule } from '#config/redis/redis.module';
import { LoggerModule } from '#config/logger/logger.module';
import { RedisServiceModule } from '#common/services/redisService.module';
import { OAuthGuardModule } from '#common/guards/oAuthGuard.module';

@Module({
	imports: [
		ConfigModule,
		JwtModule.register({}),
		PassportConfigModule,
		RedisModule,
		RedisServiceModule,
		LoggerModule,
		OAuthGuardModule,
	],
	controllers: [
    AuthController
  ],
	providers: [
    JWTTokenProvider
  ],
	exports: [
    JWTTokenProvider,
    JwtModule,
    PassportConfigModule
  ],
})
export class AuthModule {}
