import z from 'zod';

const apiUrl = z.url().parse(process.env.EXPO_PUBLIC_API_URL);

export const env = {
  api: {
    url: apiUrl,
  },
};
