import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../user.entity.js';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'dougdev' })
  username: string;

  @ApiProperty({ example: 'douglas@exemplo.com' })
  email: string;

  @ApiProperty()
  createdAt: Date;

  static from(user: User): UserResponseDto {
    return { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
  }
}
