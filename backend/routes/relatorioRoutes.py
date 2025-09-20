from utils.contadores import get_next_numero_relatorio
from fastapi import HTTPException
from bson import ObjectId

async def create_relatorio(relatorio: RelatorioCreate):
    # Obtener el siguiente número de relatório
    numero = await get_next_numero_relatorio(str(relatorio.empresa_id))
    
    # Crear el documento del relatório
    relatorio_dict = relatorio.model_dump()
    relatorio_dict["numero"] = numero
    
    # Insertar en la base de datos
    result = await relatorios_collection.insert_one(relatorio_dict)

async def export_relatorio(relatorio_id: str):
    relatorio = await relatorios_collection.find_one({"_id": ObjectId(relatorio_id)})
    if not relatorio:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
        
    numero = relatorio.get("numero", "SN")  # SN = Sin Número como fallback
    # Usar el número en el nombre del archivo exportado
    filename = f"Relatorio_{numero}_{relatorio_id}.pdf"

