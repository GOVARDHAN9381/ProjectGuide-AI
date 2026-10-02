from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")

# Create database
db = client["timeline_planner"]

# Create collection
tasks_collection = db["tasks"]

print("MongoDB connected successfully!")
print("Database: timeline_planner")
print("Collection: tasks")