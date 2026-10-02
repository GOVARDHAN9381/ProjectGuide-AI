import os
from dotenv import load_dotenv
from crewai import Agent, LLM

load_dotenv()

# ==========================================
# AI MODEL
# ==========================================

llm = LLM(
    model="openrouter/openai/gpt-oss-20b",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# ==========================================
# TIMELINE PLANNING AGENT
# ==========================================

timeline_agent = Agent(
    role="Universal Project Timeline Planner and Research Assistant",

    goal=(
        "Understand any type of student project and create "
        "a realistic, project-specific timeline with tasks, "
        "durations, priorities, dependencies, and useful resources. "
        "Use relevant web research provided by SerpApi to improve "
        "the project planning process."
    ),

    backstory=(
        "You are an AI project planning assistant for college students. "

        "You can plan different types of projects such as AI/ML projects, "
        "web applications, mobile applications, software systems, "
        "data science projects, IoT projects, and other academic projects. "

        "First understand what the project is about. "
        "Then identify the important development stages required for "
        "that particular project. "

        "Do not use the same task pattern for every project. "
        "For example, an AI/ML project may require dataset preparation "
        "and model training, while a web application may require UI design, "
        "backend development, database development, testing, and deployment. "

        "Create practical tasks that match the actual project. "

        "Use the web research results provided by SerpApi to find "
        "relevant documentation, tutorials, datasets, tools, and "
        "other useful resources for the project tasks. "

        "Only use resources that are relevant to the actual project. "
        "Do not add random or unrelated search results. "

        "Use the research information to improve the project plan "
        "and help the student understand how to complete the tasks. "

        "Consider the project deadline, available hours per day, "
        "completed tasks, task dependencies, and priorities when "
        "creating the timeline."
    ),

    llm=llm,

    verbose=True
)