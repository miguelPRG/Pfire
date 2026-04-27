from asyncio import gather
from base64 import b64encode
from datetime import datetime, time
from re import escape

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from controller.gerarPDF import gerar_pdf
from controller.relatorio_utils import extract_numero_relatorio
from database import (
    clientes_collection,
    criterios_collection,
    empresas_collection,
    modelos_collection,
    relatorios_collection,
    users_collection,
    users_empresas_collection,
)
from models.userModels import UserConverterPDF

routerPDF = APIRouter(prefix="/user")

DEFAULT_EXPORT_REPORT_LIMIT = 25
DEFAULT_EXPORT_CREATOR_LIMIT = 15
MAX_EXPORT_OPTIONS_LIMIT = 50


def _parse_object_id(value: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"{field_name} invalido.")
    return ObjectId(value)


def _normalize_limit(limit: int, default: int) -> int:
    if limit <= 0:
        return default
    return min(limit, MAX_EXPORT_OPTIONS_LIMIT)


def _build_base_report_filter(
    empresa_id: ObjectId,
    modelo_id: ObjectId,
    cliente_id: ObjectId,
) -> dict:
    return {
        "empresa_id": empresa_id,
        "modelo_id": modelo_id,
        "cliente_id": cliente_id,
    }


async def _validate_export_context(
    request: Request,
    empresa_id: ObjectId,
    modelo_id: ObjectId,
    cliente_id: ObjectId,
):
    jwt = getattr(request.state, "jwt", None)
    if not jwt or not jwt.get("user_id"):
        raise HTTPException(status_code=401, detail="Token JWT ausente.")

    user_id = _parse_object_id(str(jwt["user_id"]), "Utilizador")

    user_future = users_collection.find_one({"_id": user_id, "isActive": True})
    empresa_future = empresas_collection.find_one({"_id": empresa_id})
    user_doc, empresa_doc = await gather(user_future, empresa_future)

    if not user_doc:
        raise HTTPException(
            status_code=404,
            detail="Utilizador nao encontrado ou inativo.",
        )
    if not empresa_doc:
        raise HTTPException(
            status_code=404,
            detail="Empresa nao encontrada ou inativa.",
        )

    modelo_future = modelos_collection.find_one(
        {"_id": modelo_id, "empresa_id": empresa_id}
    )
    cliente_future = clientes_collection.find_one(
        {"_id": cliente_id, "empresa_id": empresa_id}
    )
    modelo_doc, cliente_doc = await gather(modelo_future, cliente_future)

    if not modelo_doc:
        raise HTTPException(
            status_code=404,
            detail="Modelo nao encontrado para esta empresa.",
        )
    if not cliente_doc:
        raise HTTPException(
            status_code=404,
            detail="Cliente nao encontrado para esta empresa.",
        )

    if not jwt.get("isSuperAdmin"):
        permissao = await users_empresas_collection.find_one(
            {"user_id": user_id, "empresa_id": empresa_id}
        )
        if not permissao:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado! Nao tens permissao para esta empresa.",
            )

    return jwt, user_id, user_doc, empresa_doc, modelo_doc, cliente_doc


@routerPDF.get("/export-report-options")
async def get_export_report_options(
    request: Request,
    empresa_id: str,
    modelo_id: str,
    cliente_id: str,
    query: str = "",
    limit: int = Query(
        default=DEFAULT_EXPORT_REPORT_LIMIT,
        ge=1,
        le=MAX_EXPORT_OPTIONS_LIMIT,
    ),
):
    empresa_object_id = _parse_object_id(empresa_id, "Empresa")
    modelo_object_id = _parse_object_id(modelo_id, "Modelo")
    cliente_object_id = _parse_object_id(cliente_id, "Cliente")

    await _validate_export_context(
        request=request,
        empresa_id=empresa_object_id,
        modelo_id=modelo_object_id,
        cliente_id=cliente_object_id,
    )

    search_term = query.strip()
    limited = _normalize_limit(limit, DEFAULT_EXPORT_REPORT_LIMIT)
    filtro = _build_base_report_filter(
        empresa_id=empresa_object_id,
        modelo_id=modelo_object_id,
        cliente_id=cliente_object_id,
    )

    if search_term:
        filtro["$expr"] = {
            "$regexMatch": {
                "input": {
                    "$toString": {
                        "$ifNull": ["$numero_id", {"$ifNull": ["$numero", "$number"]}]
                    }
                },
                "regex": escape(search_term),
                "options": "i",
            }
        }

    report_docs = await (
        relatorios_collection.find(
            filtro,
            {
                "_id": 1,
                "numero_id": 1,
                "numero": 1,
                "number": 1,
                "created_at": 1,
            },
        )
        .sort([("created_at", -1), ("_id", -1)])
        .limit(limited)
        .to_list(length=limited)
    )

    reports = [
        {
            "id": str(report["_id"]),
            "numeroId": extract_numero_relatorio(report),
            "createdAt": report.get("created_at"),
        }
        for report in report_docs
    ]
    return {"reports": reports, "limit": limited}


