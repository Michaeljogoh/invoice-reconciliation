from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Vendor(Base):
    """Vendor model for invoice vendors."""
    
    __tablename__ = "vendors"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="vendors")
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice", back_populates="vendor"
    )
    
    def __repr__(self):
        return f"<Vendor(id={self.id}, tenant_id={self.tenant_id}, name={self.name})>"