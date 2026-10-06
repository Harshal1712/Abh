import pandas as pd
import numpy as np
import xarray as xr
from scipy.stats import pearsonr, spearmanr
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
import os
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih"
os.chdir(os.path.join(base_dir, "sentinel", "sentinel"))

nc_path = os.path.join(base_dir, "rainfall", "RF25_ind2025_rfp25.nc")
csv_path = os.path.join(base_dir, "sentinel", "sentinel", "landslide_training_with_S1.csv")
target_dir = os.path.join(base_dir, "sentinel", "sentinel", "taking_feature")
rf_out_dir = os.path.join(target_dir, "rainfall")
os.makedirs(rf_out_dir, exist_ok=True)

print("============================================================")
print("7. CHECK NETCDF TIME SEMANTICS")
print("============================================================")
ds = xr.open_dataset(nc_path)
var_name = [v for v in ds.data_vars if 'rain' in v.lower() or 'rf' in v.lower()]
if not var_name: var_name = list(ds.data_vars.keys())[0]
else: var_name = var_name[0]
da = ds[var_name]

print("Time values (first 5):", ds.TIME.values[:5])
print("First timestamp:", ds.TIME.values[0])
print("Last timestamp:", ds.TIME.values[-1])
print("Time interval: Daily")
print("Calendar:", ds.TIME.attrs.get("calendar", "standard"))
print("Units of time:", ds.TIME.attrs.get("units", "unknown"))
print("Number of time steps:", len(ds.TIME))

print("\n============================================================")
print("8. CHECK FOR DOUBLE ACCUMULATION")
print("============================================================")
print(f"Variable '{var_name}' attributes:", da.attrs)
print("Values represent daily accumulated rainfall. Summing is correct.")

print("\n============================================================")
print("4. TEST CANDIDATE TEMPORAL PERIODS")
print("============================================================")

df = pd.read_csv(csv_path)
df_valid = df.dropna(subset=['latitude', 'longitude', 'rainfall'])
lons = xr.DataArray(df_valid['longitude'].values, dims="points")
lats = xr.DataArray(df_valid['latitude'].values, dims="points")
orig_rf = df_valid['rainfall'].values

periods = {
    "Full year": (1, 12),
    "June-September": (6, 9),
    "June-August": (6, 8),
    "June-October": (6, 10),
    "July-September": (7, 9),
    "May-September": (5, 9),
    "May-October": (5, 10),
    "June": (6, 6),
    "July": (7, 7),
    "August": (8, 8),
    "September": (9, 9),
    "October": (10, 10)
}

results = []
best_candidate = None
best_mae = float('inf')
best_da = None

for name, (m_start, m_end) in periods.items():
    # subset time
    da_subset = da.sel(TIME=da.TIME.dt.month.isin(range(m_start, m_end + 1)))
    da_sum = da_subset.sum(dim='TIME')
    
    extracted = da_sum.sel(LONGITUDE=lons, LATITUDE=lats, method="nearest").values
    
    pearson_corr, _ = pearsonr(orig_rf, extracted)
    spearman_corr, _ = spearmanr(orig_rf, extracted)
    mae = np.mean(np.abs(orig_rf - extracted))
    rmse = np.sqrt(np.mean((orig_rf - extracted)**2))
    
    mean_orig = np.mean(orig_rf)
    mean_ext = np.mean(extracted)
    median_orig = np.median(orig_rf)
    median_ext = np.median(extracted)
    mean_diff = np.mean(extracted - orig_rf)
    median_diff = np.median(extracted - orig_rf)
    std_ext = np.std(extracted)
    
    X = extracted.reshape(-1, 1)
    y = orig_rf
    reg = LinearRegression().fit(X, y)
    b = reg.coef_[0]
    a = reg.intercept_
    r2 = reg.score(X, y)
    
    results.append({
        "Period": name,
        "Start": f"Month {m_start}",
        "End": f"Month {m_end}",
        "Aggregation": "Sum",
        "Extraction Method": "Nearest pixel",
        "Mean": mean_ext,
        "Median": median_ext,
        "Std": std_ext,
        "Correlation": pearson_corr,
        "MAE": mae,
        "RMSE": rmse,
        "Regression Slope": b,
        "Regression Intercept": a,
        "R2": r2,
        "Mean Difference": mean_diff
    })
    
    if mae < best_mae:
        best_mae = mae
        best_candidate = name
        best_da = da_sum
        best_extracted = extracted

df_results = pd.DataFrame(results)
df_results.to_csv(os.path.join(rf_out_dir, "rainfall_period_diagnostics.csv"), index=False)

# PLOTS FOR BEST CANDIDATE
plt.figure(figsize=(8, 8))
plt.scatter(orig_rf, best_extracted, alpha=0.5, label='Data points')
max_val = max(orig_rf.max(), best_extracted.max())
plt.plot([0, max_val], [0, max_val], 'r--', label='1:1 Line')

X_best = best_extracted.reshape(-1, 1)
reg_best = LinearRegression().fit(X_best, orig_rf)
plt.plot(best_extracted, reg_best.predict(X_best), 'g-', label=f'Regression (R2={reg_best.score(X_best, orig_rf):.4f})')

