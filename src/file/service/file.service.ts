import { Injectable } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { appendSizeSuffix, getBaseNameAndExt } from '#common/utils/file.util';
import { LoggerService } from '#config/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { FileType } from '#common/constants/common-file-type.constants';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';

@Injectable()
export class FileService {
  private readonly logger: LoggerService;

  constructor(
    private readonly originalLogger: LoggerService,
    private readonly configService: ConfigService
  ) {
    this.logger = this.originalLogger.setContext(FileService.name);
  }
   async deleteFile(filePath: string) {
     try {
       await fsPromises.unlink(filePath);
     }catch(err) {
       this.logger.error('deleteFile :: File deletion error: ', err);
       this.logger.error('deleteFile :: failed delete file name : ', filePath);
     }
  }

  async deleteBoardFiles(destDir: string, imageNames: string[]) {
    const deleteFileNames: string[] = [];
    imageNames.forEach(name => {
      const replaceName = name.replace('board/', '');
      const size300Name = appendSizeSuffix(replaceName, 300);
      const size600Name = appendSizeSuffix(replaceName, 600);
      deleteFileNames.push(replaceName);
      deleteFileNames.push(size300Name);
      deleteFileNames.push(size600Name);

      return replaceName;
    });

    deleteFileNames.forEach(name => this.deleteFile(`${destDir}/${name}`));
  }

  async displayService(imageName: string, type: FileType): Promise<{
    path: string,
    contentType: string
  }> {
    const baseDir: string | undefined = this.configService.get<string>(`${type}_FILE_PATH`);

    if(!baseDir){
      this.logger.error(
        'displayService :: wrong file type',
        { type }
      );
      throw new InternalServerErrorException();
    }

    const imagePath: string = path.join(baseDir, imageName);

    await fsPromises.access(imagePath, fs.constants.F_OK)
      .catch(() => {
        this.logger.warn('displayService :: file not found', { imageName });
        throw new NotFoundException();
      });

    // jpeg 고정이지만 추후 확장을 위해 우선 체크.
    const { ext } = getBaseNameAndExt(imageName);
    const contentType: string = this.getContentType(ext.toLowerCase());

    return {
      path: imagePath,
      contentType
    }
  }

  private getContentType(ext: string): string {
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
    };

    return mimeMap[ext] || 'application/octet-stream';
  }
}