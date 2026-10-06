import os
import shutil
import glob

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
target_dir = os.path.join(base_dir, "taking_feature")

def get_free_space_gb():
    total, used, free = shutil.disk_usage("C:\\")
    return free / (1024**3)

free_space_before = get_free_space_gb()
files_deleted = 0
bytes_recovered = 0

# 1. Delete all files inside aligned_sentinel1 (only *_aligned.tif)
aligned_s1_dir = os.path.join(target_dir, "aligned_sentinel1")
if os.path.exists(aligned_s1_dir):
    for f in glob.glob(os.path.join(aligned_s1_dir, "*_aligned.tif")):
        sz = os.path.getsize(f)
        os.remove(f)
        files_deleted += 1
        bytes_recovered += sz

# 2. Delete temporary physical alignment files in final_predictor_stack (only *_aligned.tif)
final_stack_dir = os.path.join(target_dir, "final_predictor_stack")
if os.path.exists(final_stack_dir):
    for f in glob.glob(os.path.join(final_stack_dir, "*_aligned.tif")):
        sz = os.path.getsize(f)
        os.remove(f)
        files_deleted += 1
        bytes_recovered += sz

# 3. Delete OLD INCORRECT full-year rainfall raster
old_rainfall = os.path.join(target_dir, "rainfall", "assam_rainfall.tif")
if os.path.exists(old_rainfall):
    sz = os.path.getsize(old_rainfall)
    os.remove(old_rainfall)
    files_deleted += 1
    bytes_recovered += sz

# 4. Delete 0-byte failed TIFF files inside output_tif
output_tif_dir = os.path.join(base_dir, "output_tif")
if os.path.exists(output_tif_dir):
    for f in glob.glob(os.path.join(output_tif_dir, "*.tif")):
        if os.path.getsize(f) == 0:
            os.remove(f)
            files_deleted += 1

# 5. SPECIAL CASE - 586.64 MB FILE
special_file = os.path.join(output_tif_dir, "S1A_IW_GRDH_1SDV_20250612T115708_20250612T115733_059613_0766B8_EE55_Orb_Cal_Spk_TC.tif")
special_data_dir = os.path.join(base_dir, "output", "S1A_IW_GRDH_1SDV_20250612T115708_20250612T115733_059613_0766B8_EE55_Orb_Cal_Spk_TC.data")
if os.path.exists(special_file):
    req_files = ["Sigma0_VH.img", "Sigma0_VH.hdr", "Sigma0_VV.img", "Sigma0_VV.hdr"]
    all_exist = True
    for rf in req_files:
        if not os.path.exists(os.path.join(special_data_dir, rf)):
            all_exist = False
            break
            
    if all_exist:
        sz = os.path.getsize(special_file)
        os.remove(special_file)
        files_deleted += 1
        bytes_recovered += sz

# 6. Delete empty report
report_file = os.path.join(target_dir, "cleanup_report_before_deletion.txt")
if os.path.exists(report_file) and os.path.getsize(report_file) == 0:
    os.remove(report_file)
    files_deleted += 1

free_space_after = get_free_space_gb()

# Gather report data
print(f"Files deleted: {files_deleted}")
print(f"Space recovered: {bytes_recovered / (1024**3):.2f} GB")
print(f"C: drive free space BEFORE: {free_space_before:.2f} GB")
print(f"C: drive free space AFTER: {free_space_after:.2f} GB")

print("\nRemaining files in taking_feature/aligned_sentinel1/:")
rem_s1 = os.listdir(aligned_s1_dir) if os.path.exists(aligned_s1_dir) else []
for x in rem_s1: print(f" - {x}")

print("\nRemaining files in taking_feature/final_predictor_stack/:")
rem_stack = os.listdir(final_stack_dir) if os.path.exists(final_stack_dir) else []
for x in rem_stack: print(f" - {x}")

print("\nRemaining Sentinel-1 source .data folders:")
s1_out_dir = os.path.join(base_dir, "output")
if os.path.exists(s1_out_dir):
    data_folders = [d for d in os.listdir(s1_out_dir) if d.endswith(".data")]
    print(len(data_folders))
else:
    print("0")

print("\nRemaining verified rainfall files:")
rain_dir = os.path.join(target_dir, "rainfall")
if os.path.exists(rain_dir):
    for rf in os.listdir(rain_dir):
        print(f" - {rf}")

print("\nFINAL SAFETY CHECK")
checks = {
    "final_landslide_catboost_model.joblib": os.path.exists(os.path.join(target_dir, "final_landslide_catboost_model.joblib")),
    "landslide_selected_features.csv": os.path.exists(os.path.join(target_dir, "landslide_selected_features.csv")),
    "assam_rainfall_verified.tif": os.path.exists(os.path.join(rain_dir, "assam_rainfall_verified.tif")),
    "assam_rainfall_aligned.tif": os.path.exists(os.path.join(target_dir, "final_predictor_stack", "assam_rainfall_aligned.tif")) or os.path.exists(os.path.join(rain_dir, "assam_rainfall_aligned.tif")),
}

# Check all original S1 data products exist (by looking at taking_feature/sentinel1_source_inventory.csv)
s1_inv = os.path.join(target_dir, "sentinel1_source_inventory.csv")
s1_original_exist = True
if os.path.exists(s1_inv):
    import pandas as pd
    df = pd.read_csv(s1_inv)
    # Check if the listed files exist
    for idx, row in df.iterrows():
        # skip empty rows
        if pd.isna(row['VH_IMG']): continue
        if not os.path.exists(row['VH_IMG']):
            s1_original_exist = False
checks["Original Sentinel-1 .data products"] = s1_original_exist

checks["Original terrain rasters"] = all([
    os.path.exists(r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_glo30_dem.tif"),
    os.path.exists(r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_slope.tif"),
    os.path.exists(r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_aspect.tif"),
    os.path.exists(r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TRI.tif"),
    os.path.exists(r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_TPI.tif"),
])

for k, v in checks.items():
    print(f"{k} = {'EXISTS' if v else 'MISSING'}")

if all(checks.values()):
    print("\nCLEANUP COMPLETE -- SOURCE DATA PROTECTED.")
else:
    print("\nWARNING: SOME PROTECTED DATA IS MISSING.")
