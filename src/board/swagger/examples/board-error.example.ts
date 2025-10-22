import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  boardContentDefinedMessage,
  boardContentNotEmptyMessage,
  boardGroupNoDefinedMessage,
  boardGroupNoMinMessage,
  boardIndentDefinedMessage, boardIndentMinMessage,
  boardTitleDefinedMessage,
  boardTitleLengthMessage,
  boardUpperNoDefinedMessage,
  boardUpperNoNotEmptyMessage,
} from '#board/constants/board-validate-meesage.constants';


export const PostBoardBadRequestExamples = {
  title_undefined: {
    summary: '제목 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardTitleDefinedMessage
    }
  },
  title_to_short: {
    summary: '제목 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardTitleLengthMessage
    }
  },
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardContentNotEmptyMessage
    }
  }
}

export const PostBoardReplyBadRequestExamples = {
  title_undefined: {
    summary: '제목 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardTitleDefinedMessage
    }
  },
  title_to_short: {
    summary: '제목 필드 짧음',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardTitleLengthMessage
    }
  },
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardContentNotEmptyMessage
    }
  },
  group_number_undefined: {
    summary: 'GroupNo 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardGroupNoDefinedMessage
    }
  },
  group_number_min: {
    summary: 'GroupNo 필드 최소값 위반',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardGroupNoMinMessage
    }
  },
  upper_number_undefined: {
    summary: 'UpperNo 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardUpperNoDefinedMessage
    }
  },
  upper_blank: {
    summary: 'UpperNo 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardUpperNoNotEmptyMessage
    }
  },
  indent_undefined: {
    summary: 'Indent 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardIndentDefinedMessage
    }
  },
  indent_min: {
    summary: 'Indent 필드 최소값 위반',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: boardIndentMinMessage
    }
  },
}