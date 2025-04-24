import sqlite3
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


def calculate_metrics_for_user(db_connection, user_id):
    # Calculate an individual user's metrics (accuracy, precision, recall, f1) based on top-K (most recommended) and bottom-K (least recommended)
    user_id = int(user_id)  # Ensure user_id is an integer
    saved_count_query = "SELECT COUNT(*) AS saved_count FROM Merged_Recommendations WHERE user_id = ? AND saved = 1"
    saved_count = pd.read_sql_query(saved_count_query, db_connection, params=(user_id,)).iloc[0]["saved_count"]
    print(f"Saved count (K) for User {user_id}: {saved_count}")
    saved_count = int(saved_count) if saved_count is not None else 0
    recommended = pd.read_sql_query("SELECT track_id, saved, score FROM Merged_Recommendations WHERE user_id = ? ORDER BY score DESC LIMIT ?", db_connection, params=(user_id, saved_count))
    unrecommended = pd.read_sql_query("SELECT track_id, saved, score FROM Merged_Recommendations WHERE user_id = ? ORDER BY score ASC LIMIT ?", db_connection, params=(user_id, saved_count))
    recommendations = pd.concat([recommended, unrecommended], axis = 0)
    ground_truth = recommendations["saved"].values  # These are the actual saved values
    predicted_values = [1] * saved_count + [0] * saved_count  # Top-K as 1 (positive), Bottom-K as 0 (negative)
    accuracy = accuracy_score(ground_truth, predicted_values)
    precision = precision_score(ground_truth, predicted_values)
    recall = recall_score(ground_truth, predicted_values)
    f1 = f1_score(ground_truth, predicted_values)
    return {"accuracy": accuracy, "precision": precision, "recall": recall, "f1_score": f1}

def calculate_metrics_for_all_users(db_connection):
    # loop to calculate each user's metrics and immediately print the metrics scores, returns metrics scores
    user_ids = pd.read_sql_query("SELECT DISTINCT user_id FROM Merged_Recommendations", db_connection)["user_id"]
    metrics_results = {}
    for user_id in user_ids:
        metrics = calculate_metrics_for_user(db_connection, user_id)
        if metrics:
            metrics_results[user_id] = metrics
            print(f"Metrics for User {user_id}:")
            print(f"Accuracy: {metrics['accuracy']:.4f}")
            print(f"Precision: {metrics['precision']:.4f}")
            print(f"Recall: {metrics['recall']:.4f}")
            print(f"F1 Score: {metrics['f1_score']:.4f}")
            print("------------------------")
    return metrics_results


db_path = "jsapp/sqlite3.db"
db_connection = sqlite3.connect(db_path)
metrics_results = calculate_metrics_for_all_users(db_connection)
db_connection.close()
