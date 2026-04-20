import os
import psycopg

def get_connection():
    url = os.environ["DATABASE_URL"]
    return psycopg.connect(url, row_factory=psycopg.rows.dict_row)
