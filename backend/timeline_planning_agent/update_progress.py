import json

# Load timeline
with open("timeline.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = data["tasks"]

print("\n===== PROJECT TASKS =====\n")

# Display tasks
for i, task in enumerate(tasks, start=1):
    print(f"{i}. {task['name']}")
    print(f"   Status: {task['status']}")
    print(f"   Progress: {task['progress']}%")
    print()

# Get task number
task_number = int(input("Enter task number to update: "))

# Check task number
if task_number < 1 or task_number > len(tasks):
    print("Invalid task number.")
    exit()

# Get progress
progress = int(input("Enter progress percentage (0-100): "))

# Check progress
if progress < 0 or progress > 100:
    print("Progress must be between 0 and 100.")
    exit()

# Select task
task = tasks[task_number - 1]

# Update progress
task["progress"] = progress

# Update status
if progress == 0:
    task["status"] = "Not Started"
elif progress == 100:
    task["status"] = "Completed"
else:
    task["status"] = "In Progress"

# Save updated timeline
with open("timeline.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=4)

print("\n===== TASK UPDATED =====\n")
print(f"Task: {task['name']}")
print(f"Progress: {task['progress']}%")
print(f"Status: {task['status']}")

print("\nTimeline updated successfully!")