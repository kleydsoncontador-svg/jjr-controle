/* Leitor de reserva para .xls (BIFF8) que a biblioteca de Excel do site devolve VAZIO.
   Caso real (05/11/2026): "VALENTINA Razão 09-2026.xls" (Domínio) — a planilha existe, mas os ponteiros internos de posição ficam errados e a
   biblioteca não acha as células. Aqui o fluxo "Workbook" é lido em sequência, registro a registro, sem usar esses ponteiros.
   Uso: XlsFallback.lerLinhas(arrayBuffer) -> matriz de linhas da 1ª planilha (como sheet_to_json header:1), ou null se não conseguir. */
(function(root){
  function u16(b,o){ return b[o]|(b[o+1]<<8); }
  function u32(b,o){ return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0; }
  function i32(b,o){ return b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24); }
  function f64(b,o){ return new DataView(b.buffer,b.byteOffset+o,8).getFloat64(0,true); }
  function rkVal(rk){
    var v;
    if(rk&2){ v=rk>>2; }
    else { var buf=new DataView(new ArrayBuffer(8)); buf.setUint32(4,(rk&0xFFFFFFFC)>>>0,true); buf.setUint32(0,0,true); v=buf.getFloat64(0,true); }
    return (rk&1)?v/100:v;
  }
  // SST com CONTINUE: lê as strings atravessando os blocos (cada bloco de continuação de uma string recomeça com 1 byte de flag)
  function lerSST(chunks){
    var ci=0, pos=8, out=[]; // pula cstTotal(4)+cstUnique(4)
    var total=u32(chunks[0],4);
    function disp(){ return chunks[ci].length-pos; }
    function proxChunk(){ ci++; pos=0; }
    while(out.length<total && ci<chunks.length){
      if(disp()<=0){ if(ci+1>=chunks.length) break; proxChunk(); }
      var c=chunks[ci];
      if(disp()<3){ if(ci+1>=chunks.length) break; proxChunk(); c=chunks[ci]; }
      var cch=u16(c,pos), fl=c[pos+2]; pos+=3;
      var rich=!!(fl&8), ext=!!(fl&4), wide=!!(fl&1), cRun=0, cbExt=0;
      if(rich){ cRun=u16(chunks[ci],pos); pos+=2; }
      if(ext){ cbExt=u32(chunks[ci],pos); pos+=4; }
      var s='', falta=cch;
      while(falta>0){
        if(disp()<=0){ if(ci+1>=chunks.length) break; proxChunk(); wide=!!(chunks[ci][pos]&1); pos+=1; }
        var bytesChar=wide?2:1, cabe=Math.floor(disp()/bytesChar), n=Math.min(cabe,falta);
        if(n<=0){ if(ci+1>=chunks.length) break; proxChunk(); wide=!!(chunks[ci][pos]&1); pos+=1; continue; }
        var cc=chunks[ci];
        for(var k=0;k<n;k++){ s+=String.fromCharCode(wide?u16(cc,pos+k*2):cc[pos+k]); }
        pos+=n*bytesChar; falta-=n;
      }
      // pula runs de formatação e dados fonéticos (podem atravessar blocos)
      var pular=cRun*4+cbExt;
      while(pular>0){ var d=disp(); if(d>=pular){ pos+=pular; pular=0; } else { pular-=d; if(ci+1>=chunks.length) break; proxChunk(); } }
      out.push(s);
    }
    return out;
  }
  function lerLinhas(arrayBuffer){
    try{
      var X=root.XLSX; if(!X||!X.CFB) return null;
      var u8=new Uint8Array(arrayBuffer);
      var cfb=X.CFB.read(u8,{type:'array'});
      var ent=null; (cfb.FileIndex||[]).forEach(function(f){ if(f&&(f.name==='Workbook'||f.name==='Book')&&f.size>0) ent=f; });
      if(!ent||!ent.content) return null;
      var b=ent.content; if(!(b instanceof Uint8Array)) b=new Uint8Array(b);
      var sst=[], sstChunks=null, ultimoRegistro=0, grade={}, sheetIdx=-1, maxR=-1, maxC=-1, pendFormula=null;
      var pos=0;
      function setCel(r,c,v){ if(sheetIdx!==0) return; (grade[r]=grade[r]||{})[c]=v; if(r>maxR) maxR=r; if(c>maxC) maxC=c; }
      while(pos+4<=b.length){
        var tipo=u16(b,pos), len=u16(b,pos+2), d=pos+4;
        if(d+len>b.length) break;
        if(tipo===0x00FC){ sstChunks=[b.subarray(d,d+len)]; }
        else if(tipo===0x003C && sstChunks){ sstChunks.push(b.subarray(d,d+len)); }
        else {
          if(sstChunks){ sst=lerSST(sstChunks); sstChunks=null; }
          if(tipo===0x0809){ var tp=u16(b,d+2); if(tp===0x0010) sheetIdx++; }
          else if(sheetIdx===0){
            if(tipo===0x00FD){ var i=u32(b,d+6); setCel(u16(b,d),u16(b,d+2),sst[i]===undefined?'':sst[i]); }
            else if(tipo===0x0203){ setCel(u16(b,d),u16(b,d+2),f64(b,d+6)); }
            else if(tipo===0x027E){ setCel(u16(b,d),u16(b,d+2),rkVal(i32(b,d+6))); }
            else if(tipo===0x00BD){ var r=u16(b,d), c0=u16(b,d+2), nc=(len-6)/6; for(var k=0;k<nc;k++){ setCel(r,c0+k,rkVal(i32(b,d+4+k*6+2))); } }
            else if(tipo===0x0204){ var cch=u16(b,d+6), fl=b[d+8], s=''; if(fl&1){ for(var q=0;q<cch;q++) s+=String.fromCharCode(u16(b,d+9+q*2)); } else { for(var q2=0;q2<cch;q2++) s+=String.fromCharCode(b[d+9+q2]); } setCel(u16(b,d),u16(b,d+2),s); }
            else if(tipo===0x0006){ // FORMULA: se o resultado é número, guarda; se for texto, vem no STRING seguinte
              if(!(b[d+12]===0xFF&&b[d+13]===0xFF)){ setCel(u16(b,d),u16(b,d+2),f64(b,d+6)); pendFormula=null; }
              else { pendFormula={r:u16(b,d),c:u16(b,d+2)}; }
            }
            else if(tipo===0x0207 && pendFormula){ var cs=u16(b,d), fs=b[d+2], t=''; if(fs&1){ for(var z=0;z<cs;z++) t+=String.fromCharCode(u16(b,d+3+z*2)); } else { for(var z2=0;z2<cs;z2++) t+=String.fromCharCode(b[d+3+z2]); } setCel(pendFormula.r,pendFormula.c,t); pendFormula=null; }
          }
        }
        ultimoRegistro=tipo; pos=d+len;
      }
      if(maxR<0) return null;
      var linhas=[];
      for(var r=0;r<=maxR;r++){ var row=[]; for(var c=0;c<=maxC;c++){ var v=grade[r]&&grade[r][c]; row.push(v===undefined?'':v); } linhas.push(row); }
      return linhas;
    }catch(e){ console.warn('XlsFallback',e); return null; }
  }
  root.XlsFallback={lerLinhas:lerLinhas};
})(typeof window!=='undefined'?window:globalThis);
