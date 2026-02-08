# Projeto PFire

**Pfire** é uma aplicação de geração de relatórios de inspeção de segurança de dispositivos de emergência e socorro. Segue-se agora uma explicação detalhada de como executar o código e como proceder consoante futuras atualizações.

## Instruções

Este projeto utiliza a implementação **FARM STACK Application**. Ou seja, **FastAPI** no backend, **React** no frontend, e **MongoDB** como sistema de base de dados. As duas primeiras tecnologias são executadas em diretórios separados, no diretório **frontend** e **backend** respetivamente. Também é utilizado **Firebase Authentication** apenas para login social, que é inteiramente opcional.

### Como Clonar o Projeto

A primeira coisa a fazer é clonar o repositório, utilizando estes comandos no terminal:

1. `git clone https://gitlab.com/protecao24h/pfire.git`
2. `cd /pfire`

### Pré-requisitos

Estes são os requesitos exenciais para que o projeto funcione corretamente.

#### Terminal Linux

Caso não possua uma máquina linux baseada em **Ubuntu/Debian**, instale o **WSL (Windows Subsystem for Linux)** ou outra solução que forneça um terminal linux (por exemplo, uma **VM Linux**, **Cygwin** ou **MSYS2**); É obrigatório a instalação de uma máquina virtual no terminal, que seja compativel com os comando que aqui se seguem. Recomenda-se **Ubuntu** ou **Debian**. Segue-se um exemplo de como instalar no **Windows**:

1. Abra o Powershell
2. `wsl --install`
3. Crie um utilizador e password
4. `sudo apt update && sudo apt full-upgrade -y`

Opcionalmente, podemos tornar a máquina **Ubuntu** como a máquina padrão do **WSL** com este comando:

`wsl --set-default Ubuntu`

**AVISO**: De modo a garantir que não haja nenhum problema no futuro, é altamente recomendada a repetição do passo 4 periodicamente. Assim, a máquina virtual ficará sempre atualizada, evitando problemas de icompatibilidade e segurança a longo prazo.

#### Python

Deverá ser instalado o python, com a versão mínima de 3.12

#### Nodejs

Deverá ser instalado o node, na versão mínima de 22

#### Docker (Opcional)

Poderá testar o **backend** num container do docker, caso prefira uma execução parecida com aquela que está em produção

### Como Criar os Ficheiro .env

**ATENÇÃO!** De modo que o programa consiga rodar sem problemas, é necessária a criação de dois ficheiros **.env**, tanto no diretório **backend** como no **frontend** . Este ficheiro será responsável por guardar dados sensíveis, como por exemplo a URL de acesso à base de dados **MongoDB** , chaves de criptografia e de APIs que serão utilizadas neste projeto, etc.

### Ficheiros .env

Crie o ficheiro `.env` no diretório **backend** exatamente com esse nome. De seguida, guarde os seguintes dados:

- `MONGODB_URL=mongodb+srv://<username>:<password>@pfire.c9mvo.mongodb.net/?retryWrites=true&w=majority&appName=pfire`
- `PRIVATE_KEY_PASSWORD=password`
- `BREVO_API_KEY=chave`
- `RECAPTCHA_SECRET_KEY=chave`
- `SITE_KEY=chave`
- `REDIS_HOST=host`
- `REDIS_PORT=port`
- `REDIS_PASSWORD=password`
**Esta variavel é opcional, apenas obrigatório em produção, substituir localhost pelo dominio do frontend**
- `SUCCESS_URL=localhost:3000`

Os dados aqui indicados deverão ser substituidos pelos respetivos valores verdadeiros, acordados entre os desenvolvedores.

Repita o mesmo passo no diretório do **frontend** com a seguinte variavel:

- `VITE_RECAPTCHA_SITE_KEY=recaptcha_token`

### Chaves de Criptografia JWT

Este projeto utiliza um sistema de autenticação baseado em JWT no `backend`, tal como poderá ser visualizado no seguinte ficheiro python: `backend\controller\auth.py`. Para testar o desenvolvimento, será necessário criar um par de chaves de criptografia e guardar as mesmas neste diretório: `/etc/secrets/`. Lembrando que para que este passo funcione, é **ALTAMENTE NECESSÁRIO** a utilização de um terminal linux baseado em **Ubuntu/Debian**. 

#### Criar chaves de criptografia

1. `mkdir secrets`
2. `cd secrets`
3. `openssl genpkey -algorithm RSA -aes-256-cbc -out privada.pem`
4. Crie uma password para proteger a chave privada(deverá ser **EXATAMENTE** igual a **PRIVATE_KEY_PASSWORD** que foi definido no ficheiro **.env** do **backend**)
5. `openssl rsa -in privada.pem -pubout -out publica.pem`

Depois de terminados estes passos será necessário incluir a chave de conta de serviço do **firebase** no diretório recém-criado com o seguinte nome: `serviceAccountKey.json`. Após isso: 

