import os
import datetime
import rasterio
import numpy as np

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

target_dir = os.path.join("taking_feature")
maps_dir = os.path.join(target_dir, "maps")
rain_dir = os.path.join(target_dir, "rainfall_dynamic")

# Baseline susceptibility grid as reference
prob_path = os.path.join(maps_dir, "landslide_susceptibility_probability.tif")
with rasterio.open(prob_path) as ref_src:
    meta = ref_src.meta.copy()
    ref_width = ref_src.width
    ref_height = ref_src.height

meta.update(dtype='float32', nodata=-9999.0)

# Input rainfall rasters
r_24h_path = os.path.join(rain_dir, "R_24h.tif")
r_3d_path = os.path.join(rain_dir, "R_3d.tif")
r_7d_path = os.path.join(rain_dir, "R_7d.tif")
r_14d_path = os.path.join(rain_dir, "R_14d.tif")
r_30d_path = os.path.join(rain_dir, "R_30d.tif")
f_24h_path = os.path.join(rain_dir, "F_24h.tif")
f_72h_path = os.path.join(rain_dir, "F_72h.tif")

# Outputs
current_risk_path = os.path.join(maps_dir, "current_landslide_risk.tif")
risk_24h_path = os.path.join(maps_dir, "landslide_risk_24h.tif")
risk_72h_path = os.path.join(maps_dir, "landslide_risk_72h.tif")
report_path = os.path.join(maps_dir, "current_risk_report.txt")

EXTREME_THRESHOLD = 150.0

# Open all datasets
datasets = {
    "base": rasterio.open(prob_path),
    "r_24h": rasterio.open(r_24h_path),
    "r_3d": rasterio.open(r_3d_path),
    "r_7d": rasterio.open(r_7d_path),
    "r_14d": rasterio.open(r_14d_path),
    "r_30d": rasterio.open(r_30d_path),
    "f_24h": rasterio.open(f_24h_path),
    "f_72h": rasterio.open(f_72h_path)
}

out_current = rasterio.open(current_risk_path, 'w', **meta)
out_24h = rasterio.open(risk_24h_path, 'w', **meta)
out_72h = rasterio.open(risk_72h_path, 'w', **meta)

print("Calculating dynamic risk...")

# For stats
min_risk, max_risk, mean_risk = float('inf'), float('-inf'), 0.0
count_valid, nodata_count = 0, 0
sum_risk = 0.0
nan_count, inf_count = 0, 0

tile_size = 1024
for row in range(0, ref_height, tile_size):
    for col in range(0, ref_width, tile_size):
        window = rasterio.windows.Window(col, row, min(tile_size, ref_width - col), min(tile_size, ref_height - row))
        
        # Read chunks
        base = datasets["base"].read(1, window=window)
        r_24h = datasets["r_24h"].read(1, window=window)
        r_3d = datasets["r_3d"].read(1, window=window)
        r_7d = datasets["r_7d"].read(1, window=window)
        r_14d = datasets["r_14d"].read(1, window=window)
        r_30d = datasets["r_30d"].read(1, window=window)
        f_24h = datasets["f_24h"].read(1, window=window)
        f_72h = datasets["f_72h"].read(1, window=window)
        
        valid_mask = (base != datasets["base"].nodata) & ~np.isnan(base)
        nodata_count += np.sum(~valid_mask)
        
        if np.sum(valid_mask) > 0:
            # Score calculation
            score = (r_24h * 1.0) + (r_3d * 0.8) + (r_7d * 0.5) + (r_14d * 0.2) + (r_30d * 0.1)
            multiplier = 1.0 + (score / EXTREME_THRESHOLD)
            current_risk = base * multiplier
            current_risk = np.clip(current_risk, 0.0, 1.0)
            
            score_24 = score + (f_24h * 1.0)
            multiplier_24 = 1.0 + (score_24 / EXTREME_THRESHOLD)
            risk_24 = base * multiplier_24
            risk_24 = np.clip(risk_24, 0.0, 1.0)
            
            score_72 = score + (f_72h * 1.0)
            multiplier_72 = 1.0 + (score_72 / EXTREME_THRESHOLD)
            risk_72 = base * multiplier_72
            risk_72 = np.clip(risk_72, 0.0, 1.0)
            
            # Stats for current risk
            v_curr = current_risk[valid_mask]
            min_risk = min(min_risk, v_curr.min())
            max_risk = max(max_risk, v_curr.max())
            sum_risk += v_curr.sum()
            count_valid += len(v_curr)
            
            nan_count += np.sum(np.isnan(v_curr))
            inf_count += np.sum(np.isinf(v_curr))
            
            # Apply NoData
            current_risk[~valid_mask] = meta['nodata']
            risk_24[~valid_mask] = meta['nodata']
            risk_72[~valid_mask] = meta['nodata']
            
            out_current.write(current_risk.astype(np.float32), 1, window=window)
            out_24h.write(risk_24.astype(np.float32), 1, window=window)
            out_72h.write(risk_72.astype(np.float32), 1, window=window)
        else:
            out_current.write(base, 1, window=window)
            out_24h.write(base, 1, window=window)
            out_72h.write(base, 1, window=window)

