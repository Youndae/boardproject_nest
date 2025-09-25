import { Controller, Post, Get, UseGuards, Body, HttpCode, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { AnonymousGuard } from '#common/guards/anonymous.guard';
import { JoinDTO } from '#member/dtos/join.dto';
import { ProfileUploadInterceptor } from '#common/interceptor/profile-upload.interceptor';
import type { Request } from 'express';
import { LoggerService } from '#src/config/logger/logger.service';

@Controller('member')
export class MemberController {

	constructor(
		private readonly logger: LoggerService
	){}

  /**
   * POST
   * 회원 가입 요청
   *
   * 요구사항
   * 1. 비회원만 요청 가능
   * 2. 프로필 이미지 업로드 처리 필요. (이미지는 없을수 있고 최대 1장)
   *
   * @Param {
   *   userId: string,
   *   userPw: string,
   *   userName: string,
   *   nickName?: string,
   *   email: string
   *   profileImage?: Multipart
   * } joinDTO
   *
   * @returns {
   *   status: 201,
   *
   * }
   */
  @UseGuards(AnonymousGuard)
  @Post('/join')
  @UseInterceptors(ProfileUploadInterceptor)
  @HttpCode(201)
  register(@Body() joinDTO: JoinDTO, @Req() req: Request): string {

	/*
		서비스 호출
		this.memberService.register(joinDTO, req.file);

		서비스 에서는 회원가입 데이터 처리 전

		let profileThumbnail: { imageName: string, originName: string } | undefined;
		if(req.file) {
			const destDir = this.configService.get<string>('PROFILE_FILE_PATH');
			const { filename: storedFilename, originalname: originName } = req.file;
			const { resizedFilename } = await this.resizing.resizeProfileImage(destDir, storedFilename);
			profileThumbnail = { imageName: resizedFilename, originName };
		}

		JoinDTO Entity화 이후
		Repository 호출해서 데이터 저장.

		전체 트랜잭션으로 묶어주고 실패시 catch에서 파일 제거
	*/

    return '';
  }
}
