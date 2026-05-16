import type { WorkflowStep } from '../workflow/index.js'

export type TableColumn = {
  name: string
  type: string
  description: string
  isPrimaryKey?: boolean
  references?: string
}

export type DatabaseTable = {
  name: string
  displayName?: string
  description: string
  columns: TableColumn[]
}

export type DatabaseDesignInput = {
  workflowSteps: WorkflowStep[]
}

export type DatabaseDesignResult = {
  imageSrc: string
  source: string
  tables: DatabaseTable[]
}

export interface DatabaseDesigner {
  design(input: DatabaseDesignInput): Promise<DatabaseDesignResult>
}
