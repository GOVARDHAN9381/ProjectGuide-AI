import json
from datetime import date, timedelta

# Load timeline
with open("timeline.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = data["tasks"]

today = date.today()

print("\n===== AUTOMATIC RESCHEDULING =====\n")

delayed_index = -1
delay_days = 0

# Find first delayed task
for i, task in enumerate(tasks):

    end_date = date.fromisoformat(task["end_date"])

    if task["progress"] < 100 and today > end_date:

        delayed_index = i
        delay_days = (today - end_date).days

        print(f"Delayed Task: {task['name']}")
        print(f"Original End Date: {task['end_date']}")
        print(f"Current Progress: {task['progress']}%")
        print(f"Delay: {delay_days} day(s)")
        print()

        break

# Reschedule future tasks
if delayed_index != -1:

    for i in range(delayed_index + 1, len(tasks)):

        task = tasks[i]

        old_start = date.fromisoformat(task["start_date"])
        old_end = date.fromisoformat(task["end_date"])

        task["start_date"] = (
            old_start + timedelta(days=delay_days)
        ).isoformat()

        task["end_date"] = (
            old_end + timedelta(days=delay_days)
        ).isoformat()

    print("Future tasks have been rescheduled.")

else:

    print("No delayed tasks found.")
    print("No rescheduling required.")

# Save
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=4)

print("\nTimeline saved successfully!")