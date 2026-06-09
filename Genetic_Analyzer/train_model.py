import pandas as pd
import numpy as np
import json
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

# 1. Load dataset
df = pd.read_csv("genetic_disease_dataset.csv")
print("Dataset loaded:", df.shape)

# 2. Pisahkan fitur dan label
X = df.drop("Disease", axis=1)
y = df["Disease"]

# 3. Scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 4. Split data training dan testing
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.3, random_state=42, stratify=y
)

# 5. Train model
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Feature Importance
importance = pd.DataFrame({
    "Feature": X.columns,
    "Importance": model.feature_importances_
})

importance = importance.sort_values(
    by="Importance",
    ascending=False
)

print("\n=== Feature Importance ===")
print(importance.to_string(index=False))

# 6. Evaluasi
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Akurasi: {acc:.4f}")
print(classification_report(y_test, y_pred))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)

labels = [
    "Thalassemia",
    "Hemophilia",
    "Breast Cancer",
    "Sickle Cell",
    "Cystic Fibrosis"
]

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=labels
)

fig, ax = plt.subplots(figsize=(8, 6))
disp.plot(ax=ax, xticks_rotation=45)

plt.title("Confusion Matrix")
plt.tight_layout()
plt.show()

# 7. Simpan model
os.makedirs("model", exist_ok=True)
joblib.dump(model, "model/rf_model.pkl")
joblib.dump(scaler, "model/scaler.pkl")

DISEASE_MAP = {
    "0": "Thalassemia", "1": "Hemophilia", "2": "Breast Cancer",
    "3": "Sickle Cell Anemia", "4": "Cystic Fibrosis"
}
INHERITANCE = {
    "0": {"pattern": "Autosomal Recessive", "code": "AR"},
    "1": {"pattern": "X-linked Recessive", "code": "XR"},
    "2": {"pattern": "Autosomal Dominant / Multifactorial", "code": "AD"},
    "3": {"pattern": "Autosomal Recessive", "code": "AR"},
    "4": {"pattern": "Autosomal Recessive", "code": "AR"},
}

meta = {
    "feature_names": list(X.columns),
    "disease_map": DISEASE_MAP,
    "inheritance": INHERITANCE,
    "accuracy": round(acc, 4)
}
with open("model/meta.json", "w") as f:
    json.dump(meta, f)

print("Model tersimpan di folder model/")

