import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

const API = "http://localhost:5000";

const FITUR_SLIDER = {
  Age: { label: "Umur (tahun)", min: 10, max: 69, step: 1, default: 35 },
  Hemoglobin: { label: "Hemoglobin (g/dL)", min: 5, max: 18, step: 0.1, default: 12 },
  Fetal_Hemoglobin: { label: "Fetal Hemoglobin (%)", min: 0, max: 30, step: 0.1, default: 1.5 },
  RDW_CV: { label: "RDW-CV (%)", min: 10, max: 30, step: 0.1, default: 14 },
  Serum_Ferritin: { label: "Serum Ferritin (ng/mL)", min: 5, max: 500, step: 1, default: 80 },
  BRCA1_Expression: { label: "BRCA1 Expression", min: 0, max: 10, step: 0.01, default: 1.0 },
  Sweat_Chloride: { label: "Sweat Chloride (mmol/L)", min: 10, max: 120, step: 0.1, default: 30 },
  Sickled_RBC_Percent: { label: "Sickled RBC (%)", min: 0, max: 10, step: 0.01, default: 0.5 },
  IL6_Level: { label: "IL-6 Level (pg/mL)", min: 0, max: 35, step: 0.01, default: 5 },
};

const FITUR_TOMBOL = {
  Gender: {
    label: "Gender",
    options: [{ label: "Perempuan", value: 0 }, { label: "Laki-laki", value: 1 }],
    default: 0,
  },
  Family_History: {
    label: "Riwayat Keluarga",
    options: [{ label: "Tidak Ada", value: 0 }, { label: "Ada", value: 1 }],
    default: 0,
  },
  p53_Mutation: {
    label: "p53 Mutation",
    options: [{ label: "Tidak Ada", value: 0 }, { label: "Ada", value: 1 }],
    default: 0,
  },
};

const WARNA = {
  "Thalassemia": "#0C447C",
  "Hemophilia": "#185FA5",
  "Breast Cancer": "#378ADD",
  "Sickle Cell Anemia": "#85B7EB",
  "Cystic Fibrosis": "#B5D4F4",
};

const STATUS_STYLE = {
  affected:   { bg: "#FCEBEB", color: "#791F1F", text: "Affected (Terkena)" },
  carrier:    { bg: "#FAEEDA", color: "#633806", text: "Carrier (Pembawa)" },
  unaffected: { bg: "#EAF3DE", color: "#27500A", text: "Unaffected (Sehat)" },
};

const defaultFitur = {
  ...Object.fromEntries(Object.entries(FITUR_SLIDER).map(([k, v]) => [k, v.default])),
  ...Object.fromEntries(Object.entries(FITUR_TOMBOL).map(([k, v]) => [k, v.default])),
};

