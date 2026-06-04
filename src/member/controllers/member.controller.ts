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
  Param,
} from '@nestjs/common';
import { AnonymousGuard } from '#common/guards/anonymous.guard';
import { JoinRequest } from '#member/dtos/in/join.request.dto';
import { ProfileUploadInterceptor } from '#common/interceptor/profile-upload.interceptor';
import type { Request } from 'express';
import { LoggerService } from '#src/config/logger/logger.service';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { PatchProfileRequest } from '#member/dtos/in/patch-profile.request.dto';
import { MemberService } from '#member/services/member.service';
import { ProfileResponse } from '#member/dtos/out/profile.response.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import {
  ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation, ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { getAuthId, getAuthUserId, getHighestRoleByReq, getId } from '#common/utils/auth.utils';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { ApiAuthExceptionResponse } from '#common/decorators/swagger/api-auth-exception-response.decorator';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  PatchProfileBadRequestExamples,
  RegisterBadRequestExamples,
} from '#member/swagger/examples/member-error.example';
import { ApiCombinedResponse } from '#common/decorators/swagger/api-response.decorator';
import { MemberStatusResponse } from '#member/dtos/out/member-status.response.dto';
import { ApiPrimitiveResponse } from '#common/decorators/swagger/api-primitive-response.decorator';
import { MemberCheckConstants } from '#member/constants/member-check.constants';

@ApiTags('members')
@Controller('member')
@ApiInternalServerErrorResponse({
  description: '서버 오류',
  example: {
    statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
    message: 'Internal server error'
  }
})
export class MemberController {
  private readonly logger: LoggerService;

	constructor(
		private readonly originalLogger: LoggerService,
    private readonly memberService: MemberService,
	){
    this.logger = this.originalLogger.setContext(MemberController.name);
  }

  @Get('/status')
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @HttpCode(200)
  @ApiOperation({ summary: '로그인 상태 체크' })
  @ApiCombinedResponse(MemberStatusResponse)
  @ApiForbiddenResponse({
    description: '비로그인 사용자',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE
    }
  })
  checkUser(@Req() req: Request): MemberStatusResponse {
    const userId: string = getAuthUserId(req);
    const role: string = getHighestRoleByReq(req);

    return new MemberStatusResponse(userId, role);
  }

  @UseGuards(AnonymousGuard)
  @Post('/join')
  @UseInterceptors(ProfileUploadInterceptor)
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '회원가입' })
  @ApiPrimitiveResponse('number', 201)
  @ApiBadRequestResponse({
    description: '이미 존재하는 사용자 아이디로 요청'
  })
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: RegisterBadRequestExamples
      }
    }
  })
  async register(
    @Body() joinBody: any,
    @Req() req: Request
  ): Promise<void> {
    const joinDTO = plainToInstance(JoinRequest, joinBody);

    const validateErrors = await validate(joinDTO);
    if(validateErrors.length > 0)
      throw new BadRequestException();

    const profile: Express.Multer.File | undefined = req.file;

    await this.memberService.register(joinDTO, profile);
  }

  @UseGuards(AnonymousGuard)
  @Get('/check-id/:userId')
  @HttpCode(200)
  @ApiOperation({ summary: '아이디 중복 체크' })
  @ApiParam({
    name: 'userId',
    description: '체크할 아이디',
    type: String
  })
  @ApiPrimitiveResponse('string', 200)
  @ApiConflictResponse({
    description: '아이디 중복',
    example: {
      statusCode: ResponseStatusConstants.CONFLICT.CODE,
      message: MemberCheckConstants.DUPLICATED
    }
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    example: {
      statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
      message: 'Internal server error'
    }
  })
  async checkId(@Param('userId') userId: string): Promise<string> {
    if(!userId || userId.trim() === '')
      throw new BadRequestException();

    await this.memberService.checkId(userId);

    return MemberCheckConstants.SUCCESS;
  }

  @Get('/check-nickname/:nickname')
  @HttpCode(200)
  @ApiOperation({ summary: '닉네임 중복 체크. 회원, 비회원 모두 가능' })
  @ApiParam({
    name: 'nickname',
    description: '체크할 닉네임',
    type: String
  })
  @ApiPrimitiveResponse('string', 200)
  @ApiConflictResponse({
    description: '닉네임 중복',
    example: {
      statusCode: ResponseStatusConstants.CONFLICT.CODE,
      message: MemberCheckConstants.DUPLICATED
    }
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    example: {
      statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
      message: 'Internal server error'
    }
  })
  @ApiAuthExceptionResponse()
  async checkNickname(@Param('nickname') nickname: string, @Req() req: Request): Promise<string> {

    if(!nickname || nickname.trim() === '')
      throw new BadRequestException();

    const userId: number | undefined = getId(req);

    await this.memberService.checkNickname(nickname, userId);

    return MemberCheckConstants.SUCCESS;
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @UseInterceptors(ProfileUploadInterceptor)
  @Patch('/profile')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '정보 수정' })
  @ApiOkResponse({
    description: '정상 수정',
    schema: {}
  })
  @ApiAuthExceptionResponse()
  @ApiForbiddenResponse({
    description: '사용자 데이터가 없는 경우',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE
    }
  })
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PatchProfileBadRequestExamples
      }
    }
  })
  async patchProfile(
    @Body() patchProfileDTO: any,
    @Req() req: Request
  ): Promise<void> {
    const patchDTO: PatchProfileRequest = plainToInstance(PatchProfileRequest, patchProfileDTO) ?? new PatchProfileRequest();

    if(patchDTO){
      const validateErrors = await validate(patchDTO);
      if(validateErrors.length > 0)
        throw new BadRequestException();
    }

    const userId = getAuthId(req);
    const profile: Express.Multer.File | undefined = req.file;

    await this.memberService.patchProfile(patchDTO, userId, profile);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/profile')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '정보 수정을 위한 데이터 조회' })
  @ApiOkResponse({
    description: '정상 조회',
    type: ProfileResponse
  })
  @ApiAuthExceptionResponse()
  async getProfile(@Req() req: Request): Promise<ProfileResponse> {
    const userId: number = getAuthId(req);

    return await this.memberService.getProfile(userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @UseInterceptors(ProfileUploadInterceptor)
  @Post('/oauth/join/profile')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: 'oAuth 최초 로그인 사용자의 닉네임과 프로필 이미지 업로드'})
  async postOAuthProfile(@Body('nickname') nickname: string, @Req() req: Request): Promise<void> {
    const profile: Express.Multer.File | undefined = req.file;
    const userId: number = getAuthId(req);

    await this.memberService.postOAuthProfile(nickname, profile, userId);
  }
}
