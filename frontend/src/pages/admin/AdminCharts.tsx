const palette = [
  '#9b6ce6',
  '#42bcb0',
  '#eead56',
  '#678ae6',
  '#e479a6',
  '#a5ba63',
  '#bf91ed',
  '#7198a8',
  '#d18463',
  '#9097ab',
];
type Props = { rows: [string, number][]; label: string };
function ChartTable({ rows, label }: Props) {
  return (
    <details className="fold">
      <summary>View chart data</summary>
      <table>
        <caption className="visually-hidden">{label}</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Bookings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
export function StatusChart({ rows, label }: Props) {
  const total = rows.reduce((sum, row) => sum + row[1], 0);
  let offset = 0;
  if (!total) return <p>No bookings available yet.</p>;
  return (
    <div className="admin-chart">
      <svg
        className="admin-donut"
        viewBox="0 0 280 240"
        role="img"
        aria-label={`${label}: ${rows.map(([name, count]) => `${name} ${count}`).join(', ')}`}
      >
        {rows.map(([name, count], index) => {
          const length = (count / total) * 100;
          const start = offset;
          offset += length;
          return (
            <circle
              key={name}
              cx="140"
              cy="120"
              r="85"
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth="28"
              pathLength="100"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-start}
              transform="rotate(-90 140 120)"
            >
              <title>{`${name}: ${count} (${Math.round(length)}%)`}</title>
            </circle>
          );
        })}
        <text x="140" y="118" textAnchor="middle" className="chart-total">
          {total}
        </text>
        <text x="140" y="143" textAnchor="middle" className="chart-label">
          Bookings
        </text>
      </svg>
      <ul className="admin-chart-legend">
        {rows.map(([name, count], i) => (
          <li key={name}>
            <i style={{ background: palette[i % palette.length] }} />
            <span>{name}</span>
            <b>{count}</b>
          </li>
        ))}
      </ul>
      <ChartTable rows={rows} label={label} />
    </div>
  );
}
export function CityChart({ rows, label }: Props) {
  if (!rows.length) return <p>No bookings available yet.</p>;
  const ceiling = Math.max(4, Math.ceil(Math.max(...rows.map((r) => r[1])) / 4) * 4);
  const width = Math.max(420, rows.length * 86 + 70);
  const plotWidth = width - 70;
  const step = plotWidth / rows.length;
  return (
    <div className="admin-chart">
      <div
        className="admin-chart-scroll"
        tabIndex={0}
        role="region"
        aria-label="Customer city chart; scroll horizontally for more cities"
      >
        <svg
          viewBox={`0 0 ${width} 330`}
          style={{ minWidth: width }}
          role="img"
          aria-label={`${label}: ${rows.map(([name, count]) => `${name} ${count}`).join(', ')}`}
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = 245 - tick * 52;
            return (
              <g key={tick}>
                <line x1="45" x2={width - 20} y1={y} y2={y} className="chart-gridline" />
                <text x="35" y={y + 4} textAnchor="end" className="chart-label">
                  {(ceiling * tick) / 4}
                </text>
              </g>
            );
          })}
          {rows.map(([name, count], index) => {
            const x = 45 + step * index + step * 0.2;
            const height = (count / ceiling) * 208;
            return (
              <g key={name}>
                <rect
                  x={x}
                  y={245 - height}
                  width={step * 0.6}
                  height={height}
                  rx="6"
                  fill={palette[0]}
                >
                  <title>{`${name}: ${count} bookings`}</title>
                </rect>
                <text
                  x={x + step * 0.3}
                  y={235 - height}
                  textAnchor="middle"
                  className="chart-value"
                >
                  {count}
                </text>
                <text
                  x={x + step * 0.3}
                  y="267"
                  textAnchor="end"
                  transform={`rotate(-30 ${x + step * 0.3} 267)`}
                  className="chart-label"
                >
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ChartTable rows={rows} label={label} />
    </div>
  );
}
