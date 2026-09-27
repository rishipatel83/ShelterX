export const deriveGeometry = (dimensions = {}) => {
  const { length, width, height } = dimensions;
  if (![length, width, height].every(Number.isFinite)) return null;

  return {
    wallAreaM2: 2 * length * height + 2 * width * height,
    roofAreaM2: length * width,
    floorAreaM2: length * width,
    volumeM3: length * width * height
  };
};