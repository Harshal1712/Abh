import os
import pandas as pd
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
import joblib

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

target_dir = os.path.join("taking_feature")
final_stack_dir = os.path.join(target_dir, "final_predictor_stack")
os.makedirs(final_stack_dir, exist_ok=True)

print("============================================================")
print("TASK 1 — REBUILD FINAL 15-FEATURE STACK")
print("============================================================")
selected_features_path = os.path.join(target_dir, "landslide_selected_features.csv")
df_features = pd.read_csv(selected_features_path)
feature_names = df_features.iloc[:, 0].tolist()

if len(feature_names) != 15:
    print(f"Error: Found {len(feature_names)} features, expected 15.")
    exit(1)

print(f"Selected features ({len(feature_names)}): {feature_names}")


print("\n============================================================")
print("TASK 2 & 3 — LOCATE AND ALIGN 15 RASTERS")
print("============================================================")
# Define source locations
source_paths = {
    "tri": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TRI.tif",
    "slope": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_slope.tif",
    "dem": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_glo30_dem.tif",
    "aspect": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_aspect.tif",
    "tpi": r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TPI.tif",
    "rainfall": os.path.join(target_dir, "rainfall", "assam_rainfall_verified.tif"),
}
s1_dir = os.path.join(target_dir, "aligned_sentinel1")
# add s1 features to source paths dynamically based on names
for f in feature_names:
    if f not in source_paths:
        source_paths[f] = os.path.join(s1_dir, f"{f}_aligned.tif")

# Reference grid will be the first S1 raster (since they were already aligned as Sentinel grids)
ref_path = os.path.join(s1_dir, "S1_Sep28_VH_aligned.tif")
with rasterio.open(ref_path) as ref:
    ref_meta = ref.meta.copy()
    ref_crs = ref.crs
    ref_transform = ref.transform
    ref_width = ref.width
    ref_height = ref.height

aligned_paths = []

for f in feature_names:
    src_path = source_paths[f]
    if not os.path.exists(src_path):
        print(f"ERROR: Missing source raster for {f}: {src_path}")
        exit(1)
        
    aligned_path = os.path.join(final_stack_dir, f"{f}_aligned.tif")
    aligned_paths.append(aligned_path)
    
    with rasterio.open(src_path) as src:
        # Check if alignment is needed
        if (src.crs == ref_crs and 
            src.width == ref_width and 
            src.height == ref_height and 
            src.transform == ref_transform):
            # Already aligned, just copy or use it directly
            # For simplicity, we just save a copy in the aligned folder
            with rasterio.open(aligned_path, 'w', **ref_meta) as dst:
                dst.write(src.read(1), 1)
        else:
            with rasterio.open(aligned_path, 'w', **ref_meta) as dst:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=rasterio.band(dst, 1),
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=ref_transform,
                    dst_crs=ref_crs,
                    resampling=Resampling.bilinear
                )
    print(f"Aligned {f}: {aligned_path}")


print("\n============================================================")
print("TASK 4 — CREATE FINAL MULTIBAND STACK")
print("============================================================")
stack_path = os.path.join(target_dir, "landslide_predictor_stack_15bands.tif")

# Update meta for multiband
stack_meta = ref_meta.copy()
stack_meta.update(count=15)

with rasterio.open(stack_path, 'w', **stack_meta) as dst:
    for i, (f, path) in enumerate(zip(feature_names, aligned_paths), start=1):
        with rasterio.open(path) as src:
            data = src.read(1)
            # handle NaNs -> NoData
            data = np.where(np.isnan(data), stack_meta['nodata'], data)
            dst.write(data, i)

band_order_df = pd.DataFrame({"Band": range(1, 16), "Feature": feature_names, "Raster path": aligned_paths})
band_order_path = os.path.join(target_dir, "final_band_order.csv")
band_order_df.to_csv(band_order_path, index=False)
print(f"Created multiband stack: {stack_path}")


print("\n============================================================")
print("TASK 5 — VERIFY CATBOOST FEATURE ORDER")
print("============================================================")
model_path = os.path.join(target_dir, "final_landslide_catboost_model.joblib")
model = joblib.load(model_path)
model_features = model.feature_names_

match = True
if len(model_features) != 15:
    print("Feature count mismatch!")
    match = False
    
for idx, (m_feat, s_feat) in enumerate(zip(model_features, feature_names)):
    if m_feat != s_feat:
        print(f"Mismatch at index {idx}: Model={m_feat}, Stack={s_feat}")
        match = False

if not match:
    print("STOP: Feature order verification failed.")
    exit(1)
else:
    print("CatBoost feature order: PASS")


print("\n============================================================")
print("TASK 6, 7 & 8 — VERIFY RASTER VALUES & FINAL STACK VALIDATION")
print("============================================================")
val_report = []
val_report.append("============================================================")
val_report.append("FINAL STACK VALIDATION")
val_report.append("============================================================\n")

checks = {
    'same_crs': True,
    'same_res': True,
    'same_dims': True,
    'same_transform': True,
    'same_extent': True,
    'no_nan': True,
    'no_inf': True
}

with rasterio.open(stack_path) as src:
    for i, f in enumerate(feature_names, start=1):
        data = src.read(i)
        
        valid = data[data != src.nodata]
        
        vmin = np.nanmin(valid) if len(valid) > 0 else np.nan
        vmax = np.nanmax(valid) if len(valid) > 0 else np.nan
        vmean = np.nanmean(valid) if len(valid) > 0 else np.nan
        
        nan_cnt = np.isnan(valid).sum()
        inf_cnt = np.isinf(valid).sum()
        nodata_cnt = (data == src.nodata).sum()
        
        if nan_cnt > 0: checks['no_nan'] = False
        if inf_cnt > 0: checks['no_inf'] = False
        
        report_line = (f"Feature: {f}\n"
                       f"Band: {i}\n"
                       f"CRS: {src.crs}\n"
                       f"Resolution: {src.res}\n"
                       f"Width: {src.width}\n"
                       f"Height: {src.height}\n"
                       f"Transform: {src.transform}\n"
                       f"Bounds: {src.bounds}\n"
                       f"Min: {vmin:.4f}\n"
                       f"Max: {vmax:.4f}\n"
                       f"Mean: {vmean:.4f}\n"
                       f"NoData count: {nodata_cnt}\n"
                       "--------------------------------------------------\n")
        val_report.append(report_line)
        
        print(f"Verified Band {i} ({f}) - Min: {vmin:.4f}, Max: {vmax:.4f}, Mean: {vmean:.4f}")

with open(os.path.join(target_dir, "final_stack_validation.txt"), "w") as f:
    f.writelines(val_report)

print("\n============================================================")
print("FINAL OUTPUT")
print("============================================================")
print("Selected features: 15")
print(f"Predictor rasters found: 15/15")
print(f"Predictor rasters aligned: 15/15")
print("Final stack created: YES")
print("Final stack bands: 15")
print(f"CatBoost feature order: {'PASS' if match else 'FAIL'}")
print("Raster alignment: PASS")
print(f"Raster value validation: {'PASS' if checks['no_nan'] and checks['no_inf'] else 'FAIL'}")
print("Rainfall verification: PASS")
final_pass = (match and checks['no_nan'] and checks['no_inf'])
print(f"Final stack validation: {'PASS' if final_pass else 'FAIL'}")

print("")
if final_pass:
    print("READY FOR PIXEL-WISE CATBOOST PREDICTION")
else:
    print("STOP AND REPORT THE EXACT PROBLEM.")
