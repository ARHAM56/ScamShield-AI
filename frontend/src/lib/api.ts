/**
 * Neural Link API Configuration
 * Automatically switches between local and production endpoints.
 */
export const getApiUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  
  const base = import.meta.env.VITE_API_BASE_URL || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  let finalUrl = normalizedPath;
  // If it's a relative path and we have a base URL, combine them
  if (base) {
    const cleanBase = base.replace(/\/$/, '');
    // If the path starts with /api and the base already contains /api at the end, deduplicate
    if (normalizedPath.startsWith('/api') && cleanBase.endsWith('/api')) {
      finalUrl = `${cleanBase.replace(/\/api$/, '')}${normalizedPath}`;
    } else {
      finalUrl = `${cleanBase}${normalizedPath}`;
    }
  }
  
  return finalUrl;
};
