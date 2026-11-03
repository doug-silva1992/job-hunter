import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import { ResumeResponseDto } from './dto/resume-response.dto.js';
import { MAX_RESUME_SIZE } from './resume-file.js';
import { ResumesService } from './resumes.service.js';

@ApiTags('resumes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Get()
  @ApiOkResponse({ type: [ResumeResponseDto], description: 'Principal primeiro, depois os mais recentes.' })
  async list(@CurrentUser() user: User): Promise<ResumeResponseDto[]> {
    return (await this.resumes.list(user.id)).map(ResumeResponseDto.from);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RESUME_SIZE, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary', description: 'PDF, DOC ou DOCX, até 5 MB.' } },
    },
  })
  @ApiCreatedResponse({ type: ResumeResponseDto })
  @ApiBadRequestResponse({ description: 'Arquivo ausente, vazio ou de tipo inválido.' })
  @ApiPayloadTooLargeResponse({ description: 'Arquivo maior que 5 MB.' })
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ResumeResponseDto> {
    return ResumeResponseDto.from(await this.resumes.upload(user.id, file));
  }

  @Get(':id')
  @ApiOkResponse({ type: ResumeResponseDto })
  @ApiNotFoundResponse()
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeResponseDto> {
    return ResumeResponseDto.from(await this.resumes.findOne(user.id, id));
  }

  @Get(':id/download')
  @ApiProduces('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @ApiOkResponse({ description: 'O arquivo do currículo.' })
  @ApiNotFoundResponse()
  async download(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { resume, stream } = await this.resumes.openFile(user.id, id);
    return new StreamableFile(stream, {
      type: resume.mimeType,
      length: resume.sizeBytes,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(resume.originalName)}`,
    });
  }

  @Patch(':id/primary')
  @ApiOkResponse({ type: ResumeResponseDto, description: 'Define como principal (desmarca o anterior).' })
  @ApiNotFoundResponse()
  async setPrimary(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeResponseDto> {
    return ResumeResponseDto.from(await this.resumes.setPrimary(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Removido. Se era o principal, o mais recente assume.' })
  @ApiNotFoundResponse()
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.resumes.remove(user.id, id);
  }
}
