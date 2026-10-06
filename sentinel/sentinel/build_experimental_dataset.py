import os
import pandas as pd
import geopandas as gpd

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

feature_dir = os.path.join("taking_feature")
final_csv = os.path.join(feature_dir, "landslide_final_training_data.csv")
points_gpkg = os.path.join("training_points.gpkg")
out_csv = os.path.join(feature_dir, "landslide_experimental_data.csv")

print("Loading final training data...")
df = pd.read_csv(final_csv)

print("Loading points geopackage...")
gdf = gpd.read_file(points_gpkg)
gdf['latitude'] = gdf['geometry'].y
gdf['longitude'] = gdf['geometry'].x

# We will merge on the geographic features which are highly precise floats
merge_cols = ['dem', 'slope', 'aspect', 'tri', 'tpi', 'rainfall']

# Round slightly to handle floating point precision differences if any (e.g., 6 decimals)
for col in merge_cols:
    df[col] = df[col].round(5)
    gdf[col] = gdf[col].round(5)

# Keep only necessary columns from gdf to avoid duplication
gdf_sub = gdf[merge_cols + ['latitude', 'longitude']].drop_duplicates(subset=merge_cols)

merged_df = pd.merge(df, gdf_sub, on=merge_cols, how='inner')

print(f"Original df rows: {len(df)}")
print(f"Merged df rows: {len(merged_df)}")

if len(merged_df) >= len(df) * 0.95: # if at least 95% match
    merged_df.to_csv(out_csv, index=False)
    print(f"Saved experimental dataset to {out_csv}")
else:
    print("Error: Could not join majority of rows based on terrain features.")
