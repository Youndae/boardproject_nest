import { Injectable } from '@nestjs/common';
import { MemberRepository } from '#member/repositories/member.repository';
import { JoinDTO } from '#member/dtos/in/join.dto';
import { AuthRepository } from '#member/repositories/auth.repository';
import { Transactional } from 'typeorm-transactional';
import { PatchProfileDTO } from '#member/dtos/in/patchProfile.dto';
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
import { ProfileResponseDTO } from '#member/dtos/out/profileResponse.dto';

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

    try {
      if(profileThumbnail) {
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
        this.logger.info('memberService :: delete register original profileThumbnail File');
      }
    }catch (error) {
      this.logger.error('memberService :: delete register original ProfileThumbnail File error.', error);
      this.logger.error('memberService :: delete register original ProfileThumbnail name : ', profileThumbnail?.originName);
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
  async patchProfile(patchProfileDTO: PatchProfileDTO, req: Request): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';

    try {
      if(req.file) {
        const { filename: storedFilename } = req.file;
        const { resizedFilename } = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
        this.logger.info('memberService :: patch profile new profileThumbnail. ', profileThumbnail);
      }

      const userId: string = (req.user as RequestUserType).userId;

      const member: Member | null = await this.memberRepository.findOne({ where: { userId }});

      if(!member){
        this.logger.error('memberService :: patch profile Member is Null. userId : ', userId);
        throw new ForbiddenException();
      }

      member.nickName = patchProfileDTO.nickname ?? null;
      member.profileThumbnail = `profile/${profileThumbnail?.imageName ?? null}`;

      await this.memberRepository.save(member);

      try {
        if(patchProfileDTO.deleteProfile)
          await this.fileService.deleteFile(`${destDir}/${patchProfileDTO.deleteProfile}`);
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
  async getProfile(userId: string): Promise<ProfileResponseDTO> {

    return this.memberRepository.findMemberProfileByUserId(userId);
  }
}
