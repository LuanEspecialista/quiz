import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token=req.headers.get("Authorization")||"";
  const caller=createClient(url,anon,{global:{headers:{Authorization:token}}});
  const {data:{user}}=await caller.auth.getUser();
  if(!user)return reply({error:"Não autenticado."},401);
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:profile}=await admin.from("perfis_usuario").select("perfil,ativo").eq("user_id",user.id).maybeSingle();
  if(profile?.perfil!=="admin"||!profile.ativo)return reply({error:"Apenas administradores podem gerenciar acessos."},403);
  const body=await req.json();
  const email=String(body.email||"").trim().toLowerCase(), tipo=body.tipo==="afiliado"?"afiliado":"cliente";
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return reply({error:"E-mail inválido."},400);
  let target=null as any;
  for(let page=1;page<=10&&!target;page++){
   const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
   if(error)throw error; target=data.users.find((item)=>item.email?.toLowerCase()===email); if(data.users.length<100)break;
  }
  if(!target){const {data,error}=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{full_name:String(body.nome||"").trim()}});if(error)throw error;target=data.user;}
  if(!target)throw new Error("Não foi possível criar ou localizar a conta.");
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random=(size:number)=>Array.from(crypto.getRandomValues(new Uint8Array(size)),value=>alphabet[value%alphabet.length]).join("");
  const temporaryPassword=`Lu!${random(10)}7`;
  const {error:passwordError}=await admin.auth.admin.updateUserById(target.id,{password:temporaryPassword,email_confirm:true});
  if(passwordError)throw passwordError;
  const {data:currentProfile}=await admin.from("perfis_usuario").select("usuario,perfil").eq("user_id",target.id).maybeSingle();
  let username=currentProfile?.usuario||"";
  if(!username){
   const base=(email.split("@")[0]||"usuario").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9._-]/g,"").replace(/^[^a-z0-9]+/,"").slice(0,17)||"usuario";
   for(let attempt=0;attempt<8&&!username;attempt++){const candidate=`${base.length>=3?base:"usuario"}.${random(4).toLowerCase()}`;const{data:used}=await admin.from("perfis_usuario").select("user_id").eq("usuario",candidate).maybeSingle();if(!used)username=candidate;}
   if(!username)username=`usuario.${random(8).toLowerCase()}`;
  }
  const grantedRole=currentProfile?.perfil==="admin"?"admin":tipo;
  const {error:profileError}=await admin.from("perfis_usuario").upsert({user_id:target.id,perfil:grantedRole,ativo:true,usuario:username,nome_exibicao:String(body.nome||"").trim()||null},{onConflict:"user_id"});
  if(profileError)throw profileError;
  const table=tipo==="afiliado"?"afiliados":"clientes";
  const activeField=tipo==="afiliado"?{ativo:true}:{acesso_portal:true};
  const {data:record,error:findError}=await admin.from(table).select("id").ilike("email",email).limit(1).maybeSingle();
  if(findError)throw findError;
  if(record){const {error}=await admin.from(table).update({user_id:target.id,...activeField}).eq("id",record.id);if(error)throw error;}
  else {const {error}=await admin.from(table).insert({nome:String(body.nome||email).trim(),email,user_id:target.id,...activeField});if(error)throw error;}
  if(body.solicitacao_id){const {error}=await admin.from("solicitacoes_acesso").update({status:"aprovada",user_id:target.id,analisado_em:new Date().toISOString(),analisado_por:user.id}).eq("id",body.solicitacao_id);if(error)throw error;}
  return reply({ok:true,user_id:target.id,email,usuario:username,temporary_password:temporaryPassword});
 }catch(error){return reply({error:error instanceof Error?error.message:"Erro inesperado."},400);}
});
