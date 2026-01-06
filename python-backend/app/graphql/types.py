from typing import List, Optional
import strawberry
from datetime import datetime
from decimal import Decimal
from app.models.enums import InvoiceStatus, MatchStatus, Currency


@strawberry.type
class InvoiceInput:
    """Input type for invoice data."""
    id: str
    amount: float
    invoice_date: Optional[str] = None
    description: str = ""
    vendor_name: str = ""


@strawberry.type
class TransactionInput:
    """Input type for transaction data."""
    id: str
    amount: float
    posted_at: str
    description: str


@strawberry.type
class ScoreBreakdown:
    """Score breakdown for reconciliation matching."""
    exact_amount: int
    date_proximity: int
    text_similarity: int
    vendor_match: int
    total: int


@strawberry.type
class ReconciliationCandidate:
    """Reconciliation candidate with scoring details."""
    invoice_id: str
    transaction_id: str
    score: int
    explanation: str
    score_breakdown: ScoreBreakdown


@strawberry.type
class ScoringResult:
    """Result of the scoring operation."""
    candidates: List[ReconciliationCandidate]
    processed_invoices: int
    processed_transactions: int
    duration_ms: int


@strawberry.type
class ExplanationResult:
    """AI explanation result."""
    explanation: str
    confidence: str
    score_breakdown: ScoreBreakdown
    ai_generated: bool