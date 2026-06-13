import Dexie, { type Table } from 'dexie';

export interface HistoryRecord {
  id?: number;
  model: string;
  generate_type: string;
  prompt: string;
  request_images: string[];
  response_result: string;
  response_images: string[];
  request_time: string;
  response_time: string;
  duration_ms: number;
}

export interface ConfigRecord {
  key: string;
  value: any;
}

class AppDatabase extends Dexie {
  history!: Table<HistoryRecord, number>;
  config!: Table<ConfigRecord, string>;

  constructor() {
    super('sensenova-app-db');

    this.version(1).stores({
      history: '++id, model, generate_type, request_time, prompt',
      config: 'key',
    });
  }
}

export const db = new AppDatabase();

export async function saveConfig(key: string, value: any): Promise<void> {
  await db.config.put({ key, value });
}

export async function getConfig(key: string): Promise<any> {
  const record = await db.config.get(key);
  return record?.value;
}

export async function getAllConfig(): Promise<Record<string, any>> {
  const records = await db.config.toArray();
  const result: Record<string, any> = {};
  for (const record of records) {
    result[record.key] = record.value;
  }
  return result;
}

export async function clearAllConfig(): Promise<void> {
  await db.config.clear();
}
