export const AQI_CATEGORIES = {
  Good: { min: 0, max: 50, color: '#00e400', rgb: [0, 228, 0], text: 'Good' },
  Satisfactory: { min: 51, max: 100, color: '#92d050', rgb: [146, 208, 80], text: 'Satisfactory' },
  Moderate: { min: 101, max: 200, color: '#ffff00', rgb: [255, 255, 0], text: 'Moderate' },
  Poor: { min: 201, max: 300, color: '#ff7e00', rgb: [255, 126, 0], text: 'Poor' },
  VeryPoor: { min: 301, max: 400, color: '#ff0000', rgb: [255, 0, 0], text: 'Very Poor' },
  Severe: { min: 401, max: 500, color: '#7e0023', rgb: [126, 0, 35], text: 'Severe' },
};

export function pm25ToAQI(pm25) {
  const breakpoints_pm25 = [0, 30, 60, 90, 120, 250, 500];
  const breakpoints_aqi = [0, 50, 100, 200, 300, 400, 500];

  for (let i = 0; i < breakpoints_pm25.length - 1; i++) {
    if (pm25 <= breakpoints_pm25[i + 1]) {
      const frac = (pm25 - breakpoints_pm25[i]) / (breakpoints_pm25[i + 1] - breakpoints_pm25[i]);
      const aqi = breakpoints_aqi[i] + frac * (breakpoints_aqi[i + 1] - breakpoints_aqi[i]);
      const catKeys = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'VeryPoor', 'Severe'];
      const catKey = catKeys[i];
      const catInfo = AQI_CATEGORIES[catKey];
      return {
        aqi: Math.round(aqi * 10) / 10,
        category: catInfo.text,
        color: catInfo.color,
        rgb: catInfo.rgb,
      };
    }
  }

  return {
    aqi: 500,
    category: 'Severe',
    color: '#7e0023',
    rgb: [126, 0, 35],
  };
}
