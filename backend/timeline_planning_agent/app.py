import subprocess
import sys

def run_program(filename):
    subprocess.run([sys.executable, filename])

while True:

    print("\n======================================")
    print("       AI TIMELINE PLANNING AGENT")
    print("======================================\n")

    print("1. Create New Project Timeline")
    print("2. Update Task Progress")
    print("3. Check for Delays")
    print("4. Reschedule Timeline")
    print("5. Check Deadline Risk")
    print("6. Save Timeline to MongoDB")
    print("7. View Saved Projects")
    print("8. Exit")

    choice = input("\nEnter your choice: ")

    if choice == "1":
        run_program("main.py")
        run_program("timeline_from_ai.py")

    elif choice == "2":
        run_program("update_progress.py")

    elif choice == "3":
        run_program("delay_detection.py")

    elif choice == "4":
        run_program("reschedule_timeline.py")

    elif choice == "5":
        run_program("deadline_risk.py")

    elif choice == "6":
        run_program("save_to_mongodb.py")

    elif choice == "7":
        run_program("view_mongodb.py")

    elif choice == "8":
        print("\nExiting Timeline Planning Agent...")
        break

    else:
        print("\nInvalid choice. Please enter 1-8.")