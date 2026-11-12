import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { Job } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import { grade, parseQuestions, toExam } from './preparation-exam.js';
import type { Preparation } from './preparation.entity.js';
import { formatTags, PreparationService } from './preparation.service.js';

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

const answer = [{ qualquer: 'formato', vindo: ['do', 'n8n'] }];

describe('PreparationService.generate', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let service: PreparationService;
  let findOneBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findOneBy = vi.fn().mockResolvedValue(job);
    const config = { get: () => undefined };
    service = new PreparationService(
      { findOneBy } as unknown as Repository<Job>,
      config as unknown as ConfigService,
      {} as Repository<Preparation>,
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('envia a vaga ao n8n e devolve a resposta como veio', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(answer), { status: 200 }));

    const result = await service.generate(user, 'j1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5678/webhook/interview-prep');
    expect(Object.fromEntries((init.body as FormData).entries())).toEqual({
      empresa: 'Acme',
      tags: 'Node,NestJS',
      user_id: 'u1',
      job_id: 'j1',
    });
    expect(result).toEqual(answer);
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

  it.each([
    ['empresa vazia', { company: '  ' }],
    ['empresa "Não informado"', { company: 'Não informado' }],
    ['sem tags', { tags: [] }],
    ['tags em branco', { tags: [' '] }],
  ])('recusa vaga com %s', async (_, patch) => {
    findOneBy.mockResolvedValue({ ...job, ...patch });
    await expect(service.generate(user, 'j1')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha se o n8n responder com erro', async () => {
    fetchMock.mockResolvedValue(new Response('erro', { status: 500 }));
    await expect(service.generate(user, 'j1')).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('formatTags', () => {
  it('separa por vírgula e põe entre aspas as tags com espaço', () => {
    expect(formatTags(['.Net', 'C#', 'data science', 'Typescript ', 'ruby/rails', '', 'say "hi"'])).toBe(
      '.Net,C#,"data science","Typescript ",ruby/rails,"say ""hi"""',
    );
  });
});
// formato gravado pelo n8n na coluna "questions"
const stored = JSON.stringify([
  {
    numero: 1,
    tecnologia: 'Banco de Dados SQL',
    nivel: 'intermediário',
    pergunta: 'Qual JOIN retorna só as linhas com correspondência?',
    alternativas: { A: 'LEFT JOIN', B: 'INNER JOIN', C: 'FULL OUTER JOIN', D: 'RIGHT JOIN' },
    resposta_correta: 'B',
    explicacao: 'O INNER JOIN retorna só as correspondências.',
  },
  {
    numero: 2,
    tecnologia: 'Redes',
    nivel: 'intermediário',
    pergunta: 'Qual protocolo traduz nomes de domínio?',
    alternativas: { A: 'DHCP', B: 'SNMP', C: 'DNS', D: 'FTP' },
    resposta_correta: 'C',
    explicacao: 'DNS.',
  },
]);

describe('prova do preparatório', () => {
  it('não manda a resposta certa para a tela', () => {
    const [q] = toExam(parseQuestions(stored));
    expect(q).toEqual({
      numero: 1,
      tecnologia: 'Banco de Dados SQL',
      nivel: 'intermediário',
      pergunta: 'Qual JOIN retorna só as linhas com correspondência?',
      alternativas: [
        { letra: 'A', texto: 'LEFT JOIN' },
        { letra: 'B', texto: 'INNER JOIN' },
        { letra: 'C', texto: 'FULL OUTER JOIN' },
        { letra: 'D', texto: 'RIGHT JOIN' },
      ],
    });
  });

  it('corrige e dá nota de 0 a 10', () => {
    const result = grade(parseQuestions(stored), { '1': 'b', '2': 'A' });
    expect(result).toMatchObject({ score: 5, acertos: 1, total: 2 });
    expect(result.resultado[1]).toEqual({ numero: 2, resposta: 'A', correta: 'C', acertou: false, explicacao: 'DNS.' });
    expect(grade(parseQuestions(stored), {}).score).toBe(0);
  });

  it('grava a nota na coluna score', async () => {
    const prep = { id: 'p1', userId: 'u1', jobId: 'j1', questions: stored } as Preparation;
    const repo = { findOneBy: vi.fn().mockResolvedValue(prep), update: vi.fn().mockResolvedValue(undefined) };
    const service = new PreparationService(
      {} as Repository<Job>,
      { get: () => undefined } as unknown as ConfigService,
      repo as unknown as Repository<Preparation>,
    );

    const result = await service.submitExam('u1', 'j1', 'p1', { '1': 'B', '2': 'C' });

    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'p1', userId: 'u1', jobId: 'j1' });
    expect(repo.update).toHaveBeenCalledWith({ id: 'p1' }, { score: 10 });
    expect(result.score).toBe(10);
  });
});
