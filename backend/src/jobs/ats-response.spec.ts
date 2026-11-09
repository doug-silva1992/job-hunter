import { describe, expect, it } from 'vitest';
import { atsScoreOf, parseAtsResponse } from './jobs.service.js';

describe('parseAtsResponse', () => {
  const ats = { atsScore: 80, classificacao: 'Compatível' };

  it('aceita o objeto direto (em texto ou já parseado)', () => {
    expect(parseAtsResponse(JSON.stringify(ats))).toEqual(ats);
    expect(parseAtsResponse(ats)).toEqual(ats);
  });

  it('aceita lista do "Respond to Webhook"', () => {
    expect(parseAtsResponse(JSON.stringify([ats]))).toEqual(ats);
  });

  it('aceita { output } do AI Agent, inclusive texto com ```json', () => {
    expect(parseAtsResponse({ output: ats })).toEqual(ats);
    expect(parseAtsResponse([{ output: '```json\n' + JSON.stringify(ats) + '\n```' }])).toEqual(ats);
  });

  it('devolve null para texto que não é JSON ou não é objeto', () => {
    expect(parseAtsResponse('ok')).toBeNull();
    expect(parseAtsResponse('42')).toBeNull();
    expect(parseAtsResponse('')).toBeNull();
  });
});

describe('atsScoreOf', () => {
  it('arredonda e limita a 0–100', () => {
    expect(atsScoreOf({ atsScore: 87.6 })).toBe(88);
    expect(atsScoreOf({ atsScore: 140 })).toBe(100);
    expect(atsScoreOf({ atsScore: -3 })).toBe(0);
    expect(atsScoreOf({ atsScore: '72,4' })).toBe(72);
  });

  it('devolve null sem nota válida', () => {
    expect(atsScoreOf({})).toBeNull();
    expect(atsScoreOf({ atsScore: 'alta' })).toBeNull();
  });
});
