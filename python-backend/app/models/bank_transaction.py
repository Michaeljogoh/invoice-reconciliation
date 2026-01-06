from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, DateTime, Numeric, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import Currency


class BankTransaction(Base):
    """Bank transaction model for imported bank data."""
    
    __tablename__ = "bank_transactions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[Currency] = mapped_column(
        Enum(Currency, name="currency"), nullable=False, default=Currency.USD
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="transactions")
    match_candidates: Mapped[List["MatchCandidate"]] = relationship(
        "MatchCandidate", back_populates="transaction", cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<BankTransaction(id={self.id}, tenant_id={self.tenant_id}, amount={self.amount}, posted_at={self.posted_at})>"