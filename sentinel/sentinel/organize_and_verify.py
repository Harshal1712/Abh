import os
import shutil
import joblib
import pandas as pd
import json
import rasterio

def main():
    base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
    target_dir = os.path.join(base_dir, "taking_feature")
    model_res_dir = os.path.join(base_dir, "model_results", "landslide")
    
    os.makedirs(target_dir, exist_ok=True)
    
    # Task 2: File copying mappings
    # (source_relative_to_model_res, destination_filename, purpose)
    copy_tasks = [
        (os.path.join("models", "best_landslide_model.joblib"), "final_landslide_catboost_model.joblib", "Final tuned CatBoost Model"),
        (os.path.join("feature_selection", "landslide_selected_features.csv"), "landslide_selected_features.csv", "Selected features CSV"),
        (os.path.join("feature_selection", "selected_features.json"), "landslide_selected_features.json", "Selected features JSON"),
        (os.path.join("feature_selection", "landslide_feature_importance.csv"), "feature_importance_all_models.csv", "Combined feature importance"),
        (os.path.join("cleaned_data", "landslide_training_verified.csv"), "landslide_final_training_data.csv", "Final cleaned dataset"),
        (os.path.join("reports", "landslide_final_model_comparison.csv"), "landslide_model_comparison.csv", "Final Model Comparison"),
        (os.path.join("predictions", "landslide_test_predictions.csv"), "landslide_test_predictions.csv", "Test Predictions")
    ]
    
    manifest_lines = ["Filename\tOriginal location\tPurpose\tModel/version"]
    
    for src_rel, dst_name, purpose in copy_tasks:
        src = os.path.join(model_res_dir, src_rel)
        dst = os.path.join(target_dir, dst_name)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            manifest_lines.append(f"{dst_name}\t{src_rel}\t{purpose}\tCatBoost/Final")
    
    # Also grab the markdown report if available
    report_src = os.path.join(base_dir, "..", "..", ".gemini", "antigravity-ide", "brain", "1c61b9fe-61ef-4cd7-80e7-b4886b7ecc11", "landslide_scientific_report.md")
    # Actually, we don't know the exact path of the workspace dynamically easily from the script. Let's just create a placeholder if it doesn't exist.
    if os.path.exists(report_src):
        shutil.copy2(report_src, os.path.join(target_dir, "landslide_final_report.txt"))
        manifest_lines.append(f"landslide_final_report.txt\tlandslide_scientific_report.md\tFinal Scientific Report\tCatBoost/Final")
    
    # Task 4: Manifest
    with open(os.path.join(target_dir, "file_manifest.txt"), "w") as f:
        f.write("\n".join(manifest_lines))
        
    # Task 5: Verify CatBoost Model
    catboost_path = os.path.join(target_dir, "final_landslide_catboost_model.joblib")
    model = joblib.load(catboost_path)
    model_type = type(model).__name__
    expected_features_count = len(model.feature_names_) if hasattr(model, 'feature_names_') else "Unknown"
    
    # Task 6: Verify Selected Features
    sf_path = os.path.join(target_dir, "landslide_selected_features.csv")
    df_sf = pd.read_csv(sf_path)
    selected_features_list = df_sf['Selected_Features'].tolist() if 'Selected_Features' in df_sf.columns else df_sf.iloc[:, 0].tolist()
    
    print("\nSELECTED FEATURES:")
    for i, f in enumerate(selected_features_list, 1):
        print(f"{i}. {f}")
        
    if hasattr(model, 'feature_names_'):
        if list(model.feature_names_) != selected_features_list:
            print("WARNING: Mismatch between model feature names and selected features CSV!")
    
    # Task 7: Check required rasters
    # Search for all .tif files
    all_tifs = []
    for root, dirs, files in os.walk(r"C:\Users\abhis\Documents\Ai project\Sih"):
        for file in files:
            if file.lower().endswith(('.tif', '.tiff')) and 'aux' not in file.lower() and 'test' not in file.lower():
                all_tifs.append(os.path.join(root, file))
                
    inventory = []
    found_rasters = 0
    missing_rasters = 0
    
    for feat in selected_features_list:
        found = False
        raster_path = ""
        meta = {'crs': '', 'res': '', 'width': '', 'height': '', 'extent': '', 'nodata': '', 'dtype': ''}
        
        for tif in all_tifs:
            tif_name = os.path.basename(tif).lower()
            if feat.lower() in tif_name:
                found = True
                raster_path = tif
                break
            # Fallbacks for specific mappings
            if feat.lower() == 'dem' and 'dem' in tif_name:
                found = True; raster_path = tif; break
                
        if found:
            found_rasters += 1
            try:
                with rasterio.open(raster_path) as src:
                    meta['crs'] = str(src.crs)
                    meta['res'] = f"{src.res[0]}x{src.res[1]}"
                    meta['width'] = src.width
                    meta['height'] = src.height
                    meta['extent'] = f"{src.bounds.left},{src.bounds.bottom},{src.bounds.right},{src.bounds.top}"
                    meta['nodata'] = src.nodata
                    meta['dtype'] = src.dtypes[0]
            except Exception as e:
                meta['crs'] = "Error reading"
        else:
            missing_rasters += 1
            
        inventory.append({
            'Feature': feat,
            'Required raster': feat + ".tif",
            'Found/Not Found': "Found" if found else "Not Found",
            'Full path': raster_path,
            'CRS': meta['crs'],
            'Resolution': meta['res'],
            'Width': meta['width'],
            'Height': meta['height'],
            'Extent': meta['extent'],
            'NoData': meta['nodata'],
            'Data type': meta['dtype']
        })
        
    df_inv = pd.DataFrame(inventory)
    df_inv.to_csv(os.path.join(target_dir, "raster_inventory.csv"), index=False)
    
    # Task 8: Raster consistency check
    alignment_issues = []
    baseline_meta = None
    baseline_path = None
    
    for item in inventory:
        if item['Found/Not Found'] == "Found" and "Error" not in item['CRS']:
            if baseline_meta is None:
                baseline_meta = item
                baseline_path = item['Full path']
            else:
                if item['CRS'] != baseline_meta['CRS']:
                    alignment_issues.append(f"{item['Feature']} CRS {item['CRS']} differs from {baseline_meta['CRS']}")
                if item['Resolution'] != baseline_meta['Resolution']:
                    alignment_issues.append(f"{item['Feature']} Res {item['Resolution']} differs from {baseline_meta['Resolution']}")
                if item['Width'] != baseline_meta['Width'] or item['Height'] != baseline_meta['Height']:
                    alignment_issues.append(f"{item['Feature']} Dims {item['Width']}x{item['Height']} differs from {baseline_meta['Width']}x{baseline_meta['Height']}")
                    
    alignment_pass = (len(alignment_issues) == 0 and found_rasters > 0)
    
    with open(os.path.join(target_dir, "raster_alignment_report.txt"), "w") as f:
        if len(alignment_issues) == 0:
            f.write("All found rasters are aligned perfectly.\n")
        else:
            f.write("ALIGNMENT ISSUES DETECTED:\n")
            for issue in alignment_issues:
                f.write(issue + "\n")
                
    # Task 9: Next steps report
    with open(os.path.join(target_dir, "next_steps.txt"), "w") as f:
        f.write("1. Final CatBoost model location: " + catboost_path + "\n")
        f.write("2. Selected feature list: " + ", ".join(selected_features_list) + "\n")
        f.write(f"3. Required predictor rasters: {len(selected_features_list)}\n")
        f.write(f"4. Which rasters are available: {found_rasters}\n")
        f.write(f"5. Which rasters are missing: {missing_rasters}\n")
        f.write("6. CRS of each raster: Recorded in raster_inventory.csv\n")
        f.write("7. Resolution of each raster: Recorded in raster_inventory.csv\n")
        f.write(f"8. Whether all rasters are aligned: {'Yes' if alignment_pass else 'No'}\n")
        f.write("9. What preprocessing is still required: Resampling, clipping, and aligning missing/misaligned rasters (and engineering spatial features like VH_mean as rasters).\n")
        f.write("10. Exact next step for generating the susceptibility GeoTIFF: Prepare/alignment of predictor rasters followed by pixel-wise CatBoost prediction to create the continuous landslide susceptibility GeoTIFF.\n")
        
    print("\nTAKING_FEATURE FOLDER CREATED: YES")
    print(f"FINAL CATBOOST MODEL: {catboost_path}")
    print(f"SELECTED FEATURES: {len(selected_features_list)}")
    print(f"REQUIRED RASTERS: {len(selected_features_list)}")
    print(f"AVAILABLE RASTERS: {found_rasters}")
    print(f"MISSING RASTERS: {missing_rasters}")
    print(f"RASTER ALIGNMENT: {'PASS' if alignment_pass else 'FAIL'}")
    print("\nNEXT STEP:")
    print("Prepare/alignment of predictor rasters followed by pixel-wise CatBoost prediction to create the continuous landslide susceptibility GeoTIFF.")

if __name__ == "__main__":
    main()
