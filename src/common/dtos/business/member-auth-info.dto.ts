export class MemberAuthInfo {
  id: number;
  roles: string[];

  constructor(id: number, roles: string[]) {
    this.id = id;
    this.roles = roles;
  }
}