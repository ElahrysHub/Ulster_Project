"""
FastAPI backend for the SME Customer Segmentation & Recommendation dashboard.

Loads pre-computed artifacts produced by the Jupyter notebook (see ../notebook/
Section 10) at startup, then serves them over a REST API for the React frontend.

Run:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

Docs (auto-generated):
    http://localhost:8000/docs
"""
import json
import os
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ARTIFACT_DIR = os.environ.get("ARTIFACT_DIR", "../artifacts")


def load_json(name):
    with open(os.path.join(ARTIFACT_DIR, name)) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Load all artifacts once, at process startup (NOT per-request)
# ---------------------------------------------------------------------------
customers = load_json("customers.json")                          # {customer_id: {...}}
segment_summary = load_json("segment_summary.json")               # [{cluster, label, ...}]
cluster_label_map = load_json("cluster_label_map.json")           # {cluster_id: label}
association_rules_data = load_json("association_rules.json")      # [{antecedents, consequents, ...}]
product_catalogue = load_json("product_catalogue.json")           # {stock_code: description}
popularity_ranked = load_json("popularity_ranked.json")           # [{StockCode, Quantity, Description}]
customer_purchase_history = load_json("customer_purchase_history.json")  # {customer_id: [stock_codes]}
recommendation_evaluation = load_json("recommendation_evaluation.json")  # [{Model, Precision@5, ...}]

kmeans_model = joblib.load(os.path.join(ARTIFACT_DIR, "kmeans_model.joblib"))
rfm_scaler = joblib.load(os.path.join(ARTIFACT_DIR, "rfm_scaler.joblib"))
item_similarity_df = pd.read_pickle(os.path.join(ARTIFACT_DIR, "item_similarity.pkl"))

print(f"Loaded {len(customers):,} customers, {len(product_catalogue):,} products, "
      f"{len(association_rules_data):,} association rules.")

# ---------------------------------------------------------------------------
app = FastAPI(
    title="SME Customer Analytics API",
    description="Serves customer segments and product recommendations computed offline in the project notebook.",
    version="1.0.0",
)

# Allow the React dev server (and any deployed frontend origin) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's real origin before production use
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response / request models
# ---------------------------------------------------------------------------
class NewCustomerInput(BaseModel):
    recency_days: float
    frequency_orders: float
    monetary_gbp: float


class RecommendationItem(BaseModel):
    stock_code: str
    description: str
    score: float


# ---------------------------------------------------------------------------
# Health / meta
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "ok",
        "customers": len(customers),
        "products": len(product_catalogue),
        "association_rules": len(association_rules_data),
    }


@app.get("/api/evaluation")
def get_evaluation():
    """Model quality metrics (Precision@5 / Recall@5) for the dashboard's 'model quality' panel."""
    return recommendation_evaluation


# ---------------------------------------------------------------------------
# Segmentation endpoints
# ---------------------------------------------------------------------------
@app.get("/api/segments")
def get_segments():
    """Summary stats for every customer segment (for cards/pie chart in the dashboard)."""
    return segment_summary


@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int):
    """Full RFM profile + segment for one existing customer."""
    record = customers.get(str(customer_id))
    if record is None:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    return {"customer_id": customer_id, **record}


@app.get("/api/customers")
def search_customers(country: Optional[str] = None, segment: Optional[int] = None, limit: int = 50):
    """Browse/filter customers, e.g. for a searchable table in the dashboard."""
    results = []
    for cid, rec in customers.items():
        if country and rec["country"] != country:
            continue
        if segment is not None and rec["cluster"] != segment:
            continue
        results.append({"customer_id": int(cid), **rec})
        if len(results) >= limit:
            break
    return results


@app.post("/api/predict-segment")
def predict_segment(payload: NewCustomerInput):
    """
    Classify a customer who ISN'T in the training data (e.g. entered manually
    through a React form) into one of the existing segments, using the exact
    same preprocessing pipeline as the notebook (log-transform + scale + K-Means).
    """
    features = np.array([[payload.recency_days, payload.frequency_orders, payload.monetary_gbp]])
    log_features = np.log1p(np.clip(features, a_min=0, a_max=None))
    scaled = rfm_scaler.transform(log_features)
    cluster_id = int(kmeans_model.predict(scaled)[0])
    return {
        "cluster": cluster_id,
        "segment_label": cluster_label_map.get(str(cluster_id), cluster_label_map.get(cluster_id, "Unknown")),
    }


# ---------------------------------------------------------------------------
# Product / recommendation endpoints
# ---------------------------------------------------------------------------
@app.get("/api/products/search")
def search_products(q: str, limit: int = 20):
    """Simple substring search over the product catalogue, for an autocomplete box."""
    q_lower = q.lower()
    matches = [
        {"stock_code": code, "description": desc}
        for code, desc in product_catalogue.items()
        if q_lower in desc.lower()
    ]
    return matches[:limit]


@app.get("/api/products/{stock_code}/similar")
def similar_products(stock_code: str, top_n: int = 5):
    """Item-based collaborative filtering: products most similar to a given product."""
    if stock_code not in item_similarity_df.columns:
        raise HTTPException(status_code=404, detail=f"Product {stock_code} not found in similarity matrix")
    sims = item_similarity_df[stock_code].drop(stock_code).sort_values(ascending=False).head(top_n)
    return [
        {"stock_code": code, "description": product_catalogue.get(code, code), "score": round(float(score), 4)}
        for code, score in sims.items()
    ]


@app.get("/api/products/{stock_code}/rules")
def product_rules(stock_code: str, top_n: int = 5):
    """Association-rule-based recommendations ('customers who bought this also bought...')."""
    matches = [r for r in association_rules_data if stock_code in r["antecedents"]]
    matches.sort(key=lambda r: r["lift"], reverse=True)
    recs, seen = [], set()
    for r in matches:
        for code in r["consequents"]:
            if code not in seen:
                recs.append({
                    "stock_code": code,
                    "description": product_catalogue.get(code, code),
                    "confidence": r["confidence"],
                    "lift": r["lift"],
                })
                seen.add(code)
        if len(recs) >= top_n:
            break
    return recs[:top_n]


@app.get("/api/customers/{customer_id}/recommendations")
def customer_recommendations(customer_id: int, top_n: int = 5):
    """
    Personalized item-based CF recommendations for a specific customer, aggregating
    similarity scores across their full purchase history (mirrors notebook Section 8.3).
    """
    history = customer_purchase_history.get(str(customer_id))
    if history is None:
        raise HTTPException(status_code=404, detail=f"No purchase history for customer {customer_id}")

    owned = [p for p in history if p in item_similarity_df.columns]
    if not owned:
        return []

    scores = item_similarity_df[owned].sum(axis=1).drop(labels=owned, errors="ignore")
    top = scores.sort_values(ascending=False).head(top_n)
    return [
        {"stock_code": code, "description": product_catalogue.get(code, code), "score": round(float(score), 4)}
        for code, score in top.items()
    ]


@app.get("/api/popular")
def popular_products(top_n: int = 10):
    """Non-personalized popularity baseline (best-sellers)."""
    return popularity_ranked[:top_n]
