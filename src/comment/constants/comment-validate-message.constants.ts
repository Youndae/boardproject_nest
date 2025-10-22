import { definedMessage, minMessage, notEmptyMessage } from '#common/constants/common-validate-message.constans';

export const commentContentDefinedMessage: string = definedMessage('commentContent');
export const commentContentNotEmptyMessage: string = notEmptyMessage('commentContent');
export const commentGroupNoDefinedMessage: string = definedMessage('commentGroupNo');
export const commentGroupNoMinMessage: string = minMessage('commentGroupNo', 0);
export const commentUpperNoDefinedMessage: string = definedMessage('commentUpperNo');
export const commentUpperNoNotEmptyMessage: string = notEmptyMessage('commentUpperNo');
export const commentIndentDefinedMessage: string = definedMessage('commentIndent');
export const commentIndentMinMessage: string = minMessage('commentIndent', 0);