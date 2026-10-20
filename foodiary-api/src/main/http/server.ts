import 'reflect-metadata';

import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { z, ZodError } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { GetMeController } from '@application/controllers/accounts/GetMeController';
import { AcknowledgeAchievementsController } from '@application/controllers/achievements/AcknowledgeAchievementsController';
import { GetAchievementsController } from '@application/controllers/achievements/GetAchievementsController';
import { ConfirmForgotPasswordController } from '@application/controllers/auth/ConfirmForgotPasswordController';
import { ForgotPasswordController } from '@application/controllers/auth/ForgotPasswordController';
import { RefreshTokenController } from '@application/controllers/auth/RefreshTokenController';
import { SignInController } from '@application/controllers/auth/SignInController';
import { SignUpController } from '@application/controllers/auth/SignUpController';
import { RecalculateGoalsController } from '@application/controllers/goals/RecalculateGoalsController';
import { UpdateGoalController } from '@application/controllers/goals/UpdateGoalController';
import { CreateMealController } from '@application/controllers/meals/CreateMealController';
import { CreateManualMealController } from '@application/controllers/meals/CreateManualMealController';
import { DeleteMealController } from '@application/controllers/meals/DeleteMealController';
import { GetMealByIdController } from '@application/controllers/meals/GetMealByIdController';
import { GetStreakController } from '@application/controllers/meals/GetStreakController';
import { GetWeeklySummaryController } from '@application/controllers/meals/GetWeeklySummaryController';
import { ListMealsByDayController } from '@application/controllers/meals/ListMealsByDayController';
import { ListMealHistoryController } from '@application/controllers/meals/ListMealHistoryController';
import { RepeatMealController } from '@application/controllers/meals/RepeatMealController';
import { UpdateMealController } from '@application/controllers/meals/UpdateMealController';
import { UpdateProfileController } from '@application/controllers/profiles/UpdateProfileController';
import { DeleteSavedFoodController } from '@application/controllers/savedFoods/DeleteSavedFoodController';
import { ListSavedFoodsController } from '@application/controllers/savedFoods/ListSavedFoodsController';
import { SaveFoodController } from '@application/controllers/savedFoods/SaveFoodController';
import { ListWeightLogsController } from '@application/controllers/weightLogs/ListWeightLogsController';
import { LogWeightController } from '@application/controllers/weightLogs/LogWeightController';
import { EndWeightGoalController } from '@application/controllers/weightGoals/EndWeightGoalController';
import { GetWeightGoalController } from '@application/controllers/weightGoals/GetWeightGoalController';
import { PreviewWeightGoalController } from '@application/controllers/weightGoals/PreviewWeightGoalController';
import { SetWeightGoalController } from '@application/controllers/weightGoals/SetWeightGoalController';
import { ApplicationError } from '@application/errors/application/ApplicationError';
import { ErrorCode } from '@application/errors/ErrorCode';
import { BadRequest } from '@application/errors/http/BadRequest';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { HttpError } from '@application/errors/http/HttpError';
import { TooManyRequests } from '@application/errors/http/TooManyRequests';
import { Unauthorized } from '@application/errors/http/Unauthorized';
import { Meal } from '@application/entities/Meal';
import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { NutritionLabelAIGateway, type NutritionLabelResult } from '@infra/ai/gateways/NutritionLabelAIGateway';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import { LocalProfilePhotoStorageGateway } from '@infra/gateways/LocalProfilePhotoStorageGateway';
import { Registry } from '@kernel/di/Registry';
import { Constructor } from '@shared/types/Constructor';
import { readFileUpload } from './readFileUpload';

type Route = {
  method: string;
  path: string;
  private: boolean;
  controller: Constructor<Controller<any, unknown>>;
};

