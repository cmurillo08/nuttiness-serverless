SALE_HEADER_SELECT = """
    SELECT
      s.id,
      s.customer_id,
      c.name AS customer_name,
      s.status,
      s.total_amount,
      s.created_at,
      s.updated_at
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
"""


def list_sales(limit: int, offset: int, status: str | None, conn) -> list[dict]:
    with conn.cursor() as cur:
        if status:
            cur.execute(
                f"""
                {SALE_HEADER_SELECT}
                WHERE s.status = %s
                ORDER BY s.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (status, limit, offset),
            )
        else:
            cur.execute(
                f"""
                {SALE_HEADER_SELECT}
                ORDER BY s.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
        return cur.fetchall()


def count_sales(status: str | None, conn) -> int:
    with conn.cursor() as cur:
        if status:
            cur.execute("SELECT COUNT(*) AS count FROM sales WHERE status = %s", (status,))
        else:
            cur.execute("SELECT COUNT(*) AS count FROM sales")
        row = cur.fetchone()
        return row["count"] if row else 0


def get_sale_by_id(id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(f"{SALE_HEADER_SELECT} WHERE s.id = %s", (str(id),))
        sale = cur.fetchone()
        if not sale:
            return None

        cur.execute(
            """
            SELECT
              si.id,
              si.prepared_product_id,
              pp.name AS product_name,
              pp.unit,
              si.quantity,
              si.unit_price,
              si.line_total
            FROM sale_items si
            LEFT JOIN prepared_products pp ON si.prepared_product_id = pp.id
            WHERE si.sale_id = %s
            ORDER BY si.created_at
            """,
            (str(id),),
        )
        lines = cur.fetchall()

        return {**sale, "lines": lines}


def customer_exists(id: str, conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM customers WHERE id = %s", (str(id),))
        return cur.fetchone() is not None


def prepared_product_exists(id: str, conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM prepared_products WHERE id = %s", (str(id),))
        return cur.fetchone() is not None


def create_sale_record(customer_id: str | None, status: str, total_amount, conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sales (customer_id, status, total_amount)
            VALUES (%s, %s, %s)
            RETURNING *
            """,
            (str(customer_id) if customer_id else None, status, total_amount),
        )
        return cur.fetchone()


def insert_sale_item(
    sale_id: str,
    prepared_product_id: str | None,
    quantity,
    unit_price,
    line_total,
    conn,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sale_items (sale_id, prepared_product_id, quantity, unit_price, line_total)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (str(sale_id), str(prepared_product_id) if prepared_product_id else None, quantity, unit_price, line_total),
        )


def get_sale_status(id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("SELECT id, status FROM sales WHERE id = %s", (str(id),))
        return cur.fetchone()


def update_sale_status(id: str, to_status: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE sales
            SET status = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (to_status, str(id)),
        )
        return cur.fetchone()


def recalculate_sale_total(id: str, conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE sales
            SET total_amount = (
                SELECT COALESCE(SUM(line_total), 0)
                FROM sale_items
                WHERE sale_id = %s
            ),
            updated_at = now()
            WHERE id = %s
            """,
            (str(id), str(id)),
        )


def get_sale_item_by_id(sale_id: str, item_id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM sale_items WHERE sale_id = %s AND id = %s",
            (str(sale_id), str(item_id)),
        )
        return cur.fetchone()


def update_sale_item(sale_id: str, item_id: str, quantity, unit_price, line_total, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE sale_items
            SET quantity = %s,
                unit_price = %s,
                line_total = %s
            WHERE sale_id = %s AND id = %s
            RETURNING *
            """,
            (quantity, unit_price, line_total, str(sale_id), str(item_id)),
        )
        return cur.fetchone()


def delete_sale_item(sale_id: str, item_id: str, conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM sale_items WHERE sale_id = %s AND id = %s RETURNING *",
            (str(sale_id), str(item_id)),
        )
        return cur.fetchone()


def count_sale_items(sale_id: str, conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM sale_items WHERE sale_id = %s", (str(sale_id),))
        row = cur.fetchone()
        return row["count"] if row else 0