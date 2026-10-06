import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import os
import joblib

in_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v3"
model_out = r"C:\Users\abhis\Documents\Ai project\Sih\models\v3"
os.makedirs(model_out, exist_ok=True)

# 1. LANDSLIDE DEPLOYABLE MODEL
print("Training deployable Landslide Model...")
df_l = pd.read_csv(os.path.join(in_dir, "landslide_features_v3_advanced.csv"))
# Features available in live API
live_ls_cols = ['dem', 'slope', 'aspect', 'tri', 'tpi', 'rainfall', 'S2_NDVI', 'S2_NDWI', 'FE_hydraulic_stress', 'FE_veg_anchor']
X_l = df_l[live_ls_cols].fillna(0)
y_l = df_l['class']

xgb_ls = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='logloss')
xgb_ls.fit(X_l, y_l)
joblib.dump(xgb_ls, os.path.join(model_out, "live_landslide_xgb.pkl"))
print("Saved live_landslide_xgb.pkl")

# 2. FLOOD DEPLOYABLE MODEL
print("Training deployable Flood Model...")
df_f = pd.read_csv(os.path.join(in_dir, "flood_features_v3_advanced.csv"))
# Features available in live API
live_f_cols = ['rainfall_7d', 'antecedent_rainfall', 'DEM', 'slope', 'flow_accumulation', 'distance_to_river', 'FE_TWI', 'FE_flow_rain', 'FE_elevation_dist']
X_f = df_f[live_f_cols].fillna(0)
y_f = df_f['flood_label']

xgb_f = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='logloss')
xgb_f.fit(X_f, y_f)
joblib.dump(xgb_f, os.path.join(model_out, "live_flood_xgb.pkl"))
print("Saved live_flood_xgb.pkl")

