from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import MatchStatus


class MatchCandidate(Base):
    """Match candidate model for invoice-transaction reconciliation."""
    
    __tablename__ = "match_candidates"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    bank_transaction_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bank_transactions.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, name="match_status"), nullable=False, default=MatchStatus.PROPOSED
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="match_candidates")
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="match_candidates")
    transaction: Mapped["BankTransaction"] = relationship(
        "BankTransaction", back_populates="match_candidates"
    )
    
    def __repr__(self):
        return f"<MatchCandidate(id={self.id}, tenant_id={self.tenant_id}, score={self.score}, status={self.status})>"