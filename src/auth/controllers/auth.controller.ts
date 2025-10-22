import { Controller, Get, HttpCode, Post, Req, Res, UseGuards, Next, Param } from "@nestjs/common";
import { LoggerService } from "#config/logger/logger.service";
import { JWTTokenProvider } from "#auth/services/jwt-token.provider";
import { AnonymousGuard } from "#common/guards/anonymous.guard";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response, NextFunction } from "express";
import { OAuthGuard } from '#common/guards/oauth.guard';
import { RolesGuard } from '#common/guards/roles.guard';
import { Roles } from '#common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly logger: LoggerService,
		private readonly tokenProvider: JWTTokenProvider,
    private readonly configService: ConfigService,
	) {}

	@UseGuards(AnonymousGuard, AuthGuard('local'))
	@Post('/login')
	@HttpCode(200)
	async postLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Next() next: NextFunction
  ) {
		try {
			const member = req.user as { userId: string };
	
			await this.tokenProvider.issuedAllToken(member.userId, res);
	
			return { id: member.userId };
		}catch(error) {
			this.logger.error('Failed to Login ', error);
			return next(error);
		}
	}

  @UseGuards(AnonymousGuard, OAuthGuard)
  @Get('/oauth/:provider/')
  async oAuthLogin(@Param('provider') provider: string) {
    console.log('oauth login controller');
  }

  @UseGuards(AnonymousGuard, OAuthGuard)
  @Get('/oauth/:provider/callback')
  async callbackOAuth(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response
  ) {

    console.log('oauth callback');

    const member = req.user as{ userId: string};
    await this.tokenProvider.issuedAllToken(member.userId, res);

    res.redirect('http://localhost:3000/');
  }

  @Roles('ROLE_MEMBER')
	@UseGuards(RolesGuard)
  @Post('/logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const inoHeader: string | undefined = this.configService.get<string>('JWT_INO_HEADER');
    const inoValue: string = req.cookies?.[inoHeader!];
    const member = req.user as { userId: string };

    await this.tokenProvider.deleteTokenDataAndCookie(member.userId, inoValue, res);
  }
}