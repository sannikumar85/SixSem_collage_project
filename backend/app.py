import os
import json
import glob
from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from federated import compute_local_weights, federated_average, weights_to_summary
from encryption import (
    encrypt_weights, decrypt_weights,
    serialize_encrypted, deserialize_encrypted,
    garble_text
)

load_dotenv()

app = Flask(__name__)

# Configure CORS for production based on .env FRONTEND_URL
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(app, resources={r"/api/*": {"origins": frontend_url}})

# Configure Gemini - supports both GEMINI_API_KEY and OPENAI_API_KEY in .env
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: No Gemini API key found. Set GEMINI_API_KEY in backend/.env")
else:
    print(f"Gemini API key loaded: {GEMINI_API_KEY[:8]}...")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.0-flash"

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

session_store = {
    "trained_nodes": {},
    "encrypted_nodes": {},
    "aggregated_weights": None,
    "prediction": None,
    "report": None
}


def fallback_prediction_from_summary(summary: dict) -> dict:
    """Build a deterministic local prediction when Gemini is unavailable."""
    score = float(summary.get("computed_risk_score", 0.0) or 0.0)
    fever_rate = float(summary.get("avg_fever_rate_per_1000", 0.0) or 0.0)
    humidity = float(summary.get("avg_humidity_pct", 0.0) or 0.0)
    trend = float(summary.get("fever_trend", 0.0) or 0.0)

    if score >= 0.7:
        risk_level = "High"
        confidence = min(95, int(70 + score * 20))
    elif score >= 0.35:
        risk_level = "Medium"
        confidence = min(90, int(60 + score * 20))
    else:
        risk_level = "Low"
        confidence = min(85, int(55 + score * 20))

    if humidity >= 70 and fever_rate >= 1.0:
        primary_disease = "Dengue-like Fever"
    elif fever_rate >= 0.9:
        primary_disease = "Seasonal Viral Fever"
    else:
        primary_disease = "Mild Respiratory Syndrome"

    recommendations = [
        "Increase fever and respiratory symptom surveillance at district level",
        "Expand vector-control and sanitation drives in high-incidence clusters",
        "Run targeted vaccination and awareness campaigns in vulnerable regions",
        "Prepare rapid response teams and stock essential medicines"
    ]

    if trend > 0.1:
        recommendations.insert(0, "Activate early warning alerts due to rising fever trend")

    regions = summary.get("regions", [])
    return {
        "risk_level": risk_level,
        "confidence": confidence,
        "primary_disease": primary_disease,
        "affected_regions": regions[:5] if isinstance(regions, list) else [],
        "peak_expected": "Next 2 weeks",
        "recommendations": recommendations[:4],
        "source": "local_fallback_model"
    }


def fallback_report_from_data(prediction: dict, summary: dict) -> str:
    """Generate a markdown report without LLM dependency."""
    affected = prediction.get("affected_regions", [])
    recs = prediction.get("recommendations", [])

    affected_md = "\n".join([f"- {r}" for r in affected]) if affected else "- Data not available"
    recs_md = "\n".join([f"- {r}" for r in recs]) if recs else "- No recommendations generated"

    return f"""# Disease Outbreak Surveillance Report

## 1. Executive Summary
- Risk Level: **{prediction.get('risk_level', 'Unknown')}**
- Confidence: **{prediction.get('confidence', 0)}%**
- Primary Disease Signal: **{prediction.get('primary_disease', 'Unknown')}**
- Forecast Window: **{prediction.get('peak_expected', 'Next 2 weeks')}**

## 2. Regional Analysis
Likely affected regions based on federated indicators:
{affected_md}

## 3. Key Risk Factors
- Average fever rate per 1000: **{summary.get('avg_fever_rate_per_1000', 0)}**
- Average respiratory rate per 1000: **{summary.get('avg_respiratory_rate_per_1000', 0)}**
- Average vaccination rate: **{summary.get('avg_vaccination_rate_pct', 0)}%**
- Average humidity: **{summary.get('avg_humidity_pct', 0)}%**
- Fever trend indicator: **{summary.get('fever_trend', 0)}**
- Computed risk score: **{summary.get('computed_risk_score', 0)}**

## 4. Public Health Recommendations
{recs_md}

## 5. Privacy & Methodology Note
This report was generated from federated aggregated model weights only. Raw patient-level records were never transmitted from hospitals.
"""


