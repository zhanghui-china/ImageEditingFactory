import { db, type HistoryRecord } from './db';

export type { HistoryRecord };

export interface SaveHistoryParams {
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

export interface QueryHistoryParams {
  model?: string;
  generate_type?: string;
  prompt_keyword?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function saveHistory(params: SaveHistoryParams): Promise<number> {
  const id = await db.history.add(params as HistoryRecord);
  return id as number;
}

export async function queryHistory(params: QueryHistoryParams = {}): Promise<{
  records: HistoryRecord[];
  count: number;
  limit: number;
  offset: number;
}> {
  let collection = db.history.orderBy('request_time').reverse();

  const allRecords = await collection.toArray();

  let filtered = allRecords;

  if (params.model) {
    filtered = filtered.filter((r) => r.model === params.model);
  }

  if (params.generate_type) {
    filtered = filtered.filter((r) => r.generate_type === params.generate_type);
  }

  if (params.prompt_keyword) {
    const keyword = params.prompt_keyword.toLowerCase();
    filtered = filtered.filter(
      (r) => r.prompt && r.prompt.toLowerCase().includes(keyword)
    );
  }

  if (params.start_date) {
    filtered = filtered.filter((r) => r.request_time >= params.start_date!);
  }

  if (params.end_date) {
    filtered = filtered.filter((r) => r.request_time <= params.end_date!);
  }

  const count = filtered.length;
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const records = filtered.slice(offset, offset + limit);

  return { records, count, limit, offset };
}

export async function getHistoryById(id: number): Promise<HistoryRecord> {
  const record = await db.history.get(id);
  if (!record) {
    throw new Error(`历史记录不存在: ${id}`);
  }
  return record;
}

export async function deleteHistory(id: number): Promise<void> {
  await db.history.delete(id);
}

export function getHistoryImageUrl(path: string): string {
  if (path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return path;
}

export async function getModels(): Promise<Array<{ id: string; name: string }>> {
  const allRecords = await db.history.toArray();
  const modelSet = new Set<string>();
  allRecords.forEach((r) => modelSet.add(r.model));

  return Array.from(modelSet).map((id) => ({ id, name: id }));
}

export async function getGenerateTypes(): Promise<Array<{ id: string; name: string }>> {
  const typeSet = new Set<string>();
  const allRecords = await db.history.toArray();
  allRecords.forEach((r) => typeSet.add(r.generate_type));

  return Array.from(typeSet).map((id) => ({ id, name: id }));
}
