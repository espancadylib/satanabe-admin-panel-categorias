import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0'

const SUPABASE_URL='https://agkjutuvfjcahckhjkra.supabase.co'
const SUPABASE_KEY='sb_publishable_6oA2tFA2W-yfzK6GpL4Bhw_prNXvyvd'
const OLD_API=`${SUPABASE_URL}/functions/v1/admin-licenses-api`
const DASH_API=`${SUPABASE_URL}/functions/v1/admin-dashboard-api`
const CLIENT_API=`${SUPABASE_URL}/functions/v1/admin-clients-api`
const PATCH_API=`${SUPABASE_URL}/functions/v1/admin-patches-api`
const RESELLER_API=`${SUPABASE_URL}/functions/v1/admin-resellers-api`
const RESELLER_PANEL_URL='https://espancashots.github.io/satanabe-reseller/'
const PIX_COPY_PASTE='00020101021126580014br.gov.bcb.pix01360c0f1a70-bf41-4479-a66d-c6a527cf76fe5204000053039865802BR5917JOAO P M BAPTISTA6013CACHOEIRAS DE62070503***6304F699'

const PLAN_CATALOG={
  '3h_test':{duration:'3h',name:'3 horas • Teste grátis',price:0},
  '3h_paid':{duration:'3h',name:'3 horas',price:4},
  '10h':{duration:'10h',name:'10 horas',price:8},
  '1d':{duration:'1d',name:'1 dia',price:14},
  '3d':{duration:'3d',name:'3 dias',price:30},
  '1w':{duration:'1w',name:'7 dias',price:40},
  '1m':{duration:'1m',name:'1 mês',price:70},
}

const supabase=createClient(SUPABASE_URL,SUPABASE_KEY)
const $=id=>document.getElementById(id)

let licenses=[],clients=[],patches=[],patchSettings=null,patchSummary={active:0,disabled:0,total:0},overview=null,activity=[]
let resellers=[],resellerSummary={total:0,active:0,disabled:0,month_revenue:0,active_keys:0,clients:0},resellerDetail=null,resellerSubTab='overview'
let activePanel='overview',keyFilter='all',renewFilter='today',selected=new Set(),currentDeviceLicenseId=null

const panelTitles={overview:'Overview',keys:'Keys',clients:'Clientes',resellers:'Revendedores',renewals:'Renovações',patches:'Patches',activity:'Logs'}
const statusName={active:'Ativa',pending:'Pendente',expired:'Expirada',revoked:'Revogada'}
const actionNames={
  create:'Key criada',create_bulk:'Keys criadas',revoke:'Key desativada',reactivate:'Key reativada',add_time:'Tempo adicionado',reset_devices:'Aparelhos resetados',remove_device:'Aparelho removido',
  client_create:'Cliente criado',client_update:'Cliente atualizado',client_delete:'Cliente removido',renew:'Renovação registrada',renewal_contacted:'Cliente marcado como contatado',update_license_meta:'Key atualizada',
  patch_create:'Patch importado',patch_update:'Patch atualizado',patch_enable:'Patch ativado',patch_disable:'Patch desativado',patch_enable_all:'Todos patches ativados',patch_disable_all:'Todos patches desativados',
  patch_duplicate:'Patch duplicado',patch_restore_version:'Versão restaurada',patch_remove:'Patch removido',patch_reorder:'Ordem dos patches alterada',kill_switch_on:'Kill switch ativado',kill_switch_off:'Kill switch desativado',
  maintenance_on:'Manutenção ativada',maintenance_off:'Manutenção desativada',backup_export:'Backup exportado',settings_update:'Configurações atualizadas',register_full_key:'Key completa registrada',
  delete_expired:'Keys expiradas excluídas',expire_revoked:'Keys revogadas expiradas',set_max_devices:'Limite de aparelhos alterado',
  reseller_create:'Revendedor criado',reseller_update:'Revendedor atualizado',reseller_enable:'Revendedor ativado',reseller_disable:'Revendedor desativado',reseller_license_enable:'Key de revendedor ativada',reseller_license_disable:'Key de revendedor desativada'
}

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return'—'}}
function fmtDay(v){if(!v)return'—';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(new Date(v))}catch{return'—'}}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)}
function fileSize(v){const n=Number(v)||0;if(!n)return'—';if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}
function patchCategory(value){const raw=String(typeof value==='string'?value:(value?.category??value?.interfaceTab??value?.interface_tab??'rankeada')).trim().toLowerCase();const aliases={rank:'rankeada',ranked:'rankeada',rankeada:'rankeada',apostado:'apostado',aposta:'apostado',bet:'apostado',skin:'skins',skins:'skins'};return aliases[raw]||'rankeada'}
function patchInterfaceTab(p){return({rankeada:'RANKEADA',apostado:'APOSTADO',skins:'SKINS'})[patchCategory(p)]}
function patchInterfaceLabel(p){return({RANKEADA:'Rankeada',APOSTADO:'Apostado',SKINS:'Skin'})[patchInterfaceTab(p)]}
function buildPatchUpdatePayload({id,name,description,category,versionNote}){return{action:'update_patch',patch_id:id,name,description,category:patchCategory(category),version_note:versionNote}}
async function attachSelectedPatchFile(payload,id,file){if(!file)return null;const path=await uploadPatch(file,id);payload.storage_path=path;payload.original_filename=file.name;payload.file_size=file.size;return path}
function showFlash(msg){const el=$('globalFlash');el.textContent=msg;el.classList.remove('hidden');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.add('hidden'),3500)}
function download(name,content,type='application/json'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function phoneDigits(p=''){let d=String(p).replace(/\D/g,'');if((d.length===10||d.length===11)&&!d.startsWith('55'))d='55'+d;return d}
function startOfDay(date=new Date()){return new Date(date.getFullYear(),date.getMonth(),date.getDate())}
function endOfDay(date=new Date()){const d=startOfDay(date);d.setDate(d.getDate()+1);return d}
function dayWindow(offset=0){const s=startOfDay();s.setDate(s.getDate()+offset);const e=new Date(s);e.setDate(e.getDate()+1);return[s.getTime(),e.getTime()]}
function isExpiryOnDay(l,offset=0){if(!l.expires_at)return false;const t=new Date(l.expires_at).getTime(),[s,e]=dayWindow(offset);return t>=s&&t<e}
function isActiveOrFuture(l){return !l.revoked_at&&l.expires_at&&new Date(l.expires_at).getTime()>Date.now()}
function dueWithinDays(l,days){if(!l.expires_at||l.status!=='active')return false;const t=new Date(l.expires_at).getTime();return t>=Date.now()&&t<=endOfDay(new Date(Date.now()+days*86400000)).getTime()}
function clientOf(l){return l?.client||clients.find(c=>c.id===l?.client_id)||null}
function planPriceForLicense(l){const plan=String(l?.plan||l?.duration_label||'').toLowerCase();if(plan.includes('3 horas')||plan.includes('3h'))return plan.includes('teste')?0:4;if(plan.includes('10'))return 8;if(plan.includes('1 dia'))return 14;if(plan.includes('3 dias'))return 30;if(plan.includes('7 dias')||plan.includes('1 semana'))return 40;if(plan.includes('1 mês')||plan.includes('30 dias')||plan.includes('mensal'))return 70;return Number(l?.price_paid)||0}
function waUrl(client,l){const d=phoneDigits(client?.phone);if(!d)return null;const tpl=overview?.settings?.renewal_message_template||'Olá {nome}, sua key vence em {data}. Quer renovar?';const msg=tpl.replaceAll('{nome}',client?.name||'').replaceAll('{data}',fmtDate(l?.expires_at)).replaceAll('{plano}',l?.plan||l?.duration_label||'').replaceAll('{key}',l?.license_key||l?.key_hint||'');return`https://wa.me/${d}?text=${encodeURIComponent(msg)}`}
async function copyText(text,label='Copiado.'){try{await navigator.clipboard.writeText(text);showFlash(label)}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showFlash(label)}}

function handleAccessDelivery(access){
  if(!access)return false
  if(access.delivery==='manual_link'&&access.action_link){
    $('accessLinkValue').value=access.action_link
    $('accessLinkHint').textContent=access.mode==='invite'?'O e-mail automático não estava disponível. Copie este convite e envie ao revendedor por WhatsApp.':'O e-mail automático não estava disponível. Copie este link e envie ao revendedor para ele definir uma nova senha.'
    openModal('accessLinkModal')
    return true
  }
  showFlash(access.mode==='invite'?'Convite de acesso enviado por e-mail.':'E-mail para definir/redefinir a senha enviado.')
  return false
}

