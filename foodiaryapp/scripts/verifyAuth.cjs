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
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports,
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
    'react-native-base64': { decode: value => Buffer.from(value, 'base64').toString() },
  });
  assert.equal(Service.client.defaults.timeout, 15_000);
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
  Service.removeRefreshTokenHandler();
  Service.removeAccessToken();

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
      useState: () => [true, value => events.push(['state', value])],
    },
    'expo-splash-screen': { preventAutoHideAsync: async () => {} },
    '@app/hooks/queries/useAccount': { useAccount: () => ({ account: {}, loadAccount: async () => ({}) }) },
    '@app/lib/AuthTokensManager': { AuthTokensManager: {
      load: async () => null,
      save: async () => { if (saveFails) throw storageFailure; },
      clear: () => new Promise((_resolve, reject) => { rejectStorageClear = reject; }),
    } },
    '@app/services/AuthService': { AuthService: { signIn: async () => ({ accessToken: 'test', refreshToken: 'test' }) } },
    '@app/services/Service': { Service: {
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
  console.log('App auth: normalization, exact passwords, inline alert, error categories, timeout, refresh deduplication, storage-failure cleanup OK');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
