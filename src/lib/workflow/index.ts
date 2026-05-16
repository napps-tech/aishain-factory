import { CodexWorkflowGenerator } from './providers/codex.js'
import { MockWorkflowGenerator } from './providers/mock.js'
import type { WorkflowGenerator } from './types.js'

export type { WorkflowGenerator, WorkflowStep } from './types.js'

export const createWorkflowGenerator = (): WorkflowGenerator => {
  if (process.env.WORKFLOW_PROVIDER === 'mock') {
    return new MockWorkflowGenerator()
  }

  return new CodexWorkflowGenerator({
    cwd: process.cwd(),
    timeoutMs: Number(process.env.CODEX_WORKFLOW_TIMEOUT_MS ?? 120_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })
}
