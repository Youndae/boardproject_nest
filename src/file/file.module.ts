import { Global, Module } from '@nestjs/common';
import { FileService } from '#src/file/service/file.service';
import { ResizingService } from '#src/file/service/resizing.service';
import { LoggerModule } from '#config/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [FileService, ResizingService],
  exports: [FileService, ResizingService]
})
export class FileModule {}