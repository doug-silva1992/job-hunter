import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import { parsePreparation } from './preparation-response.js';
import { PreparationService } from './preparation.service.js';

const user = { id: 'u1', username: 'douglas', email: 'd@example.com' } as User;
const job = {
  id: 'j1',
  userId: 'u1',
  company: 'Acme',
  role: 'Dev Node',
  location: 'São Paulo',
  workMode: 'remote',
  tags: ['Node', 'NestJS'],
  stage: 'interview',
  link: 'https://acme.com/vaga',
} as unknown as Job;

const answer = {
  empresa: { nome: 'Acme S.A.', resumo: 'Faz foguetes.', site: 'acme.com', produtos: ['Foguetes'], dicas: '- Seja pontual\n- Estude Node' },
  perguntas: [
    { pergunta: 'O que é NestJS?', alternativas: ['Framework Node', 'Banco de dados'], correta: 0, explicacao: 'É um framework.' },
    { pergunta: 'Sem alternativas', alternativas: [], correta: 0 },
  ],
};

describe('PreparationService.generate', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let service: PreparationService;
  let findOneBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findOneBy = vi.fn().mockResolvedValue(job);
    const config = { get: () => undefined };
    service = new PreparationService({ findOneBy } as unknown as Repository<Job>, config as unknown as ConfigService);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('envia a vaga ao n8n e normaliza a resposta', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ output: answer }]), { status: 200 }));

    const result = await service.generate(user, 'j1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5678/webhook-test/preparatorio');
    expect(Object.fromEntries((init.body as FormData).entries())).toEqual({
      user_id: 'u1',
      job_id: 'j1',
      nome: 'douglas',
      empresa: 'Acme',
      cargo: 'Dev Node',
      requisitos: 'Node, NestJS',
      localizacao: 'São Paulo',
      modalidade: 'Remoto',
      link: 'https://acme.com/vaga',
      quantidade: '10',
    });
    expect(result.empresa).toMatchObject({ nome: 'Acme S.A.', site: 'https://acme.com/', dicas: ['Seja pontual', 'Estude Node'] });
    expect(result.perguntas).toEqual([answer.perguntas[0]]);
  });

  it('recusa vaga de outro usuário', async () => {
    findOneBy.mockResolvedValue(null);
    await expect(service.generate(user, 'j1')).rejects.toBeInstanceOf(NotFoundException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('recusa vaga em que o usuário não é candidato', async () => {
    findOneBy.mockResolvedValue({ ...job, stage: 'found' });
    await expect(service.generate(user, 'j1')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha se não vier nenhuma pergunta válida', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ empresa: {}, perguntas: [] }), { status: 200 }));
    await expect(service.generate(user, 'j1')).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('parsePreparation', () => {
  it('lê JSON em string com cercas de código e a resposta por letra ou texto', () => {
    const raw = '```json\n' + JSON.stringify({
      perguntas: [
        { pergunta: 'A?', alternativas: ['x', 'y', 'z'], correta: 'C' },
        { pergunta: 'B?', alternativas: ['x', 'y'], correta: 'y' },
        { pergunta: 'C?', alternativas: ['x', 'y'], correta: 5 },
      ],
    }) + '\n```';
    const { empresa, perguntas } = parsePreparation({ text: raw }, 'Acme');
    expect(empresa.nome).toBe('Acme');
    expect(perguntas.map((p) => p.correta)).toEqual([2, 1]);
  });
});
