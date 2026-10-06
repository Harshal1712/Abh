import os
import pandas as pd
import rasterio

def main():
    base_dir = r"C:\Users\abhis\Documents\Ai project\Sih"
    sentinel_dir = os.path.join(base_dir, "sentinel", "sentinel")
    target_dir = os.path.join(sentinel_dir, "taking_feature")
    
    # 1. READ SELECTED FEATURES
    sf_path = os.path.join(target_dir, "landslide_selected_features.csv")
    df_sf = pd.read_csv(sf_path)
    selected_features = df_sf.iloc[:, 0].tolist()
    
    terrain_vars = ['dem', 'slope', 'aspect', 'tri', 'tpi', 'rainfall']
    s1_dates = ["Jun12", "Jun24", "Jul06", "Jul18", "Jul30", "Aug11", "Aug23", "Sep04", "Sep16", "Sep28"]
    
    direct_features = []
    engineered_features = []
    
    for f in selected_features:
        if f in terrain_vars or f.startswith("S1_"):
            direct_features.append(f)
        else:
            engineered_features.append(f)
            
    # 2. INSPECT ALL S1 RASTERS
    all_s1_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if 'S1' in file and (file.endswith('.tif') or file.endswith('.img')) and 'test' not in file.lower() and 'aux' not in file.lower():
                all_s1_files.append(os.path.join(root, file))
                
    # 3. FEATURE ENGINEERING DEFINITIONS
    fe_defs = []
    for feat in engineered_features:
        if feat == 'VH_change':
            formula = "S1_Sep28_VH - S1_Jun12_VH"
            inputs = "S1_Sep28_VH, S1_Jun12_VH"
        elif feat == 'VV_change':
            formula = "S1_Sep28_VV - S1_Jun12_VV"
            inputs = "S1_Sep28_VV, S1_Jun12_VV"
        elif feat.endswith('_mean'):
            band = feat.split('_')[0]
            formula = f"mean({band} across 10 dates)"
            inputs = f"All 10 {band} dates"
        elif feat.endswith('_std'):
            band = feat.split('_')[0]
            formula = f"std({band} across 10 dates, ddof=1)"
            inputs = f"All 10 {band} dates"
        elif feat.endswith('_min'):
            band = feat.split('_')[0]
            formula = f"min({band} across 10 dates)"
            inputs = f"All 10 {band} dates"
        elif feat.endswith('_max'):
            band = feat.split('_')[0]
            formula = f"max({band} across 10 dates)"
            inputs = f"All 10 {band} dates"
        elif feat.endswith('_range'):
            band = feat.split('_')[0]
            formula = f"max({band}) - min({band})"
            inputs = f"All 10 {band} dates"
        else:
            formula = "Unknown"
            inputs = "Unknown"
            
        fe_defs.append({
            'Feature': feat,
            'Feature type': 'Engineered Sentinel-1',
            'Formula': formula,
            'Input rasters required': inputs,
            'Training implementation/source': 'pandas column-wise operations in landslide_model.py'
        })
    pd.DataFrame(fe_defs).to_csv(os.path.join(target_dir, "feature_engineering_definition.csv"), index=False)
    
    # 5. SOURCE RASTER INVENTORY
    required_s1 = set()
    for feat in direct_features:
        if feat.startswith("S1_"):
            required_s1.add(feat)
    for feat in engineered_features:
        if feat == 'VH_change':
            required_s1.add('S1_Sep28_VH')
            required_s1.add('S1_Jun12_VH')
        if feat == 'VV_change':
            required_s1.add('S1_Sep28_VV')
            required_s1.add('S1_Jun12_VV')
            
    source_inv = []
    missing_sources = 0
    for req in required_s1:
        # e.g., req = S1_Sep28_VH. We need a file matching Sep28 and VH.
        date_str = req.split('_')[1]
        band = req.split('_')[2]
        
        # map Jun12 to something like 20250612
        date_map = {
            "Jun12": "0612", "Jun24": "0624", "Jul06": "0706", "Jul18": "0718",
            "Jul30": "0730", "Aug11": "0811", "Aug23": "0823", "Sep04": "0904",
            "Sep16": "0916", "Sep28": "0928"
        }
        
        search_date = date_map.get(date_str, date_str)
        found = False
        raster_path = ""
        for f in all_s1_files:
            if search_date in f and band in f:
                found = True
                raster_path = f
                break
        
        source_inv.append({'Required Source': req, 'Found': found, 'Path': raster_path})
        if not found:
            missing_sources += 1
            
    pd.DataFrame(source_inv).to_csv(os.path.join(target_dir, "source_raster_inventory.csv"), index=False)
    
    # 7. RASTER PREPARATION PLAN
    plan = []
    for f in selected_features:
        if f in direct_features:
            if f in terrain_vars:
                plan.append(f"{f}\n→ direct\n→ {f}.tif\n→ None\n→ Must align to S1 grid\n→ Resample/Clip\n→ {f}_aligned.tif\n")
            else:
                plan.append(f"{f}\n→ direct\n→ {f} source\n→ None\n→ Base Grid\n→ None\n→ {f}_aligned.tif\n")
        else:
            formula = [d['Formula'] for d in fe_defs if d['Feature'] == f][0]
            plan.append(f"{f}\n→ engineered\n→ S1 source rasters\n→ {formula}\n→ Sources must be aligned\n→ Raster Math (band math)\n→ {f}_aligned.tif\n")
            
    with open(os.path.join(target_dir, "raster_preparation_plan.txt"), "w", encoding="utf-8") as f_out:
        f_out.write("\n".join(plan))
        
    print("\nSelected features:", len(selected_features))
    print("\nDirect raster features:", len(direct_features))
    print("Engineered Sentinel-1 features:", len(engineered_features))
    print("\nRequired source rasters:", len(required_s1))
    print("Missing source rasters:", missing_sources)
    print("Alignment status: FAIL")
    print("Feature engineering definitions: CREATED")
    print("Raster preparation plan: CREATED")
    print("\nNEXT STEP:")
    print("Create the missing engineered predictor rasters using exactly the same feature-engineering formulas used during model training, align all 15 predictor rasters to one common grid, validate them, and only then perform pixel-wise CatBoost prediction.")

if __name__ == "__main__":
    main()
