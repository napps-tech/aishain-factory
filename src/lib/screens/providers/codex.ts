import type { DatabaseTable } from '../../database/index.js'
import { CodexJsonRpcClient } from '../../workflow/providers/codex-json-rpc.js'
import { parseScreenPlanJson } from '../parse.js'
import { buildScreenPlanPrompt } from '../prompt.js'
import type { ScreenPlanInput, ScreenPlanResult, ScreenPlanner } from '../types.js'

type CodexScreenPlannerOptions = {
  cwd: string
  timeoutMs?: number
  url: string
}

export class CodexScreenPlanner implements ScreenPlanner {
  constructor(private readonly options: CodexScreenPlannerOptions) {}

  async plan(input: ScreenPlanInput): Promise<ScreenPlanResult> {
    const client = new CodexJsonRpcClient(this.options)

    try {
      const text = await client.generateText(
        buildScreenPlanPrompt(
          input.workflowSteps,
          (input.tables ?? []) as DatabaseTable[],
        ),
      )
      const screens = parseScreenPlanJson(text)

      if (screens.length === 0) {
        throw new Error('Codex server returned no screens')
      }

      return {
        screens,
        source: 'codex-server',
      }
    } finally {
      client.close()
    }
  }
}
