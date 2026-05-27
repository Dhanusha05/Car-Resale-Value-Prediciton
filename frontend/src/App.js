import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

/* ═══════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════ */
const ALGOS = [
  { name: 'Linear Regression', short: 'LR',  sub: 'OLS · Logistic Cls'        },
  { name: 'SVM',               short: 'SVM', sub: 'LinearSVR · Calibrated'    },
  { name: 'Random Forest',     short: 'RF',  sub: 'n=10 · Parallel Trees'     },
  { name: 'Gradient Boosting', short: 'GB',  sub: 'n=15 · lr=0.2 · depth=4'  },
];

const REG_METRICS = [
  { key: 'MAE',  label: 'MAE',  color: 'red',  fmt: v => v.toFixed(4),        pct: v => Math.max(4, 100 - Math.min(v / 1.2 * 100, 94)) },
  { key: 'MSE',  label: 'MSE',  color: 'red',  fmt: v => v.toFixed(4),        pct: v => Math.max(4, 100 - Math.min(v / 1.8 * 100, 94)) },
  { key: 'RMSE', label: 'RMSE', color: 'red',  fmt: v => v.toFixed(4),        pct: v => Math.max(4, 100 - Math.min(v / 1.2 * 100, 94)) },
  { key: 'R2',   label: 'R²',   color: 'blue', fmt: v => v.toFixed(4),        pct: v => v * 100 },
  { key: 'MAPE', label: 'MAPE', color: 'red',  fmt: v => v.toFixed(2) + '%',  pct: v => Math.max(4, 100 - Math.min(v / 35 * 100, 94)) },
];

const CLS_METRICS = [
  { key: 'Accuracy',  label: 'Accuracy',  color: 'green', fmt: v => (v * 100).toFixed(2) + '%', pct: v => v * 100 },
  { key: 'Precision', label: 'Precision', color: 'green', fmt: v => (v * 100).toFixed(2) + '%', pct: v => v * 100 },
  { key: 'Recall',    label: 'Recall',    color: 'green', fmt: v => (v * 100).toFixed(2) + '%', pct: v => v * 100 },
  { key: 'F1',        label: 'F1-Score',  color: 'green', fmt: v => (v * 100).toFixed(2) + '%', pct: v => v * 100 },
  { key: 'ROC_AUC',   label: 'ROC-AUC',  color: 'green', fmt: v => v.toFixed(4),               pct: v => v * 100 },
];

// CRA proxy in package.json forwards /api/* to Flask on port 5000
// No hardcoded URL needed — works on any machine
const API = '';

