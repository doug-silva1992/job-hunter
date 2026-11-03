import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@ApiTags('app')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({ description: 'Mensagem de boas-vindas', type: String })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOkResponse({ description: 'Status da API' })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
