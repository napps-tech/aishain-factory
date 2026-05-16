import { CodexJsonRpcClient } from '../../workflow/providers/codex-json-rpc.js'
import { buildScreenImagePrompt } from '../image-prompt.js'
import type { ScreenSpec } from '../types.js'

type CodexScreenImageGeneratorOptions = {
  cwd: string
  timeoutMs?: number
  url: string
}

export class CodexScreenImageGenerator {
  constructor(private readonly options: CodexScreenImageGeneratorOptions) {}

  async generate(screen: ScreenSpec) {
    return this.generateFromPrompt(buildScreenImagePrompt(screen))
  }

  async generateFromPrompt(prompt: string) {
    const client = new CodexJsonRpcClient(this.options)

    try {
      return await client.generateImage(prompt)
    } finally {
      client.close()
    }
  }
}
