import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model
model = joblib.load("model/rf_model.pkl")
scaler = joblib.load("model/scaler.pkl")
with open("model/meta.json") as f:
    meta = json.load(f)

DISEASE_MAP = meta["disease_map"]
INHERITANCE = meta["inheritance"]
FEATURE_NAMES = meta["feature_names"]

PENJELASAN = {
    0: "The model detected a Thalassemia pattern based on low hemoglobin levels and high fetal hemoglobin, which is the body's compensatory response to red blood cell damage.",
    1: "The model detected a Hemophilia pattern based on a blood profile indicating coagulation disorders, combined with X-linked genetic factors.",
    2: "The model detected a Breast Cancer pattern based on abnormal BRCA1 expression and the presence of p53 mutation, which are the main indicators of hereditary breast cancer risk.",
    3: "The model detected a Sickle Cell Anemia pattern based on a high percentage of sickle-shaped red blood cells (Sickled RBC) and low hemoglobin levels.",
    4: "The model detected a Cystic Fibrosis pattern based on high Sweat Chloride levels, which is the primary clinical diagnostic marker for CF.",
}

def get_status(confidence):
    if confidence >= 60:
        return "affected"
    elif confidence >= 25:
        return "carrier"
    else:
        return "unaffected"

def hitung_mendel(disease_id, status_p1, status_p2):
    pola = INHERITANCE[str(disease_id)]["code"]

    if pola == "AR":
        allele = {"affected": (1,1), "carrier": (1,0), "unaffected": (0,0)}
        a1, a2 = allele[status_p1]
        b1, b2 = allele[status_p2]
        hasil = [a1+b1, a1+b2, a2+b1, a2+b2]
        counts = {"affected": 0, "carrier": 0, "unaffected": 0}
        for h in hasil:
            if h == 2: counts["affected"] += 1
            elif h == 1: counts["carrier"] += 1
            else: counts["unaffected"] += 1
        return {k: round(v/4*100, 1) for k, v in counts.items()}

    elif pola == "XR":
        if status_p1 == "carrier" and status_p2 == "unaffected":
            return {"affected_male": 25.0, "carrier_female": 25.0,
                    "normal_male": 25.0, "normal_female": 25.0}
        elif status_p1 == "unaffected" and status_p2 == "affected":
            return {"affected_male": 0.0, "carrier_female": 50.0,
                    "normal_male": 50.0, "normal_female": 0.0}
        else:
            return {"affected_male": 0.0, "carrier_female": 0.0,
                    "normal_male": 50.0, "normal_female": 50.0}

    elif pola == "AD":
        if status_p1 == "affected" or status_p2 == "affected":
            return {"high_risk": 50.0, "low_risk": 50.0}
        else:
            return {"high_risk": 10.0, "low_risks": 90.0}

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        fitur_p1 = data["features"]
        fitur_p2 = data.get("parent2_features", None)

        # Prediksi parent 1
        vec1 = [float(fitur_p1.get(f, 0)) for f in FEATURE_NAMES]
        vec1_scaled = scaler.transform([vec1])
        proba1 = model.predict_proba(vec1_scaled)[0]
        pred1 = int(np.argmax(proba1))
        conf1 = round(float(proba1[pred1]) * 100, 1)
        status_p1 = get_status(conf1)

        # Prediksi parent 2 (kalau ada)
        status_p2 = "unaffected"
        if fitur_p2:
            vec2 = [float(fitur_p2.get(f, 0)) for f in FEATURE_NAMES]
            vec2_scaled = scaler.transform([vec2])
            proba2 = model.predict_proba(vec2_scaled)[0]
            pred2 = int(np.argmax(proba2))
            conf2 = round(float(proba2[pred2]) * 100, 1)
            status_p2 = get_status(conf2)

        mendel = hitung_mendel(pred1, status_p1, status_p2)

        # Top 5 fitur paling berpengaruh + nilai pasien
        importances = model.feature_importances_
        top5_idx = importances.argsort()[::-1][:5]
        top_factors = [
            {
                "fitur": FEATURE_NAMES[i],
                "label": FEATURE_NAMES[i].replace("_", " "),
                "nilai_pasien": round(float(vec1[i]), 2),
                "pengaruh": round(float(importances[i]) * 100, 1)
            }
            for i in top5_idx
        ]

        return jsonify({
            "success": True,
            "penyakit": DISEASE_MAP[str(pred1)],
            "status_p1": status_p1,
            "confidence": conf1,
            "pola_pewarisan": INHERITANCE[str(pred1)]["pattern"],
            "risiko_anak": mendel,
            "semua_probabilitas": {
                DISEASE_MAP[str(i)]: round(float(p)*100, 1)
                for i, p in enumerate(proba1)
            },
            "penjelasan": PENJELASAN[pred1],
            "top_factors": top_factors
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "akurasi_model": meta["accuracy"]})

if __name__ == "__main__":
    print("Backend berjalan di http://localhost:5000")
    app.run(debug=True, port=5000)