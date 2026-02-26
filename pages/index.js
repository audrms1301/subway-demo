import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

// ── 상수 ──────────────────────────────────────────
const STATION = '반월';
const TARGET_LINE = '1004'; // 4호선
const UPDATE_INTERVAL = 40000; // 40초

const DAYS_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// ── 시계 컴포넌트 ────────────────────────────────
function Clock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const year = now.getFullYear();
  const month = MONTHS_KO[now.getMonth()];
  const date = now.getDate();
  const day = DAYS_KO[now.getDay()];

  return (
    <div>
      <div className="clock-time">{hh}:{mm}<span style={{ fontSize: 40, color: '#777', marginLeft: 8 }}>{ss}</span></div>
      <div className="clock-date">{year}년 {month} {date}일</div>
      <div className="clock-day">{day}</div>
    </div>
  );
}

// ── 달력 컴포넌트 ────────────────────────────────
function Calendar() {
  const [today, setToday] = useState(null);

  useEffect(() => setToday(new Date()), []);

  if (!today) return null;

  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();

  // 이번 달 1일 요일
  const firstDay = new Date(year, month, 1).getDay();
  // 이번 달 마지막 날
  const lastDate = new Date(year, month + 1, 0).getDate();
  // 지난 달 마지막 날
  const prevLastDate = new Date(year, month, 0).getDate();

  const cells = [];
  // 이전 달 날짜 채우기
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: prevLastDate - i, current: false, col: cells.length % 7 });
  }
  // 이번 달
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: d, current: true, col: cells.length % 7 });
  }
  // 다음 달 채우기 (6주 고정)
  let next = 1;
  while (cells.length < 42) {
    cells.push({ date: next++, current: false, col: cells.length % 7 });
  }

  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="calendar">
      <div className="calendar-header">{year}년 {MONTHS_KO[month]}</div>
      <div className="calendar-grid">
        {dayHeaders.map((d, i) => (
          <div key={d} className="day-header" style={{ color: i === 0 ? '#c0392b' : i === 6 ? '#2980b9' : '#666' }}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          const isToday = cell.current && cell.date === todayDate;
          const isSun = i % 7 === 0;
          const isSat = i % 7 === 6;
          let cls = 'day';
          if (!cell.current) cls += ' other-month';
          if (isSun && cell.current) cls += ' sunday';
          if (isSat && cell.current) cls += ' saturday';
          if (isToday) cls = 'day today';

          return (
            <div key={i} className={cls}>{cell.date}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── 날씨 컴포넌트 ────────────────────────────────
function Weather() {
  const [weather, setWeather] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/weather');
      const data = await res.json();
      setWeather(data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 600000); // 10분
    return () => clearInterval(id);
  }, [fetch_]);

  if (!weather) return <div className="loading">날씨 로딩 중...</div>;

  return (
    <div className="weather">
      <div className="weather-main">
        <div className="weather-icon">{weather.weatherIcon}</div>
        <div className="weather-temp">{weather.temperature}<span>°</span></div>
      </div>
      <div className="weather-label">{weather.weatherLabel}</div>
      <div className="weather-minmax">↑{weather.maxTemp}° ↓{weather.minTemp}°</div>
      <div className="weather-detail">체감 {weather.feelsLike}° · 바람 {weather.windspeed} km/h</div>
    </div>
  );
}

// ── 도착 시간 파싱 ────────────────────────────────
function parseArrival(msg) {
  if (!msg) return { text: '-', urgent: false };
  if (msg.includes('전역출발') || msg.includes('출발')) return { text: '곧 도착', urgent: true };
  if (msg.includes('진입') || msg.includes('도착')) return { text: '도착 중', urgent: true };
  const m = msg.match(/(\d+)분/);
  if (m) return { text: `${m[1]}분 후`, urgent: parseInt(m[1]) <= 2 };
  return { text: msg.slice(0, 10), urgent: false };
}

// ── 지하철 컴포넌트 ──────────────────────────────
function Subway() {
  const [trains, setTrains] = useState({ up: [], down: [] });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);

  const fetchSubway = useCallback(async () => {
    try {
      const res = await fetch(`/api/subway?station=${encodeURIComponent(STATION)}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const list = (data.realtimeArrivalList || []).filter(
        t => t.subwayId === TARGET_LINE
      );

      const up = list
        .filter(t => t.updnLine === '0' || t.updnLine === '상행')
        .sort((a, b) => {
          const aM = a.arvlMsg2?.match(/(\d+)/);
          const bM = b.arvlMsg2?.match(/(\d+)/);
          return (aM ? parseInt(aM[1]) : 0) - (bM ? parseInt(bM[1]) : 0);
        })
        .slice(0, 3);

      const down = list
        .filter(t => t.updnLine === '1' || t.updnLine === '하행')
        .sort((a, b) => {
          const aM = a.arvlMsg2?.match(/(\d+)/);
          const bM = b.arvlMsg2?.match(/(\d+)/);
          return (aM ? parseInt(aM[1]) : 0) - (bM ? parseInt(bM[1]) : 0);
        })
        .slice(0, 3);

      setTrains({ up, down });
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchSubway();
    const id = setInterval(fetchSubway, UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, [fetchSubway]);

  const formatTime = (d) => {
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div className="subway">
      <div className="subway-title">
        <span className="subway-line-badge">4호선</span>
        {STATION}역 실시간 도착
      </div>

      {error ? (
        <div style={{ color: '#e74c3c', fontSize: 14 }}>{error}</div>
      ) : (
        <>
          {/* 상행 */}
          <div className="subway-direction">▲ 당고개 · 진접 방향</div>
          {trains.up.length === 0 ? (
            <div className="loading">조회 중...</div>
          ) : (
            trains.up.map((t, i) => {
              const arr = parseArrival(t.arvlMsg2);
              return (
                <div key={i} className="subway-train">
                  <span className="subway-train-dest">{t.bstatnNm || t.trainLineNm}</span>
                  <span className={`subway-train-time ${arr.urgent ? 'arriving' : ''}`}>{arr.text}</span>
                </div>
              );
            })
          )}

          <div className="subway-divider" />

          {/* 하행 */}
          <div className="subway-direction">▼ 오이도 방향</div>
          {trains.down.length === 0 ? (
            <div className="loading">조회 중...</div>
          ) : (
            trains.down.map((t, i) => {
              const arr = parseArrival(t.arvlMsg2);
              return (
                <div key={i} className="subway-train">
                  <span className="subway-train-dest">{t.bstatnNm || t.trainLineNm}</span>
                  <span className={`subway-train-time ${arr.urgent ? 'arriving' : ''}`}>{arr.text}</span>
                </div>
              );
            })
          )}
        </>
      )}

      {updatedAt && (
        <div className="subway-updated">최종 갱신 {formatTime(updatedAt)} · 40초 자동 새로고침</div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────
export default function Home() {
  return (
    <>
      <Head>
        <title>반월역 MagicMirror 데모</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      <div className="mirror">
        {/* Top Left: 시계 + 달력 */}
        <div className="region-top-left">
          <Clock />
          <Calendar />
        </div>

        {/* Top Right: 날씨 */}
        <div className="region-top-right">
          <Weather />
        </div>

        {/* Bottom Left: 비어있음 */}
        <div className="region-bottom-left" />

        {/* Bottom Right: 지하철 */}
        <div className="region-bottom-right">
          <Subway />
        </div>
      </div>

      <div className="demo-badge">MagicMirror² Demo · Raspberry Pi 4 · MMM-SubwayArrival</div>
    </>
  );
}
