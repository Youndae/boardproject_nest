import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter } from '#common/filters/exceptions.filter';
import { LoggerService } from '#config/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  initializeTransactionalContext();

  //  winston을 사용하기 때문에 Nest 기본 Logger false
  const app = await NestFactory.create(AppModule, { logger: false });

  // 전역 prefix 사용시
  // const globalPrefix = 'api';
  // app.setGlobalPrefix(globalPrefix);

  // swagger config builder
  const swaggerConfig = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API Document Description')
    .setVersion('1.0')
    // 보안 스키마 추가
    // .addBearerAuth(
    //   { type: 'http', scheme: 'bearer', bearerFormat: 'JWT'},
    //   'access-token',
    // )
    .build();

  // 문서 생성
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfig,
    {
      deepScanRoutes: true,
      // include를 통해 원하는 Module Controller만 문서화 가능
      // include: [MemberModule, BoardModule],
    }
  );

  // Swagger UI 경로 설정. /docs
  SwaggerModule.setup(
    'docs',
    app,
    swaggerDocument,
    {
      swaggerOptions: {
        // persistAuthorization: true,
      }
    }
  )

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
