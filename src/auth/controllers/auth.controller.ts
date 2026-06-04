import { Controller, Get, HttpCode, Post, Req, Res, UseGuards, Param } from "@nestjs/common";
import { LoggerService } from "#config/logger/logger.service";
import { JWTTokenProvider } from "#auth/services/jwt-token.provider";
import { AnonymousGuard } from "#common/guards/anonymous.guard";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { OAuthGuard } from '#common/guards/oauth.guard';
import { RolesGuard } from '#common/guards/roles.guard';
import { Roles } from '#common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { MemberStatusResponse } from '#member/dtos/out/member-status.response.dto';
import { OAuthService } from '#auth/services/oAuth.service';

@ApiTags('auth')
@Controller('member')
export class AuthController {
  private readonly logger: LoggerService;

	constructor(
		private readonly originalLogger: LoggerService,
		private readonly tokenProvider: JWTTokenProvider,
    private readonly configService: ConfigService,
    private readonly oAuthService: OAuthService,
	) {
    this.logger = this.originalLogger.setContext(AuthController.name);
  }

	@UseGuards(AnonymousGuard, AuthGuard('local'))
	@Post('/login')
	@HttpCode(200)
	async postLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<MemberStatusResponse> {
		try {
			const member = req.user as { userId: string, role: string };

			await this.tokenProvider.issuedAllToken(member.userId, res);

			const result =  new MemberStatusResponse(member.userId, member.role);

      return result;
		}catch(error) {
			this.logger.error('postLogin :: Failed to Login ', { error });
			throw error;
		}
	}

  @UseGuards(AnonymousGuard, OAuthGuard)
  @Get('/oauth/:provider/callback')
  async callbackOAuth(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const member = req.user as { userId: string};
    await this.tokenProvider.issuedAllToken(member.userId, res);

    const hasNickname: boolean = await this.oAuthService.checkOAuthNickname(member.userId);

    const redirectUrl = req.cookies?.['redirect_to'] ?? '/';

    res.clearCookie('redirect_to', { path: '/' });

    // 닉네임이 존재한다면
    if(hasNickname) {
      res.redirect(`http://localhost:3000${redirectUrl}`);
    }

    res.redirect(`http://localhost:3000/join/profile?redirect=${redirectUrl}`)
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