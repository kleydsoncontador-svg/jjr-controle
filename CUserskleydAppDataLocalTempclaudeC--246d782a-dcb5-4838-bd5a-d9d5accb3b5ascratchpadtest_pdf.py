import pdfplumber
import json
import requests

# Extrai o texto do PDF
pdf_path = r"X:\03 - CONTABIL\CLIENTES\Fast Lube - 163\2026\Comprovantes Bancários de Pagamentos em PDF\Itaú - Comprovantes Bancários de Pagamentos em PDF_2026-07\bklcom26.pdf"

try:
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total de páginas: {len(pdf.pages)}")
        
        # Extrai texto de todas as páginas
        textos = []
        for i, page in enumerate(pdf.pages[:5]):  # Primeiro 5 páginas para teste
            texto = page.extract_text()
            print(f"Página {i+1}: {len(texto) if texto else 0} caracteres")
            if texto:
                textos.append(texto)
        
        texto_completo = "\n".join(textos)
        print(f"\nTexto total extraído: {len(texto_completo)} caracteres")
        print(f"\nPrimeiros 500 caracteres:\n{texto_completo[:500]}")
        
        # Envia para a Edge Function
        SUPABASE_URL = 'https://hzotkhxmvausugzfkgbf.supabase.co'
        SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b3RraHhtdmF1c3VnemZrZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDExMjksImV4cCI6MjA5NzMxNzEyOX0.D7o6lHZa7T5yJMZ-J_s884yrIDj9TW3AQCu6nuz3gjA'
        
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/lancctb-parse-comprovante",
            json={"texto": texto_completo},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
        )
        
        print(f"\nStatus da API: {response.status_code}")
        print(f"Resposta:\n{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
