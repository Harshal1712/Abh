import os
import json
import time
import requests
import numpy as np
import pandas as pd

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

out_dir = os.path.join("taking_feature", "rainfall_dynamic")
os.makedirs(out_dir, exist_ok=True)

# Bounding box of the susceptibility raster
lon_min, lon_max = 90.55, 93.42
lat_min, lat_max = 25.07, 27.00

# Create a 0.1 degree grid (approx 11km)
lons = np.arange(lon_min, lon_max + 0.1, 0.1)
lats = np.arange(lat_min, lat_max + 0.1, 0.1)

grid_points = []
for lat in lats:
    for lon in lons:
        grid_points.append({"lat": round(lat, 2), "lon": round(lon, 2)})

print(f"Total grid points: {len(grid_points)}")

results = []

# Open-Meteo accepts multiple coordinates in one request, up to 100 per request.
# Let's batch them.
batch_size = 50
for i in range(0, len(grid_points), batch_size):
    batch = grid_points[i:i+batch_size]
    
    lat_str = ",".join([str(p['lat']) for p in batch])
    lon_str = ",".join([str(p['lon']) for p in batch])
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat_str}&longitude={lon_str}&daily=precipitation_sum&timezone=auto&past_days=30&forecast_days=4"
    
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        if type(data) == list: # multiple locations return a list
            for idx, loc_data in enumerate(data):
                loc_data['grid_lat'] = batch[idx]['lat']
                loc_data['grid_lon'] = batch[idx]['lon']
                results.append(loc_data)
        else:
            # single location
            data['grid_lat'] = batch[0]['lat']
            data['grid_lon'] = batch[0]['lon']
            results.append(data)
    else:
        print(f"Error fetching batch {i}: {response.status_code}")
    
    time.sleep(1) # rate limit

# Process the data into aggregates
# We want: R_24h (yesterday), R_3d (last 3 days), R_7d, R_14d, R_30d
# And Forecast: F_24h (today), F_72h (today + next 2 days)

final_data = []

# Current date reference is "today" (index 30 if past_days=30)
# Open-meteo daily array: 30 past days + today + 3 forecast days = 34 days
# Let's dynamically find "today" from the dates
for res in results:
    dates = res['daily']['time']
    precip = res['daily']['precipitation_sum']
    
    # We will use the last valid past day as "current" if needed, 
    # but let's just find today's index
    # Open-Meteo includes today in both past_days and forecast_days based on time, but time array is monotonic
    import datetime
    today_str = datetime.date.today().isoformat()
    
    if today_str in dates:
        today_idx = dates.index(today_str)
    else:
        # fallback to index 30
        today_idx = 30
        
    def get_sum(start_idx, end_idx):
        vals = precip[start_idx:end_idx]
        vals = [v for v in vals if v is not None]
        return sum(vals) if vals else 0.0

    # Past aggregations (excluding today)
    r_24h = get_sum(today_idx - 1, today_idx)
    r_3d = get_sum(today_idx - 3, today_idx)
    r_7d = get_sum(today_idx - 7, today_idx)
    r_14d = get_sum(today_idx - 14, today_idx)
    r_30d = get_sum(today_idx - 30, today_idx)
    
    # Forecast aggregations (including today)
    f_24h = get_sum(today_idx, today_idx + 1)
    f_72h = get_sum(today_idx, today_idx + 3)
    
    final_data.append({
        "lat": res['grid_lat'],
        "lon": res['grid_lon'],
        "R_24h": r_24h,
        "R_3d": r_3d,
        "R_7d": r_7d,
        "R_14d": r_14d,
        "R_30d": r_30d,
        "F_24h": f_24h,
        "F_72h": f_72h
    })

df = pd.DataFrame(final_data)
out_csv = os.path.join(out_dir, "rainfall_grid_data.csv")
df.to_csv(out_csv, index=False)
print(f"Saved rainfall data to {out_csv}")
