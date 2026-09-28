import json
from datetime import date, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS

from crewai import Task, Crew
from agents.timeline_agent import timeline_agent

from pymongo import MongoClient
from bson import ObjectId

app = Flask(__name__)
CORS(app)

# ================================
# MONGODB
# ================================

client = MongoClient("mongodb://localhost:27017/")

db = client["timeline_planner"]

tasks_collection = db["tasks"]


# ================================
# HOME
# ================================

@app.route("/")
def home():
    return jsonify({
        "message": "AI Timeline Planning Backend is running!"
    })


# ================================
# CREATE TIMELINE
# ================================

@app.route("/create-timeline", methods=["POST"])
def create_timeline():

    data = request.json or {}

    project_name = data.get("project_name")
    deadline = int(data.get("deadline"))
    hours_per_day = float(data.get("hours_per_day"))
    completed_tasks = data.get("completed_tasks", "None")

    if not project_name:
        return jsonify({
            "error": "Project name is required."
        }), 400

    print()
    print("======================================")
    print("Creating Timeline")
    print("Project:", project_name)
    print("======================================")
    print()

    prompt = (
        "You are an AI project planning assistant "
        "for college students.\n\n"

        "PROJECT INFORMATION\n"
        "Project Name: " + project_name + "\n"
        "Deadline: " + str(deadline) + " days\n"
        "Available Hours Per Day: " + str(hours_per_day) + "\n"
        "Completed Tasks: " + completed_tasks + "\n\n"

        "FIRST UNDERSTAND THE PROJECT\n"
        "Before creating the timeline, understand what "
        "the project is about and identify the type of project.\n\n"

        "The project may be an AI/ML project, web application, "
        "mobile application, management system, data science "
        "project, IoT project, software system, or another "
        "type of academic project.\n\n"

        "CREATE PROJECT-SPECIFIC TASKS\n"
        "Create tasks that are actually required for "
        "the given project.\n\n"

        "Do NOT use the same task list for every project.\n\n"

        "For example:\n"
        "- AI/ML projects may require dataset collection, "
        "data preprocessing, model selection, model training, "
        "model evaluation, and deployment.\n"

        "- Web applications may require requirement analysis, "
        "UI design, frontend development, backend development, "
        "database development, testing, and deployment.\n"

        "- Mobile applications may require UI design, "
        "application development, API/database integration, "
        "testing, and deployment.\n"

        "- Management systems may require requirements, "
        "database design, authentication, modules, "
        "testing, and deployment.\n"

        "- IoT projects may require hardware planning, "
        "sensor integration, programming, data processing, "
        "testing, and deployment.\n\n"

        "These are only examples.\n"
        "Do NOT blindly copy them.\n"
        "Create tasks based on the actual project name "
        "and project requirements.\n\n"

        "COMPLETED TASKS\n"
        "Do not create duplicate tasks for work that "
        "has already been completed.\n"
        "Use the completed tasks information when "
        "creating the remaining timeline.\n\n"

        "DEADLINE\n"
        "The complete project should fit within the "
        "given deadline.\n"
        "Use realistic task durations based on the "
        "available hours per day.\n\n"

        "TASK DEPENDENCIES\n"
        "Arrange tasks in a logical order.\n"
        "If one task requires another task to be completed "
        "first, mention that task in depends_on.\n\n"

        "PRIORITY\n"
        "Assign each task one of these priorities:\n"
        "- High\n"
        "- Medium\n"
        "- Low\n\n"

        "FOR EVERY TASK PROVIDE:\n"
        "- name\n"
        "- duration_days\n"
        "- priority\n"
        "- description\n"
        "- depends_on\n\n"

        "RETURN ONLY VALID JSON.\n\n"

        "Use exactly this format:\n\n"

        "{\n"
        '  "tasks": [\n'
        "    {\n"
        '      "name": "Task name",\n'
        '      "duration_days": 2,\n'
        '      "priority": "High",\n'
        '      "description": "Short description",\n'
        '      "depends_on": []\n'
        "    }\n"
        "  ]\n"
        "}\n\n"

        "Do not add markdown.\n"
        "Do not add explanations outside the JSON."
    )

    timeline_task = Task(
        description=prompt,
        expected_output=(
            "Valid JSON containing a tasks array. "
            "Each task must contain name, duration_days, "
            "priority, description, and depends_on."
        ),
        agent=timeline_agent
    )

    crew = Crew(
        agents=[timeline_agent],
        tasks=[timeline_task],
        verbose=True
    )

    result = crew.kickoff()

    result_text = str(result)

    print()
    print("AI response received.")
    print()

    start = result_text.find("{")
    end = result_text.rfind("}") + 1

    if start == -1 or end == 0:
        return jsonify({
            "error": "AI did not return valid JSON.",
            "raw_response": result_text
        }), 500

    json_text = result_text[start:end]

    try:
        timeline_data = json.loads(json_text)

    except json.JSONDecodeError:
        return jsonify({
            "error": "AI response could not be converted to JSON.",
            "raw_response": result_text
        }), 500

    if "tasks" not in timeline_data:
        return jsonify({
            "error": "AI response does not contain tasks.",
            "raw_response": result_text
        }), 500

    # ================================
    # PROJECT INFORMATION
    # ================================

    timeline_data["project_name"] = project_name
    timeline_data["deadline_days"] = deadline
    timeline_data["hours_per_day"] = hours_per_day
    timeline_data["completed_tasks"] = completed_tasks

    # ================================
    # CREATE DATES
    # ================================

    start_date = date.today()
    current_date = start_date

    for task in timeline_data["tasks"]:

        duration = int(task.get("duration_days", 1))

        if duration < 1:
            duration = 1

        task_start = current_date

        task_end = current_date + timedelta(
            days=duration - 1
        )

        task["start_date"] = task_start.isoformat()
        task["end_date"] = task_end.isoformat()

        task["status"] = "Not Started"
        task["progress"] = 0

        current_date = task_end + timedelta(days=1)

    # ================================
    # TOTAL DAYS
    # ================================

    total_days = 0

    for task in timeline_data["tasks"]:

        total_days += int(
            task.get("duration_days", 1)
        )

    timeline_data["total_task_days"] = total_days

    if total_days <= deadline:
        timeline_data["deadline_status"] = "Within Deadline"
    else:
        timeline_data["deadline_status"] = "At Risk"

    # ================================
    # SAVE TO MONGODB
    # ================================

    result_db = tasks_collection.insert_one(
        timeline_data
    )

    timeline_data["_id"] = str(
        result_db.inserted_id
    )

    print()
    print("Timeline saved to MongoDB.")
    print("Project:", project_name)
    print("Total task days:", total_days)
    print("Deadline:", deadline)
    print()

    return jsonify(timeline_data)


