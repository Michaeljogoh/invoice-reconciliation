from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import re
from difflib import SequenceMatcher
from app.graphql.types import (
    ReconciliationCandidate,
    ScoreBreakdown,
    ScoringResult,
    ExplanationResult,
    AiExplanationRequest,
)


class ReconciliationService:
    """Deterministic reconciliation engine using heuristic scoring."""
    
    def __init__(self):
        # Scoring weights
        self.EXACT_AMOUNT_SCORE = 1000
        self.AMOUNT_TOLERANCE_SCORE = 500
        self.DATE_PROXIMITY_SCORE = 300
        self.TEXT_SIMILARITY_SCORE = 200
        self.VENDOR_MATCH_SCORE = 100
        
        # Date tolerance in days
        self.DATE_TOLERANCE_DAYS = 3
        self.AMOUNT_TOLERANCE_PERCENT = 0.01  # 1% tolerance
    
    def score_candidates(
        self,
        tenant_id: str,
        invoices: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]],
        top_n: int = 5,
    ) -> ScoringResult:
        """
        Score invoice-transaction pairs using deterministic heuristics.
        
        Args:
            tenant_id: Tenant identifier (for logging/auditing)
            invoices: List of invoice dictionaries
            transactions: List of transaction dictionaries
            top_n: Number of top candidates to return per invoice
            
        Returns:
            ScoringResult with ranked candidates
        """
        start_time = datetime.now()
        
        candidates = []
        
        # Score each invoice against all transactions
        for invoice in invoices:
            invoice_candidates = []
            
            for transaction in transactions:
                score_result = self.calculate_score(invoice, transaction)
                
                if score_result["total_score"] > 0:
                    candidate = ReconciliationCandidate(
                        invoice_id=invoice["id"],
                        transaction_id=transaction["id"],
                        score=score_result["total_score"],
                        explanation=self.generate_explanation(
                            invoice, transaction, score_result
                        ),
                        score_breakdown=ScoreBreakdown(
                            exact_amount=score_result["exact_amount"],
                            date_proximity=score_result["date_proximity"],
                            text_similarity=score_result["text_similarity"],
                            vendor_match=score_result["vendor_match"],
                            total=score_result["total_score"],
                        ),
                    )
                    invoice_candidates.append(candidate)
            
            # Sort by score and take top N for this invoice
            invoice_candidates.sort(key=lambda x: x.score, reverse=True)
            candidates.extend(invoice_candidates[:top_n])
        
        # Global sort and limit
        candidates.sort(key=lambda x: x.score, reverse=True)
        
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return ScoringResult(
            candidates=candidates,
            processed_invoices=len(invoices),
            processed_transactions=len(transactions),
            duration_ms=duration_ms,
        )
    
    def calculate_score(self, invoice: Dict[str, Any], transaction: Dict[str, Any]) -> Dict[str, int]:
        """Calculate matching score between invoice and transaction."""
        scores = {
            "exact_amount": self._score_amount_match(invoice, transaction),
            "date_proximity": self._score_date_proximity(invoice, transaction),
            "text_similarity": self._score_text_similarity(invoice, transaction),
            "vendor_match": self._score_vendor_match(invoice, transaction),
        }
        
        scores["total_score"] = sum(scores.values())
        return scores
    
    def _score_amount_match(self, invoice: Dict[str, Any], transaction: Dict[str, Any]) -> int:
        """Score based on amount matching (exact and tolerance)."""
        try:
            invoice_amount = float(invoice["amount"])
            transaction_amount = float(transaction["amount"])
            
            # Exact match (strongest signal)
            if abs(invoice_amount - transaction_amount) < 0.01:
                return self.EXACT_AMOUNT_SCORE
            
            # Tolerance match (within 1%)
            if abs(invoice_amount - transaction_amount) / invoice_amount <= self.AMOUNT_TOLERANCE_PERCENT:
                return self.AMOUNT_TOLERANCE_SCORE
            
        except (ValueError, TypeError):
            # Handle invalid amount formats
            pass
        
        return 0
    
    def _score_date_proximity(self, invoice: Dict[str, Any], transaction: Dict[str, Any]) -> int:
        """Score based on date proximity."""
        try:
            invoice_date = self._parse_date(invoice.get("invoice_date"))
            transaction_date = self._parse_date(transaction.get("posted_at"))
            
            if not invoice_date or not transaction_date:
                return 0
            
            days_diff = abs((invoice_date - transaction_date).days)
            
            if days_diff <= 1:
                return self.DATE_PROXIMITY_SCORE
            elif days_diff <= 3:
                return int(self.DATE_PROXIMITY_SCORE * 0.7)
            elif days_diff <= 7:
                return int(self.DATE_PROXIMITY_SCORE * 0.4)
            
        except (ValueError, TypeError):
            pass
        
        return 0
    
    def _score_text_similarity(self, invoice: Dict[str, Any], transaction: Dict[str, Any]) -> int:
        """Score based on text similarity between descriptions."""
        invoice_desc = invoice.get("description", "")
        transaction_desc = transaction.get("description", "")
        
        if not invoice_desc or not transaction_desc:
            return 0
        
        # Clean and normalize text
        invoice_clean = self._clean_text(invoice_desc)
        transaction_clean = self._clean_text(transaction_desc)
        
        if not invoice_clean or not transaction_clean:
            return 0
        
        # Calculate similarity ratio
        similarity = SequenceMatcher(None, invoice_clean, transaction_clean).ratio()
        
        # Scale to maximum score
        return int(similarity * self.TEXT_SIMILARITY_SCORE)
    
    def _score_vendor_match(self, invoice: Dict[str, Any], transaction: Dict[str, Any]) -> int:
        """Score based on vendor name appearing in transaction description."""
        vendor_name = invoice.get("vendor_name", "")
        transaction_desc = transaction.get("description", "")
        
        if not vendor_name or not transaction_desc:
            return 0
        
        vendor_clean = self._clean_text(vendor_name)
        transaction_clean = self._clean_text(transaction_desc)
        
        if vendor_clean in transaction_clean:
            return self.VENDOR_MATCH_SCORE
        
        return 0
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object."""
        if not date_str:
            return None
        
        try:
            # Try ISO format first
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            pass
        
        # Try other common formats
        formats = [
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%m/%d/%Y",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for comparison."""
        if not text:
            return ""
        
        # Convert to lowercase and remove special characters
        cleaned = re.sub(r'[^\\w\\s]', ' ', text.lower())
        
        # Remove extra whitespace
        cleaned = re.sub(r'\\s+', ' ', cleaned).strip()
        
        return cleaned
    
    def generate_explanation(
        self, invoice: Dict[str, Any], transaction: Dict[str, Any], score_result: Dict[str, int]
    ) -> str:
        """Generate human-readable explanation for the match."""
        total_score = score_result["total_score"]
        
        if total_score >= 1400:
            return f"Perfect match: Invoice {invoice.get('invoice_number', invoice['id'])} and transaction {transaction.get('reference', transaction['id'])} have identical amounts of {invoice['amount']} with similar dates and descriptions."
        
        elif total_score >= 1000:
            reasons = []
            if score_result["exact_amount"] > 0:
                reasons.append("identical amounts")
            if score_result["date_proximity"] >= 200:
                reasons.append("close dates")
            if score_result["text_similarity"] >= 100:
                reasons.append("similar descriptions")
            
            reason_str = " and ".join(reasons) if reasons else "multiple matching factors"
            return f"Strong match: {invoice['amount']} with {reason_str}."
        
        elif total_score >= 600:
            return f"Good match: Amounts are similar with reasonable date proximity and some description overlap."
        
        elif total_score >= 300:
            return f"Potential match: Some similarities found but requires manual review."
        
        else:
            return f"Low confidence: Minimal similarities detected."
    
    def generate_deterministic_explanation(
        self, request: AiExplanationRequest
    ) -> ExplanationResult:
        """Generate deterministic explanation (fallback when AI is unavailable)."""
        invoice = {
            "id": request.invoice.id,
            "amount": request.invoice.amount,
            "description": request.invoice.description,
            "vendor_name": request.invoice.vendor_name,
            "invoice_number": request.invoice.invoice_number,
        }
        
        transaction = {
            "id": request.transaction.id,
            "amount": request.transaction.amount,
            "description": request.transaction.description,
            "reference": request.transaction.reference,
        }
        
        score_result = {
            "exact_amount": request.score_breakdown.exact_amount,
            "date_proximity": request.score_breakdown.date_proximity,
            "text_similarity": request.score_breakdown.text_similarity,
            "vendor_match": request.score_breakdown.vendor_match,
            "total_score": request.score,
        }
        
        explanation = self.generate_explanation(invoice, transaction, score_result)
        
        confidence = "low"
        if request.score >= 1200:
            confidence = "high"
        elif request.score >= 600:
            confidence = "medium"
        
        return ExplanationResult(
            explanation=explanation,
            confidence=confidence,
            score_breakdown=request.score_breakdown,
            ai_generated=False,
        )