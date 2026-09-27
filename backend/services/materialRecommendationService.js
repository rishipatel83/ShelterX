/**
 * materialRecommendationService.js
 * 
 * Dynamically computes ranked material recommendations based on geographic
 * location, latitude/longitude, local microclimate, ambient temperature,
 * shelter dimensions, and wall thickness.
 */

export const detectClimateZone = ({ location = '', lat, lon, ambientTemp }) => {
  const loc = (typeof location === 'string' ? location : '').toLowerCase();
  const temp = typeof ambientTemp === 'number' && Number.isFinite(ambientTemp) ? ambientTemp : -10;
  const latitude = typeof lat === 'number' && Number.isFinite(lat) ? lat : null;
  const longitude = typeof lon === 'number' && Number.isFinite(lon) ? lon : null;

  // 1. Extreme Sub-Zero Glacial (Siachen, high glacier passes, temp <= -18°C)
  if (
    loc.includes('siachen') ||
    loc.includes('glacier') ||
    loc.includes('dras') ||
    temp <= -18 ||
    (latitude !== null && latitude >= 35.0 && longitude !== null && longitude >= 76.5 && temp <= -10)
  ) {
    return 'EXTREME_SUBZERO_GLACIAL';
  }

  // 2. High-Altitude Cold Arid (Ladakh, Leh, Spiti, cold plateau, temp <= 2°C)
  if (
    loc.includes('ladakh') ||
    loc.includes('leh') ||
    loc.includes('spiti') ||
    loc.includes('kargil') ||
    loc.includes('pangong') ||
    loc.includes('changthang') ||
    temp <= 2 ||
    (latitude !== null && latitude >= 32.0 && latitude <= 36.0 && longitude !== null && longitude >= 75.0 && longitude <= 80.0 && temp <= 10)
  ) {
    return 'HIGH_ALTITUDE_COLD_ARID';
  }

  // 3. Hot & Arid Desert (Thar, Jaisalmer, Rajasthan, Kutch, temp >= 30°C)
  if (
    loc.includes('thar') ||
    loc.includes('desert') ||
    loc.includes('jaisalmer') ||
    loc.includes('rajasthan') ||
    loc.includes('bikaner') ||
    loc.includes('barmer') ||
    loc.includes('kutch') ||
    loc.includes('jodhpur') ||
    temp >= 30 ||
    (latitude !== null && latitude >= 23.5 && latitude <= 29.5 && longitude !== null && longitude >= 69.5 && longitude <= 76.0 && temp > 22)
  ) {
    return 'HOT_ARID_DESERT';
  }

  // 4. Cold & Humid Alpine / Montane (Tawang, Arunachal, Sikkim, Himachal valleys, 2°C < temp <= 12°C)
  if (
    loc.includes('tawang') ||
    loc.includes('arunachal') ||
    loc.includes('sikkim') ||
    loc.includes('shimla') ||
    loc.includes('manali') ||
    loc.includes('gulmarg') ||
    loc.includes('kashmir') ||
    (temp > 2 && temp <= 12)
  ) {
    return 'COLD_HUMID_ALPINE';
  }

  // 5. Hot & Humid Coastal / Tropical (Mumbai, Chennai, Kochi, Goa, coastal latitudes)
  if (
    loc.includes('mumbai') ||
    loc.includes('chennai') ||
    loc.includes('kochi') ||
    loc.includes('goa') ||
    loc.includes('coastal') ||
    loc.includes('kerala') ||
    loc.includes('visakhapatnam') ||
    (temp >= 24 && longitude !== null && (longitude < 74.0 || longitude > 80.0))
  ) {
    return 'HOT_HUMID_COASTAL';
  }

  // 6. Default: Temperate Plains & Composite
  return 'TEMPERATE_PLAINS';
};

/**
 * Returns candidate material profiles for each climate zone.
 */
