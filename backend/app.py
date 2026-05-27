from flask import Flask, request, jsonify, render_template
import numpy as np
import joblib
import json
import os

app = Flask(__name__)

# ── CORS: works even without flask-cors installed ──
@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/api/metrics', methods=['OPTIONS'])
@app.route('/api/predict', methods=['OPTIONS'])
def handle_options():
    return '', 204

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Load all models ONCE at startup ──
print("Loading models...")
lr  = joblib.load(os.path.join(BASE, 'model_lr.pkl'))
svm = joblib.load(os.path.join(BASE, 'model_svm.pkl'))
rf  = joblib.load(os.path.join(BASE, 'model_rf.pkl'))
gb  = joblib.load(os.path.join(BASE, 'model_gb.pkl'))
sc  = joblib.load(os.path.join(BASE, 'scaler.pkl'))
print("Models loaded.")

with open(os.path.join(BASE, 'metrics.json')) as f:
    METRICS = json.load(f)
with open(os.path.join(BASE, 'meta.json')) as f:
    META = json.load(f)

FEATURE_COLS  = META['feature_cols']
Q33           = META['Q33']
Q66           = META['Q66']
MODEL_MAP     = {'Linear Regression': lr, 'SVM': svm, 'Random Forest': rf, 'Gradient Boosting': gb}
SCALED_MODELS = {'Linear Regression', 'SVM'}
best_model    = max(METRICS, key=lambda k: METRICS[k]['R2'])


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify({'metrics': METRICS, 'best_model': best_model})


@app.route('/api/predict', methods=['POST'])
def predict():
    data       = request.json
    model_name = data.get('model', 'Random Forest')
    try:
        year         = float(data['year'])
        km_driven    = float(data['km_driven'])
        fuel         = float(data['fuel'])
        seller_type  = float(data['seller_type'])
        transmission = float(data['transmission'])
        owner        = float(data['owner'])
        mileage      = float(data['mileage'])
        engine       = float(data['engine'])
        max_power    = float(data['max_power'])
        torque       = float(data['torque'])
        seats        = float(data['seats'])
        actual_price = float(data['actual_price'])
        if actual_price <= 0:
            return jsonify({'success': False, 'error': 'Showroom Price (actual_price) must be greater than 0'}), 400
        actual_price = actual_price / 100000   # Rs → Lakhs
        years_old    = 2025 - year

        row = np.array([[year, km_driven, fuel, seller_type, transmission,
                         owner, mileage, engine, max_power, torque,
                         seats, actual_price, years_old]], dtype=np.float64)

        model = MODEL_MAP[model_name]
        inp   = sc.transform(row) if model_name in SCALED_MODELS else row

        pred_lakhs = float(model.predict(inp)[0])
        pred_rs    = pred_lakhs * 100000
        tier       = 'Low' if pred_lakhs <= Q33 else ('Mid' if pred_lakhs <= Q66 else 'High')

        return jsonify({
            'success':         True,
            'predicted_lakhs': round(pred_lakhs, 4),
            'predicted_rs':    round(pred_rs, 0),
            'tier':            tier,
            'model':           model_name,
            'metrics':         METRICS.get(model_name, {}),
            'best_model':      best_model,
        })
    except Exception as ex:
        return jsonify({'success': False, 'error': str(ex)}), 400


if __name__ == '__main__':
    app.run(debug=False, use_reloader=False, port=5000)
