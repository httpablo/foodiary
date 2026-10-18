import { isAxiosError } from 'axios';

export function signInErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'A conexão demorou demais. Tente novamente.';
    }
    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }
    if (error.response.status === 401 && error.config?.url === '/auth/sign-in') {
      return 'E-mail ou senha incorretos. Verifique e tente novamente.';
    }
    if (error.response.status === 429) {
      return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    }
    if (error.response.status >= 500) {
      return 'O servidor está indisponível no momento. Tente novamente em instantes.';
    }
  }

  return 'Não foi possível concluir o acesso. Tente novamente.';
}
