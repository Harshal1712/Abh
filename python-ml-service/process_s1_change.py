import os
import zipfile
import re
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.windows import Window
from datetime import datetime

def get_2026_zips(base_dir):
    zips = []
    for f in os.listdir(base_dir):
        if f.endswith('.zip'):
            match = re.search(r'S1A_IW_GRDH_1SDV_(\d{8})T', f)
            if match:
                date_str = match.group(1)
                date_obj = datetime.strptime(date_str, '%Y%m%d')
                zips.append((date_obj, os.path.join(base_dir, f)))
    zips.sort(key=lambda x: x[0])
    return zips

def get_measurement_tiffs(zip_path):
    try:
        z = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile:
        return None, None
    vv_tiff, vh_tiff = None, None
    for info in z.infolist():
        if 'measurement' in info.filename and info.filename.endswith('.tiff'):
            if '-vv-' in info.filename:
                vv_tiff = f"/vsizip/{zip_path}/{info.filename}"
            elif '-vh-' in info.filename:
                vh_tiff = f"/vsizip/{zip_path}/{info.filename}"
    return vv_tiff, vh_tiff

def get_valid_acquisitions(zips):
    valid = []
    for date_obj, zip_path in zips:
        vv, vh = get_measurement_tiffs(zip_path)
        if vv is not None and vh is not None:
            valid.append((date_obj, zip_path, vv, vh))
    return valid

def process_s1_change():
    workspace = os.environ.get("PROJECT_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    base_dir = os.path.join(workspace, "sentel", "2026")
    zips = get_2026_zips(base_dir)
    
    valid_acq = get_valid_acquisitions(zips)
    if len(valid_acq) < 2:
        print("Not enough valid acquisitions for change calculation.")
        return
        
    prev_date, prev_zip, prev_vv, prev_vh = valid_acq[-2]
    curr_date, curr_zip, curr_vv, curr_vh = valid_acq[-1]
    
    print(f"Current Acquisition: {curr_date.strftime('%Y-%m-%d')} ({curr_zip})")
    print(f"Previous Acquisition: {prev_date.strftime('%Y-%m-%d')} ({prev_zip})")
    
    target_raster = os.path.join(workspace, "Processing", "assam_slope_corrected.tif")
    out_raster = os.path.join(workspace, "Processing", "S1_SAR_Change.tif")
    
    with rasterio.open(target_raster) as tgt:
        tgt_profile = tgt.profile.copy()
        tgt_transform = tgt.transform
        tgt_crs = tgt.crs
        tgt_width = tgt.width
        tgt_height = tgt.height
        
    tgt_profile.update({
        'count': 2,
        'dtype': 'float32',
        'nodata': -9999.0,
        'compress': 'lzw',
        'tiled': True,
        'blockxsize': 512,
        'blockysize': 512
    })
    
    block_size = 1024
    
    with rasterio.open(out_raster, 'w', **tgt_profile) as dst:
        dst.update_tags(
            current_date=curr_date.strftime('%Y-%m-%d'),
            previous_date=prev_date.strftime('%Y-%m-%d'),
            metric="Sentinel-1 SAR Change",
            unit="VV, VH Amplitude Change"
        )
        
        with rasterio.open(curr_vv) as src_curr_vv, \
             rasterio.open(curr_vh) as src_curr_vh, \
             rasterio.open(prev_vv) as src_prev_vv, \
             rasterio.open(prev_vh) as src_prev_vh:
             
            for row in range(0, tgt_height, block_size):
                for col in range(0, tgt_width, block_size):
                    window = Window(col, row, min(block_size, tgt_width - col), min(block_size, tgt_height - row))
                    win_transform = rasterio.windows.transform(window, tgt_transform)
                    
                    tgt_curr_vv = np.full((window.height, window.width), np.nan, dtype='float32')
                    tgt_curr_vh = np.full((window.height, window.width), np.nan, dtype='float32')
                    tgt_prev_vv = np.full((window.height, window.width), np.nan, dtype='float32')
                    tgt_prev_vh = np.full((window.height, window.width), np.nan, dtype='float32')
                    
                    try:
                        reproject(
                            source=rasterio.band(src_curr_vv, 1),
                            destination=tgt_curr_vv,
                            src_transform=src_curr_vv.transform,
                            src_crs=src_curr_vv.crs,
                            src_gcps=src_curr_vv.gcps[0],
                            src_nodata=0,
                            dst_transform=win_transform,
                            dst_crs=tgt_crs,
                            dst_nodata=np.nan,
                            resampling=Resampling.bilinear
                        )
                    except rasterio.errors.RasterioError:
                        pass
                        
                    try:
                        reproject(
                            source=rasterio.band(src_curr_vh, 1),
                            destination=tgt_curr_vh,
                            src_transform=src_curr_vh.transform,
                            src_crs=src_curr_vh.crs,
                            src_gcps=src_curr_vh.gcps[0],
                            src_nodata=0,
                            dst_transform=win_transform,
                            dst_crs=tgt_crs,
                            dst_nodata=np.nan,
                            resampling=Resampling.bilinear
                        )
                    except rasterio.errors.RasterioError:
                        pass
                        
                    try:
                        reproject(
                            source=rasterio.band(src_prev_vv, 1),
                            destination=tgt_prev_vv,
                            src_transform=src_prev_vv.transform,
                            src_crs=src_prev_vv.crs,
                            src_gcps=src_prev_vv.gcps[0],
                            src_nodata=0,
                            dst_transform=win_transform,
                            dst_crs=tgt_crs,
                            dst_nodata=np.nan,
                            resampling=Resampling.bilinear
                        )
                    except rasterio.errors.RasterioError:
                        pass
                        
                    try:
                        reproject(
                            source=rasterio.band(src_prev_vh, 1),
                            destination=tgt_prev_vh,
                            src_transform=src_prev_vh.transform,
                            src_crs=src_prev_vh.crs,
                            src_gcps=src_prev_vh.gcps[0],
                            src_nodata=0,
                            dst_transform=win_transform,
                            dst_crs=tgt_crs,
                            dst_nodata=np.nan,
                            resampling=Resampling.bilinear
                        )
                    except rasterio.errors.RasterioError:
                        pass
                    
                    with np.errstate(divide='ignore', invalid='ignore'):
                        vv_change = tgt_curr_vv - tgt_prev_vv
                        vh_change = tgt_curr_vh - tgt_prev_vh
                        
                    vv_change[np.isnan(vv_change)] = -9999.0
                    vh_change[np.isnan(vh_change)] = -9999.0
                    
                    dst.write(vv_change, 1, window=window)
                    dst.write(vh_change, 2, window=window)

    print(f"Successfully created {out_raster}")

if __name__ == "__main__":
    process_s1_change()
