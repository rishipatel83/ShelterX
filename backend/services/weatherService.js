const DEFAULT_TIMEOUT_MS = 6000;

const finiteOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const fetchCurrentWeather = async (
  lat,
  lon,
  { timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('lat must be between -90 and 90.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('lon must be between -180 and 180.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    '&current=temperature_2m' +
    '&hourly=temperature_2m' +
    '&forecast_days=1' +
    '&timezone=auto';

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return {
        available: false,
        source: 'Open-Meteo',
        reason: `Weather API returned HTTP ${response.status}.`,
        currentTemperatureC: null,
        currentTime: null,
        hourlyForecast: []
      };
    }

    const data = await response.json();
    const currentTemperatureC = finiteOrNull(data.current?.temperature_2m);
    const times = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
    const temperatures = Array.isArray(data.hourly?.temperature_2m)
      ? data.hourly.temperature_2m
      : [];

    const hourlyForecast = times
      .slice(0, 24)
      .map((time, index) => ({
        time,
        tempC: finiteOrNull(temperatures[index])
      }))
      .filter((item) => item.tempC !== null);

    if (currentTemperatureC === null) {
      return {
        available: false,
        source: 'Open-Meteo',
        reason: 'Current outdoor temperature was unavailable.',
        currentTemperatureC: null,
        currentTime: data.current?.time ?? null,
        hourlyForecast
      };
    }

    return {
      available: true,
      source: 'Open-Meteo',
      timezone: data.timezone ?? null,
      latitude: finiteOrNull(data.latitude),
      longitude: finiteOrNull(data.longitude),
      currentTemperatureC,
      currentTime: data.current?.time ?? null,
      hourlyForecast
    };
  } catch (error) {
    return {
      available: false,
      source: 'Open-Meteo',
      reason:
        error?.name === 'AbortError'
          ? 'Weather request timed out.'
          : 'Weather data could not be retrieved.',
      currentTemperatureC: null,
      currentTime: null,
      hourlyForecast: []
    };
  } finally {
    clearTimeout(timeout);
  }
};

export default {
  fetchCurrentWeather
};
