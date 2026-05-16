import { buildWorkflowPrompt } from '../prompt.js'
import { parseWorkflowJson } from '../parse.js'
import type {
  WorkflowGenerationInput,
  WorkflowGenerationResult,
  WorkflowGenerator,
} from '../types.js'
import { CodexJsonRpcClient } from './codex-json-rpc.js'

type CodexWorkflowGeneratorOptions = {
  cwd: string
  timeoutMs?: number
  url: string
}

export class CodexWorkflowGenerator implements WorkflowGenerator {
  constructor(private readonly options: CodexWorkflowGeneratorOptions) {}

  async generate(input: WorkflowGenerationInput): Promise<WorkflowGenerationResult> {
    const client = new CodexJsonRpcClient(this.options)

    try {
      const text = await client.generateText(buildWorkflowPrompt(input.projectText))
      const steps = parseWorkflowJson(text)

      if (steps.length === 0) {
        throw new Error('Codex server returned no workflow steps')
      }

      return {
        source: 'codex-server',
        steps,
      }
    } finally {
      client.close()
    }
  }
}
