// Runs app logic in Node with native/platform dependencies replaced at the boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const axios = require('axios');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => {
      if (Object.hasOwn(mocks, name)) {
        return mocks[name];
      }
      if (name.startsWith('@app/') || name.startsWith('@ui/')) {
        const subPath = name.replace(/^@/, '');
        for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
          const candidate = path.resolve(__dirname, '../src', `${subPath}${ext}`);
          if (fs.existsSync(candidate)) {
            return load(`${subPath}${ext}`, mocks);
          }
        }
      }
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}

async function main() {
  const { signInSchema } = load('ui/screens/SignIn/schema.ts');
  const password = '  exact password  ';
  assert.deepEqual(signInSchema.parse({ email: ' \tPerson@Example.test\n', password }), {
    email: 'person@example.test', password,
  });
  for (const email of ['', ' ', 'bad', 'a b@example.test']) {
    assert.equal(signInSchema.safeParse({ email, password }).success, false);
  }

  const { signInErrorMessage } = load('ui/screens/SignIn/signInError.ts');
  function failure(status, url = '/auth/sign-in', code) {
    const config = { url };
    return new axios.AxiosError('sensitive internal details', code, config, {},
      status ? { status, config, data: { secret: 'must not appear' } } : undefined);
  }
  assert.match(signInErrorMessage(failure(401)), /senha incorretos/);
  assert.match(signInErrorMessage(failure()), /conectar ao servidor/);
  assert.match(signInErrorMessage(failure(undefined, undefined, 'ECONNABORTED')), /demorou/);
  assert.match(signInErrorMessage(failure(503)), /indisponível/);
  assert.match(signInErrorMessage(failure(429)), /Muitas tentativas/);
  assert.match(signInErrorMessage(failure(401, '/accounts/me')), /concluir o acesso/);
  assert.match(signInErrorMessage(new Error('private storage details')), /concluir o acesso/);

  let screenError = null;
  let submit;
  const { SignIn } = load('ui/screens/SignIn/index.tsx', {
    '@hookform/resolvers/zod': { zodResolver: () => {} },
    '@app/contexts/AuthContext/useAuth': { useAuth: () => ({ signIn: async () => { throw failure(); } }) },
    '@ui/components/AppHeader': { AppHeader: () => null },
    '@ui/components/AppText': { AppText: ({ children, accessibilityRole }) =>
      require('react').createElement('span', { role: accessibilityRole }, children) },
    '@ui/components/Button': { Button: () => null },
    '@ui/components/FormGroup': { FormGroup: () => null },
    '@ui/components/Input': { Input: () => null },
    react: { useRef: () => ({ current: null }), useState: () => [screenError, value => { screenError = value; }] },
    'react-hook-form': {
      Controller: () => null,
      useForm: () => ({ handleSubmit: callback => {
        submit = () => callback({ email: 'person@example.test', password });
        return submit;
      }, formState: { isSubmitting: false } }),
    },
    'react-native': { KeyboardAvoidingView: 'div', Platform: { OS: 'web' }, ScrollView: 'div', View: 'div' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    './schema': { signInSchema },
    './signInError': { signInErrorMessage },
    './styles': { styles: {} },
  });
  SignIn();
  await submit();
  const screen = SignIn();
  // Inspect the React output directly; native layout is intentionally outside this test.
  const formChildren = screen.props.children[1].props.children.props.children[1].props.children;
  const alert = formChildren.find(child => child?.props.accessibilityRole === 'alert');
  assert.equal(alert.props.children, signInErrorMessage(failure()));
  assert.equal(alert.props.accessibilityLiveRegion, 'polite');

  const { Service } = load('app/services/Service.ts', {
    '@app/config/env': { env: { api: { url: 'http://127.0.0.1' } } },
    'react-native-base64': { decode: value => Buffer.from(value, 'base64').toString('binary') },
  });
  assert.equal(Service.client.defaults.timeout, 0, 'shared client must not impose the auth deadline on uploads');
  const authCalls = [];
  const { AuthService } = load('app/services/AuthService.ts', {
    './Service': { Service: class {
      static client = { post: async (url, _payload, config) => {
        authCalls.push({ url, timeout: config.timeout });
        return { data: { accessToken: 'test', refreshToken: 'test' } };
      } };
    } },
  });
  await AuthService.signIn({ email: 'person@example.test', password });
  await AuthService.signUp({});
  await AuthService.refresh({ refreshToken: 'test' });
  assert.deepEqual(authCalls, [
    { url: '/auth/sign-in', timeout: 15000 },
    { url: '/auth/sign-up', timeout: 15000 },
    { url: '/auth/refresh-token', timeout: 15000 },
  ]);
  Service.setAccessToken('old-test-token');
  let refreshCount = 0;
  Service.setRefreshTokenHandler(async () => {
    refreshCount++;
    await new Promise(resolve => setTimeout(resolve, 10));
    Service.setAccessToken('new-test-token');
  });
  Service.client.defaults.adapter = async config => {
    if (config.headers.get('Authorization') !== 'Bearer new-test-token') {
      throw new axios.AxiosError('Unauthorized', undefined, config, {}, { status: 401, config });
    }
    return { data: 'ok', status: 200, headers: {}, config };
  };
  await Promise.all([Service.client.get('/accounts/me'), Service.client.get('/accounts/me')]);
  assert.equal(refreshCount, 1, 'concurrent unauthorized requests share one refresh');
  Service.setAccessToken('old-test-token');
  await assert.rejects(Service.client.post('/auth/sign-in', {}));
  assert.equal(refreshCount, 1, 'sign-in failures do not trigger refresh');

  // APP-002 (Service): in-flight refresh invalidated by logout must not retry or leave stale token
  let resolveInFlightRefresh;
  let requestAttempts = 0;
  Service.setAccessToken('expired-token');
  Service.setRefreshTokenHandler(async () => {
    await new Promise(resolve => { resolveInFlightRefresh = resolve; });
    Service.setAccessToken('stale-refreshed-token');
  });
  Service.client.defaults.adapter = async config => {
    requestAttempts++;
    throw new axios.AxiosError('Unauthorized', undefined, config, {}, { status: 401, config });
  };
  const pendingRequest = Service.client.get('/meals');
  await new Promise(resolve => setImmediate(resolve));
  Service.removeAccessToken();
  Service.removeRefreshTokenHandler();
  resolveInFlightRefresh();
  await assert.rejects(pendingRequest, error => error.response?.status === 401);
  assert.equal(requestAttempts, 1, 'logged-out request must not be retried after refresh');
  assert.equal(Service.client.defaults.headers.common.Authorization, undefined);

  let uploadTimeout;
  let uploadedForm;
  Service.client.defaults.adapter = async config => {
    uploadTimeout = config.timeout;
    uploadedForm = config.data;
    return { data: {}, status: 204, headers: {}, config };
  };
  await Service.uploadPresignedPOST({
    uploadSignature: Buffer.from(JSON.stringify({ url: '/meal-uploads/test', fields: {} })).toString('base64'),
    file: { uri: 'file:///test.jpeg', type: 'image/jpeg', name: 'test.jpeg' },
  });
  assert.equal(uploadTimeout, 0, 'relative multipart uploads retain their original deadline behavior');

  // APP-004 & APP-005: data URI uploads attach a real Blob to FormData
  await Service.uploadPresignedPOST({
    uploadSignature: Buffer.from(JSON.stringify({ url: '/meal-uploads/web', fields: { key: 'k1' } })).toString('base64'),
    file: { uri: 'data:image/jpeg;base64,YQ==', type: 'image/jpeg', name: 'meal.jpg' },
  });
  const uploadedMealFile = uploadedForm.get('file');
  assert.ok(uploadedMealFile instanceof Blob, 'web data URI upload must append a Blob');
  assert.equal(uploadedMealFile.size, 1);

  const { ProfileService } = load('app/services/ProfileService.ts', {
    './Service': { Service },
  });
  let profilePhotoForm;
  Service.client.defaults.adapter = async config => {
    profilePhotoForm = config.data;
    return { data: {}, status: 204, headers: {}, config };
  };
  await ProfileService.updateProfilePhoto('data:image/jpeg;base64,YQ==');
  const avatarFile = profilePhotoForm.get('file');
  assert.ok(avatarFile instanceof Blob, 'ProfileService on web data URI must append a real Blob');
  assert.notEqual(avatarFile, '[object Object]');
  assert.equal(await avatarFile.text(), 'a');

  // Exercise the real Axios HTTP timeout, not an adapter that invents one.
  const server = http.createServer((_request, response) => {
    setTimeout(() => response.end('{}'), 100);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(Service.client.get(`http://127.0.0.1:${server.address().port}`, {
      adapter: 'http', timeout: 20, proxy: false,
    }), error => error.code === 'ECONNABORTED');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  const events = [];
  let rejectStorageClear;
  let saveFails = false;
  const storageFailure = new Error('storage unavailable');
  const { AuthProvider } = load('app/contexts/AuthContext/AuthProvider.tsx', {
    react: {
      useCallback: callback => callback,
      useLayoutEffect: () => {},
      useRef: initial => ({ current: initial }),
      useState: () => [true, value => events.push(['state', value])],
    },
    'expo-splash-screen': { preventAutoHideAsync: async () => {} },
    '@app/hooks/queries/useAccount': { useAccount: () => ({ account: {}, loadAccount: async () => ({}) }) },
    '@app/lib/AuthTokensManager': { AuthTokensManager: {
      load: async () => null,
      save: async () => {
        if (saveFails) {
          throw storageFailure;
        }
      },
      clear: () => new Promise((_resolve, reject) => { rejectStorageClear = reject; }),
    } },
    '@app/services/AuthService': { AuthService: { signIn: async () => ({ accessToken: 'test', refreshToken: 'test' }) } },
    '@app/services/Service': { Service: {
      setAccessToken: () => events.push('set token'),
      setRefreshTokenHandler: () => events.push('set refresh'),
      removeAccessToken: () => events.push('remove token'),
      removeRefreshTokenHandler: () => events.push('remove refresh'),
    } },
    '@app/hooks/app/useForceRender': { useForceRender: () => () => events.push('render') },
    '@tanstack/react-query': { useQueryClient: () => ({
      setQueryData: () => events.push('clear account'), clear: () => events.push('clear cache'),
    }) },
    '.': { AuthContext: { Provider: 'Provider' } },
  });
  const auth = AuthProvider({ children: null }).props.value;
  const logout = auth.signOut();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(events.includes('remove token'));
  assert.ok(events.includes('remove refresh'));
  assert.ok(events.includes('clear account'));
  assert.ok(events.includes('clear cache'));
  rejectStorageClear(storageFailure);
  await assert.rejects(logout, error => error === storageFailure);
  events.length = 0;
  saveFails = true;
  const login = auth.signIn({ email: 'person@example.test', password });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(events.includes('clear account'), 'failed token persistence clears partially established session');
  rejectStorageClear(storageFailure);
  await assert.rejects(login, error => error === storageFailure);

  // APP-002 & APP-003 (AuthProvider): race between refresh and signOut + transient startup/refresh failure preservation
  {
    let persistedTokens = { accessToken: 'a1', refreshToken: 'r1' };
    let registeredRefreshHandler = null;
    let currentAccessToken = null;
    let loadAccountResult = { error: null };
    let resolveRefreshCall = null;
    const revokedTokens = [];
    const savedHistory = [];
    let clearCount = 0;
    const states = [true, false, false];
    const refs = [];
    let refCursor = 0;

    const { AuthProvider: StatefulAuthProvider } = load('app/contexts/AuthContext/AuthProvider.tsx', {
      react: {
        useCallback: callback => callback,
        useLayoutEffect: () => {},
        useRef: (initial) => {
          const idx = refCursor++;
          if (!refs[idx]) {
            refs[idx] = { current: initial };
          }
          return refs[idx];
        },
        useState: () => {
          const idx = (refCursor * 0); // unused helper
          void idx;
          return [states[0], () => {}];
        },
      },
      'expo-splash-screen': { preventAutoHideAsync: async () => {}, hideAsync: async () => {} },
      '@app/hooks/queries/useAccount': { useAccount: () => ({
        account: { id: '1' },
        loadAccount: async () => loadAccountResult,
      }) },
      '@app/lib/AuthTokensManager': { AuthTokensManager: {
        load: async () => persistedTokens,
        save: async (tokens) => {
          persistedTokens = tokens;
          savedHistory.push(tokens);
        },
        clear: async () => {
          persistedTokens = null;
          clearCount++;
        },
      } },
      '@app/services/AuthService': { AuthService: {
        signIn: async () => ({ accessToken: 'a1', refreshToken: 'r1' }),
        signOut: async (rt) => { revokedTokens.push(rt); },
        refresh: () => new Promise((resolve) => { resolveRefreshCall = resolve; }),
      } },
      '@app/services/Service': { Service: {
        setAccessToken: (token) => { currentAccessToken = token; },
        setRefreshTokenHandler: (handler) => { registeredRefreshHandler = handler; },
        removeAccessToken: () => { currentAccessToken = null; },
        removeRefreshTokenHandler: () => { registeredRefreshHandler = null; },
      } },
      '@app/hooks/app/useForceRender': { useForceRender: () => () => {} },
      '@tanstack/react-query': { useQueryClient: () => ({
        setQueryData: () => {},
        clear: () => {},
      }) },
      '.': { AuthContext: { Provider: 'Provider' } },
    });

    refCursor = 0;
    const ctx = StatefulAuthProvider({ children: null }).props.value;
    await ctx.retryAuth();
    assert.equal(currentAccessToken, 'a1');
    assert.equal(typeof registeredRefreshHandler, 'function');

    // Start an in-flight refresh, then signOut before refresh resolves
    const refreshInFlight = registeredRefreshHandler();
    await new Promise(resolve => setImmediate(resolve));
    const signOutPromise = ctx.signOut();
    resolveRefreshCall({ accessToken: 'a2-after-logout', refreshToken: 'r2-after-logout' });
    await assert.rejects(refreshInFlight);
    await signOutPromise;
    assert.equal(currentAccessToken, null, 'stale refresh must not restore access token after signOut');
    assert.equal(persistedTokens, null, 'stale refresh must not re-save tokens after signOut');
    assert.equal(savedHistory.length, 0, 'AuthTokensManager.save must not be called by invalidated refresh');
    assert.deepEqual(revokedTokens, ['r1']);

    // APP-003: transient startup failure preserves persisted tokens instead of clearing session
    persistedTokens = { accessToken: 'a-saved', refreshToken: 'r-saved' };
    clearCount = 0;
    loadAccountResult = { error: failure(undefined, '/accounts/me') };
    await ctx.retryAuth();
    assert.equal(clearCount, 0, 'transient network error on startup must not clear persisted tokens');
    assert.deepEqual(persistedTokens, { accessToken: 'a-saved', refreshToken: 'r-saved' });

    // Definitive 401 on startup DOES clear persisted tokens
    loadAccountResult = { error: failure(401, '/accounts/me') };
    await ctx.retryAuth();
    assert.equal(clearCount, 1, '401 error on startup must clear session');
    assert.equal(persistedTokens, null);
  }

  // APP-004: getFileInfo supports web data URIs and native extensions
  {
    const { getFileInfo } = load('app/lib/getFileInfo.ts', {
      'expo-file-system': {
        File: class {
          constructor(uri) {
            this.uri = uri;
          }
          info() {
            return { exists: true, size: 42 };
          }
        },
      },
    });
    const dataInfo = await getFileInfo('data:image/png;base64,iVBORw0KGgo=');
    assert.equal(dataInfo.type, 'image/png');
    assert.equal(dataInfo.filename, 'meal.png');
    assert.ok(dataInfo.blob instanceof Blob);

    const audioDataInfo = await getFileInfo('data:audio/webm;codecs=opus;base64,YQ==');
    assert.equal(audioDataInfo.type, 'audio/webm');
    assert.equal(audioDataInfo.filename, 'meal.webm');

    const nativeWebp = await getFileInfo('file:///cache/photo.webp');
    assert.equal(nativeWebp.type, 'image/webp');
    assert.equal(nativeWebp.size, 42);
  }

  // APP-008: calcMacroPercentage and formatMacro handle zero goal without NaN
  {
    const { calcMacroPercentage, formatMacro } = load('ui/components/GoalStats/utils.ts');
    assert.equal(calcMacroPercentage({ goal: 0, current: 0 }), 0);
    assert.equal(Number.isNaN(calcMacroPercentage({ goal: 0, current: 0 })), false);
    assert.equal(calcMacroPercentage({ goal: 0, current: 25 }), 100);
    assert.equal(calcMacroPercentage({ goal: 100, current: undefined }), 100);
    assert.equal(calcMacroPercentage({ goal: 200, current: 50 }), 25);
    assert.equal(formatMacro({ goal: 0, current: 0 }), 0);
    assert.equal(formatMacro({ goal: Number.NaN, current: Number.NaN }), 0);
  }

  // APP-009: useMeal and useMeals expose error states
  {
    const queryFailure = new Error('network down');
    const { useMeal } = load('app/hooks/queries/useMeal.ts', {
      '@app/services/MealsService': { MealsService: {} },
      '@app/types/Meal': { MealStatus: { UPLOADING: 'UPLOADING', QUEUED: 'QUEUED', PROCESSING: 'PROCESSING' } },
      '@tanstack/react-query': {
        useQuery: () => ({
          data: undefined,
          isFetching: false,
          isError: true,
          error: queryFailure,
          refetch: () => 'refetched-meal',
        }),
      },
    });
    const mealHookResult = useMeal('meal-1');
    assert.equal(mealHookResult.isError, true);
    assert.equal(mealHookResult.error, queryFailure);
    assert.equal(mealHookResult.refetch(), 'refetched-meal');

    const { useMeals } = load('app/hooks/queries/useMeals.ts', {
      '@app/services/MealsService': { MealsService: {} },
      '@tanstack/react-query': {
        keepPreviousData: Symbol('keepPreviousData'),
        useQuery: () => ({
          data: undefined,
          isLoading: false,
          isFetching: false,
          isError: true,
          error: queryFailure,
          refetch: () => 'refetched-meals',
        }),
      },
    });
    const mealsHookResult = useMeals(new Date('2026-10-18T12:00:00Z'));
    assert.equal(mealsHookResult.isError, true);
    assert.equal(mealsHookResult.error, queryFailure);
  }

  // APP-010: parseDecimal and schemas reject whitespace-only strings and accept Brazilian comma decimals
  {
    const { parseDecimal } = load('ui/utils/parseDecimal.ts');
    assert.equal(Number.isNaN(parseDecimal('')), true);
    assert.equal(Number.isNaN(parseDecimal('   ')), true);
    assert.equal(parseDecimal('10,5'), 10.5);
    assert.equal(parseDecimal(' 10.5 '), 10.5);

    const { editGoalsSchema } = load('ui/screens/EditGoals/schema.ts');
    assert.equal(editGoalsSchema.safeParse({
      calories: '   ',
      carbohydrates: '100',
      proteins: '100',
      fats: '50',
    }).success, false, 'whitespace-only goal must be rejected');

    const parsedGoals = editGoalsSchema.parse({
      calories: '2000,5',
      carbohydrates: ' 150,25 ',
      proteins: '120',
      fats: '0',
    });
    assert.equal(Number(parsedGoals.calories), 2000.5);
    assert.equal(Number(parsedGoals.carbohydrates), 150.25);

    const { editProfileSchema } = load('ui/screens/EditProfile/schema.ts', {
      '@app/types/Gender': { Gender: { MALE: 'MALE', FEMALE: 'FEMALE' } },
    });
    assert.equal(editProfileSchema.safeParse({
      name: 'Pessoa',
      birthDate: new Date('1995-05-10T00:00:00Z'),
      height: '   ',
      weight: '70,5',
      gender: 'MALE',
    }).success, false);
    const parsedProfile = editProfileSchema.parse({
      name: 'Pessoa',
      birthDate: new Date('1995-05-10T00:00:00Z'),
      height: '175,5',
      weight: '70,2',
      gender: 'MALE',
    });
    assert.equal(Number(parsedProfile.height), 175.5);
    assert.equal(Number(parsedProfile.weight), 70.2);
  }

  console.log('App auth & audit regressions: APP-002, APP-003, APP-004, APP-005, APP-008, APP-009, APP-010, ENG-001 OK');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
