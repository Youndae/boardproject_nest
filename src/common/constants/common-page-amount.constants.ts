export const PAGE_AMOUNT = {
  BOARD: 20,
  IMAGE: 15,
  COMMENT: 20
} as const;

export type PageAmount = typeof PAGE_AMOUNT[keyof typeof PAGE_AMOUNT];