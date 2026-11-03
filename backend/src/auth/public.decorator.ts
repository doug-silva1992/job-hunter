import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Libera a rota do JWT (por padrão todas as rotas exigem autenticação). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
