// CSS side-effect imports (e.g. @import "tailwindcss") don't carry type info.
// TypeScript 6 enforces this; declare an empty module so the import is valid.
declare module "*.css" {}

// Ensure the global `google` namespace from @types/google.maps is available
// across the project without needing per-file /// <reference> directives.
/// <reference types="google.maps" />
