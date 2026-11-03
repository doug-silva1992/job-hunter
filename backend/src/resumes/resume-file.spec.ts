import { inspectResumeFile, MAX_RESUME_SIZE, sanitizeFileName } from './resume-file.js';

const pdf = Buffer.from('%PDF-1.7\n...');
const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);

describe('inspectResumeFile', () => {
  it('aceita PDF, DOCX e DOC com assinatura correta', () => {
    expect(inspectResumeFile('cv.pdf', pdf)).toMatchObject({ extension: '.pdf', mimeType: 'application/pdf' });
    expect(inspectResumeFile('CV.DOCX', docx)).toMatchObject({ extension: '.docx' });
    expect(inspectResumeFile('cv.doc', doc)).toMatchObject({ mimeType: 'application/msword' });
  });

  it('rejeita extensão não permitida', () => {
    expect(inspectResumeFile('foto.png', pdf)).toBe('Envie um arquivo PDF, DOC ou DOCX.');
  });

  it('rejeita arquivo com extensão de PDF mas conteúdo diferente', () => {
    expect(inspectResumeFile('falso.pdf', Buffer.from('MZ executável'))).toMatch(/não corresponde a um PDF/);
  });

  it('rejeita arquivo vazio ou maior que 5 MB', () => {
    expect(inspectResumeFile('cv.pdf', Buffer.alloc(0))).toBe('O arquivo está vazio.');
    const big = Buffer.concat([pdf, Buffer.alloc(MAX_RESUME_SIZE)]);
    expect(inspectResumeFile('cv.pdf', big)).toBe('O arquivo passa de 5 MB.');
  });
});

describe('sanitizeFileName', () => {
  it('converte o nome que o multer entrega em latin1 para UTF-8', () => {
    const latin1 = Buffer.from('currículo.pdf', 'utf8').toString('latin1');
    expect(sanitizeFileName(latin1)).toBe('currículo.pdf');
  });

  it('remove diretórios e caracteres de controle', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeFileName('C:\\temp\\cv\u0000.pdf')).toBe('cv.pdf');
  });

  it('limita a 255 caracteres mantendo a extensão', () => {
    const name = sanitizeFileName(`${'a'.repeat(300)}.pdf`);
    expect(name).toHaveLength(255);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});
