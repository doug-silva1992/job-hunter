import { InternalServerErrorException } from '@nestjs/common';

/** Pergunta como o n8n grava na coluna "questions". */
type StoredQuestion = {
  numero?: unknown;
  tecnologia?: unknown;
  nivel?: unknown;
  pergunta?: unknown;
  alternativas?: unknown;
  resposta_correta?: unknown;
  explicacao?: unknown;
};

export type ExamOption = { letra: string; texto: string };

/** Pergunta como vai para a tela, sem a resposta certa. */
export type ExamQuestion = {
  numero: number;
  tecnologia: string | null;
  nivel: string | null;
  pergunta: string;
  alternativas: ExamOption[];
};

export type GradedQuestion = {
  numero: number;
  resposta: string | null;
  correta: string;
  acertou: boolean;
  explicacao: string | null;
};

type FullQuestion = ExamQuestion & { correta: string; explicacao: string | null };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Lê a coluna "questions" (JSON em texto). */
export function parseQuestions(raw: string): FullQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InternalServerErrorException('As perguntas deste preparatório não estão em JSON válido.');
  }
  if (!Array.isArray(data)) throw new InternalServerErrorException('As perguntas deste preparatório não são uma lista.');

  return (data as StoredQuestion[]).map((q, i) => {
    const alternativas = Object.entries(
      q.alternativas && typeof q.alternativas === 'object' ? (q.alternativas as Record<string, unknown>) : {},
    ).map(([letra, texto]) => ({ letra: letra.trim().toUpperCase(), texto: String(texto) }));
    return {
      numero: typeof q.numero === 'number' ? q.numero : i + 1,
      tecnologia: str(q.tecnologia),
      nivel: str(q.nivel),
      pergunta: str(q.pergunta) ?? '',
      alternativas,
      correta: (str(q.resposta_correta) ?? '').toUpperCase(),
      explicacao: str(q.explicacao),
    };
  });
}

/** Perguntas sem a resposta certa nem a explicação (só aparecem depois de enviar a prova). */
export const toExam = (questions: FullQuestion[]): ExamQuestion[] =>
  questions.map(({ numero, tecnologia, nivel, pergunta, alternativas }) => ({ numero, tecnologia, nivel, pergunta, alternativas }));

/** Corrige a prova: `answers` é { numero: letra }. Nota de 0 a 10, com 2 casas. */
export function grade(
  questions: FullQuestion[],
  answers: Record<string, string>,
): { score: number; acertos: number; total: number; resultado: GradedQuestion[] } {
  const resultado = questions.map((q) => {
    const resposta = str(answers[String(q.numero)])?.toUpperCase() ?? null;
    return { numero: q.numero, resposta, correta: q.correta, acertou: resposta !== null && resposta === q.correta, explicacao: q.explicacao };
  });
  const acertos = resultado.filter((r) => r.acertou).length;
  const total = questions.length;
  const score = total ? Math.round((acertos / total) * 1000) / 100 : 0;
  return { score, acertos, total, resultado };
}

/** Lê a coluna "company" (JSON em texto); se não for JSON, devolve o texto. */
export function parseCompany(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
