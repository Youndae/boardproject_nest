export const definedMessage = (field: string) => {
  return `${field} should not be null or undefined`;
}

export const lengthMessage = (field: string, minLength: number): string => {
  return `${field} must be longer than or equal to ${minLength} characters`;
}

export const notEmptyMessage = (field: string) => {
  return `${field} is not empty`;
}

export const minMessage = (field: string, min: number): string => {
  return `${field} less than ${min}`
}

export const keywordLengthMessage:string = lengthMessage('keyword', 2);
export const searchTypeIsInMessage: string = 'searchType must be one of the following values: t, c, tc, u';
