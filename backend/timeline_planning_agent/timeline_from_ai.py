import json
from datetime import date, timedelta

# Project start date
start_date = date.today()

# Read saved AI timeline
with open("timeline_ai.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = data["tasks"]

current_date = start_date

# Add date and progress information to every task
for task in tasks:

    duration = int(task["duration_days"])

    task_start = current_date
    task_end = current_date + timedelta(days=duration - 1)

    task["start_date"] = task_start.isoformat()
    task["end_date"] = task_end.isoformat()

    # Initial progress information
    task["status"] = "Not Started"
    task["progress"] = 0

    current_date = task_end + timedelta(days=1)


# Save the updated timeline
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=4)


print("\n===== FINAL PROJECT TIMELINE =====\n")

for task in tasks:

    print(f"Task: {task['name']}")
    print(f"Duration: {task['duration_days']} day(s)")
    print(f"Priority: {task['priority']}")
    print(f"Start: {task['start_date']}")
    print(f"End: {task['end_date']}")
    print(f"Status: {task['status']}")
    print(f"Progress: {task['progress']}%")
    print("-" * 60)

print("\nTimeline saved successfully!")
print("Saved file: timeline.json")