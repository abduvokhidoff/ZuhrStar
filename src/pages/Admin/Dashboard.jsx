import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../../redux/authSlice";
import axios from "axios";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://zuhrstar-production.up.railway.app";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector((s) => s.auth);

  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]); // <-- вместо users
  const [checks, setChecks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ===== Refresh token (axios) =====
  const refreshAccessToken = async () => {
    const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken }, {
      headers: { "Content-Type": "application/json" },
    });
    // ожидаем { user, accessToken, refreshToken }
    dispatch(
      setCredentials({
        user: res.data.user,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      })
    );
    return res.data.accessToken;
  };

  // ===== Axios GET с автоматическим рефрешем =====
  const axiosGetAuth = async (url) => {
    try {
      return await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      if (e?.response?.status === 401 && refreshToken) {
        const newTok = await refreshAccessToken();
        return await axios.get(url, {
          headers: { Authorization: `Bearer ${newTok}` },
        });
      }
      throw e;
    }
  };

  // ===== Загрузка данных =====
  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr("");
    try {
      const [st, gr, tea, ch] = await Promise.all([
        axiosGetAuth(`${API_BASE}/api/students`),
        axiosGetAuth(`${API_BASE}/api/groups`),
        axiosGetAuth(`${API_BASE}/api/teachers`), // <-- ОБЯЗАТЕЛЬНО axios GET
        axiosGetAuth(`${API_BASE}/api/checks`),   // <-- axios GET
      ]);

      setStudents(Array.isArray(st.data) ? st.data : []);
      setGroups(Array.isArray(gr.data) ? gr.data : []);
      // /api/teachers => { teachers: [...] }
      setTeachers(Array.isArray(tea?.data?.teachers) ? tea.data.teachers : []);
      setChecks(Array.isArray(ch.data) ? ch.data : []);
    } catch (e) {
      console.error(e);
      setErr("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [accessToken]);

  // ===== Utils =====
  const safeDate = (v) => {
    const raw =
      v?.date_of_payment ||
      v?.date_Of_Create ||
      v?.createdAt ||
      v?.created_at ||
      v?.created ||
      v?.date ||
      v?.check_date ||
      v?.registered_at ||
      null;
    const d = raw ? new Date(raw) : null;
    return isNaN(d?.getTime?.()) ? null : d;
  };
  const number = (n) => {
    const x = typeof n === "string" ? Number(n) : n;
    return Number.isFinite(x) ? x : 0;
  };
  const fmtNum = (n) => (Number.isFinite(n) ? n.toLocaleString("ru-RU") : "0");

  // ===== KPI =====
  const totalStudents = students.length;
  const totalGroups = groups.length;

  // Только Mentor
  const mentorsCount = useMemo(() => {
    return Array.isArray(teachers)
      ? teachers.filter((t) => String(t?.role || "").toLowerCase() === "mentor")
          .length
      : 0;
  }, [teachers]);

  // KUNLIK TO‘LOVLAR — только за сегодня
  const todayDailyPayment = useMemo(() => {
    if (!Array.isArray(checks)) return 0;
    const now = new Date();
    const y = now.getFullYear(),
      m = now.getMonth(),
      d = now.getDate();
    return checks.reduce((acc, c) => {
      const dt = safeDate(c);
      if (!dt) return acc;
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m &&
        dt.getDate() === d
      ) {
        const amount =
          number(c?.amount ?? c?.summa ?? c?.price ?? c?.total ?? 0) || 0;
        return acc + amount;
      }
      return acc;
    }, 0);
  }, [checks]);

  // ===== Графики (как у тебя было) =====
  const last12Months = useMemo(() => {
    const arr = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      arr.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    return arr;
  }, []);

  const monthlyRevenue = useMemo(() => {
    const bucket = Object.fromEntries(last12Months.map((x) => [x.label, 0]));
    checks.forEach((c) => {
      const dt = safeDate(c);
      if (!dt) return;
      const L = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (bucket[L] !== undefined) {
        bucket[L] += number(c?.amount ?? c?.summa ?? c?.price ?? c?.total ?? 0);
      }
    });
    return bucket;
  }, [checks, last12Months]);

  const groupGrowth = useMemo(() => {
    const perMonth = Object.fromEntries(last12Months.map((x) => [x.label, 0]));
    groups.forEach((g) => {
      const dt = safeDate(g);
      if (!dt) return;
      const L = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (perMonth[L] !== undefined) perMonth[L] += 1;
    });
    const labels = last12Months.map((x) => x.label);
    let run = 0;
    const cumulative = labels.map((L) => (run += perMonth[L]));
    return { labels, cumulative };
  }, [groups, last12Months]);

  // Монотонная кубическая кривая (Fritsch–Carlson) → Cubic Bézier, без overshoot
const makeLinePath = (values, w = 700, h = 220, pad = 14) => {
  const num = (v) => (typeof v === "string" ? Number(v) : v) || 0;
  const data = values.map(num);
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = Math.max(max - min, 1);

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const x = (i) => (data.length <= 1 ? pad + innerW / 2 : pad + (i * innerW) / (data.length - 1));
  const y = (v) => pad + innerH - ((v - min) / range) * innerH;

  const pts = data.map((v, i) => ({ x: x(i), y: y(v), v }));

  if (pts.length === 0) return { d: "", area: "", points: [] };
  if (pts.length === 1) {
    const p = pts[0], base = pad + innerH;
    return { d: `M ${p.x} ${p.y}`, area: `M ${p.x} ${p.y} L ${p.x} ${base} Z`, points: [{ cx: p.x, cy: p.y, v: data[0] }] };
  }
  if (pts.length === 2) {
    const [p0, p1] = pts; const base = pad + innerH;
    return {
      d: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
      area: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p1.x} ${base} L ${p0.x} ${base} Z`,
      points: pts.map((p, i) => ({ cx: p.x, cy: p.y, v: data[i] })),
    };
  }

  // 1) нормированные X,Y для расчёта касательных
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);

  // 2) вычисляем секущие и монотонные касательные по Fritsch–Carlson
  const dx = xs.slice(1).map((x, i) => x - xs[i]);
  const dy = ys.slice(1).map((y, i) => y - ys[i]);
  const m = dx.map((d, i) => (d === 0 ? 0 : dy[i] / d)); // секущие наклоны (в экранных координатах Y вниз)

  const t = new Array(ys.length).fill(0);
  t[0] = m[0];
  t[ys.length - 1] = m[m.length - 1];
  for (let i = 1; i < ys.length - 1; i++) {
    // если меняется знак — делаем горизонтальную касательную (ломаем ringing)
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      // гармоническое среднее секущих
      t[i] = (2 * m[i - 1] * m[i]) / (m[i - 1] + m[i]);
    }
  }

  // 3) ограничиваем касательные, чтобы исключить overshoot (Fritsch–Carlson limiter)
  for (let i = 0; i < m.length; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }

  // 4) переводим в кубические Безье: контрольные точки для каждого сегмента
  let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < m.length; i++) {
    const x0 = xs[i],   y0 = ys[i];
    const x1 = xs[i+1], y1 = ys[i+1];
    const dx01 = x1 - x0;

    const cp1x = x0 + dx01 / 3;
    const cp1y = y0 + (t[i] * dx01) / 3;

    const cp2x = x1 - dx01 / 3;
    const cp2y = y1 - (t[i + 1] * dx01) / 3;

    // дополнительная страховка: зажать в рамку графика
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const yMin = pad, yMax = pad + innerH;
    const CP1Y = clamp(cp1y, yMin, yMax);
    const CP2Y = clamp(cp2y, yMin, yMax);

    d += ` C ${cp1x.toFixed(2)} ${CP1Y.toFixed(2)} ${cp2x.toFixed(2)} ${CP2Y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  const base = pad + innerH;
  const first = pts[0], last = pts[pts.length - 1];
  const area = `${d} L ${last.x.toFixed(2)} ${base} L ${first.x.toFixed(2)} ${base} Z`;

  const points = pts.map((p, i) => ({ cx: p.x, cy: p.y, v: data[i] }));
  return { d, area, points };
};

  const revLabels = last12Months.map((x) => x.label);
  const revValues = revLabels.map((L) => monthlyRevenue[L] || 0);
  const growthLabels = groupGrowth.labels;
  const growthValues = groupGrowth.cumulative;

  const revPath = makeLinePath(revValues);
  const growthPath = makeLinePath(growthValues);

  const last5Students = useMemo(() => {
    const copy = [...students];
    copy.sort(
      (a, b) =>
        (safeDate(b)?.getTime?.() || 0) - (safeDate(a)?.getTime?.() || 0)
    );
    return copy.slice(0, 5);
  }, [students]);

  const last5Groups = useMemo(() => {
    const copy = [...groups];
    copy.sort(
      (a, b) =>
        (safeDate(b)?.getTime?.() || 0) - (safeDate(a)?.getTime?.() || 0)
    );
    return copy.slice(0, 5);
  }, [groups]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text ">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">
              {new Date().toLocaleDateString("ru-RU")}
            </span>
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            >
              <span className="text-lg">⟳</span>
              <span>Yangilash</span>
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 flex items-center justify-between rounded--xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <span>{err}</span>
            <button
              onClick={loadAll}
              className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "O‘QUVCHILAR",
              value: totalStudents,
              emoji: "🎓",
              ring: "ring-blue-200",
              grad: "from-blue-500/10 to-blue-500/0",
            },
            {
              label: "GURUHLAR",
              value: totalGroups,
              emoji: "👥",
              ring: "ring-indigo-200",
              grad: "from-indigo-500/10 to-indigo-500/0",
            },
            {
              label: "MENTORLAR",
              value: mentorsCount, // <-- только Mentor
              emoji: "🧑‍🏫",
              ring: "ring-emerald-200",
              grad: "from-emerald-500/10 to-emerald-500/0",
            },
            {
              label: "KUNLIK TO‘LOVLAR",
              value: fmtNum(todayDailyPayment),
              emoji: "🧾",
              ring: "ring-amber-200",
              grad: "from-amber-500/10 to-amber-500/0",
            },
          ].map((k, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ${k.ring} transition hover:shadow-md`}
            >
              
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.grad}`} />
              <div className="relative flex items-center justify-between">
                <div>
                  {loading ? (
                    <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
                  ) : (
                    <div className="text-3xl font-black text-slate-900">
                      {k.value}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] font-semibold tracking-[.2em] text-slate-500">
                    {k.label}
                  </div>
                </div>
                <div className="text-3xl">{k.emoji}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Oylik tushum"
            labels={revLabels}
            path={revPath}
            stroke="#4f46e5"
            fillFrom="#6366f1"
            fillTo="#a5b4fc"
            valueFormatter={(i) => fmtNum(revValues[i] || 0)}
          />
          <ChartCard
            title="Guruh o‘sish dinamikasi"
            labels={growthLabels}
            path={growthPath}
            stroke="#10b981"
            fillFrom="#34d399"
            fillTo="#a7f3d0"
            valueFormatter={(i) => String(growthValues[i] || 0)}
          />
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListCard
            title="Oxirgi o‘quvchilar"
            loading={loading}
            empty="Hali o‘quvchi qo‘shilmagan."
            items={last5Students.map((s) => {
              const full =
                (s.fullName ||
                  `${s?.surname || ""} ${s?.name || ""}`.trim()).trim() || "—";
              const phone = s?.student_phone || s?.phone || "—";
              const dt = safeDate(s);
              return {
                id: s._id || s.student_id,
                primary: full,
                secondary: phone,
                meta: dt ? dt.toLocaleDateString("ru-RU") : "—",
              };
            })}
          />
          <ListCard
            title="Oxirgi guruhlar"
            loading={loading}
            empty="Hali guruh qo‘shilmagan."
            items={last5Groups.map((g) => {
              const dt = safeDate(g);
              const count = Array.isArray(g.students) ? g.students.length : 0;
              return {
                id: g._id || g.group_id || g.name,
                primary: g?.name || "—",
                secondary: `${g?.course || "—"} · ${count} talaba`,
                meta: dt ? dt.toLocaleDateString("ru-RU") : "—",
              };
            })}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Presentational subcomponents (light only) ---------- */

// Хелпер для безопасных id в SVG
function slugifyId(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ChartCard({ title, labels, path, stroke, fillFrom, fillTo, valueFormatter }) {
  const w = 700, h = 220, pad = 14;
  const gradId = `grad-${slugifyId(title)}-${labels?.[0] ?? "a"}`;

  // --- интерактив ---
  const [hover, setHover] = React.useState(null); // { idx, x, y }
  const svgRef = React.useRef(null);

  // найти ближайший индекс точки по координате мыши
  const findNearest = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const xInSvg = ((clientX - rect.left) / rect.width) * w; // в систему viewBox
    if (!Array.isArray(path?.points) || !path.points.length) return null;

    let best = 0;
    let bestDx = Math.abs(path.points[0].cx - xInSvg);
    for (let i = 1; i < path.points.length; i++) {
      const dx = Math.abs(path.points[i].cx - xInSvg);
      if (dx < bestDx) {
        bestDx = dx;
        best = i;
      }
    }
    const p = path.points[best];
    return { idx: best, x: p.cx, y: p.cy };
  };

  const onMove = (e) => {
    const nearest = findNearest(e.clientX);
    if (nearest) setHover(nearest);
  };
  const onLeave = () => setHover(null);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">
          {labels?.[0]?.slice(2)} — {labels?.[labels.length - 1]?.slice(2)}
        </div>
      </div>

      <div className="relative w-full h-[220px]">
        {/* Тултип поверх SVG */}
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-white/95 px-2 py-1 text-xs shadow-md ring-1 ring-slate-200"
            style={{
              left: `${(hover.x / w) * 100}%`,
              top: `${(hover.y / h) * 100}%`,
            }}
          >
            <div className="font-medium text-slate-800">
              {labels[hover.idx]}
            </div>
            <div className="text-slate-600">
              {valueFormatter(hover.idx)} {/* зарплата/тушум */}
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ background: "transparent" }}
          role="img"
          aria-label={title}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fillFrom} stopOpacity="0.30" />
              <stop offset="100%" stopColor={fillTo} stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* сетка */}
          <g stroke="#e5e7eb">
            <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} />
            <line x1={pad} y1={h - 60} x2={w - pad} y2={h - 60} stroke="#f1f5f9" />
            <line x1={pad} y1={h - 108} x2={w - pad} y2={h - 108} />
            <line x1={pad} y1={h - 154} x2={w - pad} y2={h - 154} stroke="#f1f5f9" />
            <line x1={pad} y1={pad + 4} x2={w - pad} y2={pad + 4} />
          </g>

          {/* заливка и линия */}
          <path d={path.area} fill={`url(#${gradId})`} />
          <path
            d={path.d}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* точки + title на каждой для нативного тултипа */}
          {path.points.map((p, i) => (
            <g key={i}>
              <circle cx={p.cx} cy={p.cy} r={hover?.idx === i ? 4.5 : 3.2} fill={stroke}>
                <title>{`${labels[i]}: ${valueFormatter(i)}`}</title>
              </circle>
            </g>
          ))}

          {/* вертикальный гайд при ховере */}
          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={pad}
                x2={hover.x}
                y2={h - pad}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* ось X: подписи месяцев */}
          {labels.map((L, i) => {
            const x = labels.length <= 1 ? w / 2 : pad + (i * (w - pad * 2)) / (labels.length - 1);
            return (
              <text
                key={L}
                x={x}
                y={h - 4}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] select-none"
              >
                {L.slice(2)}
              </text>
            );
          })}

          {/* невидимый слой для уверенного захвата мыши */}
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill="transparent"
            pointerEvents="all"
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          />
        </svg>
      </div>
    </div>
  );
}



function ListCard({ title, items, loading, empty }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="font-semibold text-slate-800">{title}</div>
      </div>
      <div className="p-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : items?.length ? (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li
                key={it.id}
                className="group flex items-center justify-between px-2 py-3 transition hover:bg-slate-50/70"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{it.primary}</span>
                    {it.secondary && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 group-hover:bg-slate-200">
                        {it.secondary}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{it.meta}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">{empty}</div>
        )}
      </div>
    </div>
  );
}
