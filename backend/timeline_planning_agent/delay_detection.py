import json
from datetime import date

# Load timeline
with open("timeline.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = data["tasks"]

today = date.today()

print("\n===== DELAY DETECTION =====\n")

delayed_tasks = []

for task in tasks:

    end_date = date.fromisoformat(task["end_date"])
    progress = task["progress"]

    # Check whether task is delayed
    if today > end_date and progress < 100:

        task["status"] = "Delayed"
        delayed_tasks.append(task)

        print(f"⚠ DELAY DETECTED")
        print(f"Task: {task['name']}")
        print(f"Planned End: {task['end_date']}")
        print(f"Current Progress: {progress}%")
        print()

# Save updated timeline
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=4)

if len(delayed_tasks) == 0:
    print("No delayed tasks found.")

else:
    print(f"{len(delayed_tasks)} delayed task(s) detected.")

print("\nTimeline updated successfully!")