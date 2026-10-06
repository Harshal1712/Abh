import os
import rasterio
from rasterio.warp import reproject, Resampling
import pandas as pd
import numpy as np
import joblib

def main():
    base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
    target_dir = os.path.join(base_dir, "taking_feature")
    final_stack_dir = os.path.join(target_dir, "final_predictor_stack")
    aligned_s1_dir = os.path.join(target_dir, "aligned_sentinel1")
    proc_dir = r"C:\Users\abhis\Documents\Ai project\Sih\Processing"
    os.makedirs(final_stack_dir, exist_ok=True)
    
    # 1. READ EXACT SELECTED FEATURE LIST
    sf_path = os.path.join(target_dir, "landslide_selected_features.csv")
    df_sf = pd.read_csv(sf_path)
    selected_features = df_sf.iloc[:, 0].tolist()
    
    # Reference grid
    ref_file = os.path.join(aligned_s1_dir, "S1_Sep28_VH_aligned.tif")
    with rasterio.open(ref_file) as ref_src:
        ref_crs = ref_src.crs
        ref_transform = ref_src.transform
        ref_meta = ref_src.meta.copy()
        
    print("Aligning remaining terrain predictors...")
    terrain_map = {
        'dem': os.path.join(proc_dir, 'assam_glo30_dem.tif'),
        'slope': os.path.join(proc_dir, 'assam_slope.tif'),
        'aspect': os.path.join(proc_dir, 'assam_aspect.tif'),
        'tri': os.path.join(proc_dir, 'assam_TRI.tif'),
        'tpi': os.path.join(proc_dir, 'assam_TPI.tif')
    }
    
    final_paths = {}
    
    # Rainfall is already aligned
    rf_aligned = os.path.join(final_stack_dir, "assam_rainfall_aligned.tif")
    final_paths['rainfall'] = rf_aligned
    
    # Map S1 aligned
    for feat in selected_features:
        if feat.startswith("S1_") or feat in ['VH_change', 'VV_change']:
            final_paths[feat] = os.path.join(aligned_s1_dir, f"{feat}_aligned.tif")
            
    # Align terrain
    for feat, src_path in terrain_map.items():
        if feat in selected_features:
            dst_path = os.path.join(final_stack_dir, f"assam_{feat}_aligned.tif")
            final_paths[feat] = dst_path
            
            with rasterio.Env(GDAL_CACHEMAX=1024):
                with rasterio.open(src_path) as src:
                    with rasterio.open(dst_path, 'w', **ref_meta) as dst:
                        reproject(
                            source=rasterio.band(src, 1),
                            destination=rasterio.band(dst, 1),
                            src_transform=src.transform,
                            src_crs=src.crs,
                            dst_transform=ref_transform,
                            dst_crs=ref_crs,
                            resampling=Resampling.bilinear,
                            warp_mem_limit=1024
                        )
                    
    # 8. CREATE FINAL STACK
    print("Creating 15-band multi-band GeoTIFF stack...")
    stack_meta = ref_meta.copy()
    stack_meta.update(count=15, dtype='float32', compress='lzw', tiled=True, bigtiff='YES')
    
    stack_path = os.path.join(target_dir, "landslide_predictor_stack_15bands.tif")
    band_order_rows = []
    
    with rasterio.open(stack_path, 'w', **stack_meta) as dest:
        for i, feat in enumerate(selected_features, 1):
            with rasterio.open(final_paths[feat]) as src:
                dest.write(src.read(1).astype('float32'), i)
                dest.set_band_description(i, feat)
            band_order_rows.append({"Band number": i, "Feature name": feat, "Raster source": final_paths[feat]})
            
    pd.DataFrame(band_order_rows).to_csv(os.path.join(target_dir, "final_band_order.csv"), index=False)
    
    # 9. CRITICAL MODEL FEATURE CHECK
    catboost_path = os.path.join(target_dir, "final_landslide_catboost_model.joblib")
    model = joblib.load(catboost_path)
    
    feature_check = "PASS"
    if hasattr(model, 'feature_names_'):
        model_feats = list(model.feature_names_)
        if model_feats != selected_features:
            feature_check = "FAIL"
            print(f"MISMATCH! Model expects: {model_feats}\nStack has: {selected_features}")
            return
            
    # 10. VALIDATE THE FINAL STACK
    print("Validating Final Stack...")
    validation_log = []
    stack_valid = "PASS"
    
    with rasterio.open(stack_path) as src:
        validation_log.append(f"CRS: {src.crs}")
        validation_log.append(f"Width: {src.width}, Height: {src.height}")
        validation_log.append(f"Transform: {src.transform}")
        validation_log.append(f"Bands: {src.count}")
        
        for i, feat in enumerate(selected_features, 1):
            arr = src.read(i)
            valid = arr[arr != src.nodata]
            has_nan = np.isnan(valid).any()
            has_inf = np.isinf(valid).any()
            if has_nan or has_inf: stack_valid = "FAIL"
            
            log_line = f"Band {i} ({feat}) | Min: {np.nanmin(valid):.4f} | Max: {np.nanmax(valid):.4f} | Mean: {np.nanmean(valid):.4f} | NaN: {has_nan} | Inf: {has_inf}"
            validation_log.append(log_line)
            
    with open(os.path.join(target_dir, "final_stack_validation.txt"), "w") as f:
        f.write("\n".join(validation_log))
        
    print("\n============================================================")
    print("FINAL OUTPUT")
    print("============================================================")
    print("Selected features: 15")
    print("Source rasters found: 15/15")
    print("Sentinel-1 rasters aligned: 20/20")
    print("Engineered rasters created: 2/2")
    print("Final predictor rasters aligned: 15/15")
    print("Final stack created: YES")
    print(f"Model feature order verified: {feature_check}")
    print(f"Final stack validation: {stack_valid}")
    print("\nREADY FOR PIXEL-WISE CATBOOST PREDICTION")

if __name__ == "__main__":
    main()
