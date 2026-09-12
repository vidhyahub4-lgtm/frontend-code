const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIAL_CHARS = "!@#$%*";
const ALL_CHARS = LETTERS + DIGITS + SPECIAL_CHARS;
const CODE_LENGTH = 8;

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates an 8-character school code with at least one capital letter,
 * one digit, and one special character (!@#$%*) — matching the backend's
 * validation regex exactly:
 * /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%*])[A-Z0-9!@#$%*]{8}$/
 */
export function generateSchoolCode(): string {
  const required = [
    randomChar(LETTERS),
    randomChar(DIGITS),
    randomChar(SPECIAL_CHARS),
  ];
  const rest = Array.from({ length: CODE_LENGTH - required.length }, () =>
    randomChar(ALL_CHARS)
  );

  return shuffle([...required, ...rest]).join("");
}