async function session(){const {data}=await supabase.auth.getSession();return data.session}
async function callApi(url,body){const s=await session();if(!s)throw new Error('Sessão expirada. Entre novamente.');const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${s.access_token}`},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok){const e=new Error(data.detail||data.error||`Erro ${res.status}`);e.code=data.error;throw e}return data}
const oldApi=b=>callApi(OLD_API,b),dashApi=b=>callApi(DASH_API,b),clientApi=b=>callApi(CLIENT_API,b),patchApi=b=>callApi(PATCH_API,b),resellerApi=b=>callApi(RESELLER_API,b)

function openModal(id){document.querySelectorAll('.modal').forEach(x=>x.classList.add('hidden'));$('modalBackdrop').classList.remove('hidden');$(id).classList.remove('hidden');document.body.style.overflow='hidden'}
function closeModals(){document.querySelectorAll('.modal').forEach(x=>x.classList.add('hidden'));$('modalBackdrop').classList.add('hidden');document.body.style.overflow=''}
document.querySelectorAll('.close-modal').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeModals()}))
$('modalBackdrop').addEventListener('click',closeModals)

function applyLicenseSummary(summary={}){$('keyActive').textContent=summary.active||0;$('keyPending').textContent=summary.pending||0;$('keyExpired').textContent=summary.expired||0;$('keyRevoked').textContent=summary.revoked||0}
async function loadLicenses(){const d=await dashApi({action:'list_licenses'});licenses=d.licenses||[];applyLicenseSummary(d.summary);renderKeys();renderRenewals();renderNotifications();return d}
async function loadClients(){const d=await clientApi({action:'list_clients'});clients=d.clients||[];fillClientSelects();renderClients();renderKeys();renderRenewals();renderNotifications();return d}
async function loadOverview(){overview=await dashApi({action:'overview'});updateOverviewStats();$('renewalTemplate').value=overview.settings?.renewal_message_template||'';renderOverviewAlerts();renderNotifications();return overview}
async function loadPatchSummary(){const d=await patchApi({action:'list'});patchSummary=d.summary||{};patches=d.patches||patches;patchSettings=d.settings||patchSettings;updateOverviewStats();return d}
async function loadPatches(){const d=await patchApi({action:'list'});patches=d.patches||[];patchSettings=d.settings||null;patchSummary=d.summary||{};$('patchActive').textContent=d.summary?.active||0;$('patchDisabled').textContent=d.summary?.disabled||0;$('patchTotal').textContent=d.summary?.total||0;$('patchUsage').textContent=patches.reduce((s,p)=>s+Number(p.usage_count||0),0);$('maintenanceMessage').value=patchSettings?.maintenance_message||'';updatePatchGlobalButtons();renderPatches();updateOverviewStats();return d}
async function loadActivity(){const d=await dashApi({action:'activity'});activity=d.activity||[];renderActivity();return d}
async function loadResellers(){
  const d=await resellerApi({action:'list_resellers'});resellers=d.resellers||[];resellerSummary=d.summary||resellerSummary;renderResellerSummary();renderResellers();return d
}
function renderResellerSummary(){
  if(!$('resellerTotal'))return
  $('resellerTotal').textContent=resellerSummary.total||0
  $('resellerActive').textContent=resellerSummary.active||0
  $('resellerActiveKeys').textContent=resellerSummary.active_keys||0
  $('resellerClients').textContent=resellerSummary.clients||0
  $('resellerRevenue').textContent=money(resellerSummary.month_revenue||0)
}
function resellerSlug(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)}
function renderResellers(){
  if(!$('resellerList'))return
  const q=normalizeSearchText($('resellerSearch')?.value||'')
  const rows=resellers.filter(r=>!q||[r.store_name,r.owner_name,r.email,r.whatsapp,r.phone,r.slug].some(v=>normalizeSearchText(v||'').includes(q)))
  $('resellerEmpty').classList.toggle('hidden',rows.length>0)
  $('resellerList').innerHTML=rows.map(r=>`<article class="client-card glass reseller-card"><div class="card-head"><div><div class="card-title">${esc(r.store_name)}</div><div class="meta"><span class="badge ${r.enabled?'active':'revoked'}">${r.enabled?'Ativo':'Desativado'}</span><span>${esc(r.owner_name||'Sem responsável')}</span><span class="badge ${r.access_ready?'active':'pending'}">${r.access_ready?'Acesso vinculado':'Acesso pendente'}</span></div></div><strong class="money">${money(r.month_revenue||0)}</strong></div><div class="client-phone">${esc(r.whatsapp||r.phone||r.email||'Sem contato cadastrado')}</div><div class="reseller-metrics"><span><strong>${r.active_key_count||0}</strong> keys ativas</span><span><strong>${r.client_count||0}</strong> clientes</span><span><strong>${r.key_count||0}</strong> keys totais</span></div><div class="row-actions"><button class="mini primary" data-reseller-action="open" data-id="${r.id}">Abrir painel</button><button class="mini" data-reseller-action="edit" data-id="${r.id}">Editar</button><button class="mini" data-reseller-action="access" data-id="${r.id}">${r.access_ready?'Reenviar acesso':'Enviar acesso'}</button><button class="mini ${r.enabled?'danger':'success'}" data-reseller-action="status" data-id="${r.id}">${r.enabled?'Desativar':'Ativar'}</button></div></article>`).join('')
}
function fillResellerForm(r=null){
  $('resellerForm').reset();if(!r)delete $('resellerSlug').dataset.touched;$('resellerId').value=r?.id||'';$('resellerModalTitle').textContent=r?'Editar revendedor':'Criar revendedor';$('saveResellerButton').textContent=r?'Salvar alterações':'Criar revendedor'
  $('resellerStoreName').value=r?.store_name||'';$('resellerOwnerName').value=r?.owner_name||'';$('resellerEmail').value=r?.email||'';$('resellerWhatsapp').value=r?.whatsapp||r?.phone||'';$('resellerSlug').value=r?.slug||'';$('resellerPix').value=r?.pix_copy_paste||'';$('resellerNotes').value=r?.notes||''
  $('resellerPermOverview').checked=r?.permissions?.overview!==false;$('resellerPermKeys').checked=r?.permissions?.keys!==false;$('resellerPermClients').checked=r?.permissions?.clients!==false;$('resellerPermRevenue').checked=r?.permissions?.revenue!==false
}
async function loadResellerDetail(id){
  resellerDetail=await resellerApi({action:'reseller_detail',reseller_id:id});renderResellerDetail();return resellerDetail
}
function renderResellerDetail(){
  if(!resellerDetail)return
  const r=resellerDetail.reseller,s=resellerDetail.summary||{}
  $('resellerDetailName').textContent=r.store_name||'Revendedor'
  $('resellerDetailMeta').innerHTML=`<span class="badge ${r.enabled?'active':'revoked'}">${r.enabled?'Ativo':'Desativado'}</span><span>${esc(r.owner_name||'Sem responsável')}</span><span class="badge ${r.access_ready?'active':'pending'}">${r.access_ready?'Acesso vinculado':'Acesso pendente'}</span>${r.whatsapp?`<span>${esc(r.whatsapp)}</span>`:''}`
  $('toggleResellerButton').textContent=r.enabled?'Desativar revendedor':'Ativar revendedor';$('toggleResellerButton').className=r.enabled?'danger':'success'
  $('rdActiveKeys').textContent=s.active_keys||0;$('rdPendingKeys').textContent=s.pending_keys||0;$('rdExpiredKeys').textContent=s.expired_keys||0;$('rdClients').textContent=s.clients||0;$('rdDevices').textContent=s.devices||0;$('rdRevenue').textContent=money(s.month_revenue||0)
  $('rdStoreName').textContent=r.store_name||'—';$('rdStoreSlug').textContent=`Futuro endereço: /loja/${r.slug||'—'}`;$('rdOwnerName').textContent=r.owner_name||'—';$('rdOwnerContact').textContent=[r.whatsapp||r.phone,r.email].filter(Boolean).join(' • ')||'Sem contato';$('rdTotalRevenue').textContent=money(s.total_revenue||0)
  const perms=r.permissions||{};$('rdPermissions').innerHTML=[['Overview',perms.overview!==false],['Keys',perms.keys!==false],['Clientes',perms.clients!==false]].map(([n,on])=>`<span class="permission-pill ${on?'on':'off'}">${on?'✓':'×'} ${n}</span>`).join('')
  renderResellerKeys();renderResellerClients();switchResellerSubtab(resellerSubTab)
}
function switchResellerSubtab(name){
  resellerSubTab=name;document.querySelectorAll('[data-reseller-subtab]').forEach(b=>b.classList.toggle('active',b.dataset.resellerSubtab===name));['overview','keys','clients'].forEach(x=>$(`reseller${x[0].toUpperCase()+x.slice(1)}Sub`).classList.toggle('hidden',x!==name))
}
function renderResellerKeys(){
  if(!resellerDetail||!$('resellerKeyList'))return
  const q=normalizeSearchText($('resellerKeySearch')?.value||'')
  const rows=(resellerDetail.licenses||[]).filter(l=>{const c=l.client||{};return!q||[l.license_key,l.key_hint,l.plan,l.duration_label,c.name,c.phone].some(v=>normalizeSearchText(v||'').includes(q))})
  $('resellerKeyEmpty').classList.toggle('hidden',rows.length>0)
  $('resellerKeyList').innerHTML=rows.map(l=>{const c=l.client||{},key=l.license_key||l.key_hint||'Key';return`<article class="key-card glass"><div class="key-main"><div class="key-check-spacer"></div><div class="key-content"><div class="card-head"><div><div class="card-title">${esc(c.name||l.plan||l.duration_label||'Key')}</div><div class="meta"><span class="badge ${l.status}">${statusName[l.status]||l.status}</span><span>${esc(l.plan||l.duration_label||'')}</span><span>${l.device_count||0}/${l.max_devices} aparelhos</span></div></div><div class="nowrap">${l.expires_at?fmtDate(l.expires_at):'Não ativada'}</div></div><div class="keyline">${esc(key)}</div><div class="meta"><span>${esc(c.phone||'Sem telefone')}</span></div><div class="row-actions spacer"><button class="mini ${l.status==='revoked'?'success':'danger'}" data-reseller-key-action="toggle" data-id="${l.id}">${l.status==='revoked'?'Ativar':'Desativar'}</button><button class="mini" data-reseller-key-action="copy" data-id="${l.id}">Copiar key</button></div></div></div></article>`}).join('')
}
function renderResellerClients(){
  if(!resellerDetail||!$('resellerClientList'))return
  const q=normalizeSearchText($('resellerClientSearch')?.value||'')
  const licenses=resellerDetail.licenses||[]
  const rows=(resellerDetail.clients||[]).filter(c=>!q||[c.name,c.phone,c.email].some(v=>normalizeSearchText(v||'').includes(q)))
  $('resellerClientEmpty').classList.toggle('hidden',rows.length>0)
  $('resellerClientList').innerHTML=rows.map(c=>{const own=licenses.filter(l=>l.client_id===c.id),active=own.filter(l=>l.status==='active').length;return`<article class="client-card glass"><div class="card-head"><div><div class="card-title">${esc(c.name)}</div><div class="meta"><span>${own.length} key(s)</span><span>${active} ativa(s)</span></div></div></div><div class="client-phone">${esc(c.phone||c.email||'Sem contato')}</div><div class="row-actions">${c.phone?`<button class="mini whatsapp" data-reseller-client-action="whatsapp" data-phone="${esc(c.phone)}">WhatsApp</button>`:''}</div></article>`}).join('')
}
async function refreshCore(){await Promise.all([loadLicenses(),loadClients(),loadPatchSummary(),loadOverview()]);updateOverviewStats();renderOverviewAlerts();renderNotifications()}

function updateOverviewStats(){
  const active=licenses.filter(l=>l.status==='active').length
  const today=licenses.filter(l=>l.status==='active'&&isExpiryOnDay(l,0)).length
  const tomorrow=licenses.filter(l=>l.status==='active'&&isExpiryOnDay(l,1)).length
  const within3=licenses.filter(l=>dueWithinDays(l,3)).length
  $('ovActive').textContent=active||overview?.stats?.active_keys||0
  $('ovToday').textContent=today
  $('ovTomorrow').textContent=tomorrow
  $('ov3d').textContent=within3
  $('ovDevices').textContent=overview?.stats?.active_devices??licenses.reduce((s,l)=>s+Number(l.device_count||0),0)
  const total=Number(patchSummary.total??patches.length??0),pa=Number(patchSummary.active??patches.filter(p=>p.enabled).length??0)
  $('ovPatches').textContent=`${pa}/${total}`
  $('ovRevenue').textContent=money(overview?.stats?.month_revenue||0)
}

function notificationRows(){
  const now=Date.now(),oldest=now-7*86400000,end3=dayWindow(3)[1]
  return licenses.filter(l=>l.client_id&&clientOf(l)&&l.expires_at&&!l.revoked_at).filter(l=>{const t=new Date(l.expires_at).getTime();return t>=oldest&&t<end3}).sort((a,b)=>new Date(a.expires_at)-new Date(b.expires_at))
}
function dueLabel(l){const t=new Date(l.expires_at).getTime();if(t<Date.now())return'Vencida';if(isExpiryOnDay(l,0))return'Vence hoje';if(isExpiryOnDay(l,1))return'Vence amanhã';return'Vence em até 3 dias'}
function renderNotifications(){
  if(!$('notificationList'))return
  const rows=notificationRows(),count=rows.length
  $('notificationCount').textContent=count>99?'99+':String(count);$('notificationCount').classList.toggle('hidden',!count)
  $('notificationList').innerHTML=rows.length?rows.slice(0,12).map(l=>{const c=clientOf(l),u=waUrl(c,l);return`<article class="mini-item notification-item"><div><strong>${esc(c?.name||'Cliente')}</strong><div class="meta"><span class="badge ${new Date(l.expires_at)<new Date()?'expired':'pending'}">${dueLabel(l)}</span><span>${fmtDate(l.expires_at)}</span></div><div class="muted">${esc(l.plan||l.duration_label||'')} • ${esc(c?.phone||'Sem telefone')}</div><div class="row-actions">${u?`<button class="mini whatsapp" data-notification-action="whatsapp" data-id="${l.id}">WhatsApp</button>`:''}<button class="mini success" data-notification-action="renew" data-id="${l.id}">Renovar</button><button class="mini" data-notification-action="contacted" data-id="${l.id}">Contatado</button></div></div></article>`}).join(''):'<div class="muted">Nenhuma cobrança próxima no momento.</div>'
}
function renderOverviewAlerts(){
  const el=$('overviewAlerts'),rows=notificationRows().slice(0,6)
  if(!rows.length){el.innerHTML='<div class="muted">Nenhum cliente com vencimento próximo.</div>';return}
  el.innerHTML=rows.map(l=>{const c=clientOf(l);return`<div class="mini-item"><div><strong>${esc(c?.name||'Cliente')}</strong><div class="muted">${dueLabel(l)} • ${esc(l.plan||l.duration_label||'')} • ${fmtDate(l.expires_at)}</div></div><div class="row-actions"><button class="mini" data-overview-action="manage" data-id="${l.id}">Ver key</button>${c?.phone?`<button class="mini whatsapp" data-overview-action="whatsapp" data-id="${l.id}">WhatsApp</button>`:''}</div></div>`}).join('')
}

function keyVisible(l){if(keyFilter==='all')return true;return l.status===keyFilter}
function filteredKeys(){const q=$('keySearch').value.trim().toLowerCase();return licenses.filter(keyVisible).filter(l=>{const c=clientOf(l);return!q||[l.license_key,l.key_hint,l.note,l.plan,l.duration_label,c?.name,c?.phone,statusName[l.status]].some(x=>String(x||'').toLowerCase().includes(q))})}
function renderKeys(){
  if(!$('keyList'))return
  const rows=filteredKeys();$('keyEmpty').classList.toggle('hidden',rows.length>0);updateSelectedCount()
  $('keyList').innerHTML=rows.map(l=>{const key=l.license_key||l.key_hint||'Key antiga',c=clientOf(l);return`<article class="license-card glass"><div class="selector"><input class="key-select" type="checkbox" data-id="${l.id}" ${selected.has(l.id)?'checked':''}></div><div><div class="card-head"><div><div class="card-title">${esc(c?.name||'Sem cliente')}</div><div class="meta"><span class="badge ${l.status}">${statusName[l.status]||l.status}</span><span>${esc(l.plan||l.duration_label||'Sem plano')}</span><span>${l.device_count||0}/${l.max_devices} aparelhos</span>${l.price_paid!=null?`<span>${money(l.price_paid)}</span>`:''}</div></div><div class="nowrap">${l.expires_at?fmtDate(l.expires_at):'Não ativada'}</div></div><div class="keyline">${esc(key)}</div><div class="meta"><span>${esc(c?.phone||'Sem telefone')}</span>${l.note?`<span>• ${esc(l.note)}</span>`:''}</div><div class="row-actions spacer"><button class="mini primary" data-key-action="manage" data-id="${l.id}">Gerenciar</button><button class="mini" data-key-action="copy" data-id="${l.id}">Copiar key</button>${c?.phone?`<button class="mini whatsapp" data-key-action="whatsapp" data-id="${l.id}">WhatsApp</button>`:''}</div></div></article>`}).join('')
}
function updateSelectedCount(){$('selectedCount').textContent=`${selected.size} selecionada${selected.size===1?'':'s'}`}

function normalizeSearchText(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function clientMatches(c,query=''){
  const q=normalizeSearchText(query);if(!q)return true
  const qDigits=String(query).replace(/\D/g,'')
  const name=normalizeSearchText(c?.name||''),phone=normalizeSearchText(c?.phone||''),phoneDigits=String(c?.phone||'').replace(/\D/g,'')
  return name.includes(q)||phone.includes(q)||(qDigits.length>=3&&phoneDigits.includes(qDigits))
}
function fillClientSelects(){
  fillCreateClientSelect($('createClientSearch')?.value||'')
  const sel=$('editKeyClient');if(sel){const old=sel.value;sel.innerHTML='<option value="">Sem cliente</option>'+clients.map(c=>`<option value="${c.id}">${esc(c.name)}${c.phone?' • '+esc(c.phone):''}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old}
}
function fillCreateClientSelect(query=''){
  const sel=$('createClient');if(!sel)return []
  const old=sel.value,q=String(query||'').trim(),rows=clients.filter(c=>clientMatches(c,q)),status=$('createClientSearchStatus')
  let first='<option value="">Sem cliente</option>'
  if(q&&rows.length>1)first=`<option value="">Escolha um dos ${rows.length} clientes encontrados</option>`
  if(q&&!rows.length)first='<option value="">Nenhum cliente encontrado</option>'
  sel.innerHTML=first+rows.map(c=>`<option value="${c.id}">${esc(c.name)}${c.phone?' • '+esc(c.phone):''}</option>`).join('')
  const qDigits=q.replace(/\D/g,'')
  const exact=rows.find(c=>qDigits.length>=8&&String(c.phone||'').replace(/\D/g,'')===qDigits)
  if(exact)sel.value=exact.id
  else if(rows.length===1&&q)sel.value=rows[0].id
  else if([...sel.options].some(o=>o.value===old)&&!q)sel.value=old
  if(status){if(!q)status.textContent=`${clients.length} cliente(s) disponível(is). Digite para filtrar.`;else if(!rows.length)status.textContent='Nenhum cliente encontrado. Cadastre o cliente primeiro ou revise o número.';else if(rows.length===1)status.textContent=`1 cliente encontrado e selecionado: ${rows[0].name}.`;else status.textContent=`${rows.length} clientes encontrados. Escolha um abaixo.`}
  return rows
}
function renderClients(){
  if(!$('clientList'))return
  const q=$('clientSearch').value.trim().toLowerCase(),rows=clients.filter(c=>!q||[c.name,c.phone].some(x=>String(x||'').toLowerCase().includes(q)))
  $('clientEmpty').classList.toggle('hidden',rows.length>0)
  $('clientList').innerHTML=rows.map(c=>`<article class="client-card glass"><div class="card-head"><div><div class="card-title">${esc(c.name)}</div><div class="meta"><span>${c.key_count||0} key(s)</span><span>${c.active_key_count||0} ativa(s)</span></div></div><strong class="money">${money(c.total_spent)}</strong></div><div class="client-phone">${esc(c.phone||'Sem WhatsApp cadastrado')}</div><div class="row-actions">${c.phone?`<button class="mini whatsapp" data-client-action="whatsapp" data-id="${c.id}">WhatsApp</button>`:''}<button class="mini" data-client-action="detail" data-id="${c.id}">Histórico</button><button class="mini success" data-client-action="renew" data-id="${c.id}">Renovar</button><button class="mini" data-client-action="edit" data-id="${c.id}">Editar</button><button class="mini danger" data-client-action="delete" data-id="${c.id}">Excluir</button></div></article>`).join('')
}

