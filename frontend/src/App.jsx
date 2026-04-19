import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wind, Thermometer, MapPin, AlertTriangle, 
  TrendingUp, Activity, Info, Navigation 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// --- Custom SVG Line Chart ---
const LineChart = ({ data, width = '100%', height = 300 }) => {
  const svgRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 600, h: height });
  const [tooltip, setTooltip] = React.useState(null);

  React.useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (let e of entries) setDims({ w: e.contentRect.width, h: height });
    });
    if (svgRef.current) obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, [height]);

  if (!data || data.length === 0) return null;
  const pad = { top: 20, right: 20, bottom: 50, left: 50 };
  const W = dims.w - pad.left - pad.right;
  const H = dims.h - pad.top - pad.bottom;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const xStep = W / Math.max(data.length - 1, 1);
  const toX = i => pad.left + i * xStep;
  const toY = v => pad.top + H - ((v - minV) / range) * H;
  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const areaPoints = `${pad.left},${pad.top + H} ` + data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ') + ` ${pad.left + W},${pad.top + H}`;
  const gridLines = 5;
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg ref={svgRef} width={width} height={dims.h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {Array.from({ length: gridLines }).map((_, i) => {
        const y = pad.top + (H / (gridLines - 1)) * i;
        const v = Math.round(maxV - ((maxV - minV) / (gridLines - 1)) * i);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + W} y2={y} stroke="#a78bfa" strokeOpacity="0.15" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#c4b5fd" fontSize={11}>{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={areaPoints} fill="url(#lineArea)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + tooltip triggers */}
      {data.map((d, i) => (
        <circle
          key={i} cx={toX(i)} cy={toY(d.value)} r={4}
          fill="#6d28d9" stroke="#a78bfa" strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => setTooltip({ x: toX(i), y: toY(d.value), label: d.label, value: d.value })}
          onMouseLeave={() => setTooltip(null)}
        />
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        i % labelStep === 0 && (
          <text key={i} x={toX(i)} y={pad.top + H + 18} textAnchor="middle" fill="#c4b5fd" fontSize={10}>
            {d.label}
          </text>
        )
      ))}
      {/* Y axis label */}
      <text x={12} y={pad.top + H / 2} textAnchor="middle" fill="#c4b5fd" fontSize={11} transform={`rotate(-90, 12, ${pad.top + H / 2})`}>AQI</text>
      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect x={tooltip.x - 40} y={tooltip.y - 38} width={80} height={30} rx={6} fill="#1e1b4b" fillOpacity="0.95" stroke="#4f46e5" strokeWidth={1} />
          <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" fill="#e0e7ff" fontSize={11} fontWeight="bold">{tooltip.value}</text>
          <text x={tooltip.x} y={tooltip.y - 10} textAnchor="middle" fill="#a78bfa" fontSize={9}>{tooltip.label}</text>
        </g>
      )}
    </svg>
  );
};

// --- Custom SVG Bar Chart ---
const BarChart = ({ data, width = '100%', height = 300 }) => {
  const svgRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 400, h: height });
  const [tooltip, setTooltip] = React.useState(null);

  React.useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (let e of entries) setDims({ w: e.contentRect.width, h: height });
    });
    if (svgRef.current) obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, [height]);

  if (!data || data.length === 0) return null;
  const pad = { top: 20, right: 20, bottom: 70, left: 55 };
  const W = dims.w - pad.left - pad.right;
  const H = dims.h - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = (W / data.length) * 0.55;
  const gap = W / data.length;
  const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
  const gridLines = 5;

  return (
    <svg ref={svgRef} width={width} height={dims.h} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {Array.from({ length: gridLines }).map((_, i) => {
        const y = pad.top + (H / (gridLines - 1)) * i;
        const v = Math.round(maxV - (maxV / (gridLines - 1)) * i);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + W} y2={y} stroke="#a78bfa" strokeOpacity="0.15" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#c4b5fd" fontSize={11}>{v}</text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = pad.left + gap * i + (gap - barW) / 2;
        const barH = Math.max((d.value / maxV) * H, 2);
        const y = pad.top + H - barH;
        const color = COLORS[i % COLORS.length];
        return (
          <g key={i}
            onMouseEnter={() => setTooltip({ x: x + barW / 2, y, label: d.label, value: d.value, unit: d.unit || 'μg/m³' })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={barW} height={barH} rx={5} fill={`url(#bar${i})`} />
            {/* Value on top of bar */}
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={color} fontSize={11} fontWeight="bold">
              {typeof d.value === 'number' ? d.value.toFixed(1) : d.value}
            </text>
            {/* Label below bar */}
            <text x={x + barW / 2} y={pad.top + H + 18} textAnchor="middle" fill="#c4b5fd" fontSize={12} fontWeight="bold">
              {d.label}
            </text>
            {/* Unit below label */}
            <text x={x + barW / 2} y={pad.top + H + 33} textAnchor="middle" fill="#a78bfa" fontSize={9}>
              {d.unit || 'μg/m³'}
            </text>
            {/* Color dot legend */}
            <rect x={x + barW / 2 - 5} y={pad.top + H + 42} width={10} height={4} rx={2} fill={color} />
          </g>
        );
      })}
      {/* Y axis label */}
      <text x={12} y={pad.top + H / 2} textAnchor="middle" fill="#c4b5fd" fontSize={11} transform={`rotate(-90, 12, ${pad.top + H / 2})`}>μg/m³</text>
      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect x={tooltip.x - 42} y={tooltip.y - 45} width={84} height={38} rx={6} fill="#1e1b4b" fillOpacity="0.95" stroke="#4f46e5" strokeWidth={1} />
          <text x={tooltip.x} y={tooltip.y - 28} textAnchor="middle" fill="#a78bfa" fontSize={10}>{tooltip.label}</text>
          <text x={tooltip.x} y={tooltip.y - 14} textAnchor="middle" fill="#e0e7ff" fontSize={12} fontWeight="bold">{typeof tooltip.value === 'number' ? tooltip.value.toFixed(2) : tooltip.value}</text>
          <text x={tooltip.x} y={tooltip.y - 2} textAnchor="middle" fill="#c4b5fd" fontSize={9}>{tooltip.unit}</text>
        </g>
      )}
    </svg>
  );
};

