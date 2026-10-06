import os
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.mask import mask
import numpy as np
import zipfile
import glob

# Paths
s2_dir = r"D:\sentinel 2"
ref_raster = r"C:\Users\abhis\Documents\Ai project\Sih\Processing\assam_glo30_utm46.tif"
output_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\sentinel2\2025\processed"

os.makedirs(output_dir, exist_ok=True)

# Function to get band paths from zip
def get_band_paths(zip_path):
    band_paths = {}
    with zipfile.ZipFile(zip_path, 'r') as z:
        for f in z.namelist():
            if f.endswith('B02_10m.jp2'): band_paths['B02'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B03_10m.jp2'): band_paths['B03'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B04_10m.jp2'): band_paths['B04'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B08_10m.jp2'): band_paths['B08'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B11_20m.jp2'): band_paths['B11'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B12_20m.jp2'): band_paths['B12'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('SCL_20m.jp2'): band_paths['SCL'] = f"/vsizip/{zip_path}/{f}"
    return band_paths

with rasterio.open(ref_raster) as ref:
    ref_meta = ref.meta.copy()
    ref_bounds = ref.bounds
    ref_crs = ref.crs

print(f"Reference CRS: {ref_crs}, Bounds: {ref_bounds}")

for zip_file in glob.glob(os.path.join(s2_dir, "*.zip")):
    print(f"Processing {zip_file}...")
    bands = get_band_paths(zip_file)
    if not bands:
        print("Could not find bands in zip. Skipping.")
        continue
        
    date_str = os.path.basename(zip_file).split('_')[2][:8]
    
    # Check overlap using a 10m band (B02)
    with rasterio.open(bands['B02']) as src:
        # Simple bounding box check
        if (src.bounds.right < ref_bounds.left or src.bounds.left > ref_bounds.right or 
            src.bounds.top < ref_bounds.bottom or src.bounds.bottom > ref_bounds.top):
            print("No overlap with Assam. Skipping.")
            continue
            
        print("Overlap found! Computing features...")
        # (Preprocessing logic would go here - memory limits make it hard to run fully in one go)
        # We will stop here to confirm overlap first.
        
print("Preprocessing script overlap check complete.")