const routes: Route[] = [
  { method: 'POST', path: '/auth/sign-up', private: false, controller: SignUpController },
  { method: 'POST', path: '/auth/sign-in', private: false, controller: SignInController },
  { method: 'POST', path: '/auth/refresh-token', private: false, controller: RefreshTokenController },
  { method: 'POST', path: '/auth/forgot-password', private: false, controller: ForgotPasswordController },
  { method: 'POST', path: '/auth/forgot-password/confirm', private: false, controller: ConfirmForgotPasswordController },
  { method: 'GET', path: '/me', private: true, controller: GetMeController },
  { method: 'PUT', path: '/profiles', private: true, controller: UpdateProfileController },
  { method: 'GET', path: '/achievements', private: true, controller: GetAchievementsController },
  { method: 'POST', path: '/achievements/acknowledge', private: true, controller: AcknowledgeAchievementsController },
  { method: 'PUT', path: '/goals', private: true, controller: UpdateGoalController },
  { method: 'POST', path: '/goals/recalculate', private: true, controller: RecalculateGoalsController },
  { method: 'GET', path: '/weight-goal', private: true, controller: GetWeightGoalController },
  { method: 'GET', path: '/weight-goal/preview', private: true, controller: PreviewWeightGoalController },
  { method: 'PUT', path: '/weight-goal', private: true, controller: SetWeightGoalController },
  { method: 'DELETE', path: '/weight-goal', private: true, controller: EndWeightGoalController },
  { method: 'GET', path: '/weight-logs', private: true, controller: ListWeightLogsController },
  { method: 'POST', path: '/weight-logs', private: true, controller: LogWeightController },
  { method: 'GET', path: '/meals', private: true, controller: ListMealsByDayController },
  { method: 'GET', path: '/meals/history', private: true, controller: ListMealHistoryController },
  { method: 'GET', path: '/meals/weekly-summary', private: true, controller: GetWeeklySummaryController },
  { method: 'GET', path: '/meals/streak', private: true, controller: GetStreakController },
  { method: 'POST', path: '/meals/manual', private: true, controller: CreateManualMealController },
  { method: 'POST', path: '/meals', private: true, controller: CreateMealController },
  { method: 'GET', path: '/saved-foods', private: true, controller: ListSavedFoodsController },
  { method: 'PUT', path: '/saved-foods', private: true, controller: SaveFoodController },
  { method: 'DELETE', path: '/saved-foods/:foodId', private: true, controller: DeleteSavedFoodController },
  { method: 'GET', path: '/meals/:mealId', private: true, controller: GetMealByIdController },
  { method: 'PATCH', path: '/meals/:mealId', private: true, controller: UpdateMealController },
  { method: 'DELETE', path: '/meals/:mealId', private: true, controller: DeleteMealController },
  { method: 'POST', path: '/meals/:mealId/repeat', private: true, controller: RepeatMealController },
];

const maxBodyBytes = 1024 * 1024;

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > maxBodyBytes) {
      throw new BadRequest('Request body is too large.');
    }

    chunks.push(buffer);
  }

  if (size === 0) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Expected an object.');
    }

    return value as Record<string, unknown>;
  } catch {
    throw new BadRequest('Malformed body.');
  }
}

