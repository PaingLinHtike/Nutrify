"""Centralized PostgreSQL connection and helpers for Nutrify."""

import os
from contextlib import contextmanager

import psycopg2

# ── Connection config (env vars with dev defaults) ──────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "VitaVision"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}


@contextmanager
def get_connection():
    """Yield a psycopg2 connection, auto-closing after use."""
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()


def insert_food_metadata(
    image_id: str,
    upload_time: str,
    height: int,
    width: int,
    email: str,
    country: str,
    label: str,
    source: str,
) -> None:
    """Insert a row into the food_metadata table.

    Table must already exist — see below for the DDL:

        CREATE TABLE IF NOT EXISTS food_metadata (
            id          SERIAL PRIMARY KEY,
            image_id    VARCHAR(36) UNIQUE NOT NULL,
            upload_time TIMESTAMP NOT NULL,
            height      INTEGER,
            width       INTEGER,
            email       VARCHAR(255),
            country     VARCHAR(100),
            label       VARCHAR(50) NOT NULL,
            source      VARCHAR(50) DEFAULT 'web-app',
            created_at  TIMESTAMP DEFAULT NOW()
        );
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO food_metadata
                    (image_id, upload_time, height, width, email, country, label, source)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (image_id, upload_time, height, width, email, country, label, source),
            )
        conn.commit()
