# Troubleshooting

## Missing Rasters or Models
If the ML service throws errors about missing files, verify that `Processing/`, `models/`, and `sentinel/` directories are present and you have updated your `.env` paths or `PROJECT_ROOT` environment variable.

## MongoDB Connection Problems
Ensure your IP is whitelisted on MongoDB Atlas or your local MongoDB is running on port 27017.

## Python Service Problems
Ensure GDAL and rasterio are correctly installed on Windows, which often requires binary wheels from Christoph Gohlke's repository.
