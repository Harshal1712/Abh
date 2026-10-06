import pandas as pd
import numpy as np
from catboost import CatBoostClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
import os
import joblib

in_dir = r"C:\Users\abhis\Documents\Ai project\Sih\data\v3"
model_out = r"C:\Users\abhis\Documents\Ai project\Sih\models\v3"
os.makedirs(model_out, exist_ok=True)

def evaluate_model(y_true, y_pred, y_prob, model_name):
    return {
        "model": model_name,
        "Accuracy": round(accuracy_score(y_true, y_pred), 4),
        "Precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "Recall": round(recall_score(y_true, y_pred), 4),
        "F1": round(f1_score(y_true, y_pred), 4),
        "ROC-AUC": round(roc_auc_score(y_true, y_prob), 4)
    }

# -------------------------
# LANDSLIDE TRAINING
# -------------------------
print("--- ADVANCED LANDSLIDE TRAINING ---")
l_csv = os.path.join(in_dir, "landslide_features_v3_advanced.csv")
if os.path.exists(l_csv):
    df_l = pd.read_csv(l_csv)
    y_l = df_l['class']
    
    # We use ALL available features including the new engineered ones (FE_...)
    drop_cols = ['class', 'latitude', 'longitude', 'S2_date', 'S2_prev_date']
    X_l = df_l.drop(columns=[c for c in drop_cols if c in df_l.columns]).fillna(0)
    
    X_train, X_test, y_train, y_test = train_test_split(X_l, y_l, test_size=0.2, random_state=42)
    
    models = []
    
    # CatBoost Baseline
    cb = CatBoostClassifier(iterations=200, verbose=0, random_seed=42)
    cb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, cb.predict(X_test), cb.predict_proba(X_test)[:, 1], "CatBoost"))
    
    # XGBoost
    xgb = XGBClassifier(n_estimators=200, random_state=42, use_label_encoder=False, eval_metric='logloss')
    xgb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, xgb.predict(X_test), xgb.predict_proba(X_test)[:, 1], "XGBoost"))
    
    # LightGBM
    lgb = LGBMClassifier(n_estimators=200, random_state=42)
    lgb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, lgb.predict(X_test), lgb.predict_proba(X_test)[:, 1], "LightGBM"))
    
    # Random Forest
    rf = RandomForestClassifier(n_estimators=200, random_state=42)
    rf.fit(X_train, y_train)
    models.append(evaluate_model(y_test, rf.predict(X_test), rf.predict_proba(X_test)[:, 1], "Random Forest"))
    
    # Voting Classifier
    vc = VotingClassifier(estimators=[('cb', cb), ('xgb', xgb), ('lgb', lgb)], voting='soft')
    vc.fit(X_train, y_train)
    models.append(evaluate_model(y_test, vc.predict(X_test), vc.predict_proba(X_test)[:, 1], "Ensemble (CB+XGB+LGB)"))
    
    df_res_l = pd.DataFrame(models)
    print(df_res_l.to_string(index=False))
    
    # Save the Voting Classifier
    joblib.dump(vc, os.path.join(model_out, "landslide_ensemble_v3.pkl"))

# -------------------------
# FLOOD TRAINING
# -------------------------
print("\n--- ADVANCED FLOOD TRAINING ---")
f_csv = os.path.join(in_dir, "flood_features_v3_advanced.csv")
if os.path.exists(f_csv):
    df_f = pd.read_csv(f_csv)
    y_f = df_f['flood_label']
    
    drop_cols = ['event_id', 'event_date', 'latitude', 'longitude', 'flood_label', 'label_status', 'label_source', 'label_sar_date', 'feature_sar_date', 'S2_date', 'S2_prev_date']
    X_f = df_f.drop(columns=[c for c in drop_cols if c in df_f.columns]).fillna(0)
    
    X_train, X_test, y_train, y_test = train_test_split(X_f, y_f, test_size=0.2, random_state=42)
    
    models = []
    
    # CatBoost Baseline
    cb = CatBoostClassifier(iterations=200, verbose=0, random_seed=42)
    cb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, cb.predict(X_test), cb.predict_proba(X_test)[:, 1], "CatBoost"))
    
    # XGBoost
    xgb = XGBClassifier(n_estimators=200, random_state=42, use_label_encoder=False, eval_metric='logloss')
    xgb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, xgb.predict(X_test), xgb.predict_proba(X_test)[:, 1], "XGBoost"))
    
    # LightGBM
    lgb = LGBMClassifier(n_estimators=200, random_state=42)
    lgb.fit(X_train, y_train)
    models.append(evaluate_model(y_test, lgb.predict(X_test), lgb.predict_proba(X_test)[:, 1], "LightGBM"))
    
    # Random Forest
    rf = RandomForestClassifier(n_estimators=200, random_state=42)
    rf.fit(X_train, y_train)
    models.append(evaluate_model(y_test, rf.predict(X_test), rf.predict_proba(X_test)[:, 1], "Random Forest"))
    
    # Voting Classifier
    vc = VotingClassifier(estimators=[('cb', cb), ('xgb', xgb), ('lgb', lgb)], voting='soft')
    vc.fit(X_train, y_train)
    models.append(evaluate_model(y_test, vc.predict(X_test), vc.predict_proba(X_test)[:, 1], "Ensemble (CB+XGB+LGB)"))
    
    df_res_f = pd.DataFrame(models)
    print(df_res_f.to_string(index=False))
    
    joblib.dump(vc, os.path.join(model_out, "flood_ensemble_v3.pkl"))