/* ═══════════════════════════════════════════
   MetricRow
═══════════════════════════════════════════ */
function MetricRow({ def, value }) {
  const val = value ?? 0;
  return (
    <div className="metric-row">
      <div className="metric-label">{def.label}</div>
      <div className="metric-track">
        <div
          className={`metric-bar ${def.color}`}
          style={{ width: def.pct(val).toFixed(1) + '%' }}
        />
      </div>
      <div className="metric-value">{def.fmt(val)}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MetricsPanel
═══════════════════════════════════════════ */
function MetricsPanel({ metrics, selected }) {
  const m = metrics[selected];
  if (!m) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <p>Select an algorithm<br />to view its metrics</p>
      </div>
    );
  }
  return (
    <>
      <div className="metrics-group">
        <div className="section-head">Regression Metrics</div>
        {REG_METRICS.map(def => (
          <MetricRow key={def.key} def={def} value={m[def.key]} />
        ))}
      </div>
      <div className="metrics-group">
        <div className="section-head">Classification Metrics</div>
        {CLS_METRICS.map(def => (
          <MetricRow key={def.key} def={def} value={m[def.key]} />
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   AlgoCard
═══════════════════════════════════════════ */
function AlgoCard({ algo, metrics, selected, bestModel, onSelect }) {
  const m  = metrics[algo.name] || {};
  const r2 = m.R2 || 0;
  const isActive = selected === algo.name;
  const isBest   = bestModel === algo.name;

  return (
    <div
      className={`algo-card${isActive ? ' active' : ''}`}
      onClick={() => onSelect(algo.name)}
    >
      <div className="algo-stripe" />
      {isBest && <div className="best-crown">👑</div>}
      <div className="algo-header">
        <div className="algo-name">{algo.name}</div>
        <div className="algo-badge">{algo.short}</div>
      </div>
      <div className="algo-sub">{algo.sub}</div>
      <div className="r2-row">
        <div className="r2-track">
          <div className="r2-fill" style={{ width: (r2 * 100).toFixed(2) + '%' }} />
        </div>
        <div className="r2-label">R² {r2.toFixed(4)}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Field
═══════════════════════════════════════════ */
function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ResultCard
═══════════════════════════════════════════ */
function ResultCard({ result }) {
  if (!result) return null;

  const tier = result.tier.toLowerCase();
  const labels = { low: '🟢 Low Range', mid: '🟡 Mid Range', high: '🔴 Premium' };
  const inrStr  = '₹ ' + Number(result.predicted_rs).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className={`result-card ${tier}`}>
      <div className="result-inner">
        <div>
          <div className="result-lbl">Predicted Selling Price</div>
          <div className="result-price">{inrStr}</div>
          <div className="result-sub">
            {result.predicted_lakhs.toFixed(4)} Lakhs &nbsp;·&nbsp; {result.model}
          </div>
        </div>
        <div className="result-right">
          <div className="tier-chip">{labels[tier]}</div>
          <div className="result-model">via {result.model}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   App
═══════════════════════════════════════════ */
export default function App() {
  const [selected,  setSelected]  = useState('Random Forest');
  const [metrics,   setMetrics]   = useState({});
  const [bestModel, setBestModel] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [toast,     setToast]     = useState('');
  const [offline,   setOffline]   = useState(false);

  const [form, setForm] = useState({
    year:         '2018',
    km_driven:    '50000',
    fuel:         '0',
    seller_type:  '0',
    transmission: '0',
    owner:        '1',
    mileage:      '17.0',
    engine:       '1500',
    max_power:    '100',
    torque:       '200',
    seats:        '5',
    actual_price: '774691',
  });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }, []);

  /* ── Fetch metrics from Flask on mount ── */
  useEffect(() => {
    fetch(`${API}/api/metrics`)
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics);
        setBestModel(data.best_model);
      })
      .catch(() => {
        setOffline(true);
        showToast('Cannot reach Flask backend — make sure app.py is running on port 5000');
      });
  }, [showToast]);

  /* ── Predict ── */
  const predict = useCallback(async () => {
    // Validate fields before sending
    const price = parseFloat(form.actual_price);
    if (!form.actual_price || price <= 0 || isNaN(price)) {
      showToast('⚠ Showroom Price cannot be 0 or empty — please enter a valid price');
      return;
    }
    if (!form.km_driven || parseFloat(form.km_driven) <= 0) {
      showToast('⚠ KM Driven must be greater than 0');
      return;
    }
    if (!form.mileage || parseFloat(form.mileage) <= 0) {
      showToast('⚠ Mileage must be greater than 0');
      return;
    }
    if (!form.engine || parseFloat(form.engine) <= 0) {
      showToast('⚠ Engine CC must be greater than 0');
      return;
    }
    if (!form.max_power || parseFloat(form.max_power) <= 0) {
      showToast('⚠ Max Power must be greater than 0');
      return;
    }
    if (!form.torque || parseFloat(form.torque) <= 0) {
      showToast('⚠ Torque must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, model: selected }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data);
        if (data.metrics) {
          setMetrics(prev => ({ ...prev, [data.model]: data.metrics }));
        }
      } else {
        showToast('Prediction failed: ' + data.error);
      }
    } catch (err) {
      showToast('Network error — ' + err.message);
    }
    setLoading(false);
  }, [form, selected, showToast]);

  /* ── RENDER ── */
  return (
    <div className="shell">

      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">🚗</div>
          <div className="brand-name">Car<em>Predict</em></div>
        </div>
        <div className="topbar-right">
          {bestModel && (
            <div className="best-pill">
              <div className="blink" />
              {bestModel} — Best Model
            </div>
          )}
          <div className="live-indicator">
            <div className={`live-dot${offline ? ' offline' : ''}`} />
            {offline ? 'OFFLINE' : 'API LIVE'}
          </div>
        </div>
      </header>

      {/* 3-COLUMN WORKSPACE */}
      <div className="workspace">

        {/* ── LEFT: Algorithms ── */}
        <div className="left-panel">
          <div className="panel-label">Algorithm</div>
          {ALGOS.map(algo => (
            <AlgoCard
              key={algo.name}
              algo={algo}
              metrics={metrics}
              selected={selected}
              bestModel={bestModel}
              onSelect={setSelected}
            />
          ))}
        </div>

        {/* ── CENTER: Car Details ── */}
        <div className="center-panel">
          <div className="panel-label">Car Details</div>

          <div className="form-grid">

            <Field label="Year of Purchase">
              <input type="number" value={form.year} min="2005" max="2023"
                onChange={ev => setField('year', ev.target.value)} />
            </Field>

            <Field label="KM Driven">
              <input type="number" value={form.km_driven} min="1000" max="300000"
                onChange={ev => setField('km_driven', ev.target.value)} />
            </Field>

            <Field label="Fuel Type">
              <select value={form.fuel} onChange={ev => setField('fuel', ev.target.value)}>
                <option value="0">Petrol</option>
                <option value="1">Diesel</option>
                <option value="2">CNG</option>
                <option value="3">LPG</option>
                <option value="4">Electric</option>
              </select>
            </Field>

            <Field label="Seller Type">
              <select value={form.seller_type} onChange={ev => setField('seller_type', ev.target.value)}>
                <option value="0">Individual</option>
                <option value="1">Dealer</option>
                <option value="2">Trustmark Dealer</option>
              </select>
            </Field>

            <Field label="Transmission">
              <select value={form.transmission} onChange={ev => setField('transmission', ev.target.value)}>
                <option value="0">Manual</option>
                <option value="1">Automatic</option>
              </select>
            </Field>

            <Field label="Owner">
              <select value={form.owner} onChange={ev => setField('owner', ev.target.value)}>
                <option value="1">First Owner</option>
                <option value="2">Second Owner</option>
                <option value="3">Third Owner</option>
                <option value="4">Fourth &amp; Above</option>
              </select>
            </Field>

            <Field label="Mileage (kmpl)">
              <input type="number" value={form.mileage} step="0.1" min="5" max="50"
                onChange={ev => setField('mileage', ev.target.value)} />
            </Field>

            <Field label="Engine (cc)">
              <input type="number" value={form.engine} min="500" max="4000"
                onChange={ev => setField('engine', ev.target.value)} />
            </Field>

            <Field label="Max Power (bhp)">
              <input type="number" value={form.max_power} step="0.5" min="30" max="300"
                onChange={ev => setField('max_power', ev.target.value)} />
            </Field>

            <Field label="Torque (Nm)">
              <input type="number" value={form.torque} step="1" min="50" max="500"
                onChange={ev => setField('torque', ev.target.value)} />
            </Field>

            <Field label="Seats">
              <select value={form.seats} onChange={ev => setField('seats', ev.target.value)}>
                <option value="4">4 Seats</option>
                <option value="5">5 Seats</option>
                <option value="6">6 Seats</option>
                <option value="7">7 Seats</option>
              </select>
            </Field>

            <Field label="Showroom Price (₹)">
              <input
                type="number"
                value={form.actual_price}
                min="1"
                max="3000000"
                placeholder="e.g. 774691"
                onChange={ev => setField('actual_price', ev.target.value)}
                style={
                  (!form.actual_price || parseFloat(form.actual_price) <= 0)
                    ? { borderColor: 'var(--r)', boxShadow: '0 0 0 3px rgba(255,80,104,0.15)' }
                    : {}
                }
              />
              {(!form.actual_price || parseFloat(form.actual_price) <= 0) && (
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '8px', color: 'var(--r)', marginTop: '2px' }}>
                  ⚠ Required — enter showroom price in ₹
                </span>
              )}
            </Field>

          </div>

          <button
            className="predict-btn"
            onClick={predict}
            disabled={loading}
          >
            {loading ? '⏳  Predicting…' : '▶  Predict Selling Price'}
          </button>

          <ResultCard result={result} />
        </div>

        {/* ── RIGHT: Metrics ── */}
        <div className="right-panel">
          <div className="panel-label">Model Metrics — {selected}</div>
          <MetricsPanel metrics={metrics} selected={selected} />
        </div>

      </div>

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}