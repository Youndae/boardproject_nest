import { definedMessage, lengthMessage, notEmptyMessage } from '#common/constants/common-validate-message.constans';

export const imageTitleDefinedMessage: string = definedMessage('imageTitle');
export const imageTitleLengthMessage: string = lengthMessage('imageTitle', 2);
export const imageContentDefinedMessage: string = definedMessage('imageContent');
export const imageContentNotEmptyMessage: string = notEmptyMessage('imageContent');