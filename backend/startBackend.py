import os
import subprocess
import platform
import venv


def create_virtual_env():
    """Cria o ambiente virtual usando o módulo venv."""
    print("Criando novo ambiente virtual...")
    venv.create("venv", with_pip=True)


def main():
    # Caminho para o interpretador Python dentro do ambiente virtual
    if platform.system() == "Windows":
        venv_python = os.path.join("venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join("venv", "bin", "python")

    # Verifica se a pasta venv existe
    if os.path.isdir("venv"):
        print("Ativando ambiente virtual existente...")

        # Desinstalar tudo o que não está no requirements.txt
        try:
            installed_packages = subprocess.run(
                [venv_python, "-m", "pip", "freeze"], capture_output=True, text=True, check=True
            ).stdout.splitlines()
        except subprocess.CalledProcessError:
            print("pip não está disponível no ambiente virtual. Recriando o ambiente...")
            os.system("rm -rf venv")
            create_virtual_env()
            installed_packages = []

        required_packages = []
        if os.path.isfile("requirements.txt"):
            with open("requirements.txt", "r") as req_file:
                required_packages = [line.split("==")[0] for line in req_file if line.strip()]

        packages_to_remove = set(pkg.split("==")[0] for pkg in installed_packages) - set(required_packages)

        if packages_to_remove:
            print(f"Removendo pacotes não listados em requirements.txt: {', '.join(packages_to_remove)}")
            subprocess.run([venv_python, "-m", "pip", "uninstall", "-y", *packages_to_remove], check=True)
    else:
        create_virtual_env()

    # Atualizar pip
    print("Atualizando o pip...")
    subprocess.run([venv_python, "-m", "pip", "install", "--upgrade", "pip"], check=True)

    # Instalar as dependências do requirements.txt
    if os.path.isfile("requirements.txt"):
        print("Instalando dependências do requirements.txt...")
        subprocess.run([venv_python, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    else:
        print("Arquivo requirements.txt não encontrado. Nenhuma dependência será instalada.")

    # Executar o Uvicorn usando o interpretador do ambiente virtual
    print("Iniciando o servidor Uvicorn...")
    subprocess.run([venv_python, "-m", "uvicorn", "main:app", "--reload"], check=True)


if __name__ == "__main__":
    main()
