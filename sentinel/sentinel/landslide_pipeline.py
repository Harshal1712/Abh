import os
import time
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, roc_curve, precision_recall_curve, balanced_accuracy_score
)
from sklearn.inspection import permutation_importance

import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier

warnings.filterwarnings('ignore')

# 16. OUTPUT DIRECTORY SETUP
BASE_DIR = r"C:\Users\abhis\Documents\Ai project\Sih\sentinel\sentinel"
OUTPUT_DIR = os.path.join(BASE_DIR, "model_results")
SUBDIRS = [
    "cleaned_data",
    "eda",
    "feature_selection",
    "models",
    "predictions",
    "plots",
    "reports"
]

for subdir in SUBDIRS:
    os.makedirs(os.path.join(OUTPUT_DIR, subdir), exist_ok=True)


def main():
    print("============================================================")
    print("1. LOAD AND VALIDATE DATA")
    print("============================================================")
    data_path = os.path.join(BASE_DIR, "landslide_training_clean.csv")
    df = pd.read_csv(data_path)
    
    print(f"Original shape: {df.shape}")
    
    # Authorized predictors
    terrain_rainfall = ["dem", "slope", "aspect", "tri", "tpi", "rainfall"]
    s1_vh = [f"S1_{date}_VH" for date in ["Jun12", "Jun24", "Jul06", "Jul18", "Jul30", "Aug11", "Aug23", "Sep04", "Sep16", "Sep28"]]
    s1_vv = [f"S1_{date}_VV" for date in ["Jun12", "Jun24", "Jul06", "Jul18", "Jul30", "Aug11", "Aug23", "Sep04", "Sep16", "Sep28"]]
    
    authorized_predictors = terrain_rainfall + s1_vh + s1_vv
    
    if "class" not in df.columns:
        raise ValueError("Target column 'class' not found!")
        
    df_filtered = df[authorized_predictors + ["class"]].copy()
    
    assert set(df_filtered["class"].unique()) <= {0, 1}, "Class contains values other than 0 and 1"
    
    print(f"Filtered shape (only authorized predictors + class): {df_filtered.shape}")
    print("Class distribution:")
    print(df_filtered['class'].value_counts())
    
    print("\n============================================================")
    print("2. DATA CLEANING")
    print("============================================================")
    initial_rows = len(df_filtered)
    df_filtered = df_filtered.drop_duplicates()
    dupes_removed = initial_rows - len(df_filtered)
    
    # Replace inf with nan
    df_filtered.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    # Check missing values
    missing_counts = df_filtered.isnull().sum()
    if missing_counts.sum() > 0:
        print("Missing values found, imputing with median for simplicity in this baseline.")
        df_filtered.fillna(df_filtered.median(), inplace=True)
    
    rows_removed = dupes_removed
    print(f"Removed {rows_removed} duplicate rows.")
    print(f"Cleaned shape: {df_filtered.shape}")
    
    clean_path = os.path.join(OUTPUT_DIR, "cleaned_data", "landslide_training_clean_verified.csv")
    df_filtered.to_csv(clean_path, index=False)
    
    print("\n============================================================")
    print("3. EXPLORATORY DATA ANALYSIS")
    print("============================================================")
    
    # 1. Class dist
    plt.figure()
    sns.countplot(x='class', data=df_filtered)
    plt.title("Class Distribution")
    plt.savefig(os.path.join(OUTPUT_DIR, "eda", "class_distribution.png"))
    plt.close()
    
    # 2. Desc stats
    desc_stats = df_filtered.describe()
    desc_stats.to_csv(os.path.join(OUTPUT_DIR, "eda", "descriptive_statistics.csv"))
    
    # 3. Correlation Matrix
    plt.figure(figsize=(16, 12))
    corr = df_filtered[authorized_predictors].corr()
    sns.heatmap(corr, cmap='coolwarm', annot=False)
    plt.title("Correlation Matrix of Predictors")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "eda", "correlation_matrix.png"))
    plt.close()
    
    # Find high correlations
    high_corr = []
    for i in range(len(corr.columns)):
        for j in range(i):
            if abs(corr.iloc[i, j]) > 0.8:
                high_corr.append((corr.columns[i], corr.columns[j], corr.iloc[i, j]))
    print(f"Found {len(high_corr)} pairs with >0.8 correlation. Tree models can handle this.")
    
    print("\n============================================================")
    print("4. FEATURE ENGINEERING")
    print("============================================================")
    num_original_predictors = len(authorized_predictors)
    
    # Temporal S1 Features
    df_filtered['VH_mean'] = df_filtered[s1_vh].mean(axis=1)
    df_filtered['VH_std'] = df_filtered[s1_vh].std(axis=1)
    df_filtered['VH_min'] = df_filtered[s1_vh].min(axis=1)
    df_filtered['VH_max'] = df_filtered[s1_vh].max(axis=1)
    df_filtered['VH_range'] = df_filtered['VH_max'] - df_filtered['VH_min']
    
    df_filtered['VV_mean'] = df_filtered[s1_vv].mean(axis=1)
    df_filtered['VV_std'] = df_filtered[s1_vv].std(axis=1)
    df_filtered['VV_min'] = df_filtered[s1_vv].min(axis=1)
    df_filtered['VV_max'] = df_filtered[s1_vv].max(axis=1)
    df_filtered['VV_range'] = df_filtered['VV_max'] - df_filtered['VV_min']
    
    # Changes
    df_filtered['VH_last_minus_first'] = df_filtered['S1_Sep28_VH'] - df_filtered['S1_Jun12_VH']
    df_filtered['VV_last_minus_first'] = df_filtered['S1_Sep28_VV'] - df_filtered['S1_Jun12_VV']
    
    aug_vh = ['S1_Aug11_VH', 'S1_Aug23_VH']
    aug_vv = ['S1_Aug11_VV', 'S1_Aug23_VV']
    sep_vh = ['S1_Sep04_VH', 'S1_Sep16_VH', 'S1_Sep28_VH']
    sep_vv = ['S1_Sep04_VV', 'S1_Sep16_VV', 'S1_Sep28_VV']
    
    df_filtered['VH_Aug_mean'] = df_filtered[aug_vh].mean(axis=1)
    df_filtered['VV_Aug_mean'] = df_filtered[aug_vv].mean(axis=1)
    df_filtered['VH_Sep_mean'] = df_filtered[sep_vh].mean(axis=1)
    df_filtered['VV_Sep_mean'] = df_filtered[sep_vv].mean(axis=1)
    
    engineered_features = [
        'VH_mean', 'VH_std', 'VH_min', 'VH_max', 'VH_range',
        'VV_mean', 'VV_std', 'VV_min', 'VV_max', 'VV_range',
        'VH_last_minus_first', 'VV_last_minus_first',
        'VH_Aug_mean', 'VV_Aug_mean', 'VH_Sep_mean', 'VV_Sep_mean'
    ]
    num_engineered = len(engineered_features)
    
    all_features = authorized_predictors + engineered_features
    
    print("\n============================================================")
    print("5. TRAIN/TEST SPLIT")
    print("============================================================")
    X = df_filtered[all_features]
    y = df_filtered['class']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    print(f"Training set: {X_train.shape}")
    print(f"Testing set: {X_test.shape}")
    
    print("\n============================================================")
    print("6. STANDARDIZATION")
    print("============================================================")
    print("Tree-based models (XGBoost, CatBoost, LightGBM) are scale-insensitive.")
    print("No standardization is performed.")
    
    print("\n============================================================")
    print("7. BASELINE MODELS")
    print("============================================================")
    models_baseline = {
        'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'),
        'CatBoost': CatBoostClassifier(random_state=42, verbose=0),
        'LightGBM': lgb.LGBMClassifier(random_state=42)
    }
    
    baseline_metrics = {}
    for name, model in models_baseline.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        baseline_metrics[name] = {
            'ROC-AUC': roc_auc_score(y_test, y_prob),
            'F1': f1_score(y_test, y_pred),
            'Accuracy': accuracy_score(y_test, y_pred)
        }
        print(f"Baseline {name} ROC-AUC: {baseline_metrics[name]['ROC-AUC']:.4f}")
    
    print("\n============================================================")
    print("8. FEATURE IMPORTANCE / FEATURE SELECTION")
    print("============================================================")
    imp_dict = {}
    
    # XGBoost
    xgb_imp = models_baseline['XGBoost'].feature_importances_
    imp_dict['XGBoost'] = xgb_imp / xgb_imp.max()
    
    # CatBoost
    cat_imp = models_baseline['CatBoost'].get_feature_importance()
    imp_dict['CatBoost'] = cat_imp / cat_imp.max()
    
    # LightGBM
    lgb_imp = models_baseline['LightGBM'].feature_importances_
    imp_dict['LightGBM'] = lgb_imp / lgb_imp.max()
    
    df_imp = pd.DataFrame({
        'Feature': all_features,
        'XGB_Norm': imp_dict['XGBoost'],
        'Cat_Norm': imp_dict['CatBoost'],
        'LGB_Norm': imp_dict['LightGBM']
    })
    
    df_imp['Mean_Norm_Imp'] = df_imp[['XGB_Norm', 'Cat_Norm', 'LGB_Norm']].mean(axis=1)
    df_imp = df_imp.sort_values(by='Mean_Norm_Imp', ascending=False).reset_index(drop=True)
    df_imp['Rank'] = df_imp.index + 1
    
    df_imp.to_csv(os.path.join(OUTPUT_DIR, "feature_selection", "feature_importance_all_models.csv"), index=False)
    
    # Select top 15 features
    top_k = 15
    selected_features = df_imp['Feature'].head(top_k).tolist()
    pd.Series(selected_features, name="Selected_Features").to_csv(
        os.path.join(OUTPUT_DIR, "feature_selection", "selected_features.csv"), index=False
    )
    with open(os.path.join(OUTPUT_DIR, "feature_selection", "selected_features.json"), "w") as f:
        json.dump(selected_features, f)
        
    print(f"Selected Top {top_k} Features based on mean normalized importance.")
    
    print("\n============================================================")
    print("9. RETRAIN MODELS USING SELECTED IMPORTANT FEATURES")
    print("============================================================")
    X_train_sel = X_train[selected_features]
    X_test_sel = X_test[selected_features]
    
    models_sel = {
        'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'),
        'CatBoost': CatBoostClassifier(random_state=42, verbose=0),
        'LightGBM': lgb.LGBMClassifier(random_state=42)
    }
    
    sel_metrics = {}
    for name, model in models_sel.items():
        model.fit(X_train_sel, y_train)
        y_pred = model.predict(X_test_sel)
        y_prob = model.predict_proba(X_test_sel)[:, 1]
        sel_metrics[name] = {
            'ROC-AUC': roc_auc_score(y_test, y_prob),
            'F1': f1_score(y_test, y_pred),
            'Accuracy': accuracy_score(y_test, y_pred)
        }
        print(f"Feature-Selected {name} ROC-AUC: {sel_metrics[name]['ROC-AUC']:.4f}")
    
    print("\n============================================================")
    print("10. MODERATE HYPERPARAMETER TUNING")
    print("============================================================")
    xgb_param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 5, 7],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'min_child_weight': [1, 3, 5],
        'subsample': [0.7, 0.8, 1.0],
        'colsample_bytree': [0.7, 0.8, 1.0]
    }
    
    cat_param_grid = {
        'iterations': [100, 200, 300],
        'depth': [4, 6, 8],
        'learning_rate': [0.01, 0.05, 0.1],
        'l2_leaf_reg': [1, 3, 5, 7],
        'random_strength': [0.1, 1, 10]
    }
    
    lgb_param_grid = {
        'n_estimators': [50, 100, 200],
        'num_leaves': [15, 31, 50],
        'max_depth': [-1, 5, 10],
        'learning_rate': [0.01, 0.05, 0.1],
        'min_child_samples': [10, 20, 30],
        'subsample': [0.7, 0.8, 1.0],
        'colsample_bytree': [0.7, 0.8, 1.0]
    }
    
    tuned_models = {}
    tuning_time = {}
    
    # Tune XGBoost
    start_t = time.time()
    xgb_rs = RandomizedSearchCV(xgb.XGBClassifier(random_state=42, eval_metric='logloss'), xgb_param_grid, n_iter=25, scoring='roc_auc', cv=5, random_state=42, n_jobs=2)
    xgb_rs.fit(X_train_sel, y_train)
    tuned_models['XGBoost'] = xgb_rs.best_estimator_
    tuning_time['XGBoost'] = time.time() - start_t
    print(f"XGBoost tuning time: {tuning_time['XGBoost']:.2f}s")
    
    # Tune CatBoost
    start_t = time.time()
    cat_rs = RandomizedSearchCV(CatBoostClassifier(random_state=42, verbose=0), cat_param_grid, n_iter=25, scoring='roc_auc', cv=5, random_state=42, n_jobs=2)
    cat_rs.fit(X_train_sel, y_train)
    tuned_models['CatBoost'] = cat_rs.best_estimator_
    tuning_time['CatBoost'] = time.time() - start_t
    print(f"CatBoost tuning time: {tuning_time['CatBoost']:.2f}s")
    
    # Tune LightGBM
    start_t = time.time()
    lgb_rs = RandomizedSearchCV(lgb.LGBMClassifier(random_state=42), lgb_param_grid, n_iter=25, scoring='roc_auc', cv=5, random_state=42, n_jobs=2)
    lgb_rs.fit(X_train_sel, y_train)
    tuned_models['LightGBM'] = lgb_rs.best_estimator_
    tuning_time['LightGBM'] = time.time() - start_t
    print(f"LightGBM tuning time: {tuning_time['LightGBM']:.2f}s")
    
    print("\n============================================================")
    print("11 & 12. FINAL MODEL EVALUATION & COMPARISON")
    print("============================================================")
    results = []
    
    plt.figure(figsize=(8,6))
    for name, model in tuned_models.items():
        y_pred = model.predict(X_test_sel)
        y_prob = model.predict_proba(X_test_sel)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        bal_acc = balanced_accuracy_score(y_test, y_pred)
        
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        specificity = tn / (tn + fp)
        sensitivity = tp / (tp + fn) # Same as recall
        
        results.append({
            'Model': name,
            'Feature Set': f'Top {top_k}',
            'Accuracy': acc,
            'Precision': prec,
            'Recall': rec,
            'F1': f1,
            'ROC-AUC': auc,
            'Sensitivity': sensitivity,
            'Specificity': specificity,
            'Balanced Accuracy': bal_acc,
            'Training Time': tuning_time[name]
        })
        
        # Plot CM
        plt.figure()
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f"{name} Confusion Matrix")
        plt.ylabel("Actual")
        plt.xlabel("Predicted")
        plt.savefig(os.path.join(OUTPUT_DIR, "plots", f"{name}_confusion_matrix.png"))
        plt.close()
        
    df_results = pd.DataFrame(results).sort_values(by='ROC-AUC', ascending=False)
    df_results.to_csv(os.path.join(OUTPUT_DIR, "reports", "final_model_comparison.csv"), index=False)
    
    print(df_results[['Model', 'ROC-AUC', 'F1', 'Accuracy']])
    
    print("\n============================================================")
    print("13. FEATURE IMPORTANCE OF FINAL MODELS")
    print("============================================================")
    
    final_imp_dict = {}
    
    xgb_f_imp = tuned_models['XGBoost'].feature_importances_
    cat_f_imp = tuned_models['CatBoost'].get_feature_importance()
    lgb_f_imp = tuned_models['LightGBM'].feature_importances_
    
    pd.DataFrame({'Feature': selected_features, 'Importance': xgb_f_imp}).sort_values('Importance', ascending=False).to_csv(os.path.join(OUTPUT_DIR, "models", "final_xgboost_feature_importance.csv"), index=False)
    pd.DataFrame({'Feature': selected_features, 'Importance': cat_f_imp}).sort_values('Importance', ascending=False).to_csv(os.path.join(OUTPUT_DIR, "models", "final_catboost_feature_importance.csv"), index=False)
    pd.DataFrame({'Feature': selected_features, 'Importance': lgb_f_imp}).sort_values('Importance', ascending=False).to_csv(os.path.join(OUTPUT_DIR, "models", "final_lightgbm_feature_importance.csv"), index=False)
    
    # Combined ranking
    df_final_imp = pd.DataFrame({
        'Feature': selected_features,
        'XGB': xgb_f_imp / xgb_f_imp.max(),
        'Cat': cat_f_imp / cat_f_imp.max(),
        'LGB': lgb_f_imp / lgb_f_imp.max()
    })
    df_final_imp['Mean_Norm'] = df_final_imp[['XGB', 'Cat', 'LGB']].mean(axis=1)
    df_final_imp = df_final_imp.sort_values(by='Mean_Norm', ascending=False)
    
    print("\nTop 5 Final Features:")
    print(df_final_imp[['Feature', 'Mean_Norm']].head(5))
    
    print("\n============================================================")
    print("14. SENTINEL-1 CONTRIBUTION EXPERIMENT")
    print("============================================================")
    
    X_train_A = X_train[terrain_rainfall]
    X_test_A = X_test[terrain_rainfall]
    
    X_train_B = X_train[all_features]
    X_test_B = X_test[all_features]
    
    exp_results = []
    
    # Model A (Terrain/Rainfall)
    for name, model in {'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'), 'CatBoost': CatBoostClassifier(random_state=42, verbose=0), 'LightGBM': lgb.LGBMClassifier(random_state=42)}.items():
        model.fit(X_train_A, y_train)
        y_prob = model.predict_proba(X_test_A)[:, 1]
        exp_results.append({'Model': name, 'Experiment': 'Model A (Terrain Only)', 'ROC-AUC': roc_auc_score(y_test, y_prob)})
        
    # Model B (All Features)
    for name, model in {'XGBoost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'), 'CatBoost': CatBoostClassifier(random_state=42, verbose=0), 'LightGBM': lgb.LGBMClassifier(random_state=42)}.items():
        model.fit(X_train_B, y_train)
        y_prob = model.predict_proba(X_test_B)[:, 1]
        exp_results.append({'Model': name, 'Experiment': 'Model B (With Sentinel-1)', 'ROC-AUC': roc_auc_score(y_test, y_prob)})
        
    df_exp = pd.DataFrame(exp_results)
    print("\nSentinel-1 Contribution (ROC-AUC):")
    print(df_exp.pivot(index='Model', columns='Experiment', values='ROC-AUC'))
    
    print("\n============================================================")
    print("15. SAVE MODELS")
    print("============================================================")
    joblib.dump(tuned_models['XGBoost'], os.path.join(OUTPUT_DIR, "models", "final_xgboost_model.joblib"))
    joblib.dump(tuned_models['CatBoost'], os.path.join(OUTPUT_DIR, "models", "final_catboost_model.joblib"))
    joblib.dump(tuned_models['LightGBM'], os.path.join(OUTPUT_DIR, "models", "final_lightgbm_model.joblib"))
    
    print("\n============================================================")
    print("17. FINAL REPORT")
    print("============================================================")
    best_model_name = df_results.iloc[0]['Model']
    best_auc = df_results.iloc[0]['ROC-AUC']
    best_f1 = df_results.iloc[0]['F1']
    best_acc = df_results.iloc[0]['Accuracy']
    best_rec = df_results.iloc[0]['Recall']
    
    s1_improved = df_exp[df_exp['Experiment'] == 'Model B (With Sentinel-1)']['ROC-AUC'].mean() > df_exp[df_exp['Experiment'] == 'Model A (Terrain Only)']['ROC-AUC'].mean()
    
    print(f"1. Dataset size: {df_filtered.shape[0]} rows (cleaned)")
    print(f"2. Number of original predictors: {num_original_predictors}")
    print(f"3. Number of engineered features: {num_engineered}")
    print(f"4. Number of selected features: {top_k}")
    print(f"5. Best model: {best_model_name}")
    print(f"6. Best ROC-AUC: {best_auc:.4f}")
    print(f"7. Best F1: {best_f1:.4f}")
    print(f"8. Best accuracy: {best_acc:.4f}")
    print(f"9. Best recall: {best_rec:.4f}")
    print(f"10. Most important features: {', '.join(df_final_imp['Feature'].head(5).tolist())}")
    print(f"11. Whether Sentinel-1 improved prediction: {'Yes' if s1_improved else 'No'}")
    
    # Untuned vs Tuned check for best model
    best_baseline = sel_metrics[best_model_name]['ROC-AUC']
    if best_auc > best_baseline:
        print(f"12 & 13. Tuning improved ROC-AUC from {best_baseline:.4f} to {best_auc:.4f}.")
    else:
        print(f"12 & 13. Tuning did NOT improve ROC-AUC (baseline: {best_baseline:.4f}, tuned: {best_auc:.4f}).")

if __name__ == "__main__":
    main()
