// Componentes de visualización de datos (SVG puro, sin librerías).
// Datos de demo estáticos → los charts son deterministas, no animados.

export type Segment = { label: string; value: number; color: string };

/** Sparkline: mini gráfico de línea de tendencia. */
export function Sparkline({
  data,
  color = "#3a7d44",
  className = "",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const w = 120;
  const h = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
}

/** Donut: gráfico de proporción minimalista. */
export function Donut({
  segments,
  size = 132,
  thickness = 16,
  center,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {center}
        </div>
      )}
    </div>
  );
}

/** AreaLine: gráfico de línea suavizada con área sombreada. */
export function AreaLine({
  data,
  color = "#3a7d44",
  height = 96,
  className = "",
}: {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const w = 100;
  const h = height > 0 ? height : 96;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  // Suavizado: catmull-rom a bezier simple
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C ${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const area = `${d} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={area} fill={color} opacity={0.14} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

/** WindRose: rosa de los vientos con intensidad por dirección. */
export function WindRose({
  values,
  size = 88,
}: {
  values: Record<string, number>;
  size?: number;
}) {
  const dirs = Object.keys(values);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {[34, 46, 58].map((rr) => (
        <circle key={rr} cx={50} cy={50} r={rr} fill="none" stroke="var(--border)" strokeWidth={0.8} />
      ))}
      {dirs.map((d, i) => {
        const v = values[d];
        const ang = (i / dirs.length) * 360 - 90;
        const rad = (ang * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 30;
        const y1 = 50 + Math.sin(rad) * 30;
        const x2 = x1 + Math.cos(rad) * v;
        const y2 = y1 + Math.sin(rad) * v;
        return (
          <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8754f" strokeWidth={1.6} strokeLinecap="round" />
        );
      })}
      <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="var(--text-muted)">
        N
      </text>
    </svg>
  );
}

/** SatelliteMap: texto de campo satelital con parcelas superpuestas. */
export function SatelliteMap({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {/* Textura de prado */}
      <defs>
        <radialGradient id="sat-glow" cx="40%" cy="30%" r="90%">
          <stop offset="0%" stopColor="#6b8f4e" />
          <stop offset="45%" stopColor="#4c7a46" />
          <stop offset="80%" stopColor="#3f6b3b" />
          <stop offset="100%" stopColor="#2f5233" />
        </radialGradient>
      </defs>
      <rect width={600} height={360} fill="url(#sat-glow)" />
      {/* Caminos/acequias */}
      <path d="M0 190 Q 150 210 300 195 T 600 200" fill="none" stroke="#2a4530" strokeWidth={7} strokeLinecap="round" />
      <path d="M260 0 Q 250 120 290 360" fill="none" stroke="#2a4530" strokeWidth={5} strokeLinecap="round" />
      {/* Parcelas con distinto índice NDVI */}
      <polygon points="60,40 250,50 240,175 50,160" fill="#7bb26a" opacity={0.5} stroke="#e9f0e8" strokeWidth={2} />
      <polygon points="270,55 420,40 430,140 300,150" fill="#5c9450" opacity={0.55} stroke="#e9f0e8" strokeWidth={2} />
      <polygon points="440,45 580,60 575,150 465,135" fill="#c9a227" opacity={0.45} stroke="#e9f0e8" strokeWidth={2} />
      <polygon points="50,180 245,190 230,340 60,320" fill="#3a7d44" opacity={0.5} stroke="#e9f0e8" strokeWidth={2} />
      <polygon points="300,175 430,160 450,300 320,320" fill="#6b8f4e" opacity={0.5} stroke="#e9f0e8" strokeWidth={2} />
      <polygon points="475,175 585,170 580,300 470,330" fill="#c8754f" opacity={0.4} stroke="#e9f0e8" strokeWidth={2} />
      {/* Overlay de calor sutíl */}
      <polygon points="300,175 430,160 450,300 320,320" fill="#c7911c" opacity={0.12} />
    </svg>
  );
}