import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { addDays, localDateFromOffset } from '@application/shared/localDate';
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
  const goalEmail = `http-check-goal-${Date.now()}@example.test`;
  const streakEmail = `http-check-streak-${Date.now()}@example.test`;
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

    assert.equal((await request('/weight-logs')).status, 401);
    const weightLogsInitial = await request('/weight-logs', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    assert.equal(weightLogsInitial.status, 200);
    const weightLogsData = await weightLogsInitial.json();
    assert.equal(weightLogsData.currentWeight, 66);
    assert.equal(weightLogsData.logs.length, 1);
    assert.ok(weightLogsData.suggestedGoal.calories > 0);
    assert.equal((await request('/weight-logs', json('POST', {
      weight: 64.5,
      date: '2099-01-01',
    }, signupTokens.accessToken))).status, 400);
    const pastWeightLog = await request('/weight-logs', json('POST', {
      weight: 68,
      date: '2026-01-01',
    }, signupTokens.accessToken));
    assert.equal(pastWeightLog.status, 200);
    const loggedToday = await request('/weight-logs', json('POST', {
      weight: 63.5,
      applySuggestedGoal: true,
    }, signupTokens.accessToken));
    assert.equal(loggedToday.status, 200);
    const loggedTodayBody = await loggedToday.json();
    assert.equal(loggedTodayBody.currentWeight, 63.5);
    assert.deepEqual(loggedTodayBody.currentGoal, loggedTodayBody.suggestedGoal);
    assert.equal(loggedTodayBody.weightGoalAchieved, false);
    const logsAfterRecalc = await (await request('/weight-logs', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    })).json();
    // The start weight is the sign-up weight, not the oldest log of the window.
    assert.equal(logsAfterRecalc.startWeight, 65);
    assert.equal(logsAfterRecalc.weightChange, -1.5);
    assert.equal(logsAfterRecalc.goalSource, 'CALCULATED');
    assert.equal(logsAfterRecalc.shouldSuggestAdjustment, false);
    const meAfterWeightRecalc = await request('/me', {
      headers: { Authorization: `Bearer ${signupTokens.accessToken}` },
    });
    const meAfterWeightRecalcJson = await meAfterWeightRecalc.json();
    assert.equal(meAfterWeightRecalcJson.profile.weight, 63.5);
    assert.equal(meAfterWeightRecalcJson.goal.calories, loggedTodayBody.suggestedGoal.calories);

    // Weight goal flow.
    const goalSignupBody = (targetWeight?: number) => ({
      account: { email: goalEmail, password },
      profile: {
        name: 'Goal User', birthDate: '1990-05-20', gender: 'FEMALE', goal: 'MAINTAIN',
        height: 170, weight: 80, activityLevel: 'ATHLETE',
        ...(targetWeight === undefined ? {} : { targetWeight }),
      },
    });
    for (const badTarget of [40, 80.2, 20, 800]) {
      assert.equal((await request('/auth/sign-up', json('POST', goalSignupBody(badTarget)))).status, 400);
    }
    const goalSignup = await request('/auth/sign-up', json('POST', goalSignupBody(72)));
    assert.equal(goalSignup.status, 201);
    const goalToken = (await goalSignup.json()).accessToken as string;
    const goalAuth = { Authorization: `Bearer ${goalToken}` };
    const getJson = async (path: string) => {
      const response = await request(path, { headers: goalAuth });
      assert.equal(response.status, 200, path);
      return response.json();
    };
    const today = localDateFromOffset(0);

    assert.equal((await request('/weight-goal')).status, 401);
    assert.equal((await request('/weight-goal/preview?targetWeight=70')).status, 401);
    const signupOverview = await getJson('/weight-goal');
    assert.equal(signupOverview.currentWeight, 80);
    assert.equal(signupOverview.trendWeight, 80);
    assert.deepEqual(signupOverview.healthyRange, { min: 53.5, max: 72 });
    assert.equal(signupOverview.weightGoal.status, 'ACTIVE');
    assert.equal(signupOverview.weightGoal.direction, 'LOSE');
    assert.equal(signupOverview.weightGoal.paceKgPerWeek, 0.5);
    assert.equal(signupOverview.weightGoal.startWeight, 80);
    assert.equal(signupOverview.weightGoal.startDate, today);
    assert.equal(signupOverview.weightGoal.achievedAt, null);
    assert.equal(signupOverview.weightGoal.progress.plannedDate, addDays(today, 16 * 7));
    assert.equal(signupOverview.weightGoal.progress.trackStatus, 'NOT_ENOUGH_DATA');
    assert.equal(signupOverview.weightGoal.progress.projectedDate, null);
    assert.equal(signupOverview.weightGoal.progress.weeklyRateKg, null);
    assert.equal(signupOverview.weightGoal.progress.percent, 0);
    assert.equal(signupOverview.weightGoal.progress.remainingKg, 8);
    const signupMe = await getJson('/me');
    assert.equal(signupMe.profile.goal, 'LOSE');

    // Preview.
    assert.equal((await request('/weight-goal/preview?targetWeight=50', { headers: goalAuth })).status, 400);
    assert.equal((await request('/weight-goal/preview?targetWeight=79.8', { headers: goalAuth })).status, 400);
    assert.equal((await request('/weight-goal/preview?targetWeight=abc', { headers: goalAuth })).status, 400);
    assert.equal((await request('/weight-goal/preview', { headers: goalAuth })).status, 400);
    const losePreview = await getJson('/weight-goal/preview?targetWeight=75');
    assert.equal(losePreview.direction, 'LOSE');
    assert.equal(losePreview.currentWeight, 80);
    assert.equal(losePreview.targetBmi, 26);
    assert.deepEqual(losePreview.options.map((option: { key: string }) => option.key), ['RELAXED', 'RECOMMENDED', 'AGGRESSIVE']);
    assert.deepEqual(losePreview.options.map((option: { paceKgPerWeek: number }) => option.paceKgPerWeek), [0.25, 0.5, 0.75]);
    assert.deepEqual(losePreview.options.map((option: { weeks: number }) => option.weeks), [20, 10, 7]);
    assert.equal(losePreview.options[1].estimatedDate, addDays(today, 70));
    assert.ok(losePreview.options[0].dailyGoal.calories > losePreview.options[1].dailyGoal.calories);
    assert.ok(losePreview.options[1].dailyGoal.calories > losePreview.options[2].dailyGoal.calories);
    assert.equal(losePreview.warnings.length, 1);
    assert.equal(losePreview.currentDailyGoal.calories, signupMe.goal.calories);
    const gainPreview = await getJson('/weight-goal/preview?targetWeight=150');
    assert.equal(gainPreview.direction, 'GAIN');
    assert.deepEqual(gainPreview.options.map((option: { paceKgPerWeek: number }) => option.paceKgPerWeek), [0.1, 0.25, 0.4]);
    assert.equal(gainPreview.warnings.length, 2);
    assert.ok(gainPreview.options[2].dailyGoal.calories > gainPreview.options[0].dailyGoal.calories);
    const inRangePreview = await getJson('/weight-goal/preview?targetWeight=70');
    assert.deepEqual(inRangePreview.warnings, []);

    // Set goal.
    for (const invalid of [
      { targetWeight: 70, paceKgPerWeek: 0 },
      { targetWeight: 70, paceKgPerWeek: 0.81 },
      { targetWeight: 50, paceKgPerWeek: 0.5 },
      { targetWeight: 79.9, paceKgPerWeek: 0.5 },
      { targetWeight: 20, paceKgPerWeek: 0.5 },
    ]) {
      assert.equal((await request('/weight-goal', json('PUT', invalid, goalToken))).status, 400);
    }
    assert.equal((await request('/weight-goal', json('PUT', { targetWeight: 70, paceKgPerWeek: 0.5 }))).status, 401);
    const calorieBefore = (await getJson('/me')).goal.calories;
    const noApply = await request('/weight-goal', json('PUT', {
      targetWeight: 75, paceKgPerWeek: 0.25, applyToDailyGoals: false,
    }, goalToken));
    assert.equal(noApply.status, 200);
    assert.equal((await noApply.json()).weightGoal.targetWeight, 75);
    assert.equal((await getJson('/me')).goal.calories, calorieBefore);
    const setGoal = await request('/weight-goal', json('PUT', {
      targetWeight: 70, paceKgPerWeek: 0.75, timezoneOffsetMinutes: 0,
    }, goalToken));
    assert.equal(setGoal.status, 200);
    const setGoalBody = await setGoal.json();
    assert.equal(setGoalBody.weightGoal.targetWeight, 70);
    assert.equal(setGoalBody.weightGoal.paceKgPerWeek, 0.75);
    assert.equal(setGoalBody.weightGoal.progress.plannedDate, addDays(today, 14 * 7));
    const goalOwner = (await pool.query<{ id: string }>('SELECT id FROM accounts WHERE email = $1', [goalEmail])).rows[0].id;
    const goalRows = await pool.query<{ status: string }>(
      'SELECT status FROM weight_goals WHERE account_id = $1 ORDER BY created_at', [goalOwner],
    );
    assert.deepEqual(goalRows.rows.map(row => row.status), ['ABANDONED', 'ABANDONED', 'ACTIVE']);
    const afterSet = await getJson('/me');
    assert.notEqual(afterSet.goal.calories, calorieBefore);
    assert.equal(afterSet.profile.goal, 'LOSE');

    // Progress and projection from logs since the goal started (simulates a goal set 14 days ago).
    await pool.query(
      'UPDATE weight_goals SET start_date = $2::date WHERE account_id = $1 AND status = $3',
      [goalOwner, addDays(today, -14), 'ACTIVE'],
    );
    for (const [daysAgo, weight] of [[14, 80], [7, 79]]) {
      assert.equal((await request('/weight-logs', json('POST', {
        weight, date: addDays(today, -daysAgo),
      }, goalToken))).status, 200);
    }
    const first = await request('/weight-logs', json('POST', { weight: 78 }, goalToken));
    assert.equal((await first.json()).weightGoalAchieved, false);
    const progressOverview = await getJson('/weight-goal');
    assert.equal(progressOverview.currentWeight, 78);
    assert.equal(progressOverview.trendWeight, 78);
    assert.equal(progressOverview.weightGoal.progress.changedKg, 2);
    assert.equal(progressOverview.weightGoal.progress.percent, 20);
    assert.equal(progressOverview.weightGoal.progress.remainingKg, 8);
    assert.equal(progressOverview.weightGoal.progress.weeklyRateKg, 1);
    assert.equal(progressOverview.weightGoal.progress.projectedDate, addDays(today, 56));
    assert.equal(progressOverview.weightGoal.progress.trackStatus, 'AHEAD');

    // Daily goal suggestion uses the weight goal pace and respects the source.
    const goalLogs = await getJson('/weight-logs');
    assert.equal(goalLogs.startWeight, 80);
    assert.equal(goalLogs.weightChange, -2);
    assert.equal(goalLogs.goalSource, 'CALCULATED');
    assert.equal(goalLogs.shouldSuggestAdjustment, true);
    const aggressive = await getJson('/weight-goal/preview?targetWeight=70');
    assert.ok(Math.abs(goalLogs.suggestedGoal.calories - aggressive.options[2].dailyGoal.calories) <= 25);
    const manualCalories = { calories: 1900, proteins: 120, carbohydrates: 200, fats: 60 };
    assert.equal((await request('/goals', json('PUT', manualCalories, goalToken))).status, 204);
    const manualLogs = await getJson('/weight-logs');
    assert.equal(manualLogs.goalSource, 'MANUAL');
    assert.equal(manualLogs.shouldSuggestAdjustment, false);
    assert.deepEqual(manualLogs.currentGoal, manualCalories);
    assert.equal((await request('/goals/recalculate', { method: 'POST' })).status, 401);
    const recalculated = await request('/goals/recalculate', { method: 'POST', headers: goalAuth });
    assert.equal(recalculated.status, 200);
    const recalculatedBody = await recalculated.json();
    assert.deepEqual(recalculatedBody.dailyGoal, goalLogs.suggestedGoal);
    const calculatedLogs = await getJson('/weight-logs');
    assert.equal(calculatedLogs.goalSource, 'CALCULATED');
    assert.equal(calculatedLogs.shouldSuggestAdjustment, false);
    assert.deepEqual(calculatedLogs.currentGoal, recalculatedBody.dailyGoal);

    // Profile edit preserves the goal and activity level, uses the local date and checks achievement.
    const profileBody = { name: 'Goal User 2', birthDate: '1990-05-20', gender: 'FEMALE', height: 170 };
    assert.equal((await request('/weight-goal', json('PUT', {
      targetWeight: 82, paceKgPerWeek: 0.3,
    }, goalToken))).status, 200);
    assert.equal((await request('/profiles', json('PUT', {
      ...profileBody, weight: 79, timezoneOffsetMinutes: -840,
    }, goalToken))).status, 204);
    const editedMe = await getJson('/me');
    assert.equal(editedMe.profile.goal, 'GAIN');
    assert.equal(editedMe.profile.name, 'Goal User 2');
    const editedProfile = await pool.query<{ activity_level: string }>(
      'SELECT activity_level FROM profiles WHERE account_id = $1', [goalOwner],
    );
    assert.equal(editedProfile.rows[0].activity_level, 'ATHLETE');
    const localLog = await pool.query<{ weight: number }>(
      'SELECT weight FROM weight_logs WHERE account_id = $1 AND date = $2::date',
      [goalOwner, localDateFromOffset(-840)],
    );
    assert.equal(localLog.rows[0].weight, 79);
    assert.equal((await getJson('/weight-goal')).weightGoal.status, 'ACTIVE');
    assert.equal((await request('/profiles', json('PUT', {
      ...profileBody, weight: 82.4, timezoneOffsetMinutes: -840,
    }, goalToken))).status, 204);
    const achievedByProfile = await getJson('/weight-goal');
    assert.equal(achievedByProfile.weightGoal.status, 'ACHIEVED');
    assert.equal((await getJson('/me')).profile.goal, 'MAINTAIN');
    assert.equal((await request('/weight-goal', { method: 'DELETE', headers: goalAuth })).status, 200);
    assert.equal((await getJson('/weight-goal')).weightGoal, null);

    // Achieving the goal by logging a weight.
    assert.equal((await request('/weight-goal', json('PUT', {
      targetWeight: 75, paceKgPerWeek: 0.5, applyToDailyGoals: false,
    }, goalToken))).status, 200);
    const reached = await request('/weight-logs', json('POST', {
      weight: 74.8, timezoneOffsetMinutes: -840,
    }, goalToken));
    assert.equal(reached.status, 200);
    assert.equal((await reached.json()).weightGoalAchieved, true);
    const again = await request('/weight-logs', json('POST', {
      weight: 74.6, timezoneOffsetMinutes: -840,
    }, goalToken));
    assert.equal((await again.json()).weightGoalAchieved, false);
    const achieved = await getJson('/weight-goal');
    assert.equal(achieved.weightGoal.status, 'ACHIEVED');
    assert.ok(achieved.weightGoal.achievedAt);
    assert.equal(achieved.weightGoal.progress.percent, 100);
    assert.equal(achieved.weightGoal.progress.remainingKg, 0);
    assert.equal((await getJson('/weight-logs')).startWeight, 82.4);

    // Ending: acknowledges achievements and keeps manual daily goals untouched.
    assert.equal((await request('/goals', json('PUT', manualCalories, goalToken))).status, 204);
    const ended = await request('/weight-goal', { method: 'DELETE', headers: goalAuth });
    assert.equal(ended.status, 200);
    assert.equal((await ended.json()).weightGoal, null);
    const afterEnd = await getJson('/me');
    assert.equal(afterEnd.profile.goal, 'MAINTAIN');
    assert.equal(afterEnd.goal.calories, manualCalories.calories);
    assert.equal((await request('/weight-goal', { method: 'DELETE', headers: goalAuth })).status, 200);
    const acknowledgedRows = await pool.query(
      'SELECT 1 FROM weight_goals WHERE account_id = $1 AND status = \'ACHIEVED\' AND acknowledged_at IS NOT NULL', [goalOwner],
    );
    assert.equal(acknowledgedRows.rowCount, 2);

    // Abandoning an active goal with calculated daily goals returns them to maintenance.
    assert.equal((await request('/weight-goal', json('PUT', {
      targetWeight: 70, paceKgPerWeek: 0.5,
    }, goalToken))).status, 200);
    const activeCalories = (await getJson('/me')).goal.calories;
    const abandoned = await request('/weight-goal', { method: 'DELETE', headers: goalAuth });
    assert.equal(abandoned.status, 200);
    assert.equal((await abandoned.json()).weightGoal, null);
    const maintenanceMe = await getJson('/me');
    assert.equal(maintenanceMe.profile.goal, 'MAINTAIN');
    assert.ok(maintenanceMe.goal.calories > activeCalories);
    const maintenanceLogs = await getJson('/weight-logs');
    assert.equal(maintenanceLogs.goalSource, 'CALCULATED');
    assert.deepEqual(maintenanceLogs.currentGoal, maintenanceLogs.suggestedGoal);
    assert.equal(maintenanceLogs.startWeight, 80);

    // Applying a suggested goal while logging keeps the source calculated.
    const applied = await request('/weight-logs', json('POST', {
      weight: 77, timezoneOffsetMinutes: -840, applySuggestedGoal: true,
    }, goalToken));
    assert.deepEqual((await applied.json()).currentGoal, (await getJson('/weight-logs')).suggestedGoal);

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

    // Streak: consecutive local days with meals registered by the end of the next day.
    const streakSignup = await request('/auth/sign-up', json('POST', {
      account: { email: streakEmail, password },
      profile: {
        name: 'Streak User', birthDate: '1992-03-10', gender: 'MALE', goal: 'MAINTAIN',
        height: 180, weight: 80, activityLevel: 'MODERATE',
      },
    }));
    assert.equal(streakSignup.status, 201);
    const streakToken = (await streakSignup.json()).accessToken as string;
    const streakAuth = { Authorization: `Bearer ${streakToken}` };
    const streakOwner = (await pool.query<{ id: string }>('SELECT id FROM accounts WHERE email = $1', [streakEmail])).rows[0].id;
    const getStreak = async () => {
      const response = await request('/meals/streak?timezoneOffsetMinutes=0', { headers: streakAuth });
      assert.equal(response.status, 200);
      return response.json();
    };
    const streakFoods = (carbohydrates: number) => [{ name: 'Prato', quantity: '1 porção', proteins: 50, carbohydrates, fats: 40 }];
    const insertMeal = (createdAt: string, loggedAt: string, carbohydrates = 100, status = 'SUCCESS') => pool.query(
      `INSERT INTO meals (id, account_id, status, input_type, input_file_key, name, icon, foods, created_at, logged_at)
       VALUES ($1, $2, $3, 'MANUAL', NULL, 'Prato', '🍽️', $4::jsonb, $5, $6)`,
      [`streak${Math.random().toString(36).slice(2)}`, streakOwner, status,
        JSON.stringify(streakFoods(carbohydrates).map(food => ({ ...food, calories: 0 }))), createdAt, loggedAt],
    );
    const streakToday = localDateFromOffset(0);
    const noon = (date: string) => `${date}T12:00:00.000Z`;

    assert.equal((await request('/meals/streak')).status, 401);
    assert.equal((await request('/meals/streak?timezoneOffsetMinutes=9999', { headers: streakAuth })).status, 400);
    assert.deepEqual(await getStreak(), {
      currentStreak: 0, bestStreak: 0, loggedToday: false, freezesAvailable: 0, daysUntilNextFreeze: 7, frozenDates: [],
    });

    const todayMeal = await request('/meals/manual', json('POST', {
      name: 'Hoje', foods: streakFoods(100), date: streakToday, timezoneOffsetMinutes: 0,
    }, streakToken));
    assert.equal(todayMeal.status, 201);
    const { mealId: todayMealId } = await todayMeal.json();
    assert.deepEqual(await getStreak(), {
      currentStreak: 1, bestStreak: 1, loggedToday: true, freezesAvailable: 0, daysUntilNextFreeze: 6, frozenDates: [],
    });

    // Yesterday filled in today still counts; three days ago filled in today does not.
    for (const daysAgo of [1, 3]) {
      assert.equal((await request('/meals/manual', json('POST', {
        name: 'Atrasado', foods: streakFoods(100), date: addDays(streakToday, -daysAgo), timezoneOffsetMinutes: 0,
      }, streakToken))).status, 201);
    }
    await insertMeal(noon(addDays(streakToday, -2)), noon(addDays(streakToday, -2)));
    await insertMeal(noon(addDays(streakToday, -2)), noon(addDays(streakToday, -1)));
    for (const daysAgo of [4, 5, 6, 7]) {
      await insertMeal(noon(addDays(streakToday, -daysAgo)), noon(addDays(streakToday, -daysAgo + 1)));
    }
    await insertMeal(noon(addDays(streakToday, -8)), noon(addDays(streakToday, -8)), 100, 'FAILED');
    assert.deepEqual(await getStreak(), {
      currentStreak: 3, bestStreak: 4, loggedToday: true, freezesAvailable: 0, daysUntilNextFreeze: 4, frozenDates: [],
    });

    // Today stays open: removing today's meal keeps the streak from yesterday.
    assert.equal((await request(`/meals/${todayMealId}`, { method: 'DELETE', headers: streakAuth })).status, 204);
    assert.deepEqual(await getStreak(), {
      currentStreak: 2, bestStreak: 4, loggedToday: false, freezesAvailable: 0, daysUntilNextFreeze: 5, frozenDates: [],
    });

    // Days on target: calories within 10% of the goal, above or below.
    assert.equal((await request('/goals', json('PUT', {
      calories: 2000, proteins: 150, carbohydrates: 200, fats: 60,
    }, streakToken))).status, 204);
    await insertMeal(noon('2026-09-08'), noon('2026-09-08'), 330); // 1880 kcal
    await insertMeal(noon('2026-09-09'), noon('2026-09-09'), 300); // 1760 kcal
    await insertMeal(noon('2026-09-10'), noon('2026-09-10'), 410); // 2200 kcal
    const targetWeek = await request('/meals/weekly-summary?startDate=2026-09-07&timezoneOffsetMinutes=0', { headers: streakAuth });
    assert.equal(targetWeek.status, 200);
    const targetSummary = await targetWeek.json();
    assert.equal(targetSummary.recordedDays, 3);
    assert.equal(targetSummary.daysOnTarget, 2);
    assert.deepEqual(
      targetSummary.days.map((day: { onTarget: boolean }) => day.onTarget),
      [false, true, false, true, false, false, false],
    );

    // Freezes: seven logged days earn one, and a finished day without meals spends it.
    await pool.query('DELETE FROM meals WHERE account_id = $1', [streakOwner]);
    for (let daysAgo = 20; daysAgo >= 1; daysAgo -= 1) {
      if (daysAgo !== 10 && daysAgo !== 2) {
        await insertMeal(noon(addDays(streakToday, -daysAgo)), noon(addDays(streakToday, -daysAgo)));
      }
    }
    assert.deepEqual(await getStreak(), {
      currentStreak: 18,
      bestStreak: 18,
      loggedToday: false,
      freezesAvailable: 0,
      daysUntilNextFreeze: 3,
      frozenDates: [addDays(streakToday, -10), addDays(streakToday, -2)],
    });

    // Achievements are evaluated on read, stored, and acknowledged by code.
    const achievementsPath = '/achievements?timezoneOffsetMinutes=0';
    const getAchievements = async () => {
      const response = await request(achievementsPath, { headers: streakAuth });
      assert.equal(response.status, 200);
      return (await response.json()).achievements as { code: string; unlockedAt: string; acknowledgedAt: string | null }[];
    };
    const codesOf = (items: { code: string }[]) => items.map(item => item.code).sort();
    assert.equal((await request(achievementsPath)).status, 401);
    const unlocked = await getAchievements();
    assert.deepEqual(codesOf(unlocked), ['FIRST_MEAL', 'STREAK_7', 'WEEKLY_TARGET']);
    assert.equal(unlocked.every(item => item.acknowledgedAt === null && !Number.isNaN(Date.parse(item.unlockedAt))), true);
    for (const badBody of [{}, { codes: [] }, { codes: ['UNKNOWN'] }]) {
      assert.equal((await request('/achievements/acknowledge', json('POST', badBody, streakToken))).status, 400);
    }
    assert.equal((await request('/achievements/acknowledge', json('POST', { codes: ['FIRST_MEAL'] }))).status, 401);
    assert.equal((await request('/achievements/acknowledge', json('POST', { codes: ['FIRST_MEAL'] }, streakToken))).status, 204);
    const acknowledged = await getAchievements();
    assert.notEqual(acknowledged.find(item => item.code === 'FIRST_MEAL')!.acknowledgedAt, null);
    assert.equal(acknowledged.find(item => item.code === 'STREAK_7')!.acknowledgedAt, null);
    // Unlocks persist after the meals behind them are gone, and new facts add to them.
    await pool.query('DELETE FROM meals WHERE account_id = $1', [streakOwner]);
    assert.equal((await request('/saved-foods', json('PUT', streakFoods(100)[0], streakToken))).status, 200);
    assert.deepEqual(codesOf(await getAchievements()), ['FIRST_MEAL', 'SAVED_FOOD', 'STREAK_7', 'WEEKLY_TARGET']);
    // Other accounts do not see these unlocks.
    const otherAchievements = await request(achievementsPath, { headers: { Authorization: `Bearer ${goalToken}` } });
    assert.equal(codesOf((await otherAchievements.json()).achievements).includes('STREAK_7'), false);

    console.log('Local HTTP routes, authentication, meals, weekly summary, streak, achievements, manual meals, saved foods, nutrition label scan, profile photo, and signed file access: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE email = $1', [email]);
    await pool.query('DELETE FROM accounts WHERE email = $1', [otherEmail]);
    await pool.query('DELETE FROM accounts WHERE email = $1', [goalEmail]);
    await pool.query('DELETE FROM accounts WHERE email = $1', [streakEmail]);
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
