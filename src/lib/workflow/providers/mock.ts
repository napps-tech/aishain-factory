import type {
  WorkflowGenerationInput,
  WorkflowGenerationResult,
  WorkflowGenerator,
} from '../types.js'

export class MockWorkflowGenerator implements WorkflowGenerator {
  async generate(input: WorkflowGenerationInput): Promise<WorkflowGenerationResult> {
    const target = summarize(input.projectText)

    return {
      source: 'mock',
      steps: [
        { actor: '利用者', screen: '依頼登録', action: `${target}を依頼する` },
        { actor: '受付担当者', screen: '依頼受付', action: '依頼内容を確認する' },
        { actor: 'システム', screen: '情報整理', action: '必要な情報を整理して記録する' },
        { actor: '担当者', screen: '対応管理', action: '対応状況を更新する' },
        { actor: '管理者', screen: '進捗確認', action: '進捗と結果を確認する' },
      ],
    }
  }
}

const summarize = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return '業務'
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized
}
