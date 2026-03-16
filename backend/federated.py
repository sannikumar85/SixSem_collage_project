import json
from typing import List, Dict


def compute_local_weights(hospital_data: List[Dict]) -> Dict[str, float]:
    """
    Simulate local model training by computing statistical features
    from hospital data. These 'weights' represent a simple linear model
    trained on local data without sharing raw records.
    """
    if not hospital_data:
        return {}

    n = len(hospital_data)

    # Compute aggregate statistics as model weights
    avg_fever = sum(r["fever_cases"] for r in hospital_data) / n
    avg_respiratory = sum(r["respiratory_cases"] for r in hospital_data) / n
    avg_vaccination = sum(r["vaccination_rate"] for r in hospital_data) / n
    avg_temperature = sum(r["temperature_avg"] for r in hospital_data) / n
    avg_humidity = sum(r["humidity"] for r in hospital_data) / n
    avg_population = sum(r["population"] for r in hospital_data) / n

    # Trend: difference between last 3 and first 3 weeks
    if n >= 6:
        recent_fever = sum(r["fever_cases"] for r in hospital_data[-3:]) / 3
        early_fever = sum(r["fever_cases"] for r in hospital_data[:3]) / 3
        fever_trend = (recent_fever - early_fever) / (early_fever + 1e-6)
    else:
        fever_trend = 0.0

    # Risk score as a weighted combination (simulated model weight)
    risk_score = (
        (avg_fever / avg_population) * 1000 * 0.4 +
        (avg_respiratory / avg_population) * 1000 * 0.3 +
        (1 - avg_vaccination) * 0.2 +
        (avg_humidity / 100) * 0.1 +
        fever_trend * 0.1
    )

    return {
        "avg_fever_rate": avg_fever / avg_population,
        "avg_respiratory_rate": avg_respiratory / avg_population,
        "avg_vaccination_rate": avg_vaccination,
        "avg_temperature": avg_temperature,
        "avg_humidity": avg_humidity,
        "fever_trend": fever_trend,
        "risk_score": risk_score,
        "sample_size": float(n)
    }


def federated_average(weights_list: List[Dict[str, float]]) -> Dict[str, float]:
    """
    FedAvg algorithm: compute weighted average of local model weights.
    Each hospital's contribution is weighted by its sample size.
    """
    if not weights_list:
        return {}

    total_samples = sum(w.get("sample_size", 1.0) for w in weights_list)
    averaged = {}

    for key in weights_list[0].keys():
        if key == "sample_size":
            averaged[key] = total_samples / len(weights_list)
        else:
            weighted_sum = sum(
                w[key] * w.get("sample_size", 1.0)
                for w in weights_list
            )
            averaged[key] = weighted_sum / total_samples

    return averaged


def weights_to_summary(weights: Dict[str, float], hospital_regions: List[str]) -> Dict:
    """Convert aggregated weights to human-readable summary for OpenAI prompt."""
    risk_score = weights.get("risk_score", 0)

    if risk_score > 0.7:
        risk_label = "High"
    elif risk_score > 0.35:
        risk_label = "Medium"
    else:
        risk_label = "Low"

    return {
        "aggregated_from_hospitals": len(hospital_regions),
        "regions": hospital_regions,
        "avg_fever_rate_per_1000": round(weights.get("avg_fever_rate", 0) * 1000, 2),
        "avg_respiratory_rate_per_1000": round(weights.get("avg_respiratory_rate", 0) * 1000, 2),
        "avg_vaccination_rate_pct": round(weights.get("avg_vaccination_rate", 0) * 100, 1),
        "avg_temperature_celsius": round(weights.get("avg_temperature", 0), 1),
        "avg_humidity_pct": round(weights.get("avg_humidity", 0), 1),
        "fever_trend": round(weights.get("fever_trend", 0), 3),
        "computed_risk_score": round(weights.get("risk_score", 0), 4),
        "preliminary_risk_label": risk_label,
        "privacy_note": "Raw patient data was never shared. Only aggregated model weights were transmitted."
    }
