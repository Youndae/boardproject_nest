import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { PassportConfigModule } from './passport/passport.module';
import { MemberModule } from '#member/member.module';
import { AuthController } from './controllers/auth.controller';

@Module({
	imports: [
		ConfigModule,
		JwtModule.register({}),
		PassportConfigModule,
		MemberModule
	],
	controllers: [AuthController],
	providers: [JWTTokenProvider],
	exports: [JWTTokenProvider, JwtModule, PassportConfigModule],
})
export class AuthModule {}
