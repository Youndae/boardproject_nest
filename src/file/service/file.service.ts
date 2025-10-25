import { Injectable } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { appendSizeSuffix, getBaseNameAndExt } from '#common/utils/file.util';
import { LoggerService } from '#config/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import path from 'path';
import { NotFoundException } from '#common/exceptions/not-found.exception';

@Injectable()
export class FileService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService
  ) {
  }
   async deleteFile(filePath: string) {
     try {
       await fsPromises.unlink(filePath);
     }catch(err) {
       this.logger.error('File deletion error: ', err);
       this.logger.error('failed delete file name : ', filePath);
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

  async getImageDisplayService(imageName: string): Promise<{
    path: string,
    contentType: string
  }> {
    const profilePath: string = this.configService.get<string>('PROFILE_FILE_PATH') ?? '';
    const boardPath: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';

    const profilePrefix = 'profile/';
    const boardPrefix = 'board/';

    let filePrefix: string = '';
    let imagePath: string = '';

    if(imageName.startsWith(profilePrefix)){
      filePrefix = profilePrefix;
      imagePath = profilePath;
    }else if(imageName.startsWith(boardPrefix)){
      filePrefix = boardPrefix;
      imagePath = boardPath;
    }else{
      this.logger.error('display image error. param prefix is wrong. imageName : ', imageName);
      throw new BadRequestException();
    }

    const imageFilename: string = imageName.replace(filePrefix, '');
    const filePath: string = path.join(imagePath, imageFilename);

    await fsPromises.access(filePath, fs.constants.F_OK)
      .catch(() => {
        this.logger.warn('display image error. file not found. imageName : ', imageName);
        throw new NotFoundException();
      });

    const { ext } = getBaseNameAndExt(imageFilename);
    let contentType: string = 'application/octet-stream';

    if(ext === '.png')
      contentType = 'image/png';
    else if(ext === '.jpg' || ext === '.jpeg')
      contentType = 'image/jpeg';
    else if(ext === '.gif')
      contentType = 'image/gif';
    else if(ext === '.bmp')
      contentType = 'image/bmp';
    else if(ext === '.webp')
      contentType = 'image/webp';

    return {
      path: filePath,
      contentType: contentType,
    }
  }
}