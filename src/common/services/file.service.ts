import { Injectable } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import { appendSizeSuffix } from '#common/utils/file.util';
import { LoggerService } from '#config/logger/logger.service';

@Injectable()
export class FileService {
  constructor(
    private readonly logger: LoggerService
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
}