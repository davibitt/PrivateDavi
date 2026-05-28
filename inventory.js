const EXCLUDED_MAGIC_KEYS=new Set(["weapon-plus","ammo-plus","armor-plus","shield-plus"]);
const SELECT_RESIST_KEYS=new Set(["armor-of-resistance","ring-resistance"]);
const FIXED_MAGIC_DMGRES={"frost-brand":["Fogo"]};
const DAMAGE_TYPES=["Ácido","Concussivo","Cortante","Elétrico","Fogo","Frio","Força","Necrótico","Perfurante","Psíquico","Radiante","Trovejante","Veneno"];

function renderInventory(c,cls,lvl,p){
  const inv=c.inv||[];
  const eqSlots=c.equipped_slots||{};
  let h="";

  // === Itens Normais ===
  h+=`<div class="card"><div class="ct">Itens Normais <button class="btn sm" onclick="addNormalItem()">+ Adicionar</button></div>`;
  if(!inv.length){
    h+='<div class="muted" style="font-size:12px">Nenhum item no inventário. Toque em "+ Adicionar" para buscar armas, armaduras e escudos.</div>';
  } else {
    const groups={weapon:[],armor:[],shield:[]};
    inv.forEach(it=>{if(groups[it.cat])groups[it.cat].push(it);});
    const catLabels={weapon:"Armas",armor:"Armaduras",shield:"Escudos"};
    ["weapon","armor","shield"].forEach(cat=>{
      if(!groups[cat].length)return;
      groups[cat].sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      h+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">${catLabels[cat]}</div>`;
      groups[cat].forEach(it=>{
        const isEq=(cat==="armor"&&c.armor===it.key)||(cat==="shield"&&c.inv_shield===it.id);
        h+=`<div class="opt" onclick="openNormalItemDetail('${esc(it.id)}')">
          <div class="on" style="display:flex;align-items:center;gap:6px">
            <span style="flex:1">${esc(it.name)}${it.qty>1?` <span class="tag accent">×${it.qty}</span>`:""}</span>
            ${isEq?'<span class="tag ok" style="font-size:10px">Equipado</span>':''}
            <span class="lvtag">▸</span>
          </div>
          ${it.note?`<div class="od" style="display:block;font-size:11px">${esc(it.note.slice(0,80))}</div>`:""}
        </div>`;
      });
    });
  }
  h+='</div>';

  // === Itens Mágicos ===
  const magicItems=c.magic_items||[];
  h+=`<div class="card"><div class="ct">Itens Mágicos <button class="btn sm" onclick="addMagicItem()">+ Adicionar</button></div>`;
  const visibleMagic=magicItems
    .map((mi,i)=>({mi,i}))
    .filter(({mi})=>!EXCLUDED_MAGIC_KEYS.has(mi.key))
    .sort((a,b)=>{
      const da=MAGIC_ITEMS_DB.find(x=>x._key===a.mi.key);
      const db=MAGIC_ITEMS_DB.find(x=>x._key===b.mi.key);
      return (da?da.name:"").localeCompare(db?db.name:"");
    });
  if(!visibleMagic.length){
    h+='<div class="muted" style="font-size:12px">Nenhum item mágico. Toque em "+ Adicionar".</div>';
  } else {
    visibleMagic.forEach(({mi,i})=>{
      const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key)||{name:mi.name||"?",slot:"?",desc:""};
      const slotLabel=MAGIC_SLOT_LABELS[def.slot]||def.slot;
      const isWeapon=def.slot==="weapon";
      const bonus=mi.bonus||0;
      const equippedInSlot=Object.entries(eqSlots).find(([k,v])=>v===i);
      const dmgres=mi.dmgres||(FIXED_MAGIC_DMGRES[mi.key]||[]);
      let statusTag="";
      if(isWeapon)statusTag=mi.carrying?'<span class="tag ok" style="font-size:10px">Portando</span>':'<span class="tag" style="font-size:10px;opacity:.5">Guardada</span>';
      else if(equippedInSlot)statusTag='<span class="tag ok" style="font-size:10px">Equipado</span>';
      else statusTag='<span class="tag" style="font-size:10px;opacity:.5">Guardado</span>';
      const bonusTag=bonus?`<span class="tag accent" style="font-size:10px">+${bonus}</span>`:"";
      const resTag=dmgres.length?`<span class="tag magic" style="font-size:10px">Res: ${dmgres.join(", ")}</span>`:"";
      h+=`<div class="opt" onclick="openMagicItemDetail(${i})">
        <div class="on" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(def.name)}</span>
          ${bonusTag}${resTag}${statusTag}
        </div>
        <div class="od" style="display:block;font-size:11px;color:var(--text3)">${esc(slotLabel)}</div>
      </div>`;
    });
  }
  h+='</div>';

  // === Ver Inventário ===
  h+='<div class="card"><div class="ct">Ver Inventário</div>';
  const weapItems=(c.inv||[]).filter(x=>x.cat==="weapon").sort((a,b)=>a.name.localeCompare(b.name));
  const equipItems=(c.inv||[]).filter(x=>x.cat==="armor"||x.cat==="shield").sort((a,b)=>a.name.localeCompare(b.name));
  const otherItems=c.items||[];

  h+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">Armas</div>`;
  if(!weapItems.length){h+='<div class="muted" style="font-size:12px;padding:4px 0">Nenhuma arma no inventário.</div>';}
  else weapItems.forEach(it=>{h+=`<div class="opt"><div class="on">${esc(it.name)}${it.qty>1?` ×${it.qty}`:""}</div></div>`;});

  h+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">Equipamentos</div>`;
  if(!equipItems.length){h+='<div class="muted" style="font-size:12px;padding:4px 0">Nenhum equipamento no inventário.</div>';}
  else equipItems.forEach(it=>{h+=`<div class="opt"><div class="on">${esc(it.name)}${it.qty>1?` ×${it.qty}`:""}</div></div>`;});

  h+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">Poções e Outros <button class="btn sm" onclick="newItem()" style="margin-left:6px">+ Add</button></div>`;
  if(!otherItems.length){h+='<div class="muted" style="font-size:12px;padding:4px 0">Nenhum item. Toque em "+ Add".</div>';}
  else{
    otherItems.slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).forEach(it=>{
      const preview=(it.body||"").slice(0,60).replace(/\n/g," ");
      h+=`<div class="opt" onclick="openItem('${esc(it.id)}')">
        <div class="on">${esc(it.title||"(no title)")}${it.qty&&it.qty>1?` <span class="tag accent">×${it.qty}</span>`:""} <span class="lvtag">▸</span></div>
        ${preview?`<div class="od" style="display:block;font-size:11px">${esc(preview)}${it.body&&it.body.length>60?"…":""}</div>`:""}
      </div>`;
    });
  }
  h+='</div>';

  // Currency
  h+='<div class="card"><div class="ct">Currency</div><div class="row">';
  const coins=c.coins||{cp:0,sp:0,gp:0,pp:0};
  ["cp","sp","gp","pp"].forEach(k=>{
    h+=`<div class="f" style="flex:1"><div class="lbl">${k.toUpperCase()}</div><input type="number" id="coin-${k}" value="${coins[k]||0}" onchange="saveCoins()"></div>`;
  });
  h+='</div></div>';
  el("tab4").innerHTML=h;
}

