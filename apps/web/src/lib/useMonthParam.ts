import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { currentMonthKey, MONTH_KEY_REGEX } from '@bank/shared';

/** Selected month lives in the URL (?month=YYYY-MM) so it survives reloads and is shareable between pages. */
export function useMonthParam(): [string, (month: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw: string | null = searchParams.get('month');
  const month: string = raw && MONTH_KEY_REGEX.test(raw) ? raw : currentMonthKey();

  const setMonth = useCallback(
    (next: string) => {
      setSearchParams((previous: URLSearchParams) => {
        const params: URLSearchParams = new URLSearchParams(previous);
        params.set('month', next);
        return params;
      });
    },
    [setSearchParams],
  );

  return [month, setMonth];
}