def discover_hospitals():
    files = glob.glob(os.path.join(DATA_DIR, "hospital_*.json"))
    return sorted([
        os.path.basename(f).replace("hospital_", "").replace(".json", "").upper()
        for f in files
    ])


def load_hospital_data(hospital_id: str):
    filename = f"hospital_{hospital_id.lower()}.json"
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "r") as f:
        return json.load(f)


def gemini_generate_json(prompt: str) -> dict:
    """Call Gemini and parse JSON response."""
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)


def gemini_generate_text(prompt: str) -> str:
    """Call Gemini and return plain text."""
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )
    return response.text


def handle_gemini_error(e: Exception):
    """Return a clean JSON error response for Gemini API errors."""
    msg = str(e)
    print(f"Gemini API Error: {msg}")
    if "API_KEY_INVALID" in msg or ("invalid" in msg.lower() and "key" in msg.lower()):
        return jsonify({"error": f"Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env. Current key starts with: {(GEMINI_API_KEY or '')[:8]}..."}), 401
    if "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
        return jsonify({
            "error": "Gemini free-tier daily quota exhausted. The quota resets at midnight UTC. "
                     "Visit https://aistudio.google.com to check your usage or get a new key."
        }), 429
    if "PERMISSION_DENIED" in msg:
        return jsonify({"error": "Gemini API permission denied. Ensure the key has Generative Language API enabled in Google Cloud Console."}), 403
    if "not found" in msg.lower() or "404" in msg:
        return jsonify({"error": f"Gemini model not found. Trying model: {GEMINI_MODEL}"}), 404
    return jsonify({"error": f"Gemini API error: {msg[:400]}"}), 500


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Privacy-Preserving Health Analytics API (Gemini)"})


@app.route("/api/hospitals", methods=["GET"])
def get_hospitals():
    hospital_ids = discover_hospitals()
    hospitals = []
    for hid in hospital_ids:
        try:
            data = load_hospital_data(hid)
            latest = data[-1]
            hospitals.append({
                "hospital_id": hid,
                "region": latest["region"],
                "latest_week": latest["week"],
                "fever_cases": latest["fever_cases"],
                "respiratory_cases": latest["respiratory_cases"],
                "vaccination_rate": latest["vaccination_rate"],
                "population": latest["population"],
                "temperature_avg": latest.get("temperature_avg", 28),
                "humidity": latest.get("humidity", 70),
                "status": session_store["trained_nodes"].get(hid, {}).get("_status", "idle")
            })
        except Exception as e:
            print(f"Error loading hospital {hid}: {e}")
    return jsonify(hospitals)


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    hospital_ids = discover_hospitals()
    all_data = []
    weekly_totals = {}

    for hid in hospital_ids:
        try:
            data = load_hospital_data(hid)
            for record in data:
                week = record["week"]
                if week not in weekly_totals:
                    weekly_totals[week] = {
                        "week": week, "total_fever": 0,
                        "total_respiratory": 0, "hospital_count": 0, "avg_vaccination": 0
                    }
                weekly_totals[week]["total_fever"] += record["fever_cases"]
                weekly_totals[week]["total_respiratory"] += record["respiratory_cases"]
                weekly_totals[week]["avg_vaccination"] += record["vaccination_rate"]
                weekly_totals[week]["hospital_count"] += 1

            latest = data[-1]
            all_data.append({
                "hospital_id": hid,
                "region": latest["region"].split(",")[0],
                "full_region": latest["region"],
                "fever_cases": latest["fever_cases"],
                "respiratory_cases": latest["respiratory_cases"],
                "vaccination_rate": round(latest["vaccination_rate"] * 100, 1),
                "population": latest["population"],
                "temperature_avg": latest.get("temperature_avg", 28),
                "humidity": latest.get("humidity", 70),
                "weekly_data": data
            })
        except Exception as e:
            print(f"Analytics error for {hid}: {e}")

    weekly_list = []
    for week, t in sorted(weekly_totals.items()):
        n = t["hospital_count"]
        weekly_list.append({
            "week": week,
            "total_fever": t["total_fever"],
            "total_respiratory": t["total_respiratory"],
            "avg_vaccination": round(t["avg_vaccination"] / n * 100, 1) if n > 0 else 0
        })

    return jsonify({
        "hospitals": all_data,
        "weekly_totals": weekly_list,
        "total_hospitals": len(hospital_ids)
    })


