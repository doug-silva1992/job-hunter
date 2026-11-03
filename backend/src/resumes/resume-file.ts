import { extname } from 'node:path';

export const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB, igual ao frontend

const ALLOWED: Record<string, { mime: string; signature: Buffer }> = {
  '.pdf': { mime: 'application/pdf', signature: Buffer.from('%PDF-') },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP
  },
  '.doc': {
    mime: 'application/msword',
    signature: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE2
  },
};

export type InspectedFile = { extension: string; mimeType: string; originalName: string };

/**
 * Valida o arquivo pela extensão E pelos primeiros bytes (não confia no
 * Content-Type enviado pelo cliente). Retorna a mensagem de erro, se houver.
 */
export function inspectResumeFile(originalName: string, buffer: Buffer): InspectedFile | string {
  const name = sanitizeFileName(originalName);
  const extension = extname(name).toLowerCase();
  const type = ALLOWED[extension];
  if (!type) return 'Envie um arquivo PDF, DOC ou DOCX.';
  if (buffer.length === 0) return 'O arquivo está vazio.';
  if (buffer.length > MAX_RESUME_SIZE) return 'O arquivo passa de 5 MB.';
  if (!buffer.subarray(0, type.signature.length).equals(type.signature)) {
    return `O conteúdo do arquivo não corresponde a um ${extension.slice(1).toUpperCase()} válido.`;
  }
  return { extension, mimeType: type.mime, originalName: name };
}

/**
 * O multer entrega o nome em latin1; converte para UTF-8 (ex.: "currículo.pdf"),
 * remove diretórios e caracteres de controle e limita o tamanho.
 */
export function sanitizeFileName(raw: string): string {
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  const decoded = utf8.includes('�') ? raw : utf8;
  const base = decoded.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'curriculo';
  if (clean.length <= 255) return clean;
  const ext = extname(clean);
  return clean.slice(0, 255 - ext.length) + ext;
}
