(function(){
const cfg=window.LUAN_SITE_CONFIG||{},root=document.getElementById('posts'),filters=document.getElementById('filters'),searchParams=new URLSearchParams(location.search),segments=location.pathname.split('/').filter(Boolean),pathSlug=segments[0]==='blog'?(segments[1]||''):'',wanted=searchParams.get('post')||pathSlug;let posts=[],category='Todos';
const esc=(v='')=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const safe=(v='')=>{try{const u=new URL(String(v),location.origin);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
		const media=(v='')=>{const raw=String(v||'');if(!raw)return '';if(raw.startsWith('r2://'))return `https://media.luan-especialista.pro/${raw.slice(5).split('/').map(encodeURIComponent).join('/')}`;return safe(raw)};
let accessToken=localStorage.blog_access_token||'';
const api=(path,o={})=>fetch(`${cfg.supabaseUrl}/rest/v1/${path}`,{...o,headers:{apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${accessToken||cfg.supabaseAnonKey}`,Accept:'application/json',...(o.headers||{})}});
const authApi=(path,o={})=>fetch(`${cfg.supabaseUrl}/auth/v1/${path}`,{...o,headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{}) ,...(o.headers||{})}});
const date=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v)):'';
function seoMeta(name,value,attr='name'){let tag=document.head.querySelector(`meta[${attr}="${name}"]`);if(!tag){tag=document.createElement('meta');tag.setAttribute(attr,name);document.head.appendChild(tag)}tag.setAttribute('content',String(value??''))}
function applySeo(p){const title=String(p.seo_titulo||p.titulo||'Insights').trim(),description=String(p.seo_descricao||p.resumo||'').trim(),canonical=`https://luan-especialista.pro/blog/${encodeURIComponent(p.slug||'')}/`,image=media(p.imagem_capa_url||p.blocos?.imagem_card_url||p.imagens?.[0]?.url),keywords=Array.isArray(p.palavras_chave)?p.palavras_chave.slice(0,8).join(', '):String(p.palavras_chave||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean).slice(0,8).join(', '),isPreview=searchParams.get('preview')==='1';document.title=title;seoMeta('description',description);seoMeta('keywords',keywords);seoMeta('robots',isPreview?'noindex,nofollow,noarchive':'index,follow');seoMeta('og:type','article','property');seoMeta('og:title',title,'property');seoMeta('og:description',description,'property');seoMeta('og:url',canonical,'property');seoMeta('og:site_name','Luan Especialista','property');seoMeta('og:image',image,'property');seoMeta('twitter:card','summary_large_image');seoMeta('twitter:title',title);seoMeta('twitter:description',description);seoMeta('twitter:image',image);seoMeta('article:published_time',p.publicado_em||'','property');seoMeta('article:modified_time',p.atualizado_em||p.publicado_em||'','property');let link=document.head.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=canonical}
const inline=v=>{const raw=String(v||'');let out='',last=0,re=/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g,m;while((m=re.exec(raw))){out+=esc(raw.slice(last,m.index));const u=safe(m[2]),internal=u.startsWith(location.origin);out+=u?`<a href="${esc(u)}" target="${internal?'_self':'_blank'}"${internal?'':' rel="noopener noreferrer"'}>${esc(m[1])}</a>`:esc(m[0]);last=re.lastIndex}return out+esc(raw.slice(last))};
const para=v=>String(v||'').split(/\n{2,}/).filter(Boolean).map(p=>`<p>${inline(p).replace(/\n/g,'<br>')}</p>`).join('');
const key=v=>{try{return decodeURIComponent(new URL(v).pathname).toLowerCase().replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/-[a-f0-9]{8,}$/,'')}catch{return String(v).toLowerCase()}};
const embed=v=>{const u=safe(v);if(!u)return'';const x=new URL(u);if(x.hostname.includes('youtu.be'))return `https://www.youtube-nocookie.com/embed/${x.pathname.slice(1)}`;if(x.hostname.includes('youtube.com'))return `https://www.youtube-nocookie.com/embed/${x.searchParams.get('v')||x.pathname.split('/').pop()}`;if(x.hostname.includes('vimeo.com'))return `https://player.vimeo.com/video/${x.pathname.split('/').filter(Boolean).pop()}`;return''};
const sourceUrl=v=>safe(v)||((String(v||'').match(/\((https?:\/\/[^)]+)\)/)||[])[1]||'');
const sources=b=>{const list=Array.isArray(b?.fontes)?b.fontes.filter(x=>sourceUrl(x?.url)):[];return list.length?`<section class="sources"><details><summary>Fontes consultadas e referências</summary><ol>${list.map(x=>`<li><a href="${esc(sourceUrl(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.titulo||x.veiculo||sourceUrl(x.url))}</a>${x.veiculo&&x.titulo?` · ${esc(x.veiculo)}`:''}${x.data?` · ${esc(x.data)}`:''}</li>`).join('')}</ol></details></section>`:''};
function section(s,p,used){const t=s.tipo||'texto',title=s.titulo?`<h2>${esc(s.titulo)}</h2>`:'',action=s.acao_rotulo?`<a class="micro-action" href="${esc(safe(s.acao_url)||`https://wa.me/5547992120915?text=${encodeURIComponent(s.acao_rotulo+' — '+p.titulo)}`)}" target="_blank" rel="noopener">${esc(s.acao_rotulo)} →</a>`:'';
if(t==='subtitulo')return `<section class="content-block block-heading"><h2>${esc(s.titulo||s.texto)}</h2></section>`;
if(t==='destaque')return `<blockquote class="content-block">${inline(s.texto||s.titulo)}</blockquote>`;
if(t==='dado')return `<aside class="content-block fact">${title}<p>${inline(s.texto)}</p></aside>`;
if(t==='lista'||t==='comparativo'){const a=(s.itens||[]).filter(Boolean),className=t==='lista'?'list':'compare';return `<section class="content-block block-${className}">${title}${t==='lista'?`<ul>${a.map(i=>`<li>${inline(i)}</li>`).join('')}</ul>`:`<div class="compare-grid">${a.map(i=>`<article>${inline(i)}</article>`).join('')}</div>`}</section>`}
if(t==='imagem'||t==='imagem_texto'){const pool=Array.isArray(p.imagens)?p.imagens:[],requested=media(s.imagem_url),fallback=pool.find(i=>media(i?.url)&&!used.has(key(i.url))),u=requested&&!used.has(key(requested))?requested:media(fallback?.url),k=key(u);if(!u||used.has(k))return `<section class="content-block block-text">${title}${para(s.texto)}</section>`;used.add(k);return `<section class="content-block media-copy align-${esc(s.alinhamento||'esquerda')} size-${esc(s.tamanho||'media')}"><figure class="ratio-${esc(s.proporcao||'paisagem')}"><img src="${esc(u)}" loading="lazy" alt="${esc(s.imagem_alt||fallback?.alt||p.titulo)}"><figcaption>${esc(s.legenda||fallback?.legenda||'')}</figcaption></figure>${t==='imagem_texto'?`<div>${title}${para(s.texto)}</div>`:''}</section>`}
if(t==='galeria'){const pool=(Array.isArray(s.imagens)&&s.imagens.length?s.imagens:(Array.isArray(p.imagens)?p.imagens:[]));const a=pool.filter(i=>media(i?.url)&&!used.has(key(media(i.url))));a.forEach(i=>used.add(key(media(i.url))));if(!a.length){const notes=(s.itens||[]).filter(Boolean);return notes.length?`<section class="content-block block-list">${title}<ul>${notes.map(i=>`<li>${inline(i)}</li>`).join('')}</ul>${para(s.texto)}</section>`:para(s.texto)}return `<section class="content-block carousel">${title}<div class="carousel-track">${a.map(i=>`<figure><img src="${esc(media(i.url))}" loading="lazy" alt="${esc(i.alt||p.titulo)}"><figcaption>${esc(i.legenda||'')}</figcaption></figure>`).join('')}</div>${a.length>1?'<button class="prev" aria-label="Anterior">‹</button><button class="next" aria-label="Próxima">›</button>':''}</section>`}
if(t==='video'){const raw=media(s.video_url),u=embed(raw),label=esc(s.video_titulo||s.titulo||'Vídeo');if(/\.(mp4|webm|ogg)(?:\?|$)/i.test(raw))return `<section class="content-block video">${title}<video controls playsinline preload="metadata" poster="${esc(safe(s.poster_url)||'')}" title="${label}"><source src="${esc(raw)}"></video></section>`;return u?`<section class="content-block video">${title}<iframe src="${esc(u)}" title="${label}" loading="lazy" allowfullscreen></iframe></section>`:''}
if(t==='pergunta'||t==='cta')return `<aside class="content-block prompt ${t==='cta'?'prompt-cta':''}">${title}${para(s.texto)}${action}</aside>`;
return `<section class="content-block block-text">${title}${para(s.texto)}</section>`}
function bindCarousel(){document.querySelectorAll('.carousel').forEach(x=>{const t=x.querySelector('.carousel-track');x.querySelector('.next')?.addEventListener('click',()=>t.scrollBy({left:t.clientWidth,behavior:'smooth'}));x.querySelector('.prev')?.addEventListener('click',()=>t.scrollBy({left:-t.clientWidth,behavior:'smooth'}))})}
const interests=['Morar no litoral','Comprar um imóvel','Construir patrimônio','Aumentar ou proteger patrimônio','Gerar renda com imóveis','Comprar carro ou moto','Planejar uma viagem','Realizar um projeto pessoal','Trabalhar conosco','Quero orientação'];
function engagement(p){
  const sid=localStorage.blog_session||(localStorage.blog_session=crypto.randomUUID());
  return `<section class="engagement" aria-labelledby="engagement-title">
    <div class="engagement-header">
      <div class="engagement-question"><p class="eyebrow">OPINIÃO DOS LEITORES</p><h2 id="engagement-title">Este conteúdo foi útil?</h2><p>Uma nota rápida ajuda outras pessoas a decidir por onde começar.</p></div>
      <div class="rating-summary" aria-live="polite"><strong class="rating-average">—</strong><span class="rating-summary-stars" aria-hidden="true">☆☆☆☆☆</span><small class="rating-count">Carregando avaliações…</small></div>
    </div>
    <div class="stars" role="group" aria-label="Avalie este conteúdo de uma a cinco estrelas">${[1,2,3,4,5].map(n=>`<button data-rate="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div>
    <div class="review-identity" hidden>
      <label class="review-name-field">Nome que aparecerá na avaliação<input class="review-display-name" type="text" maxlength="80" autocomplete="name" placeholder="Seu nome"></label>
      <label class="review-public-consent"><input type="checkbox" class="review-public-checkbox"><span>Autorizo exibir publicamente meu nome e minha foto de perfil, se disponível, junto à avaliação.</span></label>
    </div>
    <section class="reader-reviews" hidden aria-label="Avaliações identificadas publicamente"><h3>Quem compartilhou a avaliação</h3><div class="reader-review-list"></div></section>
    <p class="feedback" role="status" aria-live="polite"></p>
    <div class="lead-box">
      <div class="lead-intro">
        <h3>Receba orientação alinhada aos seus objetivos</h3>
        <p>Se você optar por receber orientação, seu cadastro será incluído na base de atendimento. Isso não libera automaticamente uma área privada nem cria compromisso.</p>
        <label class="lead-field">Seu nome<input class="lead-contact-name" type="text" maxlength="120" autocomplete="name" placeholder="Como podemos chamar você?" required></label>
        <label class="lead-contact-consent"><input type="checkbox" class="lead-contact-checkbox"><span>Autorizo a equipe a usar meus dados para responder e manter contato sobre os interesses selecionados, conforme a <a href="/privacidade/">Política de Privacidade</a>.</span></label>
        <button type="button" class="google-login" hidden>Continuar com Google</button>
        <form class="magic-login"><label class="lead-field">Seu melhor e-mail<input required type="email" name="email" autocomplete="email" maxlength="254" placeholder="voce@exemplo.com"></label><button>Continuar por e-mail</button></form>
      </div>
      <div class="lead-profile" hidden>
        <h3>Olá, <span class="lead-greeting"></span></h3>
        <p>Escolha os interesses que ajudam a equipe a orientar você.</p>
        <label class="lead-field">Seu nome<input class="lead-profile-name" type="text" maxlength="120" autocomplete="name" placeholder="Seu nome" required></label>
        <div class="interest-grid">${interests.map(x=>`<label><input type="checkbox" value="${esc(x)}"> ${esc(x)}</label>`).join('')}</div>
        <label class="lead-contact-consent"><input type="checkbox" class="lead-contact-checkbox"><span>Autorizo a equipe a usar meus dados para responder e manter contato sobre os interesses selecionados, conforme a <a href="/privacidade/">Política de Privacidade</a>.</span></label>
        <div class="lead-actions"><button type="button" class="save-interests">Salvar interesses</button><a class="team-whatsapp" target="_blank" rel="noopener noreferrer">Falar com a equipe</a></div>
      </div>
    </div>
    <form class="comment"><label>Deixe uma pergunta ou comentário<textarea required minlength="10" maxlength="1200" name="comentario"></textarea></label><label>Seu nome (opcional)<input maxlength="80" name="nome"></label><button>Enviar para moderação</button></form>
  </section><i class="engagement-data" hidden data-id="${p.id}" data-title="${esc(p.titulo)}" data-session="${sid}"></i>`
}
async function bindEngagement(){
  const d=document.querySelector('.engagement-data');if(!d)return;
  const feedback=document.querySelector('.feedback');
  const send=(name,body)=>api(`rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const readPending=()=>{try{const item=JSON.parse(localStorage.getItem('blog_contact_pending')||'null');if(item&&item.postId===d.dataset.id&&item.consent===true&&item.expiresAt>Date.now())return item;if(item&&item.expiresAt<=Date.now())localStorage.removeItem('blog_contact_pending')}catch{}return null};
  const rememberPending=(name)=>localStorage.setItem('blog_contact_pending',JSON.stringify({postId:d.dataset.id,nome:name,consent:true,expiresAt:Date.now()+86400000}));
  const initials=(name)=>String(name||'L').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toLocaleUpperCase('pt-BR')||'L';
  const refreshRatings=async()=>{
    try{
      const response=await send('listar_avaliacoes_blog',{p_post_id:d.dataset.id});if(!response.ok)return;
      const payload=await response.json(),summary=Array.isArray(payload)?payload[0]:payload||{},total=Number(summary.total)||0,average=Number(summary.media)||0;
      const averageNode=document.querySelector('.rating-average'),starsNode=document.querySelector('.rating-summary-stars'),countNode=document.querySelector('.rating-count');
      if(averageNode)averageNode.textContent=total?average.toFixed(1).replace('.',','):'—';
      if(starsNode){const full=total?Math.round(average):0;starsNode.textContent='★'.repeat(full)+'☆'.repeat(5-full);starsNode.setAttribute('aria-label',total?`Média de ${average.toFixed(1).replace('.',',')} em cinco estrelas`:'Ainda sem avaliações');}
      if(countNode)countNode.textContent=total===0?'Seja a primeira pessoa a avaliar':`${total} ${total===1?'avaliação':'avaliações'}`;
      const section=document.querySelector('.reader-reviews'),list=document.querySelector('.reader-review-list'),reviews=Array.isArray(summary.recentes)?summary.recentes:[];
      if(!section||!list)return;
      if(!reviews.length){section.hidden=true;list.innerHTML='';return;}
      section.hidden=false;
      list.innerHTML=reviews.map(item=>{const name=String(item.nome||'Leitor'),avatar=safe(item.avatar_url||'');return `<article class="reader-review"><span class="reader-avatar"><span>${esc(initials(name))}</span>${avatar.startsWith('https://')?`<img src="${esc(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</span><span class="reader-review-copy"><strong>${esc(name)}</strong><span class="reader-review-stars" aria-label="${Number(item.nota)||0} estrelas">${'★'.repeat(Math.max(0,Math.min(5,Number(item.nota)||0)))}${'☆'.repeat(5-Math.max(0,Math.min(5,Number(item.nota)||0)))}</span></span></article>`}).join('');
      list.querySelectorAll('.reader-avatar img').forEach(image=>image.addEventListener('error',()=>{image.style.display='none'},{once:true}));
    }catch{}
  };
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get('access_token')){accessToken=hash.get('access_token');localStorage.blog_access_token=accessToken;history.replaceState(null,'',location.pathname+location.search)}
  await refreshRatings();
  let user=null;
  if(accessToken){const response=await authApi('user');if(response.ok)user=await response.json();else{accessToken='';localStorage.removeItem('blog_access_token')}}
  const profile=document.querySelector('.lead-profile'),intro=document.querySelector('.lead-intro'),whatsapp=document.querySelector('.team-whatsapp'),reviewIdentity=document.querySelector('.review-identity'),reviewName=document.querySelector('.review-display-name'),reviewConsent=document.querySelector('.review-public-checkbox');
  const fullName=(u)=>String(u?.user_metadata?.full_name||u?.user_metadata?.name||u?.user_metadata?.preferred_name||'').trim();
  let lead=null;
  if(user){
    const pending=readPending(),name=pending?.nome||fullName(user);
    intro.hidden=true;profile.hidden=false;reviewIdentity.hidden=false;
    profile.querySelector('.lead-greeting').textContent=name||'leitor';
    profile.querySelector('.lead-profile-name').value=name;
    if(reviewName)reviewName.value=fullName(user);
    const commentName=document.querySelector('.comment input[name="nome"]');if(commentName)commentName.value=fullName(user);
    const saved=await api(`blog_leads?user_id=eq.${encodeURIComponent(user.id)}&select=interesses,consentiu_contato`);
    if(saved.ok){const rows=await saved.json();lead=rows[0]||null;}
    if(lead?.interesses)document.querySelectorAll('.interest-grid input').forEach(input=>input.checked=lead.interesses.includes(input.value));
    profile.querySelectorAll('.lead-contact-checkbox').forEach(input=>input.checked=Boolean(lead?.consentiu_contato));
    if(pending){
      const response=await send('registrar_lead_blog',{p_post_id:d.dataset.id,p_nome:name,p_interesses:lead?.interesses||[],p_consentiu_contato:true});
      if(response.ok){localStorage.removeItem('blog_contact_pending');lead={...(lead||{}),interesses:lead?.interesses||[],consentiu_contato:true};profile.querySelectorAll('.lead-contact-checkbox').forEach(input=>input.checked=true);if(feedback)feedback.textContent='Cadastro confirmado na base de atendimento.';}
      else if(response.status<500)localStorage.removeItem('blog_contact_pending');
    }
  }else{
    intro.hidden=false;profile.hidden=true;reviewIdentity.hidden=true;
    const settings=await authApi('settings');if(settings.ok&&(await settings.json()).external?.google)document.querySelector('.google-login').hidden=false;
  }
  whatsapp.href=`https://wa.me/5547992120915?text=${encodeURIComponent('Olá, equipe Luan Especialista. Li o artigo “'+d.dataset.title+'” e gostaria de receber orientação.')}`;
  const savePendingAndRedirect=(name)=>{
    const consent=intro.querySelector('.lead-contact-checkbox');
    if(!name){feedback.textContent='Informe seu nome para continuar.';intro.querySelector('.lead-contact-name').focus();return false;}
    if(!consent.checked){feedback.textContent='Marque a autorização de contato para criar seu cadastro.';consent.focus();return false;}
    rememberPending(name);return true;
  };
  document.querySelector('.google-login').onclick=()=>{
    const name=intro.querySelector('.lead-contact-name').value.trim();if(!savePendingAndRedirect(name))return;
    location.href=`${cfg.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.href.split('#')[0])}`;
  };
  document.querySelector('.magic-login').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,name=intro.querySelector('.lead-contact-name').value.trim(),data=new FormData(form),email=String(data.get('email')||'').trim();
    if(!savePendingAndRedirect(name))return;
    const redirect=location.href.split('#')[0],response=await authApi(`otp?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email,create_user:true,options:{emailRedirectTo:redirect}})});
    if(response.ok)feedback.textContent='Enviamos um acesso rápido para seu e-mail. Após confirmar, seu cadastro será incluído na base de atendimento.';
    else{localStorage.removeItem('blog_contact_pending');feedback.textContent='Não foi possível enviar o acesso agora. Confira o e-mail e tente novamente.';}
  };
  document.querySelector('.save-interests').onclick=async()=>{
    const selected=[...document.querySelectorAll('.interest-grid input:checked')].map(input=>input.value),name=profile.querySelector('.lead-profile-name').value.trim(),consent=profile.querySelector('.lead-contact-checkbox').checked;
    if(!name){feedback.textContent='Informe seu nome para salvar as preferências.';profile.querySelector('.lead-profile-name').focus();return;}
    if(!consent&&!lead?.consentiu_contato){feedback.textContent='Marque a autorização de contato para salvar seus interesses na base de atendimento.';profile.querySelector('.lead-contact-checkbox').focus();return;}
    const response=await send('registrar_lead_blog',{p_post_id:d.dataset.id,p_nome:name,p_interesses:selected,p_consentiu_contato:consent});
    if(response.ok){lead={...(lead||{}),interesses:selected,consentiu_contato:consent};feedback.textContent=consent?'Preferências salvas e cadastro atualizado na base de atendimento.':'Autorização de contato removida. O registro permanece no histórico, mas não deve ser usado para novos contatos.';whatsapp.href=`https://wa.me/5547992120915?text=${encodeURIComponent('Olá, equipe Luan Especialista. Li o artigo “'+d.dataset.title+'” e tenho interesse em: '+(selected.join(', ')||'receber orientação')+'.')}`;}
    else feedback.textContent='Não foi possível salvar agora. Tente novamente em instantes.';
  };
  document.querySelectorAll('[data-rate]').forEach(button=>button.onclick=async()=>{
    const publish=Boolean(user&&reviewConsent?.checked),name=publish?reviewName.value.trim():null;
    if(publish&&!name){feedback.textContent='Informe o nome que deseja exibir junto à avaliação.';reviewName.focus();return;}
    const response=await send('registrar_avaliacao_blog',{p_post_id:d.dataset.id,p_sessao_id:d.dataset.session,p_nota:Number(button.dataset.rate),p_publicar_perfil:publish,p_nome_publico:name});
    if(response.ok){feedback.textContent=publish?'Obrigado. Sua avaliação foi publicada com o nome e a imagem de perfil autorizados, se disponível.':'Obrigado. Sua avaliação foi registrada sem exibir publicamente seu nome ou foto.';await refreshRatings();}
    else feedback.textContent='Não foi possível registrar a avaliação agora. Tente novamente em instantes.';
  });
  document.querySelector('.comment').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),response=await send('enviar_comentario_blog',{p_post_id:d.dataset.id,p_sessao_id:d.dataset.session,p_nome:data.get('nome')||null,p_comentario:data.get('comentario')});
    feedback.textContent=response.ok?'Comentário enviado para moderação. Obrigado!':'Não foi possível enviar agora.';if(response.ok)form.reset();
  };
}
function bindRatingControls(){
  const group=document.querySelector('.stars');if(!group)return;
  const buttons=[...group.querySelectorAll('[data-rate]')];
  const chosen=document.createElement('p');chosen.className='rating-selection';chosen.setAttribute('role','status');chosen.textContent='Selecione de 1 a 5 estrelas.';group.after(chosen);
  let selected=0;
  const paint=(value)=>buttons.forEach(button=>{const rate=Number(button.dataset.rate);button.classList.toggle('is-active',rate<=value);button.setAttribute('aria-pressed',String(rate===selected))});
  buttons.forEach(button=>{
    button.type='button';button.setAttribute('aria-pressed','false');
    button.addEventListener('mouseenter',()=>paint(Number(button.dataset.rate)));
    button.addEventListener('focus',()=>paint(Number(button.dataset.rate)));
    button.addEventListener('click',()=>{selected=Number(button.dataset.rate);paint(selected);chosen.textContent=`Sua nota: ${selected} ${selected===1?'estrela':'estrelas'}. Você pode alterá-la.`});
  });
  group.addEventListener('mouseleave',()=>paint(selected));
  group.addEventListener('focusout',event=>{if(!group.contains(event.relatedTarget))paint(selected)});
  paint(0);
}
const galleryFromImages=(imgs,used,p)=>{const a=(Array.isArray(imgs)?imgs:[]).filter(i=>media(i?.url)&&!used.has(key(i.url)));a.forEach(i=>used.add(key(i.url)));return a.length?`<section class="content-block carousel editorial-gallery"><h2>Imagens de Penha e do litoral</h2><div class="carousel-track">${a.map(i=>`<figure><img src="${esc(media(i.url))}" loading="lazy" alt="${esc(i.alt||p.titulo)}"><figcaption>${esc(i.legenda||'')}</figcaption></figure>`).join('')}</div>${a.length>1?'<button class="prev" aria-label="Anterior">‹</button><button class="next" aria-label="Próxima">›</button>':''}</section>`:''};
const isWise=(p)=>/\bwise\b/i.test(`${p.titulo||''} ${p.slug||''} ${p.categoria||''}`);
const wiseInvite='https://wise.com/invite/ahpc/luans658';
const wiseCard=()=>`<aside class="partner-card partner-wise"><div class="partner-mark">W</div><div class="partner-copy"><span class="partner-kicker">FERRAMENTA PARA UMA VIDA INTERNACIONAL</span><strong>Conheça a Wise</strong><p>Para converter, enviar, receber ou usar dinheiro em diferentes moedas. Consulte condições, tarifas e disponibilidade para o seu caso.</p></div><a class="partner-button" href="${wiseInvite}" target="_blank" rel="sponsored noopener">Conhecer a Wise <span>↗</span></a></aside>`;
const readingMap=(sections)=>{const items=sections.filter(s=>s.titulo&&s.tipo!=='cta').slice(0,4);return items.length?`<aside class="reading-map"><div><span class="map-kicker">NESTA LEITURA</span><strong>Uma visão organizada para você decidir melhor.</strong></div><ol>${items.map((s,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${esc(s.titulo)}</li>`).join('')}</ol></aside>`:''};

	function stay22Source(settings){
  const direct=safe(settings.url||'');
  if(direct){
    try{
      const parsed=new URL(direct);
      if(parsed.origin==='https://www.stay22.com'&&/^\/embed\/[A-Za-z0-9_-]+$/.test(parsed.pathname))return parsed.href;
      if(parsed.origin==='https://www.stay22.com'&&parsed.pathname==='/embed/gm'&&parsed.searchParams.get('aid')&&(parsed.searchParams.has('address')||(parsed.searchParams.has('lat')&&parsed.searchParams.has('lng')))){
        if(!parsed.searchParams.has('campaign'))parsed.searchParams.set('campaign','blog_praias_de_penha');
        return parsed.href;
      }
    }catch{}
  }
  const aid=String(settings.aid||'').trim();if(!/^[A-Za-z0-9_-]{3,80}$/.test(aid))return '';
  const url=new URL('https://www.stay22.com/embed/gm');url.searchParams.set('aid',aid);
  const lat=Number(settings.lat),lng=Number(settings.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180){url.searchParams.set('lat',String(lat));url.searchParams.set('lng',String(lng));}
  else url.searchParams.set('address',String(settings.address||'Penha, Santa Catarina, Brazil'));
  url.searchParams.set('venue',String(settings.venue||'Praias de Penha'));
  url.searchParams.set('campaign',String(settings.campaign||'blog_praias_de_penha'));
  return url.href;
}
function stay22Context(post){
  const settings=post?.blocos?.stay22||{};if(!settings.ativo||post?.blocos?.template==='ayra-landing')return '';
  const src=stay22Source(settings);if(!src)return '';
  const title=settings.titulo||'Imagine aproveitar as praias e tudo o que Penha tem a oferecer.';
  const text=settings.texto||'Explore opções de hospedagem próximas às praias e aos pontos de interesse da cidade. Consulte as datas, os valores e a disponibilidade diretamente no mapa.';
  const eyebrow=settings.rotulo||settings.ey||'DESCUBRA PENHA';
  const venue=settings.venue||'Praias de Penha';
  return `<section class="destination-map" aria-labelledby="destination-map-title"><div class="destination-map-card"><div class="destination-map-copy"><span class="destination-map-eyebrow">${esc(eyebrow)}</span><h2 id="destination-map-title">${esc(title)}</h2><p>${esc(text)}</p><a href="${esc(src)}" target="_blank" rel="sponsored noopener noreferrer">Ver opções de hospedagem <span aria-hidden="true">↗</span></a></div><div class="destination-map-frame"><iframe title="Opções de hospedagem próximas a ${esc(venue)}" width="100%" height="450" src="${esc(src)}" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="destination-map-note">Ao reservar por opções deste mapa, podemos receber uma comissão, sem custo adicional para você. Valores e disponibilidade são definidos pelos fornecedores.</p></div></section>`;
}
const ayraText=(v='')=>esc(String(v||'')).replace(/\n/g,'<br>');
	const ayraButton=(label,url,ghost=false)=>`<a class="ayra-btn ${ghost?'ayra-btn-ghost':''}" href="${esc(safe(url)||'#')}" target="_blank" rel="noopener">${esc(label)}</a>`;
	const ayraMedia=(v='')=>media(v);
	function ayraLanding(p){
		const b=p.blocos||{}, h=b.hero||{}, sections=b.secoes||[], imgs=Array.isArray(p.imagens)?p.imagens:[], facts=b.facts||[], stay22=b.stay22||{}, wa='https://wa.me/5547992120915?text='+encodeURIComponent('Olá, quero conhecer as condições do AYRA Slim Residence.');
		const sectionBy=(type)=>sections.find(s=>s.tipo===type)||{};
		const gallery=sectionBy('galeria'), video=b.video||sectionBy('video')||{};
		const galleryItems=imgs.map((i,index)=>`<figure class="ayra-gallery-item"><img loading="lazy" src="${esc(ayraMedia(i.url))}" alt="${esc(i.alt||p.titulo)}"><figcaption>${esc(i.legenda||'')}</figcaption></figure>`).join('');
		const renderPilares=()=>{const x=sectionBy('pilares');return x.itens?.length?`<section id="oportunidade" class="ayra-section"><div class="ayra-wrap"><div class="ayra-section-head"><div><span class="ayra-ey">${esc(x.ey)}</span><h2>${ayraText(x.titulo)}</h2></div><p>${ayraText(x.texto)}</p></div><div class="ayra-pillars">${x.itens.map((i,n)=>`<article class="ayra-pillar ${n===1?'is-highlight':''}"><b>${esc(i[0])}</b><h3>${ayraText(i[1])}</h3><p>${ayraText(i[2])}</p></article>`).join('')}</div></div></section>`:''};
		const renderProjection=(x,kind='projection')=>x.titulo?`<section class="ayra-section ${kind==='shortstay'?'':'ayra-soft'}"><div class="ayra-wrap ayra-split"><div class="ayra-media-card">${x.imagem_url?`<img src="${esc(ayraMedia(x.imagem_url))}" alt="${esc(x.titulo)}" loading="lazy">`:''}</div><div class="ayra-copy"><span class="ayra-tag">${esc(x.ey||'')}</span><h2>${ayraText(x.titulo)}</h2>${x.numero?`<div class="ayra-number">${esc(x.numero)}</div>`:''}${x.metricas?`<div class="ayra-metrics">${x.metricas.map(i=>`<div><strong>${esc(i[0])}</strong><span>${ayraText(i[1])}</span></div>`).join('')}</div>`:''}<p>${ayraText(x.texto)}</p>${x.texto_final?`<p>${ayraText(x.texto_final)}</p>`:''}<p class="ayra-note">${ayraText(x.nota||'')}</p></div></div></section>`:'';
		const renderSeazone=(x)=>x.titulo?`<section class="ayra-section ayra-dark"><div class="ayra-wrap ayra-split ayra-seazone"><div class="ayra-seazone-visual" style="background-image:url('${esc(ayraMedia(x.imagem_url))}')"></div><div><span class="ayra-ey">${esc(x.ey)}</span><h2>${ayraText(x.titulo)}</h2><p>${ayraText(x.texto)}</p><div class="ayra-feature-list">${(x.itens||[]).map(i=>`<div><b>✓</b> ${ayraText(i)}</div>`).join('')}</div></div></div></section>`:'';
		const renderCase=(x)=>x.titulo?`<section class="ayra-section ayra-soft"><div class="ayra-wrap ayra-split"><div class="ayra-media-card"><img src="${esc(ayraMedia(x.imagem_url))}" alt="${esc(x.titulo)}" loading="lazy"></div><div class="ayra-copy"><span class="ayra-ey">${esc(x.ey)}</span><h2>${ayraText(x.titulo)}</h2><p>${ayraText(x.texto)}</p><div class="ayra-case-stats">${(x.metricas||[]).map(i=>`<div><strong>${esc(i[0])}</strong><span>${ayraText(i[1])}</span></div>`).join('')}</div></div></div></section>`:'';

		const defaultAyraPlants=[
			['Planta 01 · 02 · 07 · 08','Planta tipo','r2://empreendimentos/Ayra/planta 01-02-07-08.jpeg'],
			['Planta 03 · 04 · 05 · 06','Planta tipo','r2://empreendimentos/Ayra/planta 03-04-05-06.jpeg'],
			['Giardino 01 · 02 · 07 · 08','Unidade Giardino','r2://empreendimentos/Ayra/giardino 01-02-07-08.jpeg'],
			['Giardino 03 · 04 · 05 · 06','Unidade Giardino','r2://empreendimentos/Ayra/giardino 03-04-05-06.jpeg']
		];
		const renderPlants=(x)=>{const custom=Array.isArray(x?.plantas)&&x.plantas.filter(i=>Array.isArray(i)&&i[2]&&/\.(?:jpe?g|png|webp|avif)$/i.test(String(i[2])));const items=custom.length?custom:defaultAyraPlants;return `<section class="ayra-plants"><div class="ayra-plants-head"><span class="ayra-ey">Plantas AYRA</span><h3>Escolha a configuração que conversa com a sua rotina.</h3><p>Consulte a disponibilidade e confirme as medidas no material técnico e no Memorial Descritivo.</p></div><div class="ayra-plants-grid">${items.map(i=>`<figure><div class="ayra-plant-image"><img src="${esc(ayraMedia(i[2]))}" loading="lazy" alt="${esc(i[0])}"></div><figcaption><strong>${esc(i[0])}</strong><span>${esc(i[1])}</span></figcaption></figure>`).join('')}</div></section>`};
		const renderProduct=(x)=>x.titulo?`<section id="produto" class="ayra-section"><div class="ayra-wrap"><div class="ayra-section-head"><div><span class="ayra-ey">${esc(x.ey)}</span><h2>${ayraText(x.titulo)}</h2></div><p>${ayraText(x.texto)}</p></div><div class="ayra-product-grid">${(x.dados||[]).map(i=>`<div><strong>${esc(i[0])}</strong><span>${ayraText(i[1])}</span></div>`).join('')}</div><div class="ayra-apartments">${(x.plantas||[]).map(i=>`<article><small>${esc(i[0])}</small><h3>${esc(i[1])}</h3><p>${ayraText(i[2])}</p></article>`).join('')}</div>${renderPlants(x)}</div></section>`:'';
		const renderGallery=()=>`<section id="galeria" class="ayra-section ayra-soft"><div class="ayra-wrap"><div class="ayra-section-head"><div><span class="ayra-ey">${esc(gallery.ey||'Experiência AYRA')}</span><h2>${ayraText(gallery.titulo||'Mais do que metragem: ambientes pensados para serem usados.')}</h2></div><p>${ayraText(gallery.texto||'Imagens meramente ilustrativas do empreendimento e das áreas comuns.')}</p></div><div class="ayra-carousel" data-interval="${Number(gallery.autoplay_ms||5000)}" tabindex="0"><div class="ayra-carousel-track">${galleryItems}</div><button class="ayra-carousel-prev" type="button" aria-label="Imagem anterior">‹</button><button class="ayra-carousel-next" type="button" aria-label="Próxima imagem">›</button><button class="ayra-carousel-toggle" type="button" aria-pressed="false" aria-label="Pausar carrossel">Pausar</button><div class="ayra-carousel-status" aria-live="polite">Autoplay ativo · passe o rato ou toque para pausar</div></div></div></section>`;
		const renderVideo=()=>{const url=ayraMedia(video.video_url),fallback=ayraMedia(video.video_fallback_url),poster=ayraMedia(video.poster_url);return `<section id="video" class="ayra-section"><div class="ayra-wrap"><div class="ayra-video-box"><div class="ayra-video-wrap"><video controls playsinline preload="metadata" poster="${esc(poster)}"><source src="${esc(url)}" type="video/mp4">${fallback&&fallback!==url?`<source src="${esc(fallback)}" type="video/mp4">`:''}Seu navegador não suporta reprodução de vídeo HTML5.</video></div><div class="ayra-video-copy"><span class="ayra-ey">${esc(video.ey||'Apartamento decorado')}</span><h2>${ayraText(video.titulo||'Veja o AYRA por dentro.')}</h2><p>${ayraText(video.texto||'')}</p>${ayraButton('Quero valores e condições',wa)}</div></div></div></section>`};
		const renderStay22=()=>{
			const src=String(stay22.url||'https://www.stay22.com/embed/6acfe25a89efbbe3a8e2fbae').trim();
			if(!/^https:\/\/www\.stay22\.com\/embed\/[A-Za-z0-9_-]+$/.test(src)) return '';
			return `<section id="stay22" class="ayra-section ayra-stay22"><div class="ayra-wrap"><div class="ayra-stay22-card"><div class="ayra-stay22-copy"><span class="ayra-ey">${esc(stay22.ey||'Uma leitura prática da região')}</span><h2>${ayraText(stay22.titulo||'Veja a procura por hospedagem em tempo real.')}</h2><p>${ayraText(stay22.texto||'Observe as opções e os valores praticados ao redor do AYRA. Essa demanda ajuda a visualizar o movimento da região — e a imaginar como uma unidade sua poderia participar desse mercado, sempre dependendo de ocupação, custos e operação.')}</p></div><div class="ayra-stay22-frame"><iframe id="stay22-widget" title="Opções de hospedagem próximas ao AYRA" width="100%" height="428" src="${esc(src)}" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="ayra-stay22-note">O mapa apresenta opções de hospedagem disponíveis na região. Valores e disponibilidade podem variar. A visualização não representa promessa de ocupação, renda ou rentabilidade.</p></div></div></section>`;};
		const timeline=sectionBy('timeline');
		return `<div class="ayra-landing"><section class="ayra-hero" style="background-image:url('${esc(ayraMedia(h.imagem_url||p.imagem_capa_url))}')"><div class="ayra-hero-overlay"></div><div class="ayra-wrap ayra-hero-inner"><span class="ayra-kicker">${esc(h.kicker||'Pré-lançamento em Penha')}</span>${h.logo_url?`<img class="ayra-hero-logo" src="${esc(ayraMedia(h.logo_url))}" alt="AYRA Slim Residence">`:''}<h1>${ayraText(h.titulo||p.titulo)}</h1><p>${ayraText(h.texto||p.resumo)}</p><div class="ayra-actions">${ayraButton('Quero conhecer as condições',wa)}${ayraButton('▶ Assistir ao decorado','#video',true)}</div></div></section><section class="ayra-fact-strip"><div class="ayra-wrap ayra-facts">${facts.map(i=>`<div><strong>${esc(i[0])}</strong><span>${esc(i[1])}</span></div>`).join('')}</div></section>${renderPilares()}${renderProjection(sectionBy('projecao'))}${renderProjection(sectionBy('shortstay'),'shortstay')}${renderSeazone(sectionBy('seazone'))}${renderCase(sectionBy('case'))}${renderProduct(sectionBy('produto'))}${renderGallery()}${renderVideo()}${renderStay22()}${timeline.titulo?`<section class="ayra-section ayra-soft"><div class="ayra-wrap"><div class="ayra-section-head"><div><span class="ayra-ey">${esc(timeline.ey)}</span><h2>${ayraText(timeline.titulo)}</h2></div><p>${ayraText(timeline.texto)}</p></div><div class="ayra-timeline">${(timeline.itens||[]).map(i=>`<div><small>${esc(i[0])}</small><strong>${esc(i[1])}</strong><span>${esc(i[2])}</span></div>`).join('')}</div></div></section>`:''}<section class="ayra-final"><div class="ayra-wrap"><div><h2>${ayraText(sectionBy('cta').titulo||'O melhor momento para entender o AYRA é antes de escolher a unidade.')}</h2><p>${ayraText(sectionBy('cta').texto||'Fale com a Luan Especialista para consultar disponibilidade, valores e condições.')}</p></div>${ayraButton(sectionBy('cta').acao_rotulo||'Falar no WhatsApp',sectionBy('cta').acao_url||wa)}</div></section><div class="ayra-legal ayra-wrap">${ayraText(b.legal||'Imagens meramente ilustrativas. Consulte as condições e documentos do empreendimento.')}</div><footer class="ayra-footer"><div class="ayra-wrap"><div class="ayra-footer-brand"><strong>Luan Especialista</strong><span>Estratégia patrimonial e oportunidades no litoral norte de Santa Catarina.</span></div><div class="ayra-footer-contact"><span>Atendimento em Penha e região</span><a href="https://luan-especialista.pro" target="_blank" rel="noopener">luan-especialista.pro</a></div><a class="ayra-footer-cta" href="${esc(wa)}" target="_blank" rel="noopener">Falar com especialista</a></div></footer></div>`;
	}
		function bindAyraLanding(){document.querySelectorAll('.ayra-carousel').forEach((carousel)=>{const track=carousel.querySelector('.ayra-carousel-track'),items=[...carousel.querySelectorAll('.ayra-gallery-item')],next=carousel.querySelector('.ayra-carousel-next'),prev=carousel.querySelector('.ayra-carousel-prev'),toggle=carousel.querySelector('.ayra-carousel-toggle'),status=carousel.querySelector('.ayra-carousel-status');let timer=null,paused=false,index=0;const distance=()=>{const first=items[0];return first?first.getBoundingClientRect().width+14:track.clientWidth};const go=(direction)=>{if(!items.length)return;index=(index+direction+items.length)%items.length;track.scrollTo({left:index*distance(),behavior:'smooth'})};const stop=()=>{if(timer){clearInterval(timer);timer=null}};const start=()=>{stop();if(!paused&&items.length>1)timer=setInterval(()=>go(1),Number(carousel.dataset.interval)||5000)};const setPaused=(value)=>{paused=value;toggle.textContent=paused?'Retomar':'Pausar';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Retomar carrossel':'Pausar carrossel');status.textContent=paused?'Carrossel pausado · use os botões para trocar as imagens':'Autoplay ativo · use Pausar para interromper';if(paused)stop();else start()};next?.addEventListener('click',()=>{go(1);setPaused(true)});prev?.addEventListener('click',()=>{go(-1);setPaused(true)});toggle?.addEventListener('click',()=>setPaused(!paused));carousel.addEventListener('focusin',()=>setPaused(true));carousel.addEventListener('focusout',(e)=>{if(!carousel.contains(e.relatedTarget))setPaused(false)});carousel.addEventListener('touchstart',()=>setPaused(true),{passive:true});start()})}
	function article(p){
  const b=p.blocos||{};
  if(b.template==='ayra-landing'){
    document.body.classList.add('ayra-page');document.getElementById('intro').hidden=true;filters.hidden=true;root.className='article article-imovel ayra-article';applySeo(p);root.innerHTML=ayraLanding(p);bindAyraLanding();return;
  }
  const imgs=Array.isArray(p.imagens)?p.imagens:[],hero=media(p.imagem_capa_url),used=new Set(),show=b.exibir_hero!==false&&!!hero;
  if(show)used.add(key(hero));
  const sections=b.secoes||[],body=sections.map(item=>section(item,p,used)).join('')||para(p.conteudo||p.resumo),gallery=galleryFromImages(imgs,used,p),mins=b.leitura_minutos||Math.max(2,Math.ceil((p.conteudo||'').length/1000)),hasInlineCta=sections.some(section=>section.tipo==='cta'),finalCta=!hasInlineCta&&b.cta?`<section class="article-cta"><div><p class="eyebrow">PRÓXIMO PASSO</p><h2>${esc(b.cta)}</h2></div><a href="https://wa.me/5547992120915?text=${encodeURIComponent('Olá, equipe Luan Especialista. Li o artigo “'+p.titulo+'” e gostaria de receber orientação.') }" target="_blank" rel="noopener noreferrer">Falar com a equipe →</a></section>`:'',wise=isWise(p),layout=['artigo','guia','mercado','comparativo','case','imovel'].includes(p.layout)?p.layout:'artigo',heroImage=imgs.find(image=>key(image?.url)===key(p.imagem_capa_url));
  document.getElementById('intro').hidden=true;filters.hidden=true;
  root.className=`article article-${layout} intent-${esc(b.intencao||'descoberta')} ${wise?'has-partner':''} ${show?'has-overlay-hero':''}`;applySeo(p);
  const meta=`<p class="eyebrow">${esc(p.categoria||'Insights')} <span class="meta-dot">·</span> ${date(p.publicado_em)} <span class="meta-dot">·</span> ${mins} min de leitura</p>`;
  const header=`<header class="article-head">${meta}${show?'':`<h1>${esc(p.titulo)}</h1><p class="deck">${esc(p.resumo||'')}</p>`}${wise?wiseCard():''}</header>`;
  const heroMarkup=show?`<figure class="hero-figure hero-overlay"><img src="${esc(hero)}" fetchpriority="high" decoding="async" alt="${esc(heroImage?.alt||p.titulo)}"><figcaption class="hero-overlay-copy"><h1>${esc(p.titulo)}</h1><p class="deck">${esc(p.resumo||'')}</p></figcaption></figure>`:'';
  root.innerHTML=`<a class="back" href="/blog/" aria-label="Voltar aos Insights">←&nbsp; Voltar aos Insights</a>${header}${heroMarkup}<main class="article-flow">${readingMap(sections)}${body}${gallery}</main>${sources(b)}${stay22Context(p)}${finalCta}${engagement(p)}`;
  bindRatingControls();bindCarousel();bindEngagement();
}
function render(){
  const cats=['Todos',...new Set(posts.map(post=>post.categoria).filter(Boolean))];
  filters.innerHTML=cats.map(name=>`<button class="filter ${name===category?'active':''}" data-category="${esc(name)}">${esc(name)}</button>`).join('');
  const list=category==='Todos'?posts:posts.filter(post=>post.categoria===category);
  root.className='posts';
  root.innerHTML=list.map((post,index)=>{
    const cover=media(post.blocos?.imagem_card_url||post.imagem_capa_url),mins=post.blocos?.leitura_minutos||Math.max(2,Math.ceil((post.conteudo||'').length/1000)),intent=post.blocos?.intencao||'descoberta',isAyra=post.blocos?.template==='ayra-landing'||post.slug==='ayra-slim-residence-penha-santer',overlay=cover&&!isAyra?'post-overlay':'';
    return `<article class="post ${index===0?'post-featured':''} ${overlay}">${cover?`<img class="post-image" src="${esc(cover)}" loading="lazy" alt="${esc(post.titulo)}">`:''}<div class="post-copy"><div class="post-meta"><span>${esc(post.categoria||'Insights')}</span><span>${mins} min</span></div><div class="post-intent">${intent==='decisao'?'PARA DECIDIR':intent==='guia'?'GUIA PRÁTICO':'PARA DESCOBRIR'}</div><h2>${esc(post.titulo)}</h2><p>${esc(post.resumo||'')}</p><a class="post-read" href="/blog/${encodeURIComponent(post.slug)}/">Ler a análise <span>→</span></a></div></article>`;
  }).join('')||'<div class="empty"><strong>Estamos preparando as próximas leituras.</strong><span>Enquanto isso, conheça as oportunidades selecionadas ou fale com a equipe para organizar sua próxima decisão.</span><div><a href="/imoveis/">Ver oportunidades →</a><a href="https://wa.me/5547992120915?text=Olá%2C%20quero%20receber%20as%20próximas%20leituras%20da%20Luan%20Especialista." target="_blank" rel="noopener">Falar com a equipe →</a></div></div>';
  filters.querySelectorAll('button').forEach(button=>button.onclick=()=>{category=button.dataset.category;render()});
}
function bindNewsletter(){const form=document.getElementById('newsletter-form'),status=document.getElementById('newsletter-status');if(!form||!status)return;form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);if(data.get('company'))return;const button=form.querySelector('button');button.disabled=true;status.textContent='Salvando sua inscrição…';const r=await api('rpc/assinar_newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_email:data.get('email'),p_nome:data.get('name')||null,p_idioma:document.documentElement.lang||'pt-BR',p_origem:'blog'})});button.disabled=false;if(r.ok){form.reset();status.textContent='Inscrição confirmada. Você receberá apenas conteúdos e oportunidades relevantes.'}else status.textContent='Não foi possível concluir agora. Tente novamente em instantes.'})}
	async function load(){bindNewsletter();try{const isPreview=new URLSearchParams(location.search).get('preview')==='1';let localPreview=null;if(isPreview){try{const raw=localStorage.getItem('luan_blog_preview');const candidate=raw?JSON.parse(raw):null;if(candidate&&candidate.slug===wanted)localPreview=candidate}catch{}if(!localPreview&&wanted==='ayra-slim-residence-penha-santer'){try{const response=await fetch('/ayra-landing-draft.json',{cache:'no-store'});if(response.ok){const candidate=await response.json();if(candidate.slug===wanted)localPreview=candidate}}catch{}}}if(localPreview){posts=[localPreview];article(localPreview);return}const r=await api('blog_posts?select=id,titulo,slug,resumo,conteudo,categoria,layout,imagem_capa_url,imagens,blocos,publicado_em,atualizado_em,seo_titulo,seo_descricao,palavras_chave&status=eq.publicado&order=publicado_em.desc');if(!r.ok)throw Error();posts=await r.json();const p=posts.find(x=>x.slug===wanted);if(p)article(p);else if(!root.querySelector('.article-head h1'))render()}catch{if(!root.querySelector('.article-head h1,.post'))root.innerHTML='<div class="empty"><strong>Os conteúdos estão temporariamente indisponíveis.</strong><span>Tente novamente em instantes ou fale com a equipe para receber orientação.</span><a href="https://wa.me/5547992120915?text=Olá%2C%20não%20consegui%20acessar%20os%20Insights." target="_blank" rel="noopener">Falar com a equipe →</a></div>'}}load();
})();
