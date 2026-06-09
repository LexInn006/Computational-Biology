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
    0: "Model mendeteksi pola Thalassemia berdasarkan kadar hemoglobin yang rendah dan fetal hemoglobin yang tinggi, yang merupakan respons kompensasi tubuh terhadap kerusakan sel darah merah.",
    1: "Model mendeteksi pola Hemophilia berdasarkan profil darah yang menunjukkan gangguan pembekuan, dikombinasikan dengan faktor genetik X-linked.",
    2: "Model mendeteksi pola Breast Cancer berdasarkan ekspresi BRCA1 yang abnormal dan adanya mutasi p53, yang merupakan indikator utama risiko kanker payudara herediter.",
    3: "Model mendeteksi pola Sickle Cell Anemia berdasarkan persentase sel darah merah berbentuk sabit (Sickled RBC) yang tinggi dan kadar hemoglobin yang rendah.",
    4: "Model mendeteksi pola Cystic Fibrosis berdasarkan kadar Sweat Chloride yang tinggi, yang merupakan penanda utama diagnosis CF secara klinis.",
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
            return {"anak_laki_affected": 25.0, "anak_perempuan_carrier": 25.0,
                    "anak_laki_normal": 25.0, "anak_perempuan_normal": 25.0}
        elif status_p1 == "unaffected" and status_p2 == "affected":
            return {"anak_laki_affected": 0.0, "anak_perempuan_carrier": 50.0,
                    "anak_laki_normal": 50.0, "anak_perempuan_normal": 0.0}
        else:
            return {"anak_laki_affected": 0.0, "anak_perempuan_carrier": 0.0,
                    "anak_laki_normal": 50.0, "anak_perempuan_normal": 50.0}

    elif pola == "AD":
        if status_p1 == "affected" or status_p2 == "affected":
            return {"risiko_tinggi": 50.0, "risiko_rendah": 50.0}
        else:
            return {"risiko_tinggi": 10.0, "risiko_rendah": 90.0}

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