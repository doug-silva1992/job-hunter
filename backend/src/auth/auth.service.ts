import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../common/password.js';
import { SettingsResponseDto } from '../settings/dto/settings.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto, LoginDto, RegisterDto } from './dto/auth.dto.js';
import type { JwtPayload } from './jwt-auth.guard.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly settings: SettingsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.users.create(dto);
    return this.session(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    // compara mesmo quando o e-mail não existe, para não revelar isso pelo tempo de resposta
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha inválidos.');
    return this.session(user);
  }

  /** Token + usuário + preferências, para o frontend já montar a tela configurada. */
  private async session(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id };
    const [accessToken, { settings, saved }] = await Promise.all([
      this.jwt.signAsync(payload),
      this.settings.get(user.id),
    ]);
    return {
      accessToken,
      user: UserResponseDto.from(user),
      settings: SettingsResponseDto.from(settings, saved),
    };
  }
}
