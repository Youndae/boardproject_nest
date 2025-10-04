import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '#config/db/typeorm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test'],
    }),
    DatabaseModule
  ],
  exports: [DatabaseModule]
})
export class TestDatabaseModule{}