import os
import psutil
import pandas as pd
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
import joblib
import time

# --- CONFIGURATION ---
TEST_MODE = False
TILE_SIZE = 256
MAX_BATCH_ROWS = 10000

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)
target_dir = os.path.join("taking_feature")
maps_dir = os.path.join(target_dir, "maps")
os.makedirs(maps_dir, exist_ok=True)

# ---------------------

def get_ram_mb():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

print(f"RAM before processing: {get_ram_mb():.2f} MB")

# Load model
model_path = os.path.join(target_dir, "final_landslide_catboost_model.joblib")
model = joblib.load(model_path)
model_features = model.feature_names_

# Inventory
inv_df = pd.read_csv(os.path.join(target_dir, "sentinel1_source_inventory.csv"))
inv_df['Date_str'] = inv_df['Date'].astype(str)

def get_s1_path(date_str, pol):
    row = inv_df[inv_df['Date_str'].str.contains(date_str)]
    return row.iloc[0][f'{pol}_IMG']

source_files = {
    "tri": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TRI.tif",
    "slope": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_slope.tif",
    "dem": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_glo30_dem.tif",
    "aspect": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_aspect.tif",
    "tpi": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TPI.tif",
    "rainfall": os.path.join(target_dir, "rainfall", "assam_rainfall_verified.tif"),
}

s1_needed = {
    "S1_Sep28_VH": ("20250928", "VH"),
    "S1_Aug23_VH": ("20250823", "VH"),
    "S1_Aug23_VV": ("20250823", "VV"),
    "S1_Jul06_VV": ("20250706", "VV"),
    "S1_Aug11_VH": ("20250811", "VH"),
    "S1_Jul18_VH": ("20250718", "VH"),
    "S1_Jul30_VV": ("20250730", "VV"),
    "S1_Jun12_VH": ("20250612", "VH"), 
    "S1_Jun12_VV": ("20250612", "VV"), 
    "S1_Sep28_VV": ("20250928", "VV"), 
}

for k, (d, p) in s1_needed.items():
    source_files[k] = get_s1_path(d, p)

ref_path = source_files["S1_Sep28_VH"]
with rasterio.open(ref_path) as ds_ref:
    ref_proj = ds_ref.crs
    ref_geotrans = ds_ref.transform
    ref_x = ds_ref.width
    ref_y = ds_ref.height

# Setup output TIFF
prob_out_path = os.path.join(maps_dir, "landslide_susceptibility_probability.tif")
with rasterio.open(ref_path) as src:
    meta = src.meta.copy()

meta.update(
    driver='GTiff',
    dtype='float32',
    count=1,
    nodata=-9999.0,
    compress='lzw',
    tiled=True,
    blockxsize=TILE_SIZE,
    blockysize=TILE_SIZE,
    bigtiff='IF_SAFER'
)

# Open all sources and create WarpedVRTs
src_datasets = {}
src_vrts = {}
for key, src_path in source_files.items():
    src_ds = rasterio.open(src_path)
    src_datasets[key] = src_ds
    vrt = WarpedVRT(src_ds, crs=ref_proj, transform=ref_geotrans, width=ref_x, height=ref_y, resampling=Resampling.bilinear)
    src_vrts[key] = vrt

# Counters and Stats
total_processed_pixels = 0
total_valid_pixels = 0
total_nodata_pixels = 0
global_min = float('inf')
global_max = float('-inf')
global_sum = 0.0

start_time = time.time()

peak_ram = 0

print("\n--- STARTING LOW-MEMORY PREDICTION ---")
print(f"Test Mode: {TEST_MODE}")