@app.route("/api/train-node", methods=["POST"])
def train_node():
    body = request.get_json()
    hospital_id = body.get("hospital_id", "").upper()

    if hospital_id not in discover_hospitals():
        return jsonify({"error": "Invalid hospital_id"}), 400

    data = load_hospital_data(hospital_id)
    weights = compute_local_weights(data)
    session_store["trained_nodes"][hospital_id] = {**weights, "_status": "trained"}

    encrypted = encrypt_weights(weights)
    serialized = serialize_encrypted(encrypted)
    session_store["encrypted_nodes"][hospital_id] = serialized
    garbled = garble_text(serialized)

    return jsonify({
        "hospital_id": hospital_id,
        "region": data[-1]["region"],
        "status": "encrypted",
        "weights_preview": {k: round(v, 6) for k, v in weights.items() if k != "_status"},
        "encrypted_display": garbled,
        "encryption_method": "Paillier Homomorphic Encryption",
        "message": f"Hospital {hospital_id} trained locally. Raw data never left the node."
    })


@app.route("/api/train-all", methods=["POST"])
def train_all():
    hospital_ids = discover_hospitals()
    results = []
    for hid in hospital_ids:
        data = load_hospital_data(hid)
        weights = compute_local_weights(data)
        session_store["trained_nodes"][hid] = {**weights, "_status": "trained"}
        encrypted = encrypt_weights(weights)
        serialized = serialize_encrypted(encrypted)
        session_store["encrypted_nodes"][hid] = serialized
        results.append({"hospital_id": hid, "status": "encrypted"})
    return jsonify({"trained": results, "count": len(results)})


