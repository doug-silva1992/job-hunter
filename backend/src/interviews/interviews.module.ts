import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity.js';
import { InterviewReport } from './interview-report.entity.js';
import { TechnicalInterview } from './technical-interview.entity.js';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewReport, TechnicalInterview, Job])],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
