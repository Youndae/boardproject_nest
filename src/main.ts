import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter } from '#common/filters/exceptions.filter';
import { LoggerService } from '#config/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  //  winston을 사용하기 때문에 Nest 기본 Logger false
  const app = await NestFactory.create(AppModule, { logger: false });

  // DI로 LoggerService
  const logger = app.get(LoggerService);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  // Global Exception Filter
  app.useGlobalFilters(new ExceptionsFilter(logger));

  //Global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  app.enableCors({
	origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 8080);
  logger.info(`Application is running on : ${await app.getUrl()}`);
}

bootstrap();
