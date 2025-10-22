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
import { PatchProfileDto } from '#member/dtos/in/patch-profile.dto';
import { MemberService } from '#member/services/member.service';
import { ProfileResponseDto } from '#member/dtos/out/profile-response.dto';
import { RequestUserType } from '#common/types/requestUser.type';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import {
  ApiBadRequestResponse, ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { getAuthUserId } from '#common/utils/auth.utils';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { CustomApiCreatedResponse } from '#common/decorators/swagger/created.decorator';
import { ApiAuthExceptionResponse } from '#common/decorators/swagger/api-auth-exception-response.decorator';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

@ApiTags('members')
@Controller('member')
export class MemberController {

	constructor(
		private readonly logger: LoggerService,
    private readonly memberService: MemberService
	){}

  /**
   *
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   loginStatus: boolean
   * }
   */
  @Get('/check-login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인 체크' })
  @ApiResponse({ description: '체크 완료', schema: { example: { loginStatus: true } }})
  checkUser(@Req() req: Request): { loginStatus: boolean } {

    let loginStatus = false;

    if(req.user)
      loginStatus = true;

    return { loginStatus };
  }

  /**
   * @param joinBody {
   *   userId: string,
   *   userPw: string,
   *   userName: string,
   *   nickName?: string,
   *   email: string
   * } body
   *
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   },
   *   file?: File {
   *     imageName: string,
   *     originName: string,
   *     ...
   *   }
   * }
   *
   * @return void
   */
  @UseGuards(AnonymousGuard)
  @Post('/join')
  @UseInterceptors(ProfileUploadInterceptor)
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '회원가입' })
  @CustomApiCreatedResponse(
    '회원 가입 정상 처리',
    {}
  )
  @ApiBadRequestResponse({
    description: '이미 존재하는 사용자 아이디로 요청'
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류'
  })
  async register(@Body() joinBody: any, @Req() req: Request): Promise<void> {
    const joinDTO = plainToInstance(JoinDTO, joinBody);

    const validateErrors = await validate(joinDTO);
    if(validateErrors.length > 0)
      throw new BadRequestException();

    await this.memberService.register(joinDTO, req);
  }

  /**
   * @param userId query
   *
   * @returns {
   *   isExists: boolean
   * }
   */
  @UseGuards(AnonymousGuard)
  @Get('/check-id')
  @HttpCode(200)
  @ApiOperation({ summary: '아이디 중복 체크' })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: '체크할 아이디',
    type: String
  })
  @ApiOkResponse({
    description: '정상 체크',
    examples: {
      isNotExists: {
        summary: '사용 가능',
        value: { isExists: true }
      },
      isExists: {
        summary: '사용 불가능(중복)',
        value: { isExists: false }
      }
    }
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    example: {
      statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
      message: 'Internal server error'
    }
  })
  async checkId(@Query('userId') userId: string): Promise<{ isExists: boolean }> {
    if(!userId || userId.trim() === '')
      throw new BadRequestException();

    const result: boolean = await this.memberService.checkId(userId);

    return { isExists: result };
  }

  /**
   * @param nickname query
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   isExists: boolean
   * }
   */
  @Get('/check-nickname')
  @HttpCode(200)
  @ApiOperation({ summary: '닉네임 중복 체크. 회원, 비회원 모두 가능' })
  @ApiQuery({
    name: 'nickname',
    required: true,
    description: '체크할 닉네임',
    type: String
  })
  @ApiOkResponse({
    description: '정상 체크',
    examples: {
      isNotExists: {
        summary: '사용 가능',
        value: { isExists: true }
      },
      isExists: {
        summary: '사용 불가능(중복)',
        value: { isExists: false }
      }
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
  async checkNickname(@Query('nickname') nickname: string, @Req() req: Request): Promise<{ isExists: boolean }> {

    if(!nickname || nickname.trim() === '')
      throw new BadRequestException();

    const member = req.user as RequestUserType;
    const userId: string | undefined = member?.userId;

    const result: boolean = await this.memberService.checkNickname(nickname, userId);

    return { isExists: result };
  }

  /**
   *
   * @Param patchProfileDTO {
   *   nickname?: string,
   *   deleteProfile?: string,
   * } body
   *
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   },
   *   file?: File {
   *     imageName: string,
   *     originName: string,
   *     ...
   *   }
   * }
   *
   * @return void
   */
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
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    example: {
      statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
      message: 'Internal server error'
    }
  })
  async patchProfile(
    @Body() patchProfileDTO: PatchProfileDto,
    @Req() req: Request
  ): Promise<void> {

    const patchDTO: PatchProfileDto = plainToInstance(PatchProfileDto, patchProfileDTO);

    const validateErrors = await validate(patchDTO);
    if(validateErrors.length > 0)
      throw new BadRequestException();

    await this.memberService.patchProfile(patchDTO, req);
  }

  /**
   *
   * @Param {
   *   user?: {
   *     userId: string,
   *     roles: string[],
   *   }
   * } req
   *
   * @returns {
   *   nickName: string | null,
   *   profileThumbnail: string | null
   * } ProfileResponseDTO
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/profile')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '정보 수정을 위한 데이터 조회' })
  @ApiOkResponse({
    description: '정상 조회',
    type: ProfileResponseDto
  })
  @ApiAuthExceptionResponse()
  async getProfile(@Req() req: Request): Promise<ProfileResponseDto> {
    const userId: string = getAuthUserId(req);

    return await this.memberService.getProfile(userId);
  }

}
