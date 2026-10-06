import pandas as pd
import numpy as np
from catboost import CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
import json
import os
import matplotlib.pyplot as plt

out_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v2"
model_out = r"C:\Users\abhis\Documents\Ai project\Sih\models\v2"
os.makedirs(model_out, exist_ok=True)

def evaluate_model(y_true, y_pred, y_prob, model_name):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    roc_auc = roc_auc_score(y_true, y_prob)
    pr_auc = average_precision_score(y_true, y_prob)
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    return {
        "model": model_name,
        "Accuracy": round(acc, 4),
        "Precision": round(prec, 4),
        "Recall": round(rec, 4),
        "F1": round(f1, 4),
        "ROC-AUC": round(roc_auc, 4),
        "PR-AUC": round(pr_auc, 4),
        "Confusion_Matrix": cm
    }

# -------------------------
# LANDSLIDE TRAINING
# -------------------------
print("--- LANDSLIDE TRAINING ---")
l_csv = os.path.join(out_dir, "landslide_features_v2_sentinel2.csv")
if os.path.exists(l_csv):
    df_l = pd.read_csv(l_csv)
    # Target
    y_l = df_l['class']
    
    # Existing features
    terrain_rain = ['dem', 'slope', 'aspect', 'tri', 'tpi', 'rainfall']
    s1_feats = [c for c in df_l.columns if 'S1' in c]
    s2_feats = ['S2_NDVI', 'S2_NDWI', 'S2_MNDWI', 'S2_NDBI', 'S2_BSI']
    s2_temporal = ['S2_NDVI_change', 'S2_NDWI_change', 'S2_MNDWI_change', 'S2_NDBI_change']
    
    X_l0 = df_l[terrain_rain].fillna(0)
    X_l1 = df_l[terrain_rain + s2_feats].fillna(0)
    X_l2 = df_l[terrain_rain + s1_feats + s2_feats].fillna(0)
    
    # Split
    X_train_l0, X_test_l0, y_train_l, y_test_l = train_test_split(X_l0, y_l, test_size=0.2, random_state=42)
    X_train_l1, X_test_l1 = train_test_split(X_l1, test_size=0.2, random_state=42)
    X_train_l2, X_test_l2 = train_test_split(X_l2, test_size=0.2, random_state=42)
    
    models_l = []
    
    # Train L0
    cb_l0 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_l0.fit(X_train_l0, y_train_l)
    models_l.append(evaluate_model(y_test_l, cb_l0.predict(X_test_l0), cb_l0.predict_proba(X_test_l0)[:, 1], "L0 (Terrain+Rain)"))
    
    # Train L1
    cb_l1 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_l1.fit(X_train_l1, y_train_l)
    models_l.append(evaluate_model(y_test_l, cb_l1.predict(X_test_l1), cb_l1.predict_proba(X_test_l1)[:, 1], "L1 (Terrain+Rain+S2)"))
    
    # Train L2
    cb_l2 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_l2.fit(X_train_l2, y_train_l)
    models_l.append(evaluate_model(y_test_l, cb_l2.predict(X_test_l2), cb_l2.predict_proba(X_test_l2)[:, 1], "L2 (Terrain+Rain+S1+S2)"))
    
    df_res_l = pd.DataFrame(models_l)
    print(df_res_l.to_string(index=False))
    
    # Save best
    cb_l2.save_model(os.path.join(model_out, "landslide_catboost_v2_s2.cbm"))
    
    # Feature Importance
    fi_l2 = pd.DataFrame({'Feature': X_l2.columns, 'Importance': cb_l2.feature_importances_}).sort_values(by='Importance', ascending=False)
    print("\nL2 Feature Importance:")
    print(fi_l2.head(10).to_string(index=False))
    
# -------------------------
# FLOOD TRAINING
# -------------------------
print("\n--- FLOOD TRAINING ---")
f_csv = os.path.join(out_dir, "flood_features_v2_sentinel2.csv")
if os.path.exists(f_csv):
    df_f = pd.read_csv(f_csv)
    y_f = df_f['flood_label']
    
    rain_terrain = ['rain_intensity', 'rainfall_1d', 'rainfall_3d', 'rainfall_7d', 'antecedent_rainfall', 'DEM', 'slope', 'flow_accumulation', 'distance_to_river']
    s1_f = ['S1_VV', 'S1_VH', 'S1_VV_change', 'S1_VH_change', 'S1_VV_VH_ratio']
    s2_static = ['S2_NDVI', 'S2_NDWI', 'S2_MNDWI', 'S2_NDBI', 'S2_BSI']
    
    # Fill Nans (in real logic, catboost handles nans, but doing 0 for simple ablation as requested unless we specify NaN to catboost)
    X_f0 = df_f[rain_terrain]
    X_f1 = df_f[rain_terrain + s1_f]
    X_f2 = df_f[rain_terrain + s1_f + s2_static]
    X_f3 = df_f[s2_static]
    
    X_train_f0, X_test_f0, y_train_f, y_test_f = train_test_split(X_f0, y_f, test_size=0.2, random_state=42)
    X_train_f1, X_test_f1 = train_test_split(X_f1, test_size=0.2, random_state=42)
    X_train_f2, X_test_f2 = train_test_split(X_f2, test_size=0.2, random_state=42)
    X_train_f3, X_test_f3 = train_test_split(X_f3, test_size=0.2, random_state=42)
    
    models_f = []
    
    # Train F0
    cb_f0 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_f0.fit(X_train_f0.fillna(0), y_train_f) # Fallback handling
    models_f.append(evaluate_model(y_test_f, cb_f0.predict(X_test_f0.fillna(0)), cb_f0.predict_proba(X_test_f0.fillna(0))[:, 1], "F0 (Rain+Terrain)"))
    
    cb_f1 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_f1.fit(X_train_f1.fillna(0), y_train_f)
    models_f.append(evaluate_model(y_test_f, cb_f1.predict(X_test_f1.fillna(0)), cb_f1.predict_proba(X_test_f1.fillna(0))[:, 1], "F1 (Rain+Terrain+S1)"))
    
    cb_f2 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_f2.fit(X_train_f2.fillna(0), y_train_f)
    models_f.append(evaluate_model(y_test_f, cb_f2.predict(X_test_f2.fillna(0)), cb_f2.predict_proba(X_test_f2.fillna(0))[:, 1], "F2 (Rain+Terrain+S1+S2)"))
    
    cb_f3 = CatBoostClassifier(iterations=100, verbose=0, random_seed=42)
    cb_f3.fit(X_train_f3.fillna(0), y_train_f)
    models_f.append(evaluate_model(y_test_f, cb_f3.predict(X_test_f3.fillna(0)), cb_f3.predict_proba(X_test_f3.fillna(0))[:, 1], "F3 (S2 Only)"))
    
    df_res_f = pd.DataFrame(models_f)
    print(df_res_f.to_string(index=False))
    
    # Save best
    cb_f2.save_model(os.path.join(model_out, "flood_catboost_v2_s2.cbm"))
    
    fi_f2 = pd.DataFrame({'Feature': X_f2.columns, 'Importance': cb_f2.feature_importances_}).sort_values(by='Importance', ascending=False)
    print("\nF2 Feature Importance:")
    print(fi_f2.head(10).to_string(index=False))
    
print("\n--- REPORTING ---")
# Write report...
# ...
