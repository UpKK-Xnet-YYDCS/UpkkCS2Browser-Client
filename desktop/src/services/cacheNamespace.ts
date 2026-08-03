export class CacheNamespace {
  #revision = 0;

  key(scope: string, authenticated: boolean, key: string): string {
    return `${this.#revision}\0${scope}\0${authenticated ? 'auth' : 'anon'}\0${key}`;
  }

  invalidate(): void {
    this.#revision += 1;
  }
}
