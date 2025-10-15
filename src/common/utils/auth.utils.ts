import type { Request } from 'express';
import { RequestUserType } from '#common/types/requestUser.type';

/**
 *
 * RolesGuard를 통해 확실한 권한 제어가 되는 곳에서만 호출해
 * 아이디 반환을 보장.
 * @param req
 */
export function getAuthUserId(req: Request): string {
  const user = req.user as RequestUserType;

  return user.userId;
}

/**
 *
 * 비회원, 회원 모두 접근할 수 있는 곳에서만 호출해
 * 비회원인 경우 null을 반환, 회원인 경우 아이디를 반환.
 * getAuthUserId
 * @param req
 */
export function getUserId(req: Request): string | null {
  if(!req.user)
    return null;

  return getAuthUserId(req);
}