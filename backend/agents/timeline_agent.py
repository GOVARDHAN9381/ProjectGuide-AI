"""
Universal Project Timeline Planner Agent

Understands college student projects (AI/ML, Web, Mobile, Data Science, IoT, etc.)
and generates a realistic project timeline with tasks, duration, priority, dates,
dependencies, and deadline risk assessment.
"""

import json
import os
import re
import sys
import traceback
from datetime import date, timedelta
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Import LiteLLM patch if available
try:
    import agents.litellm_patch
except ImportError:
    pass

try:
    import crewai.llms.cache
    crewai.llms.cache.mark_cache_breakpoint = lambda message: message
except Exception:
    pass

from crewai import Agent, Task, Crew, LLM


def _get_llm() -> LLM:
    """Creates a Groq-backed LLM instance for CrewAI."""
    api_key = (
        os.getenv("GROQ_API_KEY_TRACKING")
        or os.getenv("GROQ_API_KEY_TECH_STACK")
        or os.getenv("GROQ_API_KEY")
        or ""
    )

    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    if not model_name.startswith("groq/"):
        model_name = f"groq/{model_name}"

    return LLM(
        model=model_name,
        api_key=api_key,
        temperature=0.2,
    )


def create_timeline_agent() -> Agent:
    """Factory function to build the timeline planning agent."""
    return Agent(
        role="Universal Project Timeline Planner and Research Assistant",
        goal=(
            "Understand any type of student project and create a realistic, "
            "project-specific timeline with tasks, durations, priorities, dependencies, "
            "and milestone dates."
        ),
        backstory=(
            "You are an AI project planning assistant for college students. "
            "You can plan different types of projects such as AI/ML, web apps, mobile apps, "
            "software systems, data science, IoT, and other academic projects. "
            "Create practical tasks tailored specifically to the given project, "
            "arranging them in logical dependency order within the specified deadline."
        ),
        llm=_get_llm(),
        verbose=False,
    )


def run_timeline_agent(
    project_name: str,
    deadline_days: int,
    hours_per_day: float = 4.0,
    completed_tasks: str = "None"
) -> Dict[str, Any]:
    """
    Executes the Timeline Agent to produce a structured project timeline.
    Returns a dict with project metadata, task list, date scheduling, and deadline status.
    """
    agent = create_timeline_agent()

    prompt = f"""
PROJECT INFORMATION:
Project Name: {project_name}
Deadline: {deadline_days} days
Available Hours Per Day: {hours_per_day}
Completed Tasks: {completed_tasks}

INSTRUCTIONS:
Create project-specific tasks for this project.
Do NOT use a generic hardcoded template. Match the actual project type (AI/ML, Web, Mobile, IoT, Data Science, etc.).
Do NOT duplicate already completed tasks.
Ensure the total estimated duration fits within the given deadline if possible.

For EVERY task provide:
- name: string
- duration_days: integer (at least 1)
- priority: "High" | "Medium" | "Low"
- description: string summary of work
- depends_on: list of task names that must precede this task

RETURN ONLY VALID JSON matching this format:
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

Do not include markdown wrappers like ```json or any text outside the JSON object.
"""

    task = Task(
        description=prompt,
        expected_output="Valid JSON containing a tasks array with fields: name, duration_days, priority, description, depends_on.",
        agent=agent,
    )

    crew = Crew(
        agents=[agent],
        tasks=[task],
        verbose=False,
    )

    try:
        raw_result = crew.kickoff()
        result_text = str(raw_result).strip()

        # Clean markdown codeblocks if present
        result_text = re.sub(r"^```json\s*", "", result_text, flags=re.MULTILINE)
        result_text = re.sub(r"^```\s*", "", result_text, flags=re.MULTILINE)

        start = result_text.find("{")
        end = result_text.rfind("}") + 1

        if start != -1 and end != 0:
            json_text = result_text[start:end]
            timeline_data = json.loads(json_text)
        else:
            timeline_data = {"tasks": []}

    except Exception as e:
        # Safe stderr write — avoids UnicodeEncodeError on Windows cp1252
        try:
            msg = f"[TIMELINE AGENT] Crew exception: {e}\n"
            sys.stderr.buffer.write(msg.encode("utf-8", errors="replace"))
            sys.stderr.buffer.flush()
        except Exception:
            pass
        # Fallback response
        timeline_data = {
            "tasks": [
                {
                    "name": "Project Setup & Requirements",
                    "duration_days": max(1, deadline_days // 4),
                    "priority": "High",
                    "description": "Initial setup and project analysis.",
                    "depends_on": []
                },
                {
                    "name": "Core Development",
                    "duration_days": max(1, deadline_days // 2),
                    "priority": "High",
                    "description": "Main features implementation.",
                    "depends_on": ["Project Setup & Requirements"]
                },
                {
                    "name": "Testing & Deployment",
                    "duration_days": max(1, deadline_days // 4),
                    "priority": "Medium",
                    "description": "Final validation, documentation, and release.",
                    "depends_on": ["Core Development"]
                }
            ]
        }

    # Format project metadata
    timeline_data["project_name"] = project_name
    timeline_data["deadline_days"] = deadline_days
    timeline_data["hours_per_day"] = hours_per_day
    timeline_data["completed_tasks"] = completed_tasks

    # Calculate dates & status
    start_date = date.today()
    current_date = start_date
    total_days = 0

    tasks = timeline_data.get("tasks", [])
    for idx, t in enumerate(tasks):
        duration = int(t.get("duration_days", 1))
        if duration < 1:
            duration = 1
        t["duration_days"] = duration
        t["task_id"] = str(idx + 1)

        t_start = current_date
        t_end = t_start + timedelta(days=duration - 1)

        t["start_date"] = t_start.isoformat()
        t["end_date"] = t_end.isoformat()
        t["status"] = t.get("status", "Not Started")
        t["progress"] = t.get("progress", 0)

        current_date = t_end + timedelta(days=1)
        total_days += duration

    timeline_data["total_task_days"] = total_days
    timeline_data["deadline_status"] = "Within Deadline" if total_days <= deadline_days else "At Risk"

    return timeline_data
