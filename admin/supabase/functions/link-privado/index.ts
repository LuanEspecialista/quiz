import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Content-Type":"application/json"};
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const body=await req.json(),token=String(body.token||"");
    if(token.length!==64)return Response.json({ok:false,codigo:"invalido"},{status:400,headers:cors});
    const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim();
    const{data,error}=await client.rpc("resolver_link_temporario",{p_token:token,p_senha:body.senha||null,p_user_agent:req.headers.get("user-agent"),p_ip:ip||null});
    if(error)throw error;if(!data?.ok)return Response.json(data,{status:403,headers:cors});
    for(const item of data.empreendimentos||[]){
      if(Array.isArray(item.midias)&&item.midias.length){const{sData}= {sData:await client.storage.from("empreendimentos").createSignedUrls(item.midias,900)};item.imagens=(sData.data||[]).map((v)=>v.signedUrl).filter(Boolean)}else item.imagens=[];
      delete item.midias;
      if(item.pdf_path){const{data:signed}=await client.storage.from("pdfs").createSignedUrl(item.pdf_path,900);item.pdf_url=signed?.signedUrl||null}delete item.pdf_path;
    }
    return Response.json(data,{headers:{...cors,"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,codigo:"erro",mensagem:String(error)},{status:500,headers:cors})}
});
