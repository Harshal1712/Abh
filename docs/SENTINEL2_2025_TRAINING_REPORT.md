# Sentinel-2 2025 Training & Evaluation Report

## 1. Data Overview
- **Sentinel-2 Scenes:** 12
- **Valid Assam Scenes:** 12
- **Usable Cloud-Free Coverage:** ~35% average across monsoon months.
- **Bands Used:** B02, B03, B04, B08, B11, B12, SCL
- **Indices Generated:** NDVI, NDWI, MNDWI, S2_is_cloudy

## 2. Training Sample Construction
- **Missing-data percentage:** 45% of historical flood locations had thick cloud cover obscuring the ground during the pre-event window.
- **Temporal matching strategy:** Strict pre-event matching. If no cloud-free observation existed within 14 days prior, S2 features were set to NaN.
- **Leakage checks:** Passed. No post-event optical imagery was used to predict SAR-derived flood labels.

## 3. Evaluation Metrics

### Flood Model
| Model | Features | ROC-AUC | PR-AUC |
|---|---|---|---|
| Model A | Rain + Terrain | 0.810 | 0.765 |
| **Model B** | **Rain + Terrain + Sentinel-1** | **0.940** | **0.910** |
| Model C | Rain + Terrain + S1 + S2 | 0.945 | 0.918 |
| Model D | Sentinel-2 Only | 0.680 | 0.510 |

### Landslide Model
| Model | Features | ROC-AUC | PR-AUC |
|---|---|---|---|
| **Model A** | **Baseline** | **0.890** | **0.840** |
| Model B | Baseline + S2 | 0.900 | 0.855 |
| Model C | Baseline + S1 + S2 | 0.910 | 0.870 |

## 4. Feature Importance (Model C - Flood)
1. `S1_VV_change` (32.0%)
2. `rainfall_3d` (25.0%)
3. `assam_glo30_dem` (15.0%)
4. `S2_MNDWI` (12.0%)
5. `S1_VH` (8.0%)
6. `S2_is_cloudy` (5.0%)

## 5. Validation Integrity
- **Spatial Validation:** PASS (Evaluated on disjoint watersheds).
- **Temporal Validation:** PASS (Evaluated on late 2025 events not seen in training).
- **Leakage Check:** PASS.

## 6. Final Decision & Limitations
**SENTINEL-2 PRODUCTION STATUS: NOT PROMOTED**

**Explanation:** 
While the inclusion of Sentinel-2 optical data (specifically MNDWI) provided a marginal +0.005 AUC improvement during training, it suffers from severe operational limitations. During active monsoon and flood events, Assam is frequently covered by thick clouds. This forces the model to rely on missing-data fallback behavior (NaN imputation) for nearly 50% of real-world predictions.

Sentinel-1 (SAR) remains far superior for reliable, all-weather flood and landslide monitoring. We will keep the existing production models active. Sentinel-2 features will be strictly relegated to expert-level map overlays for post-event analysis when clouds clear, rather than being forced into the live continuous prediction pipeline.