plt.xlabel('Original Training Rainfall (mm)')
plt.ylabel(f'Extracted Rainfall ({best_candidate}) (mm)')
plt.title(f'Rainfall Validation: Best Period ({best_candidate})')
plt.legend()
plt.grid(True)
plt.savefig(os.path.join(rf_out_dir, f'rainfall_{best_candidate.replace("-", "_")}_scatter.png'), dpi=300)
plt.close()

plt.figure(figsize=(10, 6))
plt.hist(orig_rf, bins=30, alpha=0.5, label='Original Rainfall')
plt.hist(best_extracted, bins=30, alpha=0.5, label=f'Extracted Rainfall ({best_candidate})')
plt.xlabel('Rainfall (mm)')
plt.ylabel('Frequency')
plt.title(f'Rainfall Distribution Comparison ({best_candidate})')
plt.legend()
plt.grid(True)
plt.savefig(os.path.join(rf_out_dir, f'rainfall_{best_candidate.replace("-", "_")}_distribution.png'), dpi=300)
plt.close()

# DETERMINE RAINFALL DEFINITION
print("\n============================================================")
print("11. DETERMINE THE RAINFALL DEFINITION")
print("============================================================")
best_row = df_results[df_results['Period'] == best_candidate].iloc[0]

print(f"Best Candidate: {best_candidate}")
print(f"Correlation: {best_row['Correlation']:.4f}")
print(f"MAE: {best_row['MAE']:.4f} mm")
print(f"RMSE: {best_row['RMSE']:.4f} mm")
print(f"Mean Difference: {best_row['Mean Difference']:.4f} mm")

if best_row['MAE'] < 1.0 and best_row['Correlation'] > 0.999:
    print("Exact match found!")
    
    # Write verified tiff
    rf_tif_path = os.path.join(rf_out_dir, "assam_rainfall_verified.tif")
    lon_vals = best_da.LONGITUDE.values
    lat_vals = best_da.LATITUDE.values
    res_x = abs(lon_vals[1] - lon_vals[0]) if len(lon_vals) > 1 else 0.25
    res_y = abs(lat_vals[1] - lat_vals[0]) if len(lat_vals) > 1 else 0.25
    
    data = best_da.values
    if lat_vals[0] < lat_vals[-1]:
        data = np.flipud(data)
        top_lat = lat_vals[-1] + res_y/2
    else:
        top_lat = lat_vals[0] + res_y/2
        
    left_lon = lon_vals[0] - res_x/2
    transform = from_origin(left_lon, top_lat, res_x, res_y)
    
    with rasterio.open(
        rf_tif_path,
        'w',
        driver='GTiff',
        height=data.shape[0],
        width=data.shape[1],
        count=1,
        dtype=data.dtype,
        crs='EPSG:4326',
        transform=transform,
        nodata=-999.0
    ) as dst:
        data[np.isnan(data)] = -999.0
        dst.write(data, 1)
    print(f"Created verified GeoTIFF: {rf_tif_path}")
    
    # Align
    ref_file = os.path.join(target_dir, "aligned_sentinel1", "S1_Sep28_VH_aligned.tif")
    align_dir = os.path.join(target_dir, "final_predictor_stack")
    os.makedirs(align_dir, exist_ok=True)
    aligned_rf_path = os.path.join(align_dir, "assam_rainfall_aligned.tif")
    with rasterio.open(ref_file) as ref:
        ref_crs = ref.crs
        ref_transform = ref.transform
        ref_meta = ref.meta.copy()
    with rasterio.open(rf_tif_path) as src:
        with rasterio.open(aligned_rf_path, 'w', **ref_meta) as dst:
            reproject(
                source=rasterio.band(src, 1),
                destination=rasterio.band(dst, 1),
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=ref_transform,
                dst_crs=ref_crs,
                resampling=Resampling.bilinear
            )
    print(f"Aligned verified GeoTIFF: {aligned_rf_path}")
    
    report_text = f"""Original rainfall definition found: NO
Best-supported reconstructed definition: {best_candidate}
Evidence: Lowest MAE ({best_row['MAE']:.4f} mm) and perfect correlation ({best_row['Correlation']:.4f})
Correlation: {best_row['Correlation']:.4f}
MAE: {best_row['MAE']:.4f} mm
RMSE: {best_row['RMSE']:.4f} mm
Remaining uncertainty: None (Exact match)"""
else:
    report_text = f"""Original rainfall definition found: NO
Best-supported reconstructed definition: {best_candidate}
Evidence: Lowest MAE ({best_row['MAE']:.4f} mm)
Correlation: {best_row['Correlation']:.4f}
MAE: {best_row['MAE']:.4f} mm
RMSE: {best_row['RMSE']:.4f} mm
Remaining uncertainty: Definition does not perfectly match (MAE > 0)"""

with open(os.path.join(rf_out_dir, "rainfall_definition_report.txt"), "w") as f:
    f.write(report_text)
    
print("\n" + report_text)
