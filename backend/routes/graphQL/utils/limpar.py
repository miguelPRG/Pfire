def filter_null_fields(user_data: dict) -> dict:
    return {k: v for k, v in user_data.items() if v is not None}