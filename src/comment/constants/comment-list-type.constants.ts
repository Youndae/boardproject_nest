export const COMMENT_TARGET = {
  BOARD: 'boardId',
  IMAGE: 'imageId',
} as const;

export type CommentTarget = typeof COMMENT_TARGET[keyof typeof COMMENT_TARGET];