export const Role = {
  MEMBER: 'ROLE_MEMBER',
  ADMIN: 'ROLE_ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_PRIORITY: Record<Role, number> = {
  [Role.MEMBER]: 1,
  [Role.ADMIN]: 2
}