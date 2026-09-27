import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Material from '../models/material.js';
import Supplier from '../models/supplier.js';
import MaterialProduct from '../models/materialProduct.js';
import MaterialPrice from '../models/materialPrice.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const MATERIALS_FILE = path.join(ROOT, 'data', 'materials', 'materials.csv');
const PRICES_FILE = path.join(ROOT, 'data', 'materials', 'prices.csv');

function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = (values[index] ?? '').trim();
    });
    return obj;
  });
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRange(value) {
  if (!value) return { min: null, max: null };

  const cleaned = String(value).replace(/[–—]/g, '-').trim();

  if (cleaned.includes('-')) {
    const [a, b] = cleaned.split('-', 2).map((part) => Number(part.trim()));
    return {
      min: Number.isFinite(a) ? a : null,
      max: Number.isFinite(b) ? b : null
    };
  }

  const num = Number(cleaned);
  return Number.isFinite(num)
    ? { min: num, max: num }
    : { min: null, max: null };
}

function parseRegion(region) {
  if (!region) {
    return { city: null, state: null, country: 'India' };
  }

  const value = region.trim();

  if (value.toLowerCase() === 'india') {
    return { city: null, state: null, country: 'India' };
  }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts[0],
      state: parts.slice(1).join(', '),
      country: 'India'
    };
  }

  return { city: null, state: value, country: 'India' };
}

function parseGstPercent(gstNote) {
  if (!gstNote) return null;
  const match = String(gstNote).match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function parsePieceDimensions(productName, notes) {
  const text = `${productName || ''} ${notes || ''}`;

  // Example: "1000 x 600 x 50 mm" (all dimensions in mm)
  let match = text.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm/i
  );

  if (match) {
    const lengthM = Number(match[1]) / 1000;
    const widthM = Number(match[2]) / 1000;
    const thicknessMm = Number(match[3]);

    return {
      pieceLengthM: lengthM,
      pieceWidthM: widthM,
      pieceThicknessMm: thicknessMm,
      coverageAreaM2: lengthM * widthM,
      volumeM3PerPiece: lengthM * widthM * (thicknessMm / 1000)
    };
  }

  // Example: "1m x 700mm x 10mm"
  match = text.match(
    /(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm/i
  );

  if (match) {
    const lengthM = Number(match[1]);
    const widthM = Number(match[2]) / 1000;
    const thicknessMm = Number(match[3]);

    return {
      pieceLengthM: lengthM,
      pieceWidthM: widthM,
      pieceThicknessMm: thicknessMm,
      coverageAreaM2: lengthM * widthM,
      volumeM3PerPiece: lengthM * widthM * (thicknessMm / 1000)
    };
  }

  return {
    pieceLengthM: null,
    pieceWidthM: null,
    pieceThicknessMm: null,
    coverageAreaM2: null,
    volumeM3PerPiece: null
  };
}

async function importMaterials() {
  const rows = readCsv(MATERIALS_FILE);
  let imported = 0;

  for (const row of rows) {
    if (!row.material_id || !row.frontend_family || !row.material_name) {
      console.warn('Skipping incomplete material row:', row.material_id || '(no id)');
      continue;
    }

    await Material.findOneAndUpdate(
      { materialCode: row.material_id },
      {
        $set: {
          family: row.frontend_family,
          name: row.material_name,
          baseMaterial: row.base_material || null,
          thermalConductivityWmK: numberOrNull(row.thermal_conductivity_w_mk),
          conductivityReferenceTempC: numberOrNull(row.conductivity_reference_temp_c),
          densityKgM3: numberOrNull(row.density_kg_m3),
          densityBasis: row.density_basis || null,
          specificHeatJKgK: numberOrNull(row.specific_heat_j_kgk),
          sourceOrg: row.source_org || null,
          sourceTitle: row.source_title || null,
          sourceUrl: row.source_url || null,
          sourceType: row.source_type || null,
          isActive: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    imported += 1;
  }

  return imported;
}

async function importPrices() {
  const rows = readCsv(PRICES_FILE);
  let imported = 0;

  for (const row of rows) {
    if (
      !row.price_id ||
      !row.price_family ||
      !row.supplier ||
      !row.product_name ||
      !row.price_inr ||
      !row.price_unit
    ) {
      console.warn('Skipping incomplete price row:', row.price_id || '(no id)');
      continue;
    }

    const location = parseRegion(row.region);

    const supplier = await Supplier.findOneAndUpdate(
      {
        name: row.supplier,
        city: location.city,
        state: location.state,
        country: location.country
      },
      {
        $set: {
          website: null,
          isActive: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const thickness = parseRange(row.thickness_mm);
    const density = parseRange(row.density_kg_m3);
    const piece = parsePieceDimensions(row.product_name, row.notes);

    const product = await MaterialProduct.findOneAndUpdate(
      {
        supplierId: supplier._id,
        productName: row.product_name
      },
      {
        $set: {
          externalProductCode: row.price_id,
          materialId: null,
          priceFamily: row.price_family,
          thicknessMinMm: thickness.min,
          thicknessMaxMm: thickness.max,
          densityMinKgM3: density.min,
          densityMaxKgM3: density.max,
          ...piece,
          sourceProductUrl: row.source_url || null,
          availabilityStatus: null,
          notes: row.notes || null,
          isActive: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    await MaterialPrice.findOneAndUpdate(
      { externalPriceCode: row.price_id },
      {
        $set: {
          productId: product._id,
          priceInr: numberOrNull(row.price_inr),
          priceUnit: row.price_unit,
          currency: 'INR',
          gstPercent: parseGstPercent(row.gst_note),
          minimumOrderQty: null,
          minimumOrderUnit: null,
          region: row.region || null,
          city: location.city,
          state: location.state,
          country: location.country,
          sourceUrl: row.source_url || null,
          sourceCheckedAt: dateOrNull(row.source_checked_date),
          validFrom: dateOrNull(row.source_checked_date),
          validUntil: null,
          matchType: row.match_type || null,
          notes: row.notes || null,
          isActive: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    imported += 1;
  }

  return imported;
}

async function main() {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is missing. Add the same MongoDB connection string used by your backend to backend/.env.'
    );
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected.');

  const materialCount = await importMaterials();
  const priceCount = await importPrices();

  const totals = {
    materials: await Material.countDocuments({}),
    suppliers: await Supplier.countDocuments({}),
    products: await MaterialProduct.countDocuments({}),
    prices: await MaterialPrice.countDocuments({})
  };

  console.log('');
  console.log('ShelterX import completed.');
  console.log(`Materials processed: ${materialCount}`);
  console.log(`Price rows processed: ${priceCount}`);
  console.log('MongoDB totals:', totals);
}

main()
  .catch((error) => {
    console.error('');
    console.error('Import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