export const getZoneCandidateTemplates = (zone) => {
  switch (zone) {
    case 'EXTREME_SUBZERO_GLACIAL':
      return [
        {
          name: 'Aerogel Cryo-Vacuum Insulated Panel (VIP)',
          recommendationType: 'Max Insulation',
          tagline: 'Cryogenic Super-Insulation: Certified for sub-zero Himalayan glacier survival',
          badgeColor: 'blue',
          thermalConductivity: 0.014,
          density: 130.0,
          costPerUnit: 340,
          baseRateM2: 560,
          efficiencyBase: 95.5
        },
        {
          name: 'Cryo-PUF Composite with Radiant Barrier',
          recommendationType: 'Optimal Balance',
          tagline: 'High-density closed-cell core with multi-layer aluminized radiative shield',
          badgeColor: 'emerald',
          thermalConductivity: 0.020,
          density: 45.0,
          costPerUnit: 185,
          baseRateM2: 340,
          efficiencyBase: 86.8
        },
        {
          name: 'Basalt Rockwool & Aerogel Hybrid Quilt',
          recommendationType: 'Budget Friendly',
          tagline: 'Non-combustible cold-crack resistant thermal sandwich for rapid military deployment',
          badgeColor: 'amber',
          thermalConductivity: 0.032,
          density: 120.0,
          costPerUnit: 110,
          baseRateM2: 210,
          efficiencyBase: 73.2
        }
      ];

    case 'HIGH_ALTITUDE_COLD_ARID':
      return [
        {
          name: 'NIST: Polyurethane Foam (PUF) Composite',
          recommendationType: 'Optimal Balance',
          tagline: 'High Thermal Retention & Economical Life-Cycle Deployment in High Altitude',
          badgeColor: 'emerald',
          thermalConductivity: 0.024,
          density: 38.0,
          costPerUnit: 160,
          baseRateM2: 310,
          efficiencyBase: 84.5
        },
        {
          name: 'Aerogel Vacuum Insulated Panel (VIP)',
          recommendationType: 'Max Insulation',
          tagline: 'Ultra-Low Heat Flux: Engineered for severe sub-zero plateau nights',
          badgeColor: 'blue',
          thermalConductivity: 0.016,
          density: 140.0,
          costPerUnit: 310,
          baseRateM2: 530,
          efficiencyBase: 94.8
        },
        {
          name: 'High-Density Rockwool Core Sandwich',
          recommendationType: 'Budget Friendly',
          tagline: 'Cost-Effective, Non-Combustible Fast-Assembly Modular Panel',
          badgeColor: 'amber',
          thermalConductivity: 0.038,
          density: 100.0,
          costPerUnit: 95,
          baseRateM2: 180,
          efficiencyBase: 68.4
        }
      ];

    case 'HOT_ARID_DESERT':
      return [
        {
          name: 'Autoclaved Aerated Concrete (AAC) + Cool-Roof Barrier',
          recommendationType: 'Thermal Mass Defense',
          tagline: 'High Thermal Inertia: Buffers extreme daytime solar radiation spikes',
          badgeColor: 'emerald',
          thermalConductivity: 0.090,
          density: 450.0,
          costPerUnit: 130,
          baseRateM2: 280,
          efficiencyBase: 81.2
        },
        {
          name: 'Phase Change Material (PCM) Double-Skin Shell',
          recommendationType: 'Max Heat Rejection',
          tagline: 'Latent Heat Storage: Absorbs peak daytime radiation, convective night purging',
          badgeColor: 'blue',
          thermalConductivity: 0.028,
          density: 220.0,
          costPerUnit: 260,
          baseRateM2: 480,
          efficiencyBase: 92.4
        },
        {
          name: 'Extruded Polystyrene (XPS) with Albedo Radiant Foil',
          recommendationType: 'Budget Friendly',
          tagline: 'Low-cost lightweight board with 97% reflective infrared radiant barrier',
          badgeColor: 'amber',
          thermalConductivity: 0.034,
          density: 35.0,
          costPerUnit: 85,
          baseRateM2: 170,
          efficiencyBase: 69.5
        }
      ];

    case 'COLD_HUMID_ALPINE':
      return [
        {
          name: 'Graphite-Enhanced Neopor EPS Structural Board',
          recommendationType: 'Moisture & Cold Balance',
          tagline: 'Infrared-absorbing graphite matrix with zero moisture absorption for alpine snow',
          badgeColor: 'emerald',
          thermalConductivity: 0.031,
          density: 25.0,
          costPerUnit: 120,
          baseRateM2: 230,
          efficiencyBase: 83.6
        },
        {
          name: 'Hydrophobic Rockwool ThermalRock Slab',
          recommendationType: 'Breathable Defense',
          tagline: 'Water-repellent stone wool preventing mold rot and internal moisture condensation',
          badgeColor: 'blue',
          thermalConductivity: 0.036,
          density: 60.0,
          costPerUnit: 105,
          baseRateM2: 195,
          efficiencyBase: 77.8
        },
        {
          name: 'Treated Structural Bamboo-Fiber Core Panel',
          recommendationType: 'Eco Budget Choice',
          tagline: 'Locally adaptable, seismic-resilient sustainable composite for mountain shelters',
          badgeColor: 'amber',
          thermalConductivity: 0.046,
          density: 280.0,
          costPerUnit: 70,
          baseRateM2: 140,
          efficiencyBase: 67.2
        }
      ];

    case 'HOT_HUMID_COASTAL':
      return [
        {
          name: 'Closed-Cell PIR Panel with Marine-Grade Facing',
          recommendationType: 'Anti-Corrosive Shield',
          tagline: 'Zero moisture permeability with high thermal barrier for salty coastal air',
          badgeColor: 'emerald',
          thermalConductivity: 0.022,
          density: 38.0,
          costPerUnit: 155,
          baseRateM2: 280,
          efficiencyBase: 88.2
        },
        {
          name: 'Micro-Perforated Radiative Cool-Roof Sandwich',
          recommendationType: 'Max Ventilation',
          tagline: 'High-emissivity coating driving continuous natural buoyant convective cooling',
          badgeColor: 'blue',
          thermalConductivity: 0.029,
          density: 75.0,
          costPerUnit: 210,
          baseRateM2: 380,
          efficiencyBase: 82.5
        },
        {
          name: 'FRP-Clad Expanded Polystyrene Composite',
          recommendationType: 'Budget Friendly',
          tagline: '100% rustproof, rot-proof rapid deployment panel for disaster relief',
          badgeColor: 'amber',
          thermalConductivity: 0.036,
          density: 30.0,
          costPerUnit: 80,
          baseRateM2: 155,
          efficiencyBase: 71.0
        }
      ];

    case 'TEMPERATE_PLAINS':
    default:
      return [
        {
          name: 'Bio-Composite Hemp & Recycled Fiber Panel',
          recommendationType: 'Sustainable Balance',
          tagline: 'Carbon-negative envelope offering passive thermal and acoustic comfort',
          badgeColor: 'emerald',
          thermalConductivity: 0.034,
          density: 55.0,
          costPerUnit: 125,
          baseRateM2: 230,
          efficiencyBase: 82.4
        },
        {
          name: 'Polyurethane Foam (PUF) Hybrid Board',
          recommendationType: 'Energy Efficient',
          tagline: 'Low thermal leakage minimizing dual-season HVAC power consumption',
          badgeColor: 'blue',
          thermalConductivity: 0.025,
          density: 38.0,
          costPerUnit: 150,
          baseRateM2: 275,
          efficiencyBase: 87.6
        },
        {
          name: 'Cellular Lightweight Concrete Block Assembly',
          recommendationType: 'Durable Budget',
          tagline: 'Low-cost high durability modular blocks for permanent shelter stability',
          badgeColor: 'amber',
          thermalConductivity: 0.052,
          density: 350.0,
          costPerUnit: 75,
          baseRateM2: 145,
          efficiencyBase: 65.5
        }
      ];
  }
};

