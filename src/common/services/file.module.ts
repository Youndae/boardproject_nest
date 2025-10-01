import { Global, Module } from '@nestjs/common';
import { FileService } from '#common/services/file.service';
import { ResizingService } from '#common/services/resizing.service';
import { LoggerModule } from '#config/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [FileService, ResizingService],
  exports: [FileService, ResizingService]
})
export class FileModule {}