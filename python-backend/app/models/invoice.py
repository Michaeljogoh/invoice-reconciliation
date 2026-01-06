from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, DateTime, Numeric, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import InvoiceStatus, Currency


class Invoice(Base):
    """Invoice model for tenant-scoped invoices."""
    
    __tablename__ = "invoices"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    vendor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True
    )
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[Currency] = mapped_column(
        Enum(Currency, name="currency"), nullable=False, default=Currency.USD
    )
    invoice_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="invoices")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", back_populates="invoices")
    match_candidates: Mapped[List["MatchCandidate"]] = relationship(
        "MatchCandidate", back_populates="invoice", cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Invoice(id={self.id}, tenant_id={self.tenant_id}, amount={self.amount}, status={self.status})>"