"""
Sync Local JSON Data to MongoDB Atlas
Run this script whenever your MongoDB Atlas cluster is online/accessible.
"""
import sys
from database import check_db_connection, sync_local_data_to_mongodb

def main():
    print("=" * 60)
    print("ProjectGuide-AI -- MongoDB Atlas Sync Utility")
    print("=" * 60)
    print("\n1. Testing MongoDB Atlas connection...")
    health = check_db_connection()
    if not health.get("connected"):
        print("\n[ERROR] Error connecting to MongoDB Atlas:")
        print(f"   {health.get('error')}")
        print("\n[ACTION REQUIRED]:")
        print("   1. Log in to https://cloud.mongodb.com")
        print("   2. Go to 'Security' -> 'Network Access'")
        print("   3. Click 'Add IP Address'")
        print("   4. Choose 'Allow Access from Anywhere' (0.0.0.0/0) or add your current IP")
        print("   5. Click 'Confirm' and wait ~1 minute for it to become active")
        print("   6. Run this script again: python sync_to_mongo.py\n")
        sys.exit(1)

    print("[OK] Successfully connected to MongoDB Atlas database:", health.get("database"))
    print("\n2. Syncing local data (users, students, ideas, reports)...")
    res = sync_local_data_to_mongodb()
    if res.get("success"):
        stats = res.get("stats", {})
        print("\n[SUCCESS] Sync Completed Successfully!")
        print(f"   * Users synced:              {stats.get('users_synced')}")
        print(f"   * Students synced:           {stats.get('students_synced')}")
        print(f"   * Ideas synced:              {stats.get('ideas_synced')}")
        print(f"   * Feasibility Reports synced:{stats.get('feasibility_synced')}")
        print(f"   * Scope Reports synced:      {stats.get('scope_synced')}")
        print(f"   * Tech Stack Reports synced: {stats.get('tech_stack_synced')}")
    else:
        print("\n[WARNING] Sync finished with warnings/errors:")
        for err in res.get("stats", {}).get("errors", []):
            print(f"   - {err}")

if __name__ == "__main__":
    main()

