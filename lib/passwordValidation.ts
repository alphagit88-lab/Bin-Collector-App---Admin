export const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';

export const normalizePassword = (password: string) => password.trim();

export const validatePassword = (password: string): string | null => {
  const normalized = normalizePassword(password);
  if (!normalized) return 'Password cannot be empty or contain only spaces.';
  if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(normalized)) {
    return PASSWORD_REQUIREMENTS;
  }
  return null;
};