@app.route("/api/aggregate", methods=["POST"])
def aggregate():
    if not session_store["encrypted_nodes"]:
        return jsonify({"error": "No trained nodes found. Train at least one hospital first."}), 400

    available_ids = list(session_store["encrypted_nodes"].keys())
    all_weights = []
    for hid in available_ids:
        serialized = session_store["encrypted_nodes"][hid]
        encrypted = deserialize_encrypted(serialized)
        decrypted = decrypt_weights(encrypted)
        all_weights.append(decrypted)

    aggregated = federated_average(all_weights)
    session_store["aggregated_weights"] = aggregated

    regions = [load_hospital_data(hid)[-1]["region"] for hid in available_ids]
    summary = weights_to_summary(aggregated, regions)

    return jsonify({
        "status": "aggregated",
        "nodes_included": available_ids,
        "aggregated_weights": {k: round(v, 6) for k, v in aggregated.items()},
        "summary": summary,
        "message": f"Federated averaging complete across {len(available_ids)} nodes."
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    if session_store["aggregated_weights"] is None:
        return jsonify({"error": "Run aggregation first"}), 400

    aggregated = session_store["aggregated_weights"]
    available_ids = list(session_store["encrypted_nodes"].keys())
    regions = [load_hospital_data(hid)[-1]["region"] for hid in available_ids]
    summary = weights_to_summary(aggregated, regions)

    prompt = f"""You are an AI epidemiologist. Analyze this aggregated health data from {len(available_ids)} hospitals across India.
Raw patient data was NOT shared — only privacy-preserved aggregated model weights via Federated Learning.

{json.dumps(summary, indent=2)}

Predict disease outbreak risk for the next 2 weeks.
Return ONLY valid JSON with exactly this structure (no markdown, no extra text):
{{
  "risk_level": "Low",
  "confidence": 72,
  "primary_disease": "Dengue Fever",
  "affected_regions": ["North Delhi", "South Mumbai", "East Kolkata"],
  "peak_expected": "Week 2 of next month",
  "recommendations": [
    "Increase mosquito control measures",
    "Expand vaccination drives in high-risk areas",
    "Set up fever screening camps",
    "Alert district health authorities"
  ]
}}"""

    try:
        prediction = gemini_generate_json(prompt)
    except Exception as e:
        print(f"Gemini unavailable for prediction, using local fallback. Error: {e}")
        prediction = fallback_prediction_from_summary(summary)

    session_store["prediction"] = prediction
    return jsonify({
        "prediction": prediction,
        "based_on_nodes": available_ids,
        "analysis_summary": summary,
        "privacy_preserved": True,
        "fallback_used": prediction.get("source") == "local_fallback_model"
    })


@app.route("/api/report", methods=["GET"])
def get_report():
    if session_store["prediction"] is None:
        return jsonify({"error": "Run prediction first"}), 400

    prediction = session_store["prediction"]
    available_ids = list(session_store["encrypted_nodes"].keys())
    aggregated = session_store["aggregated_weights"] or {}
    regions = [load_hospital_data(hid)[-1]["region"] for hid in available_ids]
    summary = weights_to_summary(aggregated, regions)

    prompt = f"""Generate a professional disease outbreak surveillance report.

PREDICTION DATA:
{json.dumps(prediction, indent=2)}

AGGREGATED HEALTH METRICS ({len(available_ids)} hospitals, privacy-preserved via Federated Learning):
{json.dumps(summary, indent=2)}

Write the report in clean professional markdown with these sections:
# Disease Outbreak Surveillance Report
## 1. Executive Summary
## 2. Regional Analysis
## 3. Key Risk Factors
## 4. Public Health Recommendations
## 5. Privacy & Methodology Note

Be specific, data-driven, and actionable."""

    try:
        report_md = gemini_generate_text(prompt)
    except Exception as e:
        print(f"Gemini unavailable for report, using local fallback. Error: {e}")
        report_md = fallback_report_from_data(prediction, summary)

    session_store["report"] = report_md
    return jsonify({
        "report": report_md,
        "generated_at": "2024-W10",
        "model": "gemini-1.5-flash" if "local_fallback_model" not in str(prediction) else "local-fallback"
    })


@app.route("/api/reset", methods=["POST"])
def reset():
    session_store["trained_nodes"].clear()
    session_store["encrypted_nodes"].clear()
    session_store["aggregated_weights"] = None
    session_store["prediction"] = None
    session_store["report"] = None
    return jsonify({"status": "reset"})


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({
        "trained_nodes": list(session_store["trained_nodes"].keys()),
        "encrypted_nodes": list(session_store["encrypted_nodes"].keys()),
        "has_aggregation": session_store["aggregated_weights"] is not None,
        "has_prediction": session_store["prediction"] is not None,
        "prediction": session_store["prediction"]
    })


if __name__ == "__main__":
    env = os.getenv("FLASK_ENV", "development")
    port = int(os.getenv("BACKEND_PORT", 5000))
    if env == "production":
        print(f"Starting server in PRODUCTION mode with Waitress on port {port}...")
        from waitress import serve
        serve(app, host="0.0.0.0", port=port)
    else:
        print(f"Starting server in DEVELOPMENT mode on port {port}...")
        app.run(debug=True, host="0.0.0.0", port=port)
