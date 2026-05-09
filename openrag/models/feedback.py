"""User feedback model."""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from openrag.models.base import Base, TimestampMixin, UUIDMixin


class Feedback(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "feedback"

    query_log_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("query_logs.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[str] = mapped_column(String(20), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
