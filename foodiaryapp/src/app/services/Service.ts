import axios, { InternalAxiosRequestConfig, isAxiosError } from 'axios';
import base64 from 'react-native-base64';

import { env } from '@app/config/env';

export abstract class Service {
  private static accessToken: string | undefined;

  private static refreshTokenInterceptorId: number | undefined;

  private static refreshPromise: Promise<void> | undefined;

  protected static client = axios.create({
    baseURL: env.api.url,
  });

  static setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    this.client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  }

  static removeAccessToken() {
    this.accessToken = undefined;
    this.client.defaults.headers.common.Authorization = undefined;
  }

  static removeRefreshTokenHandler() {
    if (this.refreshTokenInterceptorId !== undefined) {
      this.client.interceptors.response.eject(this.refreshTokenInterceptorId);
      this.refreshTokenInterceptorId = undefined;
    }
    this.refreshPromise = undefined;
  }

  static setRefreshTokenHandler(refreshHandler: () => Promise<void>) {
    this.removeRefreshTokenHandler();

    this.refreshTokenInterceptorId = this.client.interceptors.response.use(
      response => response,
      async (error) => {
        const request = error.config as (InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean }) | undefined;
        if (
          !isAxiosError(error)
          || error.response?.status !== 401
          || !request
          || request._retriedAfterRefresh
          || request.url?.startsWith('/auth/')
        ) {
          return Promise.reject(error);
        }

        request._retriedAfterRefresh = true;
        const refresh = this.refreshPromise ?? refreshHandler();
        this.refreshPromise = refresh;
        try {
          await refresh;
        } finally {
          if (this.refreshPromise === refresh) {
            this.refreshPromise = undefined;
          }
        }

        if (!this.accessToken) {
          return Promise.reject(error);
        }
        request.headers.set('Authorization', `Bearer ${this.accessToken}`);
        return this.client(request);
      },
    );
  }

  static async uploadPresignedPOST({
    uploadSignature,
    file,
  }: Service.UploadPresignedPOSTParams) {
    const decodedSignature = base64.decode(uploadSignature);
    const { url, fields } = JSON.parse(decodedSignature) as Service.DecodedUploadSignature;
    const form = new FormData();

    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }

    form.append('file', file as any);

    const uploadClient = url.startsWith('/') ? this.client : axios;
    await uploadClient.post(url, form, {
      headers: { 'Content-Type': false },
    });
  }
}

export namespace Service {
  export type UploadPresignedPOSTParams = {
    uploadSignature: string;
    file: {
      name: string;
      type: string;
      uri: string;
    };
  };

  export type DecodedUploadSignature = {
    url: string;
    fields: Record<string, string>
  };
}
