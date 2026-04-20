def list_prepared_products(conn, limit: int, offset: int) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM prepared_products ORDER BY created_at DESC LIMIT %s OFFSET %s", (limit, offset))
        return cur.fetchall()

def count_prepared_products(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM prepared_products")
        row = cur.fetchone()
        return row["count"] if row else 0

def get_prepared_product_by_id(conn, id: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM prepared_products WHERE id = %s", (id,))
        return cur.fetchone()

def create_prepared_product(conn, data: dict) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO prepared_products (name, price, unit, cost_price, recipe_notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                data["name"],
                data["price"],
                data["unit"],
                data.get("cost_price"),
                data.get("recipe_notes"),
            ),
        )
        return cur.fetchone()

def update_prepared_product_by_id(conn, id: str, data: dict) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE prepared_products
            SET name=%s, price=%s, unit=%s, cost_price=%s, recipe_notes=%s, updated_at=now()
            WHERE id=%s
            RETURNING *
            """,
            (
                data["name"],
                data["price"],
                data["unit"],
                data.get("cost_price"),
                data.get("recipe_notes"),
                id,
            ),
        )
        return cur.fetchone()

def delete_prepared_product_by_id(conn, id: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM prepared_products WHERE id=%s RETURNING *", (id,))
        return cur.fetchone()

# Raw products

def list_raw_products(conn, limit: int, offset: int) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM raw_products ORDER BY created_at DESC LIMIT %s OFFSET %s", (limit, offset))
        return cur.fetchall()

def count_raw_products(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM raw_products")
        row = cur.fetchone()
        return row["count"] if row else 0

def get_raw_product_by_id(conn, id: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM raw_products WHERE id = %s", (id,))
        return cur.fetchone()

def create_raw_product(conn, data: dict) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_products (name, unit, price, supplier)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (
                data["name"],
                data["unit"],
                data["price"],
                data.get("supplier"),
            ),
        )
        return cur.fetchone()

def update_raw_product_by_id(conn, id: str, data: dict) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE raw_products
            SET name=%s, unit=%s, price=%s, supplier=%s, updated_at=now()
            WHERE id=%s
            RETURNING *
            """,
            (
                data["name"],
                data["unit"],
                data["price"],
                data.get("supplier"),
                id,
            ),
        )
        return cur.fetchone()

def delete_raw_product_by_id(conn, id: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM raw_products WHERE id=%s RETURNING *", (id,))
        return cur.fetchone()
