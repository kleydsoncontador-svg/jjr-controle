import re
import os

FILES = [
    'supabase/functions/convaplicfin-extrair-tabela/index.ts',
    'supabase/functions/democ-extrair-balancete/index.ts',
    'supabase/functions/democ-extrair-dre/index.ts',
    'supabase/functions/emp-extrair-contrato/index.ts',
    'supabase/functions/imv-extrair-dados/index.ts',
    'supabase/functions/lancctb-ia-matching/index.ts',
    'supabase/functions/lancctb-parse-extrato/index.ts',
    'supabase/functions/luc-extrair-faturamento/index.ts',
    'supabase/functions/vr-pesquisa-mercado/index.ts',
]

for file_path in FILES:
    if not os.path.exists(file_path):
        print(f"⏭️  {file_path} — não existe")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove referências ao GROQ_API_KEY
    content = re.sub(r"const GROQ_API_KEY.*?\n", "", content)
    content = re.sub(r".*GROQ_API_KEY.*?\n", "", content)
    
    # Remove "GROQ_MODEL" ou variáveis similares
    content = re.sub(r"const GROQ.*?\n", "", content)
    
    # Remove funções Groq inteiras
    content = re.sub(r"async function extrairViaGroq.*?\n\}\n", "", content, flags=re.DOTALL)
    content = re.sub(r"function.*?Groq.*?\n\}\n", "", content, flags=re.DOTALL)
    
    # Remove comentários sobre Groq
    content = re.sub(r"// .*[Gg]roq.*\n", "", content)
    content = re.sub(r"/\* .*[Gg]roq.*?\*/", "", content, flags=re.DOTALL)
    
    # Remove lógica try/catch com fallback Groq
    content = re.sub(r"try \{\s*dados = await extrairViaGroq.*?\} catch.*?throw e;\s*\}", "", content, flags=re.DOTALL)
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {file_path}")
    else:
        print(f"⏭️  {file_path} — nada pra remover")

print("\n✅ Pronto! GROQ removido de todas as functions")
