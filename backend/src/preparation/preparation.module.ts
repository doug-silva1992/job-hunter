import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity.js';
import { PreparationController } from './preparation.controller.js';
import { Preparation } from './preparation.entity.js';
import { PreparationService } from './preparation.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Preparation])],
  controllers: [PreparationController],
  providers: [PreparationService],
})
export class PreparationModule {}