# ================================
# GET SAVED PROJECTS
# ================================

@app.route("/projects", methods=["GET"])
def get_projects():

    projects = []

    # Newest project first
    saved_projects = tasks_collection.find().sort(
        "_id",
        -1
    )

    for project in saved_projects:

        project["_id"] = str(
            project["_id"]
        )

        projects.append(project)

    return jsonify(projects)


# ================================
# UPDATE TASK PROGRESS
# ================================

@app.route("/update-progress", methods=["POST"])
def update_progress():

    data = request.json or {}

    project_id = data.get("project_id")
    task_index = data.get("task_index")
    progress_value = data.get("progress")

    if not project_id:
        return jsonify({
            "error": "Project ID is required."
        }), 400

    if task_index is None:
        return jsonify({
            "error": "Task index is required."
        }), 400

    if progress_value is None:
        return jsonify({
            "error": "Progress is required."
        }), 400

    try:
        task_index = int(task_index)
        progress_value = int(progress_value)

    except ValueError:
        return jsonify({
            "error": "Invalid task index or progress."
        }), 400

    if progress_value < 0 or progress_value > 100:
        return jsonify({
            "error": "Progress must be between 0 and 100."
        }), 400

    try:
        object_id = ObjectId(project_id)

    except Exception:
        return jsonify({
            "error": "Invalid project ID."
        }), 400

    # Find project first
    project = tasks_collection.find_one({
        "_id": object_id
    })

    if not project:
        return jsonify({
            "error": "Project not found."
        }), 404

    tasks = project.get("tasks", [])

    if task_index < 0 or task_index >= len(tasks):
        return jsonify({
            "error": "Invalid task index."
        }), 400

    # Determine status
    if progress_value == 100:
        status = "Completed"

    elif progress_value > 0:
        status = "In Progress"

    else:
        status = "Not Started"

    # Update task in MongoDB
    tasks_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {
                f"tasks.{task_index}.progress": progress_value,
                f"tasks.{task_index}.status": status
            }
        }
    )

    print()
    print("Progress updated.")
    print("Project ID:", project_id)
    print("Task:", task_index)
    print("Progress:", progress_value)
    print("Status:", status)
    print()

    return jsonify({
        "message": "Progress updated successfully.",
        "progress": progress_value,
        "status": status
    })


# ================================
# RUN SERVER
# ================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )