def parse_pagination(query_params: dict) -> tuple[int, int]:
    """Returns (limit, offset). limit capped at 100."""
    limit = min(int(query_params.get("limit", 25)), 100)
    offset = int(query_params.get("offset", 0))
    return limit, offset

def build_pagination_response(items: list, total: int, limit: int, offset: int) -> dict:
    page = (offset // limit) + 1 if limit > 0 else 1
    return {"items": items, "total": total, "page": page, "limit": limit}
