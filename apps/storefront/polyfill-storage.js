const storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = storage
}
if (typeof globalThis.sessionStorage === "undefined") {
  globalThis.sessionStorage = storage
}
