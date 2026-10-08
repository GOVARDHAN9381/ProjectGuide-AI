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


# Fix Windows dnspython resolver initialization if needed
try:
    import dns.resolver
    if dns.resolver.default_resolver is None:
        res = dns.resolver.Resolver()
        res.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        dns.resolver.default_resolver = res
except Exception:
    pass


def get_database():
    global client, db
    if db is None:
        try:
            import dns.resolver
            if dns.resolver.default_resolver is None:
                res = dns.resolver.Resolver()
                res.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
                dns.resolver.default_resolver = res
        except Exception:
            pass

        try:
            import certifi
            client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=15000,
                connectTimeoutMS=15000,
                socketTimeoutMS=15000,
                tlsCAFile=certifi.where()
            )
            client.admin.command('ping')
        except Exception as e1:
            try:
                client = MongoClient(
                    MONGO_URI,
                    serverSelectionTimeoutMS=15000,
                    connectTimeoutMS=15000,
                    socketTimeoutMS=15000,
                    tlsAllowInvalidCertificates=True
                )
                client.admin.command('ping')
            except Exception as e2:
                print(f"[DB] Notice: Atlas connection error ({e1} / {e2}). Falling back to localhost.")
                client = MongoClient(
                    "mongodb://localhost:27017",
                    serverSelectionTimeoutMS=2000
                )
        db = client[DB_NAME]
        try:
            _ensure_indexes(db)
        except Exception as e:
            print(f"[DB] Notice: Index check on MongoDB Atlas: {e}")
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

    # tech_stack_reports: index on idea_id
    database["tech_stack_reports"].create_index(
        [("idea_id", ASCENDING)],
        name="tech_stack_idea_id_idx",
    )

    # risk_reports: index on idea_id
    database["risk_reports"].create_index(
        [("idea_id", ASCENDING)],
        name="risk_idea_id_idx",
    )

    # tracking_reports: index on idea_id
    database["tracking_reports"].create_index(
        [("idea_id", ASCENDING)],
        name="tracking_idea_id_idx",
    )

    # project_milestones: index on project_id
    database["project_milestones"].create_index(
        [("project_id", ASCENDING)],
        name="milestones_project_id_idx",
    )


def is_mongo_available() -> bool:
    """Check MongoDB availability."""
    global _mongo_online, client
    if _mongo_online is True:
        return True
    try:
        current_db = get_database()
        current_db.command("ping")
        _mongo_online = True
        return True
    except Exception:
        _mongo_online = None
        return False


def check_db_connection():
    """Utility to test whether the MongoDB connection is alive."""
    try:
        current_db = get_database()
        current_db.command("ping")
        return {"connected": True, "database": DB_NAME, "message": "MongoDB Atlas connected successfully!"}
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return {"connected": False, "database": DB_NAME, "error": str(e), "message": "Failed to connect to MongoDB Atlas. Check your MONGO_URI in .env"}
    except Exception as e:
        return {"connected": False, "database": DB_NAME, "error": str(e), "message": "Unexpected error connecting to MongoDB"}



# ---------------------------------------------------------------------------
# Collection helper getters & Lazy Proxies
# ---------------------------------------------------------------------------

def get_students_collection():
    return get_database()["students"]


def get_project_ideas_collection():
    return get_database()["project_ideas"]


def get_feasibility_reports_collection():
    return get_database()["feasibility_reports"]


def get_scope_reports_collection():
    return get_database()["scope_reports"]


def get_tech_stack_reports_collection():
    return get_database()["tech_stack_reports"]


def get_risk_reports_collection():
    return get_database()["risk_reports"]


def get_tracking_reports_collection():
    return get_database()["tracking_reports"]


def get_timeline_collection():
    return get_database()["timeline_projects"]


def get_mentor_conversations_collection():
    return get_database()["mentor_conversations"]


def get_progress_updates_collection():
    return get_database()["progress_updates"]


def get_plan_history_collection():
    return get_database()["plan_history"]


def get_generated_documents_collection():
    return get_database()["generated_documents"]


def get_mentor_checkins_collection():
    return get_database()["mentor_checkins"]


def get_project_plans_collection():
    return get_database()["project_plans"]


def get_skill_profiles_collection():
    return get_database()["skill_profiles"]


def get_project_milestones_collection():
    return get_database()["project_milestones"]


def get_project_analyses_collection():
    return get_database()["project_analyses"]


def get_faculty_reviews_collection():
    return get_database()["faculty_reviews"]


def get_announcements_collection():
    return get_database()["announcements"]


class _LazyCollection:
    def __init__(self, name: str):
        self._name = name

    def _col(self):
        return get_database()[self._name]

    def __getattr__(self, name):
        return getattr(self._col(), name)

    def __getitem__(self, item):
        return self._col()[item]


students_col = _LazyCollection("students")
skill_profiles_col = _LazyCollection("skill_profiles")
project_ideas_col = _LazyCollection("project_ideas")
feasibility_reports_col = _LazyCollection("feasibility_reports")
scope_reports_col = _LazyCollection("scope_reports")
tech_stack_reports_col = _LazyCollection("tech_stack_reports")
risk_reports_col = _LazyCollection("risk_reports")
tracking_reports_col = _LazyCollection("tracking_reports")
project_analyses_col = _LazyCollection("project_analyses")
project_milestones_col = _LazyCollection("project_milestones")
faculty_reviews_col = _LazyCollection("faculty_reviews")
announcements_col = _LazyCollection("announcements")
counters_col = _LazyCollection("counters")


def get_next_id(sequence_name: str) -> int:
    """Generate an auto-incrementing integer ID for a given sequence name."""
    try:
        from pymongo import ReturnDocument
        counters = get_database()["counters"]
        ret = counters.find_one_and_update(
            {"_id": sequence_name},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        if ret and "seq" in ret:
            return int(ret["seq"])
    except Exception:
        pass

    try:
        return get_database()[sequence_name].count_documents({}) + 1
    except Exception:
        import time
        return int(time.time() % 100000)

