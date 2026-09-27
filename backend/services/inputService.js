import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '..', 'data', 'user-input-schema.json');

export const getInputSchema = () =>
  JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const getAtPath = (obj, dottedPath) =>
  dottedPath.split('.').reduce((acc, key) => acc?.[key], obj);

const setAtPath = (obj, dottedPath, value) => {
  const parts = dottedPath.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor[parts[i]] ??= {};
    cursor = cursor[parts[i]];
  }
  cursor[parts.at(-1)] = value;
};

const coerce = (value, type) => {
  if (value === undefined || value === null || value === '') return value;

  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (type === 'integer') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : value;
  }

  if (type === 'string') return String(value);

  return value;
};

const typeOk = (value, type) => {
  if (value === undefined || value === null || value === '') return true;
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return Number.isInteger(value);
  return true;
};

export const normalizeAndValidate = (body = {}) => {
  const schema = getInputSchema();
  const normalized = {};
  const errors = [];

  for (const field of schema.fields) {
    const raw = getAtPath(body, field.path);

    if ((raw === undefined || raw === null || raw === '') && field.required) {
      errors.push(`${field.path} is required.`);
      continue;
    }

    if (raw === undefined || raw === null || raw === '') {
      continue;
    }

    const value = coerce(raw, field.type);

    if (!typeOk(value, field.type)) {
      errors.push(`${field.path} must be ${field.type}.`);
      continue;
    }

    setAtPath(normalized, field.path, value);
  }

  // Preserve future frontend fields without forcing backend rewrites.
  // Known fields above are normalized; unknown fields are stored under extra.
  const knownTopLevel = new Set(schema.fields.map(f => f.path.split('.')[0]));
  const extra = {};
  for (const [key, value] of Object.entries(body)) {
    if (!knownTopLevel.has(key)) extra[key] = value;
  }
  if (Object.keys(extra).length) normalized.extra = extra;

  return { normalized, errors, schemaVersion: schema.version };
};
