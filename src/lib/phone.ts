// Allow only digits, leading +, spaces, hyphens and parentheses.
// Strips any other characters (letters, punctuation, emoji) as the user types.
export function sanitizePhoneInput(raw: string): string {
  if (!raw) return "";
  // Keep + only if it's the first character
  const hasLeadingPlus = raw.trim().startsWith("+");
  const digitsAndSeparators = raw.replace(/[^\d\s\-()]/g, "");
  return (hasLeadingPlus ? "+" : "") + digitsAndSeparators;
}

// Strict regex used by zod: optional +, then 8–20 digits/spaces/-/()
export const phoneRegex = /^\+?[\d\s\-()]{8,20}$/;
