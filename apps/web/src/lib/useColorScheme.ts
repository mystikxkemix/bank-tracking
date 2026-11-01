import { useEffect, useState } from 'react';

/** Follows the OS light/dark preference. */
export function useColorScheme(): 'light' | 'dark' {
  const query: string = '(prefers-color-scheme: dark)';
  const [isDark, setIsDark] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media: MediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent): void => setIsDark(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isDark ? 'dark' : 'light';
}