function renewalRows(){
  const now=Date.now(),day=86400000;let rows=licenses.filter(l=>l.client_id&&clientOf(l)&&l.expires_at&&!l.revoked_at)
  if(renewFilter==='today')rows=rows.filter(l=>new Date(l.expires_at).getTime()<=dayWindow(0)[1])
  if(renewFilter==='tomorrow')rows=rows.filter(l=>isExpiryOnDay(l,1))
  if(renewFilter==='3d')rows=rows.filter(l=>new Date(l.expires_at).getTime()<=now+3*day)
  if(renewFilter==='7d')rows=rows.filter(l=>new Date(l.expires_at).getTime()<=now+7*day)
  if(renewFilter==='not-contacted')rows=rows.filter(l=>new Date(l.expires_at).getTime()<=now+7*day&&!l.renewal_contacted_at)
  return rows.sort((a,b)=>new Date(a.expires_at)-new Date(b.expires_at))
}
function renderRenewals(){
  if(!$('renewalList'))return
  const rows=renewalRows();$('renewalEmpty').classList.toggle('hidden',rows.length>0);$('renewalPotential').textContent=`${money(rows.reduce((s,l)=>s+(Number(l.price_paid)||planPriceForLicense(l)),0))} potencial`
  $('renewalList').innerHTML=rows.map(l=>{const c=clientOf(l),url=waUrl(c,l),expired=new Date(l.expires_at).getTime()<Date.now();return`<article class="renew-card glass"><div class="card-head"><div><div class="card-title">${esc(c?.name||'Cliente')}</div><div class="meta"><span class="badge ${expired?'expired':'active'}">${expired?'Vencida':'Vai vencer'}</span><span>${fmtDate(l.expires_at)}</span><span>${esc(l.plan||l.duration_label||'')}</span>${l.renewal_contacted_at?`<span>Contatado ${fmtDate(l.renewal_contacted_at)}</span>`:''}</div></div><strong>${money(Number(l.price_paid)||planPriceForLicense(l))}</strong></div><div class="keyline">${esc(l.license_key||l.key_hint||'')}</div><div class="row-actions">${url?`<button class="mini whatsapp" data-renew-action="whatsapp" data-id="${l.id}">WhatsApp</button>`:''}<button class="mini" data-renew-action="contacted" data-id="${l.id}">Marcar contatado</button><button class="mini success" data-renew-action="renew" data-id="${l.id}">Renovar</button><button class="mini" data-renew-action="manage" data-id="${l.id}">Gerenciar key</button></div></article>`}).join('')
}

