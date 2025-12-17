from .types.empresaType import Empresa, EmpresaList, EmpresaFilter
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
    async def getEmpresas(self, info: Info, id: str = None, start: int = 0, filter: EmpresaFilter = None) -> EmpresaList:
        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        lmt = 6

        filtro = {}
        empresas = []
        total_empresas = 0

        # Se id, name ou nif forem fornecidos, retorna empresas correspondentes
        if id:
            filtro_emp = {"_id": ObjectId(id)}
            empresa = await empresas_collection.find_one(filtro_emp)
            if not empresa:
                return EmpresaList(empresas=[], totalEmpresas=0)

            # Verifica permissões
            if jwt.get("isSuperAdmin", False):
                is_admin = True
            else:
                user_empresa = await users_empresas_collection.find_one(
                    {"user_id": ObjectId(jwt["user_id"]), "empresa_id": empresa["_id"]}
                )
                if not user_empresa or not user_empresa.get("isAdmin", False):
                    raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ver esta empresa.")
                is_admin = user_empresa.get("isAdmin", False)

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
                "isAdmin": is_admin,
            }
            if empresa.get("logo"):
                logo_base64 = b64encode(empresa["logo"]).decode("utf-8")
                empresa_data["logo"] = logo_base64

            empresas.append(Empresa(**filter_null_fields(empresa_data)))
            total_empresas = 1

            return EmpresaList(empresas=empresas, totalEmpresas=total_empresas)
        elif filter:
            filtro_emp = {}
            if filter.nome:
                filtro_emp["nome"] = {"$regex": f"^{filter.nome}", "$options": "i"}
            elif filter.nif:
                filtro_emp["nif"] = {"$regex": f"^{filter.nif}", "$options": "i"}
            elif filter.localidade:
                filtro_emp["localidade"] = {"$regex": f"^{filter.localidade}", "$options": "i"}
            elif filter.morada:
                filtro_emp["morada"] = {"$regex": f"^{filter.morada}", "$options": "i"}
            elif filter.codigo_postal:
                filtro_emp["codigo_postal"] = {"$regex": f"^{filter.codigo_postal}", "$options": "i"}
            elif filter.telefone:
                filtro_emp["telefone"] = {"$regex": f"{filter.telefone}", "$options": "i"}

            total_empresas = await empresas_collection.count_documents(filtro_emp)
            async for empresa in empresas_collection.find(filtro_emp).skip(start).limit(lmt):
                # Verifica permissões
                if jwt.get("isSuperAdmin", False):
                    is_admin = True
                else:
                    user_empresa = await users_empresas_collection.find_one(
                        {"user_id": ObjectId(jwt["user_id"]), "empresa_id": empresa["_id"]}
                    )
                    if not user_empresa or not user_empresa.get("isAdmin", False):
                        continue  # Ignora empresas sem permissão
                    is_admin = user_empresa.get("isAdmin", False)

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
                    "isAdmin": is_admin,
                }
                if empresa.get("logo"):
                    logo_base64 = b64encode(empresa["logo"]).decode("utf-8")
                    empresa_data["logo"] = logo_base64

                empresas.append(Empresa(**filter_null_fields(empresa_data)))

            return EmpresaList(empresas=empresas, totalEmpresas=total_empresas)

        # Se for superadmin, retorna todas as empresas
        elif jwt.get("isSuperAdmin", False):
            filtro = {}
        # Caso contrário, retorna empresas associadas ao utilizador
        else:
            user_empresas = await users_empresas_collection.find({"user_id": ObjectId(jwt["user_id"])}).to_list(None)
            empresa_ids = [user_empresa["empresa_id"] for user_empresa in user_empresas]
            filtro = {"_id": {"$in": empresa_ids}}

        total_empresas = await empresas_collection.count_documents(filtro)
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

            if jwt.get("isSuperAdmin", False):
                empresa_data["isAdmin"] = True
            else:
                empresa_data["isAdmin"] = any(
                    user_empresa["empresa_id"] == empresa["_id"] and user_empresa.get("isAdmin", False)
                    for user_empresa in user_empresas
                )

            empresas.append(Empresa(**filter_null_fields(empresa_data)))

        return EmpresaList(empresas=empresas, totalEmpresas=total_empresas)
