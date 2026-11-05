import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumesModule } from '../resumes/resumes.module.js';
import { Job } from './job.entity.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job]), ResumesModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