function updatePatchGlobalButtons(){const on=patchSettings?.patches_globally_enabled!==false,maint=patchSettings?.maintenance_mode===true;$('killSwitch').textContent=on?'Ativar kill switch':'Desativar kill switch';$('killSwitch').className=on?'danger':'success';$('maintenanceButton').textContent=maint?'Encerrar manutenção':'Modo manutenção';$('maintenanceButton').className=maint?'success':'secondary'}
function renderPatches(){$('patchEmpty').classList.toggle('hidden',patches.length>0);$('patchList').innerHTML=patches.map((p,i)=>`<article class="patch-card glass"><div><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="meta"><span class="badge ${p.enabled?'on':'off'}">${p.enabled?'Ativo':'Desativado'}</span><span class="badge tab">${esc(patchInterfaceLabel(p))}</span><span>${p.usage_count||0} aparelho(s) salvos</span><span>${p.version_count||0} versão(ões)</span><span>${fileSize(p.file_size)}</span></div></div><div class="order-controls"><button class="mini" data-patch-action="up" data-id="${p.id}" ${i===0?'disabled':''}>↑</button><button class="mini" data-patch-action="down" data-id="${p.id}" ${i===patches.length-1?'disabled':''}>↓</button></div></div><div class="muted">${esc(p.description||'Sem descrição')}</div><div class="patch-path">${esc(p.storage_path||'')}</div><div class="meta"><span>Atualizado: ${fmtDate(p.updated_at)}</span></div></div><div class="patch-actions"><button class="mini" data-patch-action="edit" data-id="${p.id}">Editar</button><button class="mini" data-patch-action="versions" data-id="${p.id}">Versões</button><button class="mini" data-patch-action="duplicate" data-id="${p.id}">Duplicar</button><button class="mini ${p.enabled?'danger':'success'}" data-patch-action="toggle" data-id="${p.id}">${p.enabled?'Desativar':'Ativar'}</button><button class="mini danger" data-patch-action="remove" data-id="${p.id}">Remover</button></div></article>`).join('')}
function renderActivity(){$('activityList').innerHTML=activity.length?activity.map(x=>`<article class="timeline-item"><strong>${esc(actionNames[x.action]||x.action)}</strong><div class="meta"><span>${fmtDate(x.created_at)}</span><span>${esc(x.admin_email||'')}</span></div>${x.details&&Object.keys(x.details).length?`<div class="keyline">${esc(JSON.stringify(x.details))}</div>`:''}</article>`).join(''):'<div class="empty">Nenhuma atividade.</div>'}

async function showPanel(name){
  activePanel=name;document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));$(`${name}Panel`).classList.remove('hidden');document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));$('pageTitle').textContent=panelTitles[name]||name
  $('notificationPanel').classList.add('hidden')
  if(name==='patches')await loadPatches();if(name==='activity')await loadActivity();if(name==='clients')await loadClients();if(name==='resellers')await loadResellers();if(name==='renewals'){await Promise.all([loadLicenses(),loadClients()]);renderRenewals()}if(name==='overview')await Promise.all([loadOverview(),loadPatchSummary()]);if(name==='keys')await loadLicenses()
}

