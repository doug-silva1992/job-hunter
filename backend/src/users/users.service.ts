import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword, verifyPassword } from '../common/password.js';
import { isUniqueViolation } from '../common/validation.js';
import { ResumesService } from '../resumes/resumes.service.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly resumes: ResumesService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  /** Inclui o hash da senha, que normalmente não é carregado. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(data: { username: string; email: string; password: string }): Promise<User> {
    await this.assertAvailable({ username: data.username, email: data.email });
    const user = this.repo.create({
      username: data.username,
      email: data.email,
      passwordHash: await hashPassword(data.password),
    });
    return this.save(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<User> {
    const user = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOneOrFail();

    const changingEmail = dto.email !== undefined && dto.email !== user.email;
    if (changingEmail || dto.newPassword !== undefined) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Informe a senha atual para alterar e-mail ou senha.');
      }
      if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
    }

    await this.assertAvailable({ username: dto.username, email: changingEmail ? dto.email : undefined }, user.id);

    if (dto.username !== undefined) user.username = dto.username;
    if (changingEmail) user.email = dto.email!;
    if (dto.newPassword !== undefined) user.passwordHash = await hashPassword(dto.newPassword);

    const saved = await this.save(user);
    return (await this.findById(saved.id))!;
  }

  /** Exclui a conta; currículos e vagas saem junto (ON DELETE CASCADE) e os arquivos são apagados do disco. */
  async remove(userId: string): Promise<void> {
    const storageKeys = await this.resumes.storageKeysOf(userId);
    await this.repo.delete({ id: userId });
    await this.resumes.deleteFiles(storageKeys);
  }

  private async assertAvailable(fields: { username?: string; email?: string }, exceptId?: string) {
    if (fields.email) {
      const qb = this.repo.createQueryBuilder('u').where('u.email = :email', { email: fields.email });
      if (exceptId) qb.andWhere('u.id <> :exceptId', { exceptId });
      if (await qb.getExists()) throw new ConflictException('Este e-mail já está cadastrado.');
    }
    if (fields.username) {
      const qb = this.repo
        .createQueryBuilder('u')
        .where('lower(u.username) = lower(:username)', { username: fields.username });
      if (exceptId) qb.andWhere('u.id <> :exceptId', { exceptId });
      if (await qb.getExists()) throw new ConflictException('Este nome de usuário já está em uso.');
    }
  }

  /** Salva tratando a corrida entre a verificação de disponibilidade e o INSERT/UPDATE. */
  private async save(user: User): Promise<User> {
    try {
      return await this.repo.save(user);
    } catch (error) {
      if (isUniqueViolation(error, 'UQ_users_email')) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      if (isUniqueViolation(error, 'UQ_users_username_lower')) {
        throw new ConflictException('Este nome de usuário já está em uso.');
      }
      throw error;
    }
  }
}
