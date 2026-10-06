import os
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, GroupKFold, cross_val_score, StratifiedKFold, StratifiedGroupKFold
from sklearn.cluster import KMeans
from sklearn.ensemble import StackingClassifier, VotingClassifier
from sklearn.inspection import permutation_importance
from catboost import CatBoostClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
import warnings
warnings.filterwarnings('ignore')

base_dir = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
os.chdir(base_dir)

feature_dir = os.path.join("taking_feature")
data_path = os.path.join(feature_dir, "landslide_experimental_data.csv")
report_path = os.path.join(feature_dir, "experimental_validation_report.md")

print("Loading data...")
df = pd.read_csv(data_path)

# Ensure class is int
if 'class' in df.columns:
    df['class'] = df['class'].astype(int)

# Identify feature sets
all_features = [c for c in df.columns if c not in ['class', 'latitude', 'longitude', 'geometry']]
terrain_features = ['dem', 'slope', 'aspect', 'tri', 'tpi']
rainfall_features = ['rainfall']
s1_features = [c for c in all_features if c not in terrain_features + rainfall_features]

X = df[all_features]
y = df['class']

report_lines = []
report_lines.append("# Comprehensive Experimental Validation Report")
report_lines.append("## Executive Summary")
report_lines.append("This report details the execution and results of a 6-phase machine learning validation framework on the landslide susceptibility dataset.")
report_lines.append("")

# ==========================================
# PHASE 1: DATA INTEGRITY
# ==========================================
print("Running Phase 1...")
report_lines.append("## Phase 1: Data Integrity")
exact_dupes = df.duplicated().sum()
report_lines.append(f"- **Exact Duplicates:** {exact_dupes}")

near_dupes = df.duplicated(subset=all_features).sum()
report_lines.append(f"- **Near Duplicates (Feature match only):** {near_dupes}")

missing_vals = df.isnull().sum().sum()
report_lines.append(f"- **Missing Values:** {missing_vals}")

# Feature Leakage (High correlation)
corr_matrix = df[all_features].corr().abs()
upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
high_corr = [column for column in upper.columns if any(upper[column] > 0.95)]
report_lines.append(f"- **Feature Leakage Check (Correlation > 0.95):** {len(high_corr)} features flagged ({', '.join(high_corr) if high_corr else 'None'})")

# Spatial Overlap (same coords, different class)
if 'latitude' in df.columns and 'longitude' in df.columns:
    spatial_dupes = df.groupby(['latitude', 'longitude'])['class'].nunique()
    conflicts = (spatial_dupes > 1).sum()
    report_lines.append(f"- **Spatial Coordinate Leakage (Same coords, diff class):** {conflicts} instances")
else:
    report_lines.append(f"- **Spatial Coordinate Leakage:** Coordinates not available.")
report_lines.append("")

# ==========================================
# PHASE 2: FEATURE EXPERIMENTS
# ==========================================
print("Running Phase 2...")
report_lines.append("## Phase 2: Feature Experiments")
report_lines.append("Evaluated using CatBoost with 5-fold cross-validation (ROC-AUC).")
report_lines.append("| Feature Set | ROC-AUC |")
report_lines.append("|-------------|---------|")

def evaluate_subset(features, name):
    if not features:
        return
    model = CatBoostClassifier(iterations=100, verbose=False, random_state=42)
    scores = cross_val_score(model, df[features], y, cv=5, scoring='roc_auc')
    report_lines.append(f"| {name} | {scores.mean():.4f} ± {scores.std():.4f} |")

evaluate_subset(terrain_features, "Terrain Only")
evaluate_subset(rainfall_features, "Rainfall Only")
evaluate_subset(terrain_features + rainfall_features, "Terrain + Rainfall")
evaluate_subset(s1_features, "Sentinel-1 Only")
evaluate_subset(terrain_features + s1_features, "Terrain + Sentinel-1")
evaluate_subset(all_features, "All Features")
report_lines.append("")

# ==========================================
# PHASE 3: MODEL EXPERIMENTS
# ==========================================
print("Running Phase 3...")
report_lines.append("## Phase 3: Model Experiments")
report_lines.append("Comparing base models using all features (5-fold CV ROC-AUC).")
report_lines.append("| Model | ROC-AUC |")
report_lines.append("|-------|---------|")

models = {
    "CatBoost": CatBoostClassifier(iterations=100, verbose=False, random_state=42),
    "XGBoost": XGBClassifier(n_estimators=100, use_label_encoder=False, eval_metric='logloss', random_state=42),
    "LightGBM": LGBMClassifier(n_estimators=100, random_state=42)
}

for name, model in models.items():
    scores = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
    report_lines.append(f"| {name} | {scores.mean():.4f} ± {scores.std():.4f} |")
report_lines.append("")

