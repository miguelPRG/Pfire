from database import contadores_collection

async def get_next_numero_relatorio(empresa_id: str) -> int:
    """
    Obtiene y actualiza el siguiente número de relatório para una empresa específica
    """
    result = await contadores_collection.find_one_and_update(
        {"_id": f"relatorio_{empresa_id}"},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=True
    )
    return result["sequence_value"]