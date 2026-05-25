function renderInventory(c,cls,lvl,p){
  const arm=getArmor(c.armor);
  // Armor
  let h=`<div class="card"><div class="ct">Armor <button class="btn sm" onclick="editArmor()">Edit</button></div>`;
  const armBonus=c.armor_mag||0;
  const armNote=c.armor_note||"";
  h+=`<div>${esc(arm?arm.name:"Unarmored")}${armBonus?` <span class="tag accent">+${armBonus}</span>`:""} · AC ${(arm?arm.ac:10)+armBonus}${arm&&arm.type?" · "+esc(arm.type):""}</div>`;
  if(armNote)h+=`<div class="muted" style="font-size:11px;margin-top:4px;white-space:pre-wrap">${esc(armNote)}</div>`;
  h+='</div>';
  // Shield
  if(c.shield){
    const shBonus=c.shield_mag||0;
    const shNote=c.shield_note||"";
    h+=`<div class="card"><div class="ct">Shield <button class="btn sm" onclick="editShield()">Edit</button></div>
      <div>Shield${shBonus?` <span class="tag accent">+${shBonus}</span>`:""} · +${2+shBonus} AC</div>
      ${shNote?`<div class="muted" style="font-size:11px;margin-top:4px;white-space:pre-wrap">${esc(shNote)}</div>`:""}
      </div>`;
  }
  // Weapons
  h+='<div class="card"><div class="ct">Weapons <button class="btn sm" onclick="addWeapon()">+ Add</button></div>';
  if(!c.weapons||!c.weapons.length){h+='<div class="muted" style="font-size:12px">No weapons. Tap + Add.</div>'}
  else{
    c.weapons.forEach((w,i)=>{
      const wd=getWeapon(w.key);
      const bonus=w.mag||0;
      const name=w.custom_name||(wd?wd.name:w.name);
      const dmg=wd?wd.damage:"";
      const dmgt=wd?(wd.damageType||""):"";
      h+=`<div class="opt" onclick="openWeaponDetails(${i})">
        <div class="on"><span style="flex:1">${esc(name)}${bonus?` <span class="tag accent">+${bonus}</span>`:""}</span> <span class="muted" style="font-size:11px">${esc(dmg)} ${esc(dmgt)}</span> <span class="lvtag">▸</span></div>
        ${w.note?`<div class="od" style="display:block;font-size:11px">${esc(w.note.slice(0,80))}${w.note.length>80?"…":""}</div>`:""}
      </div>`;
    });
  }
  h+='</div>';
  // Magic Items
  const magicItems=c.magic_items||[];
  const eqSlots=c.equipped_slots||{};
  h+=`<div class="card"><div class="ct">Itens Mágicos <button class="btn sm" onclick="addMagicItem()">+ Adicionar</button></div>`;
  if(!magicItems.length){h+='<div class="muted" style="font-size:12px">Nenhum item mágico. Toque em "+ Adicionar" para buscar no banco de dados.</div>';}
  else{
    magicItems.forEach((mi,i)=>{
      const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key)||{name:mi.name||"?",slot:"?",desc:""};
      const slotLabel=MAGIC_SLOT_LABELS[def.slot]||def.slot;
      const isWeapon=def.slot==="weapon";
      const bonus=mi.bonus||0;
      const equippedInSlot=Object.entries(eqSlots).find(([k,v])=>v===i);
      let statusTag="";
      if(isWeapon){statusTag=mi.carrying?'<span class="tag ok" style="font-size:10px">Portando</span>':'<span class="tag" style="font-size:10px;opacity:.5">Guardada</span>';}
      else if(equippedInSlot){statusTag='<span class="tag ok" style="font-size:10px">Equipado</span>';}
      else{statusTag='<span class="tag" style="font-size:10px;opacity:.5">Guardado</span>';}
      const bonusTag=bonus?`<span class="tag accent" style="font-size:10px">+${bonus}</span>`:"";
      h+=`<div class="opt" onclick="openMagicItemDetail(${i})">
        <div class="on" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(def.name)}</span>
          ${bonusTag}${statusTag}
        </div>
        <div class="od" style="display:block;font-size:11px;color:var(--text3)">${esc(slotLabel)}</div>
      </div>`;
    });
  }
  h+='</div>';

  // Free items
  const items=c.items||[];
  h+=`<div class="card"><div class="ct">Items <button class="btn sm" onclick="newItem()">+ Add</button></div>`;
  if(!items.length){h+='<div class="muted" style="font-size:12px">No items yet. Tap "+ Add" to add tools, potions, trinkets, etc.</div>'}
  else{
    items.slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).forEach(it=>{
      const preview=(it.body||"").slice(0,80).replace(/\n/g," ");
      h+=`<div class="opt" onclick="openItem('${esc(it.id)}')">
        <div class="on">${esc(it.title||"(no title)")}${it.qty&&it.qty>1?` <span class="tag accent">×${it.qty}</span>`:""} <span class="lvtag">▸</span></div>
        ${preview?`<div class="od" style="display:block;font-size:11px">${esc(preview)}${it.body.length>80?"…":""}</div>`:""}
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

function newItem(){
  const id="i"+Date.now();
  openItemEditor({id,title:"",qty:1,body:"",ts:Date.now()},true);
}
function openItem(id){
  const c=chars[currentId];const it=(c.items||[]).find(x=>x.id===id);
  if(!it)return;
  const body=`<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Quantity: <strong>${it.qty||1}</strong></div>
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.5">${esc(it.body||"(no description)")}</div>`;
  openModal(it.title||"(no title)",body,
    `<button class="btn danger" onclick="deleteItem('${esc(id)}')">✕ Delete</button>
     <button class="btn" onclick="editItem('${esc(id)}')">✎ Edit</button>
     <button class="btn" onclick="closeModal()">Close</button>`);
}
function editItem(id){
  const c=chars[currentId];const it=(c.items||[]).find(x=>x.id===id);
  if(!it)return;openItemEditor(it,false);
}
function openItemEditor(it,isNew){
  const body=`<div class="f"><div class="lbl">Name</div><input type="text" id="itemtitle" value="${esc(it.title||"")}" placeholder="e.g. Healing Potion"></div>
    <div class="f"><div class="lbl">Quantity</div><input type="number" id="itemqty" value="${it.qty||1}" min="1"></div>
    <div class="f"><div class="lbl">Description / Notes</div><textarea id="itembody" rows="6" placeholder="Properties, weight, notes...">${esc(it.body||"")}</textarea></div>`;
  openModal(isNew?"New Item":"Edit Item",body,
    `<button class="btn" onclick="closeModal()">Cancel</button>
     <button class="btn primary" onclick="saveItemEdit('${esc(it.id)}',${isNew?"true":"false"})">💾 Save</button>`);
  setTimeout(()=>{const t=el("itemtitle");if(t)t.focus()},50);
}
function saveItemEdit(id,isNew){
  const c=chars[currentId];c.items=c.items||[];
  const title=el("itemtitle").value.trim();
  const qty=parseInt(el("itemqty").value)||1;
  const body=el("itembody").value;
  if(!title){alert("Enter a name.");return}
  if(isNew){
    c.items.push({id,title,qty,body,ts:Date.now()});
  } else {
    const it=c.items.find(x=>x.id===id);
    if(it){it.title=title;it.qty=qty;it.body=body;it.ts=Date.now()}
  }
  saveChars();closeModal();renderSheet();
}
function deleteItem(id){
  if(!confirm("Delete this item?"))return;
  const c=chars[currentId];
  c.items=(c.items||[]).filter(x=>x.id!==id);
  saveChars();closeModal();renderSheet();
}
function addMagicItem(){
  let search="";
  const renderList=()=>{
    const q=search.toLowerCase().trim();
    const filtered=MAGIC_ITEMS_DB.filter(d=>!q||d.name.toLowerCase().includes(q)||d.slot.toLowerCase().includes(q)||(MAGIC_SLOT_LABELS[d.slot]||"").toLowerCase().includes(q));
    // Agrupar por slot
    const groups={};
    filtered.forEach(d=>{const k=d.slot;groups[k]=groups[k]||[];groups[k].push(d);});
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
  const body=`
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">${esc(def.name)}</div>
    <div style="font-size:11px;color:var(--accent2);margin-bottom:10px">${esc(MAGIC_SLOT_LABELS[def.slot]||def.slot)}</div>
    <div style="font-size:12px;line-height:1.5;margin-bottom:12px;color:var(--text2);white-space:pre-wrap">${esc(def.desc)}</div>
    ${def.hasBonus?`<div class="f"><div class="lbl">Bônus Mágico</div><select id="mi-bonus">
      <option value="0">Nenhum (sem bônus)</option>
      <option value="1">+1</option>
      <option value="2">+2</option>
      <option value="3">+3</option>
    </select></div>`:""}
    ${isWeapon?`<label class="row" style="margin-top:8px"><input type="checkbox" id="mi-carrying" checked> Portando (aparece no Combate)</label>`:`<div class="muted" style="font-size:11px;margin-top:8px">💡 Para equipar este item, vá na aba <strong>Equip</strong> depois de adicionar.</div>`}
  `;
  openModal("Confirmar: "+def.name,body,
    `<button class="btn" onclick="addMagicItem()">← Voltar</button>
     <button class="btn primary" onclick="confirmAddMagicItem('${key}')">✓ Adicionar</button>`);
}

function confirmAddMagicItem(key){
  const def=MAGIC_ITEMS_DB.find(x=>x._key===key);if(!def)return;
  const c=chars[currentId];c.magic_items=c.magic_items||[];
  const bonus=def.hasBonus?(parseInt((document.getElementById("mi-bonus")||{}).value)||0):0;
  const carrying=def.slot==="weapon"?!!((document.getElementById("mi-carrying")||{}).checked):false;
  c.magic_items.push({key,bonus,carrying,equipped:false,ts:Date.now()});
  saveChars();closeModal();renderSheet();
}

function openMagicItemDetail(i){
  const c=chars[currentId];const mi=(c.magic_items||[])[i];if(!mi)return;
  const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);if(!def)return;
  const isWeapon=def.slot==="weapon";
  const slotLabel=MAGIC_SLOT_LABELS[def.slot]||def.slot;
  // Verifica em quais slots o item está equipado
  const equippedIn=Object.entries(c.equipped_slots||{}).filter(([k,v])=>v===i).map(([k])=>k);
  const slotLabels={head:"Capacete",neck:"Colar/Amuleto",cloak:"Capa",armor:"Armadura",gloves:"Luvas",ring1:"Anel 1",ring2:"Anel 2",boots:"Botas",shield:"Mão Sec."};
  const equippedInLabels=equippedIn.map(s=>slotLabels[s]||s).join(", ");
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
    ${isWeapon?`<label class="row" style="margin-top:8px"><input type="checkbox" id="mi-edit-carrying"${mi.carrying?" checked":""}> Portando (aparece no Combate)</label>`:`<div class="muted" style="font-size:11px;margin-top:8px">💡 Equipar/desequipar é feito na aba <strong>Equip</strong>.</div>`}
  `;
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
  saveChars();closeModal();renderSheet();
}

function deleteMagicItem(i){
  if(!confirm("Remover este item mágico?"))return;
  const c=chars[currentId];
  // Remove de equipped_slots se estiver lá; reajusta índices nos demais slots
  c.equipped_slots=c.equipped_slots||{};
  const newSlots={};
  Object.entries(c.equipped_slots).forEach(([k,v])=>{
    if(v===i)return; // removido
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
function editArmor(){
  const c=chars[currentId];const armors=DATA.armor;
  const opts='<option value="">Unarmored</option>'+armors.map(a=>`<option value="${a._key}"${c.armor===a._key?" selected":""}>${esc(a.name)} (AC ${a.ac||10}${a.type?", "+a.type:""})</option>`).join("");
  openModal("Armor",
    `<div class="f"><div class="lbl">Armor Type</div><select id="earm">${opts}</select></div>
     <div class="f"><div class="lbl">Magical Bonus</div><select id="earmmag">
       ${[0,1,2,3].map(n=>`<option value="${n}"${(c.armor_mag||0)===n?" selected":""}>${n?"+"+n:"None"}</option>`).join("")}
     </select></div>
     <div class="f"><div class="lbl">Notes (magical properties, etc)</div><textarea id="earmnote" rows="4" placeholder="e.g. Advantage on saves vs spells, +1 to all saves...">${esc(c.armor_note||"")}</textarea></div>
     <label class="row" style="margin-top:8px"><input type="checkbox" id="eshield"${c.shield?" checked":""}> Equip Shield</label>`,
    `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveArmor()">Save</button>`);
}
function saveArmor(){
  const c=chars[currentId];
  c.armor=el("earm").value;
  c.armor_mag=parseInt(el("earmmag").value)||0;
  c.armor_note=el("earmnote").value.trim();
  c.shield=el("eshield").checked;
  if(!c.shield){c.shield_mag=0;c.shield_note=""}
  saveChars();closeModal();renderSheet();
}
function editShield(){
  const c=chars[currentId];
  openModal("Shield",
    `<div class="f"><div class="lbl">Magical Bonus</div><select id="eshmag">
       ${[0,1,2,3].map(n=>`<option value="${n}"${(c.shield_mag||0)===n?" selected":""}>${n?"+"+n:"None"}</option>`).join("")}
     </select></div>
     <div class="f"><div class="lbl">Notes</div><textarea id="eshnote" rows="4" placeholder="Magical properties...">${esc(c.shield_note||"")}</textarea></div>`,
    `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveShield()">Save</button>`);
}
function saveShield(){
  const c=chars[currentId];
  c.shield_mag=parseInt(el("eshmag").value)||0;
  c.shield_note=el("eshnote").value.trim();
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// TAB 4: FEATURES (all features from class/subclass/race/bg/feats)
// ======================================================================
