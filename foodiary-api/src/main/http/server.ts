import 'reflect-metadata';

import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { z, ZodError } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { GetMeController } from '@application/controllers/accounts/GetMeController';
import { ConfirmForgotPasswordController } from '@application/controllers/auth/ConfirmForgotPasswordController';
import { ForgotPasswordController } from '@application/controllers/auth/ForgotPasswordController';
import { RefreshTokenController } from '@application/controllers/auth/RefreshTokenController';
import { SignInController } from '@application/controllers/auth/SignInController';
import { SignUpController } from '@application/controllers/auth/SignUpController';
import { UpdateGoalController } from '@application/controllers/goals/UpdateGoalController';
import { CreateMealController } from '@application/controllers/meals/CreateMealController';
import { CreateManualMealController } from '@application/controllers/meals/CreateManualMealController';
import { DeleteMealController } from '@application/controllers/meals/DeleteMealController';
import { GetMealByIdController } from '@application/controllers/meals/GetMealByIdController';
import { GetWeeklySummaryController } from '@application/controllers/meals/GetWeeklySummaryController';
import { ListMealsByDayController } from '@application/controllers/meals/ListMealsByDayController';
import { RepeatMealController } from '@application/controllers/meals/RepeatMealController';
import { UpdateMealController } from '@application/controllers/meals/UpdateMealController';
import { UpdateProfileController } from '@application/controllers/profiles/UpdateProfileController';
import { DeleteSavedFoodController } from '@application/controllers/savedFoods/DeleteSavedFoodController';
import { ListSavedFoodsController } from '@application/controllers/savedFoods/ListSavedFoodsController';
import { SaveFoodController } from '@application/controllers/savedFoods/SaveFoodController';
import { ApplicationError } from '@application/errors/application/ApplicationError';
import { ErrorCode } from '@application/errors/ErrorCode';
import { BadRequest } from '@application/errors/http/BadRequest';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { HttpError } from '@application/errors/http/HttpError';
import { Unauthorized } from '@application/errors/http/Unauthorized';
import { Meal } from '@application/entities/Meal';
import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
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
  { method: 'PUT', path: '/goals', private: true, controller: UpdateGoalController },
  { method: 'GET', path: '/meals', private: true, controller: ListMealsByDayController },
  { method: 'GET', path: '/meals/weekly-summary', private: true, controller: GetWeeklySummaryController },
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

export function createHttpServer(): Server {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');

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
      const fileMatch = /^\/meal-files\/([a-zA-Z0-9]+\/[a-zA-Z0-9]+\.(?:jpeg|m4a))$/.exec(url.pathname);
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
        const expectedType = meal.inputType === Meal.InputType.AUDIO ? 'audio/m4a' : 'image/jpeg';
        const validContent = meal.inputType === Meal.InputType.AUDIO
          ? bytes.toString('ascii', 4, 8) === 'ftyp'
          : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        if (contentType !== expectedType || !validContent) {
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
