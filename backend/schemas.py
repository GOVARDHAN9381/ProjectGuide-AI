from typing import Dict, List, Optional, Union
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


class FileUpload(BaseModel):
    name: str
    contentBase64: str
    contentType: str


class FeasibilityRequest(BaseModel):
    idea_id: Optional[str] = ""
    student_email: Optional[str] = ""
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[str]] = []
    studentSkills: Optional[Dict[str, int]] = {}
    uploadedFiles: Optional[List[FileUpload]] = []


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
    idea_id: Optional[str] = ""
    student_email: Optional[str] = ""
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[str]] = []
    studentSkills: Optional[Dict[str, int]] = {}
    uploadedFiles: Optional[List[FileUpload]] = []
    # Agent chaining: Feasibility report passed from Agent 1
    feasibilityReport: Optional[Dict] = None


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
    feasibilityReport: Optional[Dict] = None
    aiGenerated: Optional[bool] = False


# ── Tech Stack Agent (Agent 3) ────────────────────────────────────────────────

class TechStackRequest(BaseModel):
    idea_id: Optional[str] = ""
    student_email: Optional[str] = ""
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[str]] = []
    studentSkills: Optional[Dict[str, int]] = {}
    # Agent chaining: outputs from Agent 1 and Agent 2 are required
    feasibilityReport: Dict  # required — output from Feasibility Agent
    scopeReport: Dict        # required — output from Scope Agent


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


# ── Risk Assessment & Mitigation Agent (Agent 4) ──────────────────────────────

class RiskRequest(BaseModel):
    idea_id: Optional[str] = ""
    student_email: Optional[str] = ""
    title: str
    desc: str
    domain: Optional[str] = "web"
    teamSize: Optional[str] = "3"
    durationDays: Optional[int] = 30
    techIdeas: Optional[str] = ""
    features: Optional[List[str]] = []
    studentSkills: Optional[Dict[str, int]] = {}
    # Agent chaining: outputs from Agents 1, 2, and 3 are all required
    feasibilityReport: Dict   # required — output from Feasibility Agent
    scopeReport: Dict         # required — output from Scope Agent
    techStackReport: Dict     # required — output from Tech Stack Agent


class RiskItem(BaseModel):
    id: str
    title: str
    description: str
    category: str       # Technical | Timeline | Resource | Scope | External
    likelihood: str     # High | Medium | Low
    impact: str         # High | Medium | Low
    mitigation: str
    owner: str          # Student Team | Faculty | Both


class TopBlocker(BaseModel):
    title: str
    action: str


class RiskResponse(BaseModel):
    overallRisk: str              # High | Medium | Low  (traffic-light)
    riskScore: int                # 0–100 composite score
    summary: str                  # 2–3 sentence executive summary
    risks: List[RiskItem]         # Full risk register with mitigations
    topBlockers: List[TopBlocker] # Top 3 critical blockers with immediate actions
    reasoning: List[str]          # Step-by-step reasoning chain from upstream reports
    aiGenerated: Optional[bool] = False