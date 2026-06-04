export const getTotalPages = (totalElements: number, amount: number): number =>
  Math.ceil(totalElements / amount);