with rasterio.open(prob_out_path, 'w', **meta) as dst:
    tiles_processed = 0
    for row in range(0, ref_y, TILE_SIZE):
        if TEST_MODE and tiles_processed >= 25:
            break
            
        for col in range(0, ref_x, TILE_SIZE):
            if TEST_MODE and tiles_processed >= 25:
                break
                
            window = Window(col, row, min(TILE_SIZE, ref_x - col), min(TILE_SIZE, ref_y - row))
            
            # Print memory info every 10 tiles
            if tiles_processed % 10 == 0:
                print(f"Processing Tile {tiles_processed+1}")
                print(f"  RAM before loading tile: {get_ram_mb():.2f} MB")
            
            chunk_data = {}
            for key, src in src_vrts.items():
                arr = src.read(1, window=window)
                if src.nodata is not None:
                    arr = np.where(arr == src.nodata, np.nan, arr)
                if "S1_" in key:
                    arr = np.where(arr == 0.0, np.nan, arr)
                chunk_data[key] = arr
                
            chunk_data["VH_change"] = chunk_data["S1_Sep28_VH"] - chunk_data["S1_Jun12_VH"]
            chunk_data["VV_change"] = chunk_data["S1_Sep28_VV"] - chunk_data["S1_Jun12_VV"]
            
            if tiles_processed % 10 == 0:
                print(f"  RAM after loading tile: {get_ram_mb():.2f} MB")
                
            # Construct X only for this tile
            # Use a dict to avoid creating large intermediate dataframes
            flat_dict = {feat: chunk_data[feat].flatten() for feat in model_features}
            
            # free chunk_data
            del chunk_data
            
            df_chunk = pd.DataFrame(flat_dict)
            del flat_dict
            
            valid_mask = ~df_chunk.isna().any(axis=1)
            
            if tiles_processed % 10 == 0:
                print(f"  RAM after constructing X: {get_ram_mb():.2f} MB")
            
            out_arr = np.full(window.height * window.width, -9999.0, dtype=np.float32)
            
            num_valid = valid_mask.sum()
            total_processed_pixels += window.height * window.width
            
            if num_valid > 0:
                X_valid = df_chunk[valid_mask].values
                total_valid_pixels += num_valid
                
                # Batched prediction to keep RAM minimal
                preds = np.zeros(num_valid, dtype=np.float32)
                for batch_start in range(0, num_valid, MAX_BATCH_ROWS):
                    batch_end = min(batch_start + MAX_BATCH_ROWS, num_valid)
                    X_batch = X_valid[batch_start:batch_end]
                    
                    # Predict batch
                    batch_preds = model.predict_proba(X_batch)[:, 1]
                    preds[batch_start:batch_end] = batch_preds
                    
                    del X_batch, batch_preds
                    
                out_arr[valid_mask.values] = preds
                
                # Stats
                global_min = min(global_min, preds.min())
                global_max = max(global_max, preds.max())
                global_sum += preds.sum()
                
                del preds, X_valid
            
            total_nodata_pixels += (window.height * window.width) - num_valid
            
            if tiles_processed % 10 == 0:
                print(f"  RAM after prediction: {get_ram_mb():.2f} MB")
                
            # Immediately write predictions
            dst.write(out_arr.reshape((window.height, window.width)), 1, window=window)
            
            del out_arr, df_chunk, valid_mask
            
            if tiles_processed % 10 == 0:
                print(f"  RAM after releasing arrays: {get_ram_mb():.2f} MB")
            
            peak_ram = max(peak_ram, get_ram_mb())
            tiles_processed += 1

# close VRTs and sources
for vrt in src_vrts.values():
    vrt.close()
for src_ds in src_datasets.values():
    src_ds.close()

elapsed_time = time.time() - start_time

print("\n============================================================")
print("TEST RUN REPORT" if TEST_MODE else "FINAL REPORT")
print("============================================================")
print(f"Tile size: {TILE_SIZE} x {TILE_SIZE}")
print(f"Prediction batch size: {MAX_BATCH_ROWS}")
print(f"Peak RAM usage: {peak_ram:.2f} MB")
print(f"Total pixels processed: {total_processed_pixels}")
print(f"Valid pixels: {total_valid_pixels}")
print(f"NoData pixels: {total_nodata_pixels}")
print(f"Processing time: {elapsed_time:.2f} seconds")

if total_valid_pixels > 0:
    print(f"Probability min: {global_min:.4f}")
    print(f"Probability max: {global_max:.4f}")
    print(f"Probability mean: {global_sum / total_valid_pixels:.4f}")
else:
    print("No valid pixels predicted.")

print("\nLOW-MEMORY PREDICTION: PASS")
print("LANDSLIDE MAP: CREATED")
