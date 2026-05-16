import { CodexJsonRpcClient } from '../../workflow/providers/codex-json-rpc.js'
import { createErImage } from '../er-image.js'
import { parseDatabaseDesignJson } from '../parse.js'
import { buildDatabaseDesignPrompt } from '../prompt.js'
import type {
  DatabaseDesignInput,
  DatabaseDesignResult,
  DatabaseDesigner,
} from '../types.js'

type CodexDatabaseDesignerOptions = {
  cwd: string
  timeoutMs?: number
  url: string
}

export class CodexDatabaseDesigner implements DatabaseDesigner {
  constructor(private readonly options: CodexDatabaseDesignerOptions) {}

  async design(input: DatabaseDesignInput): Promise<DatabaseDesignResult> {
    const client = new CodexJsonRpcClient(this.options)

    try {
      const text = await client.generateText(
        buildDatabaseDesignPrompt(input.workflowSteps),
      )
      const tables = parseDatabaseDesignJson(text)

      if (tables.length === 0) {
        throw new Error('Codex server returned no database tables')
      }

      return {
        imageSrc: createErImage(tables),
        source: 'codex-server',
        tables,
      }
    } finally {
      client.close()
    }
  }
}
