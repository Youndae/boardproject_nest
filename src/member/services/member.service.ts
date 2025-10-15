import { Injectable } from '@nestjs/common';
import { MemberRepository } from '#member/repositories/member.repository';
import { JoinDTO } from '#member/dtos/in/join.dto';
import { AuthRepository } from '#member/repositories/auth.repository';
import { Transactional } from 'typeorm-transactional';
import { PatchProfileDto } from '#member/dtos/in/patch-profile.dto';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#common/services/resizing.service';
import { MemberMapper } from '#member/mapper/member.mapper';
import { AuthMapper } from '#member/mapper/auth.mapper';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { FileService } from '#common/services/file.service';
import { LoggerService } from '#config/logger/logger.service';
import { RequestUserType } from '#common/types/requestUser.type';
import { ForbiddenException } from '#common/exceptions/forbidden.exception';
import { ProfileResponseDto } from '#member/dtos/out/profile-response.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { getAuthUserId } from '#common/utils/auth.utils';

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly resizing: ResizingService,
    private readonly fileService: FileService,
    private readonly logger: LoggerService,
  ) {}

  /**
   *
   * @param joinDTO
   * @param req
   *
   * @return void
   */
  @Transactional()
  async register(joinDTO: JoinDTO, req: Request): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';

    try {
      if(req.file) {
        const { filename: storedFilename } = req.file;
        const { resizedFilename } = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
        this.logger.info('memberService :: save register profileThumbnail. ', profileThumbnail);
      }

      const saveMember: Member = await MemberMapper.toEntityByJoinDTO(joinDTO, profileThumbnail);
      const saveAuth: Auth = AuthMapper.toEntityByMember(joinDTO.userId);

      const memberExists: boolean = await this.memberRepository.findOne({ where: { userId: saveMember.userId } }) !== null;

      if(memberExists)
        throw new BadRequestException();

      await this.memberRepository.save(saveMember);
      await this.authRepository.save(saveAuth);

      this.logger.info('memberService :: register member. userId : ', saveMember.userId);
    }catch (error) {
      this.logger.error('memberService :: register Error. ', error);
      if(profileThumbnail) {
        this.logger.error('memberService :: register profileThumbnail delete. ', profileThumbnail);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.imageName}`);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
      }

      throw error;
    }
  }

  /**
   *
   * @param userId
   *
   * @return boolean ( true: duplicate )
   */
  async checkId(userId: string): Promise<boolean> {
    const checkIdResult: string | null = await this.memberRepository.findUserId(userId);

    return checkIdResult !== null;
  }

  /**
   *
   * @param nickname
   * @param userId
   *
   * @return boolean ( true: duplicate )
   */
  async checkNickname(nickname: string, userId: string | undefined): Promise<boolean> {
    const member: Member | null = await this.memberRepository.findOne({ where: { nickName: nickname }});

    if(member)
      return member.userId !== userId;

    return false;
  }

  /**
   *
   * @param patchProfileDTO
   * @param req
   *
   * @return void
   */
  @Transactional()
  async patchProfile(patchProfileDTO: PatchProfileDto, req: Request): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';

    try {
      if(req.file) {
        const { filename: storedFilename } = req.file;
        const { resizedFilename } = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
        this.logger.info('memberService :: patch profile new profileThumbnail. ', profileThumbnail);
      }

      const userId: string = getAuthUserId(req);

      const member: Member | null = await this.memberRepository.findOne({ where: { userId }});

      if(!member){
        this.logger.error('memberService :: patch profile Member is Null. userId : ', userId);
        throw new ForbiddenException();
      }

      // 새로 등록하는 프로필 이미지는 있는데 deleteProfile이 비어있고
      // 조회한 member.profileThumbnail은 존재하는 경우
      // deleteProfile에 member.profileThumbnail을 set해서 기존 파일을 제거 할 수 있도록 셋팅
      if(req.file && !patchProfileDTO.deleteProfile && member.profileThumbnail)
        patchProfileDTO.setDeleteProfile(member.profileThumbnail);

      if(patchProfileDTO.deleteProfile)
        member.profileThumbnail = null;

      member.nickName = patchProfileDTO.nickname === '' ? null : patchProfileDTO.nickname;
      member.profileThumbnail = profileThumbnail ? `profile/${profileThumbnail?.imageName}` : member.profileThumbnail;

      await this.memberRepository.save(member);

      try {
        if(patchProfileDTO.deleteProfile){
          const deleteFileNameSlice: string = patchProfileDTO.deleteProfile.replace('profile/', '');
          await this.fileService.deleteFile(`${destDir}/${deleteFileNameSlice}`);
        }

      }catch (error) {
        this.logger.error('memberService :: patch profile deleteProfile Fail. filename : ', patchProfileDTO.deleteProfile);
      }

    }catch(error) {
      this.logger.error('memberService :: patch profile error. ', error);

      if(profileThumbnail) {
        this.logger.error('memberService :: patch profile delete new profileThumbnail. ', profileThumbnail);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.imageName}`);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
      }

      throw error;
    }
  }

  /**
   *
   * @param userId
   *
   * @returns {
   *   nickname: string,
   *   profileImage: string | null
   * }
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {

    return this.memberRepository.findMemberProfileByUserId(userId);
  }
}
