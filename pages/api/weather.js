// Open-Meteo 날씨 API 프록시 (API 키 불필요)
// 반월역 좌표: 37.3952, 126.8302

const WMO_CODES = {
  0: { label: '맑음', icon: '☀️' },
  1: { label: '대체로 맑음', icon: '🌤️' },
  2: { label: '구름 조금', icon: '⛅' },
  3: { label: '흐림', icon: '☁️' },
  45: { label: '안개', icon: '🌫️' },
  48: { label: '짙은 안개', icon: '🌫️' },
  51: { label: '가벼운 이슬비', icon: '🌦️' },
  53: { label: '이슬비', icon: '🌦️' },
  55: { label: '강한 이슬비', icon: '🌦️' },
  61: { label: '가벼운 비', icon: '🌧️' },
  63: { label: '비', icon: '🌧️' },
  65: { label: '강한 비', icon: '🌧️' },
  71: { label: '가벼운 눈', icon: '🌨️' },
  73: { label: '눈', icon: '❄️' },
  75: { label: '강한 눈', icon: '❄️' },
  77: { label: '싸락눈', icon: '🌨️' },
  80: { label: '소나기', icon: '🌦️' },
  81: { label: '강한 소나기', icon: '🌧️' },
  82: { label: '폭우', icon: '⛈️' },
  85: { label: '눈 소나기', icon: '🌨️' },
  86: { label: '강한 눈 소나기', icon: '❄️' },
  95: { label: '뇌우', icon: '⛈️' },
  96: { label: '뇌우+우박', icon: '⛈️' },
  99: { label: '강한 뇌우+우박', icon: '⛈️' },
};

export default async function handler(req, res) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=37.3952&longitude=126.8302' +
    '&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,weathercode' +
    '&timezone=Asia%2FSeoul&forecast_days=1';

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await response.json();

    const code = data.current?.weathercode ?? 0;
    const weather = WMO_CODES[code] || { label: '알 수 없음', icon: '❓' };

    res.setHeader('Cache-Control', 'max-age=600'); // 10분 캐시
    res.status(200).json({
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      feelsLike: Math.round(data.current?.apparent_temperature ?? 0),
      weatherCode: code,
      weatherLabel: weather.label,
      weatherIcon: weather.icon,
      windspeed: Math.round(data.current?.windspeed_10m ?? 0),
      maxTemp: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      minTemp: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
