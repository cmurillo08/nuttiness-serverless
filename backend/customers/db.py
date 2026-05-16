CUSTOMER_SELECT = "id, name, phone, notes, created_at, updated_at"


def list_customers(limit: int, offset: int, conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {CUSTOMER_SELECT}
            FROM customers
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        return cur.fetchall()


def count_customers(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM customers")
        row = cur.fetchone()
        return row["count"] if row else 0


def get_customer_by_id(id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(f"SELECT {CUSTOMER_SELECT} FROM customers WHERE id = %s", (str(id),))
        return cur.fetchone()


def create_customer(data: dict, conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO customers (name, phone, notes)
            VALUES (%s, %s, %s)
            RETURNING {CUSTOMER_SELECT}
            """,
            (data["name"], data.get("phone"), data.get("notes")),
        )
        return cur.fetchone()


def update_customer(id: str, data: dict, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE customers
            SET name = %s,
                phone = %s,
                notes = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING {CUSTOMER_SELECT}
            """,
            (data["name"], data.get("phone"), data.get("notes"), str(id)),
        )
        return cur.fetchone()


def delete_customer(id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM customers WHERE id = %s RETURNING *", (str(id),))
        return cur.fetchone()