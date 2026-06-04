import { ConflictException } from '@nestjs/common';
import { ResponseStatusConstants, UserAlreadyExistsType } from '#common/constants/response-status.constants';

// register 또는 정보 수정에서 주로 발생
// 정상 요청이더라도 체크 이후 다른 사용자가 unique 컬럼 값을 선점하는 경우 발생하는 exception
// 필드 값을 반환해야 한다는 특성상 message는 기본적인 상수 사용이 아닌 필수로 설계
export class UserAlreadyExistsException extends ConflictException {
  constructor(type: UserAlreadyExistsType) {

    super({
      code: ResponseStatusConstants.USER_ALREADY_EXISTS,
      target: type.forClient,
      message: type.message
    });
  }
}