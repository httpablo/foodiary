import axios, { InternalAxiosRequestConfig, isAxiosError } from 'axios';
import base64 from 'react-native-base64';

import { env } from '@app/config/env';

export abstract class Service {
  private static accessToken: string | undefined;

  private static refreshTokenInterceptorId: number | undefined;

  private static refreshPromise: Promise<void> | undefined;

  private static sessionGeneration = 0;

  protected static client = axios.create({
    baseURL: env.api.url,
  });

  static setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    this.client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  }

  static removeAccessToken() {
    this.sessionGeneration += 1;
    this.accessToken = undefined;
    this.client.defaults.headers.common.Authorization = undefined;
  }

  static removeRefreshTokenHandler() {
    this.sessionGeneration += 1;
    if (this.refreshTokenInterceptorId !== undefined) {
      this.client.interceptors.response.eject(this.refreshTokenInterceptorId);
      this.refreshTokenInterceptorId = undefined;
    }
    this.refreshPromise = undefined;
  }

  static setRefreshTokenHandler(refreshHandler: () => Promise<void>) {
    this.removeRefreshTokenHandler();

    const interceptorId = this.client.interceptors.response.use(
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
        const generationBeforeRefresh = this.sessionGeneration;
        const refresh = this.refreshPromise ?? refreshHandler();
        this.refreshPromise = refresh;
        try {
          await refresh;
        } finally {
          if (this.refreshPromise === refresh) {
            this.refreshPromise = undefined;
          }
        }

        if (
          this.sessionGeneration !== generationBeforeRefresh
          || this.refreshTokenInterceptorId !== interceptorId
          || !this.accessToken
        ) {
          if (this.refreshTokenInterceptorId === undefined && this.accessToken !== undefined) {
            this.removeAccessToken();
          }
          return Promise.reject(error);
        }
        request.headers.set('Authorization', `Bearer ${this.accessToken}`);
        return this.client(request);
      },
    );

    this.refreshTokenInterceptorId = interceptorId;
  }

  protected static dataUriToBlob(dataUri: string, fallbackType: string): Blob {
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Invalid data URI');
    }

    const header = dataUri.slice(5, commaIndex);
    const body = dataUri.slice(commaIndex + 1);
    const parts = header.split(';');
    const mimeType = parts[0] || fallbackType || 'application/octet-stream';
    const isBase64 = parts.includes('base64');

    if (isBase64) {
      const normalizedBase64 = body.replace(/\s+/g, '');
      const binary = base64.decode(normalizedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index) & 0xff;
      }
      return new Blob([bytes], { type: mimeType });
    }

    const decodedText = decodeURIComponent(body);
    return new Blob([decodedText], { type: mimeType });
  }

  protected static async appendFileToFormData(
    form: FormData,
    file: Service.UploadFile,
  ) {
    if (file.blob instanceof Blob) {
      form.append('file', file.blob, file.name);
      return;
    }

    if (file.uri.startsWith('data:')) {
      const blob = this.dataUriToBlob(file.uri, file.type);
      form.append('file', blob, file.name);
      return;
    }

    const isWebRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (
      file.uri.startsWith('blob:')
      || file.uri.startsWith('http://')
      || file.uri.startsWith('https://')
      || (isWebRuntime && !file.uri.startsWith('file:'))
    ) {
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to read file from URI: ${file.uri}`);
      }
      const fetchedBlob = await response.blob();
      const blob = fetchedBlob.type
        ? fetchedBlob
        : new Blob([await fetchedBlob.arrayBuffer()], { type: file.type });
      form.append('file', blob, file.name);
      return;
    }

    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
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

    await this.appendFileToFormData(form, file);

    const uploadClient = url.startsWith('/') ? this.client : axios;
    await uploadClient.post(url, form, {
      headers: { 'Content-Type': false },
    });
  }
}

export namespace Service {
  export type UploadFile = {
    name: string;
    type: string;
    uri: string;
    blob?: Blob;
  };

  export type UploadPresignedPOSTParams = {
    uploadSignature: string;
    file: UploadFile;
  };

  export type DecodedUploadSignature = {
    url: string;
    fields: Record<string, string>;
  };
}
