def get_financial_summary(conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              (SELECT COALESCE(SUM(cost), 0)         FROM expenses)                    AS total_expenses_cost,
              (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'paid') AS total_sales_amount
            """
        )
        row = cur.fetchone()
        return {
            "total_expenses_cost": float(row["total_expenses_cost"]),
            "total_sales_amount": float(row["total_sales_amount"]),
        }
