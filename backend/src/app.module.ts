import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { dataSourceOptions } from './database/typeorm.config.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ResumesModule } from './resumes/resumes.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      // lê process.env depois que o ConfigModule carregou o .env
      useFactory: () => ({ ...dataSourceOptions(), migrations: [] }),
    }),
    AuthModule,
    UsersModule,
    ResumesModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
