import { Controller, Get, HttpCode, Post, Req, Res, UseGuards, Next, Param } from "@nestjs/common";
import { LoggerService } from "#config/logger/logger.service";
import { JWTTokenProvider } from "#auth/services/jwt-token.provider";
import { AnonymousGuard } from "#common/guards/anonymous.guard";
import { AuthGuard } from "@nestjs/passport";
import { ResponseStatusConstants } from "#common/constants/response-status.constants";
import type { Request, Response, NextFunction } from "express";
import { BadRequestException } from "#common/exceptions/badRequest.exception";

@Controller('auth')
export class AuthController {
	constructor(
		private readonly logger: LoggerService,
		private readonly tokenProvider: JWTTokenProvider
	) {}

	@UseGuards(AnonymousGuard, AuthGuard('local'))
	@Post('/login')
	@HttpCode(200)
	async postLogin(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    console.log('login post');
		try {
			const member = req.user as { userId: string };
	
			await this.tokenProvider.issuedAllToken(member.userId, res);
	
			return res.status(ResponseStatusConstants.OK.CODE).json({
				id: member.userId,
			});
		}catch(error) {
			this.logger.error('Failed to Login ', error);
			return next(error);
		}
	}

	/*@UseGuards(AnonymousGuard)
	@Get('/oauth/:provider')
	async oAuthLogin(
		@Param('provider') provider: string,
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		const allowedProviders = ['google', 'kakao', 'naver'];

		if(!allowedProviders.includes(provider))
			throw new BadRequestException();

		const providerOptions = {
			google: { scope: ['profile', 'email'], session: false, prompt: 'consent' },
			kakao: { scope: ['account_email', 'profile_nickname'], session: false },
			naver: { session: false }
		};

		const passport = require('passport');

		passport.authenticate(provider, providerOptions[provider])(req, res, next);
	}

	@UseGuards(AnonymousGuard)
	@Get('/oauth/:provider/callback')
	async callbackOAuth(
		@Param('provider') provider: string,
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		const allowedProviders = ['google', 'kakao', 'naver'];

		if(!allowedProviders.includes(provider))
			throw new BadRequestException();

		const passport = require('passport');

		passport.authenticate(provider, { session: false }, async (err: any, member: any, info: any) => {
			try {
				if(err) {
					this.logger.error('Failed to authenticate', err);
					return next(err);
				}

				if(!member) {
					this.logger.error('Failed to callback OAuth. Invalid provider');
					return res.status(ResponseStatusConstants.FORBIDDEN.CODE).json({
						message: "Invalid OAuth provider"
					});
				}

				await this.tokenProvider.issuedAllToken(member.userId, res);

				return res.redirect('http://localhost:3000/');
			}catch(error) {
				this.logger.error('Failed to callback OAuth', error);
				next(error);
			}
		})(req, res, next);
	}*/
	
}