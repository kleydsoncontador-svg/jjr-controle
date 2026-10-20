# Referência INDEPENDENTE (Python Decimal) para os testes de regressão das Calculadoras JJR.
# Gera tests/fixtures/calc_referencia.json — o teste em Node compara o motor com estes valores.
from decimal import Decimal as D, ROUND_HALF_UP
import json
def r2(x): return x.quantize(D('0.01'), rounding=ROUND_HALF_UP)
INSS=[(D('1621.00'),D('0.075')),(D('2902.84'),D('0.09')),(D('4354.27'),D('0.12')),(D('8475.55'),D('0.14'))]
def inss(b):
    b=min(b,D('8475.55')); acc=D(0); ant=D(0)
    for lim,al in INSS:
        if b>ant: acc+=(min(b,lim)-ant)*al; ant=lim
    return r2(acc)
FX=[(D('2428.80'),D('0'),D('0')),(D('2826.65'),D('0.075'),D('182.16')),(D('3751.05'),D('0.15'),D('394.16')),(D('4664.68'),D('0.225'),D('675.49')),(None,D('0.275'),D('908.73'))]
def irrf(rend,prev,ndep,pens=D(0)):
    legais=prev+D('189.59')*ndep+pens; ded=max(legais,D('607.20')); base=max(D(0),rend-ded)
    for lim,al,pd in FX:
        if lim is None or base<=lim: bruto=max(D(0),r2(base*al-pd)); break
    if rend<=D('5000'): red=min(bruto,D('312.89'))
    elif rend<=D('7350'): red=min(bruto,max(D(0),r2(D('978.62')-D('0.133145')*rend)))
    else: red=D(0)
    return bruto-red
out=[]
for rend in ['1500','2428.80','3000','3500.55','4000','4500','5000','5000.01','5500','6000','7000','7350','7350.01','9000','12000','25000']:
    r=D(rend); i=inss(r); out.append({'rend':rend,'inss':str(i),'irrf_sem_prev':str(irrf(r,D(0),0)),'irrf_com_inss_2dep':str(irrf(r,i,2))})
json.dump(out,open('tests/fixtures/calc_referencia.json','w'),indent=1)
print(len(out),'casos')
