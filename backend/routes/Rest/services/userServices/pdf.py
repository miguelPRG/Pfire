from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from models.userModels import UserConverterPDF
from database import (
    users_collection,
    empresas_collection,
    users_empresas_collection,
    relatorios_collection,
    modelos_collection,
    clientes_collection,
    criterios_collection,
)
from asyncio import gather
from bson import ObjectId
from base64 import b64encode
from controller.gerarPDF import gerar_pdf

routerPDF = APIRouter(prefix="/user")


@routerPDF.post("/converter-pdf")
async def converter_relatorio_pdf(request: Request, user: UserConverterPDF):

    jwt = getattr(request.state, "jwt", None)
    if not jwt:
        raise HTTPException(status_code=401, detail="Token JWT ausente")

    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(user.empresa_id)
    modelo_id = ObjectId(user.modelo_id)
    cliente_id = ObjectId(user.cliente_id)

    # Busca user e empresa em paralelo
    user_future = users_collection.find_one({"_id": user_id, "isActive": True})
    empresa_future = empresas_collection.find_one({"_id": empresa_id})
    user_doc, empresa_doc = await gather(user_future, empresa_future)

    if not user_doc:
        raise HTTPException(
            status_code=404, detail="Utilizador não encontrado ou inativo."
        )
    if not empresa_doc:
        raise HTTPException(
            status_code=404, detail="Empresa não encontrada ou inativa."
        )

    # Busca modelo e cliente em paralelo
    modelo_future = modelos_collection.find_one(
        {"_id": modelo_id, "empresa_id": empresa_id}
    )
    cliente_future = clientes_collection.find_one(
        {"_id": cliente_id, "empresa_id": empresa_id}
    )
    modelo_doc, cliente_doc = await gather(modelo_future, cliente_future)

    if not modelo_doc:
        raise HTTPException(
            status_code=404, detail="Modelo não encontrado para esta empresa."
        )
    if not cliente_doc:
        raise HTTPException(
            status_code=404, detail="Cliente não encontrado para esta empresa."
        )

    # Permissão
    if not jwt.get("isSuperAdmin"):
        permissao = await users_empresas_collection.find_one(
            {"user_id": user_id, "empresa_id": empresa_id}
        )
        if not permissao:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado! Não tens permissão para esta empresa.",
            )

    SIZE_20_MB = 20 * 1024 * 1024
    relatorios_para_pdf = []

    try:
        cursor = relatorios_collection.find(
            {"modelo_id": modelo_id, "empresa_id": empresa_id, "cliente_id": cliente_id}
        ).sort("created_at", -1)

        async for rel in cursor:
            relatorios_para_pdf.append(rel)

        if not relatorios_para_pdf:
            raise HTTPException(
                status_code=404, detail="Nenhum relatório encontrado para conversão."
            )

        empresa_logo = empresa_doc.get("logo")
        if empresa_logo:
            empresa_logo = b64encode(empresa_logo).decode("utf-8")

        # Sacar criterios
        criterio_found = await criterios_collection.find_one({"modelo_id": modelo_id})

        # gerar_pdf deve retornar um BytesIO
        final_pdf = gerar_pdf(
            relatorios_para_pdf,
            modelo_doc,
            cliente_doc,
            empresa_logo,
            criterio_found,
            jwt.get("plano", "free") == "free",
        )
        final_pdf.seek(0)

        pdf_size = len(final_pdf.getvalue())
        if pdf_size > SIZE_20_MB:
            raise HTTPException(
                status_code=413,
                detail=f"PDF demasiado pesado: {pdf_size/(1024*1024):.2f} MB (máx 20 MB)",
            )

        return StreamingResponse(
            final_pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment;"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")
