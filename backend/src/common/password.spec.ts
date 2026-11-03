import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('gera hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const a = await hashPassword('123456');
    const b = await hashPassword('123456');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
  });

  it('confere a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('segredo-forte');
    expect(await verifyPassword('segredo-forte', hash)).toBe(true);
    expect(await verifyPassword('segredo-errado', hash)).toBe(false);
  });

  it('rejeita hashes em formato desconhecido', async () => {
    expect(await verifyPassword('x', 'md5$abc')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });
});
