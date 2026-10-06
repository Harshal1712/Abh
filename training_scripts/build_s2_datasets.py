import os
import glob
import json
import pandas as pd
import numpy as np
import rasterio
from rasterio.warp import transform
import zipfile
import re
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

s2_dir = r"D:\sentinel 2"
landslide_csv_path = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel\model_results\landslide_v2\cleaned_data\landslide_training_verified.csv"
flood_csv_path = r"C:\Users\abhis\Documents\Ai project\Sih\flood_training_dataset_v1.csv"
out_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v2"

os.makedirs(out_dir, exist_ok=True)

def extract_tag_value(xml_text, tag_name):
    pattern = rf"<{tag_name}[^>]*>([^<]+)</"
    match = re.search(pattern, xml_text)
    if not match:
        pattern = rf"<[^>:]+:{tag_name}[^>]*>([^<]+)</"
        match = re.search(pattern, xml_text)
    return match.group(1).strip() if match else "Unknown"

# Phase 1: Inventory
print("PHASE 1: Inventorying Sentinel-2 Data")
inventory = []
zip_files = glob.glob(os.path.join(s2_dir, "*.zip"))
for zf in zip_files:
    fname = os.path.basename(zf)
    date_str = fname.split('_')[2][:8]
    date_obj = datetime.strptime(date_str, "%Y%m%d")
    
    bands = {}
    with zipfile.ZipFile(zf, 'r') as z:
        for f in z.namelist():
            if f.endswith('B02_10m.jp2'): bands['B02'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('B03_10m.jp2'): bands['B03'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('B04_10m.jp2'): bands['B04'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('B08_10m.jp2'): bands['B08'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('B11_20m.jp2'): bands['B11'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('B12_20m.jp2'): bands['B12'] = f"/vsizip/{zf}/{f}"
            elif f.endswith('SCL_20m.jp2'): bands['SCL'] = f"/vsizip/{zf}/{f}"
            
        safe_dir = z.namelist()[0].split('/')[0]
        mtd_path = f"{safe_dir}/MTD_MSIL2A.xml"
        try:
            with z.open(mtd_path) as f:
                xml_text = f.read().decode('utf-8', errors='ignore')
                crs = extract_tag_value(xml_text, "HORIZONTAL_CS_CODE")
        except:
            crs = "Unknown"
            
    inventory.append({
        'filename': fname,
        'date': date_obj,
        'bands': bands,
        'crs': crs
    })

inventory.sort(key=lambda x: x['date'])
print(f"Inventoried {len(inventory)} scenes.")

# Function to extract pixel values using rasterio.sample
def extract_values(df, lon_col='longitude', lat_col='latitude', event_date_col='date'):
    if event_date_col not in df.columns:
        if 'Event_Date' in df.columns: event_date_col = 'Event_Date'
        elif 'event_date' in df.columns: event_date_col = 'event_date'
        else: event_date_col = None
        
    df = df.copy()
    
    # Target features
    for f in ['S2_NDVI', 'S2_NDWI', 'S2_MNDWI', 'S2_NDBI', 'S2_BSI', 'S2_date', 'S2_prev_date', 
              'S2_NDVI_change', 'S2_NDWI_change', 'S2_MNDWI_change', 'S2_NDBI_change']:
        df[f] = np.nan
        
    lons = df[lon_col].values
    lats = df[lat_col].values
    
    # We will process each scene and update rows where scene_date < event_date
    for i in range(len(df)):
        if i % 100 == 0: print(f"Processing row {i}/{len(df)}...")
        
        row_lon = lons[i]
        row_lat = lats[i]
        
        event_d = pd.to_datetime(df.iloc[i][event_date_col]) if event_date_col else datetime(2025, 12, 31)
        
        valid_observations = []
        
        for scene in inventory:
            if scene['date'] >= event_d:
                continue # STRICT TEMPORAL LEAKAGE RULE
                
            # Sample SCL first to check clouds
            scl_path = scene['bands'].get('SCL')
            if not scl_path: continue
            
            with rasterio.open(scl_path) as src:
                # Transform lon/lat to CRS
                xs, ys = transform('EPSG:4326', src.crs, [row_lon], [row_lat])
                try:
                    scl_val = list(src.sample([(xs[0], ys[0])]))[0][0]
                except:
                    continue # Out of bounds
                    
            # Valid SCL classes: 4 (Vegetation), 5 (Bare Soil), 6 (Water)
            # Invalid: 0 (No Data), 1 (Defective), 2 (Dark), 3 (Shadow), 7 (Unclassified), 8 (Cloud Med), 9 (Cloud High), 10 (Cirrus), 11 (Snow)
            valid_classes = [4, 5, 6]
            if scl_val not in valid_classes:
                continue
                
            # Valid pixel! Extract bands
            vals = {}
            for bname in ['B02', 'B03', 'B04', 'B08', 'B11', 'B12']:
                with rasterio.open(scene['bands'][bname]) as src:
                    xs, ys = transform('EPSG:4326', src.crs, [row_lon], [row_lat])
                    val = list(src.sample([(xs[0], ys[0])]))[0][0]
                    vals[bname] = float(val)
                    
            # Calculate indices safely
            b2, b3, b4, b8, b11 = vals['B02'], vals['B03'], vals['B04'], vals['B08'], vals['B11']
            
            ndvi = (b8 - b4) / (b8 + b4) if (b8 + b4) != 0 else np.nan
            ndwi = (b3 - b8) / (b3 + b8) if (b3 + b8) != 0 else np.nan
            mndwi = (b3 - b11) / (b3 + b11) if (b3 + b11) != 0 else np.nan
            ndbi = (b11 - b8) / (b11 + b8) if (b11 + b8) != 0 else np.nan
            bsi = ((b11 + b4) - (b8 + b2)) / ((b11 + b4) + (b8 + b2)) if ((b11 + b4) + (b8 + b2)) != 0 else np.nan
            
            valid_observations.append({
                'date': scene['date'],
                'ndvi': ndvi, 'ndwi': ndwi, 'mndwi': mndwi, 'ndbi': ndbi, 'bsi': bsi
            })
            
        if len(valid_observations) > 0:
            # Sort chronologically
            valid_observations.sort(key=lambda x: x['date'])
            latest = valid_observations[-1]
            
            df.at[i, 'S2_date'] = latest['date'].strftime('%Y-%m-%d')
            df.at[i, 'S2_NDVI'] = latest['ndvi']
            df.at[i, 'S2_NDWI'] = latest['ndwi']
            df.at[i, 'S2_MNDWI'] = latest['mndwi']
            df.at[i, 'S2_NDBI'] = latest['ndbi']
            df.at[i, 'S2_BSI'] = latest['bsi']
            
            if len(valid_observations) > 1:
                prev = valid_observations[-2]
                df.at[i, 'S2_prev_date'] = prev['date'].strftime('%Y-%m-%d')
                df.at[i, 'S2_NDVI_change'] = latest['ndvi'] - prev['ndvi']
                df.at[i, 'S2_NDWI_change'] = latest['ndwi'] - prev['ndwi']
                df.at[i, 'S2_MNDWI_change'] = latest['mndwi'] - prev['mndwi']
                df.at[i, 'S2_NDBI_change'] = latest['ndbi'] - prev['ndbi']

    return df

print("\nPHASE 5: Landslide Feature Extraction")
df_landslide = pd.read_csv(landslide_csv_path)
df_l_out = extract_values(df_landslide)
l_out_path = os.path.join(out_dir, "landslide_features_v2_sentinel2.csv")
df_l_out.to_csv(l_out_path, index=False)
print(f"Saved {l_out_path}")

print("\nPHASE 6: Flood Feature Extraction")
if os.path.exists(flood_csv_path):
    df_flood = pd.read_csv(flood_csv_path)
    df_f_out = extract_values(df_flood)
    f_out_path = os.path.join(out_dir, "flood_features_v2_sentinel2.csv")
    df_f_out.to_csv(f_out_path, index=False)
    print(f"Saved {f_out_path}")
else:
    print("Flood CSV not found.")

print("\nPHASE 7: Dataset Versioning complete.")