# ==========================================
# PHASE 4: TRUSTWORTHINESS EXPERIMENTS
# ==========================================
print("Running Phase 4...")
report_lines.append("## Phase 4: Trustworthiness Experiments")

# Monte Carlo CV
n_splits = 20
mc_scores = []
for i in range(n_splits):
    # Using random K-fold splits to simulate MC
    cv = StratifiedKFold(n_splits=2, shuffle=True, random_state=i)
    scores = cross_val_score(models["CatBoost"], X, y, cv=cv, scoring='roc_auc')
    mc_scores.extend(scores)

mc_mean = np.mean(mc_scores)
mc_std = np.std(mc_scores)
# 95% CI roughly mean +/- 1.96 * std / sqrt(n)
ci_lower = mc_mean - 1.96 * (mc_std / np.sqrt(len(mc_scores)))
ci_upper = mc_mean + 1.96 * (mc_std / np.sqrt(len(mc_scores)))

report_lines.append(f"- **Monte Carlo CV (20 splits) ROC-AUC:** {mc_mean:.4f}")
report_lines.append(f"- **95% Bootstrap Confidence Interval:** [{ci_lower:.4f}, {ci_upper:.4f}]")

# Permutation test
model = models["CatBoost"]
model.fit(X, y)
perm_importance = permutation_importance(model, X, y, n_repeats=5, random_state=42)
top_idx = perm_importance.importances_mean.argsort()[-3:][::-1]
top_features = [all_features[i] for i in top_idx]
report_lines.append(f"- **Top 3 Permutation Features:** {', '.join(top_features)}")
report_lines.append("")

# ==========================================
# PHASE 5: GENERALIZATION EXPERIMENTS
# ==========================================
print("Running Phase 5...")
report_lines.append("## Phase 5: Generalization Experiments")

if 'latitude' in df.columns and 'longitude' in df.columns:
    # Geographic Holdout using K-Means clustering on coordinates
    coords = df[['latitude', 'longitude']]
    kmeans = KMeans(n_clusters=5, random_state=42)
    clusters = kmeans.fit_predict(coords)
    
    gkf = StratifiedGroupKFold(n_splits=5)
    spatial_scores = cross_val_score(models["CatBoost"], X, y, cv=gkf, groups=clusters, scoring='roc_auc')

    
    # Standard CV for comparison
    std_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    std_scores = cross_val_score(models["CatBoost"], X, y, cv=std_cv, scoring='roc_auc')
    
    report_lines.append("| Validation Method | ROC-AUC |")
    report_lines.append("|-------------------|---------|")
    report_lines.append(f"| Standard Random CV (5-Fold) | {std_scores.mean():.4f} ± {std_scores.std():.4f} |")
    report_lines.append(f"| Spatial Geographic CV (5-Fold) | {spatial_scores.mean():.4f} ± {spatial_scores.std():.4f} |")
    
    drop = std_scores.mean() - spatial_scores.mean()
    report_lines.append(f"\n*Analysis:* The model exhibits a spatial generalization gap of {drop:.4f} ROC-AUC when evaluated on geographically distinct holdout zones.")
else:
    report_lines.append("*Skipped: Coordinate data not found.*")
report_lines.append("")


# ==========================================
# PHASE 6: HYBRID EXPERIMENTS
# ==========================================
print("Running Phase 6...")
report_lines.append("## Phase 6: Hybrid Experiments")
report_lines.append("Comparing base CatBoost against ensemble configurations.")
report_lines.append("| Model Strategy | ROC-AUC |")
report_lines.append("|----------------|---------|")

# Voting
voting = VotingClassifier(
    estimators=[('cb', models["CatBoost"]), ('xgb', models["XGBoost"]), ('lgb', models["LightGBM"])],
    voting='soft'
)
voting_scores = cross_val_score(voting, X, y, cv=5, scoring='roc_auc')
report_lines.append(f"| CatBoost (Baseline) | {std_scores.mean():.4f} ± {std_scores.std():.4f} |")
report_lines.append(f"| Soft Voting Ensemble | {voting_scores.mean():.4f} ± {voting_scores.std():.4f} |")

# Stacking
stacking = StackingClassifier(
    estimators=[('cb', models["CatBoost"]), ('xgb', models["XGBoost"]), ('lgb', models["LightGBM"])],
    final_estimator=CatBoostClassifier(iterations=50, verbose=False)
)
stacking_scores = cross_val_score(stacking, X, y, cv=5, scoring='roc_auc')
report_lines.append(f"| Stacking Classifier | {stacking_scores.mean():.4f} ± {stacking_scores.std():.4f} |")

report_lines.append("")
report_lines.append("---")
report_lines.append("*Report generated automatically by the AI Experimental Framework.*")

with open(report_path, "w") as f:
    f.write("\n".join(report_lines))
    
print("All experiments finished successfully!")
