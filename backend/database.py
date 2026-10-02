import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Load environment variables from .env explicitly
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority")
DB_NAME = os.getenv("DB_NAME", "ProjectGuide-AI")

client = None
db = None


def get_database():
    global client, db
    if db is None:
        try:
            import certifi
            client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
                tlsCAFile=certifi.where()
            )
        except Exception:
            client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000
            )
        db = client[DB_NAME]
        try:
            _ensure_indexes(db)
        except Exception as e:
            print(f"[DB] Notice: Could not ensure indexes on MongoDB Atlas: {e}")
    return db


def _ensure_indexes(database):
    """
    Create necessary MongoDB indexes on first connection.
    All index creations are idempotent (MongoDB ignores duplicates).
    """
    # students: unique index on email to prevent duplicate registrations
    database["students"].create_index(
        [("email", ASCENDING)],
        unique=True,
        name="students_email_unique",
    )

    # project_ideas: index on student_id for fast per-student queries
    database["project_ideas"].create_index(
        [("student_id", ASCENDING)],
        name="ideas_student_id_idx",
    )

    # feasibility_reports: index on idea_id (1-to-1 per idea) and student_id
    database["feasibility_reports"].create_index(
        [("idea_id", ASCENDING)],
        name="reports_idea_id_idx",
    )
    database["feasibility_reports"].create_index(
        [("student_id", ASCENDING)],
        name="reports_student_id_idx",
    )

    # scope_reports: one per idea, same indexing pattern as feasibility_reports
    database["scope_reports"].create_index(
        [("idea_id", ASCENDING)],
        name="scope_idea_id_idx",
    )
    database["scope_reports"].create_index(
        [("student_id", ASCENDING)],
        name="scope_student_id_idx",
    )


def check_db_connection():
    """Utility to test whether the MongoDB connection is alive."""
    try:
        current_db = get_database()
        # Ping the server to check connectivity
        current_db.command("ping")
        return {"connected": True, "database": DB_NAME, "message": "MongoDB Atlas connected successfully!"}
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return {"connected": False, "database": DB_NAME, "error": str(e), "message": "Failed to connect to MongoDB Atlas. Check your MONGO_URI in .env"}
    except Exception as e:
        return {"connected": False, "database": DB_NAME, "error": str(e), "message": "Unexpected error connecting to MongoDB"}


# ---------------------------------------------------------------------------
# Collection helper getters
# ---------------------------------------------------------------------------

def get_students_collection():
    return get_database()["students"]


def get_project_ideas_collection():
    return get_database()["project_ideas"]


def get_feasibility_reports_collection():
    return get_database()["feasibility_reports"]


def get_scope_reports_collection():
    return get_database()["scope_reports"]
