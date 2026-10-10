import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createHttpServer } from '@main/http/server';
import { getPostgresPool } from '@infra/database/postgres/pool';

async function main() {
  const mealsDirectory = await mkdtemp(path.join(tmpdir(), 'foodiary-meals-test-'));
  const photosDirectory = await mkdtemp(path.join(tmpdir(), 'foodiary-profile-photos-test-'));
  process.env.LOCAL_MEALS_DIR = mealsDirectory;
  process.env.LOCAL_PROFILE_PHOTOS_DIR = photosDirectory;
  const server = createHttpServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const email = `http-check-${Date.now()}@example.test`;
  const password = 'http-password-123';
  const pool = getPostgresPool();

  const request = (path: string, options?: RequestInit) => fetch(`${base}${path}`, options);
  const json = (method: string, body: unknown, token?: string): RequestInit => ({
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  try {
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/missing')).status, 404);
    assert.equal((await request('/me')).status, 401);
    assert.equal((await request('/me', { headers: { Authorization: 'Bearer invalid' } })).status, 401);

    const malformed = await request('/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, 'BAD_REQUEST');

    const invalid = await request('/auth/sign-up', json('POST', {}));
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'VALIDATION');

    const signup = await request('/auth/sign-up', json('POST', {
      account: { email, password },
      profile: {
        name: 'HTTP Test',
        birthDate: '2000-01-01',
        gender: 'FEMALE',
        goal: 'MAINTAIN',
        height: 170,
        weight: 65,
        activityLevel: 'LIGHT',
      },
    }));
    assert.equal(signup.status, 201);
    const signupTokens = await signup.json();
    assert.ok(signupTokens.accessToken);
    assert.ok(signupTokens.refreshToken);

    const me = await request('/me', { headers: { Authorization: `Bearer ${signupTokens.accessToken}` } });
    assert.equal(me.status, 200);
    const initialAccount = await me.json();
    assert.equal(initialAccount.profile.name, 'HTTP Test');
    assert.equal(initialAccount.profile.photoUrl, null);

    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0xff, 0xd9]);
    const photoForm = () => {
      const form = new FormData();
      form.append('file', new Blob([photo], { type: 'image/jpeg' }), 'profile.jpeg');
      return form;
    };
    assert.equal((await request('/profile-photo', { method: 'PUT', body: photoForm() })).status, 401);
    const photoUpload = await request('/profile-photo', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: photoForm(),
    });
    assert.equal(photoUpload.status, 200, await photoUpload.clone().text());
    const firstPhotoUrl = (await photoUpload.json()).photoUrl;
    assert.ok(firstPhotoUrl.startsWith('/profile-photos/'));
    assert.deepEqual(Buffer.from(await (await request(firstPhotoUrl)).arrayBuffer()), photo);
    assert.equal((await request(firstPhotoUrl.replace(/signature=[a-f0-9]+/, 'signature=deadbeef'))).status, 404);

    const secondUpload = await request('/profile-photo', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: photoForm(),
    });
    assert.equal(secondUpload.status, 200, await secondUpload.clone().text());
    const secondPhotoUrl = (await secondUpload.json()).photoUrl;
    assert.notEqual(secondPhotoUrl, firstPhotoUrl);
    assert.equal((await request(firstPhotoUrl)).status, 404);
    assert.equal((await request(secondPhotoUrl)).status, 200);
    const meWithPhoto = await request('/me', { headers: { Authorization: `Bearer ${signupTokens.accessToken}` } });
    assert.equal(new URL((await meWithPhoto.json()).profile.photoUrl, base).pathname,
      new URL(secondPhotoUrl, base).pathname);

    const wrongLogin = await request('/auth/sign-in', json('POST', { email, password: 'wrong-password' }));
    assert.equal(wrongLogin.status, 401);

    const signIn = await request('/auth/sign-in', json('POST', { email, password }));
    assert.equal(signIn.status, 200);
    const signInTokens = await signIn.json();

    const refresh = await request('/auth/refresh-token', json('POST', {
      refreshToken: signInTokens.refreshToken,
    }));
    assert.equal(refresh.status, 200);
    const rotatedTokens = await refresh.json();
    assert.notEqual(rotatedTokens.refreshToken, signInTokens.refreshToken);
    assert.equal((await request('/auth/refresh-token', json('POST', {
      refreshToken: signInTokens.refreshToken,
    }))).status, 401);
    assert.equal((await request('/auth/sign-out', json('POST', {}))).status, 400);
    assert.equal((await request('/auth/sign-out', json('POST', {
      refreshToken: rotatedTokens.refreshToken,
    }))).status, 204);
    assert.equal((await request('/auth/refresh-token', json('POST', {
      refreshToken: rotatedTokens.refreshToken,
    }))).status, 401);

    const profile = await request('/profiles', json('PUT', {
      name: 'Updated',
      birthDate: '2000-01-01',
      gender: 'FEMALE',
      height: 171,
      weight: 66,
    }, signupTokens.accessToken));
    assert.equal(profile.status, 204);
    assert.equal((await request('/profiles', json('PUT', {
      name: 'Invalid', birthDate: '2000-01-01', gender: 'FEMALE', height: 0, weight: 66,
    }, signupTokens.accessToken))).status, 400);

    const goal = await request('/goals', json('PUT', {
      calories: 2100,
      proteins: 110,
      carbohydrates: 220,
      fats: 75,
    }, signupTokens.accessToken));
    assert.equal(goal.status, 204);
    assert.equal((await request('/goals', json('PUT', {
      calories: -1, proteins: 110, carbohydrates: 220, fats: 75,
    }, signupTokens.accessToken))).status, 400);

    const updatedMe = await request('/me', { headers: { Authorization: `Bearer ${signupTokens.accessToken}` } });
    const updatedAccount = await updatedMe.json();
    assert.equal(updatedAccount.profile.name, 'Updated');
    assert.equal(new URL(updatedAccount.profile.photoUrl, base).pathname,
      new URL(secondPhotoUrl, base).pathname);
    assert.equal(updatedAccount.goal.calories, 2100);

    const meals = await request('/meals?date=2026-10-09', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(meals.status, 200);
    assert.deepEqual((await meals.json()).meals, []);

    const picture = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0xff, 0xd9]);
    const created = await request('/meals', json('POST', {
      file: { type: 'image/jpeg', size: picture.length },
    }, signupTokens.accessToken));
    assert.equal(created.status, 201);
    const { mealId, uploadSignature } = await created.json();
    const upload = JSON.parse(Buffer.from(uploadSignature, 'base64').toString('utf8'));
    assert.equal(upload.url, `/meal-uploads/${mealId}`);

    const form = new FormData();
    form.append('file', new Blob([picture], { type: 'image/jpeg' }), 'test.jpeg');
    assert.equal((await request(upload.url, { method: 'POST', body: form })).status, 401);
    const uploaded = await request(upload.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: form,
    });
    assert.equal(uploaded.status, 204, await uploaded.text());
    assert.equal((await request(upload.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: form,
    })).status, 404);

    const detailResponse = await request(`/meals/${mealId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(detailResponse.status, 200);
    const { meal } = await detailResponse.json();
    assert.equal(meal.status, 'QUEUED');
    assert.ok(meal.inputFileURL.startsWith('/meal-files/'));
    const fileResponse = await request(meal.inputFileURL);
    assert.equal(fileResponse.status, 200);
    assert.equal(fileResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await fileResponse.arrayBuffer()), picture);
    assert.equal((await request(meal.inputFileURL.replace(/signature=[a-f0-9]+/, 'signature=deadbeef'))).status, 404);

    await pool.query(
      `UPDATE meals SET status = 'SUCCESS', created_at = $2 WHERE id = $1`,
      [mealId, new Date('2026-10-10T02:30:00.000Z')],
    );
    const localDay = await request('/meals?date=2026-10-09&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(localDay.status, 200);
    assert.equal((await localDay.json()).meals.length, 1);
    const utcDay = await request('/meals?date=2026-10-09', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal((await utcDay.json()).meals.length, 0);

    // eslint-disable-next-line no-console
    console.log('Local HTTP routes, authentication, meal upload, profile photo, and signed file access: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE email = $1', [email]);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
    await rm(mealsDirectory, { recursive: true, force: true });
    await rm(photosDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
