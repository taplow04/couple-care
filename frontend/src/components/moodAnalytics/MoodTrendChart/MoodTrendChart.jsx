import "./MoodTrendChart.css";

/* SVG chart constants */
const W  = 320;
const H  = 148;
const PT = 20; // padding top
const PR = 16; // padding right
const PB = 30; // padding bottom
const PL = 28; // padding left
const CW = W - PL - PR; // chart width  = 276
const CH = H - PT - PB; // chart height = 98

const px  = (i, n) => PL + (n <= 1 ? CW / 2 : (i / (n - 1)) * CW);
const py  = (v)    => PT + ((10 - v) / 9) * CH;
const bY  = PT + CH; // bottom of chart area

const pts = (data) =>
  data.map((d, i) => `${px(i, data.length)},${py(d.intensity)}`).join(" ");

const area = (data) => {
  if (!data.length) return "";
  const n = data.length;
  const linePts = data.map((d, i) => `${px(i, n)} ${py(d.intensity)}`).join(" L ");
  return `M ${px(0, n)} ${bY} L ${linePts} L ${px(n - 1, n)} ${bY} Z`;
};

const fmtShort = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d));

const GRID_VALS = [2, 5, 8, 10];
const GRID_IDS  = ["g2", "g5", "g8", "g10"];

const MoodTrendChart = ({ myTrend, partnerTrend, myName, partnerName }) => {
  const myData  = myTrend      ?? [];
  const prtData = partnerTrend ?? [];
  const hasAny  = myData.length > 0 || prtData.length > 0;

  return (
    <div className="mtc">
      <div className="mtc__head">
        <h2 className="mtc__title">Mood Intensity Trend</h2>
        <p className="mtc__sub">Last {Math.max(myData.length, prtData.length)} entries</p>
      </div>

      {!hasAny ? (
        <div className="mtc__empty">
          <span className="mtc__empty-emoji">📈</span>
          <p className="mtc__empty-text">Log moods to see your trend chart.</p>
        </div>
      ) : (
        <div className="mtc__card">
          {/* Legend */}
          <div className="mtc__legend">
            {myData.length > 0 && (
              <div className="mtc__legend-item">
                <span className="mtc__legend-dot mtc__legend-dot--me" />
                <span className="mtc__legend-label">{myName?.split(" ")[0] ?? "You"}</span>
              </div>
            )}
            {prtData.length > 0 && (
              <div className="mtc__legend-item">
                <span className="mtc__legend-dot mtc__legend-dot--partner" />
                <span className="mtc__legend-label">{partnerName?.split(" ")[0] ?? "Partner"}</span>
              </div>
            )}
          </div>

          {/* SVG chart */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mtc__svg"
            aria-label="Mood intensity trend chart"
          >
            <defs>
              <linearGradient id="meTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ff5c8a" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ff5c8a" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="prtTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7c5cff" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {GRID_VALS.map((v, gi) => (
              <g key={GRID_IDS[gi]}>
                <line
                  x1={PL} y1={py(v)} x2={W - PR} y2={py(v)}
                  stroke="var(--border)" strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text x={PL - 4} y={py(v) + 4} className="mtc__axis-label" textAnchor="end">
                  {v}
                </text>
              </g>
            ))}

            {/* Area fills */}
            {myData.length > 1 && (
              <path d={area(myData)} fill="url(#meTrendGrad)" />
            )}
            {prtData.length > 1 && (
              <path d={area(prtData)} fill="url(#prtTrendGrad)" />
            )}

            {/* Partner line (dashed, drawn first so mine is on top) */}
            {prtData.length > 1 && (
              <polyline
                points={pts(prtData)}
                fill="none"
                stroke="#7c5cff"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="5 3"
                className="mtc__line"
              />
            )}

            {/* My line */}
            {myData.length > 1 && (
              <polyline
                points={pts(myData)}
                fill="none"
                stroke="#ff5c8a"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="mtc__line"
              />
            )}

            {/* Partner dots */}
            {prtData.map((d, i) => (
              <circle
                key={`p${i}`}
                cx={px(i, prtData.length)}
                cy={py(d.intensity)}
                r="3"
                fill="#7c5cff"
                stroke="var(--card)"
                strokeWidth="1.5"
              />
            ))}

            {/* My dots */}
            {myData.map((d, i) => (
              <circle
                key={`m${i}`}
                cx={px(i, myData.length)}
                cy={py(d.intensity)}
                r="3.5"
                fill="#ff5c8a"
                stroke="var(--card)"
                strokeWidth="2"
              />
            ))}

            {/* X-axis date labels */}
            {myData.length > 0 && (
              <>
                <text
                  x={px(0, myData.length)}
                  y={H - 4}
                  className="mtc__x-label"
                  textAnchor="middle"
                >
                  {fmtShort(myData[0].createdAt)}
                </text>
                {myData.length > 1 && (
                  <text
                    x={px(myData.length - 1, myData.length)}
                    y={H - 4}
                    className="mtc__x-label"
                    textAnchor="middle"
                  >
                    {fmtShort(myData[myData.length - 1].createdAt)}
                  </text>
                )}
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default MoodTrendChart;
