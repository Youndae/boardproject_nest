import type { Request } from 'express';
import { RequestUserType } from '#common/types/requestUser.type';
import { Role, ROLE_PRIORITY } from '#common/constants/user-auth.constants';

/**
 *
 * RolesGuard를 통해 확실한 권한 제어가 되는 곳에서만 호출해 아이디 반환을 보장.
 * @param req
 */
export function getAuthUserId(req: Request): string {
  const user = req.user as RequestUserType;

  return user.userId;
}

export function getHighestRoleByReq(req: Request): string {
  const authorities = (req.user as RequestUserType).roles;

  return authorities
          .map((auth) => {
            return Object.values(Role)
                        .includes(auth as Role)
                          ? (auth as Role) : Role.MEMBER;
          })
          .reduce((prev, curr) => {
            return ROLE_PRIORITY[curr] > ROLE_PRIORITY[prev] ? curr : prev;
          }, Role.MEMBER);
}

export function getHighestRole(authorities: string[]): string {
  return authorities
    .map((auth) => {
      return Object.values(Role)
        .includes(auth as Role)
        ? (auth as Role) : Role.MEMBER;
    })
    .reduce((prev, curr) => {
      return ROLE_PRIORITY[curr] > ROLE_PRIORITY[prev] ? curr : prev;
    }, Role.MEMBER);
}

export function getAuthId(req: Request): number {
  const user = req.user as RequestUserType;

  return user.id;
}

export function getId(req: Request): number | undefined {
  if(!req.user)
    return undefined;

  return getAuthId(req);
}

/**
 *
 * 비회원, 회원 모두 접근할 수 있는 곳에서만 호출해
 * 비회원인 경우 null을 반환, 회원인 경우 아이디를 반환.
 * getAuthUserId
 * @param req
 */
export function getUserId(req: Request): string | undefined {
  if(!req.user)
    return undefined;

  return getAuthUserId(req);
}