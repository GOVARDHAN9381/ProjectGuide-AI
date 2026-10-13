from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel


class OnboardingRequest(BaseModel):
    firstName: str
    lastName: Optional[str] = ""
    email: str
    rollNo: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""
    skills: Optional[Dict[str, int]] = {}
    otherSkills: Optional[str] = ""
    domains: Optional[List[str]] = []
    otherDomains: Optional[str] = ""
    aboutMe: Optional[str] = ""
    teamSize: Optional[str] = "3"


class OnboardingResponse(BaseModel):
    student_id: Union[str, int]
    status: str


class UploadedFile(BaseModel):
    name: str
    size: int
    type: str
    uploadedAt: Optional[str] = ""


class IdeaRequest(BaseModel):
    student_id: Union[str, int]
    student_email: Optional[str] = ""
    user_email: Optional[str] = ""
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    durationUnit: Optional[str] = "days"   # "days" or "weeks"
    techIdeas: Optional[str] = ""
    refLink: Optional[str] = ""
    features: Optional[List[str]] = []
    uploadedFiles: Optional[List[UploadedFile]] = []


class IdeaResponse(BaseModel):
    idea_id: Union[str, int]
    status: str
    idea: Optional[Dict[str, Union[str, int, float, bool, list, dict, None]]] = None
    feasibility_score: Optional[int] = 85
    tech_stack: Optional[List[str]] = []
    milestones: Optional[List[dict]] = []


class FileUpload(BaseModel):
    name: str
    contentBase64: str
    contentType: str


class FeasibilityRequest(BaseModel):
    idea_id: Optional[Union[str, int]] = ""
    student_email: Optional[str] = ""
    title: str = "Academic Project"
    desc: Optional[str] = ""
    domain: Optional[str] = "web"
    teamSize: Optional[Union[str, int]] = "3"
    durationDays: Optional[Union[int, str]] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[Any]] = []
    studentSkills: Optional[Dict[str, Any]] = {}
    uploadedFiles: Optional[List[Any]] = []


class FeasibilityMetrics(BaseModel):
    technical: int
    timeline: int
    resource: int
    skillMatch: int


class FeasibilityResponse(BaseModel):
    overallScore: int
    verdict: str
    metrics: FeasibilityMetrics
    strengths: List[str]
    bottlenecks: List[str]
    filesAnalyzed: Optional[List[str]] = []
    aiGenerated: Optional[bool] = False

class ScopeRequest(BaseModel):
    idea_id: Optional[Union[str, int]] = ""
    student_email: Optional[str] = ""
    title: str = "Academic Project"
    desc: Optional[str] = ""
    domain: Optional[str] = "web"
    teamSize: Optional[Union[str, int]] = "3"
    durationDays: Optional[Union[int, str]] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[Any]] = []
    studentSkills: Optional[Dict[str, Any]] = {}
    uploadedFiles: Optional[List[Any]] = []
    # Agent chaining: Feasibility report passed from Agent 1
    feasibilityReport: Optional[Any] = None


class ScopeResponse(BaseModel):
    problemStatement: str
    objectives: List[str]
    inScope: List[str]
    outOfScope: List[str]
    targetUsers: str
    keyDeliverables: List[str]
    assumptions: List[str]
    constraints: List[str]
    overallScore: Optional[int] = None
    metrics: Optional[Dict] = None
    # Agent chaining: Feasibility Agent (Agent 1) output is forwarded in the
    # scope response so the frontend and downstream agents always have it.
    feasibilityReport: Optional[Any] = None
    feasibilityAlignment: Optional[str] = None
    aiGenerated: Optional[bool] = False


# ── Tech Stack Agent (Agent 3) ────────────────────────────────────────────────

class TechStackRequest(BaseModel):
    idea_id: Optional[Union[str, int]] = ""
    student_email: Optional[str] = ""
    title: str = "Academic Project"
    desc: Optional[str] = ""
    domain: Optional[str] = "web"
    teamSize: Optional[Union[str, int]] = "3"
    durationDays: Optional[Union[int, str]] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[Any]] = []
    studentSkills: Optional[Dict[str, Any]] = {}
    # Agent chaining: outputs from Agent 1 and Agent 2 are required
    feasibilityReport: Optional[Any] = None  # output from Feasibility Agent
    scopeReport: Optional[Any] = None        # output from Scope Agent


class TechStackLayer(BaseModel):
    frontend: str
    backend: str
    database: str
    apis: str
    devops: str
    testing: str


class TechStackAlternative(BaseModel):
    layer: str
    alternative: str
    tradeoff: str


class TechStackResponse(BaseModel):
    recommendedStack: TechStackLayer
    reasoning: List[str]          # step-by-step reasoning chain (the key feature)
    alternatives: List[TechStackAlternative]
    justification: str
    learningResources: List[str]
    aiGenerated: Optional[bool] = False


# ── Tracking Agent (Agent 4) ──────────────────────────────────────────────────

class TrackingMilestoneItem(BaseModel):
    id: int
    phase: str
    weekLabel: str
    title: str
    description: str
    deliverables: List[str]
    acceptanceCriteria: List[str]
    dependencies: Optional[List[str]] = []
    estimatedEffortHours: Optional[int] = 24
    status: Optional[str] = "pending"
    completed: Optional[bool] = False
    completedAt: Optional[str] = None


class TrackingRequest(BaseModel):
    idea_id: Optional[Union[str, int]] = ""
    student_email: Optional[str] = ""
    title: str = "Academic Project"
    desc: Optional[str] = ""
    domain: Optional[str] = "web"
    teamSize: Optional[Union[str, int]] = "3"
    durationDays: Optional[Union[int, str]] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[Any]] = []
    studentSkills: Optional[Dict[str, Any]] = {}
    # Agent chaining: upstream reports from Agents 1, 2, and 3
    feasibilityReport: Optional[Any] = None
    scopeReport: Optional[Any] = None
    techStackReport: Optional[Any] = None


class TrackingResponse(BaseModel):
    overallProgress: int
    totalMilestones: int
    milestonesDone: int
    milestones: List[TrackingMilestoneItem]
    sprintMethodology: str
    immediateActionItems: List[str]
    facultyCheckpoints: List[str]
    trackingMetrics: Dict[str, Any]
    aiGenerated: Optional[bool] = False


class MilestoneToggleRequest(BaseModel):
    idea_id: Optional[Union[str, int]] = ""
    title: Optional[str] = ""
    milestone_id: int
    completed: bool


class MilestoneToggleResponse(BaseModel):
    milestone_id: int
    completed: bool
    milestonesDone: int
    totalMilestones: int
    overallProgress: int


# ── Projects router schemas ───────────────────────────────────────────────────

class MilestoneItem(BaseModel):
    id: str
    phase_index: int
    week: Optional[str] = ""
    title: str
    desc: Optional[str] = ""
    deliverables: Optional[List[str]] = []
    is_completed: bool = False


class ProjectResponse(BaseModel):
    id: str
    student_id: str
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    status: Optional[str] = "pending_review"
    feasibility: Optional[int] = 0
    techStack: Optional[Any] = None
    milestonesDone: Optional[int] = 0
    submittedAt: Optional[str] = ""
    milestones: Optional[List[MilestoneItem]] = []
    analysis: Optional[Dict[str, Any]] = None


# ── Timeline agent router schemas ─────────────────────────────────────────────

class TimelineCreateRequest(BaseModel):
    project_name: str
    deadline: int
    hours_per_day: Optional[float] = 4.0
    completed_tasks: Optional[str] = "None"


class TimelineProgressUpdateRequest(BaseModel):
    project_id: str
    task_index: int
    progress: int

