export const MemberMailConstants = {
  NAVER: 'naver',
  DAUM: 'daum',
  GMAIL: 'gmail',
  NONE: 'none',
} as const;

export type MailType = typeof MemberMailConstants[keyof typeof MemberMailConstants];

const VALID_SUFFIXES = new Set<MailType>(Object.values(MemberMailConstants) as MailType[]);

export const findSuffixType = (suffix: string): MailType => {
  return VALID_SUFFIXES.has(suffix as MailType)
      ? (suffix as MailType)
      : MemberMailConstants.NONE;
}