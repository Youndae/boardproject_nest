import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  imageContentDefinedMessage, imageContentNotEmptyMessage,
  imageTitleDefinedMessage,
  imageTitleLengthMessage,
} from '#imageBoard/constants/image-board-validate-message.constants';

export const PostImageBoardBadRequestExamples = {
  no_file: {
    summary: '파일 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: ResponseStatusConstants.BAD_REQUEST.MESSAGE
    }
  },
  title_undefined: {
    summary: '제목 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageTitleDefinedMessage
    }
  },
  title_to_short: {
    summary: '제목 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageTitleLengthMessage
    }
  },
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageContentNotEmptyMessage
    }
  }
};

export const PatchImageBoardBadRequestExamples = {
  too_many_files: {
    summary: '파일 개수 제한 초과',
    value: {
      statusCode: ResponseStatusConstants.TOO_MANY_FILES.CODE,
      message: ResponseStatusConstants.TOO_MANY_FILES.MESSAGE
    }
  },
  all_file_delete: {
    summary: '파일 추가 없이 전체 파일 삭제',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: ResponseStatusConstants.BAD_REQUEST.MESSAGE
    }
  },
  wrong_delete_file_name: {
    summary: '존재하지 않는 파일 삭제 요청',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: ResponseStatusConstants.BAD_REQUEST.MESSAGE
    }
  },
  title_undefined: {
    summary: '제목 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageTitleDefinedMessage
    }
  },
  title_to_short: {
    summary: '제목 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageTitleLengthMessage
    }
  },
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: imageContentNotEmptyMessage
    }
  }
}