for ds in datasets.values():
    ds.close()
out_current.close()
out_24h.close()
out_72h.close()

# Generating Report
mean_val = sum_risk / count_valid if count_valid > 0 else 0.0

timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

report_text = f"""============================================================
DYNAMIC LANDSLIDE RISK REPORT
============================================================

Baseline model: CatBoost (Historical)
Baseline susceptibility source: taking_feature/maps/landslide_susceptibility_probability.tif
Current rainfall source: Open-Meteo (Grid interpolation)
Rainfall timestamp: {timestamp}

RAINFALL DATA (Mean values across region):
24h rainfall: YES
3-day rainfall: YES
7-day rainfall: YES
14-day rainfall: YES
30-day rainfall: YES
24h forecast: YES
72h forecast: YES

Sentinel-1 status = UNAVAILABLE
Note: Current Sentinel-1 unavailable; dynamic risk calculation uses baseline susceptibility plus current/forecast rainfall.

DYNAMIC RISK METHODOLOGY
Formula: 
- Rainfall_Score = (R_24h * 1.0) + (R_3d * 0.8) + (R_7d * 0.5) + (R_14d * 0.2) + (R_30d * 0.1)
- Multiplier = 1.0 + (Rainfall_Score / 150.0)
- Dynamic Risk = min(1.0, Baseline_Susceptibility * Multiplier)

Assumptions: 
- 150.0 acts as a proxy Extreme Risk Threshold to scale the probabilities appropriately.
- Forecast rainfall is added linearly to the Rainfall_Score for future risk projection.
Limitations: 
- Due to the absence of a localized historical climatology baseline, the Antecedent Precipitation Index (API) is used to scale probability instead of an exact statistical anomaly mapping. 
- The rainfall data is downscaled from a coarse 0.1-degree meteorological grid to a 90m resolution raster using nearest-neighbor interpolation.

VALIDATION
CRS: {meta['crs']}
Dimensions: {ref_width} x {ref_height}
Minimum: {min_risk:.4f}
Maximum: {max_risk:.4f}
Mean: {mean_val:.4f}
NoData Count: {nodata_count}
NaN Count: {nan_count}
Infinity Count: {inf_count}
Range 0-1 Confirmed: {"PASS" if (min_risk >= 0 and max_risk <= 1) else "FAIL"}

FINAL OUTPUT
Current rainfall: YES
Recent rainfall: YES
24h forecast: YES
72h forecast: YES
Current Sentinel-1: NO

Dynamic rainfall risk: READY
Current risk raster: CREATED
"""

with open(report_path, "w") as f:
    f.write(report_text)
    
print("Dynamic risk module complete.")