function sendJson(response: ServerResponse, statusCode: number, body?: unknown): void {
  response.statusCode = statusCode;

  if (body === undefined || statusCode === 204) {
    response.end();
    return;
  }

  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: unknown): void {
  if (error instanceof ZodError) {
    sendJson(response, 400, {
      error: {
        code: ErrorCode.VALIDATION,
        message: error.issues.map(issue => ({
          field: issue.path.join('.'),
          error: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof HttpError || error instanceof ApplicationError) {
    sendJson(response, error.statusCode ?? 400, {
      error: { code: error.code, message: error.message },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  sendJson(response, 500, {
    error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'Internal server error.' },
  });
}

async function accountIdFromRequest(request: IncomingMessage): Promise<string> {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');

  if (!match) {
    throw new Unauthorized();
  }

  try {
    return await new LocalAuthGateway().verifyAccessToken(match[1]);
  } catch {
    throw new Unauthorized();
  }
}

const publicAuthPaths = new Set([
  '/auth/sign-up',
  '/auth/sign-in',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/forgot-password/confirm',
  '/auth/sign-out',
]);

export function createHttpServer(options: {
  scanNutritionLabel?: (image: Buffer) => Promise<NutritionLabelResult>;
} = {}): Server {
  new LocalAuthGateway().assertConfigured();

  const scanNutritionLabel = options.scanNutritionLabel
    ?? ((image: Buffer) => new NutritionLabelAIGateway().scan(image));
  const allowedWebOrigins = new Set((process.env.ALLOWED_WEB_ORIGINS ?? '')
    .split(',').map(value => value.trim()).filter(Boolean));
  const authRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

  const checkAuthRateLimit = (request: IncomingMessage, pathname: string) => {
    const windowMs = 60_000;
    const maxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 120);
    const now = Date.now();
    const clientIp = request.socket.remoteAddress ?? 'unknown';
    const key = `${clientIp}:${pathname}`;
    const current = authRateLimitBuckets.get(key);

    if (!current || current.resetAt <= now) {
      if (authRateLimitBuckets.size > 5000) {
        for (const [k, v] of authRateLimitBuckets.entries()) {
          if (v.resetAt <= now) {
            authRateLimitBuckets.delete(k);
          }
        }
      }
      authRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    current.count += 1;
    if (current.count > maxRequests) {
      throw new TooManyRequests('Too many authentication attempts. Please try again later.');
    }
  };

  return createServer(async (request, response) => {
    try {
      const origin = request.headers.origin;
      if (origin && allowedWebOrigins.has(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      }
      if (request.method === 'OPTIONS') {
        response.statusCode = origin && allowedWebOrigins.has(origin) ? 204 : 403;
        response.end();
        return;
      }

      const url = new URL(request.url ?? '/', 'http://localhost');

      if (request.method === 'POST' && publicAuthPaths.has(url.pathname)) {
        checkAuthRateLimit(request, url.pathname);
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        await getPostgresPool().query('SELECT 1');
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/sign-out') {
        const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(await readBody(request));
        await new LocalAuthGateway().revokeRefreshToken(refreshToken);
        sendJson(response, 204);
        return;
      }

      const storage = new LocalMealsFileStorageGateway();
      const fileMatch = /^\/meal-files\/([a-zA-Z0-9]+\/[a-zA-Z0-9]+\.(?:jpeg|png|webp|m4a|mp4|webm|ogg|wav))$/.exec(url.pathname);
      if (request.method === 'GET' && fileMatch) {
        if (!await new MealRepository().hasInputFile(fileMatch[1])) {
          sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'File not found.' } });
          return;
        }
        const file = await storage.open(
          fileMatch[1], url.searchParams.get('expires'), url.searchParams.get('signature'),
        );
        if (!file) {
          sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'File not found.' } });
          return;
        }
        response.writeHead(200, {
          'Content-Type': file.contentType,
          'Content-Length': file.size,
          'Cache-Control': 'private, no-store',
        });
        file.stream.on('error', error => {
          // eslint-disable-next-line no-console
          console.error(error);
          response.destroy(error);
        });
        file.stream.pipe(response);
        return;
      }

      const profilePhotoStorage = new LocalProfilePhotoStorageGateway();
      const photoMatch = /^\/profile-photos\/([a-zA-Z0-9]+\/[a-zA-Z0-9]+\.jpeg)$/.exec(url.pathname);
      if (request.method === 'GET' && photoMatch) {
        const file = await profilePhotoStorage.open(
          photoMatch[1], url.searchParams.get('expires'), url.searchParams.get('signature'),
        );
        if (!file) {
          sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Photo not found.' } });
          return;
        }
        response.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': file.size,
          'Cache-Control': 'private, max-age=3600',
        });
        file.stream.on('error', error => response.destroy(error));
        file.stream.pipe(response);
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/profile-photo') {
        const accountId = await accountIdFromRequest(request);
        const { bytes, contentType } = await readFileUpload(request);
        if (contentType !== 'image/jpeg'
          || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
          throw new BadRequest('Profile photo must be a JPEG image.');
        }
        const repository = new ProfileRepository();
        const fileKey = profilePhotoStorage.generateFileKey(accountId);
        await profilePhotoStorage.write(fileKey, bytes);
        let previousFileKey: string | null | undefined;
        try {
          previousFileKey = await repository.setPhotoFileKey(accountId, fileKey);
          if (previousFileKey === undefined) {
            throw new ResourceNotFound('Profile not found.');
          }
        } catch (error) {
          await profilePhotoStorage.remove(fileKey);
          throw error;
        }
        if (previousFileKey) {
          try {
            await profilePhotoStorage.remove(previousFileKey);
          } catch {
            process.stderr.write('Failed to remove previous profile photo.\n');
          }
        }
        sendJson(response, 200, { photoUrl: profilePhotoStorage.getFileURL(fileKey) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/nutrition-label/scan') {
        await accountIdFromRequest(request);
        const { bytes, contentType } = await readFileUpload(request);
        if (contentType !== 'image/jpeg'
          || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
          throw new BadRequest('Nutrition label must be a JPEG image.');
        }
        const label = await scanNutritionLabel(bytes);
        if (label.quantity === null && label.calories === null
          && label.proteins === null && label.carbohydrates === null && label.fats === null) {
          throw new BadRequest('No readable nutrition table was found.');
        }
        sendJson(response, 200, label);
        return;
      }

      const uploadMatch = /^\/meal-uploads\/([a-zA-Z0-9]+)$/.exec(url.pathname);
      if (request.method === 'POST' && uploadMatch) {
        const accountId = await accountIdFromRequest(request);
        const repository = new MealRepository();
        const meal = await repository.findById({ accountId, mealId: uploadMatch[1] });
        if (!meal || meal.status !== Meal.Status.UPLOADING || !meal.inputFileKey
          || meal.inputType === Meal.InputType.MANUAL) {
          sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Pending meal not found.' } });
          return;
        }
        const { bytes, contentType } = await readFileUpload(request);
        const normalizedType = contentType.split(';')[0].trim().toLowerCase();
        const ext = LocalMealsFileStorageGateway.getFileExtension(meal.inputFileKey);
        const expectedType = LocalMealsFileStorageGateway.getMimeTypeFromFileKey(meal.inputFileKey, meal.inputType);
        const matchesInputType = meal.inputType === Meal.InputType.AUDIO
          ? expectedType.startsWith('audio/')
          : expectedType.startsWith('image/');
        const validContent = (() => {
          switch (ext) {
            case 'jpeg':
              return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
            case 'png':
              return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
            case 'webp':
              return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
            case 'm4a':
            case 'mp4':
              return bytes.toString('ascii', 4, 8) === 'ftyp';
            case 'webm':
              return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
            case 'ogg':
              return bytes.toString('ascii', 0, 4) === 'OggS';
            case 'wav':
              return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
            default:
              return false;
          }
        })();
        if (!matchesInputType || normalizedType !== expectedType || !validContent) {
          throw new BadRequest('File content does not match the meal type.');
        }
        try {
          await storage.write(meal.inputFileKey, bytes);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new BadRequest('Meal file has already been uploaded.');
          }
          throw error;
        }
        try {
          if (!await repository.markUploaded(meal)) {
            throw new BadRequest('Meal is no longer awaiting upload.');
          }
        } catch (error) {
          await storage.remove(meal.inputFileKey);
          throw error;
        }
        sendJson(response, 204);
        return;
      }

      const mealMatch = /^\/meals\/([a-zA-Z0-9]+)$/.exec(url.pathname);
      const repeatMatch = /^\/meals\/([a-zA-Z0-9]+)\/repeat$/.exec(url.pathname);
      const savedFoodMatch = /^\/saved-foods\/([a-zA-Z0-9]+)$/.exec(url.pathname);
      const matchedMealId = mealMatch?.[1] ?? repeatMatch?.[1];
      const route = routes.find(item => item.method === request.method
        && (item.path === url.pathname
          || (item.path === '/meals/:mealId' && mealMatch)
          || (item.path === '/meals/:mealId/repeat' && repeatMatch)
          || (item.path === '/saved-foods/:foodId' && savedFoodMatch)));

      if (!route) {
        sendJson(response, 404, {
          error: { code: 'NOT_FOUND', message: 'Route not found.' },
        });
        return;
      }

      const accountId = route.private ? await accountIdFromRequest(request) : null;
      const body = await readBody(request);
      const controller = Registry.getInstance().resolve(route.controller);
      const result = await controller.execute({
        accountId,
        body,
        params: matchedMealId ? { mealId: matchedMealId } : savedFoodMatch ? { foodId: savedFoodMatch[1] } : {},
        queryParams: Object.fromEntries(url.searchParams),
      });

      sendJson(response, result.statusCode, result.body);
    } catch (error) {
      sendError(response, error);
    }
  });
}
