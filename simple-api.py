#!/usr/bin/env python3
"""
Simple Judge Dredd API for localhost testing
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
import datetime
import json
import jwt
import bcrypt
from rules_engine import AIComplianceRulesEngine

app = FastAPI(
    title="Judge Dredd API",
    description="AI Compliance Control Platform API",
    version="1.0.0"
)

# Enable CORS for localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8100", "http://127.0.0.1:8100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Rules Engine
rules_engine = AIComplianceRulesEngine("decision_tree.json")

# JWT Configuration
SECRET_KEY = "judge_dredd_ai_secret_key_2025_very_secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# In-memory user database (would be replaced with real database in production)
users_db = {
    "demo@judgedredd.ai": {
        "id": "1",
        "email": "demo@judgedredd.ai",
        "first_name": "Demo",
        "last_name": "User",
        "organization": "Judge Dredd AI",
        "role": "admin",
        "hashed_password": bcrypt.hashpw("demo123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        "is_active": True,
        "is_email_verified": True,
        "created_at": datetime.datetime.now().isoformat(),
        "preferences": {
            "theme": "dark",
            "language": "da",
            "notifications": {
                "email": True,
                "push": True,
                "assessment_reminders": True,
                "compliance_updates": True
            }
        }
    }
}

# Authentication Models
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    organization: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    organization: str
    role: str
    is_email_verified: bool
    created_at: str
    preferences: dict

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Authentication Utility Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(email: str, password: str):
    user = users_db.get(email)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = users_db.get(email)
    if user is None:
        raise credentials_exception
    return user

# Enhanced Pydantic models
class QuickCheckRequest(BaseModel):
    description: str
    ai_system_type: str
    branch_sector: str
    handles_personal_data: bool
    automated_decisions: bool
    role: Optional[str] = "deployer"
    data_types: Optional[List[str]] = []
    decision_type: Optional[str] = "monitoring"
    decision_impact: Optional[List[str]] = []

class QuickCheckResponse(BaseModel):
    risk_score: int
    risk_level: str
    decision: str
    compliance_status: str
    recommendations: List[str]
    next_steps: List[str]
    requirements: List[str]
    required_assessments: List[str]
    legal_references: List[str]
    assessment_details: Dict[str, Any]

class DetailedAssessmentRequest(BaseModel):
    system_navn: str
    beskrivelse: str
    ai_system_type: str
    rolle: str
    branch_sector: str
    handles_personal_data: bool
    data_types: List[str]
    automated_decisions: bool
    decision_type: str
    decision_impact: List[str]
    additional_info: Optional[Dict[str, Any]] = {}

class AssessmentWizardResponse(BaseModel):
    steps: List[Dict[str, Any]]
    current_step: int
    total_steps: int

class Assessment(BaseModel):
    id: str
    name: str
    date: str
    risk_score: int
    status: str
    system_type: str

# Mock data
mock_assessments = [
    {
        "id": "assess-001",
        "name": "AI Chatbot for Customer Service",
        "date": "19 sep. 2025",
        "risk_score": 65,
        "status": "BETINGET GO",
        "system_type": "Conversational AI"
    },
    {
        "id": "assess-002",
        "name": "Document Classification System",
        "date": "18 sep. 2025",
        "risk_score": 25,
        "status": "GO",
        "system_type": "Document Processing"
    },
    {
        "id": "assess-003",
        "name": "Automated Hiring System",
        "date": "17 sep. 2025",
        "risk_score": 85,
        "status": "NO-GO",
        "system_type": "HR Decision Support"
    }
]

mock_categories = {
    "samlede_termer": 15,
    "juridiske_termer": 4,
    "ai_teknologi": 3,
    "tekniske_begreber": 4,
    "compliance": 4
}

mock_links = [
    {
        "title": "AI Act Conformity Assessment Guidelines",
        "organization": "Europa-Kommissionen",
        "type": "Vejledning",
        "verified": True,
        "url": "https://ec.europa.eu/ai-act"
    },
    {
        "title": "Article 29 Working Party AI Guidelines",
        "organization": "EDPB",
        "type": "Article 29 WP",
        "verified": True,
        "url": "https://edpb.europa.eu"
    }
]

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now().isoformat()}

# Enhanced quick check endpoint with rules engine
@app.post("/api/compliance/hurtig-tjek", response_model=QuickCheckResponse)
async def quick_check(request: QuickCheckRequest):
    # Convert request to rules engine format
    user_responses = {
        "description": request.description,
        "ai_system_type": request.ai_system_type,
        "branch_sector": request.branch_sector,
        "handles_personal_data": request.handles_personal_data,
        "automated_decisions": request.automated_decisions,
        "role": request.role,
        "data_types": request.data_types,
        "decision_type": request.decision_type,
        "decision_impact": request.decision_impact
    }

    # Use rules engine for assessment
    assessment_result = rules_engine.evaluate_system(user_responses)

    return QuickCheckResponse(
        risk_score=assessment_result.risk_score,
        risk_level=assessment_result.risk_level,
        decision=assessment_result.decision,
        compliance_status=assessment_result.compliance_status,
        recommendations=assessment_result.recommendations,
        next_steps=assessment_result.next_steps,
        requirements=assessment_result.requirements,
        required_assessments=assessment_result.required_assessments,
        legal_references=assessment_result.legal_references,
        assessment_details=assessment_result.assessment_details
    )

# Assessment endpoints
@app.get("/api/assessments")
async def get_assessments():
    return {"assessments": mock_assessments, "total": len(mock_assessments)}

@app.get("/api/assessments/{assessment_id}")
async def get_assessment(assessment_id: str):
    assessment = next((a for a in mock_assessments if a["id"] == assessment_id), None)
    if not assessment:
        return {"error": "Assessment not found"}
    return assessment

# Knowledge base endpoints
@app.get("/api/videnbase/categories")
async def get_categories():
    return mock_categories

@app.get("/api/videnbase/search")
async def search_knowledge(query: str = ""):
    # Mock search results
    results = [
        {
            "title": "GDPR Compliance for AI Systems",
            "category": "Juridiske Termer",
            "summary": "Comprehensive guide to GDPR compliance...",
            "relevance": 0.95
        },
        {
            "title": "AI Act Risk Categories",
            "category": "AI Teknologi",
            "summary": "Understanding EU AI Act risk classifications...",
            "relevance": 0.87
        }
    ]
    return {"results": results, "total": len(results)}

# Links endpoints
@app.get("/api/videnbase/links/relevante")
async def get_relevant_links():
    return {"links": mock_links, "total": len(mock_links)}

# News ticker endpoint with more comprehensive legal news
@app.get("/api/news/live")
async def get_live_news():
    live_news = [
        {
            "id": "1",
            "title": "BREAKING: EU AI Office udgiver omfattende retningslinjer for højrisiko AI-systemer i finanssektoren",
            "source": "Europa-Kommissionen",
            "time": "Live",
            "type": "ai",
            "priority": "high",
            "timestamp": "2025-09-25T14:20:00Z"
        },
        {
            "id": "2",
            "title": "Datatilsynet: Ny DPIA-skabelon for AI-systemer med persondata - obligatorisk fra 1. januar 2026",
            "source": "Datatilsynet",
            "time": "8 min",
            "type": "gdpr",
            "priority": "high",
            "timestamp": "2025-09-25T14:12:00Z"
        },
        {
            "id": "3",
            "title": "Højesteret: Historisk afgørelse om AI-bias i ansættelsesprocesser - virksomhed idømt bøde på 2,5 mio. kr.",
            "source": "Domstolene",
            "time": "42 min",
            "type": "legal",
            "priority": "high",
            "timestamp": "2025-09-25T13:38:00Z"
        },
        {
            "id": "4",
            "title": "OpenAI lancerer ChatGPT Enterprise Compliance Suite med indbygget GDPR og AI Act værktøjer",
            "source": "TechCrunch",
            "time": "1 t",
            "type": "ai",
            "priority": "medium",
            "timestamp": "2025-09-25T13:20:00Z"
        },
        {
            "id": "5",
            "title": "EDPB vedtager bindende retningslinjer: Alle AI-systemer med automatiserede beslutninger skal have DPIA",
            "source": "EDPB",
            "time": "2 t",
            "type": "gdpr",
            "priority": "high",
            "timestamp": "2025-09-25T12:20:00Z"
        },
        {
            "id": "6",
            "title": "Microsoft annoncerer Azure AI Compliance Center - automatisk overholdelse af EU AI Act",
            "source": "Microsoft",
            "time": "3 t",
            "type": "compliance",
            "priority": "medium",
            "timestamp": "2025-09-25T11:20:00Z"
        },
        {
            "id": "7",
            "title": "Ny McKinsey-rapport: 73% stigning i AI-relaterede GDPR-klager i 2025 - compliance-markedet vokser med 340%",
            "source": "Legal Tech News",
            "time": "4 t",
            "type": "compliance",
            "priority": "medium",
            "timestamp": "2025-09-25T10:20:00Z"
        },
        {
            "id": "8",
            "title": "Tyskland lancerer 'AI-Passport' - national godkendelsesportal for AI-systemer går live",
            "source": "Bundesregierung",
            "time": "5 t",
            "type": "ai",
            "priority": "medium",
            "timestamp": "2025-09-25T09:20:00Z"
        },
        {
            "id": "9",
            "title": "Google DeepMind offentliggør 'Responsible AI Toolkit' - open source compliance værktøjer",
            "source": "AI Research",
            "time": "6 t",
            "type": "ai",
            "priority": "low",
            "timestamp": "2025-09-25T08:20:00Z"
        },
        {
            "id": "10",
            "title": "Frankrig skærper AI Act håndhævelse: Første bøder på 35 mio. EUR til tech-giganter",
            "source": "CNIL",
            "time": "7 t",
            "type": "legal",
            "priority": "high",
            "timestamp": "2025-09-25T07:20:00Z"
        },
        {
            "id": "11",
            "title": "Stanford Law School: Ny analyse af AI Act implementering viser manglende klarhed i 34% af artiklerne",
            "source": "Stanford AI Law",
            "time": "8 t",
            "type": "legal",
            "priority": "medium",
            "timestamp": "2025-09-25T06:20:00Z"
        },
        {
            "id": "12",
            "title": "Danske virksomheder: 89% mangler stadig AI governance - kun 11% har implementeret fuld compliance",
            "source": "DI Digital",
            "time": "9 t",
            "type": "compliance",
            "priority": "medium",
            "timestamp": "2025-09-25T05:20:00Z"
        }
    ]
    return {"news": live_news, "total": len(live_news), "last_updated": datetime.datetime.now().isoformat()}

# Enhanced Dashboard Endpoints for v1.0.0

@app.get("/api/dashboard/metrics")
async def get_live_dashboard_metrics():
    """Get real-time dashboard metrics"""

    # Calculate dynamic metrics based on current time
    current_hour = datetime.datetime.now().hour
    variance = (current_hour % 24) * 0.05  # Small variance based on time

    return {
        "total_assessments": 127 + int(variance * 20),
        "completed_assessments": 98 + int(variance * 15),
        "pending_assessments": 29 + int(variance * 5),
        "average_risk_score": round(52.3 + (variance * 10), 1),
        "high_risk_systems": 12 + int(variance * 2),
        "compliance_rate": round(94.2 + (variance * 3), 1),
        "monthly_growth": round(23.5 + (variance * 5), 1),
        "active_users": 45 + int(variance * 8),
        "last_updated": datetime.datetime.now().isoformat()
    }

@app.get("/api/dashboard/compliance-history")
async def get_compliance_history(range: str = "last_30_days"):
    """Get compliance history for specified time range"""

    if range == "last_7_days":
        data_points = 7
        base_values = [92, 93, 94, 95, 94, 96, 97]
    elif range == "last_30_days":
        data_points = 30
        base_values = [90 + i * 0.2 + (i % 3) for i in range(30)]
    elif range == "last_90_days":
        data_points = 90
        base_values = [85 + i * 0.1 + (i % 7) * 0.5 for i in range(90)]
    else:  # last_year
        data_points = 365
        base_values = [80 + i * 0.05 + (i % 30) * 0.3 for i in range(365)]

    metrics = []
    for i, value in enumerate(base_values):
        date = datetime.datetime.now() - datetime.timedelta(days=data_points - i - 1)
        metrics.append({
            "date": date.isoformat(),
            "compliance_rate": round(min(100, max(80, value)), 1),
            "assessments_completed": max(0, int(value / 10) + (i % 3)),
            "risk_score": round(100 - value + (i % 5), 1)
        })

    return {
        "metrics": metrics,
        "timeRange": range,
        "summary": {
            "average_compliance": round(sum(m["compliance_rate"] for m in metrics) / len(metrics), 1),
            "trend": "increasing" if metrics[-1]["compliance_rate"] > metrics[0]["compliance_rate"] else "decreasing",
            "total_assessments": sum(m["assessments_completed"] for m in metrics)
        }
    }

@app.get("/api/dashboard/system-types")
async def get_system_type_distribution():
    """Get current distribution of AI system types"""

    # Add some dynamic variation
    current_minute = datetime.datetime.now().minute
    variance = current_minute % 10

    distribution = [
        {"type": "Generativ AI", "count": 34 + variance, "percentage": 26.8},
        {"type": "Prædiktiv Analyse", "count": 28 + (variance // 2), "percentage": 22.0},
        {"type": "Computer Vision", "count": 23 + (variance // 3), "percentage": 18.1},
        {"type": "NLP", "count": 19 + (variance // 4), "percentage": 15.0},
        {"type": "Beslutningsstøtte", "count": 15 + (variance // 5), "percentage": 11.8},
        {"type": "Andre", "count": 8 + (variance // 6), "percentage": 6.3}
    ]

    # Recalculate percentages
    total = sum(item["count"] for item in distribution)
    for item in distribution:
        item["percentage"] = round((item["count"] / total) * 100, 1)

    return {
        "distribution": distribution,
        "total_systems": total,
        "last_updated": datetime.datetime.now().isoformat()
    }

@app.get("/api/dashboard/risk-distribution")
async def get_risk_distribution():
    """Get current risk level distribution"""

    # Add dynamic variation
    current_second = datetime.datetime.now().second
    variance = current_second % 15

    distribution = [
        {
            "level": "Lav Risiko (0-39)",
            "count": 67 + variance,
            "percentage": 52.8,
            "color": "bg-green-500"
        },
        {
            "level": "Middel Risiko (40-69)",
            "count": 48 + (variance // 2),
            "percentage": 37.8,
            "color": "bg-yellow-500"
        },
        {
            "level": "Høj Risiko (70-100)",
            "count": 12 + (variance // 3),
            "percentage": 9.4,
            "color": "bg-red-500"
        }
    ]

    # Recalculate percentages
    total = sum(item["count"] for item in distribution)
    for item in distribution:
        item["percentage"] = round((item["count"] / total) * 100, 1)

    return {
        "distribution": distribution,
        "total_systems": total,
        "risk_summary": {
            "low_risk": distribution[0]["count"],
            "medium_risk": distribution[1]["count"],
            "high_risk": distribution[2]["count"]
        },
        "last_updated": datetime.datetime.now().isoformat()
    }

@app.get("/api/dashboard/activity")
async def get_recent_activity(limit: int = 10):
    """Get recent platform activity with live updates"""

    # Enhanced activity data with more variety
    activity_types = [
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-001",
            "type": "assessment_completed",
            "title": "AI Chatbot System - Compliance Godkendt",
            "description": "Færdig compliance vurdering med lav risiko score på 28 point",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=5),
            "userId": "Maria Hansen",
            "systemId": "SYS-ChatBot-001",
            "riskScore": 28,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-002",
            "type": "assessment_created",
            "title": "Ny vurdering startet - Predictive Maintenance AI",
            "description": "Avanceret predictive maintenance system til produktion",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=12),
            "userId": "Peter Larsen",
            "systemId": "SYS-PredMaint-002",
            "riskScore": None,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-003",
            "type": "compliance_updated",
            "title": "EU AI Act Opdatering Implementeret",
            "description": "Automatisk opdatering af compliance krav baseret på nye retningslinjer",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=18),
            "userId": "System",
            "systemId": None,
            "riskScore": None,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-004",
            "type": "quick_check",
            "title": "Hurtig tjek gennemført - Document AI Scanner",
            "description": "Lavrisiko system identificeret, ingen fuld vurdering nødvendig",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=25),
            "userId": "Anna Nielsen",
            "systemId": "QC-DocScan-004",
            "riskScore": 15,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-005",
            "type": "assessment_completed",
            "title": "HR Recruitment AI - DPIA Påkrævet",
            "description": "Højrisiko system kræver omfattende databeskyttelsesanalyse",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=35),
            "userId": "Lars Andersen",
            "systemId": "SYS-HRRecruit-005",
            "riskScore": 78,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-006",
            "type": "compliance_updated",
            "title": "Datatilsynet Vejledning Integreret",
            "description": "Ny DPIA skabelon automatisk tilgængelig i systemet",
            "timestamp": datetime.datetime.now() - datetime.timedelta(minutes=45),
            "userId": "System",
            "systemId": None,
            "riskScore": None,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-007",
            "type": "quick_check",
            "title": "Financial Risk AI - Betinget Godkendelse",
            "description": "Middel risiko system kræver yderligere compliance tiltag",
            "timestamp": datetime.datetime.now() - datetime.timedelta(hours=1, minutes=5),
            "userId": "Mette Sørensen",
            "systemId": "QC-FinRisk-007",
            "riskScore": 55,
        },
        {
            "id": f"ACT-{datetime.datetime.now().strftime('%H%M%S')}-008",
            "type": "assessment_created",
            "title": "Computer Vision System - Vurdering Påbegyndt",
            "description": "Ansigtsgenkendelses system til adgangskontrol",
            "timestamp": datetime.datetime.now() - datetime.timedelta(hours=1, minutes=20),
            "userId": "Thomas Jensen",
            "systemId": "SYS-FaceRecog-008",
            "riskScore": None,
        }
    ]

    # Convert timestamps to ISO format for JSON serialization
    for activity in activity_types:
        activity["timestamp"] = activity["timestamp"].isoformat()

    # Return limited results
    limited_activities = activity_types[:limit]

    return {
        "activities": limited_activities,
        "total": len(limited_activities),
        "has_more": len(activity_types) > limit,
        "last_updated": datetime.datetime.now().isoformat()
    }

# Enhanced 7-punkts assessment endpoint with rules engine
@app.post("/api/compliance/7-punkts-vurdering")
async def seven_points_assessment(request: Dict[str, Any]):
    # Use detailed assessment if available
    if all(key in request for key in ["beskrivelse", "ai_system_type", "rolle"]):
        detailed_request = DetailedAssessmentRequest(**request)
        user_responses = {
            "description": detailed_request.beskrivelse,
            "ai_system_type": detailed_request.ai_system_type,
            "role": detailed_request.rolle,
            "branch_sector": detailed_request.branch_sector,
            "handles_personal_data": detailed_request.handles_personal_data,
            "data_types": detailed_request.data_types,
            "automated_decisions": detailed_request.automated_decisions,
            "decision_type": detailed_request.decision_type,
            "decision_impact": detailed_request.decision_impact
        }

        assessment_result = rules_engine.evaluate_system(user_responses)
        ai_classification = rules_engine._classify_ai_system(user_responses)

        # Generate wizard steps based on classification
        wizard_steps = rules_engine.get_assessment_wizard_steps(ai_classification)

        return {
            "success": True,
            "vurdering_type": "7-punkts struktureret AI-vurdering (Regelbaseret)",
            "system_navn": request.get("system_navn", detailed_request.system_navn),
            "vurdering_id": f"assessment_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "ai_klassifikation": ai_classification.upper(),
            "samlet_vurdering": {
                "risikoniveau": assessment_result.risk_level.lower(),
                "compliance_score": assessment_result.risk_score,
                "beslutning": assessment_result.decision,
                "compliance_status": assessment_result.compliance_status,
                "kræver_dpia": "DPIA" in assessment_result.required_assessments,
                "kræver_fria": "FRIA" in assessment_result.required_assessments
            },
            "detaljeret_vurdering": {
                "trin_1_ai_system": {"score": 10 if ai_classification != "unacceptable" else 0, "status": "completed", "titel": "AI-system klassifikation"},
                "trin_2_persondata": {"score": 8 if assessment_result.assessment_details.get("personal_data") else 10, "status": "completed", "titel": "Persondata behandling"},
                "trin_3_gdpr": {"score": 9 if "DPIA" in assessment_result.required_assessments else 7, "status": "completed", "titel": "GDPR compliance"},
                "trin_4_ai_act": {"score": 10 - (assessment_result.risk_score // 15), "status": "completed", "titel": "AI-forordningen compliance"},
                "trin_5_training": {"score": 8, "status": "completed", "titel": "Træning og validering"},
                "trin_6_resources": {"score": 7, "status": "completed", "titel": "Ressourcer og kompetencer"},
                "trin_7_requirements": {"score": 9, "status": "completed", "titel": "Opfyldelse af krav"}
            },
            "handlingsplan": {
                "påkrævede_krav": assessment_result.requirements,
                "prioriterede_handlinger": assessment_result.next_steps[:3],
                "anbefalinger": assessment_result.recommendations[:3],
                "juridiske_referencer": assessment_result.legal_references,
                "næste_skridt": assessment_result.next_steps[3:] if len(assessment_result.next_steps) > 3 else ["Implementér compliance plan"]
            },
            "wizard_steps": wizard_steps,
            "assessment_details": assessment_result.assessment_details
        }
    else:
        # Fallback to basic assessment
        return {
            "success": True,
            "vurdering_type": "7-punkts struktureret AI-vurdering (Basis)",
            "system_navn": request.get("system_navn", "Dit AI System"),
            "vurdering_id": f"assessment_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "besked": "For en detaljeret vurdering, send venligst alle påkrævede felter",
            "påkrævede_felter": ["system_navn", "beskrivelse", "ai_system_type", "rolle", "branch_sector", "handles_personal_data", "data_types", "automated_decisions", "decision_type", "decision_impact"]
        }

# New assessment wizard endpoint
@app.get("/api/compliance/assessment-wizard/{classification}")
async def get_assessment_wizard(classification: str):
    """Get structured assessment wizard steps"""
    wizard_steps = rules_engine.get_assessment_wizard_steps(classification)

    return AssessmentWizardResponse(
        steps=wizard_steps,
        current_step=1,
        total_steps=len(wizard_steps)
    )

# New detailed assessment endpoint
@app.post("/api/compliance/detailed-assessment")
async def detailed_assessment(request: DetailedAssessmentRequest):
    """Comprehensive AI compliance assessment"""
    user_responses = {
        "description": request.beskrivelse,
        "ai_system_type": request.ai_system_type,
        "role": request.rolle,
        "branch_sector": request.branch_sector,
        "handles_personal_data": request.handles_personal_data,
        "data_types": request.data_types,
        "automated_decisions": request.automated_decisions,
        "decision_type": request.decision_type,
        "decision_impact": request.decision_impact
    }

    assessment_result = rules_engine.evaluate_system(user_responses)
    ai_classification = rules_engine._classify_ai_system(user_responses)

    return {
        "assessment_id": f"detailed_assessment_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "system_name": request.system_navn,
        "ai_classification": ai_classification,
        "timestamp": datetime.datetime.now().isoformat(),
        "result": {
            "risk_level": assessment_result.risk_level,
            "risk_score": assessment_result.risk_score,
            "decision": assessment_result.decision,
            "compliance_status": assessment_result.compliance_status,
            "requirements": assessment_result.requirements,
            "recommendations": assessment_result.recommendations,
            "next_steps": assessment_result.next_steps,
            "required_assessments": assessment_result.required_assessments,
            "legal_references": assessment_result.legal_references
        },
        "assessment_details": assessment_result.assessment_details,
        "wizard_available": True
    }

# DPIA and FRIA Assessment Templates
@app.get("/api/templates/dpia")
async def get_dpia_template():
    """Get DPIA (Data Protection Impact Assessment) template based on Danish requirements"""
    return {
        "template_name": "Konsekvensanalyse vedrørende databeskyttelse (DPIA) i AI-projekter",
        "version": "1.0",
        "legal_basis": ["GDPR artikel 35", "AI-forordningens artikel 26.9"],
        "last_updated": "2025-09-25",
        "template_structure": {
            "sammenfatning": {
                "title": "Sammenfatning",
                "description": "Overordnet sammenfatning af DPIA'en",
                "fields": [
                    "System navn og formål",
                    "Identificerede risici",
                    "Afhjælpende foranstaltninger",
                    "Samlet risikovurdering"
                ]
            },
            "indledning_baggrund": {
                "title": "Indledning og baggrund",
                "subsections": [
                    {
                        "title": "Konsekvensanalysens formål",
                        "required": True,
                        "description": "Beskriv formålet med denne DPIA"
                    },
                    {
                        "title": "Konsekvensanalysens afgrænsning",
                        "required": True,
                        "description": "Afgræns hvilke dele af AI-systemet der omfattes"
                    },
                    {
                        "title": "Baggrunden for konsekvensanalysen",
                        "required": True,
                        "description": "Årsag til at DPIA er nødvendig"
                    },
                    {
                        "title": "Forholdet til AI-forordningen",
                        "required": True,
                        "description": "Hvordan DPIA relaterer til AI Act compliance"
                    }
                ]
            },
            "trin_1_systematisk_beskrivelse": {
                "title": "TRIN 1: Systematisk beskrivelse af behandlingen af personoplysninger i AI-løsningen",
                "subsections": [
                    {
                        "title": "AI-løsningens formål og karakter",
                        "fields": [
                            "Systemets primære formål",
                            "Type af AI-teknologi",
                            "Målgruppe og anvendelsesområde"
                        ]
                    },
                    {
                        "title": "AI-løsningens behandling af personoplysninger og omfanget heraf",
                        "fields": [
                            "Kategorier af personoplysninger",
                            "Følsomme personoplysninger",
                            "Omfang af behandling",
                            "Datakilder"
                        ]
                    },
                    {
                        "title": "Sammenhæng og kontekst for behandlingen",
                        "fields": [
                            "Forretningsprocesser",
                            "Integration med andre systemer",
                            "Organisatorisk kontekst"
                        ]
                    },
                    {
                        "title": "Modtagere af personoplysninger",
                        "fields": [
                            "Interne modtagere",
                            "Eksterne parter",
                            "Tredjelandsoverførsel"
                        ]
                    },
                    {
                        "title": "Opbevaringsperiode for personoplysninger",
                        "fields": [
                            "Opbevaringsperioder",
                            "Sletningsprocedurer",
                            "Arkivering"
                        ]
                    }
                ]
            },
            "trin_2_interessenter": {
                "title": "TRIN 2: Inddragelse af relevante interessenter",
                "subsections": [
                    {
                        "title": "Databeskyttelsesrådgiver (DPO)",
                        "required": True,
                        "description": "Dokumentation af DPO involvering"
                    },
                    {
                        "title": "Registreredes synspunkter",
                        "required": True,
                        "description": "Hvordan berørte personer er inddraget"
                    }
                ]
            },
            "trin_3_lovlighed_nødvendighed": {
                "title": "TRIN 3: Projektets lovlighed, nødvendighed og proportionalitet",
                "subsections": [
                    {
                        "title": "Princippet om lovlighed, rimelighed og gennemsigtighed",
                        "assessment_areas": [
                            "Behandlingsgrundlag",
                            "Rimelighed af behandling",
                            "Gennemsigtighed overfor berørte"
                        ]
                    },
                    {
                        "title": "Princippet om formålsbegrænsning",
                        "assessment_areas": [
                            "Klart definerede formål",
                            "Forenelighed ved ændringer"
                        ]
                    },
                    {
                        "title": "Princippet om dataminimering",
                        "assessment_areas": [
                            "Adækvate data",
                            "Relevante data",
                            "Begrænsede data"
                        ]
                    },
                    {
                        "title": "Princippet om rigtighed",
                        "assessment_areas": [
                            "Datakvalitet",
                            "Opdatering af data",
                            "Fejlrettelse"
                        ]
                    },
                    {
                        "title": "Princippet om opbevaringsbegrænsning",
                        "assessment_areas": [
                            "Nødvendighedsperiode",
                            "Automatisk sletning"
                        ]
                    },
                    {
                        "title": "Princippet om integritet og fortrolighed",
                        "assessment_areas": [
                            "Tekniske sikkerhedsforanstaltninger",
                            "Organisatoriske foranstaltninger",
                            "Robusthed af AI-systemet"
                        ]
                    }
                ]
            }
        }
    }

@app.get("/api/templates/fria")
async def get_fria_template():
    """Get FRIA (Fundamental Rights Impact Assessment) template based on AI Act requirements"""
    return {
        "template_name": "Fundamental Rights Impact Assessment (FRIA) i AI-projekter",
        "version": "1.0",
        "legal_basis": ["AI-forordningens artikel 27"],
        "last_updated": "2025-09-25",
        "applicable_to": "Højrisiko AI-systemer",
        "template_structure": {
            "sammenfatning": {
                "title": "Sammenfatning",
                "required": True,
                "description": "Kort sammenfatning af FRIA'en med fokus på identificerede risici og mitigerende foranstaltninger"
            },
            "indledning_baggrund_formål": {
                "title": "Indledning, baggrund og formål",
                "subsections": [
                    {
                        "title": "Baggrund",
                        "description": "Kontekst for højrisiko AI-systemet"
                    },
                    {
                        "title": "Formålet med konsekvensanalysen",
                        "description": "Hvorfor FRIA gennemføres"
                    },
                    {
                        "title": "Forholdet til DPIA",
                        "description": "Sammenhæng med databeskyttelsesretten"
                    }
                ]
            },
            "proces_gennemførelse": {
                "title": "Processen for gennemførelsen af konsekvensanalysen vedrørende grundlæggende rettigheder",
                "subsections": [
                    {
                        "title": "Metode",
                        "required": True,
                        "description": "Metodisk tilgang til FRIA"
                    },
                    {
                        "title": "Underretning af markedsovervågningsmyndigheden",
                        "required": True,
                        "description": "Proces for myndighedskontakt"
                    },
                    {
                        "title": "Inddragelse af interessenter",
                        "required": True,
                        "description": "Stakeholder engagement"
                    }
                ]
            },
            "system_anvendelse_formål": {
                "title": "Systemets anvendelse og formål",
                "required": True,
                "fields": [
                    "Detaljeret beskrivelse af AI-systemet",
                    "Anvendelsesområder",
                    "Målgrupper",
                    "Forventet impact"
                ]
            },
            "tidsmæssig_anvendelse": {
                "title": "Den tidsmæssige anvendelse af systemet",
                "required": True,
                "fields": [
                    "Implementeringstidslinje",
                    "Driftsperiode",
                    "Evaluering og revision"
                ]
            },
            "påvirkede_personer": {
                "title": "Kategorier af fysiske personer og grupper, som forventes at blive påvirket",
                "required": True,
                "fields": [
                    "Direkte berørte personer",
                    "Indirekte påvirkede grupper",
                    "Sårbare grupper",
                    "Samfundsmæssig påvirkning"
                ]
            },
            "risici_grundlæggende_rettigheder": {
                "title": "Beskrivelse af de specifikke risici for skade på grundlæggende rettigheder",
                "required": True,
                "risk_areas": [
                    {
                        "area": "Ret til privatliv og databeskyttelse",
                        "description": "Risici relateret til behandling af personoplysninger"
                    },
                    {
                        "area": "Forbud mod diskrimination",
                        "description": "Risici for ulovlig forskelsbehandling og bias"
                    },
                    {
                        "area": "Ret til effektiv retshjælp",
                        "description": "Påvirkning af retssikkerhed og klagemuligheder"
                    },
                    {
                        "area": "Ytringsfrihed og informationsfrihed",
                        "description": "Påvirkning af kommunikation og information"
                    },
                    {
                        "area": "Forsamlings- og foreningsfrihed",
                        "description": "Påvirkning af sociale og politiske rettigheder"
                    },
                    {
                        "area": "Ret til uddannelse",
                        "description": "Påvirkning af uddannelsesmuligheder"
                    },
                    {
                        "area": "Ret til arbejde",
                        "description": "Påvirkning af beskæftigelse og arbejdsforhold"
                    },
                    {
                        "area": "Forbrugerbeskyttelse",
                        "description": "Påvirkning af forbrugernes rettigheder og interesser"
                    }
                ]
            },
            "menneskelig_tilsyn": {
                "title": "Beskrivelse af det menneskelige tilsyn med AI-systemet",
                "required": True,
                "fields": [
                    "Tilsynsstruktur og ansvar",
                    "Kompetencer og uddannelse",
                    "Indgriben og override muligheder",
                    "Monitorering og evaluering"
                ]
            },
            "mitigerende_foranstaltninger": {
                "title": "Beskrivelse af mitigerende foranstaltninger, intern styring og klagemekanismer",
                "required": True,
                "subsections": [
                    {
                        "title": "Mitigerende foranstaltninger",
                        "description": "Konkrete tiltag til risikoreduktion"
                    },
                    {
                        "title": "Intern styring",
                        "description": "Governance struktur og processer"
                    },
                    {
                        "title": "Klagemekanismer",
                        "description": "Procedurer for håndtering af klager"
                    }
                ]
            },
            "ajourføring": {
                "title": "Ajourføring af konsekvensanalysen",
                "required": True,
                "description": "Plan for løbende opdatering og revision af FRIA"
            },
            "konklusion_godkendelse": {
                "title": "Konklusion og ledelsens godkendelse",
                "subsections": [
                    {
                        "title": "Konklusion",
                        "required": True,
                        "description": "Samlet vurdering af risici og foranstaltninger"
                    },
                    {
                        "title": "Ledelsens godkendelse",
                        "required": True,
                        "fields": [
                            "Godkendt af (navn og stilling)",
                            "Dato for godkendelse",
                            "Signatur"
                        ]
                    }
                ]
            }
        }
    }

@app.post("/api/templates/dpia/generate")
async def generate_dpia_report(assessment_data: Dict[str, Any]):
    """Generate a DPIA report based on assessment data"""
    assessment_id = assessment_data.get("assessment_id", f"dpia_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}")

    return {
        "report_id": assessment_id,
        "report_type": "DPIA",
        "generated_at": datetime.datetime.now().isoformat(),
        "system_name": assessment_data.get("system_name", "AI System"),
        "status": "draft",
        "sections": {
            "sammenfatning": {
                "completed": False,
                "content": "",
                "required_fields": [
                    "AI-systemets formål og anvendelse",
                    "Identificerede databeskyttelsesrisici",
                    "Implementerede afhjælpende foranstaltninger",
                    "Samlet risikovurdering efter foranstaltninger"
                ]
            },
            "systematisk_beskrivelse": {
                "completed": False,
                "ai_system_purpose": assessment_data.get("description", ""),
                "personal_data_categories": assessment_data.get("data_types", []),
                "data_sources": [],
                "recipients": [],
                "retention_periods": {}
            },
            "interessenter": {
                "completed": False,
                "dpo_consulted": False,
                "data_subjects_consulted": False,
                "consultation_details": ""
            },
            "lovlighed_vurdering": {
                "completed": False,
                "legal_basis": "",
                "purpose_limitation_compliance": False,
                "data_minimization_compliance": False,
                "accuracy_measures": "",
                "retention_compliance": False,
                "security_measures": []
            }
        },
        "next_steps": [
            "Udfyld alle påkrævede sektioner",
            "Konsultér databeskyttelsesrådgiver",
            "Inddrag berørte dataemner",
            "Gennemfør detaljeret risikovurdering",
            "Implementér identificerede foranstaltninger"
        ],
        "completion_percentage": 10
    }

@app.post("/api/templates/fria/generate")
async def generate_fria_report(assessment_data: Dict[str, Any]):
    """Generate a FRIA report based on assessment data"""
    assessment_id = assessment_data.get("assessment_id", f"fria_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}")

    return {
        "report_id": assessment_id,
        "report_type": "FRIA",
        "generated_at": datetime.datetime.now().isoformat(),
        "system_name": assessment_data.get("system_name", "AI System"),
        "ai_classification": "high_risk",
        "status": "draft",
        "sections": {
            "sammenfatning": {
                "completed": False,
                "content": "",
                "required_elements": [
                    "Systemets formål og anvendelse",
                    "Identificerede risici for grundlæggende rettigheder",
                    "Mitigerende foranstaltninger",
                    "Vurdering af restrisici"
                ]
            },
            "system_beskrivelse": {
                "completed": False,
                "purpose": assessment_data.get("description", ""),
                "target_groups": [],
                "usage_context": assessment_data.get("branch_sector", ""),
                "deployment_timeline": ""
            },
            "påvirkede_personer": {
                "completed": False,
                "direct_affected": [],
                "indirect_affected": [],
                "vulnerable_groups": [],
                "societal_impact": ""
            },
            "fundamental_rights_risks": {
                "completed": False,
                "privacy_risks": [],
                "discrimination_risks": [],
                "due_process_risks": [],
                "other_rights_risks": []
            },
            "menneskelig_tilsyn": {
                "completed": False,
                "oversight_structure": "",
                "human_competencies": [],
                "intervention_capabilities": "",
                "monitoring_procedures": ""
            },
            "mitigerende_foranstaltninger": {
                "completed": False,
                "technical_measures": [],
                "organizational_measures": [],
                "governance_structure": "",
                "complaint_mechanisms": []
            }
        },
        "required_consultations": [
            "Markedsovervågningsmyndigheden",
            "Databeskyttelsesrådgiver",
            "Interessentorganisationer",
            "Berørte personer eller deres repræsentanter"
        ],
        "next_steps": [
            "Underret markedsovervågningsmyndigheden",
            "Gennemfør interessentkonsultationer",
            "Identificér specifikke risici for grundlæggende rettigheder",
            "Designér mitigerende foranstaltninger",
            "Etablér menneskelig tilsynsstruktur",
            "Implementér klagemekanismer"
        ],
        "completion_percentage": 5
    }

# Authentication Endpoints

@app.post("/api/auth/register", response_model=Token)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    if user_data.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Create new user
    user_id = str(len(users_db) + 1)
    hashed_password = hash_password(user_data.password)

    new_user = {
        "id": user_id,
        "email": str(user_data.email),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "organization": user_data.organization,
        "role": "user",  # Default role for new users
        "hashed_password": hashed_password,
        "is_active": True,
        "is_email_verified": False,  # Would require email verification in production
        "created_at": datetime.datetime.now().isoformat(),
        "preferences": {
            "theme": "dark",
            "language": "da",
            "notifications": {
                "email": True,
                "push": True,
                "assessment_reminders": True,
                "compliance_updates": True
            }
        }
    }

    # Add to database
    users_db[str(user_data.email)] = new_user

    # Create access token
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_data.email)}, expires_delta=access_token_expires
    )

    # Create user response
    user_response = UserResponse(
        id=new_user["id"],
        email=new_user["email"],
        first_name=new_user["first_name"],
        last_name=new_user["last_name"],
        organization=new_user["organization"],
        role=new_user["role"],
        is_email_verified=new_user["is_email_verified"],
        created_at=new_user["created_at"],
        preferences=new_user["preferences"]
    )

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.post("/api/auth/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    """Login user and return JWT token"""
    user = authenticate_user(str(user_credentials.email), user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_credentials.email)}, expires_delta=access_token_expires
    )

    # Update last login
    users_db[str(user_credentials.email)]["last_login"] = datetime.datetime.now().isoformat()

    # Create user response
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        organization=user["organization"],
        role=user["role"],
        is_email_verified=user["is_email_verified"],
        created_at=user["created_at"],
        preferences=user["preferences"]
    )

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        organization=current_user["organization"],
        role=current_user["role"],
        is_email_verified=current_user["is_email_verified"],
        created_at=current_user["created_at"],
        preferences=current_user["preferences"]
    )

@app.post("/api/auth/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh JWT token"""
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

# Protected endpoint example
@app.get("/api/auth/protected")
async def protected_endpoint(current_user: dict = Depends(get_current_user)):
    """Example protected endpoint"""
    return {
        "message": f"Hello {current_user['first_name']}! This is a protected endpoint.",
        "user_role": current_user["role"],
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)