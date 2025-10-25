import { Controller, Get, Param, Res } from '@nestjs/common';
import { FileService } from '#src/file/service/file.service';
import type { Response } from 'express';
import { LoggerService } from '#config/logger/logger.service';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';

@Controller('/')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly logger: LoggerService
  ) { }

  @Get('display/:imageName')
  async getDisplayImage(
    @Param('imageName') imageName: string,
    @Res() res: Response
  ) {
    try {
      const display = await this.fileService.getImageDisplayService(imageName);

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', display.contentType);

      res.sendFile(display.path, (err) => {
        if(err){
          this.logger.error('file display sendFile error');
          throw new InternalServerErrorException();
        }
      });
    }catch (error) {
      if(!(error instanceof InternalServerErrorException)){
        this.logger.error('file display error.');
        throw new InternalServerErrorException();
      }

      throw error;
    }
  }
}