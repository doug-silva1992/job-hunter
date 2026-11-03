// Mesmas regras usadas no frontend (frontend/src/auth/context.ts).
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
export const USERNAME_MESSAGE =
  'O nome de usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou underline.';
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

export const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

/** Erro 23505 do Postgres: violação de índice único. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const driverError = (error as { driverError?: { code?: string; constraint?: string } })?.driverError;
  return driverError?.code === '23505' && (!constraint || driverError.constraint === constraint);
}
