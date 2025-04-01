import os
import subprocess
import sys
import platform

def main():
    # Verifica se a pasta venv existe
    if os.path.isdir("venv"):
        print("Ativando ambiente virtual existente...")
    else:
        print("Criando novo ambiente virtual...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

    # Caminho para o interpretador Python dentro do ambiente virtual
    if platform.system() == "Windows":
        venv_python = os.path.join("venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join("venv", "bin", "python")

    # Atualizar pip
    subprocess.run([venv_python, "-m", "pip", "install", "--upgrade", "pip"], check=True)

    # Instalar as dependências e remover pacotes não listados em requirements.txt, exceto pip
    subprocess.run([venv_python, "-m", "pip", "install", "--no-deps", "-r", "requirements.txt"], check=True)

    # Executar o Uvicorn usando o interpretador do ambiente virtual
    subprocess.run([venv_python, "-m", "uvicorn", "main:app", "--reload"], check=True)

if __name__ == "__main__":
    main()