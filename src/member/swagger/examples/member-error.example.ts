import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  emailDefinedMessage, emailIsEmailMessage, emailNotEmptyMessage,
  nickNameLengthMessage,
  nickNameNotEmptyMessage,
  userIdDefinedMessage,
  userIdLengthMessage,
  userIdNotEmptyMessage,
  userNameDefinedMessage, userNameLengthMessage,
  userNameNotEmptyMessage,
  userPwDefinedMessage,
  userPwMatchesMessage,
  userPwNotEmptyMessage,
} from '#member/constants/member-validate-message.constants';

export const RegisterBadRequestExamples = {
  userId_undefined: {
    summary: '아이디 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userIdDefinedMessage
    },
  },
  userId_empty: {
    summary: '아이디 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userIdNotEmptyMessage
    },
  },
  userId_length: {
    summary: '아이디 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userIdLengthMessage
    },
  },
  userPw_undefined: {
    summary: '비밀번호 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userPwDefinedMessage
    },
  },
  userPw_empty: {
    summary: '비밀번호 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userPwNotEmptyMessage
    },
  },
  userPw_match: {
    summary: '비밀번호 필드 규칙 위배',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userPwMatchesMessage
    },
  },
  userName_undefined: {
    summary: '이름 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userNameDefinedMessage
    },
  },
  userName_empty: {
    summary: '이름 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userNameNotEmptyMessage
    },
  },
  userName_length: {
    summary: '이름 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: userNameLengthMessage
    },
  },
  nickName_empty: {
    summary: '닉네임 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: nickNameNotEmptyMessage
    },
  },
  nickName_length: {
    summary: '닉네임 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: nickNameLengthMessage
    },
  },
  email_undefined: {
    summary: '이메일 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: emailDefinedMessage
    },
  },
  email_empty: {
    summary: '이메일 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: emailNotEmptyMessage
    },
  },
  email_isEmail: {
    summary: '이메일 필드 규칙 위배',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: emailIsEmailMessage
    },
  },
}

export const PatchProfileBadRequestExamples = {
  nickName_empty: {
    summary: '닉네임 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: nickNameNotEmptyMessage
    },
  },
  nickName_length: {
    summary: '닉네임 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: nickNameLengthMessage
    },
  },
}