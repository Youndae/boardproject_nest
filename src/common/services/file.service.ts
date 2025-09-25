import { Injectable } from '@nestjs/common';
import fs from 'fs';

@Injectable()
export class FileService {
   deleteFile(filePath: string) {
    fs.unlink(filePath, (err) => {
      if(err) console.error('File deletion error: ', err);
    })
  }
}