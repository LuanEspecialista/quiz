import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, EyeOff, HandCoins, Plus, Save, ShieldAlert, UserCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPanelUrl } from "@/lib/authRedirect";

type Role = "admin" | "equipe" | "afiliado";
type Affiliate = { id:string; user_id?:string|null; nome:string; email?:string|null; telefone?:string|null; ativo:boolean };
type Rule = { id:string; tipo_produto:string; percentual:number; ativo:boolean };
type Product = { id:string; nome?:string|null; cidade?:string|null; bairro?:string|null; status?:string|null; descricao?:string|null; imagem_url?:string|null; tipo?:string|null; categoria_afiliado?:string|null; faixa_preco?:number|null; area_minima?:number|null; area_maxima?:number|null; numero_torres?:number|null; numero_unidades?:number|null; entrada_afiliado?:number|null; parcela_afiliado?:number|null; quantidade_elevadores?:number|null; quantidade_areas_lazer?:number|null; caracteristicas?:Record<string,any>|null; percentual_comissao?:number|null; confidencial?:boolean; instrucoes?:string|null };
type Grant = { afiliado_id:string; empreendimento_id:string; liberado:boolean; confidencial:boolean; instrucoes?:string|null };

const money=(value?:number|null)=>value?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(value):"Sob consulta";
const panel={background:"#101012",border:"1px solid #27272a",borderRadius:12,padding:16} as const;
const input={width:"100%",boxSizing:"border-box",background:"#09090b",border:"1px solid #3f3f46",borderRadius:7,padding:10,color:"#fff"} as const;
const button={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,background:"#c5a059",color:"#09090b",border:0,borderRadius:7,padding:"10px 13px",fontWeight:800,cursor:"pointer"} as const;
const normalize=(value:unknown)=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const defaultInstruction="Apresente pessoalmente o produto ou agende uma reunião com seu especialista. Não compartilhe imagens ou materiais confidenciais.";

