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

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly resizing: ResizingService,
    private readonly fileService: FileService,
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
    //TODO: let profileThumbnail: { imageName: string, originName: string } | undefined;
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';
    if(req.file) {
      const { filename: storedFilename } = req.file;
      const { resizedFilename } = await this.resizing.resizeProfileImage(destDir, storedFilename);
      profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
    }

    const saveMember: Member = await MemberMapper.toEntityByJoinDTO(joinDTO, profileThumbnail);
    const saveAuth: Auth = AuthMapper.toEntityByMember(joinDTO.userId);

    await this.memberRepository.save(saveMember);
    await this.authRepository.save(saveAuth);

    if(profileThumbnail)
      await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);

  }

  /**
   *
   * @param userId
   *
   * @return boolean ( true: duplicate )
   */
  async checkId(userId: string): Promise<boolean> {
    //TODO: memberRepository.findById(userId);
    //TODO: if(member) true else false

    return false;
  }

  /**
   *
   * @param nickname
   * @param userId
   *
   * @return boolean ( true: duplicate )
   */
  async checkNickname(nickname: string, userId: string): Promise<boolean> {
    //TODO: memberRepository.findByNickname(nickname);
    //TODO: if(member) if(member.userId === userId) return false else return true

    return false;
  }

  /**
   *
   * @param patchProfileDTO
   * @param req
   *
   * @return void
   */
  async patchProfile(patchProfileDTO: PatchProfileDTO, req: Request): Promise<void> {
    //TODO: let profileThumbnail: { imageName: string, originName: string } | undefined;
    //TODO: if req.file resize

    //TODO: const userId = req.user.userId
    //TODO: const member = memberRepository.findById();
    //TODO: const patchMember = member nickname, profileImage patch
    //TODO: memberRepository.save(patchMember);

    //TODO: if(deleteProfile) fileService.deleteFile(deleteProfile);
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
  async getProfile(userId: string): Promise<any> {
    //TODO: memberRepository.findById(userId);

    //TODO: return { nickname, profileImage };

    return null;
  }
}
