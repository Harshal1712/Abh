import os
import rasterio
import numpy as np
import zipfile
import glob
import traceback

s2_dir = r"D:\sentinel 2"
output_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\sentinel2\2025\processed"
os.makedirs(output_dir, exist_ok=True)

def get_band_paths(zip_path):
    band_paths = {}
    with zipfile.ZipFile(zip_path, 'r') as z:
        for f in z.namelist():
            if f.endswith('B02_10m.jp2'): band_paths['B02'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B03_10m.jp2'): band_paths['B03'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B04_10m.jp2'): band_paths['B04'] = f"/vsizip/{zip_path}/{f}"
            elif f.endswith('B08_10m.jp2'): band_paths['B08'] = f"/vsizip/{zip_path}/{f}"
    return band_paths

def process_tile(zip_file):
    bands = get_band_paths(zip_file)
    if not bands:
        print(f"Skipping {zip_file} - missing 10m bands.")
        return
        
    date_str = os.path.basename(zip_file).split('_')[2][:8]
    tile_id = os.path.basename(zip_file).split('_')[5]
    out_path = os.path.join(output_dir, f"S2_{tile_id}_{date_str}_NDVI_NDWI.tif")
    
    if os.path.exists(out_path):
        print(f"Skipping {out_path} - already exists.")
        return

    try:
        print(f"Processing {tile_id} for {date_str}...")
        
        # We process B03 (Green), B04 (Red), B08 (NIR) for NDVI and NDWI
        with rasterio.open(bands['B03']) as src3, \
             rasterio.open(bands['B04']) as src4, \
             rasterio.open(bands['B08']) as src8:
            
            meta = src8.meta.copy()
            meta.update(dtype=rasterio.float32, count=2, driver='GTiff', compress='lzw')
            
            # Read data using a decimation factor to avoid memory crash
            # Reading at 1/2 resolution (20m) to save RAM and disk space
            out_shape = (1, int(src8.height // 2), int(src8.width // 2))
            
            green = src3.read(out_shape=out_shape, resampling=rasterio.enums.Resampling.bilinear)[0].astype(np.float32)
            red = src4.read(out_shape=out_shape, resampling=rasterio.enums.Resampling.bilinear)[0].astype(np.float32)
            nir = src8.read(out_shape=out_shape, resampling=rasterio.enums.Resampling.bilinear)[0].astype(np.float32)
            
            # NDVI = (NIR - Red) / (NIR + Red)
            ndvi = np.where((nir + red) == 0., 0, (nir - red) / (nir + red))
            
            # NDWI = (Green - NIR) / (Green + NIR)
            ndwi = np.where((green + nir) == 0., 0, (green - nir) / (green + nir))
            
            # Update transform for new resolution
            transform = src8.transform * src8.transform.scale((src8.width / out_shape[2]), (src8.height / out_shape[1]))
            meta.update(transform=transform, height=out_shape[1], width=out_shape[2])
            
            with rasterio.open(out_path, 'w', **meta) as dst:
                dst.write(ndvi, 1)
                dst.write(ndwi, 2)
                dst.set_band_description(1, 'NDVI')
                dst.set_band_description(2, 'NDWI')
                
            print(f"Successfully saved {out_path}")
            
    except Exception as e:
        print(f"Error processing {zip_file}: {e}")
        traceback.print_exc()

zip_files = glob.glob(os.path.join(s2_dir, "*.zip"))
print(f"Found {len(zip_files)} ZIP files.")

for z in zip_files:
    process_tile(z)

print("Actual S2 processing completed!")
