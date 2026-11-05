import { inspectAudio, MAX_AUDIO_SIZE } from './audio-file.js';

const pad = (head: Buffer | string) => Buffer.concat([Buffer.from(head as string), Buffer.alloc(32)]);

describe('inspectAudio', () => {
  it.each([
    ['webm', pad(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), '.webm', 'audio/webm'],
    ['ogg', pad('OggS'), '.ogg', 'audio/ogg'],
    ['mp4', pad('\0\0\0\x20ftypM4A '), '.m4a', 'audio/mp4'],
    ['wav', pad('RIFF\0\0\0\0WAVE'), '.wav', 'audio/wav'],
    ['mp3 (ID3)', pad('ID3'), '.mp3', 'audio/mpeg'],
  ])('reconhece %s pelos primeiros bytes', (_, buffer, extension, mimeType) => {
    expect(inspectAudio(buffer)).toEqual({ extension, mimeType });
  });

  it('rejeita vazio, grande demais e formatos desconhecidos', () => {
    expect(inspectAudio(Buffer.alloc(0))).toBe('O áudio está vazio.');
    expect(inspectAudio(Buffer.concat([pad('OggS'), Buffer.alloc(MAX_AUDIO_SIZE)]))).toBe(
      'O áudio passa de 5 MB.',
    );
    expect(inspectAudio(pad('%PDF-1.4'))).toMatch(/não suportado/);
  });
});
