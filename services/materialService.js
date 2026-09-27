import Material from '../models/material.js';

const cleanCode = (value) =>
  typeof value === 'string' ? value.trim() : '';

export const getValidatedMaterialByCode = async (materialCode) => {
  const code = cleanCode(materialCode);

  if (!code) {
    throw new Error('materialCode is required.');
  }

  const material = await Material.findOne({
    materialCode: code,
    isActive: true
  }).lean();

  if (!material) {
    return null;
  }

  const conductivity = Number(material.thermalConductivityWmK);
  if (!Number.isFinite(conductivity) || conductivity <= 0) {
    return {
      usableForThermalSimulation: false,
      reason: 'The selected material does not have a valid thermal conductivity.',
      material
    };
  }

  return {
    usableForThermalSimulation: true,
    material: {
      id: material._id?.toString?.() ?? null,
      materialCode: material.materialCode,
      family: material.family,
      name: material.name,
      thermalConductivityWmK: conductivity,
      conductivityReferenceTempC: material.conductivityReferenceTempC ?? null,
      densityKgM3: material.densityKgM3 ?? null,
      specificHeatJKgK: material.specificHeatJKgK ?? null,
      source: {
        org: material.sourceOrg ?? null,
        title: material.sourceTitle ?? null,
        url: material.sourceUrl ?? null,
        type: material.sourceType ?? null,
        verifiedAt: material.verifiedAt ?? null
      }
    }
  };
};

export const listValidatedMaterials = async () => {
  const materials = await Material.find({
    isActive: true,
    materialCode: { $exists: true, $nin: [null, ''] },
    thermalConductivityWmK: { $gt: 0 }
  })
    .sort({ family: 1, name: 1 })
    .lean();

  return materials.map((material) => ({
    materialCode: material.materialCode,
    family: material.family,
    name: material.name,
    thermalConductivityWmK: material.thermalConductivityWmK,
    conductivityReferenceTempC: material.conductivityReferenceTempC ?? null,
    densityKgM3: material.densityKgM3 ?? null,
    specificHeatJKgK: material.specificHeatJKgK ?? null,
    source: {
      org: material.sourceOrg ?? null,
      title: material.sourceTitle ?? null,
      url: material.sourceUrl ?? null,
      type: material.sourceType ?? null,
      verifiedAt: material.verifiedAt ?? null
    }
  }));
};

export default {
  getValidatedMaterialByCode,
  listValidatedMaterials
};
