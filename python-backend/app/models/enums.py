import enum


class InvoiceStatus(str, enum.Enum):
    """Invoice status enumeration."""
    OPEN = "open"
    MATCHED = "matched"
    PAID = "paid"
    CANCELLED = "cancelled"


class MatchStatus(str, enum.Enum):
    """Match candidate status enumeration."""
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class Currency(str, enum.Enum):
    """Currency enumeration."""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"