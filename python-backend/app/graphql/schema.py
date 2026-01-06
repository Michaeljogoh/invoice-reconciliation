import strawberry
from typing import List, Optional
from app.services.reconciliation_service import ReconciliationService
from app.graphql.types import (
    InvoiceInput,
    TransactionInput,
    ScoringResult,
    ExplanationResult,
    ScoreBreakdown,
    ReconciliationCandidate,
)

# Initialize service
reconciliation_service = ReconciliationService()


@strawberry.type
class Query:
    """GraphQL queries."""
    
    @strawberry.field
    def health(self) -> str:
        """Health check endpoint."""
        return "Python reconciliation service is healthy"


@strawberry.type
class Mutation:
    """GraphQL mutations."""
    
    @strawberry.field
    def score_candidates(
        self,
        tenant_id: str,
        invoices: List[InvoiceInput],
        transactions: List[TransactionInput],
        top_n: Optional[int] = 5,
    ) -> ScoringResult:
        """
        Score invoice-transaction pairs using deterministic heuristics.
        
        Args:
            tenant_id: Tenant identifier
            invoices: List of invoices to match
            transactions: List of transactions to match against
            top_n: Number of top candidates to return per invoice
            
        Returns:
            ScoringResult with ranked candidates
        """
        # Convert Strawberry types to dictionaries for service
        invoice_dicts = [
            {
                "id": inv.id,
                "amount": inv.amount,
                "invoice_date": inv.invoice_date,
                "description": inv.description,
                "vendor_name": inv.vendor_name,
                "invoice_number": inv.invoice_number,
            }
            for inv in invoices
        ]
        
        transaction_dicts = [
            {
                "id": tx.id,
                "amount": tx.amount,
                "posted_at": tx.posted_at,
                "description": tx.description,
                "reference": tx.reference,
            }
            for tx in transactions
        ]
        
        return reconciliation_service.score_candidates(
            tenant_id=tenant_id,
            invoices=invoice_dicts,
            transactions=transaction_dicts,
            top_n=top_n,
        )


# Create schema
schema = strawberry.Schema(query=Query, mutation=Mutation)