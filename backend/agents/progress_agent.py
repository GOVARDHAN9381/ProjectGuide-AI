"""
Progress Tracking & Check-in Agent (Milestone 3)

Handles:
- Weekly student check-in submissions (mood, progress%, blockers text)
- AI-driven plan adjustments based on progress updates
- Check-in history retrieval
"""

import json
import os
import re
import datetime

from crewai import Agent, Crew, Task
from dotenv import load_dotenv

import agents.litellm_patch

load_dotenv()


def _get_llm():
    api_key = os.getenv("GROQ_API_KEY") 
    if not api_key:
        raise ValueError("GROQ_API_KEY not found")
    from crewai import LLM
    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    return LLM(model=model_name, api_key=api_key, temperature=0.4)


def _parse_json_from_text(text: str) -> dict:
    if not text:
        return {}
    text = str(text).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    patterns = [
        r"```json\s*\n?(.*?)\n?\s*```",
        r"```\s*\n?(.*?)\n?\s*```",
        r"\{[\s\S]*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                candidate = match.group(1) if match.lastindex else match.group(0)
                return json.loads(candidate)
            except Exception:
                pass
    return {}


def analyze_progress_and_adjust(
    idea_data: dict,
    check_in: dict,
    previous_check_ins: list = None,
    scope_report: dict = None,
) -> dict:
    """
    Given a new check-in submission, generate AI-driven plan adjustments.
    Returns an adjustment report with recommendations.
    """
    previous_check_ins = previous_check_ins or []
    scope_report = scope_report or {}

    title = idea_data.get("title", "Project")
    duration_days = idea_data.get("durationDays", 30)
    team_size = idea_data.get("teamSize", "3")
    progress_pct = check_in.get("progress_pct", 0)
    blockers = check_in.get("blockers", "None reported")
    mood = check_in.get("mood", "neutral")
    week_num = len(previous_check_ins) + 1

    # Try AI adjustment
    try:
        llm = _get_llm()

        mentor_agent = Agent(
            role="Academic Project Progress Coach",
            goal=(
                "Analyze student check-in data and generate concrete plan adjustments "
                "and encouragement to keep the project on track."
            ),
            backstory=(
                "You are an empathetic academic mentor who tracks student project progress weekly. "
                "You spot where students are falling behind and give precise, motivating adjustments."
            ),
            llm=llm,
            verbose=False,
            allow_delegation=False,
        )

        prev_summary = ""
        if previous_check_ins:
            last = previous_check_ins[-1]
            prev_summary = f"\nPrevious check-in (Week {week_num-1}): {last.get('progress_pct', 0)}% progress, mood: {last.get('mood', 'N/A')}"

        task_desc = f"""
Analyze this student's weekly check-in and generate plan adjustments.

PROJECT: {title} ({duration_days} days, {team_size} members)
WEEK: {week_num}
CURRENT PROGRESS: {progress_pct}%
BLOCKERS: {blockers}
MOOD: {mood}
{prev_summary}

Expected progress at week {week_num}: {min(100, round(week_num * 100 / max(1, round(int(duration_days)/7))))}%

Generate a JSON response:
{{
  "status": "on_track" or "slightly_behind" or "at_risk" or "critical",
  "progress_gap": <expected% - actual%>,
  "mentor_message": "2-3 sentences of personalized, encouraging feedback addressing the specific blocker",
  "plan_adjustments": [
    "Specific adjustment 1 for this blocker",
    "Specific adjustment 2",
    "Specific adjustment 3"
  ],
  "next_week_goals": [
    "Concrete goal 1 for next week",
    "Concrete goal 2"
  ],
  "priority_task": "The single most important thing to do in the next 48 hours"
}}
"""

        task = Task(
            description=task_desc,
            expected_output="A valid JSON object with status, mentor_message, plan_adjustments, next_week_goals, priority_task.",
            agent=mentor_agent,
        )
        crew = Crew(agents=[mentor_agent], tasks=[task], verbose=False)
        result = crew.kickoff()
        parsed = _parse_json_from_text(str(result))

        if parsed and "mentor_message" in parsed:
            parsed["ai_generated"] = True
            return parsed
    except Exception as e:
        print(f"[PROGRESS AGENT] AI analysis failed: {e}")

    # Fallback
    expected_pct = min(100, round(week_num * 100 / max(1, round(int(duration_days) / 7))))
    gap = expected_pct - progress_pct
    if gap <= 5:
        status = "on_track"
    elif gap <= 15:
        status = "slightly_behind"
    elif gap <= 30:
        status = "at_risk"
    else:
        status = "critical"

    morale_prefix = {
        "great": "Excellent momentum! ",
        "good": "Good progress this week! ",
        "okay": "Hang in there — ",
        "struggling": "I can see you're finding this challenging. ",
        "neutral": "Keep pushing forward — ",
    }.get(mood, "")

    return {
        "status": status,
        "progress_gap": gap,
        "mentor_message": (
            f"{morale_prefix}You're at {progress_pct}% with the reported blocker: '{blockers}'. "
            f"{'You are on track — keep this pace!' if status == 'on_track' else 'Focus on unblocking the critical path this week to close the gap.'}"
        ),
        "plan_adjustments": [
            f"Directly address blocker: {blockers}" if blockers and blockers != "None reported" else "Review and prioritize your task backlog",
            "Hold a 30-minute team standup every morning this week",
            "Cut any non-essential features temporarily to protect the core deliverable",
        ],
        "next_week_goals": [
            f"Reach {min(100, progress_pct + 15)}% overall completion",
            "Resolve the primary blocker and document the solution",
        ],
        "priority_task": f"Resolve '{blockers}' or escalate for help immediately" if blockers and blockers != "None reported" else "Complete the highest-priority pending task on your board",
        "ai_generated": False,
    }