// ======================================================================
// ITENS NORMAIS
// ======================================================================
function addNormalItem(){
  let search="";
  const catalogue=[
    ...DATA.weapons
      .filter(w=>w.damage&&w._key!=="unarmed strike"&&w._key!=="unarmed strike dc")
      .map(w=>({key:w._key,name:w.name.replace(/\s*\[.*?\]$/,"").trim(),cat:"weapon",info:`${w.type||""}, ${w.damage||""} ${w.damageType||""}`.trim()})),
    ...DATA.armor
      .filter(a=>a.type&&a._key!=="unarmored"&&a._key!=="mage armor")
      .map(a=>({key:a._key,name:a.name,cat:"armor",info:`${a.type}, CA ${a.ac}`})),
    {key:"shield",name:"Escudo",cat:"shield",info:"+2 CA"}
  ].sort((a,b)=>a.name.localeCompare(b.name));

  const renderList=()=>{
    const q=search.toLowerCase().trim();
    const filtered=catalogue.filter(x=>!q||x.name.toLowerCase().includes(q));
    const groups={weapon:[],armor:[],shield:[]};
    filtered.forEach(x=>{if(groups[x.cat])groups[x.cat].push(x);});
    const catLabels={weapon:"Armas",armor:"Armaduras",shield:"Escudos"};
    let rows="";
    ["weapon","armor","shield"].forEach(cat=>{
      if(!groups[cat].length)return;
      rows+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">${catLabels[cat]}</div>`;
      groups[cat].forEach(d=>{
        rows+=`<div class="opt" onclick="pickNormalItem('${d.key}','${d.cat}')">
          <div class="on">${esc(d.name)} <span class="muted" style="font-size:11px">${esc(d.info)}</span></div>
        </div>`;
      });
    });
    if(!rows)rows='<div class="muted" style="font-size:12px;padding:8px">Nenhum item encontrado.</div>';
    const box=document.getElementById("ni-results");if(box)box.innerHTML=rows;
  };
  const body=`<div class="f"><input type="text" id="ni-search" placeholder="Buscar por nome..." oninput="window._niSearch(this.value)" style="width:100%"></div>
    <div id="ni-results" style="max-height:340px;overflow-y:auto;margin-top:8px"></div>`;
  window._niSearch=(v)=>{search=v;renderList();};
  openModal("Adicionar Item Normal",body,'<button class="btn" onclick="closeModal()">Cancelar</button>');
  setTimeout(()=>{renderList();const inp=document.getElementById("ni-search");if(inp)inp.focus();},60);
}

