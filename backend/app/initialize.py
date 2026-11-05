"""One-shot schema/seed migration, using the owner connection only in this job."""
import asyncio
import os
from sqlalchemy import create_engine
from .main import create_app


async def initialize():
    app = create_app()
    async with app.router.lifespan_context(app):
        pass
    engine = create_engine(os.environ['DATABASE_URL'])
    password = os.environ['APP_DB_PASSWORD'].replace("'", "''")
    with engine.begin() as db:
        # A fixed role name and quoted secret; never log the password-bearing SQL.
        exists = db.exec_driver_sql("SELECT 1 FROM pg_roles WHERE rolname = 'dentdocs_app'").first()
        if not exists:
            db.exec_driver_sql(f"CREATE ROLE dentdocs_app LOGIN PASSWORD '{password}'")
        db.exec_driver_sql('GRANT CONNECT ON DATABASE dentdocs_mock TO dentdocs_app')
        db.exec_driver_sql('GRANT USAGE ON SCHEMA public TO dentdocs_app')
        db.exec_driver_sql('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dentdocs_app')
        db.exec_driver_sql('REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON audit_logs, review_events, validity_events, file_extractions, handwriting_drafts, summary_drafts, summary_decisions FROM dentdocs_app')
        db.exec_driver_sql('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON schema_versions FROM dentdocs_app')
    engine.dispose()
    print('Schema, accounts and restricted application database role initialized')


if __name__ == '__main__':
    asyncio.run(initialize())
