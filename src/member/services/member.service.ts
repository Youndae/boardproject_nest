import { ConflictException, Injectable } from '@nestjs/common';
import { MemberRepository } from '#member/repositories/member.repository';
import { JoinRequest } from '#member/dtos/in/join.request.dto';
import { AuthRepository } from '#member/repositories/auth.repository';
import { Transactional } from 'typeorm-transactional';
import { PatchProfileRequest } from '#member/dtos/in/patch-profile.request.dto';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#src/file/service/resizing.service';
import { MemberMapper } from '#member/mapper/member.mapper';
import { AuthMapper } from '#member/mapper/auth.mapper';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { FileService } from '#src/file/service/file.service';
import { LoggerService } from '#config/logger/logger.service';
import { ProfileResponse } from '#member/dtos/out/profile.response.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { UserAlreadyExistsException } from '#common/exceptions/user-already-exists.exception';
import { UserAlreadyExistsConstants, UserAlreadyExistsType } from '#common/constants/response-status.constants';
import { QueryFailedError } from 'typeorm';
import { UserDuplicatedException } from '#common/exceptions/user-duplicated.exception';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';

@Injectable()
export class MemberService {
  private readonly logger: LoggerService;

  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly resizing: ResizingService,
    private readonly fileService: FileService,
    private readonly originalLogger: LoggerService,
  ) {
    this.logger = this.originalLogger.setContext(MemberService.name);
  }

  @Transactional()
  async register(joinDTO: JoinRequest, profile?: Express.Multer.File): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';

    try {
      if(profile) {
        const { filename: storedFilename } = profile;
        const resizedFilename = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
        this.logger.info('save register profileThumbnail. ', profileThumbnail);
      }

      const saveMember: Member = await MemberMapper.toEntityByJoinDTO(joinDTO, profileThumbnail);

      const userIdExists: boolean = await this.memberRepository.findOne({ where: { userId: saveMember.userId } }) !== null;
      const nicknameExists: boolean = await this.memberRepository.findOne({ where: { nickname: joinDTO.nickname } }) !== null;

      // 설계상 정상적인 요청이라면 userId와 nickname이 중복될 수 없음.
      // 정상 요청에서 중복이 될 가능성이 존재한다면 바로 직전 다른 사용자가 해당값을 사용한 경우.
      // 그 외에는 비정상 요청에서만 발생 가능한 문제.
      if(userIdExists){
        this.logger.warn('register :: userIdExists is true', { userId: joinDTO.userId });
        throw new UserAlreadyExistsException(UserAlreadyExistsConstants.USER_ID);
      }

      if(nicknameExists) {
        this.logger.warn('register :: nicknameExists is true', { nickname: joinDTO.nickname });
        throw new UserAlreadyExistsException(UserAlreadyExistsConstants.NICKNAME);
      }

      const savedMember: Member = await this.memberRepository.save(saveMember);
      const saveAuth: Auth = AuthMapper.toEntityByMember(savedMember.id);
      await this.authRepository.save(saveAuth);

    }catch (error) {
      this.logger.error('register :: Error. ', error);
      if(profileThumbnail) {
        this.logger.error('register :: profileThumbnail delete.', { profileThumbnail });
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.imageName}`);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
      }

      // exists 까지는 걸리지 않았으나 저장 시점에 중복으로 인해 QueryFailedError가 발생할 수 있음을 대비.
      if(error instanceof QueryFailedError) {
        const driverError = error.driverError;

        // MySQL 기준.
        // errno === 1062는 중복 입력
        // sqlState === '23000'은 무결성 제약조건 위배
        if(driverError && driverError.errno === 1062 && driverError.sqlState === '23000') {
          const sqlMessage = driverError.message;

          this.logger.warn('register :: DB level duplicate key detected (1062)', { sqlMessage });

          const matchedConfig: UserAlreadyExistsType | undefined = (Object.values(UserAlreadyExistsConstants) as UserAlreadyExistsType[])
            .find(config => sqlMessage.includes(config.column))

          if(matchedConfig)
            throw new UserAlreadyExistsException(matchedConfig);

          throw new ConflictException('이미 사용중인 정보가 존재합니다.');
        }
      }

      throw error;
    }
  }

  async checkId(userId: string): Promise<void> {
    const checkIdResult: string | null = await this.memberRepository.findUserId(userId);

    if(checkIdResult)
      throw new UserDuplicatedException();
  }

  async checkNickname(nickname: string, userId: number | undefined): Promise<void> {
    const member: Member | null = await this.memberRepository.findOne({ where: { nickname }});

    if(member) {
      if(userId && member.id === userId)
        return;
      else
        throw new UserDuplicatedException();
    }
  }


  @Transactional()
  async patchProfile(patchProfileDTO: PatchProfileRequest, userId: number, profile: Express.Multer.File | undefined): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';
    const member: Member | null = await this.memberRepository.findOne({ where: { id: userId }});

    if(!patchProfileDTO.nickname && !patchProfileDTO.deleteProfile && !profile) return;

    try {
      if(!member){
        this.logger.error('patchProfile :: Member is Null. userId : ', userId);
        throw new AccessDeniedException();
      }

      // 새로 등록하는 이미지가 존재하고
      // 현재 등록되어 있는 profile이 존재하는데
      // deleteProfile이 없다면 잘못된 요청.
      if(profile && member.profile && !patchProfileDTO.deleteProfile){
        this.logger.error('patchProfile :: new Profile and originProfile exist, but deleteProfile does not.', { userId });
        throw new BadRequestException();
      }
    }catch(error) {
      if(profile) {
        await this.fileService.deleteFile(`${destDir}/${profile.filename}`);
      }

      throw error;
    }

    try {
      if(profile) {
        const { filename: storedFilename } = profile;
        const resizedFilename = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
        this.logger.info('patchProfile :: new profileThumbnail.', profileThumbnail);
      }

      if(patchProfileDTO.deleteProfile)
        member.profile = null;

      member.nickname = patchProfileDTO.nickname ?? member.nickname;
      member.profile = profileThumbnail ? profileThumbnail.imageName : member.profile;

      await this.memberRepository.save(member);
      try {
        if(patchProfileDTO.deleteProfile){
          await this.fileService.deleteFile(`${destDir}/${patchProfileDTO.deleteProfile}`);
        }

      }catch (error) {
        /*
        '기존 파일' 삭제만 문제가 발생했기 때문에 나머지 기능에는 문제 없음.
        그럼 사용자에게 굳이 Error 를 반환할 필요가 없다고 판단.
        단지 삭제되지 않은 파일명을 로그로 남겨두고 추후 로그 분석으로 처리할 수 있도록 처리하고
        사용자 요청은 그대로 완료하는것이 옳다고 생각.
       */
        this.logger.error('patchProfile :: deleteProfile Fail.', { deleteFilename: patchProfileDTO.deleteProfile });
      }

    }catch(error) {
      this.logger.error('patchProfile :: Error. ', error);

      if(profileThumbnail) {
        this.logger.error('patchProfile :: delete new profileThumbnail.', { profileThumbnail });
        // resizeing된 파일 제거
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.imageName}`);

        // resizing되지 않은 원본 제거.
        // 리사이징 처리 시 제거되지만 리사이징 과정에서 오류가 발생하는 경우 제거하기 위함
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
      }

      throw error;
    }
  }

  async getProfile(userId: number): Promise<ProfileResponse> {

    const member = await this.memberRepository.findMemberProfileByUserId(userId);

    // 이미 Guard를 통해서 토큰 검증 후 정상적인 사용자 인것을 확인 후 접근이 되었는데
    // 없을 수 없다고 판단. 이런 경우 서버 에러로 봐야 한다고 판단.
    if(!member){
      this.logger.error('getProfile :: member not found', { userId });
      throw new InternalServerErrorException();
    }

    return new ProfileResponse(member);
  }

  @Transactional()
  async postOAuthProfile(nickname: string, profile: Express.Multer.File | undefined, userId: number): Promise<void> {
    let profileThumbnail: { imageName: string, originName: string } | undefined;
    const destDir: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';

    try {
      if(profile) {
        const { filename: storedFilename } = profile;
        const resizedFilename = await this.resizing.resizeProfileImage(destDir, storedFilename);
        profileThumbnail = { imageName: resizedFilename, originName: storedFilename };
      }

      const member: Member | null = await this.memberRepository.findOne({ where: { id: userId }});

      // 이미 Guard를 통해서 토큰 검증 후 정상적인 사용자 인것을 확인 후 접근이 되었는데
      // 없을 수 없다고 판단. 이런 경우 서버 에러로 봐야 한다고 판단.
      if(!member) {
        this.logger.error('postOAuthProfile :: member not found.', { userId });
        throw new InternalServerErrorException();
      }

      member.nickname = nickname;
      member.profile = profileThumbnail ? profileThumbnail.imageName : null;

      await this.memberRepository.save(member);
    }catch(error) {
      this.logger.error('postOAuthProfile :: patch Error. ', error);
      if(profileThumbnail) {
        this.logger.error('postOAuthProfile :: profile delete. ', { profileThumbnail });
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.imageName}`);
        await this.fileService.deleteFile(`${destDir}/${profileThumbnail.originName}`);
      }

      throw error;
    }
  }
}