function pickNormalItem(key,cat){
  const arm=cat==="armor"?getArmor(key):null;
  const weap=cat==="weapon"?getWeapon(key):null;
  const name=arm?arm.name:weap?weap.name.replace(/\s*\[.*?\]$/,"").trim():"Escudo";
  const info=arm?`${arm.type}, CA ${arm.ac}`:weap?`${weap.type||""}, ${weap.damage||""} ${weap.damageType||""}`.trim():"+2 CA";
  const body=`
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">${esc(name)}</div>
    <div style="font-size:11px;color:var(--accent2);margin-bottom:10px">${esc(info)}</div>
    <div class="f"><div class="lbl">Quantidade</div><input type="number" id="ni-qty" value="1" min="1"></div>
    <div class="f"><div class="lbl">Notas (bônus mágico, condição...)</div><input type="text" id="ni-note" placeholder="" style="width:100%"></div>`;
  openModal("Confirmar: "+name,body,
    `<button class="btn" onclick="addNormalItem()">← Voltar</button>
     <button class="btn primary" onclick="confirmAddNormalItem('${key}','${cat}')">✓ Adicionar</button>`);
}

function confirmAddNormalItem(key,cat){
  const c=chars[currentId];c.inv=c.inv||[];
  const arm=cat==="armor"?getArmor(key):null;
  const weap=cat==="weapon"?getWeapon(key):null;
  const name=arm?arm.name:weap?weap.name.replace(/\s*\[.*?\]$/,"").trim():"Escudo";
  const qty=parseInt((document.getElementById("ni-qty")||{}).value)||1;
  const note=((document.getElementById("ni-note")||{}).value||"").trim();
  c.inv.push({id:"ni"+Date.now(),key,cat,name,qty,note,ts:Date.now()});
  saveChars();closeModal();renderSheet();
}

function openNormalItemDetail(id){
  const c=chars[currentId];const it=(c.inv||[]).find(x=>x.id===id);if(!it)return;
  const arm=it.cat==="armor"?getArmor(it.key):null;
  const weap=it.cat==="weapon"?getWeapon(it.key):null;
  const info=arm?`${arm.type}, CA ${arm.ac}`:weap?`${weap.type||""}, ${weap.damage||""} ${weap.damageType||""}`.trim():"+2 CA";
  const isEq=(it.cat==="armor"&&c.armor===it.key)||(it.cat==="shield"&&c.inv_shield===it.id);
  const body=`
    <div style="font-size:11px;color:var(--accent2);margin-bottom:8px">${esc(info)}</div>
    ${it.note?`<div style="font-size:12px;margin-bottom:8px;color:var(--text2)">${esc(it.note)}</div>`:""}
    <div style="font-size:12px">Quantidade: <strong>${it.qty||1}</strong></div>
    ${isEq?'<div style="margin-top:8px"><span class="tag ok">Equipado</span></div>':""}`;
  const canEquip=(it.cat==="armor"||it.cat==="shield")&&!isEq;
  openModal(it.name,body,
    `<button class="btn danger" onclick="deleteNormalItem('${esc(id)}')">✕ Remover</button>
     ${canEquip?`<button class="btn" onclick="equipNormalFromInv('${esc(id)}')">Equipar</button>`:""}
     ${isEq?`<button class="btn" onclick="unequipNormalFromInv('${esc(id)}')">Desequipar</button>`:""}
     <button class="btn" onclick="closeModal()">Fechar</button>`);
}

