import type { WorkflowStep } from '../workflow/index.js'

export const buildDatabaseDesignPrompt = (workflowSteps: WorkflowStep[]) => `
あなたは業務システムのデータベース設計者です。
次の業務フローを元に、必要なテーブル設計を作ってください。

制約:
- 4から7個のテーブルにしてください。
- テーブル名とカラム名は snake_case の英語にしてください。
- displayName はER図に表示する短い日本語名にしてください。
- 各テーブルには id 主キーを含めてください。
- 外部キーは references に "table.column" 形式で入れてください。
- 出力はJSONだけにしてください。
- Markdownや説明文は含めないでください。

JSON schema:
{
  "tables": [
    {
      "name": "inquiries",
      "displayName": "問い合わせ",
      "description": "問い合わせを管理する",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "description": "主キー",
          "isPrimaryKey": true
        },
        {
          "name": "customer_id",
          "type": "uuid",
          "description": "顧客ID",
          "references": "customers.id"
        }
      ]
    }
  ]
}

業務フロー:
${workflowSteps.map((step, index) => `${index + 1}. ${step.actor}が${formatScreen(step.screen)}${step.action}`).join('\n')}
`.trim()

const formatScreen = (screen: string) => (screen ? `${screen}で` : '')
