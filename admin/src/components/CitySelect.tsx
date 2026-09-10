import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cityKey, sameCity } from "@/lib/cities";

type City = { id: string; nome: string; estado?: string | null };

export default function CitySelect({ value, cityId, onChange, className, required = false }: { value?: string; cityId?: string; onChange: (name: string, id: string) => void; className?: string; required?: boolean }) {
  const [cities, setCities] = useState<City[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newState, setNewState] = useState("SC");
  const [message, setMessage] = useState("");
  const selectedId = useMemo(() => cityId || cities.find((city) => sameCity(city.nome, value))?.id || "", [cities, cityId, value]);
  const fieldStyle = className ? undefined : { width:"100%", boxSizing:"border-box" as const, background:"#18181b", border:"1px solid #34343a", borderRadius:6, padding:10, color:"#fff" };

  useEffect(() => {
    void supabase.from("cidades").select("id,nome,estado").order("nome").then(({data,error}) => {
      if (error) setMessage(`Não foi possível carregar as cidades: ${error.message}`);
      else setCities((data || []) as City[]);
    });
  }, []);
  useEffect(() => {
    if (cityId || !value || !cities.length) return;
    const match = cities.find((city) => sameCity(city.nome, value));
    if (match) onChange(match.nome, match.id);
  }, [cities, cityId, value, onChange]);

  async function addCity() {
    const nome = newName.trim();
    if (!nome) { setMessage("Informe o nome da cidade."); return; }
    const existing = cities.find((city) => sameCity(city.nome, nome));
    if (existing) { onChange(existing.nome, existing.id); setAdding(false); setMessage("A cidade já existia e foi selecionada."); return; }
    const id = cityKey(nome);
    const { data, error } = await supabase.from("cidades").insert({ id, nome, estado: newState.trim().toUpperCase() || null }).select("id,nome,estado").single();
    if (error) { setMessage(`Não foi possível adicionar: ${error.message}`); return; }
    const city = data as City;
    setCities((current) => [...current, city].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    onChange(city.nome, city.id);
    setNewName(""); setAdding(false); setMessage("Cidade adicionada e selecionada.");
  }

  return <div style={{display:"grid",gap:6}}>
    <select className={className} style={fieldStyle} required={required} value={selectedId} onChange={(event) => { const city=cities.find((item)=>item.id===event.target.value); if(city)onChange(city.nome,city.id); else onChange("",""); }}>
      <option value="">Selecione a cidade...</option>
      {cities.map((city)=><option key={city.id} value={city.id}>{city.nome}{city.estado?` - ${city.estado}`:""}</option>)}
    </select>
    {!adding ? <button type="button" onClick={()=>{setAdding(true);setMessage("");}} style={{justifySelf:"start",border:0,background:"transparent",color:"#c5a059",padding:0,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:4}}><Plus size={12}/>Não encontrei — adicionar cidade</button> : <div style={{display:"grid",gridTemplateColumns:"minmax(130px,1fr) 64px auto",gap:6}}><input className={className} style={fieldStyle} value={newName} onChange={(event)=>setNewName(event.target.value)} placeholder="Nome da cidade"/><input className={className} style={fieldStyle} value={newState} maxLength={2} onChange={(event)=>setNewState(event.target.value)} aria-label="UF"/><button type="button" onClick={()=>void addCity()} style={{border:"1px solid #8e672e",borderRadius:6,background:"#c5a059",color:"#080808",fontWeight:700,cursor:"pointer"}}>Adicionar</button></div>}
    {message&&<small style={{color:message.startsWith("Não")?"#f87171":"#a1a1aa"}}>{message}</small>}
  </div>;
}
