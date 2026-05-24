const HISTORY_API_URL = '/api/history';

export interface HistoryRecord {
  id: number;
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
  const response = await fetch(`${HISTORY_API_URL}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`保存历史记录失败: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

export async function queryHistory(params: QueryHistoryParams = {}): Promise<{
  records: HistoryRecord[];
  count: number;
  limit: number;
  offset: number;
}> {
  const searchParams = new URLSearchParams();
  
  if (params.model) searchParams.append('model', params.model);
  if (params.generate_type) searchParams.append('generate_type', params.generate_type);
  if (params.prompt_keyword) searchParams.append('prompt_keyword', params.prompt_keyword);
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await fetch(`${HISTORY_API_URL}/query?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`查询历史记录失败: ${response.status}`);
  }

  return response.json();
}

export async function getHistoryById(id: number): Promise<HistoryRecord> {
  const response = await fetch(`${HISTORY_API_URL}/${id}`);

  if (!response.ok) {
    throw new Error(`获取历史记录失败: ${response.status}`);
  }

  return response.json();
}

export async function deleteHistory(id: number): Promise<void> {
  const response = await fetch(`${HISTORY_API_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`删除历史记录失败: ${response.status}`);
  }
}

export function getHistoryImageUrl(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  return `${HISTORY_API_URL}/images/${path}`;
}

export async function getModels(): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${HISTORY_API_URL.replace('/history', '/models')}`);
  
  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.status}`);
  }

  const data = await response.json();
  return data.models;
}

export async function getGenerateTypes(): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${HISTORY_API_URL.replace('/history', '/generate-types')}`);
  
  if (!response.ok) {
    throw new Error(`获取生成类型列表失败: ${response.status}`);
  }

  const data = await response.json();
  return data.types;
}
