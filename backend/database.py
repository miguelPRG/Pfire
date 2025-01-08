import pymongo
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

uri = os.getenv("MONGO_URL")

client = pymongo.MongoClient(uri)

try:
    client.admin.command('ping')
    print("Conexão bem-sucedida com o MongoDB!")
except Exception as e:
    print(f"Erro ao conectar-se ao MongoDB: {e}")

# Acesso ao banco de dados
db = client["pfire"]  # Substituir pelo nome do banco de dados desejado
