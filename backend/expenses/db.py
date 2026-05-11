import psycopg

def list_expenses(conn, limit, offset, raw_product_id=None):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        params = {"limit": limit, "offset": offset}
        where = ""
        if raw_product_id:
            where = "WHERE e.raw_product_id = %(raw_product_id)s::uuid"
            params["raw_product_id"] = raw_product_id
        cur.execute(
            f"""
            SELECT e.id, e.raw_product_id, e.quantity, e.cost, e.purchased_at, e.notes, e.created_at, e.updated_at,
                   json_build_object('id', rp.id, 'name', rp.name, 'supplier', rp.supplier) AS raw_product
            FROM expenses e
            LEFT JOIN raw_products rp ON e.raw_product_id = rp.id
            {where}
            ORDER BY e.purchased_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params
        )
        return cur.fetchall()

def count_expenses(conn, raw_product_id=None):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        params = {}
        where = ""
        if raw_product_id:
            where = "WHERE raw_product_id = %(raw_product_id)s::uuid"
            params["raw_product_id"] = raw_product_id
        cur.execute(
            f"SELECT COUNT(*) AS count FROM expenses {where}",
            params
        )
        row = cur.fetchone()
        return row["count"] if row else 0

def get_expense_by_id(conn, id):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            "SELECT * FROM expenses WHERE id = %(id)s::uuid",
            {"id": id}
        )
        return cur.fetchone()

def raw_product_exists(conn, raw_product_id):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            "SELECT 1 FROM raw_products WHERE id = %(id)s::uuid",
            {"id": raw_product_id}
        )
        return cur.fetchone() is not None

def create_expense(conn, data):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            """
            INSERT INTO expenses (raw_product_id, quantity, cost, purchased_at, notes)
            VALUES (%(raw_product_id)s::uuid, %(quantity)s, %(cost)s, %(purchased_at)s, %(notes)s)
            RETURNING *
            """,
            data
        )
        return cur.fetchone()

def update_expense(conn, id, data):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            """
            UPDATE expenses
            SET raw_product_id = %(raw_product_id)s::uuid,
                quantity = %(quantity)s,
                cost = %(cost)s,
                purchased_at = %(purchased_at)s,
                notes = %(notes)s,
                updated_at = now()
            WHERE id = %(id)s::uuid
            RETURNING *
            """,
            {**data, "id": id}
        )
        return cur.fetchone()

def delete_expense(conn, id):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            "DELETE FROM expenses WHERE id = %(id)s::uuid RETURNING *",
            {"id": id}
        )
        return cur.fetchone()
