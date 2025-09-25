import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWTTokenProvider } from './providers/jwt-token.provider';

@Module({
	imports: [
		ConfigModule,
		JwtModule.register({})
	],
	providers: [JWTTokenProvider],
	exports: [JWTTokenProvider, JwtModule],
})
export class AuthModule {}
