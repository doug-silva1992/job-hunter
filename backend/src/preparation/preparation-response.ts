import type { CompanyInfoDto, QuizQuestionDto } from './dto/preparation.dto.js';

/**
 * Lê a resposta do fluxo "Preparatório" do n8n sem confiar no formato: o nó de IA às vezes
 * devolve a resposta dentro de um array, em `output`/`text`, como string ou com cercas ```json.
 */
export function parsePreparation(
  body: unknown,
  companyName: string,
): { empresa: CompanyInfoDto; perguntas: QuizQuestionDto[] } {
  const root = unwrap(body);
  const empresaRaw = asRecord(root?.empresa ?? root?.company);
  const perguntasRaw = root?.perguntas ?? root?.questionario ?? root?.questions;

  const empresa: CompanyInfoDto = {
    nome: text(empresaRaw?.nome) ?? companyName,
    resumo: text(empresaRaw?.resumo ?? empresaRaw?.descricao),
    setor: text(empresaRaw?.setor),
    porte: text(empresaRaw?.porte),
    sede: text(empresaRaw?.sede),
    site: safeUrl(text(empresaRaw?.site)),
    produtos: texts(empresaRaw?.produtos),
    cultura: texts(empresaRaw?.cultura ?? empresaRaw?.valores),
    dicas: texts(empresaRaw?.dicas),
  };

  const perguntas = (Array.isArray(perguntasRaw) ? perguntasRaw : [])
    .map(question)
    .filter((q): q is QuizQuestionDto => q !== null);

  return { empresa, perguntas };
}

type Obj = Record<string, unknown>;

const asRecord = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);

function unwrap(value: unknown, depth = 0): Obj | null {
  if (depth > 4) return null;
  if (Array.isArray(value)) return unwrap(value[0], depth + 1);
  if (typeof value === 'string') {
    const json = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return unwrap(JSON.parse(json) as unknown, depth + 1);
    } catch {
      return null;
    }
  }
  const obj = asRecord(value);
  if (!obj) return null;
  if ('empresa' in obj || 'perguntas' in obj || 'company' in obj || 'questions' in obj) return obj;
  for (const key of ['output', 'text', 'json', 'data', 'body']) {
    if (key in obj) return unwrap(obj[key], depth + 1);
  }
  return obj;
}

function text(v: unknown): string | null {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}

function texts(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\n+/).map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return Array.isArray(v) ? v.map(text).filter((s): s is string => s !== null) : [];
}

function safeUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const LETTERS = 'ABCDEF';

function question(raw: unknown): QuizQuestionDto | null {
  const q = asRecord(raw);
  const pergunta = text(q?.pergunta ?? q?.question);
  const alternativas = texts(q?.alternativas ?? q?.opcoes ?? q?.options).slice(0, 6);
  if (!q || !pergunta || alternativas.length < 2) return null;
  const correta = correctIndex(q.correta ?? q.resposta ?? q.answer, alternativas);
  if (correta === null) return null;
  return { pergunta, alternativas, correta, explicacao: text(q.explicacao ?? q.explanation) };
}

/** Aceita o índice (0-based), a letra ("B", "b)") ou o texto da alternativa correta. */
function correctIndex(v: unknown, options: string[]): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 && v < options.length ? v : null;
  const t = text(v);
  if (!t) return null;
  if (/^\d+$/.test(t)) return correctIndex(Number(t), options);
  const exact = options.findIndex((o) => o.toLowerCase() === t.toLowerCase());
  if (exact >= 0) return exact;
  const letter = /^([a-f])(?:[).:\s-]|$)/i.exec(t);
  const i = letter ? LETTERS.indexOf(letter[1].toUpperCase()) : -1;
  return i >= 0 && i < options.length ? i : null;
}
