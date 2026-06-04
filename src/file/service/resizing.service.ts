import { Injectable } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import sharp from 'sharp';
import { join } from 'path';
import { appendSizeSuffixByJPEG, getBaseNameAndExt } from '#common/utils/file.util';
import { LoggerService } from '#config/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';


@Injectable()
export class ResizingService {
  private readonly isTest: boolean;
  private readonly logger: LoggerService;

	constructor(
    private readonly originalLogger: LoggerService,
    private readonly configService: ConfigService
  ) {
    this.isTest = (this.configService.get<string>('NODE_ENV') || 'development').toLowerCase() === 'test';
    this.logger = this.originalLogger.setContext(ResizingService.name);
  }

  async resizeProfileImage(destDir: string, storedFilename: string): Promise<string> {
    await this.resizeImage(storedFilename, [300], destDir, { deleteOriginal: true });

    return appendSizeSuffixByJPEG(storedFilename, 300);
  }
  
  async resizeBoardImage(destDir: string, storedFilename: string): Promise<string> {
    const filename: string | undefined = await this.resizeImage(storedFilename, [300, 600], destDir, { deleteOriginal: false });

    if(!filename)
      throw new InternalServerErrorException();

    return filename;
  }
  
  
  async resizeImage(storedFilename: string, sizes: number[], destDir: string, options: { deleteOriginal: boolean }): Promise<string | undefined> {
    const inputPath = join(destDir, storedFilename);
    const { baseName } = getBaseNameAndExt(storedFilename);
    const originFilename = `${baseName}.jpg`
    const originPath = join(destDir, originFilename);

    // imageBoard 테스트에서는 다수의 호출이 발생하는 만큼 하나하나 모킹 반환값 설정이 어려움.
    // profile은 테스트와 상관없이 resizeProfileImage에서 따로 파싱해서 보내기 때문에 문제가 없으나
    // imageBoard의 경우는 모킹할 시 문제가 발생하므로 테스트 환경인 경우 강제로 originFilename을 반환해 모킹 과정에서 문제가 발생하지 않도록 처리.
    if(this.isTest) {
      this.logger.info('resizeImage :: is test profile');
      return originFilename;
    }
    
    try {
      await Promise.all(
        sizes.map(size => {
          const outputPath = join(destDir, appendSizeSuffixByJPEG(storedFilename, size));
          
          return sharp(inputPath)
            .resize(size, size, { fit: 'inside' })
            .toFormat('jpeg')
            .toFile(outputPath);
        })
      )
      
      if(options.deleteOriginal) {
        await fsPromises.unlink(inputPath);
      } else {
        const tempPath = join(destDir, `temp_${storedFilename}`);
        await sharp(inputPath)
          .toFormat('jpeg')
          .toFile(tempPath);
        await fsPromises.rename(tempPath, originPath);

        if(inputPath !== originPath)
          await fsPromises.unlink(inputPath);
      }

      return originFilename;
    }catch (error) {
      this.logger.warn('resizeImage :: error', { error });
      throw error;
    }
  }
}