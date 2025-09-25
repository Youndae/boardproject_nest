import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import multer, { MulterError } from 'multer';
import { createStorage, imageFileFilter, getMaxFileSize } from '#config/file/upload.config';
import { generateStoredFilename } from '#common/utils/file.util';
import { TooManyFilesException } from '../exceptions/too-many-files.exception';
import { FileExtensionNotAllowedException } from '../exceptions/file-extension-not-allowed.exception';
import { FileSizeTooLargeException } from '../exceptions/file-size-too-large.exception';

@Injectable()
export class ProfileUploadInterceptor implements NestInterceptor {
	private readonly upload: multer.Multer;
	private readonly isTest: boolean;

	constructor(private readonly configService: ConfigService) {
		this.isTest = (this.configService.get<string>('NODE_ENV') || 'development').toLowerCase() === 'test';

		this.upload = multer({
			storage: createStorage('profile', this.configService),
			fileFilter: imageFileFilter,
			limits: { files: 1, fileSize: getMaxFileSize('profile', this.configService) },
		});
	}

	intercept(ctx: ExecutionContext, next: CallHandler): Promise<any> {
		const req = ctx.switchToHttp().getRequest();
		const res = ctx.switchToHttp().getResponse();

		return new Promise((resolve, reject) => {
			this.upload.single('profileThumbnail')(req, res, (err: any) => {
				if(err){
					if(err instanceof MulterError){
						if(err.code === 'LIMIT_FILE_SIZE')
							return reject(new FileSizeTooLargeException());
						else if(err.code === 'LIMIT_FILE_COUNT')
							return reject(new TooManyFilesException());
						else if(err.code === 'LIMIT_UNEXPECTED_FILE')
							return reject(new FileExtensionNotAllowedException());
					}					

					return reject(err);
				}

				if(this.isTest && req.file && !req.file.filename) 
					req.file.filename = generateStoredFilename(req.file.originalname);
				
				resolve(next.handle());
			});
		});
	}
}