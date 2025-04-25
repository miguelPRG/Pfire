from motor.motor_asyncio import AsyncIOMotorClient
import os

# Obter a URI do MongoDB do arquivo .env
uri = os.getenv("MONGO_URL")  # A URI do MongoDB Atlas

"""Caminhos dos arquivos de chave e certificado
private_key_path = os.getenv("PRIVATE_KEY_PATH")  # Caminho para sua chave privada
6ca_cert_path = os.getenv("CA_CERT_PATH")  # Caminho para o certificado da autoridade certificadora (CA)
"""
# Conectar ao MongoDB usando autenticação X.509
"""client = pymongo.MongoClient(
    uri,
    tls=True,
    tlsCertificateKeyFile=private_key_path,
    tlsCAFile=ca_cert_path,
    authMechanism="MONGODB-X509",
    authSource="$external"  # Usado para autenticação X.509
)"""

client = AsyncIOMotorClient(uri)

try:
    # Testar a conexão com um comando 'ping'
    client.admin.command('ping')
    print("Conexão bem-sucedida com o MongoDB!")
except Exception as e:
    print(f"Erro ao conectar-se ao MongoDB: {e}")

# Acesso ao banco de dados
db = client["pfire"]  # Substitua pelo nome do banco de dados desejado

# Coleções
users_collection = db["users"]
empresas_collection = db["empresas"]
users_empresas_collection = db["users_empresas"]
clientes_collection = db["clientes"]
modelos_collection = db["modelos"]
relatorios_collection = db["relatorios"]