document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>showPanel(t.dataset.panel)))
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)showPanel(g.dataset.go)})
$('refreshButton').addEventListener('click',async()=>{try{if(activePanel==='patches')await loadPatches();else if(activePanel==='activity')await loadActivity();else if(activePanel==='resellers'){const id=resellerDetail?.reseller?.id;await loadResellers();if(id)await loadResellerDetail(id)}else await refreshCore();showFlash('Atualizado.')}catch(e){showFlash(e.message)}})
$('notificationButton').addEventListener('click',e=>{e.stopPropagation();$('notificationPanel').classList.toggle('hidden')})
$('notificationClose').addEventListener('click',()=> $('notificationPanel').classList.add('hidden'))
document.addEventListener('click',e=>{if(!$('notificationPanel').classList.contains('hidden')&&!e.target.closest('.notification-wrap'))$('notificationPanel').classList.add('hidden')})

$('resellerSearch').addEventListener('input',renderResellers)
$('newResellerButton').addEventListener('click',()=>{fillResellerForm();openModal('resellerModal')})
$('resellerStoreName').addEventListener('input',()=>{if(!$('resellerId').value&&!$('resellerSlug').dataset.touched)$('resellerSlug').value=resellerSlug($('resellerStoreName').value)})
$('resellerSlug').addEventListener('input',()=>{$('resellerSlug').dataset.touched='1'})
$('resellerForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('resellerId').value,btn=$('saveResellerButton');btn.disabled=true;try{const payload={action:id?'update_reseller':'create_reseller',store_name:$('resellerStoreName').value,owner_name:$('resellerOwnerName').value,email:$('resellerEmail').value,whatsapp:$('resellerWhatsapp').value,phone:$('resellerWhatsapp').value,slug:$('resellerSlug').value||resellerSlug($('resellerStoreName').value),pix_copy_paste:$('resellerPix').value,notes:$('resellerNotes').value,permissions:{overview:$('resellerPermOverview').checked,keys:$('resellerPermKeys').checked,clients:$('resellerPermClients').checked,revenue:$('resellerPermRevenue').checked}};if(id)payload.reseller_id=id;const d=await resellerApi(payload);closeModals();await loadResellers();if(id&&resellerDetail?.reseller?.id===id)await loadResellerDetail(id);else if(!id&&d.reseller?.id){$('resellerListView').classList.add('hidden');$('resellerDetailView').classList.remove('hidden');await loadResellerDetail(d.reseller.id)}if(id)showFlash('Revendedor atualizado.');else if(d.access?.ok)handleAccessDelivery(d.access);else if(d.access?.error)showFlash('Revendedor criado, mas não foi possível preparar o acesso: '+(d.access.detail||d.access.error));else showFlash('Revendedor criado.')}catch(err){showFlash(err.message)}finally{btn.disabled=false;btn.textContent=id?'Salvar alterações':'Criar revendedor'}})
$('resellerList').addEventListener('click',async e=>{const b=e.target.closest('[data-reseller-action]');if(!b)return;const r=resellers.find(x=>x.id===b.dataset.id);if(!r)return;try{if(b.dataset.resellerAction==='open'){$('resellerListView').classList.add('hidden');$('resellerDetailView').classList.remove('hidden');resellerSubTab='overview';await loadResellerDetail(r.id);return}if(b.dataset.resellerAction==='edit'){fillResellerForm(r);openModal('resellerModal');return}if(b.dataset.resellerAction==='access'){const d=await resellerApi({action:'send_access',reseller_id:r.id});await loadResellers();handleAccessDelivery(d);return}if(b.dataset.resellerAction==='status'){if(r.enabled&&!confirm(`Desativar o revendedor ${r.store_name}?`))return;await resellerApi({action:'set_reseller_status',reseller_id:r.id,enabled:!r.enabled});await loadResellers();showFlash(r.enabled?'Revendedor desativado.':'Revendedor ativado.')}}catch(err){showFlash(err.message)}})
$('backToResellers').addEventListener('click',()=>{$('resellerDetailView').classList.add('hidden');$('resellerListView').classList.remove('hidden');resellerDetail=null;renderResellers()})
$('editResellerButton').addEventListener('click',()=>{if(resellerDetail?.reseller){fillResellerForm(resellerDetail.reseller);openModal('resellerModal')}})
$('openResellerPanelButton').addEventListener('click',()=>window.open(RESELLER_PANEL_URL,'_blank'))
$('sendResellerAccessButton').addEventListener('click',async()=>{const r=resellerDetail?.reseller;if(!r)return;try{const d=await resellerApi({action:'send_access',reseller_id:r.id});await Promise.all([loadResellers(),loadResellerDetail(r.id)]);handleAccessDelivery(d)}catch(err){showFlash(err.message)}})
$('copyAccessLink').addEventListener('click',()=>copyText($('accessLinkValue').value,'Link de acesso copiado.'))
$('toggleResellerButton').addEventListener('click',async()=>{const r=resellerDetail?.reseller;if(!r)return;if(r.enabled&&!confirm(`Desativar o revendedor ${r.store_name}?`))return;try{await resellerApi({action:'set_reseller_status',reseller_id:r.id,enabled:!r.enabled});await Promise.all([loadResellers(),loadResellerDetail(r.id)]);showFlash(r.enabled?'Revendedor desativado.':'Revendedor ativado.')}catch(err){showFlash(err.message)}})
document.querySelectorAll('[data-reseller-subtab]').forEach(b=>b.addEventListener('click',()=>switchResellerSubtab(b.dataset.resellerSubtab)))
$('resellerKeySearch').addEventListener('input',renderResellerKeys);$('resellerClientSearch').addEventListener('input',renderResellerClients)
$('resellerKeyList').addEventListener('click',async e=>{const b=e.target.closest('[data-reseller-key-action]');if(!b||!resellerDetail)return;const l=(resellerDetail.licenses||[]).find(x=>x.id===b.dataset.id);if(!l)return;try{if(b.dataset.resellerKeyAction==='copy'){if(l.license_key)await copyText(l.license_key,'Key copiada.');else showFlash('A key completa não está registrada ainda.');return}if(b.dataset.resellerKeyAction==='toggle'){const enable=l.status==='revoked';await resellerApi({action:'set_license_status',reseller_id:resellerDetail.reseller.id,license_id:l.id,enabled:enable});await Promise.all([loadResellers(),loadResellerDetail(resellerDetail.reseller.id)]);showFlash(enable?'Key ativada.':'Key desativada.')}}catch(err){showFlash(err.message)}})
$('resellerClientList').addEventListener('click',e=>{const b=e.target.closest('[data-reseller-client-action]');if(!b)return;if(b.dataset.resellerClientAction==='whatsapp'){const d=phoneDigits(b.dataset.phone||'');if(d)window.open(`https://wa.me/${d}`,'_blank')}})

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;$('loginError').textContent='';const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('loginButton').disabled=false;if(error){$('loginError').textContent='E-mail ou senha inválidos.';return}await boot()})
$('logoutButton').addEventListener('click',async()=>{await supabase.auth.signOut();location.reload()})

$('copyPixButton').addEventListener('click',()=>copyText(PIX_COPY_PASTE,'PIX copiado.'))
$('copyPixAfterCreate').addEventListener('click',()=>copyText(PIX_COPY_PASTE,'PIX copiado.'))
$('renewCopyPix').addEventListener('click',()=>copyText(PIX_COPY_PASTE,'PIX copiado.'))

$('keySearch').addEventListener('input',renderKeys)
document.querySelectorAll('[data-key-filter]').forEach(b=>b.addEventListener('click',()=>{keyFilter=b.dataset.keyFilter;document.querySelectorAll('[data-key-filter]').forEach(x=>x.classList.toggle('active',x===b));renderKeys()}))
$('exactSearchButton').addEventListener('click',async()=>{const key=$('keySearch').value.trim();if(!key)return showFlash('Cole a key completa no campo.');try{const d=await oldApi({action:'search',key});if(!d.found)return showFlash('Key não encontrada.');await loadLicenses();$('keySearch').value=key.trim().toUpperCase();renderKeys();showFlash('Key encontrada.')}catch(e){showFlash(e.message)}})