@routerPDF.get("/export-creator-options")
async def get_export_creator_options(
    request: Request,
    empresa_id: str,
    modelo_id: str,
    cliente_id: str,
    query: str = "",
    limit: int = Query(
        default=DEFAULT_EXPORT_CREATOR_LIMIT,
        ge=1,
        le=MAX_EXPORT_OPTIONS_LIMIT,
    ),
):
    empresa_object_id = _parse_object_id(empresa_id, "Empresa")
    modelo_object_id = _parse_object_id(modelo_id, "Modelo")
    cliente_object_id = _parse_object_id(cliente_id, "Cliente")

    await _validate_export_context(
        request=request,
        empresa_id=empresa_object_id,
        modelo_id=modelo_object_id,
        cliente_id=cliente_object_id,
    )

    search_term = query.strip()
    limited = _normalize_limit(limit, DEFAULT_EXPORT_CREATOR_LIMIT)
    creator_filter = _build_base_report_filter(
        empresa_id=empresa_object_id,
        modelo_id=modelo_object_id,
        cliente_id=cliente_object_id,
    )
    creator_filter["created_by"] = {"$exists": True, "$ne": None}

    creator_ids = await relatorios_collection.distinct("created_by", creator_filter)
    if not creator_ids:
        return {"creators": [], "limit": limited}

    users_filter = {"_id": {"$in": creator_ids}}
    if search_term:
        users_filter["nome"] = {
            "$regex": escape(search_term),
            "$options": "i",
        }

    creator_docs = await (
        users_collection.find(
            users_filter,
            {
                "_id": 1,
                "nome": 1,
            },
        )
        .sort("nome", 1)
        .limit(limited)
        .to_list(length=limited)
    )

    creators = [
        {
            "id": str(creator["_id"]),
            "nome": creator.get("nome", ""),
        }
        for creator in creator_docs
    ]
    return {"creators": creators, "limit": limited}


@routerPDF.post("/converter-pdf")
async def converter_relatorio_pdf(request: Request, user: UserConverterPDF):
    empresa_id = _parse_object_id(user.empresa_id, "Empresa")
    modelo_id = _parse_object_id(user.modelo_id, "Modelo")
    cliente_id = _parse_object_id(user.cliente_id, "Cliente")
    relatorio_ids = [ObjectId(relatorio_id) for relatorio_id in user.relatorio_ids or []]

    jwt, _, _, empresa_doc, modelo_doc, cliente_doc = await _validate_export_context(
        request=request,
        empresa_id=empresa_id,
        modelo_id=modelo_id,
        cliente_id=cliente_id,
    )

    size_20_mb = 20 * 1024 * 1024
    filtro_relatorios = _build_base_report_filter(
        empresa_id=empresa_id,
        modelo_id=modelo_id,
        cliente_id=cliente_id,
    )

    if relatorio_ids:
        filtro_relatorios["_id"] = {"$in": relatorio_ids}

    if user.created_by_id:
        filtro_relatorios["created_by"] = ObjectId(user.created_by_id)

    created_at_filter = {}
    if user.created_at_gte:
        created_at_filter["$gte"] = datetime.combine(user.created_at_gte, time.min)
    if user.created_at_lte:
        created_at_filter["$lte"] = datetime.combine(user.created_at_lte, time.max)
    if created_at_filter:
        filtro_relatorios["created_at"] = created_at_filter

    try:
        relatorios_para_pdf = await (
            relatorios_collection.find(filtro_relatorios)
            .sort([("created_at", -1), ("_id", -1)])
            .to_list(length=None)
        )

        if not relatorios_para_pdf:
            raise HTTPException(
                status_code=404,
                detail="Nenhum relatorio encontrado para conversao.",
            )

        empresa_logo = empresa_doc.get("logo")
        if empresa_logo:
            empresa_logo = b64encode(empresa_logo).decode("utf-8")

        criterio_found = await criterios_collection.find_one({"modelo_id": modelo_id})

        final_pdf = gerar_pdf(
            relatorios_para_pdf,
            modelo_doc,
            cliente_doc,
            empresa_logo,
            criterio_found,
            jwt.get("plano", "free") == "free",
        )
        final_pdf.seek(0)
        
        pdf_filename = f"relatorio_{cliente_doc.get('nome', 'export')}_{empresa_doc.get('nome', 'export')}.pdf"

        pdf_size = len(final_pdf.getvalue())
        if pdf_size > size_20_mb:
            raise HTTPException(
                status_code=413,
                detail=f"PDF demasiado pesado: {pdf_size/(1024*1024):.2f} MB (max 20 MB)",
            )

        return StreamingResponse(
            final_pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{pdf_filename}"'},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar PDF: {str(exc)}",
        )
