import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  commentContentDefinedMessage,
  commentContentNotEmptyMessage,
  commentGroupNoDefinedMessage,
  commentGroupNoMinMessage, commentIndentDefinedMessage, commentIndentMinMessage,
  commentUpperNoDefinedMessage,
  commentUpperNoNotEmptyMessage,
} from '#comment/constants/comment-validate-message.constants';

export const PostCommentBadRequestExamples = {
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentContentNotEmptyMessage
    }
  }
}

export const PostCommentReplyBadRequestExamples = {
  content_undefined: {
    summary: '내용 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentContentDefinedMessage
    }
  },
  content_blank: {
    summary: '내용 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentContentNotEmptyMessage
    }
  },
  group_number_undefined: {
    summary: 'GroupNo 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentGroupNoDefinedMessage
    }
  },
  group_number_min: {
    summary: 'GroupNo 필드 최소값 위반',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentGroupNoMinMessage
    }
  },
  upper_number_undefined: {
    summary: 'UpperNo 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentUpperNoDefinedMessage
    }
  },
  upper_blank: {
    summary: 'UpperNo 필드 blank',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentUpperNoNotEmptyMessage
    }
  },
  indent_undefined: {
    summary: 'Indent 필드 누락',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentIndentDefinedMessage
    }
  },
  indent_min: {
    summary: 'Indent 필드 최소값 위반',
    value: {
      statusCode: ResponseStatusConstants.BAD_REQUEST.CODE,
      message: commentIndentMinMessage
    }
  },
}