import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createHttpServer } from '@main/http/server';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import type { NutritionLabelResult } from '@infra/ai/gateways/NutritionLabelAIGateway';

async function main() {
  const mealsDirectory = await mkdtemp(path.join(tmpdir(), 'foodiary-meals-test-'));
  const photosDirectory = await mkdtemp(path.join(tmpdir(), 'foodiary-profile-photos-test-'));
  process.env.LOCAL_MEALS_DIR = mealsDirectory;
  process.env.LOCAL_PROFILE_PHOTOS_DIR = photosDirectory;
  const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0xff, 0xd9]);
  let nextLabelResult: NutritionLabelResult = {
    name: 'Iogurte natural', quantity: '170 g', basis: 'Porção do rótulo',
    calories: 120, proteins: 8, carbohydrates: 12, fats: 4,
  };
  const server = createHttpServer({
    scanNutritionLabel: async bytes => {
      assert.deepEqual(bytes, photo);
      return nextLabelResult;
    },
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const email = `http-check-${Date.now()}@example.test`;
  const otherEmail = `http-check-other-${Date.now()}@example.test`;
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

    for (const invalidBirthDate of ['0000-01-01', '2099-01-01']) {
      const badBirthDateSignup = await request('/auth/sign-up', json('POST', {
        account: { email, password },
        profile: {
          name: 'HTTP Test',
          birthDate: invalidBirthDate,
          gender: 'FEMALE',
          goal: 'MAINTAIN',
          height: 170,
          weight: 65,
          activityLevel: 'LIGHT',
        },
      }));
      assert.equal(badBirthDateSignup.status, 400);
    }

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

    const photoForm = () => {
      const form = new FormData();
      form.append('file', new Blob([photo], { type: 'image/jpeg' }), 'profile.jpeg');
      return form;
    };
    assert.equal((await request('/nutrition-label/scan', { method: 'POST', body: photoForm() })).status, 401);
    const scan = await request('/nutrition-label/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: photoForm(),
    });
    assert.equal(scan.status, 200, await scan.clone().text());
    assert.deepEqual(await scan.json(), {
      name: 'Iogurte natural', quantity: '170 g', basis: 'Porção do rótulo',
      calories: 120, proteins: 8, carbohydrates: 12, fats: 4,
    });
    nextLabelResult = {
      name: null, quantity: null, basis: null, calories: null,
      proteins: null, carbohydrates: null, fats: null,
    };
    const unreadableScan = await request('/nutrition-label/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: photoForm(),
    });
    assert.equal(unreadableScan.status, 400);
    const invalidForm = new FormData();
    invalidForm.append('file', new Blob(['invalid'], { type: 'text/plain' }), 'invalid.txt');
    const invalidScan = await request('/nutrition-label/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: invalidForm,
    });
    assert.equal(invalidScan.status, 400);
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

    const truncatedMultipart = Buffer.from(
      '--boundary\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n\xff\xd8\xff',
      'binary',
    );
    const truncatedPhotoUpload = await request('/profile-photo', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${signupTokens.accessToken}`,
        'Content-Type': 'multipart/form-data; boundary=boundary',
      },
      body: truncatedMultipart,
    });
    assert.equal(truncatedPhotoUpload.status, 400);
    assert.equal((await request('/health')).status, 200);

    const exact10MiBPhoto = Buffer.alloc(10 * 1024 * 1024, 0);
    exact10MiBPhoto[0] = 0xff;
    exact10MiBPhoto[1] = 0xd8;
    exact10MiBPhoto[2] = 0xff;
    const exact10MiBForm = new FormData();
    exact10MiBForm.append('file', new Blob([exact10MiBPhoto], { type: 'image/jpeg' }), 'exact10m.jpeg');
    const exact10MiBUpload = await request('/profile-photo', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: exact10MiBForm,
    });
    assert.equal(exact10MiBUpload.status, 200, await exact10MiBUpload.clone().text());

    const over10MiBPhoto = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    over10MiBPhoto[0] = 0xff;
    over10MiBPhoto[1] = 0xd8;
    over10MiBPhoto[2] = 0xff;
    const over10MiBForm = new FormData();
    over10MiBForm.append('file', new Blob([over10MiBPhoto], { type: 'image/jpeg' }), 'over10m.jpeg');
    const over10MiBUpload = await request('/profile-photo', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: over10MiBForm,
    });
    assert.equal(over10MiBUpload.status, 400);

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
    assert.equal((await request('/profiles', json('PUT', {
      name: 'Invalid', birthDate: '0000-01-01', gender: 'FEMALE', height: 171, weight: 66,
    }, signupTokens.accessToken))).status, 400);
    assert.equal((await request('/profiles', json('PUT', {
      name: 'Invalid', birthDate: '2099-01-01', gender: 'FEMALE', height: 171, weight: 66,
    }, signupTokens.accessToken))).status, 400);
    assert.equal((await request('/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signupTokens.accessToken}`,
      },
      body: '{"name":"Teste","birthDate":"1990-01-01","gender":"MALE","height":1e400,"weight":80}',
    })).status, 400);

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
    assert.equal((await request('/goals', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signupTokens.accessToken}`,
      },
      body: '{"calories":1e400,"proteins":150,"carbohydrates":200,"fats":60}',
    })).status, 400);

    const updatedMe = await request('/me', { headers: { Authorization: `Bearer ${signupTokens.accessToken}` } });
    const updatedAccount = await updatedMe.json();
    assert.equal(updatedAccount.profile.name, 'Updated');
    assert.equal(Number.isFinite(updatedAccount.profile.height), true);
    assert.equal(Number.isFinite(updatedAccount.profile.weight), true);
    assert.equal(new URL(updatedAccount.profile.photoUrl, base).pathname,
      new URL(secondPhotoUrl, base).pathname);
    assert.equal(updatedAccount.goal.calories, 2100);
    assert.equal(Number.isFinite(updatedAccount.goal.calories), true);

    const meals = await request('/meals?date=2026-10-09', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(meals.status, 200);
    assert.deepEqual((await meals.json()).meals, []);
    assert.equal((await request('/meals/history')).status, 401);
    const historyHeaders = { Authorization: `Bearer ${signupTokens.accessToken}` };
    const emptyHistory = await request('/meals/history', { headers: historyHeaders });
    assert.equal(emptyHistory.status, 200);
    assert.deepEqual(await emptyHistory.json(), { meals: [], nextCursor: null });
    for (const query of ['limit=0', 'limit=51', 'limit=1.5', 'cursor=invalid']) {
      assert.equal((await request(`/meals/history?${query}`, { headers: historyHeaders })).status, 400);
    }
    const invalidYearCursor = Buffer.from(JSON.stringify({ createdAt: '0000-01-01T00:00:00Z', id: 'a' })).toString('base64url');
    assert.equal((await request(`/meals/history?cursor=${invalidYearCursor}`, { headers: historyHeaders })).status, 400);
    const weekPath = '/meals/weekly-summary?startDate=2026-10-05&timezoneOffsetMinutes=180';
    assert.equal((await request(weekPath)).status, 401);
    assert.equal((await request('/meals/weekly-summary?startDate=2026-10-06', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 400);
    const emptyWeek = await request(weekPath, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(emptyWeek.status, 200);
    const emptySummary = await emptyWeek.json();
    assert.equal(emptySummary.recordedDays, 0);
    assert.equal(emptySummary.averages, null);
    assert.equal(emptySummary.days.length, 7);
    assert.equal(emptySummary.days[0].totals, null);

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
    const truncatedMealUpload = await request(upload.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signupTokens.accessToken}`,
        'Content-Type': 'multipart/form-data; boundary=boundary',
      },
      body: truncatedMultipart,
    });
    assert.equal(truncatedMealUpload.status, 400);
    assert.equal((await request('/health')).status, 200);
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
    const mealEdit = {
      name: 'Almoço corrigido',
      foods: [{ name: 'Arroz', quantity: '100 g', proteins: 3, carbohydrates: 28, fats: 1 }],
    };
    assert.equal((await request(`/meals/${mealId}`, json('PATCH', mealEdit, signupTokens.accessToken))).status, 400);
    assert.equal((await request(`/meals/${mealId}/repeat`, json('POST', mealEdit, signupTokens.accessToken))).status, 400);
    assert.equal((await request(`/meals/${mealId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 400);
    assert.ok(meal.inputFileURL.startsWith('/meal-files/'));
    const fileResponse = await request(meal.inputFileURL);
    assert.equal(fileResponse.status, 200);
    assert.equal(fileResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await fileResponse.arrayBuffer()), picture);
    assert.equal((await request(meal.inputFileURL.replace(/signature=[a-f0-9]+/, 'signature=deadbeef'))).status, 404);

    await pool.query(
      'UPDATE meals SET status = $3, created_at = $2 WHERE id = $1',
      [mealId, new Date('2026-10-10T02:30:00.000Z'), 'SUCCESS'],
    );
    assert.equal((await request(`/meals/${mealId}`, json('PATCH', mealEdit))).status, 401);
    assert.equal((await request(`/meals/${mealId}`, json('PATCH', {
      ...mealEdit, foods: [{ ...mealEdit.foods[0], proteins: -1 }],
    }, signupTokens.accessToken))).status, 400);
    assert.equal((await request(`/meals/${mealId}`, json('PATCH', mealEdit, signupTokens.accessToken))).status, 204);
    const corrected = await request(`/meals/${mealId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(corrected.status, 200);
    const correctedMeal = (await corrected.json()).meal;
    assert.equal(correctedMeal.name, 'Almoço corrigido');
    assert.equal(correctedMeal.foods[0].calories, 133);
    assert.equal((await request(`/meals/${mealId}/repeat`, json('POST', mealEdit))).status, 401);
    assert.equal((await request(`/meals/${mealId}/repeat`, json('POST', {
      ...mealEdit, foods: [],
    }, signupTokens.accessToken))).status, 400);
    const otherSignup = await request('/auth/sign-up', json('POST', {
      account: { email: otherEmail, password },
      profile: {
        name: 'Other User', birthDate: '2000-01-01', gender: 'FEMALE',
        goal: 'MAINTAIN', height: 170, weight: 65, activityLevel: 'LIGHT',
      },
    }));
    assert.equal(otherSignup.status, 201);
    const otherTokens = await otherSignup.json();
    assert.equal((await request(`/meals/${mealId}`, json('PATCH', mealEdit, otherTokens.accessToken))).status, 404);
    assert.equal((await request(`/meals/${mealId}/repeat`, json('POST', mealEdit, otherTokens.accessToken))).status, 404);
    assert.equal((await request(`/meals/${mealId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    })).status, 404);
    const localDay = await request('/meals?date=2026-10-09&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(localDay.status, 200);
    assert.equal((await localDay.json()).meals.length, 1);
    const utcDay = await request('/meals?date=2026-10-09', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal((await utcDay.json()).meals.length, 0);
    const ownerId = (await pool.query<{ id: string }>('SELECT id FROM accounts WHERE email = $1', [email])).rows[0].id;
    await pool.query(
      `INSERT INTO meals (id, account_id, status, input_type, input_file_key, name, foods, created_at)
       VALUES ($1, $2, 'SUCCESS', 'MANUAL', NULL, 'Zero', $3::jsonb, $4)`,
      [`${mealId}zero`, ownerId, JSON.stringify([{ name: 'Zero', quantity: '1', calories: 0, proteins: 0, carbohydrates: 0, fats: 0 }]), new Date('2026-10-10T12:00:00.000Z')],
    );
    const week = await request(weekPath, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(week.status, 200);
    const summary = await week.json();
    assert.equal(summary.recordedDays, 2);
    assert.equal(summary.days.find((day: { date: string }) => day.date === '2026-10-09').totals.calories, 133);
    assert.equal(summary.days.find((day: { date: string }) => day.date === '2026-10-10').totals.calories, 0);
    assert.equal(summary.days.find((day: { date: string }) => day.date === '2026-10-08').totals, null);
    assert.equal(summary.averages.calories, 67);
    const otherWeek = await request(weekPath, {
      headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    });
    assert.equal((await otherWeek.json()).recordedDays, 0);
    const manualPayload = {
      date: '2025-01-15', timezoneOffsetMinutes: 180,
      name: 'Lanche manual',
      foods: [{ name: 'Banana', quantity: '1 unidade', proteins: 1, carbohydrates: 22, fats: 0.2 }],
    };
    assert.equal((await request('/meals/manual', json('POST', manualPayload))).status, 401);
    assert.equal((await request('/meals/manual', json('POST', {
      ...manualPayload, date: '2099-01-01',
    }, signupTokens.accessToken))).status, 400);
    assert.equal((await request('/meals/manual', json('POST', {
      ...manualPayload, foods: [{ ...manualPayload.foods[0], fats: -1 }],
    }, signupTokens.accessToken))).status, 400);
    const manualResponse = await request('/meals/manual', json('POST', manualPayload, signupTokens.accessToken));
    assert.equal(manualResponse.status, 201, await manualResponse.clone().text());
    const { mealId: manualId } = await manualResponse.json();
    const manualDetail = await request(`/meals/${manualId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    const manualMeal = (await manualDetail.json()).meal;
    assert.equal(manualMeal.inputType, 'MANUAL');
    assert.equal(manualMeal.status, 'SUCCESS');
    assert.equal(manualMeal.inputFileURL, null);
    assert.equal(manualMeal.foods[0].calories, 94);
    const manualDay = await request('/meals?date=2025-01-15&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal((await manualDay.json()).meals.some((item: { id: string }) => item.id === manualId), true);
    const otherManualDay = await request('/meals?date=2025-01-15&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    });
    assert.equal((await otherManualDay.json()).meals.length, 0);

    // Tied timestamps and sub-millisecond precision must survive pagination.
    for (const suffix of ['A', 'B', 'C', 'Queued']) {
      await pool.query(
        `INSERT INTO meals (id, account_id, status, input_type, input_file_key, name, foods, created_at)
         VALUES ($1, $2, $3, 'MANUAL', NULL, 'Histórico', '[]', '2024-01-01T12:00:00.123456Z')`,
        [`${mealId}history${suffix}`, ownerId, suffix === 'Queued' ? 'QUEUED' : 'SUCCESS'],
      );
    }
    const expectedHistory = await pool.query<{ id: string }>(
      'SELECT id FROM meals WHERE account_id = $1 AND status = $2 ORDER BY created_at DESC, id DESC',
      [ownerId, 'SUCCESS'],
    );
    const seenIds: string[] = [];
    let historyCursor: string | null = null;
    do {
      const pageResponse = await request(`/meals/history?limit=1${historyCursor ? `&cursor=${encodeURIComponent(historyCursor)}` : ''}`, {
        headers: historyHeaders,
      });
      assert.equal(pageResponse.status, 200, await pageResponse.clone().text());
      const page = await pageResponse.json();
      assert.equal(page.meals.length, 1);
      assert.ok(Array.isArray(page.meals[0].foods));
      seenIds.push(page.meals[0].id);
      historyCursor = page.nextCursor;
      assert.ok(seenIds.length <= expectedHistory.rowCount!);
    } while (historyCursor);
    assert.deepEqual(seenIds, expectedHistory.rows.map(row => row.id));
    const otherHistory = await request('/meals/history', {
      headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    });
    assert.deepEqual(await otherHistory.json(), { meals: [], nextCursor: null });

    assert.equal((await request('/saved-foods')).status, 401);
    const savedFood = manualPayload.foods[0];
    const saveFood = await request('/saved-foods', json('PUT', savedFood, signupTokens.accessToken));
    assert.equal(saveFood.status, 200, await saveFood.clone().text());
    const { id: savedFoodId } = await saveFood.json();
    const replaceFood = await request('/saved-foods', json('PUT', {
      ...savedFood, proteins: 2,
    }, signupTokens.accessToken));
    assert.equal((await replaceFood.json()).id, savedFoodId);
    const savedList = await request('/saved-foods', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    const savedFoods = (await savedList.json()).foods;
    assert.equal(savedFoods.length, 1);
    assert.equal(savedFoods[0].proteins, 2);
    const otherSavedList = await request('/saved-foods', {
      headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    });
    assert.deepEqual((await otherSavedList.json()).foods, []);
    assert.equal((await request(`/saved-foods/${savedFoodId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${otherTokens.accessToken}` },
    })).status, 404);
    assert.equal((await request(`/saved-foods/${savedFoodId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 204);
    assert.deepEqual((await (await request('/saved-foods', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).json()).foods, []);
    const repeatedResponse = await request(`/meals/${mealId}/repeat`, json('POST', {
      name: 'Almoço de hoje',
      foods: [{ name: 'Arroz', quantity: '150 g', proteins: 4.5, carbohydrates: 42, fats: 1.5 }],
    }, signupTokens.accessToken));
    assert.equal(repeatedResponse.status, 201, await repeatedResponse.clone().text());
    const { mealId: repeatedId } = await repeatedResponse.json();
    assert.notEqual(repeatedId, mealId);
    const repeatedDetail = await request(`/meals/${repeatedId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(repeatedDetail.status, 200);
    const repeatedMeal = (await repeatedDetail.json()).meal;
    assert.equal(repeatedMeal.status, 'SUCCESS');
    assert.equal(repeatedMeal.inputType, 'MANUAL');
    assert.equal(repeatedMeal.inputFileURL, null);
    assert.equal(repeatedMeal.foods[0].calories, 200);
    assert.equal((await request(`/meals/${repeatedId}/repeat`, json('POST', mealEdit, otherTokens.accessToken))).status, 404);
    const repeatedDay = await request(`/meals?date=${new Date().toISOString().slice(0, 10)}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal((await repeatedDay.json()).meals.some((item: { id: string }) => item.id === repeatedId), true);
    assert.equal((await request(`/meals/${mealId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 204);
    assert.equal((await request(`/meals/${mealId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 404);
    assert.equal((await request(meal.inputFileURL)).status, 404);
    const deletedFileKey = new URL(meal.inputFileURL, base).pathname.replace('/meal-files/', '');
    await new LocalMealsFileStorageGateway().write(deletedFileKey, picture);
    assert.equal((await request(meal.inputFileURL)).status, 404);
    const afterDelete = await request('/meals?date=2026-10-09&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal((await afterDelete.json()).meals.some((item: { id: string }) => item.id === mealId), false);
    const historyAfterDelete = await request('/meals/history', { headers: historyHeaders });
    assert.equal((await historyAfterDelete.json()).meals.some((item: { id: string }) => item.id === mealId), false);
    assert.equal((await request(`/meals/${mealId}/repeat`, json('POST', mealEdit, signupTokens.accessToken))).status, 404);
    const independentCopy = await request(`/meals/${repeatedId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(independentCopy.status, 200);
    assert.equal((await independentCopy.json()).meal.foods[0].quantity, '150 g');
    assert.equal((await request(`/meals/${repeatedId}`, json('PATCH', mealEdit, signupTokens.accessToken))).status, 204);
    assert.equal((await request(`/meals/${repeatedId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 204);
    assert.equal((await request(`/meals/${repeatedId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 404);

    assert.equal((await request('/meals', json('POST', {
      file: { type: 'audio/webm;codecs=opus', size: 4 },
      date: '2099-01-01',
      timezoneOffsetMinutes: 180,
    }, signupTokens.accessToken))).status, 400);

    const webmBytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
    const webmCreated = await request('/meals', json('POST', {
      file: { type: 'audio/webm;codecs=opus', size: webmBytes.length },
      date: '2025-01-15',
      timezoneOffsetMinutes: 180,
    }, signupTokens.accessToken));
    assert.equal(webmCreated.status, 201, await webmCreated.clone().text());
    const { mealId: webmMealId, uploadSignature: webmSignature } = await webmCreated.json();
    const webmUpload = JSON.parse(Buffer.from(webmSignature, 'base64').toString('utf8'));
    const webmForm = new FormData();
    webmForm.append('file', new Blob([webmBytes], { type: 'audio/webm;codecs=opus' }), 'audio.webm');
    const webmUploaded = await request(webmUpload.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
      body: webmForm,
    });
    assert.equal(webmUploaded.status, 204, await webmUploaded.clone().text());
    const webmDetail = await request(`/meals/${webmMealId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(webmDetail.status, 200);
    const { meal: webmMeal } = await webmDetail.json();
    assert.ok(new URL(webmMeal.inputFileURL, base).pathname.endsWith('.webm'));
    const webmFileResponse = await request(webmMeal.inputFileURL);
    assert.equal(webmFileResponse.status, 200);
    assert.equal(webmFileResponse.headers.get('content-type'), 'audio/webm');
    assert.deepEqual(Buffer.from(await webmFileResponse.arrayBuffer()), webmBytes);
    await pool.query('UPDATE meals SET status = $2 WHERE id = $1', [webmMealId, 'SUCCESS']);
    const webmDay = await request('/meals?date=2025-01-15&timezoneOffsetMinutes=180', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(webmDay.status, 200);
    assert.equal((await webmDay.json()).meals.some((item: { id: string }) => item.id === webmMealId), true);

    await pool.query('UPDATE meals SET status = $2 WHERE id = $1', [webmMealId, 'PROCESSING']);
    assert.equal((await request(`/meals/${webmMealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 400);

    await pool.query('UPDATE meals SET status = $2 WHERE id = $1', [webmMealId, 'FAILED']);
    assert.equal((await request(`/meals/${webmMealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 204);
    assert.equal((await request(webmMeal.inputFileURL)).status, 404);

    const uploadingMealResponse = await request('/meals', json('POST', {
      file: { type: 'image/jpeg', size: picture.length },
    }, signupTokens.accessToken));
    assert.equal(uploadingMealResponse.status, 201);
    const { mealId: uploadingMealId } = await uploadingMealResponse.json();
    assert.equal((await request(`/meals/${uploadingMealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 204);
    assert.equal((await request(`/meals/${uploadingMealId}`, {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).status, 404);

    console.log('Local HTTP routes, authentication, meals, weekly summary, manual meals, saved foods, nutrition label scan, profile photo, and signed file access: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE email = $1', [email]);
    await pool.query('DELETE FROM accounts WHERE email = $1', [otherEmail]);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
    await rm(mealsDirectory, { recursive: true, force: true });
    await rm(photosDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
   
  console.error(error);
  process.exitCode = 1;
});
