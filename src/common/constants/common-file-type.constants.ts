export const FILE_TYPE = {
  IMAGE_BOARD: 'BOARD',
  PROFILE: 'PROFILE'
} as const;

export type FileType = typeof FILE_TYPE[keyof typeof FILE_TYPE];
