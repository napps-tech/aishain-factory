import { CodexDatabaseDesigner } from './providers/codex.js'
import { MockDatabaseDesigner } from './providers/mock.js'
import type { DatabaseDesigner } from './types.js'

export type { DatabaseDesigner, DatabaseTable, TableColumn } from './types.js'

export const createDatabaseDesigner = (): DatabaseDesigner => {
  if (process.env.DATABASE_PROVIDER === 'mock') {
    return new MockDatabaseDesigner()
  }

  return new CodexDatabaseDesigner({
    cwd: process.cwd(),
    timeoutMs: Number(process.env.CODEX_DATABASE_TIMEOUT_MS ?? 120_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })
}
