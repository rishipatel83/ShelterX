const avg = (values = []) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

export const getWeather = async (lat, lon) => {
  if ((process.env.WEATHER_ENABLED || 'true').toLowerCase() !== 'true') {
    return { available: false, disabled: true, source: null };
  }

  const timeoutMs = Number(process.env.WEATHER_TIMEOUT_MS || 6000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    '&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance' +
    '&wind_speed_unit=ms&forecast_days=1';

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather API HTTP ${response.status}`);

    const data = await response.json();
    const t = (data.hourly?.temperature_2m || []).map(Number);
    const w = (data.hourly?.wind_speed_10m || []).map(Number);
    const s = (data.hourly?.direct_normal_irradiance || []).map(Number);

    return {
      available: true,
      source: 'Open-Meteo',
      averageTemperatureC: avg(t),
      averageWindSpeedMs: avg(w),
      peakSolarIrradianceWm2: s.length ? Math.max(...s) : null,
      hourly: t.slice(0, 24).map((temp, i) => ({
        hour: i,
        temperatureC: temp,
        windSpeedMs: w[i] ?? null,
        solarIrradianceWm2: s[i] ?? null
      }))
    };
  } catch (error) {
    return {
      available: false,
      source: 'Open-Meteo',
      error: error.name === 'AbortError' ? 'Weather request timed out.' : error.message
    };
  } finally {
    clearTimeout(timer);
  }
};
