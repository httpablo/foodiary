const DEFAULT_ERROR_FALLBACK = 'Ocorreu um erro inesperado. Tente novamente.';

export function getErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_ERROR_FALLBACK,
): string {
  const data = (error as {
    response?: {
      data?: {
        error?: unknown;
        message?: unknown;
      };
    };
  })?.response?.data;

  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error.trim();
    }

    if (
      data.error
      && typeof data.error === 'object'
      && 'message' in data.error
      && typeof (data.error as { message?: unknown }).message === 'string'
      && (data.error as { message: string }).message.trim().length > 0
    ) {
      return (data.error as { message: string }).message.trim();
    }

    if (typeof data.message === 'string' && data.message.trim().length > 0) {
      return data.message.trim();
    }
  }

  return fallback;
}
