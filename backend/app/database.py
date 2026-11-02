import os
from datetime import date
from sqlalchemy import create_engine, event, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.types import JSON, String, Integer, Boolean, Float, Date


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


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change: Mapped[bool] = mapped_column(Boolean, default=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)


class LoginSession(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    csrf: Mapped[str] = mapped_column(String)
    last_seen: Mapped[float] = mapped_column(Float)
    created_at: Mapped[float] = mapped_column(Float)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Acknowledgement(Base):
    __tablename__ = 'privacy_acknowledgements'
    __table_args__ = (UniqueConstraint('user_id', 'notice_version'),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    notice_version: Mapped[str] = mapped_column(String)
    timestamp: Mapped[str] = mapped_column(String)


class LoginThrottle(Base):
    __tablename__ = 'login_throttles'
    key: Mapped[str] = mapped_column(String, primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[float] = mapped_column(Float, default=0)


class FileUpload(Base):
    __tablename__ = 'file_uploads'
    file_id: Mapped[str] = mapped_column(ForeignKey('document_files.id'), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class ReviewItem(Base):
    __tablename__ = 'review_queue'
    __table_args__ = (UniqueConstraint('document_id', 'version'),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'))
    version: Mapped[int] = mapped_column(Integer)
    source_fingerprint: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default='pending')
    reasons: Mapped[list] = mapped_column(JSON)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    decided_by: Mapped[str | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    decided_at: Mapped[str | None] = mapped_column(String, nullable=True)
    decision_note: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer, default=1)


class ReviewEvent(Base):
    __tablename__ = 'review_events'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    review_id: Mapped[str] = mapped_column(ForeignKey('review_queue.id'))
    data: Mapped[dict] = mapped_column(JSON)


class ValidityRule(Base):
    __tablename__ = 'validity_rules'
    __table_args__ = (UniqueConstraint('document_type', 'category', 'version'),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_type: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    version: Mapped[int] = mapped_column(Integer)
    valid_for_days: Mapped[int] = mapped_column(Integer)
    warning_days: Mapped[int] = mapped_column(Integer)
    reference: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default='draft')
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    approved_by: Mapped[str | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    approved_at: Mapped[str | None] = mapped_column(String, nullable=True)
    approval_note: Mapped[str | None] = mapped_column(String, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)


class DocumentValidity(Base):
    __tablename__ = 'document_validity'
    __table_args__ = (UniqueConstraint('document_id', 'version'),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'))
    version: Mapped[int] = mapped_column(Integer)
    source_fingerprint: Mapped[str] = mapped_column(String)
    basis: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    issued_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    expires_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    warning_days: Mapped[int] = mapped_column(Integer, default=0)
    rule_id: Mapped[str | None] = mapped_column(ForeignKey('validity_rules.id'), nullable=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey('documents.id'), nullable=True)
    appointment_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confirmed_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    confirmed_at: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer, default=1)


class ValidityEvent(Base):
    __tablename__ = 'validity_events'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'))
    data: Mapped[dict] = mapped_column(JSON)


def make_database(url=None):
    url = url or os.environ['DATABASE_URL']
    engine = create_engine(url, hide_parameters=True, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {})
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
    with engine.begin() as connection:
        for table in ('audit_logs', 'review_events', 'validity_events'):
            if engine.dialect.name == 'sqlite':
                for operation in ('UPDATE', 'DELETE'):
                    connection.exec_driver_sql(f"CREATE TRIGGER IF NOT EXISTS {table}_no_{operation.lower()} BEFORE {operation} ON {table} BEGIN SELECT RAISE(ABORT, 'History events are append-only'); END")
            elif engine.dialect.name == 'postgresql':
                connection.exec_driver_sql("CREATE OR REPLACE FUNCTION reject_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History events are append-only'; END $$")
                connection.exec_driver_sql(f'DROP TRIGGER IF EXISTS {table}_no_change ON {table}')
                connection.exec_driver_sql(f'CREATE TRIGGER {table}_no_change BEFORE UPDATE OR DELETE OR TRUNCATE ON {table} FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_change()')
    with sessionmaker(engine)() as db:
        if db.get(SchemaVersion, 2) is None:
            db.add(SchemaVersion(version=2))
            db.commit()
        if db.get(SchemaVersion, 3) is None:
            db.add(SchemaVersion(version=3))
            db.commit()
