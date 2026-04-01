import bcrypt from "bcryptjs";

export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordValidationMessage(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!/[a-zA-Z]/.test(password)) {
    return "Include at least one letter.";
  }

  if (!/\d/.test(password)) {
    return "Include at least one number.";
  }

  return null;
}

// bcrypt keeps password verification intentionally slow so leaked hashes are
// much harder to brute-force than a generic digest.
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
