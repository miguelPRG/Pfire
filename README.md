# Projeto PFire
**Pfire** é uma aplicação de geração de relatórios de segurança de instalações. Segue-se agora uma explicação detalhada de como executar o código e como proceder consoante futuras atualizações.

# Instruções
Este projeto utiliza **FastAPI** no **backend**, **React** no **frontend**, e **MongoDB** como sistema de base de dados. As duas primeiras tecnologias rodam em conteineres **Docker** na produção. Antes de escrever qualquer comando, certifique-se de ter aberto o seu editor de código com privilégios de administração. Caso utilize um SO não baseado em **UNIX** por exemplo: **Windows**, é altamente recomendado a instalação do **WSL** para a execução de alguns comandos.

## Como Clonar o Projeto
A primeira coisa a fazer é clonar o repositório, utilizando estes comandos no terminal para tal: 
1. `git clone https://gitlab.com/protecao24h/pfire.git`
2. `cd /pfire`

## Pré-requisitos
- O **Docker** e **Docker Compose** precisam obrigatoriamente de estar instalados para testar a aplicação em produção.
- Se pretender testar a aplicação apenas para desenvolvimento, poderá executar os servidores **frontend** e **backend** individualmente.

**ATENÇÃO!** De modo que o programa consigo rodar sem problemas, é necessário a criação de um ficheiro `.env` na raiz do projeto. Este ficheiro será responsavel por guardar dados sensiveis, como por exemplo a URL de acesso à base de dados **MongoDB** e outras chaves de **APIs** que poderão vir a ser necessárias. 

## Como Criar Ficheiro env 
Crie o ficheiro `.env` exatamente com este nome. De seguida guarde os seguintes dados:

- **MONGO_URL**: 'mongodb+srv://<db_username>:<db_password>@pfire.c9mvo.mongodb.net/?retryWrites=true&w=majority&appName=pfire'

Substitua pelo o seu `username` e `password`.

### Como Executar Servidores para Desenvolvimento

**AVISO**: É altamente recomendado a execução dos próximos comandos aqui apresentados, utilizando o terminal `WSL`. Deverá também ser instalado de seguida uma máquina Linux dentro do WSL, como por exemplo `Ubuntu`ou `Debian`. Para iso basta utilizar o comando `wsl --install`.

#### Executar Frontend:
1. `cd /frontend`
2. `npm install`
3. `npm run dev` 

#### Executar Backend: 
1. `cd /backend`
2. `python3 -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`

### Como Executar a Aplicação no Geral para Produção
Para testar como a aplicação irá ser executada em produção como um todo, bastará utilizar o seguinte comando no diretório raiz do projeto, assumindo que tenha privilégios de administração e que o docker esteja devidamente instalado.

- `docker-compose up --build`

## Como Instalar Novas Dependências
Caso sejam adicionadas novas dependências, estas deverão ser comunicadas o mais claramente possível, para que seja possível avaliar se estas podem ser incluídas no projeto e quais versões serão utilizadas.

### Como Atualizar o Backend
De tempos a tempos, o ficheiro requirements.txt poderá vir a ser alterado para incluir as novas dependências ou versões. Por esta razão, é altamente recomendado a execução do seguinte comando, para obter todas as mudanças:

`pip install --no-cache-dir -r requirements.txt`

Caso tenha sido instalada uma nova dependência do python, ou nova versão de uma já existente, estas mudanças deverão ser justificadas no `merge request` após o `git push` do novo `commit`. Não esquecendo de gerar o ficheiro `requirements.txt` de novo, desta vez com a lista de dependências do **backend** atualizada:

`pip freeze > requirements.txt`

### Como Atualizar Frontend
Tal como no **backend**, também existem ficheiros que contêm dependências utilizadas no **frontend**: `package.json` e o `package-lock.json`. Estes ficheiros também podem vir a ser alterados, felizmente estes são atualizados automaticamente sempre que uma nova dependência é atualizada ou instalada. Para obter as dependências atualizadas basta executar o seguinte comando: 

`npm install`

**ATENÇÃO:** Em caso de alguma mudança nestes ficheiros, por favor justifique a sua alteração. Poderão haver problemas de incompatibilidade em caso de instalação de novas dependências, ou atualizações das mesmas. Assim sendo, proceda com cautela.

## Branch Main e Develop
Como é possivel verificar, o projeto contém dois branches principais: `main` e `develop`. Nós vamos trabalhar com a lógica do `git flow`, o que significa que qualquer alteração direta do branch `main` e `develop` direcionada para o repositório remoto (`git push`) encontra-se estritamente protegida. Só é possivel atualizar estes branches mediante de um `git merge` previamente solicitado (através de um `merge request`) e/ou avaliado pelos administradores deste repositório como uma alteração do projeto válida.

**AVISO**: É estremamente importante que todo o trabalho seja feito na branch `develop`, ou em ramificações da mesma.

## Como Observar o Projeto a Funcionar
O **backend** estará em [http://localhost:8000](http://localhost:8000) e o **frontend** em [http://localhost:3000](http://localhost:3000). Lembrando que os seguintes URLs estarão apenas disponiveis no caso da execução explícita dos servidores para desenvolvimento(*ver Executar Servidor*). No caso da execução da aplicação geral utilizando o `docker-compose`, o **backend** não estará acessivel de forma direta, mas sim isolado na rede privada do `docker`, e o **frontend** ficará acessivel na porta **HTTP/HTTPS**. Isto acontece porque o **docker** executa a aplicação para produção, pelo que não faria sentido tornar o **backend** acessível, nem incluir uma porta no **frontend** para os utilizadores finais. 

## Como Atualizar o Projeto
1. Para obter as últimas alterações do projeto execute o comando `git pull` principalmente no branch `develop`. Se for necessário, atualize as dependências do backend e frontend com os comandos previamente indicados.
2. Para garantir que o projeto é executado de forma completamente atualizada, execute o seguinte comando:

- `docker-compose up --build`

## Comandos Úteis do Docker
- Para parar e destruir os conteineres: `docker-compose down`
- Para rodar os conteineres em segundo plano: `docker-compose up -d`

## Pipeline e Verificação de Segurança
Quando for publicada um nova alteração , a `pipeline` será executada no servidor. Esta fará uma simples análise de segurança, para garantir que não é enviado código malicioso. Caso seja detetado uma vulnerabilidade, o `commit` enviado ficará marcado como **failed**. Isto vai informar os administradores que aquele `commit` possui vulnerabilidades de segurança.
Por esta razão, é fortemente indicado efetuar uma análise de vulnerabilidades antes de executar `git push`. Os comandos utilizados para tal estão listados no ficheiro `.gitlab-ci.yml`.
Não serão aceites commits marcados como **failed** em merge requests.

## Comunicação entre Frontend e Backend
Os endpoints das `APIs` foram definidas em `python`, utilizando a framework do **FastAPI**. Para acedar ao `backend` pelo `frontend`, bastará realizar um `fetch('backend')` e a comunicação entre os dois containers será estabelecida. Para aceder ao resto dos endpoints, será necessário consultar as rotas previamente estabelecidas na pasta `routes` do `backend`.

## Conclusão
Este projeto foi elaborado e organizado de modo que o desenvolvimento coorporativo fosse o mais simples e organizado possivel. Em caso de alguma dúvida, por favor entre em contacto com Miguel Gonçalves!

Email: miguelgoncalves2024@hotmail.com
Número: 938946732