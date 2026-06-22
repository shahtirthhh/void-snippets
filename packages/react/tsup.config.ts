import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,

  // Every package here is treated as an external import in the output bundle —
  // it is NOT bundled inline. Three categories:
  //
  // 1. Required peers — always present in the consuming project
  //    react, @void-snippets/client, @tanstack/react-query
  //
  // 2. Optional peers — only present if the consumer uses that feature
  //    socket.io-client  →  createSocketHooks
  //    react-router      →  createRouteContract / useTypedSearchParams
  //    Marking these external keeps them out of the bundle even when
  //    installed in devDependencies for our own build/type-checking.
  //
  // 3. Workspace packages — resolved at install time in the consuming project
  //    @void-snippets/core
  //
  // Bundling any of these inline would either bloat the output or, worse,
  // create a second instance of the package inside the library (breaking
  // React context, router context, query client context, etc.).
  external: [
    "react",
    "react/jsx-runtime",
    "@void-snippets/core",
    "@void-snippets/client",
    "@tanstack/react-query",
    "socket.io-client",
    "react-router",
  ],
});
