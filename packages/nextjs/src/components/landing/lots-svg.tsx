import { LOTS } from "./content";

type LotsSvgProps = {
  statuses: number[];
  flash?: string[];
  compact?: boolean;
  className?: string;
};

export function LotsSvg({
  statuses,
  flash = [],
  compact = false,
  className = "",
}: LotsSvgProps) {
  return (
    <svg
      viewBox="0 0 420 272"
      className={`alm-lots-svg ${compact ? "alm-lots-svg--compact" : ""} ${className}`.trim()}
      role="img"
      aria-label="Mapa de lotes de La Esperanza. Datos de ejemplo."
    >
      <title>Mapa de lotes de La Esperanza</title>
      {LOTS.map((lot, index) => (
        <g
          key={lot.id}
          className={`alm-lot alm-lot--s${statuses[index] ?? 0} ${
            flash.includes(lot.id) ? "is-flash" : ""
          }`.trim()}
        >
          <polygon points={lot.points} />
          <text x={lot.cx} y={lot.cy} textAnchor="middle">
            <tspan className="alm-ln" x={lot.cx}>
              {lot.number}
            </tspan>
            <tspan className="alm-lm" x={lot.cx} dy="17">
              {lot.name}
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
