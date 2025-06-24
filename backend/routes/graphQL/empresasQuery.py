from .types.empresaType import Empresa
from database import empresas_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
import strawberry
from strawberry.types import Info
from fastapi import HTTPException
from bson import ObjectId
from base64 import b64encode  # Importa o módulo base64 para conversão


@strawberry.type
class EmpresaQuery:
    @strawberry.field
    async def empresas(self, info: Info, id: str = None, start: int = 0, lmt: int = 10) -> list[Empresa]:

        if lmt <= 0 or lmt > 10:
            lmt = 10

        if start < 0:
            start = 0

        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)

        empresas = []

        # Se o id for fornecido, quero apenas essa empresa
        user_empresas = None
        if id:
            if not jwt["isSuperAdmin"]:
                # Verifica se o utilizador tem acesso à empresa
                user_empresas = await users_empresas_collection.find_one(
                    {"user_id": ObjectId(jwt["user_id"]), "empresa_id": ObjectId(id)}
                )
                if not user_empresas:
                    raise HTTPException(
                        status_code=403, detail="Acesso negado! Não tens permissão para ver esta empresa."
                    )

            filtro = {"_id": ObjectId(id)}

        # Se for super administrador, quero todas as empresas
        elif jwt.get("isSuperAdmin", False):
            filtro = {}

        # Caso contrário, quero as empresas associadas ao utilizador
        else:
            user_empresas = await users_empresas_collection.find({"user_id": ObjectId(jwt["user_id"])}).to_list(None)
            empresa_ids = [user_empresa["empresa_id"] for user_empresa in user_empresas]
            filtro = {"_id": {"$in": empresa_ids}}

        async for empresa in empresas_collection.find(filtro).skip(start).limit(lmt):
            empresa_data = {
                "id": str(empresa.get("_id")),
                "nome": empresa.get("nome"),
                "nif": empresa.get("nif"),
                "telefone": empresa.get("telefone"),
                "morada": empresa.get("morada"),
                "localidade": empresa.get("localidade"),
                "codigo_postal": empresa.get("codigo_postal"),
                "created_by": empresa.get("created_by"),
                "created_at": empresa.get("created_at"),
                "updated_by": empresa.get("updated_by"),
                "updated_at": empresa.get("updated_at"),
            }

            if empresa.get("logo"):
                logo_base64 = b64encode(empresa["logo"]).decode("utf-8")
                empresa_data["logo"] = logo_base64

            if jwt["isSuperAdmin"]:
                empresa_data["isAdmin"] = True
            else:
                if isinstance(user_empresas, list):
                    empresa_data["isAdmin"] = any(
                        user_empresa["empresa_id"] == empresa["_id"] and user_empresa.get("isAdmin", False)
                        for user_empresa in user_empresas
                    )
                elif isinstance(user_empresas, dict):
                    empresa_data["isAdmin"] = user_empresas.get("isAdmin", False)
                else:
                    empresa_data["isAdmin"] = False

            empresa_data = {
                k: v for k, v in empresa_data.items() if k not in ["created_by", "updated_by", "updated_at"]
            }

            empresas.append(Empresa(**filter_null_fields(empresa_data)))

        return empresas
