import os
from sqlalchemy import create_engine, event, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.types import JSON, String, Integer


class Base(DeclarativeBase):
    pass


class Patient(Base):
    __tablename__ = 'patients'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    record_no: Mapped[str] = mapped_column(String, unique=True)
    data: Mapped[dict] = mapped_column(JSON)


class Document(Base):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON)


class FileRecord(Base):
    __tablename__ = 'document_files'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    mime: Mapped[str] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String)


class Version(Base):
    __tablename__ = 'document_versions'
    __table_args__ = (UniqueConstraint('document_id', 'number'), CheckConstraint('number > 0'))
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'))
    number: Mapped[int] = mapped_column(Integer)
    file_id: Mapped[str | None] = mapped_column(ForeignKey('document_files.id'), nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSON)


class Audit(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class SchemaVersion(Base):
    __tablename__ = 'schema_versions'
    version: Mapped[int] = mapped_column(Integer, primary_key=True)


def make_database(url=None):
    url = url or os.environ['DATABASE_URL']
    engine = create_engine(url, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {})
    if url.startswith('sqlite'):
        @event.listens_for(engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
    return engine, sessionmaker(engine, expire_on_commit=False)


def migrate(engine):
    # Initial additive migration. Later changes must add numbered migrations,
    # rather than assuming create_all modifies existing columns.
    Base.metadata.create_all(engine)
    with sessionmaker(engine)() as db:
        if db.get(SchemaVersion, 1) is None:
            db.add(SchemaVersion(version=1))
            db.commit()
