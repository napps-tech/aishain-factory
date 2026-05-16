import { createErImage } from '../er-image.js'
import type {
  DatabaseDesignInput,
  DatabaseDesignResult,
  DatabaseDesigner,
  DatabaseTable,
} from '../types.js'

export class MockDatabaseDesigner implements DatabaseDesigner {
  async design(_input: DatabaseDesignInput): Promise<DatabaseDesignResult> {
    const tables: DatabaseTable[] = [
      {
        name: 'customers',
        displayName: '顧客',
        description: '問い合わせを行う顧客を管理する',
        columns: [
          { name: 'id', type: 'uuid', description: '主キー', isPrimaryKey: true },
          { name: 'name', type: 'varchar', description: '顧客名' },
          { name: 'email', type: 'varchar', description: 'メールアドレス' },
        ],
      },
      {
        name: 'inquiries',
        displayName: '問い合わせ',
        description: '顧客からの問い合わせを管理する',
        columns: [
          { name: 'id', type: 'uuid', description: '主キー', isPrimaryKey: true },
          {
            name: 'customer_id',
            type: 'uuid',
            description: '顧客ID',
            references: 'customers.id',
          },
          { name: 'subject', type: 'varchar', description: '件名' },
          { name: 'status', type: 'varchar', description: '対応状況' },
        ],
      },
      {
        name: 'assignments',
        displayName: '担当割り当て',
        description: '問い合わせの担当割り当てを管理する',
        columns: [
          { name: 'id', type: 'uuid', description: '主キー', isPrimaryKey: true },
          {
            name: 'inquiry_id',
            type: 'uuid',
            description: '問い合わせID',
            references: 'inquiries.id',
          },
          { name: 'assignee_name', type: 'varchar', description: '担当者名' },
        ],
      },
      {
        name: 'status_histories',
        displayName: '対応履歴',
        description: '対応状況の履歴を管理する',
        columns: [
          { name: 'id', type: 'uuid', description: '主キー', isPrimaryKey: true },
          {
            name: 'inquiry_id',
            type: 'uuid',
            description: '問い合わせID',
            references: 'inquiries.id',
          },
          { name: 'status', type: 'varchar', description: '状態' },
          { name: 'memo', type: 'text', description: '対応メモ' },
        ],
      },
    ]

    return {
      imageSrc: createErImage(tables),
      source: 'mock',
      tables,
    }
  }
}
