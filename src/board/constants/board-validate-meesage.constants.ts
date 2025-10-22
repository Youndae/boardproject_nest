import {
  definedMessage,
  lengthMessage,
  minMessage,
  notEmptyMessage,
} from '#common/constants/common-validate-message.constans';

export const boardTitleDefinedMessage: string = definedMessage('boardTitle');
export const boardTitleLengthMessage: string = lengthMessage('boardTitle', 2);
export const boardContentDefinedMessage: string = definedMessage('boardContent');
export const boardContentNotEmptyMessage: string = notEmptyMessage('boardContent');
export const boardGroupNoDefinedMessage: string = definedMessage('boardGroupNo');
export const boardGroupNoMinMessage: string = minMessage('boardGroupNo', 0);
export const boardUpperNoDefinedMessage: string = definedMessage('boardUpperNo');
export const boardUpperNoNotEmptyMessage: string = notEmptyMessage('boardUpperNo');
export const boardIndentDefinedMessage: string = definedMessage('boardIndent');
export const boardIndentMinMessage: string = minMessage('boardIndent', 0);