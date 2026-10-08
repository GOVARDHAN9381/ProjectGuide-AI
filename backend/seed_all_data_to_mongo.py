"""
Seed All Web Application & Agent Output Data into MongoDB Atlas and Local Backup
Populates:
1. Users collection (all demo students & faculty)
2. Students collection (profiles, skills, domains)
3. Project Ideas collection (all student projects from the web platform)
4. Feasibility Reports collection (Agent 1 complete outputs)
5. Scope Reports collection (Agent 2 complete outputs)
6. Tech Stack Reports collection (Agent 3 complete outputs)
"""

import os
import json
import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load env from current directory
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

from database import (
    get_database,
    get_students_collection,
    get_project_ideas_collection,
    get_feasibility_reports_collection,
    get_scope_reports_collection,
    get_tech_stack_reports_collection,
    check_db_connection,
    sync_all_student_accounts_projects,
)

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"
STUDENTS_FILE = DATA_DIR / "students.json"
IDEAS_FILE = DATA_DIR / "ideas.json"

NOW = datetime.datetime.utcnow().isoformat()

# ---------------------------------------------------------------------------
# 1. USERS & STUDENTS DATA
# ---------------------------------------------------------------------------

SEED_USERS = {
    "arjun.sharma@college.edu.in": {
        "email": "arjun.sharma@college.edu.in",
        "password": "password123",
        "name": "Arjun Sharma",
        "role": "student",
        "rollNo": "21CS101",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 4, "opencv": 4, "react": 3, "flask": 3, "ml": 3},
        "domains": ["aiml", "web"],
        "aboutMe": "Passionate about computer vision and real-time machine learning applications.",
        "teamSize": "3",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "priya.mehta@college.edu.in": {
        "email": "priya.mehta@college.edu.in",
        "password": "password123",
        "name": "Priya Mehta",
        "role": "student",
        "rollNo": "21CS102",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"webdev": 5, "react": 4, "nodejs": 4, "python": 3, "mongodb": 4, "ds": 3},
        "domains": ["web", "aiml"],
        "aboutMe": "Full-stack developer with an interest in recommendation systems and data science.",
        "teamSize": "4",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "rahul.patel@college.edu.in": {
        "email": "rahul.patel@college.edu.in",
        "password": "password123",
        "name": "Rahul Patel",
        "role": "student",
        "rollNo": "21IT103",
        "branch": "Information Technology",
        "year": "3rd Year",
        "skills": {"iot": 4, "arduino": 4, "mqtt": 4, "webdev": 3, "python": 3, "react": 3},
        "domains": ["iot", "web"],
        "aboutMe": "IoT enthusiast building connected smart hardware and home automation tools.",
        "teamSize": "3",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "sneha.reddy@college.edu.in": {
        "email": "sneha.reddy@college.edu.in",
        "password": "password123",
        "name": "Sneha Reddy",
        "role": "student",
        "rollNo": "21DS104",
        "branch": "Data Science",
        "year": "3rd Year",
        "skills": {"python": 5, "ds": 5, "ml": 4, "pandas": 5, "tensorflow": 3, "streamlit": 4},
        "domains": ["ds", "aiml"],
        "aboutMe": "Data science researcher focusing on predictive modeling and financial time series analysis.",
        "teamSize": "2",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "anjali.singh@college.edu.in": {
        "email": "anjali.singh@college.edu.in",
        "password": "password123",
        "name": "Anjali Singh",
        "role": "student",
        "rollNo": "21CS106",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 4, "nlp": 5, "langchain": 4, "webdev": 3, "react": 3},
        "domains": ["aiml", "web"],
        "aboutMe": "Specializing in Natural Language Processing and conversational AI for healthcare & wellbeing.",
        "teamSize": "3",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "dev.malhotra@college.edu.in": {
        "email": "dev.malhotra@college.edu.in",
        "password": "password123",
        "name": "Dev Malhotra",
        "role": "student",
        "rollNo": "21EC107",
        "branch": "Electronics & Communication",
        "year": "3rd Year",
        "skills": {"solidity": 4, "ethereum": 4, "react": 3, "python": 3, "webdev": 3},
        "domains": ["blockchain", "web"],
        "aboutMe": "Building decentralized applications and smart contracts on Ethereum.",
        "teamSize": "4",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "karthik.iyer@college.edu.in": {
        "email": "karthik.iyer@college.edu.in",
        "password": "password123",
        "name": "Karthik Iyer",
        "role": "student",
        "rollNo": "21CS105",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 3, "webdev": 3, "java": 2},
        "domains": ["web"],
        "aboutMe": "CSE undergrad exploring cloud platforms and web app development.",
        "teamSize": "3",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "meera.nair@college.edu.in": {
        "email": "meera.nair@college.edu.in",
        "password": "password123",
        "name": "Meera Nair",
        "role": "student",
        "rollNo": "21CS108",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 3, "c++": 3, "webdev": 2},
        "domains": ["aiml"],
        "aboutMe": "Undergraduate student keen on algorithms and artificial intelligence.",
        "teamSize": "3",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "prof.verma@college.edu.in": {
        "email": "prof.verma@college.edu.in",
        "password": "faculty123",
        "name": "Prof. Rajesh Verma",
        "role": "faculty",
        "rollNo": "FAC001",
        "branch": "Computer Science & Engineering",
        "year": "Faculty",
        "skills": {},
        "domains": ["aiml", "web", "ds", "iot", "blockchain"],
        "aboutMe": "Head of Projects & Capstone Evaluation Committee.",
        "teamSize": "",
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    }
}


# ---------------------------------------------------------------------------
# 2. COMPLETE PROJECT IDEAS & AGENT OUTPUTS (FEASIBILITY, SCOPE, TECH STACK)
# ---------------------------------------------------------------------------

SEED_PROJECTS = {
    "idea_arjun_attendance": {
        "student_id": "arjun.sharma@college.edu.in",
        "student_email": "arjun.sharma@college.edu.in",
        "title": "Smart Attendance System",
        "desc": "A facial recognition based attendance system with real-time video stream processing and automated class analytics dashboard.",
        "domain": "aiml",
        "team_size": "3",
        "duration_days": 60,
        "duration_unit": "days",
        "tech_ideas": "Python, OpenCV, Flask, React, SQLite",
        "refLink": "https://github.com/opencv/opencv",
        "features": ["Face Detection via OpenCV Haar Cascades", "Student Enrollment & Verification", "Real-time Attendance Logging", "Faculty Export to CSV"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-15T10:30:00Z",
        "idea_id": "idea_arjun_attendance",
        "id": "idea_arjun_attendance",
        "feasibility": 92,
        "feasibilityReport": {
            "overallScore": 92,
            "verdict": "Highly Feasible",
            "metrics": {
                "technical": 90,
                "timeline": 95,
                "resource": 92,
                "skillMatch": 91
            },
            "strengths": [
                "Strong student proficiency in Python (4/5) and OpenCV (4/5) directly matches core face detection requirements.",
                "60-day timeline with a 3-member team provides adequate buffer for model calibration and dashboard integration.",
                "Use of standard USB webcams and lightweight embeddings ensures low hardware barrier."
            ],
            "bottlenecks": [
                "Lighting variations and occlusions (masks/glasses) in lecture halls may require preprocessing contrast equalization.",
                "Ensure privacy compliance with secure local storage of biometric vector embeddings."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "Manual roll calls in large university classrooms waste 10-15 minutes per lecture and suffer from proxy attendance.",
            "objectives": [
                "Automate multi-face recognition from classroom webcam feeds within 2 seconds.",
                "Log timestamps and mark student presence automatically in the database.",
                "Provide faculty with an intuitive dashboard for attendance auditing and report generation."
            ],
            "inScope": [
                "Real-time face detection using OpenCV and face_recognition library.",
                "Student registration portal with multi-angle photo capture.",
                "Daily attendance database logging with timestamp and confidence score.",
                "Faculty analytics dashboard with export to Excel/CSV."
            ],
            "outOfScope": [
                "Integration with university ERP proprietary databases during Phase 1.",
                "CCTV hardware PTZ control and infrared night vision recognition.",
                "Mobile biometric push notifications."
            ],
            "targetUsers": "College faculty, department administrators, and registered students.",
            "keyDeliverables": [
                "Core Python facial recognition pipeline service.",
                "React + Flask web portal for faculty.",
                "SQLite/PostgreSQL database schema for logs and embeddings.",
                "Project documentation and test dataset benchmark results."
            ],
            "assumptions": [
                "Standard classroom lighting and HD webcam (720p or 1080p) are available.",
                "Student photos are captured during initial semester onboarding."
            ],
            "constraints": [
                "Execution must run on standard laptop GPU/CPU without expensive cloud TPU requirements."
            ],
            "overallScore": 88,
            "metrics": {"clarity": 90, "scopeControl": 88, "achievability": 92, "completeness": 85},
            "feasibilityAlignment": "Scope boundaries perfectly align with the 92% feasibility score and team skill profile.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "React 18 (Vite) + TailwindCSS for interactive faculty dashboard",
                "backend": "Flask 2.3 (Python 3.10) with Flask-CORS and RESTful endpoints",
                "database": "SQLite / PostgreSQL for metadata; FAISS for fast face vector search",
                "apis": "OpenCV dlib face_recognition API over WebSocket/REST",
                "devops": "Docker container for reproducible OpenCV/dlib installation",
                "testing": "Pytest for recognition accuracy metrics, Jest for frontend components"
            },
            "reasoning": [
                "Python and OpenCV match Arjun's top skill strengths (4/5).",
                "Flask keeps the backend lightweight for streaming frames without heavy framework overhead.",
                "React provides responsive table rendering for live attendance ticks."
            ],
            "alternatives": [
                {"layer": "backend", "alternative": "FastAPI", "tradeoff": "Higher async throughput but slightly steeper setup for dlib C++ bindings."},
                {"layer": "frontend", "alternative": "Streamlit", "tradeoff": "Faster initial UI build but less customizable for faculty table editing."}
            ],
            "justification": "Optimal balance of proven computer vision libraries and modern responsive web tooling for a 60-day capstone.",
            "learningResources": [
                "OpenCV Official Tutorials — https://docs.opencv.org/",
                "Face Recognition Python Library — https://github.com/ageitgey/face_recognition",
                "Flask REST Guide — https://flask.palletsprojects.com/"
            ],
            "aiGenerated": True
        }
    },
    "idea_priya_ecommerce": {
        "student_id": "priya.mehta@college.edu.in",
        "student_email": "priya.mehta@college.edu.in",
        "title": "E-Commerce Recommendation Engine",
        "desc": "Product recommendation engine utilizing collaborative filtering and content-based algorithms integrated into a modern web store.",
        "domain": "web",
        "team_size": "4",
        "duration_days": 45,
        "duration_unit": "days",
        "tech_ideas": "React, Node.js, Express, MongoDB, Scikit-learn",
        "refLink": "https://react.dev",
        "features": ["Product Catalog with Search & Filter", "User Interaction Tracking (Clicks/Purchases)", "Collaborative Filtering ML Pipeline", "Personalized Product Grid"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-20T11:00:00Z",
        "idea_id": "idea_priya_ecommerce",
        "id": "idea_priya_ecommerce",
        "feasibility": 85,
        "feasibilityReport": {
            "overallScore": 85,
            "verdict": "Feasible with Clear Scope",
            "metrics": {
                "technical": 84,
                "timeline": 86,
                "resource": 88,
                "skillMatch": 83
            },
            "strengths": [
                "Team excels in web development (5/5) and modern React/Node architecture.",
                "Collaborative filtering matrix factorization algorithms can be easily implemented with Python Scikit-learn."
            ],
            "bottlenecks": [
                "Cold-start problem for new users/items needs a content-based fallback mechanism.",
                "Decoupling the ML scoring engine from the Node.js API server to prevent latency spikes."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "Online shoppers struggle to discover relevant niche products without smart personalized recommendations.",
            "objectives": [
                "Build a complete e-commerce storefront with cart and catalog.",
                "Train an ML recommendation model on open benchmark datasets (e.g. MovieLens/Amazon reviews).",
                "Serve real-time 'Recommended for You' and 'Frequently Bought Together' sections."
            ],
            "inScope": [
                "MERN stack (MongoDB, Express, React, Node.js) web shop.",
                "Python microservice running Matrix Factorization (SVD) and Cosine Similarity.",
                "RESTful API integration between Express backend and Python ML service."
            ],
            "outOfScope": [
                "Real payment gateway processing (use mock Stripe sandbox).",
                "Multi-warehouse logistics tracking and international tax calculations."
            ],
            "targetUsers": "Online shoppers and e-commerce site managers.",
            "keyDeliverables": [
                "React client application.",
                "Express API + Python recommendation microservice.",
                "MongoDB product and interaction database."
            ],
            "assumptions": ["Mock product dataset of at least 500 items and 5,000 synthetic interactions."],
            "constraints": ["4-member team across 45 academic days."],
            "overallScore": 82,
            "metrics": {"clarity": 85, "scopeControl": 80, "achievability": 84, "completeness": 80},
            "feasibilityAlignment": "Scope clearly separates the web storefront from ML microservices for parallel team workflow.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "React 18 + Redux Toolkit + TailwindCSS",
                "backend": "Node.js (Express) for store API + FastAPI (Python) for ML recommendations",
                "database": "MongoDB Atlas for store catalog and user carts",
                "apis": "REST over JSON with JWT user authentication",
                "devops": "Docker Compose for running Node.js + FastAPI + Mongo locally",
                "testing": "Postman / Newman for API test suites; Jest for React components"
            },
            "reasoning": [
                "Priya's 5/5 web development skill allows rapid frontend & Node API completion.",
                "FastAPI Python service cleanly handles the linear algebra and Scikit-learn predictions."
            ],
            "alternatives": [
                {"layer": "ml_service", "alternative": "TensorFlow.js in Node", "tradeoff": "Avoids dual languages but slower training and fewer tabular ML utilities than Scikit-learn."}
            ],
            "justification": "Leverages team's full-stack strength while maintaining modular separation of concerns.",
            "learningResources": [
                "Scikit-Learn Collaborative Filtering — https://scikit-learn.org/",
                "MERN Stack Architecture — https://www.mongodb.com/mern-stack"
            ],
            "aiGenerated": True
        }
    },
    "idea_rahul_iot": {
        "student_id": "rahul.patel@college.edu.in",
        "student_email": "rahul.patel@college.edu.in",
        "title": "IoT Smart Home Dashboard",
        "desc": "Centralized web dashboard and telemetry platform for smart home sensors with automated scheduling and energy optimization rules.",
        "domain": "iot",
        "team_size": "3",
        "duration_days": 50,
        "duration_unit": "days",
        "tech_ideas": "ESP32/Arduino, MQTT (Mosquitto), Node.js, React, Chart.js",
        "refLink": "https://mqtt.org",
        "features": ["ESP32 Temperature/Humidity & Light Sensor Nodes", "MQTT Broker for Real-time Pub/Sub", "Interactive Dashboard with Live Gauges", "Appliance Relay Control & Automation Rules"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-22T08:00:00Z",
        "idea_id": "idea_rahul_iot",
        "id": "idea_rahul_iot",
        "feasibility": 88,
        "feasibilityReport": {
            "overallScore": 88,
            "verdict": "Feasible and Well-Engineered",
            "metrics": {"technical": 89, "timeline": 87, "resource": 85, "skillMatch": 90},
            "strengths": [
                "Rahul has verified 4/5 proficiency in IoT hardware, Arduino, and MQTT protocols.",
                "Using low-cost ESP32 microcontrollers ensures budget-friendly and scalable hardware prototyping."
            ],
            "bottlenecks": [
                "Network disconnects and Wi-Fi latency must be handled with local sensor caching.",
                "Ensure relay switches are optically isolated for safety during AC load testing."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "Fragmented smart home devices lack a single open-source dashboard for real-time telemetry and rule-based power savings.",
            "objectives": [
                "Transmit sensor telemetry from 2+ ESP32 nodes to a local/cloud MQTT broker every 5 seconds.",
                "Render live sensor charts and toggle digital relays from any web browser.",
                "Define custom trigger rules (e.g. temperature > 28C -> turn fan ON)."
            ],
            "inScope": [
                "ESP32 firmware in C++/Arduino with Wi-Fi & MQTT client.",
                "Node.js MQTT subscriber daemon logging to database.",
                "React dashboard with WebSockets for zero-latency gauge updates."
            ],
            "outOfScope": [
                "Proprietary Apple HomeKit or Google Home cloud certification.",
                "Custom PCB mass manufacturing."
            ],
            "targetUsers": "Smart home enthusiasts, lab managers, and green building operators.",
            "keyDeliverables": [
                "Assembled hardware breadboard prototypes with DHT22 & relays.",
                "Full-stack web dashboard with automated control logic.",
                "Wiring schematics and deployment guide."
            ],
            "assumptions": ["Stable 2.4GHz Wi-Fi access in the testing laboratory."],
            "constraints": ["3 team members over 50 calendar days."],
            "overallScore": 86,
            "metrics": {"clarity": 88, "scopeControl": 85, "achievability": 87, "completeness": 84},
            "feasibilityAlignment": "Focuses on standard ESP32 protocols to avoid custom RF hardware bottlenecks.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "React 18 + Chart.js + Socket.IO-client",
                "backend": "Node.js (Express + Socket.IO + MQTT.js)",
                "database": "MongoDB Atlas / InfluxDB for time-series telemetry logs",
                "apis": "MQTT protocol over TCP (port 1883) + WebSocket for browser streaming",
                "devops": "Eclipse Mosquitto MQTT broker running on Docker / Raspberry Pi",
                "testing": "Mocha for backend unit tests; Wokwi ESP32 simulator for firmware testing"
            },
            "reasoning": [
                "Direct match for Rahul's hardware & IoT background.",
                "Socket.IO allows bidirectional communication between hardware updates and browser toggles."
            ],
            "alternatives": [
                {"layer": "broker", "alternative": "HiveMQ Cloud", "tradeoff": "Cloud-hosted with zero setup, but requires continuous internet connectivity."}
            ],
            "justification": "Industrial-standard IoT architecture perfectly suited for an academic demonstration.",
            "learningResources": [
                "Mosquitto MQTT Docs — https://mosquitto.org/",
                "Wokwi Arduino Simulator — https://wokwi.com/"
            ],
            "aiGenerated": True
        }
    },
    "idea_sneha_stock": {
        "student_id": "sneha.reddy@college.edu.in",
        "student_email": "sneha.reddy@college.edu.in",
        "title": "Stock Price Prediction Model",
        "desc": "Time-series forecasting model for financial equities using LSTM neural networks, technical indicators, and interactive Streamlit charts.",
        "domain": "ds",
        "team_size": "2",
        "duration_days": 35,
        "duration_unit": "days",
        "tech_ideas": "Python, LSTM (Keras/TensorFlow), Pandas, Yahoo Finance API, Streamlit",
        "refLink": "https://streamlit.io",
        "features": ["Yahoo Finance Live Ticker Data Fetching", "Technical Indicator Computation (RSI, MACD, SMA)", "LSTM Multi-day Time Series Forecasting", "Backtesting & Accuracy Evaluation (RMSE, MAPE)"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-25T16:45:00Z",
        "idea_id": "idea_sneha_stock",
        "id": "idea_sneha_stock",
        "feasibility": 79,
        "feasibilityReport": {
            "overallScore": 79,
            "verdict": "Feasible with Defined Boundaries",
            "metrics": {"technical": 78, "timeline": 80, "resource": 82, "skillMatch": 77},
            "strengths": [
                "Sneha has 5/5 mastery in Python and Data Science libraries (Pandas/NumPy).",
                "Abundance of free historical financial data via Yahoo Finance (yfinance API)."
            ],
            "bottlenecks": [
                "Market volatility and non-stationarity mean LSTM models alone cannot predict macro events; expectations must focus on trend analysis rather than financial certainty.",
                "Prevent lookahead bias and data leakage during feature normalization."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "Retail investors lack accessible tools to backtest predictive ML models alongside traditional technical indicators.",
            "objectives": [
                "Train an LSTM recurrent neural network on 5+ years of stock closing prices.",
                "Compute and visualize momentum indicators (RSI, Bollinger Bands).",
                "Provide an interactive dashboard with customizable forecast horizons (7, 14, 30 days)."
            ],
            "inScope": [
                "Automated data pipeline using yfinance.",
                "LSTM model training with Keras/TensorFlow.",
                "Interactive Streamlit web app with Plotly candlestick graphs."
            ],
            "outOfScope": [
                "High-frequency live trading execution or automated brokerage order routing.",
                "Sentiment analysis of news feeds (Phase 2 extension)."
            ],
            "targetUsers": "Finance students, algorithmic traders, and research analysts.",
            "keyDeliverables": [
                "Jupyter notebooks detailing EDA and hyperparameter tuning.",
                "Streamlit web application.",
                "Comprehensive model evaluation report (RMSE, MAE, Directional Accuracy)."
            ],
            "assumptions": ["Free tier Yahoo Finance API rate limits remain sufficient for batch pulls."],
            "constraints": ["2-member team working over 35 days."],
            "overallScore": 80,
            "metrics": {"clarity": 82, "scopeControl": 85, "achievability": 80, "completeness": 75},
            "feasibilityAlignment": "Scope bounds focus on predictive technical analysis and model evaluation metrics.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "Streamlit + Plotly interactive financial charts",
                "backend": "Python 3.10 (FastAPI / Streamlit Native Server)",
                "database": "SQLite for cached tickers; Parquet files for processed time-series features",
                "apis": "yfinance API for historical OHLCV data",
                "devops": "Streamlit Community Cloud / Render for one-click deployment",
                "testing": "Pytest for feature engineering pipelines; Scikit-learn cross-validation"
            },
            "reasoning": [
                "Streamlit matches Sneha's skill (4/5) and allows deploying a rich data science UI in under 200 lines of code.",
                "TensorFlow/Keras provides battle-tested LSTM layers."
            ],
            "alternatives": [
                {"layer": "ui", "alternative": "Dash by Plotly", "tradeoff": "More customizable CSS but takes longer to develop than Streamlit for a 2-person team."}
            ],
            "justification": "Allows the team to spend 80% of their time on feature engineering and model accuracy rather than CSS boilerplate.",
            "learningResources": [
                "Keras Time Series Forecasting — https://keras.io/examples/timeseries/",
                "Streamlit Gallery — https://streamlit.io/gallery"
            ],
            "aiGenerated": True
        }
    },
    "idea_anjali_chatbot": {
        "student_id": "anjali.singh@college.edu.in",
        "student_email": "anjali.singh@college.edu.in",
        "title": "Mental Health Chatbot",
        "desc": "An empathetic conversational AI assistant providing student mental wellness support, sentiment tracking, and guided cognitive reframing exercises.",
        "domain": "aiml",
        "team_size": "3",
        "duration_days": 40,
        "duration_unit": "days",
        "tech_ideas": "Python, LangChain, Groq/OpenAI API, HuggingFace Transformers, React",
        "refLink": "https://langchain.com",
        "features": ["Empathetic Conversational Dialogue", "Real-time Sentiment & Mood Analysis", "Crisis Keyword Escalation Protocol", "Daily Mood Journaling & Resource Library"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-28T11:00:00Z",
        "idea_id": "idea_anjali_chatbot",
        "id": "idea_anjali_chatbot",
        "feasibility": 91,
        "feasibilityReport": {
            "overallScore": 91,
            "verdict": "Highly Feasible with Safety Guards",
            "metrics": {"technical": 92, "timeline": 90, "resource": 93, "skillMatch": 89},
            "strengths": [
                "Anjali possesses top NLP skill (5/5) and practical LangChain knowledge.",
                "Modern LLM APIs (Groq/Llama-3) enable high empathy scoring with low latency."
            ],
            "bottlenecks": [
                "Strict safety boundaries and medical disclaimer protocols must be enforced for crisis queries.",
                "User conversation history must be anonymized and encrypted."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "College students face academic anxiety and lack 24/7 confidential listening support and guided mindfulness techniques.",
            "objectives": [
                "Provide an empathetic chatbot interface for stress reduction and self-reflection.",
                "Detect emergency keywords and immediately display emergency helpline numbers.",
                "Track weekly mood trends on a private student dashboard."
            ],
            "inScope": [
                "LangChain conversational memory agent with custom empathetic prompting.",
                "HuggingFace RoBERTa sentiment classification model for mood logging.",
                "React conversational UI with voice dictation input."
            ],
            "outOfScope": [
                "Replacing certified psychological therapy or prescribing clinical medication.",
                "Audio voice synthesis (Phase 2)."
            ],
            "targetUsers": "University students experiencing exam stress, anxiety, or seeking daily wellness check-ins.",
            "keyDeliverables": [
                "Full-stack React + FastAPI application.",
                "Safety-evaluated prompt templates and guardrail test reports.",
                "Mood analytics dashboard."
            ],
            "assumptions": ["Free/student credits for LLM API inference."],
            "constraints": ["Strict adherence to academic ethics and user privacy guidelines."],
            "overallScore": 89,
            "metrics": {"clarity": 92, "scopeControl": 90, "achievability": 88, "completeness": 86},
            "feasibilityAlignment": "Enforces strict safety guardrails and clear medical disclaimers.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "React 18 + Lucide Icons + TailwindCSS",
                "backend": "FastAPI (Python 3.10) with LangChain and LlamaIndex",
                "database": "MongoDB Atlas for encrypted conversation logs; ChromaDB for vector memory",
                "apis": "Groq Llama-3-70b-versatile for ultra-fast conversational inference",
                "devops": "Docker container on Render.com or Hugging Face Spaces",
                "testing": "Pytest with LLM prompt regression test cases"
            },
            "reasoning": [
                "LangChain and NLP match Anjali's 5/5 skill proficiency.",
                "Groq API provides instantaneous conversational responses with zero cold-start delay."
            ],
            "alternatives": [
                {"layer": "llm", "alternative": "Local HuggingFace Llama-3-8B", "tradeoff": "Zero API cost and total privacy, but requires an 8GB VRAM GPU."}
            ],
            "justification": "Combines state-of-the-art NLP tooling with robust student safety constraints.",
            "learningResources": [
                "LangChain Documentation — https://python.langchain.com/",
                "Groq Cloud API Console — https://console.groq.com/"
            ],
            "aiGenerated": True
        }
    },
    "idea_dev_blockchain": {
        "student_id": "dev.malhotra@college.edu.in",
        "student_email": "dev.malhotra@college.edu.in",
        "title": "Blockchain Voting System",
        "desc": "A decentralized, immutable electronic voting dApp with voter eligibility verification, smart contract ballot tallying, and transparent ledger auditing.",
        "domain": "blockchain",
        "team_size": "4",
        "duration_days": 45,
        "duration_unit": "days",
        "tech_ideas": "Solidity, Ethereum (Sepolia Testnet), Hardhat, React, Ethers.js, MetaMask",
        "refLink": "https://ethereum.org",
        "features": ["Smart Contract Ballot Initialization", "MetaMask Voter Authentication", "One-Person-One-Vote Cryptographic Guarantee", "Real-Time Transparent Vote Tallying"],
        "uploaded_files": [],
        "status": "reviewed",
        "created_at": "2026-08-26T17:00:00Z",
        "idea_id": "idea_dev_blockchain",
        "id": "idea_dev_blockchain",
        "feasibility": 83,
        "feasibilityReport": {
            "overallScore": 83,
            "verdict": "Feasible on Testnet",
            "metrics": {"technical": 85, "timeline": 82, "resource": 86, "skillMatch": 81},
            "strengths": [
                "Dev has 4/5 proficiency in Solidity smart contracts and Ethereum ecosystem tools.",
                "Deploying on Ethereum Sepolia Testnet eliminates real cryptocurrency transaction costs."
            ],
            "bottlenecks": [
                "Gas optimization in smart contract voting loops.",
                "Handling wallet connection states and transaction confirmation timeouts in the React UI."
            ],
            "filesAnalyzed": [],
            "aiGenerated": True
        },
        "scopeReport": {
            "problemStatement": "Traditional student council elections suffer from allegations of ballot tampering, lack of voter auditability, and delayed manual counting.",
            "objectives": [
                "Deploy an audited Solidity smart contract that guarantees tamper-proof voting.",
                "Allow registered students to cast their encrypted ballot via MetaMask in under 30 seconds.",
                "Provide an unalterable, publicly auditable live tally on the blockchain."
            ],
            "inScope": [
                "Solidity Election contract with candidate registration and voting functions.",
                "Hardhat deployment and unit test scripts.",
                "React web interface using Ethers.js for Web3 contract interaction."
            ],
            "outOfScope": [
                "Zero-Knowledge (zk-SNARKs) anonymous voter identity mixing in Phase 1.",
                "Mainnet Ethereum deployment with real fiat gas fees."
            ],
            "targetUsers": "University student bodies, faculty advisors, and election commission officers.",
            "keyDeliverables": [
                "Hardhat repository with verified Solidity smart contracts.",
                "React dApp connected to Sepolia Testnet.",
                "Smart contract security audit checklist."
            ],
            "assumptions": ["All student voters have access to a desktop browser with MetaMask installed."],
            "constraints": ["4 team members working across 45 days on Sepolia Testnet."],
            "overallScore": 81,
            "metrics": {"clarity": 84, "scopeControl": 80, "achievability": 83, "completeness": 78},
            "feasibilityAlignment": "Scope bounds focus on core decentralized voting without complex zk-proof overhead.",
            "aiGenerated": True
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "React 18 + Ethers.js v6 + TailwindCSS",
                "backend": "Hardhat Local Node & Sepolia Testnet RPC (Alchemy / Infura)",
                "database": "Smart Contract State on Ethereum Blockchain + IPFS for candidate manifestos",
                "apis": "Web3 JSON-RPC via MetaMask wallet provider",
                "devops": "Hardhat CI for contract compilation and automated gas reporting",
                "testing": "Chai & Mocha for Solidity contract unit tests; Ethers.js for frontend testing"
            },
            "reasoning": [
                "Matches Dev's 4/5 Solidity and Web3 capabilities.",
                "Hardhat provides the best developer experience for automated smart contract testing."
            ],
            "alternatives": [
                {"layer": "contract_framework", "alternative": "Foundry (Rust-based)", "tradeoff": "Faster test execution but steeper learning curve than Hardhat JavaScript."}
            ],
            "justification": "Industry-standard Ethereum dApp stack with zero mainnet financial liability.",
            "learningResources": [
                "Hardhat Official Tutorial — https://hardhat.org/tutorial",
                "Ethers.js v6 Documentation — https://docs.ethers.org/v6/"
            ],
            "aiGenerated": True
        }
    }
}


def main():
    print("=" * 70)
    print("ProjectGuide-AI -- Comprehensive MongoDB Atlas Seeding Utility")
    print("=" * 70)

    # 1. Verify Connection
    print("\n1. Verifying MongoDB Atlas connection...")
    conn = check_db_connection()
    if not conn.get("connected"):
        print(f"[ERROR] Error connecting to MongoDB: {conn.get('error')}")
        return

    print(f"[OK] Connected to MongoDB Atlas Database: {conn.get('database')}")
    db = get_database()

    # 2. Seed Users
    print("\n2. Populating 'users' collection...")
    users_col = db["users"]
    users_count = 0
    # Read existing local users first
    local_users = {}
    if USERS_FILE.exists():
        try:
            local_users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    for email, u_data in SEED_USERS.items():
        clean_email = email.strip().lower()
        users_col.update_one({"email": clean_email}, {"$set": u_data}, upsert=True)
        local_users[clean_email] = u_data
        users_count += 1

    USERS_FILE.write_text(json.dumps(local_users, indent=2), encoding="utf-8")
    print(f"   * Synced {users_count} users to MongoDB Atlas and local users.json")

    # 3. Seed Students
    print("\n3. Populating 'students' collection...")
    students_col = get_students_collection()
    students_count = 0
    local_students = {}
    if STUDENTS_FILE.exists():
        try:
            local_students = json.loads(STUDENTS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    for email, u_data in SEED_USERS.items():
        if u_data.get("role") == "faculty":
            continue
        clean_email = email.strip().lower()
        st_doc = {
            "first_name": u_data["name"].split()[0],
            "last_name": " ".join(u_data["name"].split()[1:]) if len(u_data["name"].split()) > 1 else "",
            "name": u_data["name"],
            "email": clean_email,
            "roll_no": u_data.get("rollNo", ""),
            "branch": u_data.get("branch", ""),
            "year": u_data.get("year", ""),
            "skills": u_data.get("skills", {}),
            "domains": u_data.get("domains", []),
            "about_me": u_data.get("aboutMe", ""),
            "team_size": u_data.get("teamSize", "3"),
            "updated_at": NOW
        }
        students_col.update_one({"email": clean_email}, {"$set": st_doc}, upsert=True)
        local_students[clean_email] = st_doc
        students_count += 1

    STUDENTS_FILE.write_text(json.dumps(local_students, indent=2), encoding="utf-8")
    print(f"   * Synced {students_count} student profiles to MongoDB Atlas and local students.json")

    # 4. Seed Project Ideas and Agent Reports
    print("\n4. Populating 'project_ideas', 'feasibility_reports', 'scope_reports', and 'tech_stack_reports' collections...")
    ideas_col = get_project_ideas_collection()
    feas_col = get_feasibility_reports_collection()
    scope_col = get_scope_reports_collection()
    tech_col = get_tech_stack_reports_collection()

    local_ideas = {}
    if IDEAS_FILE.exists():
        try:
            local_ideas = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    ideas_count = 0
    feas_count = 0
    scope_count = 0
    tech_count = 0

    # Combine seed projects with any already existing in local ideas
    all_projects = {**local_ideas, **SEED_PROJECTS}

    for i_id, p_doc in all_projects.items():
        clean_pdoc = {k: v for k, v in p_doc.items() if k != "_id"}
        clean_pdoc["idea_id"] = i_id
        clean_pdoc["id"] = i_id

        # 4a. Update project_ideas
        ideas_col.update_one({"idea_id": i_id}, {"$set": clean_pdoc}, upsert=True)
        local_ideas[i_id] = clean_pdoc
        ideas_count += 1

        # 4b. Update feasibility_reports
        if p_doc.get("feasibilityReport"):
            feas_doc = {
                "idea_id": i_id,
                "student_id": p_doc.get("student_id") or p_doc.get("student_email"),
                "student_email": p_doc.get("student_email") or p_doc.get("student_id"),
                "project_title": p_doc.get("title"),
                "project_desc": p_doc.get("desc"),
                "domain": p_doc.get("domain"),
                "overall_score": p_doc["feasibilityReport"].get("overallScore"),
                "verdict": p_doc["feasibilityReport"].get("verdict"),
                "metrics": p_doc["feasibilityReport"].get("metrics", {}),
                "strengths": p_doc["feasibilityReport"].get("strengths", []),
                "bottlenecks": p_doc["feasibilityReport"].get("bottlenecks", []),
                "files_analyzed": p_doc["feasibilityReport"].get("filesAnalyzed", []),
                "ai_generated": p_doc["feasibilityReport"].get("aiGenerated", True),
                "updated_at": NOW
            }
            feas_col.update_one({"idea_id": i_id}, {"$set": feas_doc}, upsert=True)
            feas_count += 1

        # 4c. Update scope_reports
        if p_doc.get("scopeReport"):
            scope_doc = {
                "idea_id": i_id,
                "student_id": p_doc.get("student_id") or p_doc.get("student_email"),
                "student_email": p_doc.get("student_email") or p_doc.get("student_id"),
                "project_title": p_doc.get("title"),
                "project_desc": p_doc.get("desc"),
                "domain": p_doc.get("domain"),
                "problem_statement": p_doc["scopeReport"].get("problemStatement", ""),
                "objectives": p_doc["scopeReport"].get("objectives", []),
                "in_scope": p_doc["scopeReport"].get("inScope", []),
                "out_of_scope": p_doc["scopeReport"].get("outOfScope", []),
                "target_users": p_doc["scopeReport"].get("targetUsers", ""),
                "key_deliverables": p_doc["scopeReport"].get("keyDeliverables", []),
                "assumptions": p_doc["scopeReport"].get("assumptions", []),
                "constraints": p_doc["scopeReport"].get("constraints", []),
                "overall_score": p_doc["scopeReport"].get("overallScore", 80),
                "metrics": p_doc["scopeReport"].get("metrics", {}),
                "ai_generated": p_doc["scopeReport"].get("aiGenerated", True),
                "updated_at": NOW
            }
            scope_col.update_one({"idea_id": i_id}, {"$set": scope_doc}, upsert=True)
            scope_count += 1

        # 4d. Update tech_stack_reports
        if p_doc.get("techStackReport"):
            tech_doc = {
                "idea_id": i_id,
                "student_id": p_doc.get("student_id") or p_doc.get("student_email"),
                "student_email": p_doc.get("student_email") or p_doc.get("student_id"),
                "project_title": p_doc.get("title"),
                "project_desc": p_doc.get("desc"),
                "domain": p_doc.get("domain"),
                "recommended_stack": p_doc["techStackReport"].get("recommendedStack", {}),
                "reasoning": p_doc["techStackReport"].get("reasoning", []),
                "alternatives": p_doc["techStackReport"].get("alternatives", []),
                "justification": p_doc["techStackReport"].get("justification", ""),
                "learning_resources": p_doc["techStackReport"].get("learningResources", []),
                "ai_generated": p_doc["techStackReport"].get("aiGenerated", True),
                "updated_at": NOW
            }
            tech_col.update_one({"idea_id": i_id}, {"$set": tech_doc}, upsert=True)
            tech_count += 1

    IDEAS_FILE.write_text(json.dumps(local_ideas, indent=2), encoding="utf-8")
    print(f"   * Synced {ideas_count} Project Ideas to MongoDB Atlas and ideas.json")
    print(f"   * Synced {feas_count} Feasibility Reports (Agent 1) to MongoDB Atlas")
    print(f"   * Synced {scope_count} Scope Reports (Agent 2) to MongoDB Atlas")
    print(f"   * Synced {tech_count} Tech Stack Reports (Agent 3) to MongoDB Atlas")

    # 5. Populate student account project folders
    print("\n5. Populating student accounts with their particular submitted project folders...")
    acc_res = sync_all_student_accounts_projects()
    print(f"   * Updated {acc_res.get('students_updated', 0)} student accounts with their project folders.")

    # 6. Final Summary
    print("\n" + "=" * 70)
    print("ALL WEB & AGENT DATA SUCCESSFULLY STORED IN MONGODB ATLAS!")
    print("=" * 70)
    for col_name in sorted(db.list_collection_names()):
        print(f"   * Collection {col_name:25} -> {db[col_name].count_documents({})} documents")
    print("=" * 70)


if __name__ == "__main__":
    main()
