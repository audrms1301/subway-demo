// 서울 열린데이터 광장 지하철 실시간 도착 API 프록시
// CORS 우회 + 라운드 로빈 키 관리

const KEY = process.env.SUBWAY_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { station = '반월' } = req.query;

  if (!KEY) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
  }

  const key = KEY;

  const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/20/${encodeURIComponent(station)}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      ...data,
      _meta: {
        fetchedAt: new Date().toISOString(),
        keyUsed: keyIndex,
        station,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      _meta: { fetchedAt: new Date().toISOString(), station },
    });
  }
}
