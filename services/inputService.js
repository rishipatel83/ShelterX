import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(
  __dirname,
  '..',
  'data',
  'shelterx-user-input-schema.json'
);

const getSchema = () => JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const getValue = (obj, dottedPath) =>
  dottedPath.split('.').reduce((current, key) => current?.[key], obj);

const setValue = (obj, dottedPath, value) => {
  const keys = dottedPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i += 1) {
    current[keys[i]] ??= {};
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
};

const convertValue = (value, type, definition) => {
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (type === 'integer') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : value;
  }

  if (type === 'string') {
    const text = String(value);
    return definition?.trim === false ? text : text.trim();
  }

  return value;
};

const validType = (value, type) => {
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'object') return value && typeof value === 'object' && !Array.isArray(value);
  return true;
};

const validateConstraints = (value, definition, pathName, errors) => {
  if (typeof value === 'number') {
    if (definition.min !== undefined && value < Number(definition.min)) {
      errors.push(`${pathName} must be >= ${definition.min}.`);
    }
    if (definition.max !== undefined && value > Number(definition.max)) {
      errors.push(`${pathName} must be <= ${definition.max}.`);
    }
    if (
      definition.exclusiveMin !== undefined &&
      value <= Number(definition.exclusiveMin)
    ) {
      errors.push(`${pathName} must be > ${definition.exclusiveMin}.`);
    }
    if (
      definition.exclusiveMax !== undefined &&
      value >= Number(definition.exclusiveMax)
    ) {
      errors.push(`${pathName} must be < ${definition.exclusiveMax}.`);
    }
  }

  if (typeof value === 'string') {
    if (definition.minLength !== undefined && value.length < definition.minLength) {
      errors.push(`${pathName} is too short.`);
    }
    if (definition.maxLength !== undefined && value.length > definition.maxLength) {
      errors.push(`${pathName} is too long.`);
    }
  }

  if (Array.isArray(definition.enum) && !definition.enum.includes(value)) {
    errors.push(`${pathName} must be one of: ${definition.enum.join(', ')}.`);
  }
};

export const validateShelterInput = (body = {}) => {
  const schema = getSchema();
  const normalized = {};
  const errors = [];

  const visit = (payload, prefix = '') => {
    for (const [key, definition] of Object.entries(payload)) {
      const pathName = prefix ? `${prefix}.${key}` : key;

      if (definition.type === 'object' && definition.fields) {
        const objectValue = getValue(body, pathName);

        if (
          definition.required &&
          (objectValue === undefined || objectValue === null)
        ) {
          errors.push(`${pathName} is required.`);
          continue;
        }

        if (objectValue !== undefined && objectValue !== null && !validType(objectValue, 'object')) {
          errors.push(`${pathName} must be object.`);
          continue;
        }

        visit(definition.fields, pathName);
        continue;
      }

      const rawValue = getValue(body, pathName);

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (definition.required) {
          errors.push(`${pathName} is required.`);
        }
        continue;
      }

      const converted = convertValue(rawValue, definition.type, definition);

      if (!validType(converted, definition.type)) {
        errors.push(`${pathName} must be ${definition.type}.`);
        continue;
      }

      validateConstraints(converted, definition, pathName, errors);
      setValue(normalized, pathName, converted);
    }
  };

  visit(schema.payload);

  return {
    normalized,
    errors,
    schemaVersion: schema.version
  };
};
