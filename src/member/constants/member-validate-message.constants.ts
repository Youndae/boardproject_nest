import { definedMessage, lengthMessage, notEmptyMessage } from '#common/constants/common-validate-message.constans';

export const userIdDefinedMessage: string = definedMessage('userId');
export const userIdNotEmptyMessage: string = notEmptyMessage('userId');
export const userIdLengthMessage: string = lengthMessage('userId', 2);
export const userPwDefinedMessage: string = definedMessage('password');
export const userPwNotEmptyMessage: string = notEmptyMessage('password');
export const userPwMatchesMessage: string = '비밀번호는 영문, 숫자, 특수문자를 포함한 8 ~ 20자리여야 합니다.';
export const userNameDefinedMessage: string = definedMessage('userName');
export const userNameNotEmptyMessage: string = notEmptyMessage('userName');
export const userNameLengthMessage: string = lengthMessage('userName', 2);
export const nickNameNotEmptyMessage: string = notEmptyMessage('nickName');
export const nickNameLengthMessage: string = lengthMessage('nickName', 2);
export const emailDefinedMessage: string = definedMessage('email');
export const emailNotEmptyMessage: string = notEmptyMessage('email');
export const emailIsEmailMessage: string = 'email must be an email';