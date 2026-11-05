/**
 * Testa todas as APIs contra um PostgreSQL real, já migrado.
 * Use um banco de TESTE: os dados criados aqui são removidos ao final
 * (cada usuário é apagado via DELETE /api/users/me), mas não use produção.
 *
 *   DB_HOST=... DB_NAME=jobhunter_test JWT_SECRET=x npm run test:e2e
 */
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { Resume } from '../src/resumes/resume.entity.js';
import { configureApp } from '../src/setup.js';

const PDF = Buffer.from('%PDF-1.4\n% teste\n');

const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 1)]);
const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64, 2)]);

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
      settings: { minMatch: number; updatedAt: string | null };
      password: string;
    };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** O upload agora vai para o n8n; para testar as demais rotas, grava o currículo direto no banco/disco. */
  async function seedResume(userId: string, originalName: string, isPrimary: boolean) {
    const storageKey = `${userId}/${randomUUID()}.pdf`;
    await mkdir(join(uploadDir, userId), { recursive: true });
    await writeFile(join(uploadDir, storageKey), PDF);
    const repo = app.get(DataSource).getRepository(Resume);
    return repo.save(
      repo.create({ userId, storageKey, originalName, mimeType: 'application/pdf', sizeBytes: PDF.length, isPrimary }),
    );
  }

  function mockN8n(response: Response | Error) {
    return vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  }

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'jobhunter-e2e-'));
    process.env.UPLOAD_DIR = uploadDir;
    process.env.JWT_SECRET ??= 'e2e-secret';
    process.env.N8N_ATS_WEBHOOK_URL = 'http://n8n.test/webhook/ats-check';
    process.env.INTERVIEW_AUDIO_DIR = join(uploadDir, 'entrevistas');
    delete process.env.N8N_INTERVIEW_WEBHOOK_URL;

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
      const { user, accessToken, settings } = await register();
      expect(accessToken).toEqual(expect.any(String));
      // as preferências vêm junto (padrões enquanto não forem salvas)
      expect(settings).toMatchObject({ minMatch: 70, updatedAt: null });
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
      link: 'https://acme.gupy.io/job/123',
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
      const moved = await http().patch(`/api/jobs/${created.body.id}/stage`).set(h).send({ stage: 'applied' }).expect(200);
      expect(moved.body.stage).toBe('applied');

      const applied = await http().get('/api/jobs').query({ stage: 'applied' }).set(h).expect(200);
      expect(applied.body.map((j: { id: string }) => j.id)).toEqual([created.body.id]);

      const stats = await http().get('/api/jobs/stats').set(h).expect(200);
      expect(stats.body).toEqual({
        total: 2,
        averageMatch: 82,
        applied: 1,
        interviews: 0,
        byStage: { found: 1, applied: 1, interview: 0, offer: 0, rejected: 0 },
      });

      await http().get(`/api/jobs/${created.body.id}`).set(h).expect(200);
      await http().delete(`/api/jobs/${created.body.id}`).set(h).expect(204);
      await http().get(`/api/jobs/${created.body.id}`).set(h).expect(404);
    });

    it('valida os dados da vaga', async () => {
      const { accessToken } = await register();
      await http().post('/api/jobs').set(auth(accessToken)).send({ ...job, match: 150 }).expect(400);
      await http().post('/api/jobs').set(auth(accessToken)).send({ ...job, workMode: 'Remoto' }).expect(400);
      await http().post('/api/jobs').set(auth(accessToken)).send({ ...job, link: 'javascript:alert(1)' }).expect(400);
      await http().patch(`/api/jobs/${randomUUID()}`).set(auth(accessToken)).send({ stage: 'hired' }).expect(400);
      await http().patch(`/api/jobs/${randomUUID()}/stage`).set(auth(accessToken)).send({ stage: 'hired' }).expect(400);
      await http().patch(`/api/jobs/${randomUUID()}/stage`).set(auth(accessToken)).send({}).expect(400);
      await http().patch(`/api/jobs/${randomUUID()}/stage`).set(auth(accessToken)).send({ stage: 'offer' }).expect(404);
      await http().get('/api/jobs/nao-e-uuid').set(auth(accessToken)).expect(400);
    });

    it('um usuário não acessa as vagas de outro', async () => {
      const alice = await register();
      const bob = await register();
      const created = await http().post('/api/jobs').set(auth(alice.accessToken)).send(job).expect(201);

      await http().get(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).expect(404);
      await http().patch(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).send({ stage: 'offer' }).expect(404);
      await http().patch(`/api/jobs/${created.body.id}/stage`).set(auth(bob.accessToken)).send({ stage: 'offer' }).expect(404);
      await http().delete(`/api/jobs/${created.body.id}`).set(auth(bob.accessToken)).expect(404);
      const bobList = await http().get('/api/jobs').set(auth(bob.accessToken)).expect(200);
      expect(bobList.body).toEqual([]);
    });
  });

  describe('interviews', () => {
    const job = { company: 'Acme Pay', role: 'Frontend', location: 'São Paulo, SP', workMode: 'remote', match: 90, tags: ['React'] };
    afterEach(() => {
      vi.restoreAllMocks();
      delete process.env.N8N_INTERVIEW_WEBHOOK_URL;
    });

    async function startInterview() {
      const { accessToken, user } = await register();
      const h = auth(accessToken);
      const created = await http().post('/api/jobs').set(h).send(job).expect(201);
      const interview = await http().post('/api/interviews').set(h).send({ jobId: created.body.id }).expect(201);
      expect(interview.body).toMatchObject({ jobId: created.body.id, status: 'in_progress', answers: [] });
      return { h, user, interviewId: interview.body.id as string };
    }

    const answer = (h: Record<string, string>, id: string, index: number, audio: Buffer, name = 'resposta.webm') =>
      http()
        .post(`/api/interviews/${id}/answers`)
        .set(h)
        .field('questionIndex', String(index))
        .field('question', `Pergunta ${index + 1}?`)
        .field('durationMs', '4200')
        .attach('file', audio, name);

    it('grava os áudios na pasta, finaliza e deixa o envio pendente sem webhook configurado', async () => {
      const { h, user, interviewId } = await startInterview();
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      const saved = await answer(h, interviewId, 0, WEBM).expect(201);
      expect(saved.body).toMatchObject({ questionIndex: 0, question: 'Pergunta 1?', mimeType: 'audio/webm', durationMs: 4200 });
      await answer(h, interviewId, 1, WEBM).expect(201);
      // regravar a pergunta 2 em outro formato substitui o arquivo anterior
      await answer(h, interviewId, 1, OGG, 'r.ogg').expect(201);

      const folder = join(uploadDir, 'entrevistas', user.id, interviewId);
      expect((await readdir(folder)).sort()).toEqual(['00.webm', '01.ogg']);

      const finished = await http().post(`/api/interviews/${interviewId}/finish`).set(h).expect(200);
      expect(finished.body).toMatchObject({ status: 'finished', delivery: 'pending', sentAt: null });
      expect(finished.body.answers.map((a: { mimeType: string }) => a.mimeType)).toEqual(['audio/webm', 'audio/ogg']);
      expect(fetchMock).not.toHaveBeenCalled();

      // finalizada não aceita mais respostas
      await answer(h, interviewId, 2, WEBM).expect(409);
    });

    it('envia os áudios ao n8n em multipart e permite reenviar após falha', async () => {
      const { h, user, interviewId } = await startInterview();
      await answer(h, interviewId, 0, WEBM).expect(201);
      await answer(h, interviewId, 1, OGG, 'r.ogg').expect(201);
      process.env.N8N_INTERVIEW_WEBHOOK_URL = 'http://n8n.test/webhook/interview';

      mockN8n(new Response('boom', { status: 500 }));
      const failed = await http().post(`/api/interviews/${interviewId}/finish`).set(h).expect(200);
      expect(failed.body).toMatchObject({ status: 'finished', delivery: 'failed' });

      vi.restoreAllMocks();
      const fetchMock = mockN8n(Response.json({ ok: true }));
      const sent = await http().post(`/api/interviews/${interviewId}/finish`).set(h).expect(200);
      expect(sent.body).toMatchObject({ status: 'sent', delivery: 'sent' });
      expect(sent.body.sentAt).toEqual(expect.any(String));

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://n8n.test/webhook/interview');
      const form = init.body as FormData;
      expect(form.get('interviewId')).toBe(interviewId);
      expect(form.get('userId')).toBe(user.id);
      expect(JSON.parse(form.get('job') as string)).toMatchObject({ company: 'Acme Pay', role: 'Frontend' });
      expect(JSON.parse(form.get('answers') as string)).toEqual([
        { field: 'audio_0', questionIndex: 0, question: 'Pergunta 1?', durationMs: 4200, mimeType: 'audio/webm' },
        { field: 'audio_1', questionIndex: 1, question: 'Pergunta 2?', durationMs: 4200, mimeType: 'audio/ogg' },
      ]);
      const audio0 = form.get('audio_0') as File;
      expect(audio0.name).toBe('pergunta-01.webm');
      expect(Buffer.from(await audio0.arrayBuffer()).equals(WEBM)).toBe(true);
      expect((form.get('audio_1') as File).name).toBe('pergunta-02.ogg');

      // já enviada: não envia de novo
      await http().post(`/api/interviews/${interviewId}/finish`).set(h).expect(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('valida áudio, vaga e dono da entrevista', async () => {
      const { h, interviewId } = await startInterview();
      await http().post('/api/interviews').set(h).send({ jobId: randomUUID() }).expect(404);
      await http().post(`/api/interviews/${interviewId}/finish`).set(h).expect(400); // sem respostas
      await answer(h, interviewId, 0, PDF, 'falso.webm').expect(400);
      await http()
        .post(`/api/interviews/${interviewId}/answers`)
        .set(h)
        .field('questionIndex', '0')
        .field('question', 'x')
        .field('durationMs', '1')
        .expect(400); // sem arquivo
      await answer(h, interviewId, 0, Buffer.concat([WEBM, Buffer.alloc(5 * 1024 * 1024)])).expect(413);

      const other = await register();
      await http().get(`/api/interviews/${interviewId}`).set(auth(other.accessToken)).expect(404);
      await answer(auth(other.accessToken), interviewId, 0, WEBM).expect(404);
    });
  });

  describe('resumes', () => {
    afterEach(() => vi.restoreAllMocks());

    it('upload envia o arquivo em multipart/form-data para o webhook do n8n e devolve a resposta dele', async () => {
      const { accessToken, user } = await register();
      const fetchMock = mockN8n(Response.json({ score: 87 }));

      const res = await http()
        .post('/api/resumes')
        .set(auth(accessToken))
        .attach('file', PDF, 'currículo-frontend.pdf')
        .expect(201);
      expect(res.body).toEqual({ score: 87 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(process.env.N8N_ATS_WEBHOOK_URL);
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      const sent = form.get('data') as File;
      expect(sent.name).toBe('currículo-frontend.pdf');
      expect(sent.type).toBe('application/pdf');
      expect(sent.size).toBe(PDF.length);
      expect(Buffer.from(await sent.arrayBuffer()).equals(PDF)).toBe(true);
      expect(form.get('userId')).toBe(user.id);
      expect([...form.keys()].sort()).toEqual(['data', 'userId']);

      // nada é gravado no banco
      const list = await http().get('/api/resumes').set(auth(accessToken)).expect(200);
      expect(list.body).toEqual([]);
    });

    it('retorna 502 quando o n8n está fora do ar ou responde erro', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);
      mockN8n(new TypeError('fetch failed'));
      await http().post('/api/resumes').set(h).attach('file', PDF, 'cv.pdf').expect(502);
      mockN8n(new Response('boom', { status: 500 }));
      await http().post('/api/resumes').set(h).attach('file', PDF, 'cv.pdf').expect(502);
    });

    it('rejeita arquivos inválidos sem chamar o n8n', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);
      const fetchMock = mockN8n(Response.json({}));
      await http().post('/api/resumes').set(h).expect(400); // sem arquivo
      await http().post('/api/resumes').set(h).attach('file', PDF, 'foto.png').expect(400);
      await http().post('/api/resumes').set(h).attach('file', Buffer.from('MZ...'), 'falso.pdf').expect(400);
      await http()
        .post('/api/resumes')
        .set(h)
        .attach('file', Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]), 'grande.pdf')
        .expect(413);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('troca de principal, download e remoção', async () => {
      const { accessToken, user } = await register();
      const h = auth(accessToken);
      const first = await seedResume(user.id, 'currículo-frontend.pdf', true);
      const second = await seedResume(user.id, 'backend.pdf', false);

      await http().patch(`/api/resumes/${second.id}/primary`).set(h).expect(200);
      const list = await http().get('/api/resumes').set(h).expect(200);
      expect(list.body.map((r: { id: string; isPrimary: boolean }) => [r.id, r.isPrimary])).toEqual([
        [second.id, true],
        [first.id, false],
      ]);
      expect(list.body[0]).not.toHaveProperty('storageKey');

      const file = await http()
        .get(`/api/resumes/${first.id}/download`)
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
      await http().delete(`/api/resumes/${second.id}`).set(h).expect(204);
      const after = await http().get(`/api/resumes/${first.id}`).set(h).expect(200);
      expect(after.body.isPrimary).toBe(true);
    });

    it('um usuário não acessa os currículos de outro', async () => {
      const alice = await register();
      const bob = await register();
      const resume = await seedResume(alice.user.id, 'cv.pdf', true);
      await http().get(`/api/resumes/${resume.id}/download`).set(auth(bob.accessToken)).expect(404);
      await http().delete(`/api/resumes/${resume.id}`).set(auth(bob.accessToken)).expect(404);
    });
  });

  describe('settings', () => {
    const valid = {
      minMatch: 80,
      keywords: [' React ', 'react', 'Node.js'],
      excludedKeywords: ['PHP'],
      seniority: ['mid', 'senior'],
      workModes: ['remote'],
      locations: ['São Paulo, SP'],
      minSalary: 9000,
      maxJobAgeDays: 7,
      notifyNewJobs: false,
      weeklySummary: true,
    };

    it('retorna os padrões, salva e devolve as preferências', async () => {
      const { accessToken } = await register();
      const h = auth(accessToken);

      const defaults = await http().get('/api/settings').set(h).expect(200);
      expect(defaults.body).toMatchObject({ minMatch: 70, workModes: ['remote', 'hybrid', 'onsite'], updatedAt: null });

      const saved = await http().put('/api/settings').set(h).send(valid).expect(200);
      expect(saved.body).toMatchObject({ ...valid, keywords: ['React', 'Node.js'] });
      expect(saved.body.updatedAt).not.toBeNull();

      await http().put('/api/settings').set(h).send({ ...valid, minMatch: 55 }).expect(200);
      const again = await http().get('/api/settings').set(h).expect(200);
      expect(again.body.minMatch).toBe(55);
    });

    it('valida as preferências', async () => {
      const h = auth((await register()).accessToken);
      await http().put('/api/settings').set(h).send({ ...valid, minMatch: 101 }).expect(400);
      await http().put('/api/settings').set(h).send({ ...valid, workModes: [] }).expect(400);
      await http().put('/api/settings').set(h).send({ ...valid, maxJobAgeDays: 10 }).expect(400);
      await http().put('/api/settings').set(h).send({ ...valid, seniority: ['ceo'] }).expect(400);
      const { minMatch: _omit, ...partial } = valid;
      await http().put('/api/settings').set(h).send(partial).expect(400);
    });

    it('filtra as vagas pela compatibilidade mínima', async () => {
      const h = auth((await register()).accessToken);
      const job = { company: 'Acme', role: 'Dev', location: 'Remoto', workMode: 'remote' };
      await http().post('/api/jobs').set(h).send({ ...job, match: 60 }).expect(201);
      await http().post('/api/jobs').set(h).send({ ...job, match: 90 }).expect(201);
      const res = await http().get('/api/jobs?minMatch=75').set(h).expect(200);
      expect(res.body.map((j: { match: number }) => j.match)).toEqual([90]);
    });
  });

  it('excluir a conta invalida o token e remove os dados e a pasta de currículos', async () => {
    const { accessToken, user } = await register();
    const h = auth(accessToken);
    await seedResume(user.id, 'cv.pdf', true);
    const userFolder = join(uploadDir, user.id);
    expect(await readdir(userFolder)).toHaveLength(1);

    await http().delete('/api/users/me').set(h).expect(204);
    await http().get('/api/users/me').set(h).expect(401);
    await expect(readdir(userFolder)).rejects.toThrow();
  });
});
