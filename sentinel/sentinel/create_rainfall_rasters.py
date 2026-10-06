import os
import numpy as np
import pandas as pd
import rasterio
from scipy.interpolate import griddata

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

target_dir = os.path.join("taking_feature")
maps_dir = os.path.join(target_dir, "maps")
out_dir = os.path.join("taking_feature", "rainfall_dynamic")

# Baseline susceptibility grid as reference
ref_path = os.path.join(maps_dir, "landslide_susceptibility_probability.tif")

with rasterio.open(ref_path) as ref_src:
    ref_meta = ref_src.meta.copy()
    ref_width = ref_src.width
    ref_height = ref_src.height
    ref_transform = ref_src.transform
    ref_crs = ref_src.crs

# Load rainfall point data
df = pd.read_csv(os.path.join(out_dir, "rainfall_grid_data.csv"))
# It might have missing values or empty, let's check
if len(df) == 0:
    print("Error: No rainfall data fetched.")
    exit(1)

points = df[['lon', 'lat']].values

# We need to generate the target grid points for interpolation.
# Generating a full 682M point grid in memory for scipy.interpolate.griddata will crash RAM.
# We must do it in blocks.

def interpolate_feature_to_raster(feature_name, out_path):
    print(f"Interpolating {feature_name}...")
    values = df[feature_name].values
    
    # We will use linear interpolation or nearest neighbor
    # But doing it in blocks
    meta = ref_meta.copy()
    meta.update(dtype='float32', nodata=-9999.0)
    
    with rasterio.open(out_path, 'w', **meta) as dst:
        tile_size = 1024
        for row in range(0, ref_height, tile_size):
            for col in range(0, ref_width, tile_size):
                window = rasterio.windows.Window(col, row, min(tile_size, ref_width - col), min(tile_size, ref_height - row))
                
                # Get the coordinates for this block
                cols, rows = np.meshgrid(
                    np.arange(window.col_off, window.col_off + window.width),
                    np.arange(window.row_off, window.row_off + window.height)
                )
                
                # Convert pixel coordinates to geographic coordinates
                xs, ys = rasterio.transform.xy(ref_transform, rows.flatten(), cols.flatten())
                grid_points = np.column_stack((xs, ys))
                
                # Interpolate using nearest neighbor for performance and robustness on edges
                # (Linear can yield NaNs outside the convex hull of the input points)
                interpolated = griddata(points, values, grid_points, method='nearest')
                
                dst.write(interpolated.reshape((window.height, window.width)).astype(np.float32), 1, window=window)

# Generate interpolated rasters
features_to_interpolate = ["R_24h", "R_3d", "R_7d", "R_14d", "R_30d", "F_24h", "F_72h"]
for feat in features_to_interpolate:
    out_path = os.path.join(out_dir, f"{feat}.tif")
    interpolate_feature_to_raster(feat, out_path)

print("Rainfall interpolation complete.")
