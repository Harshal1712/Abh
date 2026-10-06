import pandas as pd
import numpy as np
import os

in_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v2"
out_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v3"
os.makedirs(out_dir, exist_ok=True)

# 1. Landslide Features
l_csv = os.path.join(in_dir, "landslide_features_v2_sentinel2.csv")
if os.path.exists(l_csv):
    df_l = pd.read_csv(l_csv)
    
    # Feature 1: Hydraulic Stress (slope * rainfall)
    if 'slope' in df_l.columns and 'rainfall' in df_l.columns:
        df_l['FE_hydraulic_stress'] = df_l['slope'] * df_l['rainfall']
        
    # Feature 2: Vegetation Anchoring Factor (NDVI / slope)
    if 'S2_NDVI' in df_l.columns and 'slope' in df_l.columns:
        # Avoid division by zero
        slope_safe = np.where(df_l['slope'] == 0, 0.01, df_l['slope'])
        df_l['FE_veg_anchor'] = df_l['S2_NDVI'] / slope_safe
        
    # Feature 3: S1 Aggregates (Mean radar backscatter over time)
    s1_vh_cols = [c for c in df_l.columns if 'VH' in c and 'S1' in c]
    if s1_vh_cols:
        df_l['FE_S1_VH_mean'] = df_l[s1_vh_cols].mean(axis=1)
        df_l['FE_S1_VH_max'] = df_l[s1_vh_cols].max(axis=1)
        
    s1_vv_cols = [c for c in df_l.columns if 'VV' in c and 'S1' in c]
    if s1_vv_cols:
        df_l['FE_S1_VV_mean'] = df_l[s1_vv_cols].mean(axis=1)
    
    if s1_vh_cols and s1_vv_cols:
        vh_safe = np.where(df_l['FE_S1_VH_mean'] == 0, 1e-6, df_l['FE_S1_VH_mean'])
        df_l['FE_S1_VV_VH_ratio'] = df_l['FE_S1_VV_mean'] / vh_safe

    l_out = os.path.join(out_dir, "landslide_features_v3_advanced.csv")
    df_l.to_csv(l_out, index=False)
    print(f"Generated advanced landslide features: {l_out}")

# 2. Flood Features
f_csv = os.path.join(in_dir, "flood_features_v2_sentinel2.csv")
if os.path.exists(f_csv):
    df_f = pd.read_csv(f_csv)
    
    # Feature 1: Topographic Wetness Index (TWI proxy)
    if 'flow_accumulation' in df_f.columns and 'slope' in df_f.columns:
        slope_rad = np.radians(np.where(df_f['slope'] <= 0.1, 0.1, df_f['slope']))
        flow_safe = np.where(df_f['flow_accumulation'] <= 0, 1, df_f['flow_accumulation'])
        df_f['FE_TWI'] = np.log(flow_safe / np.tan(slope_rad))
        
    # Feature 2: Flow-Rain Interaction (7d)
    if 'flow_accumulation' in df_f.columns and 'rainfall_7d' in df_f.columns:
        df_f['FE_flow_rain'] = df_f['flow_accumulation'] * df_f['rainfall_7d']
        
    # Feature 3: Elevation * Distance to river
    if 'DEM' in df_f.columns and 'distance_to_river' in df_f.columns:
        df_f['FE_elevation_dist'] = df_f['DEM'] * df_f['distance_to_river']
        
    f_out = os.path.join(out_dir, "flood_features_v3_advanced.csv")
    df_f.to_csv(f_out, index=False)
    print(f"Generated advanced flood features: {f_out}")