/**
 * Calculates dynamic physics and cost metrics for top material recommendations
 * tailored to the specific dimensions, wall thickness, target temperature, and climate.
 */
export const calculateDynamicMaterialRecommendations = ({
  location = '',
  lat = null,
  lon = null,
  ambientNightTemp = -10,
  targetTemp = 20,
  dimensions = { length: 6, width: 5, height: 3 },
  wallThickness_mm = 150
}) => {
  const wallArea =
    2 *
    (dimensions.length * dimensions.height +
      dimensions.width * dimensions.height);
  const roofArea = dimensions.length * dimensions.width;
  const totalArea = wallArea + roofArea;

  const thicknessM = Math.max((wallThickness_mm || 150) / 1000, 0.04);
  const deltaT = Math.max(Math.abs(targetTemp - ambientNightTemp), 1);
  const isCold = ambientNightTemp < targetTemp;

  const zone = detectClimateZone({
    location,
    lat,
    lon,
    ambientTemp: ambientNightTemp
  });

  const templates = getZoneCandidateTemplates(zone);

  return templates.map((tmpl) => {
    const k = tmpl.thermalConductivity;
    // q = (k / d) * ΔT [W/m²]
    const heatFlux = Number(((k / thicknessM) * deltaT).toFixed(1));
    // Q = q * A [W]
    const totalHeatLoss = Math.round(heatFlux * totalArea);

    // Thickness adjustment factor for total estimated cost
    const thicknessFactor = 0.65 + 0.35 * (wallThickness_mm / 150);
    const estimatedTotalCost = Math.round(totalArea * tmpl.baseRateM2 * thicknessFactor);

    // Realistic inside temperature prediction under night extreme
    let predictedInsideTempNight;
    if (isCold) {
      const thermalResistance = thicknessM / k; // R-value (m²K/W)
      // Drift decreases with higher R-value
      const drift = Math.round(deltaT / (1 + thermalResistance * 0.7));
      predictedInsideTempNight = Math.max(
        Math.round(targetTemp - drift),
        Math.round(ambientNightTemp + 2)
      );
    } else {
      // Hot climate: inside temp buffered from ambient heat
      const thermalResistance = thicknessM / k;
      const rise = Math.round(deltaT / (1 + thermalResistance * 0.6));
      predictedInsideTempNight = Math.round(targetTemp + rise);
    }

    // Dynamic efficiency score (50 to 98) based on thermal flux damping & conductivity
    const fluxPenalty = Math.min(heatFlux * 1.5, 30);
    const condPenalty = k * 180;
    const efficiencyScore = Number(
      Math.min(Math.max(tmpl.efficiencyBase - fluxPenalty * 0.2 - condPenalty * 0.1, 55.0), 97.8).toFixed(1)
    );

    return {
      name: tmpl.name,
      recommendationType: tmpl.recommendationType,
      tagline: tmpl.tagline,
      badgeColor: tmpl.badgeColor,
      thermalConductivity: k,
      density: tmpl.density,
      costPerUnit: tmpl.costPerUnit,
      estimatedTotalCost,
      heatFlux,
      totalHeatLoss,
      efficiencyScore,
      simulationResults: {
        predictedInsideTempNight,
        predictedInsideTempDay: targetTemp,
        climateZone: zone
      }
    };
  });
};

export default {
  detectClimateZone,
  getZoneCandidateTemplates,
  calculateDynamicMaterialRecommendations
};
