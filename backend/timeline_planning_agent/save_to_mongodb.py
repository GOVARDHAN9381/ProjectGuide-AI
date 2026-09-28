import json
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")

# Select database
db = client["timeline_planner"]

# Select collection
tasks_collection = db["tasks"]

# Read timeline.json
with open("timeline.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Create project data
project = {
    "project_name": data["project_name"],
    "deadline_days": data["deadline_days"],
    "hours_per_day": data["hours_per_day"],
    "completed_tasks": data["completed_tasks"],
    "tasks": data["tasks"]
}

# Save project to MongoDB
result = tasks_collection.insert_one(project)

print("\n===== MONGODB SAVE SUCCESSFUL =====\n")
print("Project:", data["project_name"])
print("MongoDB ID:", result.inserted_id)
print("Number of tasks:", len(data["tasks"]))
print("\nTimeline saved successfully in MongoDB!")