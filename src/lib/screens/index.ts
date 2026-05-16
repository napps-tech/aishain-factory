import { CodexScreenPlanner } from './providers/codex.js'
import { CodexScreenImageGenerator } from './providers/codex-image.js'
import { MockScreenPlanner } from './providers/mock.js'
import type { ScreenPlanner } from './types.js'

export { createScreenImage } from './screen-image.js'
export type { ScreenElement, ScreenPlanResult, ScreenPlanner, ScreenSpec } from './types.js'

export const createScreenPlanner = (): ScreenPlanner => {
  if (process.env.SCREEN_PROVIDER === 'mock') {
    return new MockScreenPlanner()
  }

  return new CodexScreenPlanner({
    cwd: process.cwd(),
    timeoutMs: Number(process.env.CODEX_SCREEN_TIMEOUT_MS ?? 120_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })
}

export const createScreenImageGenerator = () =>
  new CodexScreenImageGenerator({
    cwd: process.cwd(),
    timeoutMs: Number(process.env.CODEX_SCREEN_IMAGE_TIMEOUT_MS ?? 180_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })
