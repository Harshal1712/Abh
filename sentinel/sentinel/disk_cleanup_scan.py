import os
import shutil
import time

project_root = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
target_dir = os.path.join(project_root, "taking_feature")
report_path = os.path.join(target_dir, "cleanup_report_before_deletion.txt")

# 1. Protected exact paths
protected_exact = [
    os.path.join(target_dir, "final_landslide_catboost_model.joblib"),
    os.path.join(target_dir, "landslide_selected_features.csv"),
    os.path.join(target_dir, "landslide_final_training_data.csv"),
    os.path.join(target_dir, "landslide_model_comparison.csv"),
    os.path.join(target_dir, "rainfall", "assam_rainfall_verified.tif"),
    os.path.join(target_dir, "rainfall", "assam_rainfall_aligned.tif"),
    os.path.join(target_dir, "feature_engineering_definition.csv"),
    os.path.join(target_dir, "raster_inventory.csv"),
    os.path.join(target_dir, "sentinel1_source_inventory.csv"),
    os.path.join(target_dir, "raster_preparation_plan.txt"),
    os.path.join(target_dir, "rainfall_definition_report.txt"),
    os.path.join(target_dir, "rainfall_validation.csv")
]

# Protected dirs / patterns
protected_dirs = [
    os.path.join(target_dir, "rainfall"),
]

def is_protected(filepath):
    # Exact match
    if filepath in protected_exact:
        return True
    
    # In protected dir
    for pd in protected_dirs:
        if filepath.startswith(pd) and os.path.dirname(filepath) == pd:
            # specifically taking_feature/rainfall/
            if os.path.basename(filepath) in ["assam_rainfall_verified.tif", "assam_rainfall_aligned.tif"]:
                return True
            
    # Source Sentinel-1 products
    if ".data" in filepath and ("Sigma0_VH.img" in filepath or "Sigma0_VV.img" in filepath or "Sigma0_VH.hdr" in filepath or "Sigma0_VV.hdr" in filepath):
        return True
    
    # Do NOT delete original DEM, slope, aspect, TRI, TPI
    lower_path = filepath.lower()
    if r"ai project\sih\processing" in lower_path:
        return True # Actually they are outside sentinel/sentinel so won't be scanned, but just in case
        
    if "assam_glo30_dem" in lower_path or "assam_slope" in lower_path or "assam_aspect" in lower_path or "assam_tri" in lower_path or "assam_tpi" in lower_path:
        # Assuming original if outside taking_feature/final_predictor_stack
        if "final_predictor_stack" not in lower_path:
            return True
            
    # Final output of the current run
    if "landslide_susceptibility_probability.tif" in filepath or "landslide_susceptibility_class.tif" in filepath:
        return True

    return False

def categorize_file(filepath, size_bytes):
    is_prot = is_protected(filepath)
    is_intermediate = False
    is_safe_to_delete = False
    reason = ""
    
    fname = os.path.basename(filepath)
    lower_path = filepath.lower()
    
    if is_prot:
        return "Protected/Original", "NO", "Explicitly protected"
        
    # Check for temporary alignment files
    if "final_predictor_stack" in lower_path and fname.endswith("_aligned.tif"):
        is_intermediate = True
        is_safe_to_delete = True
        reason = "Temporary aligned raster from failed physical stack process"
        
    # Failed / incomplete predictor stack
    if fname == "landslide_predictor_stack_15bands.tif":
        is_intermediate = True
        is_safe_to_delete = True
        reason = "Incomplete/failed physical predictor stack"
        
    # Temporary VRTs
    if "taking_feature\\vrt" in lower_path:
        # Well, VRTs are tiny, maybe not > 500MB, but in case
        pass
        
    # Old full year rainfall
    if "rainfall" in lower_path and ("full_year" in fname or "assam_rainfall.tif" == fname):
        is_intermediate = True
        is_safe_to_delete = True
        reason = "Old incorrect full-year rainfall raster"
        
    # Check if it's a 0 byte file
    if size_bytes == 0:
        is_intermediate = True
        is_safe_to_delete = True
        reason = "0-byte empty/failed file"
        
    # If not explicitly marked as safe to delete, we lean towards NO unless we are sure
    if not is_safe_to_delete:
        if size_bytes > 500 * 1024 * 1024:
            if "output_tif" in lower_path or ".tif" in fname:
                # Might be a duplicate or intermediate
                is_intermediate = True
                is_safe_to_delete = True
                reason = "Large intermediate TIFF (likely duplicate or failed processing)"
        
    return ("Intermediate" if is_intermediate else "Unknown"), ("YES" if is_safe_to_delete else "NO"), reason


large_files = []
safe_delete_list = []
total_recoverable = 0

for root, dirs, files in os.walk(project_root):
    for f in files:
        filepath = os.path.join(root, f)
        try:
            sz = os.path.getsize(filepath)
            # Find files > 500 MB OR known temp files
            cat, safe, reason = categorize_file(filepath, sz)
            
            if sz > 500 * 1024 * 1024 or safe == "YES":
                mod_time = time.ctime(os.path.getmtime(filepath))
                large_files.append({
                    "path": filepath,
                    "size_mb": sz / (1024*1024),
                    "cat": cat,
                    "safe": safe,
                    "reason": reason,
                    "mod": mod_time
                })
                if safe == "YES":
                    safe_delete_list.append((filepath, sz / (1024*1024), reason))
                    total_recoverable += sz
                    
        except Exception as e:
            pass

# Sort large files
large_files.sort(key=lambda x: x['size_mb'], reverse=True)

# 6. Check Disk Space
total, used, free = shutil.disk_usage("C:\\")
total_gb = total / (1024**3)
used_gb = used / (1024**3)
free_gb = free / (1024**3)
recoverable_gb = total_recoverable / (1024**3)

# 7. Print report
print("============================================================")
print("DISK SPACE SUMMARY (C:)")
print("============================================================")
print(f"Total: {total_gb:.2f} GB")
print(f"Used:  {used_gb:.2f} GB")
print(f"Free:  {free_gb:.2f} GB")
print(f"\nPotential Recoverable Space: {recoverable_gb:.2f} GB\n")

print("============================================================")
print("PROTECTED FILES (Will NOT be deleted)")
print("============================================================")
for p in protected_exact:
    print(f"- {p}")
print("- All Sentinel-1 .img/.hdr original files")
print("- Original terrain rasters (DEM, slope, etc.)\n")

print("============================================================")
print("LARGE & TEMPORARY FILES INVENTORY")
print("============================================================")
for lf in large_files:
    print(f"Path: {lf['path']}")
    print(f"Size: {lf['size_mb']:.2f} MB")
    print(f"Category: {lf['cat']}")
    print(f"Last Modified: {lf['mod']}")
    print(f"Safe to delete: {lf['safe']} ({lf['reason']})")
    print("-" * 40)
    
print("Report generated successfully.")
