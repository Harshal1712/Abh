import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import pearsonr, spearmanr
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
import xarray as xr
import os
import joblib

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

# 1. Load validation data
val_file = r"taking_feature\rainfall_validation.csv"
df = pd.read_csv(val_file)

original = df['Original']
extracted = df['Extracted']

# 2. Compute metrics
pearson_corr, _ = pearsonr(original, extracted)
spearman_corr, _ = spearmanr(original, extracted)
mae = mean_absolute_error(original, extracted)
rmse = np.sqrt(mean_squared_error(original, extracted))

mean_orig = original.mean()
mean_ext = extracted.mean()
median_orig = original.median()
median_ext = extracted.median()
std_orig = original.std()
std_ext = extracted.std()

diff = extracted - original
mean_diff = diff.mean()
median_diff = diff.median()
min_diff = diff.min()
max_diff = diff.max()

ratio = extracted / original
mean_ratio = ratio.mean()

# 3. Regression
X = extracted.values.reshape(-1, 1)
y = original.values
reg = LinearRegression().fit(X, y)
b = reg.coef_[0]
a = reg.intercept_
r2 = reg.score(X, y)

# 4. Scatter plot
plt.figure(figsize=(8, 8))
plt.scatter(original, extracted, alpha=0.5, label='Data points')
max_val = max(original.max(), extracted.max())
plt.plot([0, max_val], [0, max_val], 'r--', label='1:1 Line')
plt.xlabel('Original Training Rainfall (mm)')
plt.ylabel('Raster-Extracted Rainfall (mm)')
plt.title('Rainfall Validation: Original vs Extracted')
plt.legend()
plt.grid(True)
plt.savefig(r'taking_feature\rainfall\rainfall_validation_scatter.png', dpi=300)
plt.close()

# 5. Distribution plot
plt.figure(figsize=(10, 6))
plt.hist(original, bins=30, alpha=0.5, label='Original Rainfall')
plt.hist(extracted, bins=30, alpha=0.5, label='Extracted Rainfall')
plt.xlabel('Rainfall (mm)')
plt.ylabel('Frequency')
plt.title('Rainfall Distribution Comparison')
plt.legend()
plt.grid(True)
plt.savefig(r'taking_feature\rainfall\rainfall_distribution_comparison.png', dpi=300)
plt.close()

# 6. Investigate NetCDF
nc_file = r"C:\Users\abhis\Documents\Ai project\Sih\rainfall\RF25_ind2020_rfp25.nc"
ds = xr.open_dataset(nc_file)

print("=== NETCDF METADATA ===")
print("Data variables:", list(ds.data_vars))
if 'RAINFALL' in ds.data_vars:
    var = ds['RAINFALL']
    print("RAINFALL attrs:")
    for k, v in var.attrs.items():
        print(f"  {k}: {v}")
else:
    for vname in ds.data_vars:
        print(f"{vname} attrs:")
        for k, v in ds[vname].attrs.items():
            print(f"  {k}: {v}")

print("=== RAINFALL VALIDATION METRICS ===")
print(f"Correlation: {pearson_corr:.4f}")
print(f"Spearman Correlation: {spearman_corr:.4f}")
print(f"MAE: {mae:.4f} mm")
print(f"RMSE: {rmse:.4f} mm")
print(f"Mean original: {mean_orig:.4f}")
print(f"Mean extracted: {mean_ext:.4f}")
print(f"Median original: {median_orig:.4f}")
print(f"Median extracted: {median_ext:.4f}")
print(f"Std original: {std_orig:.4f}")
print(f"Std extracted: {std_ext:.4f}")
print(f"Mean diff: {mean_diff:.4f}")
print(f"Median diff: {median_diff:.4f}")
print(f"Min diff: {min_diff:.4f}")
print(f"Max diff: {max_diff:.4f}")
print(f"Mean ratio (ext/orig): {mean_ratio:.4f}")
print(f"Regression intercept (a): {a:.4f}")
print(f"Regression slope (b): {b:.4f}")
print(f"R²: {r2:.4f}")

