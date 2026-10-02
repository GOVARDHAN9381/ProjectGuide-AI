import json
from datetime import date

# Load timeline
with open("timeline.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = data["tasks"]

# Project information
deadline_days = int(data["deadline_days"])

# Project start date
project_start = date.fromisoformat(tasks[0]["start_date"])

# Original project deadline
original_deadline = project_start.fromordinal(
    project_start.toordinal() + deadline_days - 1
)

# Find the final task
final_task = tasks[-1]
planned_end = date.fromisoformat(final_task["end_date"])

print("\n===== DEADLINE RISK CHECK =====\n")

print(f"Original Deadline : {original_deadline}")
print(f"Current Planned End: {planned_end}")

# Check deadline risk
if planned_end > original_deadline:

    delay = (planned_end - original_deadline).days

    print("\n⚠ DEADLINE RISK DETECTED!")
    print(f"Project may finish {delay} day(s) late.")

    data["deadline_status"] = "At Risk"
    data["deadline_risk_days"] = delay

else:

    remaining_days = (original_deadline - planned_end).days

    print("\n✓ PROJECT IS WITHIN DEADLINE")
    print(f"Remaining buffer: {remaining_days} day(s)")

    data["deadline_status"] = "On Track"
    data["deadline_risk_days"] = 0

# Save updated timeline
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=4)

print("\nTimeline updated successfully!")