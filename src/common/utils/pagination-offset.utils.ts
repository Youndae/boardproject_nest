export function getPaginationOffset(page: number, amount: number): number {
  return (page - 1) * amount;
}

export function setKeyword(keyword?: string): string {
  return keyword ? `%${keyword}%` : '';
}