function ProductCard({product,adminSlot}:{product:Product;adminSlot?:React.ReactNode}){
  const tips=Array.isArray(product.caracteristicas?.tipologias)?product.caracteristicas?.tipologias.join(" · "):"Consulte";
  const leisure=product.quantidade_areas_lazer??(Array.isArray(product.caracteristicas?.lazer)?product.caracteristicas.lazer.length:Array.isArray(product.caracteristicas?.itens)?product.caracteristicas.itens.filter((item:any)=>normalize(item.categoria).includes("lazer")).length:null);
  const commission=(Number(product.faixa_preco)||0)*(Number(product.percentual_comissao)||0)/100;
  const message=encodeURIComponent(`Olá, tenho cliente para o empreendimento ${product.id} — ${product.nome}. Quando podemos agendar uma apresentação?`);
  return <article style={{...panel,padding:0,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:470,boxShadow:"0 16px 40px rgba(0,0,0,.28)"}}>
    <div style={{height:190,background:"#17171a",position:"relative",overflow:"hidden"}}>
      {product.imagem_url?<img src={product.imagem_url} alt={product.nome||"Produto"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{height:"100%",display:"grid",placeItems:"center",color:"#52525b"}}>Imagem do empreendimento</div>}
      <span style={{position:"absolute",left:12,top:12,background:normalize(product.status).includes("pre-lancamento")?"#7c2d12":"#172554",color:"#fff",padding:"5px 8px",borderRadius:6,fontSize:10,fontWeight:900,textTransform:"uppercase"}}>{product.status||product.tipo||"Oportunidade"}</span>
      {product.confidencial&&<span style={{position:"absolute",right:12,top:12,background:"#09090bdd",color:"#fbbf24",padding:"5px 8px",borderRadius:6,fontSize:10,fontWeight:800,display:"flex",gap:5,alignItems:"center"}}><EyeOff size={12}/>Não compartilhar</span>}
    </div>
    <div style={{padding:16,display:"grid",gap:13,flex:1}}>
      <div><small style={{color:"#c5a059",fontWeight:800}}>{product.tipo||"Imóvel"} · {product.id}</small><h3 style={{margin:"5px 0",fontSize:19}}>{product.nome}</h3><p style={{color:"#a1a1aa",fontSize:12,margin:0}}>{[product.bairro,product.cidade].filter(Boolean).join(" · ")}</p></div>
      <p style={{color:"#d4d4d8",fontSize:12,lineHeight:1.55,margin:0}}>{product.descricao?.slice(0,180)||"Descrição comercial disponível com o especialista."}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,fontSize:11}}>
        <span style={{color:"#71717a"}}>Tipologias<strong style={{display:"block",color:"#fff",marginTop:3}}>{tips}</strong></span>
        <span style={{color:"#71717a"}}>Área<strong style={{display:"block",color:"#fff",marginTop:3}}>{product.area_minima||"—"}{product.area_maxima&&product.area_maxima!==product.area_minima?`–${product.area_maxima}`:""} m²</strong></span>
        <span style={{color:"#71717a"}}>Lazer<strong style={{display:"block",color:"#fff",marginTop:3}}>{leisure!==null?`${leisure} áreas`:"Consulte"}</strong></span>
        <span style={{color:"#71717a"}}>Elevadores<strong style={{display:"block",color:"#fff",marginTop:3}}>{product.quantidade_elevadores||"Consulte"}</strong></span>
        <span style={{color:"#71717a"}}>Entrada<strong style={{display:"block",color:"#fff",marginTop:3}}>{money(product.entrada_afiliado)}</strong></span>
        <span style={{color:"#71717a"}}>Parcelas a partir de<strong style={{display:"block",color:"#fff",marginTop:3}}>{money(product.parcela_afiliado)}</strong></span>
      </div>
      <div style={{background:"#17140e",border:"1px solid #4a3a20",borderRadius:8,padding:11}}>
        <small style={{color:"#a1a1aa"}}>Comissão estimada sobre o valor-base</small>
        <strong style={{display:"block",fontSize:20,color:"#d7ab63",marginTop:3}}>{commission?money(commission):"Definir regra"}</strong>
        <small style={{color:"#71717a"}}>{Number(product.percentual_comissao||0).toLocaleString("pt-BR")}% para {product.tipo||"esta categoria"}</small>
      </div>
      {product.confidencial&&<div style={{background:"#25170b",border:"1px solid #92400e",borderRadius:8,padding:10,color:"#fed7aa",fontSize:11,lineHeight:1.5}}><ShieldAlert size={14} style={{verticalAlign:"middle",marginRight:6}}/>{product.instrucoes||defaultInstruction}</div>}
      {adminSlot}
      {!adminSlot&&<a href={`https://wa.me/5547992120915?text=${message}`} target="_blank" rel="noreferrer" style={{...button,textDecoration:"none",marginTop:"auto"}}><CalendarDays size={16}/>Agendar Meet</a>}
    </div>
  </article>;
}

