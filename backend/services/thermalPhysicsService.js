const asFiniteNumber = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return number;
};

const asPositiveNumber = (value, name) => {
  const number = asFiniteNumber(value, name);
  if (number <= 0) {
    throw new RangeError(`${name} must be greater than 0.`);
  }
  return number;
};

/**
 * ShelterX production thermal model (V1).
 *
 * Scope intentionally frozen to the steady-state wall + roof conduction
 * equations that were validated against the existing ANSYS conduction cases.
 * Wind, solar, occupants, infiltration and thermal mass remain experimental
 * and are not used by this production service.
 */
export const calculateConductionPhysics = ({
  dimensions,
  targetTempC,
  outsideTempC,
  wallThicknessMm,
  roofThicknessMm,
  thermalConductivityWmK
}) => {
  if (!dimensions || typeof dimensions !== 'object') {
    throw new TypeError('dimensions are required.');
  }

  const lengthM = asPositiveNumber(dimensions.length, 'dimensions.length');
  const widthM = asPositiveNumber(dimensions.width, 'dimensions.width');
  const heightM = asPositiveNumber(dimensions.height, 'dimensions.height');
  const target = asFiniteNumber(targetTempC, 'targetTempC');
  const outside = asFiniteNumber(outsideTempC, 'outsideTempC');
  const wallThicknessM = asPositiveNumber(wallThicknessMm, 'wallThicknessMm') / 1000;
  const roofThicknessM = asPositiveNumber(roofThicknessMm, 'roofThicknessMm') / 1000;
  const conductivity = asPositiveNumber(
    thermalConductivityWmK,
    'thermalConductivityWmK'
  );

  const deltaTC = target - outside;
  const wallAreaM2 = 2 * lengthM * heightM + 2 * widthM * heightM;
  const roofAreaM2 = lengthM * widthM;
  const envelopeAreaM2 = wallAreaM2 + roofAreaM2;

  const wallUValueWM2K = conductivity / wallThicknessM;
  const roofUValueWM2K = conductivity / roofThicknessM;

  const wallConductionW = wallUValueWM2K * wallAreaM2 * deltaTC;
  const roofConductionW = roofUValueWM2K * roofAreaM2 * deltaTC;
  const totalConductionW = wallConductionW + roofConductionW;
  const averageConductionFluxWM2 = totalConductionW / envelopeAreaM2;

  return {
    model: 'shelterx_conduction_v1',
    validation: {
      status: 'validated-against-ansys-conduction-cases',
      scope:
        'Steady-state wall and roof conduction under the same boundary assumptions as the validation cases.'
    },
    geometry: {
      lengthM,
      widthM,
      heightM,
      wallAreaM2,
      roofAreaM2,
      envelopeAreaM2
    },
    inputs: {
      targetTempC: target,
      outsideTempC: outside,
      wallThicknessMm: Number(wallThicknessMm),
      roofThicknessMm: Number(roofThicknessMm),
      thermalConductivityWmK: conductivity
    },
    thermal: {
      deltaTC,
      wallUValueWM2K,
      roofUValueWM2K,
      wallConductionW,
      roofConductionW,
      totalConductionW,
      averageConductionFluxWM2,
      heatingLoadW: Math.max(totalConductionW, 0),
      coolingLoadW: Math.max(-totalConductionW, 0)
    },
    excludedFromCurrentProductionModel: [
      'wind_convection',
      'solar_gain',
      'occupant_heat',
      'infiltration',
      'floor_heat_transfer',
      'thermal_mass'
    ]
  };
};

export const calculateConductionProfile = ({
  hourlyTemperatures,
  ...baseInputs
}) => {
  if (!Array.isArray(hourlyTemperatures)) {
    throw new TypeError('hourlyTemperatures must be an array.');
  }

  const profile = hourlyTemperatures
    .filter((item) => Number.isFinite(Number(item?.tempC)))
    .map((item) => {
      const result = calculateConductionPhysics({
        ...baseInputs,
        outsideTempC: Number(item.tempC)
      });

      return {
        time: item.time ?? null,
        outsideTempC: Number(item.tempC),
        totalConductionW: result.thermal.totalConductionW,
        heatingLoadW: result.thermal.heatingLoadW,
        coolingLoadW: result.thermal.coolingLoadW
      };
    });

  if (profile.length === 0) {
    return {
      hourly: [],
      peakHeatingLoadW: null,
      peakCoolingLoadW: null
    };
  }

  return {
    hourly: profile,
    peakHeatingLoadW: Math.max(...profile.map((item) => item.heatingLoadW)),
    peakCoolingLoadW: Math.max(...profile.map((item) => item.coolingLoadW))
  };
};

export default {
  calculateConductionPhysics,
  calculateConductionProfile
};
