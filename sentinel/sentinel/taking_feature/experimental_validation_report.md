# Comprehensive Experimental Validation Report
## Executive Summary
This report details the execution and results of a 6-phase machine learning validation framework on the landslide susceptibility dataset.

## Phase 1: Data Integrity
- **Exact Duplicates:** 0
- **Near Duplicates (Feature match only):** 0
- **Missing Values:** 0
- **Feature Leakage Check (Correlation > 0.95):** 13 features flagged (S1_Jul06_VH, S1_Jul30_VH, S1_Aug11_VH, S1_Aug23_VH, S1_Sep04_VH, S1_Sep16_VH, S1_Jun24_VV, S1_Jul06_VV, S1_Jul18_VV, S1_Jul30_VV, S1_Aug11_VV, S1_Aug23_VV, S1_Sep16_VV)
- **Spatial Coordinate Leakage (Same coords, diff class):** 0 instances

## Phase 2: Feature Experiments
Evaluated using CatBoost with 5-fold cross-validation (ROC-AUC).
| Feature Set | ROC-AUC |
|-------------|---------|
| Terrain Only | 0.8865 ± 0.0264 |
| Rainfall Only | 0.7038 ± 0.1215 |
| Terrain + Rainfall | 0.8888 ± 0.0454 |
| Sentinel-1 Only | 0.5858 ± 0.0273 |
| Terrain + Sentinel-1 | 0.8766 ± 0.0408 |
| All Features | 0.8798 ± 0.0530 |

## Phase 3: Model Experiments
Comparing base models using all features (5-fold CV ROC-AUC).
| Model | ROC-AUC |
|-------|---------|
| CatBoost | 0.8798 ± 0.0530 |
| XGBoost | 0.8683 ± 0.0498 |
| LightGBM | 0.8782 ± 0.0496 |

## Phase 4: Trustworthiness Experiments
- **Monte Carlo CV (20 splits) ROC-AUC:** 0.9272
- **95% Bootstrap Confidence Interval:** [0.9250, 0.9295]
- **Top 3 Permutation Features:** tri, rainfall, dem

## Phase 5: Generalization Experiments
| Validation Method | ROC-AUC |
|-------------------|---------|
| Standard Random CV (5-Fold) | 0.9319 ± 0.0217 |
| Spatial Geographic CV (5-Fold) | nan ± nan |

*Analysis:* The model exhibits a spatial generalization gap of nan ROC-AUC when evaluated on geographically distinct holdout zones.

## Phase 6: Hybrid Experiments
Comparing base CatBoost against ensemble configurations.
| Model Strategy | ROC-AUC |
|----------------|---------|
| CatBoost (Baseline) | 0.9319 ± 0.0217 |
| Soft Voting Ensemble | 0.8771 ± 0.0533 |
| Stacking Classifier | 0.8493 ± 0.0286 |

---
*Report generated automatically by the AI Experimental Framework.*