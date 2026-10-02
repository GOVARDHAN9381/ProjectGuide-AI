import json
from crewai import Task, Crew
from agents.timeline_agent import timeline_agent

print("\n===== TIMELINE PLANNING AGENT =====\n")

# Get project details from user
project_name = input("Enter project name: ")
deadline = input("Enter deadline in days: ")
hours_per_day = input("Enter available hours per day: ")
completed_tasks = input("Enter completed tasks (if none, type None): ")

project_details = f"""
Project Name: {project_name}
Deadline: {deadline} days
Available Hours Per Day: {hours_per_day}
Completed Tasks: {completed_tasks}
"""

print("\nCreating your project timeline...\n")

timeline_task = Task(
    description=f"""
    Create a realistic project timeline for the following project:

    {project_details}

    Break the project into clear tasks.

    Consider:
    - Project deadline
    - Available working hours
    - Completed tasks
    - Task dependencies
    - Task priority

    For every task provide:
    - name
    - duration_days
    - priority
    - description
    - depends_on

    IMPORTANT:
    Return ONLY valid JSON.

    Use exactly this format:

    {{
        "tasks": [
            {{
                "name": "Task name",
                "duration_days": 2,
                "priority": "High",
                "description": "Short description",
                "depends_on": []
            }}
        ]
    }}

    Do not add markdown.
    Do not add explanations outside the JSON.
    """,

    expected_output="""
    Valid JSON containing a tasks array.
    Each task must contain:
    name, duration_days, priority,
    description, and depends_on.
    """,

    agent=timeline_agent
)

crew = Crew(
    agents=[timeline_agent],
    tasks=[timeline_task],
    verbose=True
)

result = crew.kickoff()

# Convert result to text
result_text = str(result)

# Find JSON
start = result_text.find("{")
end = result_text.rfind("}") + 1

json_text = result_text[start:end]

# Check JSON
try:
    timeline_data = json.loads(json_text)

    # Add project information
    timeline_data["project_name"] = project_name
    timeline_data["deadline_days"] = int(deadline)
    timeline_data["hours_per_day"] = float(hours_per_day)
    timeline_data["completed_tasks"] = completed_tasks

    # Save data
    with open("timeline_ai.json", "w", encoding="utf-8") as file:
        json.dump(timeline_data, file, indent=4)

    print("\n===== TIMELINE CREATED =====\n")

    for i, task in enumerate(timeline_data["tasks"], start=1):
        print(f"{i}. {task['name']}")
        print(f"   Duration: {task['duration_days']} day(s)")
        print(f"   Priority: {task['priority']}")
        print()

    print("Timeline saved successfully!")
    print("Saved file: timeline_ai.json")

except json.JSONDecodeError:
    print("\nCould not read the AI response as JSON.")
    print("Please run the program again.")