function deleteNormalItem(id){
  if(!confirm("Remover este item?"))return;
  const c=chars[currentId];
  const it=(c.inv||[]).find(x=>x.id===id);
  if(it){
    if(it.cat==="armor"&&c.armor===it.key)c.armor="";
    if(it.cat==="shield"&&c.inv_shield===it.id){c.shield=false;c.inv_shield=null;}
  }
  c.inv=(c.inv||[]).filter(x=>x.id!==id);
  saveChars();closeModal();renderSheet();
}

function equipNormalFromInv(invId){
  const c=chars[currentId];const it=(c.inv||[]).find(x=>x.id===invId);if(!it)return;
  if(it.cat==="armor"){c.armor=it.key;}
  else if(it.cat==="shield"){c.shield=true;c.inv_shield=invId;}
  saveChars();closeModal();renderSheet();
}

function unequipNormalFromInv(invId){
  const c=chars[currentId];const it=(c.inv||[]).find(x=>x.id===invId);if(!it)return;
  if(it.cat==="armor")c.armor="";
  else if(it.cat==="shield"){c.shield=false;c.inv_shield=null;}
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// ITENS LIVRES (POÇÕES, ETC.)
// ======================================================================
function newItem(){
  const id="i"+Date.now();
  openItemEditor({id,title:"",qty:1,body:"",ts:Date.now()},true);
}
function openItem(id){
  const c=chars[currentId];const it=(c.items||[]).find(x=>x.id===id);
  if(!it)return;
  const body=`<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Quantidade: <strong>${it.qty||1}</strong></div>
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.5">${esc(it.body||"(sem descrição)")}</div>`;
  openModal(it.title||"(sem título)",body,
    `<button class="btn danger" onclick="deleteItem('${esc(id)}')">✕ Delete</button>
     <button class="btn" onclick="editItem('${esc(id)}')">✎ Edit</button>
     <button class="btn" onclick="closeModal()">Close</button>`);
}
function editItem(id){
  const c=chars[currentId];const it=(c.items||[]).find(x=>x.id===id);
  if(!it)return;openItemEditor(it,false);
}
function openItemEditor(it,isNew){
  const body=`<div class="f"><div class="lbl">Nome</div><input type="text" id="itemtitle" value="${esc(it.title||"")}" placeholder="ex: Poção de Cura"></div>
    <div class="f"><div class="lbl">Quantidade</div><input type="number" id="itemqty" value="${it.qty||1}" min="1"></div>
    <div class="f"><div class="lbl">Descrição / Notas</div><textarea id="itembody" rows="6" placeholder="Propriedades, peso, notas...">${esc(it.body||"")}</textarea></div>`;
  openModal(isNew?"Novo Item":"Editar Item",body,
    `<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn primary" onclick="saveItemEdit('${esc(it.id)}',${isNew?"true":"false"})">💾 Salvar</button>`);
  setTimeout(()=>{const t=el("itemtitle");if(t)t.focus()},50);
}
function saveItemEdit(id,isNew){
  const c=chars[currentId];c.items=c.items||[];
  const title=el("itemtitle").value.trim();
  const qty=parseInt(el("itemqty").value)||1;
  const body=el("itembody").value;
  if(!title){alert("Digite um nome.");return}
  if(isNew==="true"||isNew===true){
    c.items.push({id,title,qty,body,ts:Date.now()});
  } else {
    const it=c.items.find(x=>x.id===id);
    if(it){it.title=title;it.qty=qty;it.body=body;it.ts=Date.now()}
  }
  saveChars();closeModal();renderSheet();
}
function deleteItem(id){
  if(!confirm("Apagar este item?"))return;
  const c=chars[currentId];
  c.items=(c.items||[]).filter(x=>x.id!==id);
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// ITENS MÁGICOS
// ======================================================================
function addMagicItem(){
  let search="";
  const renderList=()=>{
    const q=search.toLowerCase().trim();
    const filtered=MAGIC_ITEMS_DB.filter(d=>
      !EXCLUDED_MAGIC_KEYS.has(d._key)&&
      (!q||d.name.toLowerCase().includes(q)||d.slot.toLowerCase().includes(q)||(MAGIC_SLOT_LABELS[d.slot]||"").toLowerCase().includes(q))
    );
    const groups={};
    filtered.forEach(d=>{const k=d.slot;groups[k]=groups[k]||[];groups[k].push(d);});
    // Sort items within each group alphabetically
    Object.values(groups).forEach(arr=>arr.sort((a,b)=>a.name.localeCompare(b.name)));
    let rows="";
    const slotOrder=["weapon","armor","shield","head","cloak","gloves","boots","ring","neck"];
    slotOrder.forEach(sk=>{
      if(!groups[sk])return;
      rows+=`<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;color:var(--accent2)">${esc(MAGIC_SLOT_LABELS[sk]||sk)}</div>`;
      groups[sk].forEach(d=>{
        rows+=`<div class="opt" onclick="pickMagicItem('${d._key}')">
          <div class="on">${esc(d.name)}${d.hasBonus?' <span class="tag accent" style="font-size:10px">+X</span>':""}</div>
        </div>`;
      });
    });
    if(!rows)rows='<div class="muted" style="font-size:12px;padding:8px">Nenhum item encontrado.</div>';
    const box=document.getElementById("magic-search-results");if(box)box.innerHTML=rows;
  };
  const body=`<div class="f"><input type="text" id="magic-search-input" placeholder="Buscar por nome ou slot..." oninput="window._miSearch(this.value)" style="width:100%"></div>
    <div id="magic-search-results" style="max-height:340px;overflow-y:auto;margin-top:8px"></div>`;
  window._miSearch=(v)=>{search=v;renderList();};
  openModal("Adicionar Item Mágico",body,'<button class="btn" onclick="closeModal()">Cancelar</button>');
  setTimeout(()=>{renderList();const inp=document.getElementById("magic-search-input");if(inp)inp.focus();},60);
}

function pickMagicItem(key){
  const def=MAGIC_ITEMS_DB.find(x=>x._key===key);if(!def)return;
  const isWeapon=def.slot==="weapon";
  const hasSelectResist=SELECT_RESIST_KEYS.has(key);
  const resistOpts=hasSelectResist?`<div class="f"><div class="lbl">Tipo de Resistência</div><select id="mi-resist">
    ${DAMAGE_TYPES.map(t=>`<option value="${t}">${t}</option>`).join("")}
  </select></div>`:"";
  const body=`
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">${esc(def.name)}</div>
    <div style="font-size:11px;color:var(--accent2);margin-bottom:10px">${esc(MAGIC_SLOT_LABELS[def.slot]||def.slot)}</div>
    <div style="font-size:12px;line-height:1.5;margin-bottom:12px;color:var(--text2);white-space:pre-wrap">${esc(def.desc)}</div>
    ${def.hasBonus?`<div class="f"><div class="lbl">Bônus Mágico</div><select id="mi-bonus">
      <option value="0">Nenhum</option>
      <option value="1">+1</option>
      <option value="2">+2</option>
      <option value="3">+3</option>
    </select></div>`:""}
    ${resistOpts}
    ${isWeapon?`<label class="row" style="margin-top:8px"><input type="checkbox" id="mi-carrying" checked> Portando (aparece no Combate)</label>`:`<div class="muted" style="font-size:11px;margin-top:8px">💡 Para equipar este item, vá na aba <strong>Equip</strong> depois de adicionar.</div>`}`;
  openModal("Confirmar: "+def.name,body,
    `<button class="btn" onclick="addMagicItem()">← Voltar</button>
     <button class="btn primary" onclick="confirmAddMagicItem('${key}')">✓ Adicionar</button>`);
}

function confirmAddMagicItem(key){
  const def=MAGIC_ITEMS_DB.find(x=>x._key===key);if(!def)return;
  const c=chars[currentId];c.magic_items=c.magic_items||[];
  const bonus=def.hasBonus?(parseInt((document.getElementById("mi-bonus")||{}).value)||0):0;
  const carrying=def.slot==="weapon"?!!((document.getElementById("mi-carrying")||{}).checked):false;
  const dmgres=SELECT_RESIST_KEYS.has(key)?[((document.getElementById("mi-resist")||{}).value||DAMAGE_TYPES[0])]:
    (FIXED_MAGIC_DMGRES[key]||undefined);
  const item={key,bonus,carrying,equipped:false,ts:Date.now()};
  if(dmgres)item.dmgres=dmgres;
  c.magic_items.push(item);
  saveChars();closeModal();renderSheet();
}

function openMagicItemDetail(i){
  const c=chars[currentId];const mi=(c.magic_items||[])[i];if(!mi)return;
  const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);if(!def)return;
  const isWeapon=def.slot==="weapon";
  const hasSelectResist=SELECT_RESIST_KEYS.has(mi.key);
  const slotLabel=MAGIC_SLOT_LABELS[def.slot]||def.slot;
  const equippedIn=Object.entries(c.equipped_slots||{}).filter(([k,v])=>v===i).map(([k])=>k);
  const slotLabels={head:"Capacete",neck:"Colar/Amuleto",cloak:"Capa",armor:"Armadura",gloves:"Luvas",ring1:"Anel 1",ring2:"Anel 2",boots:"Botas",shield:"Mão Sec."};
  const equippedInLabels=equippedIn.map(s=>slotLabels[s]||s).join(", ");
  const curResist=(mi.dmgres||[])[0]||DAMAGE_TYPES[0];
  const resistOpts=hasSelectResist?`<div class="f"><div class="lbl">Tipo de Resistência</div><select id="mi-edit-resist">
    ${DAMAGE_TYPES.map(t=>`<option value="${t}"${t===curResist?" selected":""}>${t}</option>`).join("")}
  </select></div>`:"";
  const body=`
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">${esc(def.name)}</div>
    <div style="font-size:11px;color:var(--accent2);margin-bottom:10px">${esc(slotLabel)}${equippedInLabels?` · <span style="color:#3dc28a">Equipado: ${esc(equippedInLabels)}</span>`:""}</div>
    <div style="font-size:12px;line-height:1.5;margin-bottom:12px;color:var(--text2);white-space:pre-wrap">${esc(def.desc)}</div>
    ${def.hasBonus?`<div class="f"><div class="lbl">Bônus Mágico</div><select id="mi-edit-bonus">
      <option value="0"${(mi.bonus||0)===0?" selected":""}>Nenhum</option>
      <option value="1"${(mi.bonus||0)===1?" selected":""}>+1</option>
      <option value="2"${(mi.bonus||0)===2?" selected":""}>+2</option>
      <option value="3"${(mi.bonus||0)===3?" selected":""}>+3</option>
    </select></div>`:""}
    ${resistOpts}
    ${isWeapon?`<label class="row" style="margin-top:8px"><input type="checkbox" id="mi-edit-carrying"${mi.carrying?" checked":""}> Portando (aparece no Combate)</label>`:`<div class="muted" style="font-size:11px;margin-top:8px">💡 Equipar/desequipar na aba <strong>Equip</strong>.</div>`}`;
  openModal(def.name,body,
    `<button class="btn danger" onclick="deleteMagicItem(${i})">✕ Remover</button>
     <button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn primary" onclick="saveMagicItemEdit(${i})">💾 Salvar</button>`);
}

function saveMagicItemEdit(i){
  const c=chars[currentId];const mi=(c.magic_items||[])[i];if(!mi)return;
  const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);if(!def)return;
  if(def.hasBonus){const sel=document.getElementById("mi-edit-bonus");if(sel)mi.bonus=parseInt(sel.value)||0;}
  if(def.slot==="weapon"){const cb=document.getElementById("mi-edit-carrying");if(cb)mi.carrying=cb.checked;}
  if(SELECT_RESIST_KEYS.has(mi.key)){const sel=document.getElementById("mi-edit-resist");if(sel)mi.dmgres=[sel.value];}
  saveChars();closeModal();renderSheet();
}

function deleteMagicItem(i){
  if(!confirm("Remover este item mágico?"))return;
  const c=chars[currentId];
  c.equipped_slots=c.equipped_slots||{};
  const newSlots={};
  Object.entries(c.equipped_slots).forEach(([k,v])=>{
    if(v===i)return;
    newSlots[k]=v>i?v-1:v;
  });
  c.equipped_slots=newSlots;
  (c.magic_items||[]).splice(i,1);
  saveChars();closeModal();renderSheet();
}

function saveCoins(){
  const c=chars[currentId];c.coins=c.coins||{};
  ["cp","sp","gp","pp"].forEach(k=>{c.coins[k]=parseInt(el("coin-"+k).value)||0});saveChars();
}
