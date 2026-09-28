from datetime import date, timedelta

# Project starting date
start_date = date(2026, 9, 16)

# Tasks from the AI timeline
tasks = [
    ("Kickoff & Tool Setup", 1),
    ("Requirements Gathering", 3),
    ("Functional Specification", 2),
    ("System Architecture Design", 1),
    ("Database Schema Design", 1),
    ("Data Collection & Labeling Strategy", 3),
    ("Machine Learning Model Development", 5),
    ("Backend API Development", 4),
    ("Frontend UI Development", 3),
    ("Integration & End-to-End Testing", 3),
    ("Deployment & Documentation", 3),
    ("Project Review & Closure", 1)
]

current_date = start_date

print("\n===== PROJECT TIMELINE =====\n")

for task_name, duration in tasks:
    task_start = current_date
    task_end = current_date + timedelta(days=duration - 1)

    print(f"Task: {task_name}")
    print(f"Duration: {duration} day(s)")
    print(f"Start Date: {task_start.strftime('%d-%b-%Y')}")
    print(f"End Date: {task_end.strftime('%d-%b-%Y')}")
    print("-" * 40)

    current_date = task_end + timedelta(days=1)