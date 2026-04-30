import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidCep, lookupCep, onlyCepDigits, type CepLookupResult } from '@/lib/cep';

type Status = 'idle' | 'loading' | 'success' | 'not_found' | 'error';

/**
 * Hook que dispara busca de endereço quando o CEP atinge 8 dígitos.
 * Aplica os campos retornados via callback `onResult` (ex.: setState no formulário pai).
 * - Não preenche número nem complemento.
 * - Permite override manual: o callback recebe o resultado, o consumidor decide quais
 *   campos sobrescrever.
 */
export function useCepLookup(
  cep: string,
  onResult: (data: CepLookupResult) => void,
) {
  const [status, setStatus] = useState<Status>('idle');
  const lastQueriedRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const digits = onlyCepDigits(cep);
    if (!isValidCep(digits)) {
      // se voltou a ficar incompleto, reseta status mas sem limpar campos do form
      if (status !== 'idle') setStatus('idle');
      lastQueriedRef.current = '';
      return;
    }
    if (digits === lastQueriedRef.current) return;
    lastQueriedRef.current = digits;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');

    lookupCep(digits, ctrl.signal)
      .then(result => {
        if (ctrl.signal.aborted) return;
        if (result) {
          setStatus('success');
          onResultRef.current(result);
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error');
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  const reset = useCallback(() => {
    setStatus('idle');
    lastQueriedRef.current = '';
  }, []);

  return { status, isLoading: status === 'loading', notFound: status === 'not_found', error: status === 'error', reset };
}