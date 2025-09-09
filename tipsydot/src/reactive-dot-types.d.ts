import type { config } from "./reactive-dot.ts";

declare module "@reactive-dot/core" {
  export interface Register {
    config: typeof config;
  }
}
