import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { join } from 'path';
import { appendSizeSuffix } from '#common/utils/file.util';
import { FileService } from '#common/services/file.service';


@Injectable()
export class ResizingService {
	constructor(private readonly fileService: FileService) {}
	
	async resizeProfileImage(destDir: string, storedFilename: string) {
		const filepath = join(destDir, storedFilename);
		const resizedName = appendSizeSuffix(storedFilename, 300);
		const resizedPath = join(destDir, resizedName);

		await this.resizeImage(filepath, 300, resizedPath);

		this.fileService.deleteFile(filepath);

		return { resizedFilename: resizedName };
	}

	async resizeBoardImages(destDir: string, storedFilenames: string[]) {
		const tasks = storedFilenames.flatMap((name) => {
			const src = join(destDir, name);
			const n300 = appendSizeSuffix(name, 300);
			const n600 = appendSizeSuffix(name, 600);

			return [
				this.resizeImage(src, 300, join(destDir, n300)),
				this.resizeImage(src, 600, join(destDir, n600)),
			];
		});

		await Promise.all(tasks);
	}

	private async resizeImage(path: string, size: number, toFile: string) {
		await sharp(path).resize(size).toFile(toFile);
	} 
}