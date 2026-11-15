export const normalizeCanadianPhone = (phone: string) => phone;

export const validateCanadianPhone = (phone: string): string | null => {
  const normalized = normalizeCanadianPhone(phone);
  if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(normalized)) {
    return 'Enter +1 followed by 10 numbers, without spaces or dashes. The following numbers cannot start with 0 or 1.';
  }
  return null;
};
