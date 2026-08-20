import os

import psycopg2
from psycopg2 import Error

try:
    # Connect to PostgreSQL
    connection = psycopg2.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "VitaVision"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
    )

    cursor = connection.cursor()

    # Get current user
    cursor.execute("SELECT current_user;")
    current_user = cursor.fetchone()[0]

    # Get current database
    cursor.execute("SELECT current_database();")
    current_database = cursor.fetchone()[0]

    print("=" * 50)
    print("✅ Successfully Connected to PostgreSQL!")
    print(f"👤 User     : {current_user}")
    print(f"🗄️ Database : {current_database}")
    print("=" * 50)

    print("\nType your SQL command.")
    print("Examples:")
    print("   SELECT * FROM person;")
    print("   SELECT version();")
    print("Type 'exit' to quit.\n")

    while True:

        sql = input(f"{current_user}> ").strip()

        # Exit condition
        if sql.lower() == "exit":
            break

        # Block psql meta-commands
        if sql.startswith("\\"):
            print("⚠️ Meta-commands like \\d, \\dt are not supported in this Python tool.")
            continue

        try:
            cursor.execute(sql)

            # If query returns data (SELECT, etc.)
            if cursor.description:
                rows = cursor.fetchall()

                # Print column names
                columns = [desc[0] for desc in cursor.description]
                print("\n" + " | ".join(columns))
                print("-" * 60)

                for row in rows:
                    print(row)

            else:
                connection.commit()
                print("✅ Command executed successfully.")

        except Exception as e:
            print("❌ Error:", e)

            # 🔥 Important fix: reset broken transaction state
            try:
                connection.rollback()
            except Exception as e:
                print(e)

except (Exception, Error) as error:
    print("Connection Error:")
    print(error)

finally:
    if "cursor" in locals():
        cursor.close()

    if "connection" in locals():
        connection.close()

    print("\nDisconnected from PostgreSQL.")
