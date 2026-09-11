import Material from '../models/material.js';

const NIST_API_URL = 'https://srdata.nist.gov/insulation/api/TableAllData';

// Cache for NIST materials to avoid repeated API calls
let materialsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const getMaterialCategoryDefaults = (materialName = '') => {
    const nameLower = materialName.toLowerCase();

    if (nameLower.includes('aerogel')) {
        return { specificHeat: 1000, costPerUnit: 220 };
    }
    if (nameLower.includes('polyurethane') || nameLower.includes('urethane') || nameLower.includes('puf')) {
        return { specificHeat: 1400, costPerUnit: 150 };
    }
    if (nameLower.includes('polystyrene') || nameLower.includes('eps') || nameLower.includes('xps')) {
        return { specificHeat: 1300, costPerUnit: 120 };
    }
    if (nameLower.includes('glass fiber') || nameLower.includes('fibrous glass') || nameLower.includes('mineral wool') || nameLower.includes('rock wool') || nameLower.includes('slag wool')) {
        return { specificHeat: 840, costPerUnit: 90 };
    }
    if (nameLower.includes('wood') || nameLower.includes('fiberboard') || nameLower.includes('cork') || nameLower.includes('straw') || nameLower.includes('timber')) {
        return { specificHeat: 1200, costPerUnit: 110 };
    }
    if (nameLower.includes('concrete') || nameLower.includes('plaster') || nameLower.includes('cement')) {
        return { specificHeat: 1000, costPerUnit: 80 };
    }
    if (nameLower.includes('brick') || nameLower.includes('alumina') || nameLower.includes('ceramic') || nameLower.includes('vermiculite')) {
        return { specificHeat: 840, costPerUnit: 85 };
    }
    if (nameLower.includes('rubber') || nameLower.includes('plastic') || nameLower.includes('elastomeric')) {
        return { specificHeat: 1500, costPerUnit: 130 };
    }

    return { specificHeat: 1000, costPerUnit: 100 };
};

export const fetchNistMaterials = async () => {
    try {
        console.log(`Fetching live NIST data from ${NIST_API_URL}...`);
        const response = await fetch(NIST_API_URL);

        if (!response.ok) {
            throw new Error(`NIST API HTTP Error! Status: ${response.status}`);
        }

        const rawData = await response.json();
        console.log(`Received ${rawData.length} raw test records from NIST.`);

        
        const materialMap = new Map();

        for (const item of rawData) {
            const rawName = item.material ? item.material.trim() : null;
            const tradeName = item.tradeName ? item.tradeName.trim() : null;
            const kImperial = parseFloat(item.k);
            const densityImperial = parseFloat(item.density);

            
            if (!rawName || isNaN(kImperial) || kImperial <= 0 || isNaN(densityImperial) || densityImperial <= 0) {
                continue;
            }

            
            const kMetric = kImperial * 0.1442279;
            const densityMetric = densityImperial * 16.0185;

           
            const displayName = tradeName && !rawName.toLowerCase().includes(tradeName.toLowerCase()) 
                ? `NIST: ${rawName} (${tradeName.replace(/®/g, '')})`
                : `NIST: ${rawName}`;

            if (!materialMap.has(displayName)) {
                materialMap.set(displayName, {
                    name: displayName,
                    categoryName: rawName,
                    kSum: 0,
                    densitySum: 0,
                    count: 0
                });
            }

            const record = materialMap.get(displayName);
            record.kSum += kMetric;
            record.densitySum += densityMetric;
            record.count += 1;
        }

        const processedMaterials = [];

        for (const record of materialMap.values()) {
            const avgK = record.kSum / record.count;
            const avgDensity = record.densitySum / record.count;
            const defaults = getMaterialCategoryDefaults(record.categoryName);

            processedMaterials.push({
                name: record.name,
                thermalConductivity: Math.round(avgK * 10000) / 10000, // 4 decimal places
                specificHeat: defaults.specificHeat,
                density: Math.round(avgDensity * 100) / 100, // 2 decimal places
                costPerUnit: defaults.costPerUnit
            });
        }

        console.log(`Successfully processed ${processedMaterials.length} unique NIST material products.`);
        return processedMaterials;
    } catch (err) {
        console.error("Error in fetchNistMaterials service:", err.message);
        throw err;
    }
};

/**
 * Get materials from database with caching support
 * Falls back to NIST API if database is empty
 */
export const getMaterialsFromDB = async () => {
    try {
        // Check cache first
        if (materialsCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
            console.log('Using cached materials');
            return materialsCache;
        }

        // Try to get from MongoDB
        const dbMaterials = await Material.find({});
        if (dbMaterials.length > 0) {
            materialsCache = dbMaterials;
            cacheTimestamp = Date.now();
            console.log(`Loaded ${dbMaterials.length} materials from database`);
            return dbMaterials;
        }

        // Fallback to NIST API if database is empty
        console.log('Database empty, fetching from NIST API...');
        const nistMaterials = await fetchNistMaterials();
        materialsCache = nistMaterials;
        cacheTimestamp = Date.now();
        return nistMaterials;
    } catch (err) {
        console.error('Error getting materials:', err.message);
        throw err;
    }
};

/**
 * Calculate thermal insulation score for a material
 * Lower k-value (thermal conductivity) = better insulation = higher score
 */
