/**
 * Neural Link API Configuration
 * Automatically switches between local and production endpoints.
 */
export const getApiUrl = (path: string): string => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If it's a relative path and we have a base URL, combine them
  if (base && normalizedPath.startsWith('/api')) {
    return `${base}${normalizedPath}`;
  }
  
  return normalizedPath;
};
