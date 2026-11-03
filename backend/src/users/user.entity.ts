import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Espelha a migration CreateUsers para o TypeORM não tentar removê-los num `migration:generate`.
@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_username_lower', { synchronize: false }) // índice em lower(username)
@Check('CHK_users_email_lowercase', `"email" = lower("email")`)
@Check('CHK_users_username_format', `"username" ~ '^[a-zA-Z0-9._-]{3,30}$'`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Nunca é carregado por padrão; use `addSelect` quando precisar. */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
