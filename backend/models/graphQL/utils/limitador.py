# Função de controle de taxa (Rate Limiting)
async def rate_limit(client_ip: str):
    current_time = int(time.time())
    
    if client_ip in rate_limiter:
        timestamps = rate_limiter[client_ip]
        # Filtra as requisições que aconteceram no intervalo de tempo permitido
        timestamps = [timestamp for timestamp in timestamps if current_time - timestamp < TIME_FRAME]
        rate_limiter[client_ip] = timestamps
        
        if len(timestamps) >= LIMIT:
            raise HTTPException(status_code=429, detail="Too Many Requests")
        
        # Adiciona o timestamp da nova requisição
        rate_limiter[client_ip].append(current_time)
    else:
        # Se o IP não existir no rate_limiter, cria uma nova entrada
        rate_limiter[client_ip] = [current_time]