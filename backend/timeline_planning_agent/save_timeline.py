import json
from datetime import date, timedelta

# Project information
project_name = "AI Student Attendance System"
start_date = date(2026, 9, 16)

# Read AI-generated timeline
with open("timeline_ai.txt", "r", encoding="utf-8") as file:
    content = file.read()

# Find JSON section
start = content.find("{")
end = content.rfind("}") + 1

json_data = content[start:end]

# Convert JSON into Python data
data = json.loads(json_data)

tasks = data["tasks"]

current_date = start_date

final_tasks = []

for i, task in enumerate(tasks, start=1):

    duration = int(task["duration_days"])

    task_start = current_date
    task_end = current_date + timedelta(days=duration - 1)

    final_task = {
        "task_id": i,
        "name": task["name"],
        "duration_days": duration,
        "priority": task["priority"],
        "description": task["description"],
        "depends_on": task["depends_on"],
        "start_date": task_start.isoformat(),
        "end_date": task_end.isoformat(),
        "status": "Not Started",
        "progress": 0
    }

    final_tasks.append(final_task)

    current_date = task_end + timedelta(days=1)

# Create final project data
project_data = {
    "project_name": project_name,
    "start_date": start_date.isoformat(),
    "tasks": final_tasks
}

# Save everything
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(project_data, file, indent=4)

print("\nTimeline saved successfully!")
print("File created: timeline.json")