const API_BASE_URL = 'http://localhost:5001/api';

const App = () => {
  const [locationObj, setLocationObj] = useState(null);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [locLoading, setLocLoading] = useState(false);

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (locationObj) {
      fetchData(locationObj.lat, locationObj.lon);
      const interval = setInterval(() => fetchData(locationObj.lat, locationObj.lon), 300000); // 5 mins
      return () => clearInterval(interval);
    }
  }, [locationObj]);

  const fetchData = async (lat, lon) => {
    setLoading(true);
    try {
      let city = 'Local Area';
      try {
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const addr = geoRes.data.address;
        if (addr) {
          city = addr.city || addr.town || addr.county || addr.suburb || geoRes.data.name || 'Local Area';
        }
      } catch (e) { console.warn('Geocoding failed'); }

      const [liveRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/live?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`),
        axios.get(`${API_BASE_URL}/history`)
      ]);
      setData(liveRes.data);
      setHistory(historyRes.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to connect to the backend server. Make sure it's running.");
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    setLocLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationObj({ lat: position.coords.latitude, lon: position.coords.longitude });
          setLocLoading(false);
        },
        (error) => {
          alert('Location permission denied or unavailable. Please enter manually.');
          setLocLoading(false);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
      setLocLoading(false);
    }
  };

  const handleManualLocationSubmit = (e) => {
    e.preventDefault();
    if (latInput && lonInput) {
      setLocationObj({ lat: parseFloat(latInput), lon: parseFloat(lonInput) });
    }
  };

  const bgStyle = {
    backgroundColor: '#1E0A2D',
    backgroundImage: `
      radial-gradient(at 0% 0%, hsla(230, 90%, 30%, 1) 0, transparent 45%), 
      radial-gradient(at 100% 0%, hsla(280, 80%, 35%, 1) 0, transparent 55%), 
      radial-gradient(at 0% 100%, hsla(340, 80%, 35%, 1) 0, transparent 55%), 
      radial-gradient(at 100% 100%, hsla(15, 80%, 40%, 1) 0, transparent 50%), 
      radial-gradient(at 50% 50%, hsla(290, 70%, 30%, 1) 0, transparent 65%)
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  // Location Access Modal
  if (!locationObj) {
    return (
      <div style={bgStyle} className="min-h-screen flex items-center justify-center p-4">
        {/* Glassmorphism box */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] w-full max-w-md text-white">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
              <MapPin size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-center">Location Setup</h1>
          <p className="text-white/80 mb-8 text-center text-sm">We need your coordinates to measure intelligent local Air Quality levels.</p>
          
          <button 
            onClick={handleGetCurrentLocation}
            disabled={locLoading}
            className="w-full bg-white/20 hover:bg-white/30 transition-all text-white font-semibold py-4 rounded-xl mb-6 flex items-center justify-center gap-2 border border-white/20 shadow-lg backdrop-blur-md"
          >
            {locLoading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Navigation size={20} />}
            {locLoading ? "Detecting Location..." : "Use Current Location"}
          </button>
          
          <div className="flex items-center gap-4 mb-6 opacity-70">
            <div className="h-px bg-white flex-1"></div>
            <span className="text-white text-xs font-bold tracking-widest uppercase">Or Enter Manually</span>
            <div className="h-px bg-white flex-1"></div>
          </div>

          <form onSubmit={handleManualLocationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1 ml-1 uppercase tracking-wider">Latitude</label>
                <input type="number" step="any" value={latInput} onChange={e=>setLatInput(e.target.value)} required placeholder="28.61" className="w-full bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1 ml-1 uppercase tracking-wider">Longitude</label>
                <input type="number" step="any" value={lonInput} onChange={e=>setLonInput(e.target.value)} required placeholder="77.20" className="w-full bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/10 transition-all text-white font-bold py-4 rounded-xl shadow-xl mt-4 flex justify-center items-center gap-2">
              <Activity size={20} className="text-green-400" /> Connect Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Loading State
  if (loading) return (
    <div style={bgStyle} className="flex items-center justify-center min-h-screen">
      <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4 shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
        <p className="text-white font-bold tracking-widest uppercase text-sm">Analyzing atmosphere...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={bgStyle} className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/20 p-10 rounded-3xl text-center shadow-2xl max-w-md">
        <AlertTriangle className="h-20 w-20 text-red-400 mx-auto mb-6 drop-shadow-lg" />
        <h2 className="text-3xl font-black mb-3 text-white tracking-wide">Error</h2>
        <p className="text-white/80 leading-relaxed">{error}</p>
        <button 
          onClick={() => fetchData(locationObj.lat, locationObj.lon)}
          className="mt-8 w-full py-4 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl transition-all text-white font-bold shadow-lg backdrop-blur-md"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (aqi <= 100) return 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]';
    if (aqi <= 150) return 'text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]';
    if (aqi <= 200) return 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]';
    return 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]';
  };

  const getAQIBg = (aqi) => {
    if (aqi <= 50) return 'bg-emerald-500/20 border-emerald-500/30';
    if (aqi <= 100) return 'bg-yellow-500/20 border-yellow-500/30';
    if (aqi <= 150) return 'bg-orange-500/20 border-orange-500/30';
    if (aqi <= 200) return 'bg-red-500/20 border-red-500/30';
    return 'bg-rose-600/20 border-rose-600/30';
  };

  // Chart Data
  const aqiTrendData = history.map(h => ({
    label: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: h.prediction.current_aqi
  })).reverse();

  const pollutantData = [
    { label: 'PM2.5', value: data.pm25,  unit: 'μg/m³' },
    { label: 'PM10',  value: data.pm10,  unit: 'μg/m³' },
    { label: 'NO₂',   value: data.no2,   unit: 'μg/m³' },
    { label: 'CO',    value: data.co,    unit: 'mg/m³'  },
    { label: 'O₃',    value: data.o3,    unit: 'μg/m³' },
  ];

  return (
    <div style={bgStyle} className="min-h-screen text-slate-100 relative overflow-hidden font-sans">
      {/* Dynamic Overlay to make glassmorphism pop! */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[8px] z-0 pointer-events-none transition-all duration-1000"></div>
      
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full border border-white/30 text-xs font-bold tracking-widest uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Live System
            </div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3 drop-shadow-md">
              <Activity className="text-white opacity-80" size={36} />
              Air Quality Intelligence
            </h1>
            <p className="text-white/80 mt-2 flex items-center gap-2 font-medium">
              <MapPin size={18} /> {data.location.name} (LAT: {data.location.coordinates.latitude.toFixed(2)}, LON: {data.location.coordinates.longitude.toFixed(2)})
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/10 flex items-center gap-4 backdrop-blur-md">
              <Thermometer size={32} className="text-white opacity-80" />
              <div>
                <p className="text-xs text-white/60 uppercase font-black tracking-wider">Temp</p>
                <p className="text-2xl font-black">{data.temperature}°C</p>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/10 flex items-center gap-4 backdrop-blur-md">
              <Wind size={32} className="text-white opacity-80" />
              <div>
                <p className="text-xs text-white/60 uppercase font-black tracking-wider">Wind</p>
                <p className="text-2xl font-black">{data.wind_speed} km/h</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AQI Score Card */}
          <div className={`lg:col-span-1 border backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-500 hover:scale-[1.02] ${getAQIBg(data.prediction.current_aqi)}`}>
            <h3 className="text-sm font-black mb-6 uppercase tracking-[0.3em] text-white/70">Current Air Quality</h3>
            <div className={`text-9xl font-black mb-4 ${getAQIColor(data.prediction.current_aqi)}`}>
              {data.prediction.current_aqi}
            </div>
            <p className="text-2xl font-bold text-white tracking-wide drop-shadow-md">
              {data.prediction.current_aqi > 200 ? 'Very Unhealthy' : 
               data.prediction.current_aqi > 150 ? 'Unhealthy' :
               data.prediction.current_aqi > 100 ? 'Moderate' : 'Good'}
            </p>
            
            {data.is_hotspot && (
              <div className="mt-8 flex items-center gap-3 text-red-100 bg-red-500/80 backdrop-blur-md shadow-lg shadow-red-500/30 px-6 py-3 rounded-2xl border border-red-300/30">
                <AlertTriangle size={24} className="animate-pulse" />
                <span className="font-black tracking-widest uppercase text-sm">Hotspot Zone</span>
              </div>
            )}
          </div>

          {/* Source Prediction & Recommendations */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-xl hover:bg-white-[0.15] transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="text-white" /></div>
                <h3 className="font-black text-lg tracking-wide uppercase text-white/90">Source Profile</h3>
              </div>
              <div className="mb-6">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Likely Primary Source</p>
                <p className="text-3xl font-black text-white">{data.prediction.predicted_source}</p>
              </div>
              <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full shadow-[0_0_10px_rgba(129,140,248,0.8)]" 
                  style={{ width: `${(data.prediction.confidence || 0) * 100}%` }}
                ></div>
              </div>
              <p className="text-right text-xs font-bold text-white/50 mt-2 uppercase tracking-wide">AI Confidence: {((data.prediction.confidence || 0) * 100).toFixed(1)}%</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-xl hover:bg-white-[0.15] transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 rounded-xl"><Info className="text-white" /></div>
                <h3 className="font-black text-lg tracking-wide uppercase text-white/90">AI Action Plan</h3>
              </div>
              <p className="text-white/90 text-lg leading-relaxed font-medium">"{data.recommendation}"</p>
            </div>

            {/* Forecast Card */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-white/20 rounded-xl"><Navigation className="text-white" /></div>
                <h3 className="font-black text-lg tracking-wide uppercase text-white/90">Deep Learning Forecast</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {data.prediction.future_aqi.map((aqi, i) => (
                  <div key={i} className="bg-black/20 p-6 rounded-2xl border border-white/10 text-center hover:bg-white/5 transition-all">
                    <p className="text-xs text-white/60 font-black uppercase tracking-widest mb-2">+{i+1} Hour</p>
                    <p className={`text-4xl font-black ${getAQIColor(aqi)}`}>{aqi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-xl overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-3">AQI Trend — Last 20 Readings</p>
            <LineChart data={aqiTrendData} height={300} />
          </div>
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-xl overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-3">Current Pollutant Levels</p>
            <BarChart data={pollutantData} height={320} />
          </div>

          {/* Map View */}
          <div className="lg:col-span-3 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-xl">
            <h3 className="font-black text-lg mb-6 flex items-center gap-3 uppercase tracking-wide text-white/90">
              <div className="p-2 bg-white/20 rounded-xl"><MapPin className="text-white" /></div>
              Geospatial Analysis
            </h3>
            <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-inner h-[500px]">
              <MapContainer center={[data.location.coordinates.latitude, data.location.coordinates.longitude]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Circle 
                  center={[data.location.coordinates.latitude, data.location.coordinates.longitude]}
                  pathOptions={{ 
                    color: data.prediction.current_aqi > 150 ? '#ef4444' : '#3b82f6',
                    fillColor: data.prediction.current_aqi > 150 ? '#ef4444' : '#3b82f6',
                    fillOpacity: 0.3 
                  }}
                  radius={2500}
                />
                <Marker position={[data.location.coordinates.latitude, data.location.coordinates.longitude]}>
                  <Popup>
                    <div className="text-slate-900 font-sans p-1">
                      <p className="font-black text-lg border-b pb-1 mb-1">{data.location.name}</p>
                      <p className="font-medium text-sm">AQI Level: <span className="font-bold">{data.prediction.current_aqi}</span></p>
                      <p className="font-medium text-sm">Primary Source: <span className="font-bold">{data.prediction.predicted_source}</span></p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

        </div>

        {/* Alert Overlay */}
        {data.prediction.current_aqi > 200 && (
          <div className="fixed bottom-10 right-10 z-50 bg-red-600/90 backdrop-blur-md text-white p-6 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] flex items-center gap-5 border border-red-400 animate-bounce">
            <div className="bg-white/20 p-3 rounded-full">
              <AlertTriangle size={36} />
            </div>
            <div>
              <p className="font-black text-2xl uppercase tracking-widest drop-shadow-md">Evacuation Alert</p>
              <p className="opacity-90 font-medium mt-1">Hazardous AQI ({data.prediction.current_aqi}). Seek shelter.</p>
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-white/50 text-xs font-bold uppercase tracking-widest pb-8">
          <p>© 2026 Air Quality Pro | Environmental AI</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
