const DEFAULT_API_BASE_URL = 'http://localhost:5001';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const API_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || `${API_BASE_URL}/api`
);
