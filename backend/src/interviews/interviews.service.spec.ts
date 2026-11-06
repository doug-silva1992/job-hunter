import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { Job } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import type { InterviewReport } from './interview-report.entity.js';
import type { TechnicalInterview } from './technical-interview.entity.js';
import { AUDIO_FIELDS, InterviewsService, type AudioFiles } from './interviews.service.js';

const user = { id: 'u1', username: 'douglas', email: 'd@example.com' } as User;
const job = { id: 'j1', userId: 'u1', role: 'Desenvolvedor C#', company: 'Acme', tags: ['Laravel', 'PHP'] } as Job;
const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)]);
const allFiles = (): AudioFiles =>
  Object.fromEntries(AUDIO_FIELDS.map((f) => [f, [{ buffer: mp3 } as Express.Multer.File]]));

describe('InterviewsService.submit', () => {
  let dir: string;
  let service: InterviewsService;
  let reports: { findOneBy: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  const fetchMock = vi.fn();

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'entrevistas-'));
    const report = { id: 'r1', userId: 'u1' } as InterviewReport;
    reports = {
      findOneBy: vi.fn().mockResolvedValue(report),
      findOne: vi.fn().mockResolvedValue(report),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const jobs = { findOneBy: vi.fn().mockResolvedValue(job) };
    const config = { get: (key: string, fallback?: string) => (key === 'INTERVIEW_AUDIO_DIR' ? dir : fallback) };
    service = new InterviewsService(
      reports as unknown as Repository<InterviewReport>,
      jobs as unknown as Repository<Job>,
      config as unknown as ConfigService,
      {} as Repository<TechnicalInterview>,
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    await rm(dir, { recursive: true, force: true });
  });

  it('envia os campos e áudios do fluxo e guarda os áudios na pasta do relatório', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 'r1' }]), { status: 200 }));

    await service.submit(user, 'j1', allFiles());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5678/webhook-test/interview_training');
    const form = init.body as FormData;
    expect(form.get('cargo')).toBe('Desenvolvedor C#');
    expect(form.get('requisitos')).toBe('Laravel, PHP');
    expect(form.get('nome')).toBe('douglas');
    expect(form.get('email')).toBe('d@example.com');
    expect(form.get('user_id')).toBe('u1');
    expect((form.get('pergunta4') as File).name).toBe('Resposta4.mp3');

    expect((await readdir(join(dir, 'u1', 'r1'))).sort()).toEqual(
      ['resposta-1.mp3', 'resposta-2.mp3', 'resposta-3.mp3', 'resposta-4.mp3'],
    );
    expect(reports.update).toHaveBeenCalledWith({ id: 'r1' }, { jobId: 'j1' });
  });

  it('exige os 4 áudios', async () => {
    const files = allFiles();
    delete files.pergunta3;
    await expect(service.submit(user, 'j1', files)).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia o pedido de entrevista técnica com a descrição digitada', async () => {
    reports.findOne.mockResolvedValue({ id: 'r1', userId: 'u1', jobId: 'j1', cargo: 'Tech Lead', requisitos: 'Java' });
    const answer = { sucesso: true, perguntas: [{ pergunta: 'P1' }] };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(answer), { status: 200 }));

    await expect(service.requestTechnical(user, 'r1', 'Foco em Spring Boot')).resolves.toEqual(answer);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5678/webhook-test/technical_interview');
    const form = init.body as FormData;
    expect(Object.fromEntries(form.entries())).toEqual({
      user_id: 'u1',
      interview_id: 'r1',
      job_id: 'j1',
      nome: 'douglas',
      email: 'd@example.com',
      cargo: 'Tech Lead',
      requisitos: 'Java',
      descricao: 'Foco em Spring Boot',
    });
  });

  it('apaga os áudios salvos se o n8n falhar', async () => {
    fetchMock.mockResolvedValue(new Response('erro', { status: 500 }));
    await expect(service.submit(user, 'j1', allFiles())).rejects.toBeInstanceOf(BadGatewayException);
    expect(await readdir(join(dir, 'u1'))).toEqual([]);
  });
});
