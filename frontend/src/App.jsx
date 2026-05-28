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

  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center text-env-forest-muted/60 bg-gradient-to-b from-white to-env-sage-light/10 rounded-2xl border border-env-sage-light/20 p-6">
        <Activity size={36} className="mb-3 opacity-40 animate-pulse text-env-sage" />
        <p className="text-sm font-semibold">No historical readings recorded yet</p>
        <p className="text-xs mt-1 opacity-75">Click "Use Current Location" to generate data points.</p>
      </div>
    );
  }
  const pad = { top: 30, right: 20, bottom: 50, left: 50 };
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
          <stop offset="0%" stopColor="#4E8A64" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4E8A64" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {Array.from({ length: gridLines }).map((_, i) => {
        const y = pad.top + (H / (gridLines - 1)) * i;
        const v = Math.round(maxV - ((maxV - minV) / (gridLines - 1)) * i);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + W} y2={y} stroke="#EEF7F2" strokeWidth="1" strokeDasharray="4 4" />
            <text x={pad.left - 12} y={y + 4} textAnchor="end" fill="#4F6357" fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={areaPoints} fill="url(#lineArea)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#4E8A64" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + tooltip triggers */}
      {data.map((d, i) => (
        <circle
          key={i} cx={toX(i)} cy={toY(d.value)} r={5}
          fill="#FFFFFF" stroke="#4E8A64" strokeWidth="2.5"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => setTooltip({ x: toX(i), y: toY(d.value), label: d.label, value: d.value })}
          onMouseLeave={() => setTooltip(null)}
        />
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        i % labelStep === 0 && (
          <text key={i} x={toX(i)} y={pad.top + H + 24} textAnchor="middle" fill="#4F6357" fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">
            {d.label}
          </text>
        )
      ))}
      {/* Y axis label */}
      <text x={14} y={pad.top + H / 2} textAnchor="middle" fill="#4F6357" fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600" letterSpacing="0.05em" transform={`rotate(-90, 14, ${pad.top + H / 2})`}>AQI LEVEL</text>
      {/* Tooltip */}
      {tooltip && (
        <g>
          {/* Subtle soft tooltip card */}
          <rect x={tooltip.x - 45} y={tooltip.y - 48} width={90} height={38} rx={8} fill="#FFFFFF" stroke="#EEF7F2" strokeWidth={1} />
          <text x={tooltip.x} y={tooltip.y - 32} textAnchor="middle" fill="#1B2A22" fontSize={13} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700">{tooltip.value}</text>
          <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" fill="#4F6357" fontSize={9} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600" letterSpacing="0.02em">{tooltip.label}</text>
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
  const pad = { top: 30, right: 20, bottom: 70, left: 55 };
  const W = dims.w - pad.left - pad.right;
  const H = dims.h - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = (W / data.length) * 0.45;
  const gap = W / data.length;
  const COLORS = ['#4E8A64', '#2B6E70', '#D9901C', '#D9544C', '#83A590'];
  const gridLines = 5;

  return (
    <svg ref={svgRef} width={width} height={dims.h} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {Array.from({ length: gridLines }).map((_, i) => {
        const y = pad.top + (H / (gridLines - 1)) * i;
        const v = Math.round(maxV - (maxV / (gridLines - 1)) * i);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + W} y2={y} stroke="#EEF7F2" strokeWidth="1" strokeDasharray="4 4" />
            <text x={pad.left - 12} y={y + 4} textAnchor="end" fill="#4F6357" fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{v}</text>
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
                <stop offset="100%" stopColor={color} stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={`url(#bar${i})`} style={{ transition: 'all 0.3s ease' }} />
            {/* Value on top of bar */}
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill={color} fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700">
              {typeof d.value === 'number' ? d.value.toFixed(1) : d.value}
            </text>
            {/* Label below bar */}
            <text x={x + barW / 2} y={pad.top + H + 24} textAnchor="middle" fill="#1B2A22" fontSize={12} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700">
              {d.label}
            </text>
            {/* Unit below label */}
            <text x={x + barW / 2} y={pad.top + H + 38} textAnchor="middle" fill="#4F6357" fontSize={9} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">
              {d.unit || 'μg/m³'}
            </text>
            {/* Color dot legend */}
            <rect x={x + barW / 2 - 6} y={pad.top + H + 48} width={12} height={4} rx={2} fill={color} />
          </g>
        );
      })}
      {/* Y axis label */}
      <text x={14} y={pad.top + H / 2} textAnchor="middle" fill="#4F6357" fontSize={11} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600" letterSpacing="0.05em" transform={`rotate(-90, 14, ${pad.top + H / 2})`}>LEVELS</text>
      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect x={tooltip.x - 45} y={tooltip.y - 50} width={90} height={42} rx={8} fill="#FFFFFF" stroke="#EEF7F2" strokeWidth={1} />
          <text x={tooltip.x} y={tooltip.y - 36} textAnchor="middle" fill="#4F6357" fontSize={9} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600">{tooltip.label}</text>
          <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" fill="#1B2A22" fontSize={13} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700">{typeof tooltip.value === 'number' ? tooltip.value.toFixed(2) : tooltip.value}</text>
          <text x={tooltip.x} y={tooltip.y - 10} textAnchor="middle" fill="#4F6357" fontSize={8} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{tooltip.unit}</text>
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
    backgroundColor: '#F3F6F8',
    backgroundImage: `
      radial-gradient(at 0% 0%, hsla(210, 25%, 94%, 1) 0, transparent 50%), 
      radial-gradient(at 100% 0%, hsla(220, 20%, 95%, 1) 0, transparent 60%), 
      radial-gradient(at 0% 100%, hsla(200, 25%, 93%, 1) 0, transparent 50%), 
      radial-gradient(at 100% 100%, hsla(240, 15%, 95%, 1) 0, transparent 50%), 
      radial-gradient(at 50% 50%, hsla(215, 25%, 94%, 1) 0, transparent 60%)
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  // Location Access Modal
  if (!locationObj) {
    return (
      <div style={bgStyle} className="min-h-screen flex items-center justify-center p-4">
        {/* Ambient background decoration blobs for futuristic depth */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-env-sage/5 blur-3xl animate-ambient-1"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-env-amber/5 blur-3xl animate-ambient-2"></div>
        
        <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-env-sage-light/80 rounded-3xl p-8 shadow-premium-lg w-full max-w-md text-env-forest">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-env-sage-light/60 rounded-2xl flex items-center justify-center border border-env-sage/10 shadow-premium-sm">
              <MapPin size={32} className="text-env-sage" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold mb-2 text-center tracking-tight">Location Setup</h1>
          <p className="text-env-forest-muted mb-8 text-center text-sm font-medium">Coordinates are required to measure environmental metrics in your local area.</p>
          
          <button 
            onClick={handleGetCurrentLocation}
            disabled={locLoading}
            className="w-full bg-env-sage hover:bg-env-sage-dark transition-all text-white font-semibold py-4 rounded-xl mb-6 flex items-center justify-center gap-2 shadow-premium-sm hover:shadow-premium-md border border-env-sage-dark/10"
          >
            {locLoading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Navigation size={20} />}
            {locLoading ? "Detecting Location..." : "Use Current Location"}
          </button>
          
          <div className="flex items-center gap-4 mb-6 opacity-80">
            <div className="h-px bg-env-sage-light/80 flex-1"></div>
            <span className="text-env-forest-muted text-[10px] font-bold tracking-widest uppercase">Or Enter Manually</span>
            <div className="h-px bg-env-sage-light/80 flex-1"></div>
          </div>

          <form onSubmit={handleManualLocationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-env-forest-muted mb-1.5 ml-1 uppercase tracking-wider">Latitude</label>
                <input type="number" step="any" value={latInput} onChange={e=>setLatInput(e.target.value)} required placeholder="28.61" className="w-full bg-env-sage-light/30 border border-env-sage/10 rounded-xl px-4 py-3 text-env-forest placeholder-env-forest-muted/30 focus:outline-none focus:ring-2 focus:ring-env-sage/40 transition-all font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-env-forest-muted mb-1.5 ml-1 uppercase tracking-wider">Longitude</label>
                <input type="number" step="any" value={lonInput} onChange={e=>setLonInput(e.target.value)} required placeholder="77.20" className="w-full bg-env-sage-light/30 border border-env-sage/10 rounded-xl px-4 py-3 text-env-forest placeholder-env-forest-muted/30 focus:outline-none focus:ring-2 focus:ring-env-sage/40 transition-all font-semibold" />
              </div>
            </div>
            <button type="submit" className="w-full bg-env-forest hover:bg-black transition-all text-white font-bold py-4 rounded-xl shadow-premium-md mt-4 flex justify-center items-center gap-2 border border-env-forest/20">
              <Activity size={20} className="text-env-sage-light" /> Connect Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Loading State
  if (loading) return (
    <div style={bgStyle} className="flex items-center justify-center min-h-screen">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-env-sage-light/60 flex flex-col items-center shadow-premium-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-env-sage mb-4"></div>
        <p className="text-env-forest font-bold tracking-widest uppercase text-xs">Analyzing atmosphere...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={bgStyle} className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-xl border border-env-coral-light/60 p-10 rounded-3xl text-center shadow-premium-lg max-w-md">
        <AlertTriangle className="h-16 w-16 text-env-coral mx-auto mb-6" />
        <h2 className="text-3xl font-extrabold mb-3 text-env-forest tracking-tight">Error Connecting</h2>
        <p className="text-env-forest-muted leading-relaxed font-medium text-sm">{error}</p>
        <button 
          onClick={() => fetchData(locationObj.lat, locationObj.lon)}
          className="mt-8 w-full py-4 bg-env-sage hover:bg-env-sage-dark rounded-xl transition-all text-white font-bold shadow-premium-sm border border-env-sage/10"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return 'text-env-sage';
    if (aqi <= 100) return 'text-env-amber';
    if (aqi <= 150) return 'text-env-coral';
    if (aqi <= 200) return 'text-env-coral-dark';
    return 'text-[#9E2A2B]';
  };

  const getAQIBg = (aqi) => {
    if (aqi <= 50) return 'bg-gradient-to-br from-white to-[#EEF7F2] border-[#E2EFE7] shadow-premium-sm';
    if (aqi <= 100) return 'bg-gradient-to-br from-white to-[#FEF7E0] border-[#FBECC8] shadow-premium-sm';
    if (aqi <= 150) return 'bg-gradient-to-br from-white to-[#FCE8E6] border-[#F9CFCC] shadow-premium-sm';
    if (aqi <= 200) return 'bg-gradient-to-br from-white to-[#FCE8E6] border-[#F9CFCC] shadow-premium-sm';
    return 'bg-gradient-to-br from-white to-[#FCDEDD] border-[#F7B9B6] shadow-premium-sm';
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
    <div style={bgStyle} className="min-h-screen text-env-forest relative overflow-hidden font-sans pb-12">
      {/* Ambient background decoration blobs for premium visual depth */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-env-sage/5 blur-[120px] animate-ambient-1 pointer-events-none z-0"></div>
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] rounded-full bg-env-amber/5 blur-[150px] animate-ambient-2 pointer-events-none z-0"></div>
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-env-coral/5 blur-[180px] animate-ambient-3 pointer-events-none z-0"></div>
      
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/85 backdrop-blur-md border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-env-sage-light/80 rounded-full border border-env-sage/10 text-[10px] font-bold tracking-wider text-env-sage uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-env-sage animate-pulse"></span>
              Live Station
            </div>
            <h1 className="text-3xl font-extrabold text-env-forest flex items-center gap-3 tracking-tight">
              <Activity className="text-env-sage opacity-95" size={28} />
              BreathMetrics
            </h1>
            <p className="text-env-forest-muted/80 mt-2 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin size={16} className="text-env-sage" /> {data.location.name} <span className="opacity-40">|</span> LAT: {data.location.coordinates.latitude.toFixed(2)} <span className="opacity-40">|</span> LON: {data.location.coordinates.longitude.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-env-sage-light/20 px-5 py-4 rounded-2xl border border-env-sage-light/35 flex items-center gap-4 hover:scale-[1.01] transition-all">
              <Thermometer size={28} className="text-env-sage opacity-90" />
              <div>
                <p className="text-[10px] text-env-forest-muted/70 uppercase font-bold tracking-wider mb-0.5">Temperature</p>
                <p className="text-xl font-extrabold text-env-forest">{data.temperature}°C</p>
              </div>
            </div>
            <div className="bg-env-sage-light/20 px-5 py-4 rounded-2xl border border-env-sage-light/35 flex items-center gap-4 hover:scale-[1.01] transition-all">
              <Wind size={28} className="text-env-sage opacity-90" />
              <div>
                <p className="text-[10px] text-env-forest-muted/70 uppercase font-bold tracking-wider mb-0.5">Wind Speed</p>
                <p className="text-xl font-extrabold text-env-forest">{data.wind_speed} km/h</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* AQI Score Card */}
          <div className={`lg:col-span-1 border rounded-[32px] p-8 flex flex-col items-center justify-center text-center transition-all duration-500 hover:scale-[1.02] ${getAQIBg(data.prediction.current_aqi)}`}>
            <h3 className="text-xs font-bold mb-4 uppercase tracking-widest text-env-forest-muted/80">Current Air Quality</h3>
            <div className={`text-[8.5rem] font-extrabold leading-none tracking-tighter mb-4 ${getAQIColor(data.prediction.current_aqi)}`}>
              {data.prediction.current_aqi}
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-env-forest mb-2">
              {data.prediction.current_aqi > 200 ? 'Very Unhealthy' : 
               data.prediction.current_aqi > 150 ? 'Unhealthy' :
               data.prediction.current_aqi > 100 ? 'Moderate' : 'Good'}
            </p>
            
            {data.is_hotspot && (
              <div className="mt-6 flex items-center gap-2 text-env-coral-dark bg-env-coral-light/90 backdrop-blur-md shadow-premium-sm px-5 py-2.5 rounded-full border border-env-coral/20 font-semibold tracking-wide text-xs uppercase animate-pulse">
                <AlertTriangle size={16} />
                <span>Hotspot Zone</span>
              </div>
            )}
          </div>

          {/* Source Prediction & Recommendations */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/90 border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md hover:shadow-premium-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-env-sage-light rounded-2xl border border-env-sage/10 text-env-sage"><TrendingUp size={20} /></div>
                  <h3 className="font-bold text-base tracking-tight uppercase text-env-forest">Atmospheric Source Profile</h3>
                </div>
                <div className="mb-6">
                  <p className="text-env-forest-muted/70 text-[10px] font-bold uppercase tracking-wider mb-1.5">Likely Primary Source</p>
                  <p className="text-3xl font-extrabold text-env-forest tracking-tight">{data.prediction.predicted_source}</p>
                </div>
              </div>
              <div>
                <div className="w-full bg-env-sage-light/80 h-3.5 rounded-full overflow-hidden border border-env-sage/10 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-env-sage to-env-sage-dark h-full rounded-full shadow-inner" 
                    style={{ width: `${(data.prediction.confidence || 0) * 100}%` }}
                  ></div>
                </div>
                <p className="text-right text-[10px] font-bold text-env-sage mt-2.5 uppercase tracking-wider">AI Confidence: {((data.prediction.confidence || 0) * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-env-sand-light border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md hover:shadow-premium-lg transition-all flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-env-amber-light rounded-2xl border border-env-amber/10 text-env-amber"><Info size={20} /></div>
                <h3 className="font-bold text-base tracking-tight uppercase text-env-forest">AI Recommendation Engine</h3>
              </div>
              <p className="text-env-forest font-medium text-lg leading-relaxed italic mb-4">"{data.recommendation}"</p>
              <div className="text-[10px] font-bold text-env-amber uppercase tracking-wider">Targeted Action Advice</div>
            </div>

            {/* Forecast Card */}
            <div className="md:col-span-2 bg-white/90 border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-env-sky text-env-sky-dark border border-env-sky/20 rounded-2xl"><Navigation size={20} /></div>
                <h3 className="font-bold text-base tracking-tight uppercase text-env-forest">Deep Learning Forecast</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {data.prediction.future_aqi.map((aqi, i) => (
                  <div key={i} className="bg-gradient-to-br from-white to-env-sage-light/20 p-5 rounded-2xl border border-env-sage-light/40 text-center hover:bg-env-sage-light/40 transition-all shadow-premium-sm hover:scale-[1.01]">
                    <p className="text-[10px] text-env-forest-muted/70 font-bold uppercase tracking-wider mb-2">+{i+1} Hour</p>
                    <p className={`text-4xl font-extrabold ${getAQIColor(aqi)}`}>{aqi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="lg:col-span-2 bg-white/95 border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md overflow-hidden relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-env-forest-muted mb-4">AQI Trend — Last 20 Readings</p>
            <LineChart data={aqiTrendData} height={300} />
          </div>
          <div className="lg:col-span-1 bg-white/95 border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md overflow-hidden relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-env-forest-muted mb-4">Current Pollutant Levels</p>
            <BarChart data={pollutantData} height={320} />
          </div>

          {/* Map View */}
          <div className="lg:col-span-3 bg-white/95 border border-env-sage-light/60 rounded-[32px] p-8 shadow-premium-md relative z-10">
            <h3 className="font-bold text-base mb-6 flex items-center gap-3 uppercase tracking-wider text-env-forest">
              <div className="p-2.5 bg-env-sage-light rounded-2xl border border-env-sage/10 text-env-sage"><MapPin size={20} /></div>
              Geospatial Analysis
            </h3>
            <div className="rounded-2xl overflow-hidden border border-env-sage-light/80 shadow-premium-md h-[500px]">
              <MapContainer center={[data.location.coordinates.latitude, data.location.coordinates.longitude]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Circle 
                  center={[data.location.coordinates.latitude, data.location.coordinates.longitude]}
                  pathOptions={{ 
                    color: data.prediction.current_aqi > 150 ? '#D9544C' : '#4E8A64',
                    fillColor: data.prediction.current_aqi > 150 ? '#D9544C' : '#4E8A64',
                    fillOpacity: 0.25
                  }}
                  radius={2500}
                />
                <Marker position={[data.location.coordinates.latitude, data.location.coordinates.longitude]}>
                  <Popup>
                    <div className="text-env-forest font-sans p-1">
                      <p className="font-extrabold text-base border-b border-env-sage-light pb-1 mb-1">{data.location.name}</p>
                      <p className="font-semibold text-xs text-env-forest-muted">AQI Level: <span className={`font-extrabold ${getAQIColor(data.prediction.current_aqi)}`}>{data.prediction.current_aqi}</span></p>
                      <p className="font-semibold text-xs text-env-forest-muted mt-0.5">Primary Source: <span className="font-extrabold text-env-forest">{data.prediction.predicted_source}</span></p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

        </div>

        {/* Alert Overlay */}
        {data.prediction.current_aqi > 200 && (
          <div className="fixed bottom-8 right-8 z-50 bg-white/98 backdrop-blur-md text-env-forest p-6 rounded-[24px] shadow-premium-lg flex items-center gap-5 border border-env-coral/45 animate-pulse max-w-sm">
            <div className="bg-env-coral-light p-3 rounded-2xl border border-env-coral/20 text-env-coral">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="font-extrabold text-base text-env-coral uppercase tracking-wide">Hazardous Alert</p>
              <p className="text-env-forest-muted font-medium text-xs mt-1">Hazardous local AQI detected ({data.prediction.current_aqi}). Limit prolonged outdoor activity.</p>
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-env-forest-muted/50 text-[10px] font-bold uppercase tracking-widest pb-8">
          <p>© 2026 BreathMetrics | Environmental AI & Air Quality Intelligence Console</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
