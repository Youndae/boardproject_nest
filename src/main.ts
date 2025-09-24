import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter } from '#common/filters/exceptions.filter';
import { LoggerService } from '#config/logger/logger.service';

async function bootstrap() {
  //  winston을 사용하기 때문에 Nest 기본 Logger false
  const app = await NestFactory.create(AppModule, { logger: false });

  // DI로 LoggerService
  const logger = app.get(LoggerService);

  // Global Exception Filter
  app.useGlobalFilters(new ExceptionsFilter(logger));

  app.enableCors();

  await app.listen(process.env.PORT ?? 8080);
  logger.log(`Application is running on : ${await app.getUrl()}`);
}

bootstrap();
