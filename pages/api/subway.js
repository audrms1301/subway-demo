// 서울 열린데이터 광장 지하철 실시간 도착 API 프록시

const KEY = process.env.SUBWAY_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { station = '반월' } = req.query;

  if (!KEY) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
  }

  const url = `http://swopenapi.seoul.go.kr/api/subway/${KEY}/json/realtimeStationArrival/0/20/${encodeURIComponent(station)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await response.text();
    const data = JSON.parse(text);

    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      ...data,
      _meta: { fetchedAt: new Date().toISOString(), station },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack?.split('\n')[0],
      _meta: { fetchedAt: new Date().toISOString(), station },
    });
  }
}
