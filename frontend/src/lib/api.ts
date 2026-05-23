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
  
  // Smart fallback: If we are not on localhost/127.0.0.1, but VITE_API_BASE_URL points to localhost/127.0.0.1,
  // we must ignore it and make a relative request to avoid mixed content or connection failure.
  let useBase = true;
  if (typeof window !== 'undefined' && base) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    if (!isLocalhost) {
      if (base.includes('localhost') || base.includes('127.0.0.1') || base.includes('::1') || base.includes('3000')) {
        useBase = false;
      }
    }
  }

  // If we should use the base URL, combine them
  if (base && useBase) {
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