export default function Afiliados({role}:{role:Role}){
  const isAdmin=role==="admin";
  const [affiliates,setAffiliates]=useState<Affiliate[]>([]);
  const [rules,setRules]=useState<Rule[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [grants,setGrants]=useState<Grant[]>([]);
  const [selected,setSelected]=useState("");
  const [message,setMessage]=useState("");
  const [form,setForm]=useState({nome:"",email:"",telefone:""});
  const [newRule,setNewRule]=useState({tipo_produto:"",percentual:""});

  async function load(){
    setMessage("");
    if(!isAdmin){
      const {data,error}=await supabase.rpc("catalogo_afiliado");
      if(error)setMessage("O catálogo ainda não foi ativado para este acesso."); else setProducts((data||[]) as Product[]);
      return;
    }
    const [a,r,p,g]=await Promise.all([
      supabase.from("afiliados").select("*").order("nome"),
      supabase.from("regras_comissao_afiliado").select("*").order("tipo_produto"),
      supabase.from("empreendimentos").select("id,nome,cidade,bairro,status,descricao,imagem_url,tipo,categoria_afiliado,faixa_preco,area_minima,area_maxima,numero_torres,numero_unidades,entrada_afiliado,parcela_afiliado,quantidade_elevadores,quantidade_areas_lazer,caracteristicas,ativo").eq("ativo",true).order("nome"),
      supabase.from("afiliado_produtos").select("*")
    ]);
    const error=a.error||r.error||p.error||g.error;
    if(error)setMessage("Aplique a atualização do módulo de afiliados no Supabase."); else{
      setAffiliates((a.data||[]) as Affiliate[]); setRules((r.data||[]) as Rule[]); setProducts((p.data||[]) as Product[]); setGrants((g.data||[]) as Grant[]);
      if(!selected&&a.data?.[0])setSelected(a.data[0].id);
    }
  }
  useEffect(()=>{void load();},[role]);
  const ruleFor=(product:Product)=>rules.find((rule)=>normalize(rule.tipo_produto)===normalize(product.categoria_afiliado||product.tipo||"Imóvel"))||rules.find((rule)=>normalize(rule.tipo_produto)==="outro");
  const selectedAffiliate=affiliates.find((item)=>item.id===selected);
  const grantFor=(productId:string)=>grants.find((item)=>item.afiliado_id===selected&&item.empreendimento_id===productId);
  const saveAffiliate=async()=>{if(!form.nome.trim()||!form.email.trim())return setMessage("Informe nome e e-mail.");const{data,error}=await supabase.from("afiliados").insert({nome:form.nome.trim(),email:form.email.trim(),telefone:form.telefone||null}).select("id").single();if(error)return setMessage(error.message);const{data:linked,error:linkError}=await supabase.rpc("vincular_afiliado_email",{p_afiliado_id:data.id,p_email:form.email.trim()});setMessage(linkError?.message||(linked?"Afiliado cadastrado e acesso conectado.":"Afiliado cadastrado. Crie primeiro a conta de acesso com este e-mail para conectá-lo."));setForm({nome:"",email:"",telefone:""});void load()};
  const toggleAffiliateAccess=async(affiliate:Affiliate,ativo:boolean)=>{const affiliateResult=await supabase.from("afiliados").update({ativo}).eq("id",affiliate.id);if(affiliateResult.error)return setMessage(affiliateResult.error.message);if(affiliate.user_id){const profileResult=await supabase.from("perfis_usuario").update({ativo}).eq("user_id",affiliate.user_id);if(profileResult.error)return setMessage(profileResult.error.message)}setMessage(ativo?"Acesso do afiliado liberado.":"Acesso do afiliado bloqueado.");void load()};
  const sendPasswordReset=async(affiliate:Affiliate)=>{if(!affiliate.email)return setMessage("Este afiliado não possui e-mail cadastrado.");const{error}=await supabase.auth.resetPasswordForEmail(affiliate.email,{redirectTo:getPanelUrl({recovery:"1"})});setMessage(error?.message||"Link seguro de redefinição enviado para o afiliado.")};
  const saveRule=async(rule:Partial<Rule>&{tipo_produto:string;percentual:number})=>{const{error}=await supabase.from("regras_comissao_afiliado").upsert({...rule,ativo:true},{onConflict:"tipo_produto"});setMessage(error?.message||"Regra de comissão salva.");if(!error)void load()};
  const toggleProduct=async(product:Product,liberado:boolean)=>{if(!selected)return;const current=grantFor(product.id);const confidential=current?.confidencial??normalize(product.status).includes("pre-lancamento");const{error}=await supabase.from("afiliado_produtos").upsert({afiliado_id:selected,empreendimento_id:product.id,liberado,confidencial:confidential,instrucoes:current?.instrucoes|| (confidential?defaultInstruction:null),updated_at:new Date().toISOString()},{onConflict:"afiliado_id,empreendimento_id"});setMessage(error?.message||"Permissão atualizada.");if(!error)void load()};
  const updateConfidential=async(product:Product,confidencial:boolean)=>{if(!selected)return;const current=grantFor(product.id);const{error}=await supabase.from("afiliado_produtos").upsert({afiliado_id:selected,empreendimento_id:product.id,liberado:current?.liberado??true,confidencial,instrucoes:current?.instrucoes||(confidencial?defaultInstruction:null),updated_at:new Date().toISOString()},{onConflict:"afiliado_id,empreendimento_id"});setMessage(error?.message||"Confidencialidade atualizada.");if(!error)void load()};
  const updateCategory=async(product:Product,categoria_afiliado:string)=>{const{error}=await supabase.from("empreendimentos").update({categoria_afiliado}).eq("id",product.id);setMessage(error?.message||"Categoria comercial atualizada.");if(!error)void load()};
  const updateCommercial=async(product:Product,field:"entrada_afiliado"|"parcela_afiliado"|"quantidade_elevadores"|"quantidade_areas_lazer",value:string)=>{const numeric=value===""?null:Number(value);const{error}=await supabase.from("empreendimentos").update({[field]:numeric}).eq("id",product.id);setMessage(error?.message||"Informação comercial atualizada.");if(!error)void load()};
  const updateInstruction=async(product:Product,instrucoes:string)=>{if(!selected)return;const current=grantFor(product.id);const{error}=await supabase.from("afiliado_produtos").upsert({afiliado_id:selected,empreendimento_id:product.id,liberado:current?.liberado??true,confidencial:current?.confidencial??true,instrucoes:instrucoes.trim()||defaultInstruction,updated_at:new Date().toISOString()},{onConflict:"afiliado_id,empreendimento_id"});setMessage(error?.message||"Orientação atualizada.");if(!error)void load()};
  const enriched=useMemo(()=>products.map((product)=>({...product,tipo:product.categoria_afiliado||product.tipo,percentual_comissao:product.percentual_comissao??ruleFor(product)?.percentual,confidencial:product.confidencial??grantFor(product.id)?.confidencial,instrucoes:product.instrucoes??grantFor(product.id)?.instrucoes})),[products,rules,grants,selected]);

  if(!isAdmin)return <div style={{color:"#fff",display:"grid",gap:16}}><header><h1 style={{margin:0}}>Oportunidades para apresentar</h1><p style={{color:"#8b8b95"}}>Seu catálogo autorizado. Materiais exclusivos devem ser apresentados conforme a orientação do card.</p></header>{message&&<div style={panel}>{message}</div>}<section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(285px,1fr))",gap:16}}>{enriched.map((product)=><ProductCard key={product.id} product={product}/>)}</section>{!message&&!products.length&&<div style={panel}>Nenhum produto foi liberado para seu perfil ainda.</div>}</div>;

  return <div style={{color:"#fff",display:"grid",gap:18}}>
    <header><h1 style={{margin:0,display:"flex",alignItems:"center",gap:8}}><UserCheck color="#c5a059"/>Afiliados & Catálogo</h1><p style={{color:"#8b8b95",margin:"6px 0 0"}}>Controle comissão por categoria, confidencialidade e produtos liberados individualmente.</p></header>
    {message&&<div style={{...panel,color:"#fbbf24"}}>{message}</div>}
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14}}>
      <div style={panel}><h2 style={{fontSize:16,marginTop:0}}><HandCoins size={17}/> Regras por tipo de produto</h2>{rules.map((rule)=><div key={rule.id} style={{display:"grid",gridTemplateColumns:"1fr 100px 42px",gap:7,marginBottom:8}}><input value={rule.tipo_produto} readOnly style={input}/><input type="number" step=".01" defaultValue={rule.percentual} onBlur={(e)=>void saveRule({...rule,percentual:Number(e.target.value)})} style={input}/><span style={{alignSelf:"center",color:"#c5a059"}}>%</span></div>)}<div style={{display:"grid",gridTemplateColumns:"1fr 100px 42px",gap:7}}><input placeholder="Novo tipo" value={newRule.tipo_produto} onChange={(e)=>setNewRule({...newRule,tipo_produto:e.target.value})} style={input}/><input type="number" placeholder="%" value={newRule.percentual} onChange={(e)=>setNewRule({...newRule,percentual:e.target.value})} style={input}/><button onClick={()=>void saveRule({tipo_produto:newRule.tipo_produto,percentual:Number(newRule.percentual)})} style={button}><Plus size={15}/></button></div></div>
      <div style={panel}><h2 style={{fontSize:16,marginTop:0}}><Users size={17}/> Cadastrar afiliado</h2><div style={{display:"grid",gap:8}}><input placeholder="Nome" value={form.nome} onChange={(e)=>setForm({...form,nome:e.target.value})} style={input}/><input placeholder="E-mail da conta de acesso" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} style={input}/><input placeholder="WhatsApp" value={form.telefone} onChange={(e)=>setForm({...form,telefone:e.target.value})} style={input}/><button onClick={()=>void saveAffiliate()} style={button}><Save size={15}/>Salvar e conectar acesso</button></div></div>
    </section>
    <section style={panel}><label style={{fontSize:12,color:"#a1a1aa"}}>Configurar catálogo de<select value={selected} onChange={(e)=>setSelected(e.target.value)} style={{...input,marginTop:6}}><option value="">Selecione...</option>{affiliates.map((item)=><option key={item.id} value={item.id}>{item.nome}{item.ativo?"":" (inativo)"}</option>)}</select></label>{selectedAffiliate&&<div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginTop:12}}><label style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}><input type="checkbox" checked={selectedAffiliate.ativo} onChange={(e)=>void toggleAffiliateAccess(selectedAffiliate,e.target.checked)}/> Acesso ao painel ativo</label><button style={{...button,background:"#211c13",color:"#d7ab63",border:"1px solid #4a3a20"}} onClick={()=>void sendPasswordReset(selectedAffiliate)}>Enviar redefinição de senha</button><p style={{width:"100%",fontSize:12,color:"#71717a",margin:0}}>Você controla o acesso e exatamente quais produtos {selectedAffiliate.nome} poderá visualizar.</p></div>}</section>
    {selected&&<section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(285px,1fr))",gap:16}}>{enriched.map((product)=>{const grant=grantFor(product.id);return <ProductCard key={product.id} product={product} adminSlot={<div style={{display:"grid",gap:8,borderTop:"1px solid #27272a",paddingTop:11}}><label style={{fontSize:11,color:"#a1a1aa"}}>Tipo para comissão<select value={product.categoria_afiliado||product.tipo||"Imóvel"} onChange={(e)=>void updateCategory(product,e.target.value)} style={{...input,marginTop:5}}>{rules.map((rule)=><option key={rule.id} value={rule.tipo_produto}>{rule.tipo_produto} · {rule.percentual}%</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{([["entrada_afiliado","Entrada"],["parcela_afiliado","Parcela"],["quantidade_elevadores","Elevadores"],["quantidade_areas_lazer","Áreas de lazer"]] as const).map(([field,label])=><label key={field} style={{fontSize:10,color:"#71717a"}}>{label}<input type="number" defaultValue={product[field]??""} onBlur={(e)=>void updateCommercial(product,field,e.target.value)} style={{...input,padding:7,marginTop:3}}/></label>)}</div><label style={{fontSize:10,color:"#71717a"}}>Orientação ao afiliado<textarea defaultValue={grant?.instrucoes||defaultInstruction} onBlur={(e)=>void updateInstruction(product,e.target.value)} rows={3} style={{...input,marginTop:3,resize:"vertical"}}/></label><label style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}><input type="checkbox" checked={Boolean(grant?.liberado)} onChange={(e)=>void toggleProduct(product,e.target.checked)}/><Check size={14} color="#22c55e"/>Liberar para este afiliado</label><label style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}><input type="checkbox" checked={Boolean(grant?.confidencial)} onChange={(e)=>void updateConfidential(product,e.target.checked)}/><ShieldAlert size={14} color="#f59e0b"/>Material confidencial</label></div>}/>})}</section>}
  </div>;
}
