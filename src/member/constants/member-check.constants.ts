export const MemberCheckConstants = {
  SUCCESS: 'SUCCESS',
  DUPLICATED: 'DUPLICATED',
  VALID: 'VALID',
  INVALID: 'INVALID'
} as const;

export type MemberCheckType = (typeof MemberCheckConstants)[keyof typeof MemberCheckConstants];