const calculateThermalScore = (material, targetDeltaT) => {
    // Inverse of thermal conductivity (lower k = higher score)
    // Multiply by target temperature difference for relevance
    const thermalResistance = 1 / (material.thermalConductivity || 0.05);
    return thermalResistance * (1 + targetDeltaT / 50); // Normalize by delta T
};

/**
 * Calculate cost-effectiveness score
 * Lower cost per unit = higher score
 */
const calculateCostScore = (material, budget) => {
    const costPerUnit = material.costPerUnit || 100;
    if (budget && costPerUnit > budget) {
        return 0; // Material exceeds budget
    }
    // Inverse of cost (lower cost = higher score)
    return 1 / (costPerUnit / 100); // Normalize
};

/**
 * Calculate durability score based on material density
 * Some materials are better for specific climates
 */
const calculateDurabilityScore = (material, climate) => {
    const density = material.density || 100;
    // Higher density materials are generally more durable
    const baseScore = Math.min(density / 500, 1) * 100; // Normalize to 0-100
    
    // Climate-specific adjustments
    let climateBoost = 1;
    const nameLower = material.name.toLowerCase();
    
    if (climate === 'extreme-cold') {
        // For extreme cold, prefer materials with good insulation
        if (nameLower.includes('aerogel') || nameLower.includes('polyurethane')) {
            climateBoost = 1.3;
        }
    } else if (climate === 'moderate') {
        // For moderate climates, standard materials work well
        if (nameLower.includes('glass fiber') || nameLower.includes('mineral wool')) {
            climateBoost = 1.2;
        }
    }
    
    return baseScore * climateBoost;
};

/**
 * Recommend suitable materials for a shelter based on parameters
 * 
 * Parameters:
 * - dimensions: { length, width, height } in meters
 * - targetTemp: Desired interior temperature in Celsius
 * - budget: Maximum budget in INR (optional)
 * - location: Location name for climate profile (optional)
 * - topN: Number of top recommendations to return (default: 5)
 */
export const recommendMaterials = async (params) => {
    try {
        const {
            dimensions = { length: 5, width: 4, height: 3 },
            targetTemp = 20,
            budget = null,
            location = 'moderate',
            topN = 5
        } = params;

        // Get available materials
        const materials = await getMaterialsFromDB();
        if (!materials || materials.length === 0) {
            throw new Error('No materials available for recommendation');
        }

        // Calculate shelter parameters
        const totalArea = 2 * (dimensions.length * dimensions.height) +
                         2 * (dimensions.width * dimensions.height) +
                         dimensions.length * dimensions.width;

        // Estimate outside temperature based on location
        const climateProfiles = {
            'Siachen Glacier': { temp: -30, climate: 'extreme-cold' },
            'Ladakh': { temp: -15, climate: 'extreme-cold' },
            'Dras/Kargil': { temp: -20, climate: 'extreme-cold' },
            'Leh': { temp: -12, climate: 'extreme-cold' },
            'Tawang': { temp: -5, climate: 'cold' },
            'moderate': { temp: 15, climate: 'moderate' }
        };

        const climateData = climateProfiles[location] || climateProfiles['moderate'];
        const deltaT = Math.abs(targetTemp - climateData.temp);

        // Score each material
        const scoredMaterials = materials.map(material => {
            const thermalScore = calculateThermalScore(material, deltaT);
            const costScore = budget ? calculateCostScore(material, budget) : 50;
            const durabilityScore = calculateDurabilityScore(material, climateData.climate);

            // Weighted scoring
            const overallScore = (thermalScore * 0.4) + (costScore * 0.35) + (durabilityScore * 0.25);

            // Calculate costs
            const insulationVolume = totalArea * 0.05; // Assume 50mm standard insulation
            const materialCost = insulationVolume * (material.density || 100) * (material.costPerUnit || 100) / 1000;

            return {
                name: material.name || material._id,
                thermalConductivity: material.thermalConductivity,
                specificHeat: material.specificHeat,
                density: material.density,
                costPerUnit: material.costPerUnit,
                thermalScore: Math.round(thermalScore * 100) / 100,
                costScore: Math.round(costScore * 100) / 100,
                durabilityScore: Math.round(durabilityScore * 100) / 100,
                overallScore: Math.round(overallScore * 100) / 100,
                estimatedCost: Math.round(materialCost),
                withinBudget: !budget || materialCost <= budget,
                heatFlux: Math.round((material.thermalConductivity / 0.05) * deltaT * 100) / 100
            };
        });

        // Filter out materials that exceed budget
        let filteredMaterials = scoredMaterials;
        if (budget) {
            filteredMaterials = scoredMaterials.filter(m => m.withinBudget);
        }

        // Sort by overall score
        filteredMaterials.sort((a, b) => b.overallScore - a.overallScore);

        // Return top N recommendations
        const recommendations = filteredMaterials.slice(0, topN);

        return {
            success: true,
            shelter: {
                dimensions,
                targetTemp,
                location,
                estimatedOutsideTemp: climateData.temp,
                deltaT,
                totalSurfaceArea: Math.round(totalArea * 100) / 100
            },
            budget: budget ? Math.round(budget) : null,
            recommendedMaterials: recommendations,
            totalMaterialsEvaluated: scoredMaterials.length,
            materialsWithinBudget: filteredMaterials.length
        };
    } catch (err) {
        console.error('Error in recommendMaterials:', err.message);
        throw err;
    }
};
