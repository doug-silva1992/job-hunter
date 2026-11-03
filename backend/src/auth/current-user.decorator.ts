import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../users/user.entity.js';

/** Usuário autenticado, carregado pelo JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user,
);
