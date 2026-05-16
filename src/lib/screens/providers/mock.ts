import type {
  ScreenPlanInput,
  ScreenPlanResult,
  ScreenPlanner,
  ScreenSpec,
} from '../types.js'

export class MockScreenPlanner implements ScreenPlanner {
  async plan(_input: ScreenPlanInput): Promise<ScreenPlanResult> {
    const screens: ScreenSpec[] = [
      {
        id: 'inquiry_create',
        name: '問い合わせ登録',
        summary: '利用者が問い合わせ内容を登録する画面',
        elements: [
          { name: '件名', type: 'input', description: '問い合わせの件名を入力する' },
          { name: '本文', type: 'input', description: '問い合わせ内容を入力する' },
          { name: '送信', type: 'button', description: '問い合わせを登録する' },
        ],
      },
      {
        id: 'inquiry_list',
        name: '問い合わせ一覧',
        summary: '受付担当者が問い合わせを確認する画面',
        elements: [
          { name: 'ステータス絞り込み', type: 'filter', description: '状態で問い合わせを絞り込む' },
          { name: '問い合わせ表', type: 'table', description: '問い合わせの一覧を表示する' },
          { name: '詳細', type: 'button', description: '問い合わせ詳細へ移動する' },
        ],
      },
      {
        id: 'inquiry_detail',
        name: '問い合わせ詳細',
        summary: '担当者が対応状況を更新する画面',
        elements: [
          { name: '問い合わせ内容', type: 'detail', description: '登録された問い合わせ内容を表示する' },
          { name: '対応状況', type: 'status', description: '現在の対応状態を選ぶ' },
          { name: '更新', type: 'button', description: '対応状況を保存する' },
        ],
      },
      {
        id: 'admin_dashboard',
        name: '管理ダッシュボード',
        summary: '管理者が進捗と結果を確認する画面',
        elements: [
          { name: '進捗サマリー', type: 'status', description: '対応状況の件数を表示する' },
          { name: '担当者別一覧', type: 'table', description: '担当者ごとの状況を表示する' },
          { name: '期間フィルター', type: 'filter', description: '確認期間を指定する' },
        ],
      },
    ]

    return { screens, source: 'mock' }
  }
}
