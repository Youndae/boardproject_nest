import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  HttpCode,
  UseInterceptors,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { AnonymousGuard } from '#common/guards/anonymous.guard';
import { JoinDTO } from '#member/dtos/in/join.dto';
import { ProfileUploadInterceptor } from '#common/interceptor/profile-upload.interceptor';
import type { Request } from 'express';
import { LoggerService } from '#src/config/logger/logger.service';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { PatchProfileDTO } from '#member/dtos/in/patchProfile.dto';
import { MemberService } from '#member/services/member.service';
import { ProfileResponseDTO } from '#member/dtos/out/profileResponse.dto';

@Controller('member')
export class MemberController {

	constructor(
		private readonly logger: LoggerService,
    private readonly memberService: MemberService
	){}

  @Get('/check-login')
  @HttpCode(200)
  checkUser(@Req() req: Request) {

    let loginStatus = false;

    if(req.user)
      loginStatus = true;

    return { loginStatus };
  }

  /**
   * POST
   * 회원 가입 요청
   *
   * 요구사항
   * 1. 비회원만 요청 가능
   * 2. 프로필 이미지 업로드 처리 필요. (이미지는 없을수 있고 최대 1장)
   *
   * @Body {
   *   userId: string,
   *   userPw: string,
   *   userName: string,
   *   nickName?: string,
   *   email: string
   * } joinDTO
   *
   * @Req {
   *   profileImage?: Multipart
   * }
   *
   * @return void
   */
  @UseGuards(AnonymousGuard)
  @Post('/join')
  @UseInterceptors(ProfileUploadInterceptor)
  @HttpCode(201)
  async register(@Body() joinDTO: JoinDTO, @Req() req: Request): Promise<void> {

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

    await this.memberService.register(joinDTO, req);
  }

  /**
   * GET
   * 회원가입 중 아이디 중복 체크
   *
   * 요구사항
   * 1. 비회원만 요청 가능
   *
   * @Query {
   *   userId
   * }
   *
   * @returns {
   *   isExist: boolean
   * }
   */
  // @UseGuards(AnonymousGuard)
  @Get('/check-id')
  @HttpCode(200)
  async checkId(@Query('userId') userId: string): Promise<any> {
    const result: boolean = await this.memberService.checkId(userId);

    return { isExists: result };
  }

  /**
   * GET
   * 회원가입 또는 정보 수정 중 닉네임 중복 체크
   *
   * 요구사항
   * 1. 비회원, 회원 모두 접근 가능
   * 2. 정보 수정 중 자신의 닉네임을 중복체크하는 경우 중복이 아닌것으로 처리.
   *
   * @Query {
   *   nickname
   * }
   *
   * @returns {
   *   isExitst: boolean
   * }
   */
  @Get('/check-nickname')
  @HttpCode(200)
  async checkNickname(@Query('nickname') nickname: string, @Req() req: Request): Promise<any> {
    const member = req.user as { userId: string };
    const userId: string | undefined = member.userId ?? undefined;

    const result: boolean = await this.memberService.checkNickname(nickname, userId);

    return { isExists: result};
  }

  /**
   * PATCH
   * 정보 수정
   *
   * 요구사항
   * 1. 파일 업로드 처리 필요
   *
   * @Param {
   *   nickname?: string,
   *   deleteProfile?: string,
   * } patchProfileDTO
   *
   * @Param {
   *   profileImage?: Multipart,
   *   user: { userId: string }
   * } req
   *
   * @return void
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @UseInterceptors(ProfileUploadInterceptor)
  @Patch('/profile')
  @HttpCode(200)
  async patchProfile(
    @Body() patchProfileDTO: PatchProfileDTO,
    @Req() req: Request
  ): Promise<void> {
    await this.memberService.patchProfile(patchProfileDTO, req);
  }

  /**
   * GET
   * 정보 수정을 위한 데이터 조회
   *
   * @returns {
   *   nickname: string,
   *   profileImage: string | null
   * } ProfileResponseDTO
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/profile')
  @HttpCode(200)
  async getProfile(@Req() req: Request): Promise<ProfileResponseDTO> {
    const member = req.user as { userId: string };

    return await this.memberService.getProfile(member.userId);
  }

}