const s = {
  app: { fontFamily: "sans-serif", minHeight: "100vh", background: "#EBF3FB" },
  topbar: { background: "#0C447C", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  topbarLeft: { display: "flex", alignItems: "center", gap: 10 },
  topbarLogo: { width: 36, height: 36, background: "#185FA5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  topbarTitle: { fontSize: 15, fontWeight: 600, color: "#E6F1FB", margin: 0 },
  topbarSub: { fontSize: 11, color: "#85B7EB", margin: 0 },
  accuracyBadge: { background: "#185FA5", color: "#B5D4F4", fontSize: 11, padding: "4px 12px", borderRadius: 20 },
  main: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16, maxWidth: 1100, margin: "0 auto" },
  card: { background: "#fff", border: "0.5px solid #B5D4F4", borderRadius: 12, padding: "16px 18px" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#0C447C", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, borderBottom: "0.5px solid #E6F1FB", paddingBottom: 10 },
  statRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 },
  statCard: { background: "#E6F1FB", borderRadius: 8, padding: "10px 12px", textAlign: "center" },
  statNum: { fontSize: 20, fontWeight: 600, color: "#0C447C" },
  statLbl: { fontSize: 10, color: "#378ADD", marginTop: 2 },
  btnAnalyze: { width: "100%", padding: 12, background: "#0C447C", color: "#E6F1FB", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  btnDisabled: { background: "#85B7EB", cursor: "not-allowed" },
  emptyBox: { background: "#f0f7ff", border: "1px dashed #B5D4F4", borderRadius: 12, padding: "48px 24px", textAlign: "center", color: "#378ADD" },
  inheritBox: { background: "#E6F1FB", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
  riskTrack: { height: 8, background: "#E6F1FB", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  errorBox: { background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginTop: 10 },
};

function SliderField({ name, cfg, value, onChange }) {
  const [inputVal, setInputVal] = useState(String(value));

  const handleSlider = (e) => {
    const v = parseFloat(e.target.value);
    onChange(name, v);
    setInputVal(String(v));
  };

  const handleInput = (e) => {
    setInputVal(e.target.value);
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= cfg.min && v <= cfg.max) {
      onChange(name, v);
    }
  };

  const handleBlur = () => {
    const v = parseFloat(inputVal);
    if (isNaN(v) || v < cfg.min) {
      onChange(name, cfg.min);
      setInputVal(String(cfg.min));
    } else if (v > cfg.max) {
      onChange(name, cfg.max);
      setInputVal(String(cfg.max));
    }
  };

  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <label style={{ fontSize: 11, color: "#378ADD" }}>{cfg.label}</label>
        <input
          type="number"
          min={cfg.min} max={cfg.max} step={cfg.step}
          value={inputVal}
          onChange={handleInput}
          onBlur={handleBlur}
          style={{
            width: 70, fontSize: 12, fontWeight: 600, color: "#0C447C",
            border: "0.5px solid #B5D4F4", borderRadius: 6, padding: "2px 6px",
            textAlign: "right", background: "#F0F7FF", outline: "none",
          }}
        />
      </div>
      <input
        type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={value}
        onChange={handleSlider}
        style={{ width: "100%", accentColor: "#185FA5" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 10, color: "#B5D4F4" }}>{cfg.min}</span>
        <span style={{ fontSize: 10, color: "#B5D4F4" }}>{cfg.max}</span>
      </div>
    </div>
  );
}

function TombolField({ name, cfg, value, onChange }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ fontSize: 11, color: "#378ADD", display: "block", marginBottom: 6 }}>{cfg.label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        {cfg.options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(name, opt.value)}
              style={{
                flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600,
                borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                border: active ? "none" : "0.5px solid #B5D4F4",
                background: active ? "#0C447C" : "#F0F7FF",
                color: active ? "#E6F1FB" : "#378ADD",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const st = STATUS_STYLE[status] || STATUS_STYLE.unaffected;
  return (
    <span style={{ background: st.bg, color: st.color, padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {st.text}
    </span>
  );
}

function HasilPanel({ hasil }) {
  const warna = WARNA[hasil.penyakit] || "#185FA5";
  const chartData = Object.entries(hasil.semua_probabilitas).map(([name, value]) => ({ name, value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Kartu hasil utama */}
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 48, height: 48, background: "#E6F1FB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🧬</div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: warna, margin: "0 0 6px" }}>{hasil.penyakit}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge status={hasil.status_p1} />
              <span style={{ fontSize: 12, color: "#378ADD" }}>Keyakinan: {hasil.confidence}%</span>
            </div>
          </div>
        </div>
        <div style={s.inheritBox}>
          <span style={{ fontSize: 12, color: "#185FA5" }}>
            Pola pewarisan: <strong style={{ color: "#0C447C" }}>{hasil.pola_pewarisan}</strong>
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0C447C", margin: "0 0 10px" }}>Risiko pewarisan ke anak</p>
        {Object.entries(hasil.risiko_anak).map(([label, pct]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#378ADD", textTransform: "capitalize" }}>{label.replace(/_/g, " ")}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0C447C" }}>{pct}%</span>
            </div>
            <div style={s.riskTrack}>
              <div style={{ height: "100%", width: `${pct}%`, background: warna, borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Kartu chart */}
      <div style={s.card}>
        <div style={s.cardTitle}>Probabilitas semua penyakit</div>
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#378ADD" }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#378ADD" }} width={105} />
            <Tooltip formatter={v => [`${v}%`]} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" radius={4}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={Object.values(WARNA)[i] || "#378ADD"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kartu penjelasan — di dalam HasilPanel, hanya render saat hasil ada */}
      <div style={s.card}>
        <div style={s.cardTitle}>Mengapa diprediksi demikian?</div>
        <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "#0C447C", margin: 0, lineHeight: 1.7 }}>
            {hasil.penjelasan}
          </p>
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#378ADD", margin: "0 0 10px" }}>
          Faktor klinis paling berpengaruh:
        </p>
        {hasil.top_factors.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, background: "#0C447C", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#E6F1FB" }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: "#0C447C", fontWeight: 600 }}>{f.label}</span>
                <span style={{ fontSize: 11, color: "#378ADD" }}>
                  Nilai: <strong style={{ color: "#0C447C" }}>{f.nilai_pasien}</strong> · Pengaruh: <strong style={{ color: "#0C447C" }}>{f.pengaruh}%</strong>
                </span>
              </div>
              <div style={{ height: 6, background: "#E6F1FB", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${f.pengaruh * 5}%`, background: "#185FA5", borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default function App() {
  const [fitur, setFitur] = useState({ ...defaultFitur });
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (name, value) => setFitur(prev => ({ ...prev, [name]: value }));

  const handleAnalisis = async () => {
    setLoading(true);
    setError(null);
    setHasil(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: fitur }),
      });
      const data = await res.json();
      if (data.success) setHasil(data);
      else setError(data.error || "Terjadi kesalahan.");
    } catch {
      setError("Tidak bisa terhubung ke backend. Pastikan app.py sedang berjalan.");
    }
    setLoading(false);
  };

  return (
    <div style={s.app}>
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div style={s.topbarLogo}>🧬</div>
          <div>
            <p style={s.topbarTitle}>Genetic Disease Analyzer</p>
            <p style={s.topbarSub}>Inheritance probability predictor</p>
          </div>
        </div>
        <span style={s.accuracyBadge}>Model accuracy: 94%</span>
      </div>

      <div style={s.main}>
        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Data klinis pasien</div>
            {Object.entries(FITUR_TOMBOL).map(([key, cfg]) => (
              <TombolField key={key} name={key} cfg={cfg} value={fitur[key]} onChange={handleChange} />
            ))}
            <div style={{ borderTop: "0.5px solid #E6F1FB", margin: "14px 0" }} />
            {Object.entries(FITUR_SLIDER).map(([key, cfg]) => (
              <SliderField key={key} name={key} cfg={cfg} value={fitur[key]} onChange={handleChange} />
            ))}
            <button
              onClick={handleAnalisis}
              disabled={loading}
              style={{ ...s.btnAnalyze, ...(loading ? s.btnDisabled : {}) }}
            >
              {loading ? "Menganalisis..." : "Analisis Sekarang"}
            </button>
            {error && <div style={s.errorBox}>Error {error}</div>}
          </div>

          <div style={s.statRow}>
            <div style={s.statCard}>
              <div style={s.statNum}>1,000</div>
              <div style={s.statLbl}>Total data</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>5</div>
              <div style={s.statLbl}>Penyakit</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>94%</div>
              <div style={s.statLbl}>Akurasi model</div>
            </div>
          </div>
        </div>

        <div>
          {!hasil && !loading && (
            <div style={s.emptyBox}>
              <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 6px", color: "#0C447C" }}>Belum ada analisis</p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Isi data klinis pasien di sebelah kiri,<br />lalu klik <strong>Analisis Sekarang</strong>.
              </p>
            </div>
          )}
          {loading && (
            <div style={{ ...s.emptyBox, color: "#0C447C" }}>
              <p style={{ margin: 0, fontSize: 14 }}>Sedang menganalisis data...</p>
            </div>
          )}
          {hasil && <HasilPanel hasil={hasil} />}
        </div>
      </div>
    </div>
  );
}