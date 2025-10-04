import { diskStorage, memoryStorage, MulterError } from 'multer';
import { ensureDir, pathExists } from 'fs-extra';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { generateStoredFilename, imageMimes } from '#common/utils/file.util';

export type UploadRequestType = 'profile' | 'board';

function resolveBasePath(type: UploadRequestType, config: ConfigService) {
	const pathName = type === 'profile' ? 'PROFILE_FILE_PATH' : 'BOARD_FILE_PATH';

	return config.get<string>(pathName);
}

export function createStorage(type: UploadRequestType, config: ConfigService) {
	const nodeEnv = (config.get<string>('NODE_ENV') || 'development').toLowerCase();

	if(nodeEnv === 'test')
		return memoryStorage();

	const basePath = resolveBasePath(type, config);

	if(!basePath){
		throw new Error('BASE_PATH is not set');
	}
		

	return diskStorage({
		destination: async (req: Request, file, cb) => {
			try {
				if(!(await pathExists(basePath)))
					await ensureDir(basePath);

				cb(null, basePath!);
			}catch (error) {
				cb(error as any, '');
			}
		},
		filename: (req: Request, file, cb) => {
			cb(null, generateStoredFilename(file.originalname));
		},
	});
}

export function imageFileFilter(req: Request, file: Express.Multer.File, cb) {
	if(imageMimes.has(file.mimetype))
		return cb(null, true);

	cb(new MulterError('LIMIT_UNEXPECTED_FILE'), false);
}

export function getMaxFileSize(type: UploadRequestType, config: ConfigService): number {
	const key = type === 'profile' ? 'PROFILE_MAX_FILE_SIZE' : 'BOARD_MAX_FILE_SIZE';
	
	return Number(config.get<string>(key)) || 1024 * 1024 * 5;
}