6. `cd ..`
7. `sudo cp -r secrets /etc/secrets`

### Diagrama de Base de Dados

![Diagrama de Base de Dados](diagrama.jpg)

### Como Executar Aplicação
Seguem-se os comando para testar a aplicação localmente

#### Ficheiros de Ativação

Para executar os servidores, foram criados ficheiros de ativação **Shell Script** que não só ligam as duas máquinas, como também garantem que são executadas com as dependências na versão mais recente. Seguem-se agora os passos para executar estes ficheiros em cada máquina

##### Executar Backend:

Caso esteja a rodar um terminal de linux numa máquina **Windows**, deverá ser executado este comando para evitar problemas de incopatibilidade entre **WSL** e **Windows**

Se ainda não estiver instalado: `sudo apt install dos2unix`

1. `cd /backend`
2. `dos2unix startBackend.sh` (Apenas necessário na primeira vez)
3. `sudo ./startBackend.sh` 

Opcionalmente, também pode rodar o backend num container do **Docker**. Para tal, basta rodar os seguintes comandos no diretório do **backend**: 

1. `docker buildx build .`
2. `docker image list --all` (este comando serve para listar as imagens que existem. Deverá copar o id daquela que foi criada no passo 1)
3. `docker run --name nome-que-quiser -p 8080:10000 id_imagem_copiado`

##### Executar Frontend:

Abra outro terminal e execute os seguintes comandos: 

1. `cd /frontend`
2. `dos2unix startFrontend.sh` (Apenas necessário na primeira vez)
3. `sudo ./startFrontend.sh`

### Como Instalar Novas Dependências

Caso sejam adicionadas novas dependências, estas deverão ser comunicadas o mais claramente possível, para que seja possível avaliar se estas podem ser incluídas no projeto e quais versões serão utilizadas.

**AVISO:** Em caso de alguma mudança nestes ficheiros: **backend\pyproject.toml**, **backend\uv.lock**, **frontend\package.json** ou **frontend\package-lock.json**, por favor justifique a sua alteração. Poderão haver problemas de incompatibilidade em caso de instalações de novas dependências, ou atualizações das mesmas. Assim sendo, estas mudanças deverão ser unicamente enviadas num **commit** reservado apenas para esse efeito. **Não serão aceites commits que contenham mudanças não justificadas nestes ficheiros, para futuras avaliações de merge requests**

### Branch Main e Develop

Como é possível verificar, o projeto contém dois branches principais: **main** e **develop**. Nós vamos trabalhar com a lógica do **git flow**, o que significa que qualquer alteração direta do branch **main** e **develop** direcionada para o repositório remoto (**git push**) encontra-se devidamente protegida. Só é possível atualizar estes branches mediante um **git merge** previamente solicitado (através de um **merge request**) e/ou avaliado pelos administradores deste repositório como uma alteração do projeto válida.

**AVISO**: É extremamente importante que todo o trabalho de desenvolvimento ou correção de bugs(Salvo bugs na versão de produção) seja feito na branch **develop**, ou em ramificações da mesma.

### Como Observar o Projeto a Funcionar Localmente

O **backend** estará em [http://localhost:8000](http://localhost:8000) e o **frontend** em [http://localhost:3000](http://localhost:3000).

### Como Atualizar o Projeto

Para obter as últimas alterações do projeto execute o comando `git pull` principalmente no branch **develop**. Após isso, deverá executar o comando `git merge develop` na branch que está a trabalhar, para puxar as ultimas alterações do projeto em geral, tendo o devido cuidado na resolução de conflitos. 

### Pipeline e Verificação de Segurança

Quando for publicada uma nova alteração, a **pipeline** será executada no servidor. Esta fará uma simples análise de segurança, para garantir que não é enviado código malicioso. Caso seja detectada uma anomalia, o commit enviado ficará marcado como **failed**. Isto vai informar os administradores que pode ser descartado.

Por esta razão, recomenda-se a efetuação de uma análise de vulnerabilidades antes de executar **git push**. Os comandos utilizados para tal estão listados no ficheiro **.gitlab-ci.yml**.

**ATENÇÃO**: Não serão aceites commits marcados como **failed** em merge requests.

### Para Terminar

**ATENÇÃO**: Não se recomendam alterações nestes ficheiros, salvo em cenários extramamente específicos:

- `Dockerfiles`
- `docker-compose.yml`
- `vite.config.ts`
- `.gitlab-ci.yml`
- Ativadores **Shell Script** como `startBackend.sh` e `startFrontend.sh`
- `netlify.toml`

## Conclusão

Este projeto foi elaborado e organizado de modo que o desenvolvimento corporativo fosse o mais simples e organizado possível. Em caso de alguma dúvida, por favor entre em contacto com Miguel Gonçalves!

Email: miguel@psafe365.com
Whatsapp: +351938946732
