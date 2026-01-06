import pytest
from datetime import datetime
from app.services.reconciliation_service import ReconciliationService
from app.graphql.types import InvoiceInput, TransactionInput, AiExplanationRequest


class TestReconciliationService:
    """Test the deterministic reconciliation service."""
    
    @pytest.fixture
    def service(self):
        return ReconciliationService()
    
    @pytest.fixture
    def sample_invoices(self):
        return [
            {
                "id": "inv-001",
                "amount": 1500.00,
                "invoice_date": datetime(2024, 1, 15),
                "description": "Office supplies - January 2024",
                "vendor_name": "Office Supplies Co",
                "invoice_number": "INV-001",
            },
            {
                "id": "inv-002",
                "amount": 2750.50,
                "invoice_date": datetime(2024, 1, 20),
                "description": "Tech services",
                "vendor_name": "Tech Solutions LLC",
                "invoice_number": "INV-002",
            },
            {
                "id": "inv-003",
                "amount": 999.99,
                "invoice_date": datetime(2024, 1, 25),
                "description": "Marketing materials",
                "vendor_name": "Marketing Pros",
                "invoice_number": "INV-003",
            },
        ]
    
    @pytest.fixture
    def sample_transactions(self):
        return [
            {
                "id": "tx-001",
                "amount": 1500.00,
                "posted_at": datetime(2024, 1, 16),
                "description": "Payment to Office Supplies Co",
                "reference": "REF-001",
            },
            {
                "id": "tx-002",
                "amount": 2750.50,
                "posted_at": datetime(2024, 1, 22),
                "description": "ACH Transfer - Tech Services",
                "reference": "REF-002",
            },
            {
                "id": "tx-003",
                "amount": 999.99,
                "posted_at": datetime(2024, 1, 26),
                "description": "Wire transfer - Marketing Payment",
                "reference": "REF-003",
            },
            {
                "id": "tx-004",
                "amount": 5000.00,
                "posted_at": datetime(2024, 1, 10),
                "description": "Unrelated transaction",
                "reference": "REF-004",
            },
        ]
    
    def test_exact_amount_match(self, service, sample_invoices, sample_transactions):
        """Test exact amount matching (strongest signal)."""
        invoice = sample_invoices[0]  # $1500.00
        transaction = sample_transactions[0]  # $1500.00
        
        score_result = service.calculate_score(invoice, transaction)
        
        assert score_result["exact_amount"] == 1000
        assert score_result["total_score"] >= 1000
    
    def test_amount_tolerance_match(self, service):
        """Test amount matching within tolerance."""
        invoice = {
            "id": "inv-001",
            "amount": 1000.00,
            "invoice_date": datetime(2024, 1, 15),
            "description": "Test invoice",
            "vendor_name": "Test Vendor",
        }
        
        # Transaction with 0.5% difference (within 1% tolerance)
        transaction = {
            "id": "tx-001",
            "amount": 1005.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Test transaction",
        }
        
        score_result = service.calculate_score(invoice, transaction)
        
        assert score_result["exact_amount"] == 0  # Not exact
        assert score_result["total_score"] >= 500  # But within tolerance
    
    def test_date_proximity_scoring(self, service):
        """Test date proximity scoring."""
        invoice = {
            "id": "inv-001",
            "amount": 1000.00,
            "invoice_date": datetime(2024, 1, 15),
            "description": "Test invoice",
            "vendor_name": "Test Vendor",
        }
        
        # Same day
        transaction1 = {
            "id": "tx-001",
            "amount": 999.00,
            "posted_at": datetime(2024, 1, 15),
            "description": "Test transaction",
        }
        
        # 2 days later
        transaction2 = {
            "id": "tx-002",
            "amount": 999.00,
            "posted_at": datetime(2024, 1, 17),
            "description": "Test transaction",
        }
        
        # 5 days later
        transaction3 = {
            "id": "tx-003",
            "amount": 999.00,
            "posted_at": datetime(2024, 1, 20),
            "description": "Test transaction",
        }
        
        score1 = service.calculate_score(invoice, transaction1)
        score2 = service.calculate_score(invoice, transaction2)
        score3 = service.calculate_score(invoice, transaction3)
        
        assert score1["date_proximity"] == 300  # Same day
        assert score2["date_proximity"] == 210  # Within 3 days (70% of 300)
        assert score3["date_proximity"] == 120  # Within 7 days (40% of 300)
    
    def test_text_similarity_scoring(self, service):
        """Test text similarity scoring."""
        invoice = {
            "id": "inv-001",
            "amount": 1000.00,
            "invoice_date": datetime(2024, 1, 15),
            "description": "Office supplies purchase",
            "vendor_name": "Office Supplies Co",
        }
        
        # Very similar description
        transaction1 = {
            "id": "tx-001",
            "amount": 1000.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Payment for office supplies",
        }
        
        # Different description
        transaction2 = {
            "id": "tx-002",
            "amount": 1000.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Restaurant bill",
        }
        
        score1 = service.calculate_score(invoice, transaction1)
        score2 = service.calculate_score(invoice, transaction2)
        
        assert score1["text_similarity"] > score2["text_similarity"]
        assert score1["text_similarity"] > 0
    
    def test_vendor_match_scoring(self, service):
        """Test vendor name matching in transaction description."""
        invoice = {
            "id": "inv-001",
            "amount": 1000.00,
            "invoice_date": datetime(2024, 1, 15),
            "description": "Services",
            "vendor_name": "Acme Corporation",
        }
        
        # Vendor name in description
        transaction1 = {
            "id": "tx-001",
            "amount": 1000.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Payment to Acme Corporation",
        }
        
        # No vendor match
        transaction2 = {
            "id": "tx-002",
            "amount": 1000.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Payment to Other Company",
        }
        
        score1 = service.calculate_score(invoice, transaction1)
        score2 = service.calculate_score(invoice, transaction2)
        
        assert score1["vendor_match"] == 100
        assert score2["vendor_match"] == 0
    
    def test_scoring_deterministic_order(self, service, sample_invoices, sample_transactions):
        """Test that scoring returns candidates in deterministic order."""
        result = service.score_candidates(
            tenant_id="tenant-001",
            invoices=sample_invoices,
            transactions=sample_transactions,
            top_n=3,
        )
        
        # Should have candidates
        assert len(result.candidates) > 0
        
        # Should be sorted by score (descending)
        scores = [c.score for c in result.candidates]
        assert scores == sorted(scores, reverse=True)
        
        # Should have correct metadata
        assert result.processed_invoices == len(sample_invoices)
        assert result.processed_transactions == len(sample_transactions)
        assert result.duration_ms > 0
    
    def test_perfect_match_explanation(self, service):
        """Test explanation generation for perfect matches."""
        invoice = {
            "id": "inv-001",
            "amount": 1500.00,
            "invoice_date": datetime(2024, 1, 15),
            "description": "Office supplies",
            "vendor_name": "Office Supplies Co",
            "invoice_number": "INV-001",
        }
        
        transaction = {
            "id": "tx-001",
            "amount": 1500.00,
            "posted_at": datetime(2024, 1, 16),
            "description": "Payment to Office Supplies Co",
            "reference": "REF-001",
        }
        
        score_result = service.calculate_score(invoice, transaction)
        explanation = service.generate_explanation(invoice, transaction, score_result)
        
        assert "Perfect match" in explanation
        assert "INV-001" in explanation
        assert "REF-001" in explanation
        assert "1500.00" in explanation
    
    def test_deterministic_explanation_fallback(self, service):
        """Test deterministic explanation fallback."""
        request = AiExplanationRequest(
            invoice=InvoiceInput(
                id="inv-001",
                amount=1000.00,
                invoice_date="2024-01-15",
                description="Test invoice",
                vendor_name="Test Vendor",
            ),
            transaction=TransactionInput(
                id="tx-001",
                amount=1000.00,
                posted_at="2024-01-16",
                description="Test transaction",
            ),
            score=1200,
            score_breakdown=ScoreBreakdown(
                exact_amount=1000,
                date_proximity=200,
                text_similarity=0,
                vendor_match=0,
                total=1200,
            ),
        )
        
        result = service.generate_deterministic_explanation(request)
        
        assert result.explanation is not None
        assert result.confidence == "medium"
        assert result.ai_generated is False
        assert result.score_breakdown.total == 1200
    
    def test_edge_cases(self, service):
        """Test edge cases and error conditions."""
        # Missing dates
        invoice = {
            "id": "inv-001",
            "amount": 1000.00,
            "invoice_date": None,
            "description": "Test",
            "vendor_name": "Test Vendor",
        }
        
        transaction = {
            "id": "tx-001",
            "amount": 1000.00,
            "posted_at": None,
            "description": "Test transaction",
        }
        
        score_result = service.calculate_score(invoice, transaction)
        
        # Should not crash, just return 0 for date proximity
        assert score_result["date_proximity"] == 0
        
        # But exact amount should still work
        assert score_result["exact_amount"] == 1000
    
    def test_empty_inputs(self, service):
        """Test with empty invoice/transaction lists."""
        result = service.score_candidates(
            tenant_id="tenant-001",
            invoices=[],
            transactions=[],
            top_n=5,
        )
        
        assert result.candidates == []
        assert result.processed_invoices == 0
        assert result.processed_transactions == 0
        assert result.duration_ms >= 0