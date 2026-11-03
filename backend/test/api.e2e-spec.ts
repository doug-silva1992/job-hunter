/**
 * Testa todas as APIs contra um PostgreSQL real, já migrado.
 * Use um banco de TESTE: os dados criados aqui são removidos ao final
 * (cada usuário é apagado via DELETE /api/users/me), mas não use produção.
 *
 *   DB_HOST=... DB_NAME=jobhunter_test JWT_SECRET=x npm run test:e2e
 */
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup.js';

const PDF = Buffer.from('%PDF-1.4\n% teste\n');

describe('Job Hunter API (e2e)', () => {
  let app: INestApplication<App>;
  let uploadDir: string;
  let http: () => ReturnType<typeof request>;
  const tokens: string[] = [];

  async function register(overrides: Record<string, string> = {}) {
    const suffix = randomUUID().slice(0, 8);
    const body = { username: `user_${suffix}`, email: `User.${suffix}@Exemplo.com`, password: '123456', ...overrides };
    const res = await http().post('/api/auth/register').send(body).expect(201);
    tokens.push(res.body.accessToken);
    return { ...res.body, password: body.password } as {
      accessToken: string;
      user: { id: string; username: string; email: string };
      password: string;
    };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'jobhunter-e2e-'));
    process.env.UPLOAD_DIR = uploadDir;
    process.env.JWT_SECRET ??= 'e2e-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    // apaga os usuários criados (cascata remove currículos e vagas)
    for (const token of tokens) {
      await http().delete('/api/users/me').set(auth(token));
    }
    await app?.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  describe('auth & users', () => {
    it('rotas públicas não exigem token; as demais sim', async () => {
      await http().get('/api/health').expect(200, { status: 'ok' });
      await http().get('/api/users/me').expect(401);
      await http().get('/api/jobs').set(auth('token-invalido')).expect(401);
    });

    it('registra normalizando o e-mail e retorna token', async () => {
      const { user, accessToken } = await register();
      expect(accessToken).toEqual(expect.any(String));
      expect(user.email).toBe(user.email.toLowerCase());
      expect(user).not.toHaveProperty('passwordHash');

      const me = await http().get('/api/users/me').set(auth(accessToken)).expect(200);
      expect(me.body).toMatchObject({ id: user.id, username: user.username, email: user.email });
    });

    it('valida os campos do registro', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ username: 'a b', email: 'nao-e-email', password: '123' })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/nome de usuário/), 'Informe um e-mail válido.', expect.stringMatching(/senha/)]),
      );
      await http()
        .post('/api/auth/register')
        .send({ username: 'valido', email: 'a@b.com', password: '123456', admin: true })
        .expect(400); // campo extra é rejeitado
    });

    it('impede e-mail e nome de usuário duplicados (sem diferenciar maiúsculas)', async () => {
      const { user } = await register();
      await http()
        .post('/api/auth/register')
        .send({ username: `x${randomUUID().slice(0, 6)}`, email: user.email.toUpperCase(), password: '123456' })
        .expect(409);
      await http()
        .post('/api/auth/register')
        .send({ username: user.username.toUpperCase(), email: `${randomUUID()}@exemplo.com`, password: '123456' })
        .expect(409);
    });

    it('faz login e rejeita credenciais inválidas com a mesma mensagem', async () => {
      const { user, password } = await register();
      const ok = await http().post('/api/auth/login').send({ email: ` ${user.email.toUpperCase()} `, password }).expect(200);
      expect(ok.body.user.id).toBe(user.id);

      const wrongPass = await http().post('/api/auth/login').send({ email: user.email, password: 'errada' }).expect(401);
      const noUser = await http().post('/api/auth/login').send({ email: 'ninguem@exemplo.com', password }).expect(401);
      expect(wrongPass.body.message).toBe(noUser.body.message);
    });

    it('atualiza o perfil exigindo a senha atual para e-mail/senha', async () => {
      const { accessToken, user } = await register();
      const newName = `novo_${randomUUID().slice(0, 6)}`;
      const res = await http().patch('/api/users/me').set(auth(accessToken)).send({ username: newName }).expect(200);
      expect(res.body.username).toBe(newName);

      await http().patch('/api/users/me').set(auth(accessToken)).send({ newPassword: 'nova-senha' }).expect(400);
      await http()
        .patch('/api/users/me')
        .set(auth(accessToken))
        .send({ newPassword: 'nova-senha', currentPassword: 'errada' })
        .expect(401);
      await http()
        .patch('/api/users/me')
        .set(auth(accessToken))
        .send({ newPassword: 'nova-senha', currentPassword: '123456' })
        .expect(200);
      await http().post('/api/auth/login').send({ email: user.email, password: 'nova-senha' }).expect(200);
    });
  });

  describe('jobs', () => {
    const job = {
      company: 'Acme Pay',
      role: 'Senior Frontend Engineer',
      location: 'São Paulo, SP',
      workMode: 'remote',
      match: 94,
      tags: ['React', 'TypeScript', 'React'],
      postedAt: '2026-11-03T12:00:00.000Z',
    };

    it('CRUD completo, ordenação, busca, filtro e estatísticas', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);

      const created = await http().post('/api/jobs').set(h).send(job).expect(201);
      expect(created.body).toMatchObject({ ...job, tags: ['React', 'TypeScript'], stage: 'found' });

      await http()
        .post('/api/jobs')
        .set(h)
        .send({ ...job, company: 'Kappa Bank', role: 'Backend NestJS', match: 70, tags: ['NestJS'], workMode: 'hybrid' })
        .expect(201);

      const list = await http().get('/api/jobs').set(h).expect(200);
      expect(list.body.map((j: { match: number }) => j.match)).toEqual([94, 70]);

      const search = await http().get('/api/jobs').query({ search: 'nestjs' }).set(h).expect(200);
      expect(search.body).toHaveLength(1);
      expect(search.body[0].company).toBe('Kappa Bank');

      // "Aplicar" = mover para a coluna Candidatado
      const moved = await http().patch(`/api/jobs/${created.body.id}`).set(h).send({ stage: 'applied' }).expect(200);
      expect(moved.body.stage).toBe('applied');

      const applied = await http().get('/api/jobs').query({ stage: 'applied' }).set(h).expect(200);
      expect(applied.body.map((j: { id: string }) => j.id)).toEqual([created.body.id]);

      const stats = await http().get('/api/jobs/stats').set(h).expect(200);
      expect(stats.body).toEqual({
        total: 2,
        averageMatch: 82,
        applied: 1,
        interviews: 0,
        byStage: { found: 1, applied: 1, interview: 0, offer: 0 },
      });

      await http().get(`/api/jobs/${created.body.id}`).set(h).expect(200);
      await http().delete(`/api/jobs/${created.body.id}`).set(h).expect(204);
      await http().get(`/api/jobs/${created.body.id}`).set(h).expect(404);
    });

    it('valida os dados da vaga', async () => {
      const { accessToken } = await register();
      await http().post('/api/jobs').set(auth(accessToken)).send({ ...job, match: 150 }).expect(400);
      await http().post('/api/jobs').set(auth(accessToken)).send({ ...job, workMode: 'Remoto' }).expect(400);
      await http().patch(`/api/jobs/${randomUUID()}`).set(auth(accessToken)).send({ stage: 'hired' }).expect(400);
      await http().get('/api/jobs/nao-e-uuid').set(auth(accessToken)).expect(400);
    });

    it('um usuário não acessa as vagas de outro', async () => {
      const alice = await register();
      const bob = await register();
      const created = await http().post('/api/jobs').set(auth(alice.accessToken)).send(job).expect(201);

      await http().get(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).expect(404);
      await http().patch(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).send({ stage: 'offer' }).expect(404);
      await http().delete(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).expect(404);
      const bobList = await http().get('/api/jobs').set(auth(bob.accessToken)).expect(200);
      expect(bobList.body).toEqual([]);
    });
  });

  describe('resumes', () => {
    it('upload, principal automático, troca de principal, download e remoção', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);

      const first = await http().post('/api/resumes').set(h).attach('file', PDF, 'currículo-frontend.pdf').expect(201);
      expect(first.body).toMatchObject({ originalName: 'currículo-frontend.pdf', mimeType: 'application/pdf', isPrimary: true });
      expect(first.body).not.toHaveProperty('storageKey');

      const second = await http().post('/api/resumes').set(h).attach('file', PDF, 'backend.pdf').expect(201);
      expect(second.body.isPrimary).toBe(false);

      await http().patch(`/api/resumes/${second.body.id}/primary`).set(h).expect(200);
      const list = await http().get('/api/resumes').set(h).expect(200);
      expect(list.body.map((r: { id: string; isPrimary: boolean }) => [r.id, r.isPrimary])).toEqual([
        [second.body.id, true],
        [first.body.id, false],
      ]);

      const file = await http()
        .get(`/api/resumes/${first.body.id}/download`)
        .set(h)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(file.headers['content-type']).toContain('application/pdf');
      expect(file.headers['content-disposition']).toContain("filename*=UTF-8''curr%C3%ADculo-frontend.pdf");
      expect(Buffer.compare(file.body as Buffer, PDF)).toBe(0);

      // remover o principal promove o mais recente restante
      await http().delete(`/api/resumes/${second.body.id}`).set(h).expect(204);
      const after = await http().get(`/api/resumes/${first.body.id}`).set(h).expect(200);
      expect(after.body.isPrimary).toBe(true);
    });

    it('rejeita arquivos inválidos', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);
      await http().post('/api/resumes').set(h).expect(400); // sem arquivo
      await http().post('/api/resumes').set(h).attach('file', PDF, 'foto.png').expect(400);
      await http().post('/api/resumes').set(h).attach('file', Buffer.from('MZ...'), 'falso.pdf').expect(400);
      await http()
        .post('/api/resumes')
        .set(h)
        .attach('file', Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]), 'grande.pdf')
        .expect(413);
    });

    it('um usuário não acessa os currículos de outro', async () => {
      const alice = await register();
      const bob = await register();
      const up = await http().post('/api/resumes').set(auth(alice.accessToken)).attach('file', PDF, 'cv.pdf').expect(201);
      await http().get(`/api/resumes/${up.body.id}/download`).set(auth(bob.accessToken)).expect(404);
      await http().delete(`/api/resumes/${up.body.id}`).set(auth(bob.accessToken)).expect(404);
    });
  });

  it('excluir a conta invalida o token e remove os dados e a pasta de currículos', async () => {
    const { accessToken, user } = await register();
    const h = auth(accessToken);
    await http().post('/api/resumes').set(h).attach('file', PDF, 'cv.pdf').expect(201);
    const userFolder = join(uploadDir, user.id);
    expect(await readdir(userFolder)).toHaveLength(1);

    await http().delete('/api/users/me').set(h).expect(204);
    await http().get('/api/users/me').set(h).expect(401);
    await expect(readdir(userFolder)).rejects.toThrow();
  });
});
