import { useCallback, useState } from 'react';
import { ApiError, api, type EnquiryRequest } from '../api/client';

export type EnquiryState =
  | { status: 'idle' | 'submitting' | 'sent' }
  | { status: 'error'; error: ApiError };

export function useEnquiry() {
  const [state, setState] = useState<EnquiryState>({ status: 'idle' });

  const submit = useCallback(async (enquiry: EnquiryRequest) => {
    setState({ status: 'submitting' });
    try {
      await api.submitEnquiry(enquiry);
      setState({ status: 'sent' });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Something went wrong.'),
      });
    }
  }, []);

  /** Clears a previous error, e.g. when the form is closed. */
  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
