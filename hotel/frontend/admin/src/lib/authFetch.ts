type TokenStore = {
  getValidToken: () => Promise<string | null>;
  logout: () => void;
};

let currentStore: TokenStore | null = null;

export function setTokenStore(store: TokenStore) {
  currentStore = store;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!currentStore) {
    return fetch(url, options);
  }

  const token = await currentStore.getValidToken();
  if (!token) {
    currentStore.logout();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const refreshResult = await currentStore.getValidToken();
    if (!refreshResult) {
      currentStore.logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    headers.set('Authorization', `Bearer ${refreshResult}`);
    return fetch(url, { ...options, headers });
  }

  return res;
}
