import os
import rasterio
import pandas as pd

def main():
    base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
    target_dir = os.path.join(base_dir, "taking_feature")
    
    dates_required = [
        "20250612", "20250624", "20250706", "20250718", "20250730", 
        "20250811", "20250823", "20250904", "20250916", "20250928"
    ]
    
    inventory = {d: {'Date': d, 'Product': '', 'VH_IMG': '', 'VH_HDR': '', 'VV_IMG': '', 'VV_HDR': '', 
                     'VH_exists': 'No', 'VV_exists': 'No', 'CRS': '', 'Width': '', 'Height': '', 
                     'Resolution': '', 'Bounds': '', 'Readable': False} 
                 for d in dates_required}
    
    print("Searching for Sentinel-1 .img files...")
    for root, dirs, files in os.walk(base_dir):
        if root.endswith(".data"):
            folder_name = os.path.basename(os.path.dirname(root))
            if folder_name.endswith(".data"): folder_name = folder_name[:-5] # handle .data.data ?
            # extract date from parent folder e.g., S1A_IW_GRDH_1SDV_20250916T...
            # The folder is typically named like S1A_..._20250916T...
            date_found = None
            for d in dates_required:
                if d in root or d in folder_name:
                    date_found = d
                    break
            
            if date_found:
                inventory[date_found]['Product'] = os.path.basename(root)
                for file in files:
                    if file == "Sigma0_VH.img":
                        inventory[date_found]['VH_IMG'] = os.path.join(root, file)
                        inventory[date_found]['VH_exists'] = 'Yes'
                    elif file == "Sigma0_VH.hdr":
                        inventory[date_found]['VH_HDR'] = os.path.join(root, file)
                    elif file == "Sigma0_VV.img":
                        inventory[date_found]['VV_IMG'] = os.path.join(root, file)
                        inventory[date_found]['VV_exists'] = 'Yes'
                    elif file == "Sigma0_VV.hdr":
                        inventory[date_found]['VV_HDR'] = os.path.join(root, file)
                        
    # Test Rasterio Access
    print("\nTesting Rasterio Access & Alignment...")
    align_refs = None
    alignment_pass = True
    readable_count = 0
    vh_found_count = 0
    vv_found_count = 0
    
    for d in dates_required:
        rec = inventory[d]
        if rec['VH_exists'] == 'Yes': vh_found_count += 1
        if rec['VV_exists'] == 'Yes': vv_found_count += 1
        
        test_file = rec['VH_IMG'] if rec['VH_exists'] == 'Yes' else (rec['VV_IMG'] if rec['VV_exists'] == 'Yes' else None)
        
        if test_file:
            try:
                with rasterio.open(test_file) as src:
                    rec['CRS'] = str(src.crs)
                    rec['Width'] = src.width
                    rec['Height'] = src.height
                    rec['Resolution'] = f"{src.res[0]}x{src.res[1]}"
                    rec['Bounds'] = f"{src.bounds.left},{src.bounds.bottom},{src.bounds.right},{src.bounds.top}"
                    rec['Readable'] = True
                    readable_count += 1
                    
                    if align_refs is None:
                        align_refs = {'CRS': rec['CRS'], 'Width': rec['Width'], 'Height': rec['Height'], 
                                      'Resolution': rec['Resolution'], 'Bounds': rec['Bounds']}
                    else:
                        if (align_refs['CRS'] != rec['CRS'] or align_refs['Width'] != rec['Width'] or 
                            align_refs['Height'] != rec['Height'] or align_refs['Resolution'] != rec['Resolution'] or
                            align_refs['Bounds'] != rec['Bounds']):
                            alignment_pass = False
                            
            except Exception as e:
                rec['CRS'] = "Error reading"
                print(f"Failed to read {test_file}: {e}")
                
    df_inv = pd.DataFrame(list(inventory.values()))
    df_inv.to_csv(os.path.join(target_dir, "sentinel1_source_inventory.csv"), index=False)
    
    # Task 4: Check actual training feature definitions
    df_sf = pd.read_csv(os.path.join(target_dir, "landslide_selected_features.csv"))
    selected_features = df_sf.iloc[:, 0].tolist()
    
    df_fe = pd.read_csv(os.path.join(target_dir, "feature_engineering_definition.csv"))
    req_engineered = [f for f in selected_features if f in df_fe['Feature'].values]
    
    dates_found = sum(1 for rec in inventory.values() if rec['VH_exists'] == 'Yes' or rec['VV_exists'] == 'Yes')
    dates_missing = 10 - dates_found
    
    print("\n============================================================")
    print("FINAL REPORT")
    print("============================================================")
    print("Sentinel-1 dates required: 10")
    print(f"Sentinel-1 dates found: {dates_found}")
    print(f"Sentinel-1 dates missing: {dates_missing}")
    print(f"VH rasters found: {vh_found_count}/10")
    print(f"VV rasters found: {vv_found_count}/10")
    print(f"Readable by rasterio: {readable_count}/10")
    
    if align_refs:
        print(f"\nCRS: {align_refs['CRS']}")
        print(f"Resolution: {align_refs['Resolution']}")
        print(f"Dimensions: {align_refs['Width']}x{align_refs['Height']}")
    else:
        print("\nCRS: N/A")
        print("Resolution: N/A")
        print("Dimensions: N/A")
        
    print(f"\nAlignment:\n{'PASS' if alignment_pass and dates_found>0 else 'FAIL'}")
    print("\nEngineered features required:")
    for feat in req_engineered:
        formula = df_fe[df_fe['Feature'] == feat]['Formula'].values[0]
        print(f"- {feat} ({formula})")
        
    print("\nSource raster inventory:\nCREATED")
    print("\nIMPORTANT:")
    print("Do NOT generate the susceptibility map yet.")
    print("Do NOT retrain CatBoost.")
    print("Do NOT modify the original Sentinel-1 files.")
    print("Do NOT download new Sentinel-1 data unless a required date is genuinely absent.")
    print("STOP after completing this verification.")

if __name__ == "__main__":
    main()
