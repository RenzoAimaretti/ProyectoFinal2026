export type WeatherSnapshot = {
  current: {
    temperatureC: number;
    windSpeedKnots: number;
    windDirectionDeg: number;
    precipitationMm: number;
  };
  hourly: Array<{
    time: string;
    windSpeedKnots: number;
    windDirectionDeg: number;
    precipitationMm: number;
  }>;
  daily: Array<{
    date: string;
    precipitationSumMm: number;
    precipitationProbabilityMax: number | null;
  }>;
};

export type RadarSnapshot = {
  host: string;
  frames: Array<{ time: string; path: string }>;
  /** `${host}${path}/256/{z}/{x}/{y}/2/1_1.png` — el cliente pide los tiles al CDN. */
  tileTemplate: string;
  /** true cuando la zona objetivo cae fuera del compuesto de radar. */
  coverageWarning: boolean;
};
