def is_free_plan(plan: str | None) -> bool:
    normalized_plan = str(plan or "free").strip().lower()
    return normalized_plan == "free"
