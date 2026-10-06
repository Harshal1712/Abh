import os
import glob
import rasterio
from rasterio.warp import transform
import math
import numpy as np

S2_PROCESSED_DIR = r"C:\Users\abhis\Documents\Ai project\Sih\data\sentinel2\2025\processed"

def get_s2_at_location(latitude, longitude):
    s2_tiffs = glob.glob(os.path.join(S2_PROCESSED_DIR, "*.tif"))
    if not s2_tiffs:
        return {"available": False, "status": "No S2 data processed"}
        
    s2_tiffs.sort(key=lambda x: x.split('_')[3], reverse=True) # Sort by date descending
    
    for tiff in s2_tiffs:
        date_str = os.path.basename(tiff).split('_')[3]
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
        
        try:
            with rasterio.open(tiff) as src:
                xs, ys = transform('EPSG:4326', src.crs, [longitude], [latitude])
                if (src.bounds.left <= xs[0] <= src.bounds.right) and (src.bounds.bottom <= ys[0] <= src.bounds.top):
                    # Sample
                    gen = src.sample([(xs[0], ys[0])])
                    val = list(gen)[0]
                    ndvi = float(val[0])
                    ndwi = float(val[1])
                    
                    if math.isnan(ndvi) or math.isnan(ndwi) or (ndvi == 0 and ndwi == 0):
                        continue # Cloud masked out, keep searching earlier dates
                        
                    return {
                        "available": True,
                        "latest_date": formatted_date,
                        "cloudy": False,
                        "NDVI": round(ndvi, 3),
                        "NDWI": round(ndwi, 3),
                        "MNDWI": None # Not in this raster
                    }
        except:
            continue
            
    return {"available": False, "status": "Cloud covered or out of bounds for all dates"}
