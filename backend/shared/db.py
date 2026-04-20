import os
import psycopg

def get_connection():
    url = os.environ["DATABASE_URL"]
    schema = os.environ.get("PGSCHEMA", "")
    # If a schema is set, apply it as the search_path so tables are found
    # without schema-qualifying every query (mirrors nuttiness PGSCHEMA pattern).
    options = f"-c search_path={schema}" if schema else ""
    return psycopg.connect(url, options=options or None, row_factory=psycopg.rows.dict_row)
