import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CareerLibrary, IndustryLibrary, MajorLibrary, Questionnaire } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 默认指向仓库根的 data/（dev 与 dist 下相对路径一致）。
// 某些托管平台只部署 backend 子目录、或目录结构不同，可用 DATA_DIR 显式覆盖。
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../../data');

const cache = new Map<string, unknown>();

async function loadJson<T>(filename: string): Promise<T> {
  const hit = cache.get(filename);
  if (hit) return hit as T;
  const full = path.join(DATA_DIR, filename);
  const text = await readFile(full, 'utf8');
  const data = JSON.parse(text);
  cache.set(filename, data);
  return data as T;
}

export function loadQuestionnaire(mode: 'quick' | 'deep'): Promise<Questionnaire> {
  const file =
    mode === 'quick'
      ? 'student_profile_quick_16_questionnaire.json'
      : 'student_profile_deep_60_questionnaire.json';
  return loadJson<Questionnaire>(file);
}

export function loadIndustryLibrary(): Promise<IndustryLibrary> {
  return loadJson<IndustryLibrary>('industry_library_v1_3.json');
}

export function loadCareerLibrary(): Promise<CareerLibrary> {
  return loadJson<CareerLibrary>('career_path_library_v1_1.json');
}

export function loadMajorLibrary(): Promise<MajorLibrary> {
  return loadJson<MajorLibrary>('major_library_v1_0.json');
}
