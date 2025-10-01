import { Injectable } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
// import { LoggerService } from '#config/logger/logger.service';

@Injectable()
export class FileService {
  constructor(
    // private readonly logger: LoggerService
  ) {
  }
   async deleteFile(filePath: string) {
     try {
       await fsPromises.unlink(filePath);
     }catch(err) {
       console.error('File deletion error: ', err);
     }
  }
}