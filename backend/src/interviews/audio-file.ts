/** 5 MB: cabe no limite de 6 MB do nginx; o front grava em ~64 kbps (≈10 min). */
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024;

type AudioType = { extension: string; mimeType: string; test: (b: Buffer) => boolean };

const ascii = (b: Buffer, start: number, end: number) => b.subarray(start, end).toString('latin1');

// Formatos do MediaRecorder: Chrome/Edge → WebM, Firefox → Ogg/WebM, Safari → MP4.
const TYPES: AudioType[] = [
  { extension: '.webm', mimeType: 'audio/webm', test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  { extension: '.ogg', mimeType: 'audio/ogg', test: (b) => ascii(b, 0, 4) === 'OggS' },
  { extension: '.m4a', mimeType: 'audio/mp4', test: (b) => ascii(b, 4, 8) === 'ftyp' },
  { extension: '.wav', mimeType: 'audio/wav', test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE' },
  { extension: '.mp3', mimeType: 'audio/mpeg', test: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
];

/** Identifica o formato pelos primeiros bytes (não confia no Content-Type do cliente). Retorna a mensagem de erro, se houver. */
export function inspectAudio(buffer: Buffer): { extension: string; mimeType: string } | string {
  if (buffer.length === 0) return 'O áudio está vazio.';
  if (buffer.length > MAX_AUDIO_SIZE) return 'O áudio passa de 5 MB.';
  const type = TYPES.find((t) => buffer.length >= 12 && t.test(buffer));
  if (!type) return 'Formato de áudio não suportado. Envie WebM, Ogg, MP4, WAV ou MP3.';
  return { extension: type.extension, mimeType: type.mimeType };
}
