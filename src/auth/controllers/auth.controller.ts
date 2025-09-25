import { Controller, HttpCode, Post, Req, Res, UseGuards, Next } from "@nestjs/common";
import { LoggerService } from "#config/logger/logger.service";
import { JWTTokenProvider } from "#auth/providers/jwt-token.provider";
import { AnonymousGuard } from "#common/guards/anonymous.guard";
import { AuthGuard } from "@nestjs/passport";
import { ResponseStatusConstants } from "#common/constants/response-status.constants";
import type { Request, Response, NextFunction } from "express";

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
}