function syncCreatePlan(){const p=PLAN_CATALOG[$('createPlan').value]||PLAN_CATALOG['1m'];$('createDuration').value=p.duration;$('createPrice').value=String(p.price);syncCreateTotal()}
function syncCreateTotal(){const q=Math.max(1,Number($('createQuantity').value)||1),p=Math.max(0,Number($('createPrice').value)||0);$('createTotal').value=money(q*p)}
$('createPlan').addEventListener('change',syncCreatePlan);$('createQuantity').addEventListener('input',syncCreateTotal);$('createPrice').addEventListener('input',syncCreateTotal)
$('createClientSearch').addEventListener('input',e=>fillCreateClientSelect(e.target.value))
$('createClientSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();const rows=fillCreateClientSelect(e.currentTarget.value);if(rows.length>1)$('createClient').focus();else if(rows.length===1)showFlash(`Cliente selecionado: ${rows[0].name}`);else showFlash('Cliente não encontrado.')}})
$('createClientSearchButton').addEventListener('click',()=>{const rows=fillCreateClientSelect($('createClientSearch').value);if(rows.length>1)$('createClient').focus();else if(rows.length===1)showFlash(`Cliente selecionado: ${rows[0].name}`);else showFlash('Cliente não encontrado.')})
$('createKeyButton').addEventListener('click',async()=>{try{if(!clients.length)await loadClients()}catch(err){showFlash('Não foi possível carregar os clientes: '+err.message)}$('createKeyForm').reset();$('createPlan').value='1m';$('createDevices').value='1';$('createQuantity').value='1';$('createClientSearch').value='';fillClientSelects();syncCreatePlan();openModal('createKeyModal')})
$('createKeyForm').addEventListener('submit',async e=>{e.preventDefault();if(e.submitter&&e.submitter.id!=='submitCreateKey')return;const btn=$('submitCreateKey'),p=PLAN_CATALOG[$('createPlan').value]||PLAN_CATALOG['1m'];btn.disabled=true;btn.textContent='Gerando…';try{const d=await clientApi({action:'create_keys',client_id:$('createClient').value||null,plan:p.name,duration:$('createDuration').value,max_devices:Number($('createDevices').value),quantity:Number($('createQuantity').value),price_paid:$('createPrice').value,note:$('createNote').value.trim()});const keys=(d.created_keys||[]).map(x=>x.license_key);closeModals();$('keysResult').textContent=keys.join('\n');$('keysResultTitle').textContent=`${keys.length} key(s) gerada(s)`;openModal('keysResultModal');await refreshCore()}catch(err){showFlash(err.message)}finally{btn.disabled=false;btn.textContent='Gerar key(s)'}})
$('copyAllCreated').addEventListener('click',()=>copyText($('keysResult').textContent,'Keys copiadas.'))

$('selectVisible').addEventListener('change',e=>{for(const l of filteredKeys())e.target.checked?selected.add(l.id):selected.delete(l.id);renderKeys()})
$('keyList').addEventListener('change',e=>{if(e.target.classList.contains('key-select')){e.target.checked?selected.add(e.target.dataset.id):selected.delete(e.target.dataset.id);updateSelectedCount()}})
$('applyBulk').addEventListener('click',async()=>{const op=$('bulkAction').value,ids=[...selected];if(!op)return showFlash('Escolha uma ação em massa.');if(!ids.length)return showFlash('Selecione pelo menos uma key.');let payload={action:'batch',license_ids:ids,operation:op};if(op==='add7'){payload.operation='add_time';payload.seconds=604800}if(op==='add30'){payload.operation='add_time';payload.seconds=2592000}if(op==='max'){const n=Number(prompt('Novo limite de aparelhos (1-20):','1'));if(!n)return;payload.operation='set_max_devices';payload.max_devices=n}if(op==='delete'&&!confirm(`Excluir permanentemente ${ids.length} key(s)?`))return;try{await dashApi(payload);selected.clear();$('selectVisible').checked=false;await refreshCore();showFlash('Ação aplicada.')}catch(e){showFlash(e.message)}})

function exportRows(ext){const rows=filteredKeys();if(ext==='txt'){download('satanabe-keys.txt',rows.map(l=>[l.license_key||l.key_hint,clientOf(l)?.name||'',clientOf(l)?.phone||'',statusName[l.status],l.plan||'',fmtDate(l.expires_at)].join(' | ')).join('\n'),'text/plain');return}const q=v=>`"${String(v??'').replaceAll('"','""')}"`;const head=['key','cliente','whatsapp','status','plano','vence','valor','nota'];const body=rows.map(l=>[l.license_key||l.key_hint,clientOf(l)?.name,clientOf(l)?.phone,statusName[l.status],l.plan||l.duration_label,l.expires_at,l.price_paid,l.note].map(q).join(','));download('satanabe-keys.csv','\ufeff'+[head.join(','),...body].join('\n'),'text/csv')}
$('exportCsv').addEventListener('click',()=>exportRows('csv'));$('exportTxt').addEventListener('click',()=>exportRows('txt'))
$('expireRevoked').addEventListener('click',async()=>{if(!confirm('Transformar todas as revogadas em expiradas?'))return;try{const d=await oldApi({action:'expire_revoked'});await refreshCore();showFlash(`${d.expired||0} key(s) expiradas.`)}catch(e){showFlash(e.message)}})
$('deleteExpired').addEventListener('click',async()=>{if(!confirm('Excluir permanentemente todas as keys expiradas?'))return;try{const d=await oldApi({action:'delete_expired'});await refreshCore();showFlash(`${d.deleted||0} key(s) excluídas.`)}catch(e){showFlash(e.message)}})

async function getFullKey(l){if(l.license_key)return l.license_key;const raw=prompt('Esta key antiga ainda só tem o hash. Cole a key original uma vez:');if(!raw)return null;const d=await oldApi({action:'search',key:raw});if(!d.found){showFlash('Key não corresponde.');return null}await loadLicenses();return raw.trim().toUpperCase()}
function openKeyDetail(l){
  const c=clientOf(l),key=l.license_key||l.key_hint||'Key antiga',isRevoked=l.status==='revoked'
  $('keyDetailTitle').textContent=c?.name||l.plan||'Key'
  $('keyDetailBody').innerHTML=`<div class="detail-grid"><div class="detail-stat"><span>Status</span><strong><span class="badge ${l.status}">${statusName[l.status]||l.status}</span></strong></div><div class="detail-stat"><span>Plano</span><strong>${esc(l.plan||l.duration_label||'—')}</strong></div><div class="detail-stat"><span>Vencimento</span><strong>${fmtDate(l.expires_at)}</strong></div><div class="detail-stat"><span>Aparelhos</span><strong>${l.device_count||0}/${l.max_devices}</strong></div><div class="detail-stat"><span>Cliente</span><strong>${esc(c?.name||'Sem cliente')}</strong></div><div class="detail-stat"><span>Telefone</span><strong>${esc(c?.phone||'—')}</strong></div><div class="detail-stat"><span>Valor</span><strong>${l.price_paid!=null?money(l.price_paid):'—'}</strong></div><div class="detail-stat"><span>Criada em</span><strong>${fmtDay(l.created_at)}</strong></div></div><div class="keyline">${esc(key)}</div>${l.note?`<p class="muted">${esc(l.note)}</p>`:''}<div class="detail-actions"><button class="secondary" data-detail-action="copy" data-id="${l.id}">Copiar key</button><button class="secondary" data-detail-action="edit" data-id="${l.id}">Editar</button><button class="secondary" data-detail-action="devices" data-id="${l.id}">Aparelhos</button><button class="secondary" data-detail-action="reset" data-id="${l.id}">Resetar aparelhos</button><button class="success" data-detail-action="renew" data-id="${l.id}">Renovar</button>${c?.phone?`<button class="whatsapp secondary" data-detail-action="whatsapp" data-id="${l.id}">WhatsApp</button>`:''}<button class="secondary" data-detail-action="add7" data-id="${l.id}">+7 dias</button><button class="secondary" data-detail-action="add30" data-id="${l.id}">+30 dias</button><button class="${isRevoked?'success':'danger'}" data-detail-action="${isRevoked?'reactivate':'revoke'}" data-id="${l.id}">${isRevoked?'Reativar':'Desativar'}</button><button class="danger" data-detail-action="delete" data-id="${l.id}">Excluir key</button></div>`
  openModal('keyDetailModal')
}
async function performKeyAction(action,l){
  if(!l)return
  try{
    if(action==='manage')return openKeyDetail(l)
    if(action==='copy'){const key=await getFullKey(l);if(key)await copyText(key,'Key copiada.');return}
    if(action==='whatsapp'){const u=waUrl(clientOf(l),l);if(u)window.open(u,'_blank');else showFlash('Cliente sem telefone.');return}
    if(action==='edit'){fillClientSelects();$('editKeyId').value=l.id;$('editKeyTitle').textContent=clientOf(l)?.name||l.note||'Licença';$('editKeyClient').value=l.client_id||'';$('editKeyPlan').value=l.plan||'';$('editKeyPrice').value=l.price_paid??'';$('editKeyDevices').value=l.max_devices||1;$('editKeyNote').value=l.note||'';return openModal('editKeyModal')}
    if(action==='devices')return openDevices(l)
    if(action==='renew')return openRenew(l)
    if(action==='reset'){if(!confirm('Resetar todos os aparelhos desta key?'))return;await oldApi({action:'reset_devices',license_id:l.id})}
    if(action==='revoke'){if(!confirm('Desativar esta key?'))return;await oldApi({action:'revoke',license_id:l.id})}
    if(action==='reactivate')await oldApi({action:'reactivate',license_id:l.id})
    if(action==='add7')await oldApi({action:'add_time',license_id:l.id,seconds:604800})
    if(action==='add30')await oldApi({action:'add_time',license_id:l.id,seconds:2592000})
    if(action==='delete'){if(!confirm('Excluir permanentemente esta key?'))return;await dashApi({action:'batch',license_ids:[l.id],operation:'delete'});closeModals()}
    await refreshCore();showFlash('Key atualizada.')
  }catch(err){showFlash(err.message)}
}
$('keyList').addEventListener('click',e=>{const b=e.target.closest('[data-key-action]');if(!b)return;performKeyAction(b.dataset.keyAction,licenses.find(x=>x.id===b.dataset.id))})
$('keyDetailBody').addEventListener('click',e=>{const b=e.target.closest('[data-detail-action]');if(!b)return;performKeyAction(b.dataset.detailAction,licenses.find(x=>x.id===b.dataset.id))})
$('overviewAlerts').addEventListener('click',e=>{const b=e.target.closest('[data-overview-action]');if(!b)return;performKeyAction(b.dataset.overviewAction==='manage'?'manage':'whatsapp',licenses.find(x=>x.id===b.dataset.id))})

$('editKeyForm').addEventListener('submit',async e=>{e.preventDefault();try{await clientApi({action:'update_license_meta',license_id:$('editKeyId').value,client_id:$('editKeyClient').value||null,plan:$('editKeyPlan').value,price_paid:$('editKeyPrice').value,max_devices:Number($('editKeyDevices').value),note:$('editKeyNote').value});closeModals();await refreshCore();showFlash('Key atualizada.')}catch(err){showFlash(err.message)}})
async function openDevices(l){try{currentDeviceLicenseId=l.id;const d=await clientApi({action:'list_devices',license_id:l.id});$('deviceList').innerHTML=(d.devices||[]).length?(d.devices||[]).map(x=>`<div class="mini-item"><div><strong>${esc(x.label)}</strong><div class="muted">${esc(x.hash_hint)} • visto ${fmtDate(x.last_seen_at)}</div></div><button class="mini danger" data-device-remove="${x.id}">Remover</button></div>`).join(''):'<div class="muted">Nenhum aparelho vinculado.</div>';openModal('devicesModal')}catch(e){showFlash(e.message)}}
$('deviceList').addEventListener('click',async e=>{const b=e.target.closest('[data-device-remove]');if(!b||!confirm('Remover apenas este aparelho?'))return;try{await clientApi({action:'remove_device',device_id:b.dataset.deviceRemove});await loadLicenses();if(currentDeviceLicenseId){const l=licenses.find(x=>x.id===currentDeviceLicenseId);if(l)return openDevices(l)}showFlash('Aparelho removido.')}catch(err){showFlash(err.message)}})

$('clientSearch').addEventListener('input',renderClients)
$('newClientButton').addEventListener('click',()=>{$('clientForm').reset();$('clientId').value='';$('clientModalTitle').textContent='Novo cliente';openModal('clientModal')})
$('clientForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('clientId').value,payload={action:id?'update_client':'create_client',client_id:id||undefined,name:$('clientName').value.trim(),phone:$('clientPhone').value.trim()};try{await clientApi(payload);closeModals();await Promise.all([loadClients(),loadLicenses()]);showFlash('Cliente salvo.')}catch(err){showFlash(err.message)}})

function bestClientLicense(clientId){const rows=licenses.filter(l=>l.client_id===clientId).sort((a,b)=>{const sa={active:0,pending:1,expired:2,revoked:3}[a.status]??4,sb={active:0,pending:1,expired:2,revoked:3}[b.status]??4;if(sa!==sb)return sa-sb;return new Date(b.expires_at||b.created_at)-new Date(a.expires_at||a.created_at)});return rows[0]||null}
async function openClientDetail(c){
  try{const d=await clientApi({action:'client_detail',client_id:c.id});const local=licenses.filter(l=>l.client_id===c.id);$('clientDetailTitle').textContent=c.name;$('clientDetailBody').innerHTML=`<div class="detail-grid"><div class="detail-stat"><span>Keys</span><strong>${d.licenses?.length||0}</strong></div><div class="detail-stat"><span>Ativas</span><strong>${local.filter(l=>l.status==='active').length}</strong></div><div class="detail-stat"><span>Compras/renovações</span><strong>${d.transactions?.length||0}</strong></div><div class="detail-stat"><span>Total</span><strong>${money((d.transactions||[]).reduce((s,x)=>s+Number(x.amount||0),0))}</strong></div></div><h3>Keys</h3><div class="mini-list">${local.map(x=>`<div class="mini-item"><div><strong>${esc(x.plan||x.duration_label||'Licença')}</strong><div class="muted">${statusName[x.status]} • ${fmtDate(x.expires_at)} • ${esc(x.license_key||x.key_hint||'')}</div></div><div class="row-actions"><button class="mini" data-client-key-action="manage" data-id="${x.id}">Gerenciar</button><button class="mini success" data-client-key-action="renew" data-id="${x.id}">Renovar</button></div></div>`).join('')||'<div class="muted">Nenhuma.</div>'}</div><h3 style="margin-top:16px">Histórico financeiro</h3><div class="mini-list">${(d.transactions||[]).map(x=>`<div class="mini-item"><div><strong>${x.kind==='renewal'?'Renovação':'Venda'}</strong><div class="muted">${fmtDate(x.created_at)}${x.note?' • '+esc(x.note):''}</div></div><span>${money(x.amount)}</span></div>`).join('')||'<div class="muted">Nenhum registro.</div>'}</div><h3 style="margin-top:16px">Contatos</h3><div class="mini-list">${(d.contacts||[]).map(x=>`<div class="mini-item"><div><strong>${esc(x.channel||'Contato')}</strong><div class="muted">${fmtDate(x.contacted_at)}${x.note?' • '+esc(x.note):''}</div></div></div>`).join('')||'<div class="muted">Nenhum contato registrado.</div>'}</div>`;openModal('clientDetailModal')}catch(err){showFlash(err.message)}
}
$('clientDetailBody').addEventListener('click',e=>{const b=e.target.closest('[data-client-key-action]');if(!b)return;const l=licenses.find(x=>x.id===b.dataset.id);if(!l)return;if(b.dataset.clientKeyAction==='manage')openKeyDetail(l);else openRenew(l)})
$('clientList').addEventListener('click',async e=>{const b=e.target.closest('[data-client-action]');if(!b)return;const c=clients.find(x=>x.id===b.dataset.id);if(!c)return;if(b.dataset.clientAction==='whatsapp'){const d=phoneDigits(c.phone);if(d)window.open(`https://wa.me/${d}`,'_blank');return}if(b.dataset.clientAction==='edit'){$('clientId').value=c.id;$('clientName').value=c.name||'';$('clientPhone').value=c.phone||'';$('clientModalTitle').textContent=c.name;return openModal('clientModal')}if(b.dataset.clientAction==='renew'){const l=bestClientLicense(c.id);if(!l)return showFlash('Esse cliente ainda não possui key.');return openRenew(l)}if(b.dataset.clientAction==='delete'){if(!confirm(`Excluir ${c.name}? As keys não serão apagadas, apenas ficarão sem cliente.`))return;try{await clientApi({action:'delete_client',client_id:c.id});await Promise.all([loadClients(),loadLicenses()]);showFlash('Cliente excluído.')}catch(err){showFlash(err.message)}return}if(b.dataset.clientAction==='detail')return openClientDetail(c)})

function defaultRenewSeconds(l){const p=String(l?.plan||l?.duration_label||'').toLowerCase();if(p.includes('1 dia'))return'86400';if(p.includes('7 dias')||p.includes('1 semana'))return'604800';return'2592000'}
function syncRenewPrice(){const op=$('renewSeconds').selectedOptions[0];$('renewAmount').value=op?.dataset.price||''}
function openRenew(l){$('renewLicenseId').value=l.id;$('renewTitle').textContent=clientOf(l)?.name||l.plan||'Licença';$('renewSeconds').value=defaultRenewSeconds(l);syncRenewPrice();$('renewNote').value='';openModal('renewModal')}
$('renewSeconds').addEventListener('change',syncRenewPrice)
for(const b of document.querySelectorAll('[data-renew-filter]'))b.addEventListener('click',()=>{renewFilter=b.dataset.renewFilter;document.querySelectorAll('[data-renew-filter]').forEach(x=>x.classList.toggle('active',x===b));renderRenewals()})
$('renewalList').addEventListener('click',async e=>{const b=e.target.closest('[data-renew-action]');if(!b)return;const l=licenses.find(x=>x.id===b.dataset.id);if(!l)return;if(b.dataset.renewAction==='manage')return openKeyDetail(l);if(b.dataset.renewAction==='whatsapp'){const u=waUrl(clientOf(l),l);if(u)window.open(u,'_blank');return}if(b.dataset.renewAction==='contacted'){try{await clientApi({action:'mark_contacted',license_id:l.id});await loadLicenses();showFlash('Marcado como contatado.')}catch(err){showFlash(err.message)}return}if(b.dataset.renewAction==='renew')openRenew(l)})
$('renewForm').addEventListener('submit',async e=>{e.preventDefault();try{await clientApi({action:'renew',license_id:$('renewLicenseId').value,seconds:Number($('renewSeconds').value),amount:$('renewAmount').value,note:$('renewNote').value});closeModals();await refreshCore();showFlash('Renovação registrada.')}catch(err){showFlash(err.message)}})

$('notificationList').addEventListener('click',async e=>{const b=e.target.closest('[data-notification-action]');if(!b)return;const l=licenses.find(x=>x.id===b.dataset.id);if(!l)return;const ac=b.dataset.notificationAction;if(ac==='renew')return openRenew(l);if(ac==='whatsapp'){const u=waUrl(clientOf(l),l);if(u)window.open(u,'_blank');return}if(ac==='contacted'){try{await clientApi({action:'mark_contacted',license_id:l.id});await loadLicenses();showFlash('Contato registrado.')}catch(err){showFlash(err.message)}}})

$('backupButton').addEventListener('click',async()=>{try{const d=await dashApi({action:'backup'});download(`satanabe-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(d,null,2));showFlash('Backup criado.')}catch(e){showFlash(e.message)}})
$('saveTemplate').addEventListener('click',async()=>{try{await dashApi({action:'update_settings',renewal_message_template:$('renewalTemplate').value});await loadOverview();showFlash('Mensagem salva.')}catch(e){showFlash(e.message)}})

function validatePatchFile(file){if(!file)throw new Error('Selecione um .3105.');if(!file.name.toLowerCase().endsWith('.3105'))throw new Error('O arquivo deve terminar em .3105.');if(!file.size||file.size>50*1024*1024)throw new Error('Arquivo vazio ou maior que 50 MB.')}
function safeName(n){return String(n||'patch.3105').replace(/[^a-zA-Z0-9._()\- ]+/g,'-').replace(/\s+/g,' ')}
async function uploadPatch(file,folder='new'){validatePatchFile(file);const path=`admin-uploads/${folder}/${Date.now()}-${safeName(file.name)}`;const {error}=await supabase.storage.from('patches-3105').upload(path,file,{upsert:false,cacheControl:'0',contentType:'application/octet-stream'});if(error)throw new Error(`Upload falhou: ${error.message}`);return path}
$('importPatchButton').addEventListener('click',()=>{$('importPatchForm').reset();openModal('importPatchModal')})
$('importPatchForm').addEventListener('submit',async e=>{e.preventDefault();const file=$('importPatchFile').files[0],pr=$('importProgress');pr.classList.remove('hidden');let path=null;try{path=await uploadPatch(file,crypto.randomUUID());await patchApi({action:'create_patch',name:$('importPatchName').value,description:$('importPatchDescription').value,category:$('importPatchCategory').value,storage_path:path,original_filename:file.name,file_size:file.size,enabled:$('importPatchEnabled').value==='true'});closeModals();await Promise.all([loadPatches(),loadOverview()]);showFlash('Patch importado.')}catch(err){if(path)try{await supabase.storage.from('patches-3105').remove([path])}catch{}showFlash(err.message)}finally{pr.classList.add('hidden')}})
$('editPatchForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('editPatchId').value,file=$('editPatchFile').files[0],pr=$('editPatchProgress');pr.classList.remove('hidden');let path=null;try{const payload=buildPatchUpdatePayload({id,name:$('editPatchName').value,description:$('editPatchDescription').value,category:$('editPatchCategory').value,versionNote:$('editPatchVersionNote').value});path=await attachSelectedPatchFile(payload,id,file);await patchApi(payload);closeModals();await loadPatches();const atualizado=patches.find(x=>x.id===id);if(!atualizado||patchCategory(atualizado)!==payload.category){showFlash('A API não confirmou a categoria salva. Atualize o catálogo e tente novamente.');return}showFlash('Patch atualizado.')}catch(err){if(path)try{await supabase.storage.from('patches-3105').remove([path])}catch{}showFlash(err.message)}finally{pr.classList.add('hidden')}})
$('patchList').addEventListener('click',async e=>{const b=e.target.closest('[data-patch-action]');if(!b)return;const i=patches.findIndex(x=>x.id===b.dataset.id),p=patches[i];if(!p)return;try{const ac=b.dataset.patchAction;if(ac==='edit'){$('editPatchId').value=p.id;$('editPatchTitle').textContent=p.name;$('editPatchName').value=p.name;$('editPatchDescription').value=p.description||'';$('editPatchCategory').value=patchCategory(p);$('editPatchFile').value='';$('editPatchVersionNote').value='';return openModal('editPatchModal')}if(ac==='toggle'){await patchApi({action:'set_enabled',patch_id:p.id,enabled:!p.enabled})}else if(ac==='duplicate'){await patchApi({action:'duplicate',patch_id:p.id})}else if(ac==='versions'){const d=await patchApi({action:'list_versions',patch_id:p.id});$('versionsTitle').textContent=p.name;$('versionList').innerHTML=(d.versions||[]).map(v=>`<div class="mini-item"><div><strong>Versão ${v.version_number}</strong><div class="muted">${fmtDate(v.created_at)} • ${fileSize(v.file_size)} • ${esc(v.note||'')}</div><div class="patch-path">${esc(v.original_filename||v.storage_path)}</div></div><button class="mini" data-restore-version="${v.id}" data-patch="${p.id}">Restaurar</button></div>`).join('');return openModal('versionsModal')}else if(ac==='remove'){const txt=prompt(`Para remover ${p.name} do catálogo e do Storage, digite REMOVER:`);if(txt!=='REMOVER')return;await patchApi({action:'remove',patch_id:p.id,confirmation:'REMOVER'})}else if(ac==='up'||ac==='down'){const j=ac==='up'?i-1:i+1;if(j<0||j>=patches.length)return;const copy=[...patches];[copy[i],copy[j]]=[copy[j],copy[i]];await patchApi({action:'reorder',ordered_ids:copy.map(x=>x.id)})}await Promise.all([loadPatches(),loadOverview()]);showFlash('Patches atualizados.')}catch(err){showFlash(err.message)}})
$('versionList').addEventListener('click',async e=>{const b=e.target.closest('[data-restore-version]');if(!b||!confirm('Restaurar esta versão? Os estados salvos desse patch serão desligados.'))return;try{await patchApi({action:'restore_version',patch_id:b.dataset.patch,version_id:b.dataset.restoreVersion});closeModals();await loadPatches();showFlash('Versão restaurada.')}catch(err){showFlash(err.message)}})
$('enableAll').addEventListener('click',async()=>{try{await patchApi({action:'set_all_enabled',enabled:true});await loadPatches();showFlash('Todos os patches ativados.')}catch(e){showFlash(e.message)}})
$('disableAll').addEventListener('click',async()=>{if(!confirm('Desativar todos os patches?'))return;try{await patchApi({action:'set_all_enabled',enabled:false});await loadPatches();showFlash('Todos os patches desativados.')}catch(e){showFlash(e.message)}})
$('killSwitch').addEventListener('click',async()=>{const on=patchSettings?.patches_globally_enabled!==false;if(on&&!confirm('ATIVAR o kill switch? Novos downloads serão bloqueados e os estados salvos serão desligados.'))return;try{await patchApi({action:'set_global_enabled',enabled:!on});await loadPatches();showFlash(on?'Kill switch ativado.':'Kill switch desativado.')}catch(e){showFlash(e.message)}})
$('maintenanceButton').addEventListener('click',async()=>{const on=patchSettings?.maintenance_mode===true;if(!on&&!confirm('Entrar em modo manutenção e bloquear o uso dos patches?'))return;try{await patchApi({action:'set_maintenance',enabled:!on,message:$('maintenanceMessage').value});await loadPatches();showFlash(!on?'Manutenção ativada.':'Manutenção encerrada.')}catch(e){showFlash(e.message)}})
$('refreshActivity').addEventListener('click',loadActivity)

async function boot(){const s=await session();if(!s){$('loginView').classList.remove('hidden');$('appView').classList.add('hidden');return}$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');try{await refreshCore();await showPanel('overview')}catch(e){if(e.code==='forbidden'||e.code==='unauthorized'){await supabase.auth.signOut();$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('loginError').textContent='Este usuário não tem acesso.'}else showFlash(e.message)}}

boot()
