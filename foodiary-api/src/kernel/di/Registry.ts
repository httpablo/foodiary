type Constructor<T = any> = new (...args: any) => T;

export class Registry {
  private readonly providers = new Map<string, Registry.Provider>();

  register(impl: Constructor) {
    const token = impl.name;
    if (this.providers.has(token)) {
      throw new Error(`Provider with token ${token} is already registered.`);
    }
    this.providers.set(token, { impl });
  }

  resolve<TImpl extends Constructor>(impl: TImpl): InstanceType<TImpl> {
    const token = impl.name;
    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`Provider with token ${token} is not registered.`);
    }

    const instance = new provider.impl();

    return instance;
  }
}

export namespace Registry {
  export type Provider = {
    impl: Constructor;
  };
}
