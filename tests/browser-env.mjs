// Minimal browser globals for the auth client code under node:test.
const store = () => {
    const data = new Map();
    return {
        getItem: (k) => (data.has(k) ? data.get(k) : null),
        setItem: (k, v) => data.set(k, String(v)),
        removeItem: (k) => data.delete(k),
        clear: () => data.clear(),
        key: (i) => [...data.keys()][i] ?? null,
        get length() { return data.size; },
        _keys: () => [...data.keys()],
    };
};

export const installBrowserEnv = () => {
    const localStorage = store();
    const sessionStorage = store();
    // Object.keys(localStorage) must list stored keys, like a real Storage.
    const localProxy = new Proxy(localStorage, {
        ownKeys: () => localStorage._keys(),
        getOwnPropertyDescriptor: (t, k) =>
            localStorage._keys().includes(k) ? { enumerable: true, configurable: true, value: localStorage.getItem(k) } : undefined,
    });
    const cookieWrites = [];
    const navigations = [];

    globalThis.window = { location: { replace: (url) => navigations.push(url) } };
    globalThis.localStorage = localProxy;
    globalThis.sessionStorage = sessionStorage;
    const element = () => ({ setAttribute() {}, appendChild() {}, styleSheet: null });
    globalThis.document = {
        // sonner (imported via lib/commonFunctions) injects its CSS on load.
        head: element(),
        getElementsByTagName: () => [element()],
        createElement: element,
        createTextNode: () => ({}),
        get cookie() { return ""; },
        set cookie(v) { cookieWrites.push(v); },
    };

    return { localStorage: localProxy, sessionStorage, cookieWrites, navigations };
};
