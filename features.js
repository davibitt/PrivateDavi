function renderFeatures(c,cls,lvl,p){
  let h='<div class="card"><div class="ct">Class Features</div>';
  const classFeatsNonCombat=(cls.features||[]).filter(f=>f.lvl<=lvl && !isCombatFeature(f));
  classFeatsNonCombat.forEach(f=>{
    const hasChoices=f.choices&&f.choices.length;
    const btn=hasChoices?` <button class="btn sm" onclick="event.stopPropagation();showFeatureChoices('class','${esc(f.n)}')" style="font-size:10px">⚡ Activate</button>`:"";
    h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on">${esc(f.n)} <span class="lvtag">lv ${f.lvl} ▾</span>${btn}</div><div class="od">${esc(f.desc||"(no description)")}</div></div>`;
  });
  h+='</div>';
  if(c.subclass){
    const sc=getSubclass(c.subclass);
    if(sc){
      h+=`<div class="card"><div class="ct" style="color:var(--accent)">${esc(sc.name)}</div>`;
      (sc.features||[]).filter(f=>f.lvl<=lvl && !isCombatFeature(f)).forEach(f=>{
        h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="color:var(--accent)">${esc(f.n)} <span class="lvtag">lv ${f.lvl} ▾</span></div><div class="od">${esc(f.desc||"")}</div></div>`;
      });
      h+='</div>';
    }
  }
  const race=getRace(c.race);
  if(race&&race.traits&&race.traits.length){
    const available=race.traits.filter(t=>(t.lvl||1)<=lvl && t.desc && !isCombatFeature(t));
    if(available.length){
      h+=`<div class="card"><div class="ct" style="color:var(--magic)">${esc(race.name)} Traits</div>`;
      available.forEach(t=>{
        const hasChoices=t.choices&&t.choices.length;
        const btn=hasChoices?` <button class="btn sm" onclick="event.stopPropagation();showFeatureChoices('race','${esc(t.n)}')" style="font-size:10px">⚡ Activate</button>`:"";
        h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="color:var(--magic)">${esc(t.n)} <span class="lvtag">${t.lvl&&t.lvl>1?"lv "+t.lvl+" ":""}▾</span>${btn}</div><div class="od">${esc(t.desc)}</div></div>`;
      });
      h+='</div>';
    }
  }
  if(c.subrace){
    const sr=getSubrace(c.subrace);
    if(sr){
      h+=`<div class="card"><div class="ct" style="color:var(--magic)">${esc(sr.name)} (Lineage)</div>`;
      if(sr.trait){
        h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="color:var(--magic)">Overview <span class="lvtag">▾</span></div><div class="od" style="white-space:pre-line">${esc(sr.trait)}</div></div>`;
      }
      if(sr.dmgres&&sr.dmgres.length){
        h+=`<div class="opt open"><div class="on" style="color:var(--magic)">Damage Resistance</div><div class="od">${sr.dmgres.map(esc).join(", ")}</div></div>`;
      }
      if(sr.features){
        const avail=sr.features.filter(f=>(f.lvl||1)<=lvl && f.desc && !isCombatFeature(f));
        avail.forEach(f=>{
          const hasChoices=f.choices&&f.choices.length;
          const btn=hasChoices?` <button class="btn sm" onclick="event.stopPropagation();showFeatureChoices('subrace','${esc(f.n)}')" style="font-size:10px">⚡ Activate</button>`:"";
          h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="color:var(--magic)">${esc(f.n)} <span class="lvtag">${f.lvl&&f.lvl>1?"lv "+f.lvl+" ":""}▾</span>${btn}</div><div class="od">${esc(f.desc)}</div></div>`;
        });
      }
      h+='</div>';
    }
  }

  // Feats from background and other sources
  const myFeats=getCharFeats(c);
  const bgFeat=(c.bg&&(DATA.backgrounds.find(b=>b._key===c.bg)||{}).feat)||"";
  h+=`<div class="card"><div class="ct" style="color:var(--accent2)">Feats <button class="btn sm" onclick="searchFeats()">+ Add</button></div>`;
  if(!myFeats.length){h+='<div class="muted" style="font-size:12px">No feats yet. Tap "+ Add" to choose one.</div>'}
  myFeats.forEach(fname=>{
    const cleanKey=fname.replace(/\s*\[.*?\]\s*$/,"").toLowerCase().trim();
    const fd=DATA.feats.find(f=>f._key===cleanKey||f.name.toLowerCase()===fname.toLowerCase());
    const desc=fd?fd.description:"";
    const isTough=/^tough\b/i.test(fname);
    const choiceInfo=CHOICE_FEATS.find(cf=>cf.match.test(fname));
    let badge="";
    if(isTough)badge=` <span class="tag ok">+${2*lvl} HP applied</span>`;
    else if(choiceInfo)badge=` <span class="tag magic">⚠ Action needed</span>`;
    const isFromBg=bgFeat&&fname===bgFeat;
    const rmIdx=(c.feats||[]).indexOf(fname);
    const rmBtn=(!isFromBg&&rmIdx>=0)?` <button class="btn sm" onclick="event.stopPropagation();rmFeat(${rmIdx})" style="padding:2px 8px">×</button>`:"";
    h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on">${esc(fname)}${badge}${rmBtn}<span class="tog">▾</span></div><div class="od">${esc(desc)}${choiceInfo?`<div style="margin-top:8px;padding:6px;background:var(--bg2);border-left:2px solid var(--magic);font-size:12px"><strong>What to do:</strong> ${esc(choiceInfo.what)}. Track this manually in your Notes tab.</div>`:""}</div></div>`;
  });
  h+='</div>';

  // Languages section (collected from race + subrace + class features + background + custom)
  const langs=new Set();
  (race&&race.languages||[]).forEach(l=>langs.add(l));
  if(c.subrace){const sr=getSubrace(c.subrace);(sr&&sr.languages||[]).forEach(l=>langs.add(l))}
  // Class features that grant languages
  (cls.features||[]).filter(f=>f.lvl<=lvl).forEach(f=>(f.languages||[]).forEach(l=>langs.add(l)));
  if(!c.extra_langs)c.extra_langs=[];
  const autoLangs=[...langs];
  h+=`<div class="card"><div class="ct">Languages</div>`;
  autoLangs.forEach(l=>{
    h+=`<div class="skr" style="cursor:default"><span class="skd">●</span><span style="flex:1">${esc(l)}</span></div>`;
  });
  c.extra_langs.forEach((l,i)=>{
    h+=`<div class="skr" style="cursor:default"><span class="skd">●</span><span style="flex:1">${esc(l)}</span><button class="btn sm" onclick="rmLang(${i})" style="padding:2px 8px">×</button></div>`;
  });
  h+=`<button class="btn sm" onclick="addLang()" style="margin-top:8px;width:100%">+ Add Language</button>`;
  h+='</div>';

  const bg=getBackground(c.bg);
  if(bg){
    h+=`<div class="card"><div class="ct">Background — ${esc(bg.name)}</div>`;
    if(bg.skills)h+=`<div class="opt open"><div class="on">Skills</div><div class="od">${bg.skills.map(esc).join(", ")}</div></div>`;
    if(bg.tools)h+=`<div class="opt open"><div class="on">Tools</div><div class="od">${bg.tools.map(esc).join(", ")}</div></div>`;
    if(bg.feat){
      const featKey=bg.feat.replace(/\s*\[Origin\]\s*$/i,"").toLowerCase();
      const featData=DATA.feats.find(f=>f.name.toLowerCase().replace(/\s*\[origin\]\s*$/i,"")===featKey);
      h+=`<div class="opt${featData?"":" open"}" ${featData?`onclick="this.classList.toggle('open')"`:""}><div class="on">Origin Feat: ${esc(bg.feat)}${featData?' <span class="lvtag">▾</span>':""}</div><div class="od">${featData?esc(featData.description):""}</div></div>`;
    }
    if(bg.description)h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on">${esc(bg.name)} Lore <span class="lvtag">▾</span></div><div class="od">${esc(bg.description)}</div></div>`;
    h+='</div>';
  }
  el("tab1").innerHTML=h;
}

// ======================================================================
// TAB 5: NOTES
// ======================================================================
function renderEquipment(c,cls,lvl,p){
  c.equipped_slots=c.equipped_slots||{};
  const slots=[
    {key:"head",label:"Capacete",icon:"🪖"},
    {key:"neck",label:"Colar/Amuleto",icon:"📿"},
    {key:"cloak",label:"Capa/Manto",icon:"🧥"},
    {key:"armor",label:"Armadura",icon:"🛡️"},
    {key:"gloves",label:"Luvas",icon:"🧤"},
    {key:"ring1",label:"Anel 1",icon:"💍"},
    {key:"ring2",label:"Anel 2",icon:"💍"},
    {key:"boots",label:"Botas",icon:"👢"},
    {key:"shield",label:"Mão Sec. (Escudo)",icon:"🛡"}
  ];
  let h=`<div class="card"><div class="ct">Slots Equipados</div>
    <div class="muted" style="font-size:11px;margin-bottom:8px">Toque em um slot para equipar ou trocar um item mágico do seu inventário.</div>`;
  slots.forEach(s=>{
    const equippedIdx=c.equipped_slots[s.key];
    let equippedHtml='<span class="muted" style="font-size:12px">(vazio)</span>';
    if(equippedIdx!=null){
      const mi=(c.magic_items||[])[equippedIdx];
      if(mi){
        const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);
        if(def){
          const bonus=mi.bonus?` <span class="tag accent" style="font-size:10px">+${mi.bonus}</span>`:"";
          equippedHtml=`<span style="font-weight:600">${esc(def.name)}</span>${bonus}`;
        }
      }
    }
    h+=`<div class="opt" onclick="openSlotPicker('${s.key}')" style="cursor:pointer">
      <div class="on" style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${s.icon}</span>
        <span style="flex:1">${esc(s.label)}</span>
      </div>
      <div class="od" style="display:block;font-size:12px;margin-top:4px">${equippedHtml}</div>
    </div>`;
  });
  h+='</div>';

  // Armas portadas
  const carrying=(c.magic_items||[]).map((mi,i)=>({mi,i})).filter(x=>{
    const d=MAGIC_ITEMS_DB.find(y=>y._key===x.mi.key);return d&&d.slot==="weapon"&&x.mi.carrying;
  });
  h+=`<div class="card"><div class="ct">Armas Mágicas Portando</div>
    <div class="muted" style="font-size:11px;margin-bottom:8px">Armas mágicas que você está portando aparecem automaticamente no Combat. Gerencie no Inventário.</div>`;
  if(!carrying.length){h+='<div class="muted" style="font-size:12px">Nenhuma arma mágica sendo portada.</div>';}
  else{
    carrying.forEach(({mi,i})=>{
      const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);
      const bonus=mi.bonus?` <span class="tag accent" style="font-size:10px">+${mi.bonus}</span>`:"";
      h+=`<div class="opt" onclick="openMagicItemDetail(${i})">
        <div class="on">⚔️ ${esc(def.name)}${bonus}</div>
      </div>`;
    });
  }
  h+='</div>';

  el("tab5").innerHTML=h;
}

function openSlotPicker(slotKey){
  const c=chars[currentId];c.magic_items=c.magic_items||[];c.equipped_slots=c.equipped_slots||{};
  // Itens elegíveis: do banco com slot compatível, presentes no inventário do personagem
  // ring1 e ring2 ambos aceitam itens de slot "ring"
  const acceptSlot=(slotKey==="ring1"||slotKey==="ring2")?"ring":slotKey;
  const eligible=(c.magic_items||[]).map((mi,i)=>{
    const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);
    return {mi,i,def};
  }).filter(x=>x.def && x.def.slot===acceptSlot);

  // Verifica conflitos: o item já está equipado em outro slot?
  const isEquippedElsewhere=(idx)=>{
    return Object.entries(c.equipped_slots).some(([k,v])=>v===idx && k!==slotKey);
  };

  let rows="";
  // Opção "Desequipar"
  if(c.equipped_slots[slotKey]!=null){
    rows+=`<div class="opt" onclick="unequipSlot('${slotKey}')" style="border-color:var(--danger,#c44)">
      <div class="on">✕ Desequipar slot</div>
    </div>`;
  }
  if(!eligible.length){
    rows+='<div class="muted" style="font-size:12px;padding:8px">Nenhum item compatível no inventário. Adicione itens em Inventário → Itens Mágicos.</div>';
  } else {
    eligible.forEach(({mi,i,def})=>{
      const bonus=mi.bonus?` <span class="tag accent" style="font-size:10px">+${mi.bonus}</span>`:"";
      const inUse=isEquippedElsewhere(i);
      const isCurrent=c.equipped_slots[slotKey]===i;
      const tag=isCurrent?'<span class="tag ok" style="font-size:10px">Equipado aqui</span>':(inUse?'<span class="tag" style="font-size:10px">Equipado em outro slot</span>':"");
      rows+=`<div class="opt" onclick="equipSlot('${slotKey}',${i})">
        <div class="on">${esc(def.name)}${bonus} ${tag}</div>
        <div class="od" style="display:block;font-size:11px;color:var(--text3)">${esc(def.desc.slice(0,80))}${def.desc.length>80?"…":""}</div>
      </div>`;
    });
  }
  const slotLabels={head:"Capacete",neck:"Colar/Amuleto",cloak:"Capa/Manto",armor:"Armadura",gloves:"Luvas",ring1:"Anel 1",ring2:"Anel 2",boots:"Botas",shield:"Mão Secundária"};
  openModal("Equipar: "+slotLabels[slotKey], rows, '<button class="btn" onclick="closeModal()">Fechar</button>');
}

function equipSlot(slotKey,itemIdx){
  const c=chars[currentId];c.equipped_slots=c.equipped_slots||{};
  // Remove o item de qualquer outro slot onde possa estar
  Object.keys(c.equipped_slots).forEach(k=>{if(c.equipped_slots[k]===itemIdx)delete c.equipped_slots[k];});
  c.equipped_slots[slotKey]=itemIdx;
  // Sincroniza flag .equipped do item
  const mi=(c.magic_items||[])[itemIdx];if(mi)mi.equipped=true;
  saveChars();closeModal();renderSheet();
}

function unequipSlot(slotKey){
  const c=chars[currentId];c.equipped_slots=c.equipped_slots||{};
  const idx=c.equipped_slots[slotKey];
  delete c.equipped_slots[slotKey];
  // Se o item não está em nenhum outro slot, marca como não-equipado
  if(idx!=null && !Object.values(c.equipped_slots).includes(idx)){
    const mi=(c.magic_items||[])[idx];if(mi)mi.equipped=false;
  }
  saveChars();closeModal();renderSheet();
}

function renderNotes(c){
  const notes=c.notes_list||[];
  // Migrar formato antigo (c.notes string) se existir
  if(typeof c.notes==="string" && c.notes.trim() && !notes.length){
    notes.push({id:"n"+Date.now(),title:"Note",body:c.notes,ts:Date.now()});
    c.notes_list=notes;delete c.notes;saveChars();
  }
  let h='<div class="card"><div class="ct">Notes <button class="btn sm" onclick="newNote()">+ New</button></div>';
  if(!notes.length){
    h+='<div class="muted" style="font-size:12px;padding:10px 0">No notes yet. Tap "+ New" to create one.</div>';
  } else {
    // Sort by newest first
    notes.slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).forEach(n=>{
      const preview=(n.body||"").slice(0,100).replace(/\n/g," ");
      h+=`<div class="opt" onclick="openNote('${esc(n.id)}')">
        <div class="on">${esc(n.title||"(no title)")} <span class="lvtag">${fmtDate(n.ts)}</span></div>
        <div class="od" style="display:block;font-size:12px">${esc(preview)}${n.body.length>100?"…":""}</div>
      </div>`;
    });
  }
  h+='</div>';
  el("tab6").innerHTML=h;
}
function fmtDate(ts){if(!ts)return"";const d=new Date(ts);return d.toLocaleDateString()+" "+d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
function renderCharacter(c){
  const img=c.portrait||"";
  const traits=c.char_traits||"";
  const story=c.char_story||"";
  let h=`<div class="card">
    <div class="ct">Portrait</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
      <div style="width:220px;height:220px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${img?`<img src="${esc(img)}" style="width:100%;height:100%;object-fit:cover" alt="portrait">`:`<div class="muted" style="font-size:12px;text-align:center;padding:20px">No image</div>`}
      </div>
      <div class="row" style="gap:6px">
        <button class="btn sm" onclick="document.getElementById('portrait-input').click()">📷 ${img?"Change":"Upload"} image</button>
        ${img?`<button class="btn sm danger" onclick="removePortrait()">✕ Remove</button>`:""}
      </div>
      <input type="file" id="portrait-input" accept="image/*" style="display:none" onchange="uploadPortrait(event)">
    </div>
  </div>
  <div class="card">
    <div class="ct">Traits</div>
    <textarea id="char-traits" rows="6" style="min-height:120px;width:100%" placeholder="Personality, ideals, bonds, flaws, appearance..." onblur="saveCharText()">${esc(traits)}</textarea>
  </div>
  <div class="card">
    <div class="ct">Backstory</div>
    <textarea id="char-story" rows="10" style="min-height:200px;width:100%" placeholder="Origin, past, motivations, key events..." onblur="saveCharText()">${esc(story)}</textarea>
  </div>`;
  el("tab7").innerHTML=h;
}
function uploadPortrait(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){alert("Image too large (max 3 MB).");return}
  const reader=new FileReader();
  reader.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const size=Math.min(img.width,img.height);
      const sx=(img.width-size)/2;const sy=(img.height-size)/2;
      const canvas=document.createElement("canvas");
      canvas.width=512;canvas.height=512;
      canvas.getContext("2d").drawImage(img,sx,sy,size,size,0,0,512,512);
      const dataUrl=canvas.toDataURL("image/jpeg",0.85);
      const c=chars[currentId];c.portrait=dataUrl;saveChars();renderSheet();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function removePortrait(){
  if(!confirm("Remove portrait?"))return;
  const c=chars[currentId];delete c.portrait;saveChars();renderSheet();
}
function saveCharText(){
  const c=chars[currentId];if(!c)return;
  const t=el("char-traits");const s=el("char-story");
  if(t)c.char_traits=t.value;
  if(s)c.char_story=s.value;
  saveChars();
}
function newNote(){
  const id="n"+Date.now();
  openNoteEditor({id,title:"",body:"",ts:Date.now()},true);
}
function openNote(id){
  const c=chars[currentId];const n=(c.notes_list||[]).find(x=>x.id===id);
  if(!n)return;
  const body=`<div style="font-size:11px;color:var(--text3);margin-bottom:6px">${fmtDate(n.ts)}</div>
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.5">${esc(n.body)}</div>`;
  openModal(n.title||"(no title)",body,
    `<button class="btn danger" onclick="deleteNote('${esc(id)}')">✕ Delete</button>
     <button class="btn" onclick="editNote('${esc(id)}')">✎ Edit</button>
     <button class="btn" onclick="closeModal()">Close</button>`);
}
function editNote(id){
  const c=chars[currentId];const n=(c.notes_list||[]).find(x=>x.id===id);
  if(!n)return;openNoteEditor(n,false);
}
function openNoteEditor(n,isNew){
  const body=`<div class="f"><div class="lbl">Title</div><input type="text" id="ntitle" value="${esc(n.title||"")}" placeholder="Note title"></div>
    <div class="f"><div class="lbl">Content</div><textarea id="nbody" rows="10" style="min-height:200px" placeholder="Write your note...">${esc(n.body||"")}</textarea></div>`;
  openModal(isNew?"New Note":"Edit Note",body,
    `<button class="btn" onclick="closeModal()">Cancel</button>
     <button class="btn primary" onclick="saveNoteEdit('${esc(n.id)}',${isNew?"true":"false"})">💾 Save</button>`);
  setTimeout(()=>{const t=el("ntitle");if(t)t.focus()},50);
}
function saveNoteEdit(id,isNew){
  const c=chars[currentId];c.notes_list=c.notes_list||[];
  const title=el("ntitle").value.trim();
  const body=el("nbody").value;
  if(!title && !body){closeModal();return}
  if(isNew){
    c.notes_list.push({id,title:title||"(untitled)",body,ts:Date.now()});
  } else {
    const n=c.notes_list.find(x=>x.id===id);
    if(n){n.title=title||"(untitled)";n.body=body;n.ts=Date.now()}
  }
  saveChars();closeModal();renderSheet();
}
function deleteNote(id){
  if(!confirm("Delete this note?"))return;
  const c=chars[currentId];
  c.notes_list=(c.notes_list||[]).filter(x=>x.id!==id);
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// FEATURE CHOICES (Celestial Revelation, etc)
// ======================================================================
function showFeatureChoices(src,featName){
  const c=chars[currentId];let feat=null;
  if(src==="race"){
    const race=getRace(c.race);
    feat=(race.traits||[]).find(t=>t.n===featName);
  } else if(src==="subrace"){
    const sr=getSubrace(c.subrace);
    feat=(sr.features||[]).find(t=>t.n===featName);
  } else if(src==="class"){
    const cls=getClass(c.class);
    feat=(cls.features||[]).find(t=>t.n===featName);
  } else if(src==="subclass"){
    const sc=getSubclass(c.subclass);
    feat=(sc.features||[]).find(t=>t.n===featName);
  }
  if(!feat||!feat.choices){alert("No choices to show.");return}
  let body=`<div class="muted" style="font-size:12px;margin-bottom:10px">Choose one option each time you activate this ability:</div>`;
  feat.choices.forEach(ch=>{
    body+=`<div class="opt open" style="border-color:var(--magic);margin-bottom:8px"><div class="on" style="color:var(--magic)">${esc(ch.n)}</div><div class="od" style="display:block">${esc(ch.desc)}</div></div>`;
  });
  openModal(feat.n,body,'<button class="btn" onclick="closeModal()">Close</button>');
}

// ======================================================================
// INIT (wait for DATA to load)
// ======================================================================
function boot(){
  if(typeof DATA==="undefined"||!DATA||!DATA.classes){
    document.body.innerHTML='<div style="padding:30px;color:#e04545;font-family:sans-serif"><h2>Error: data.js not loaded</h2><p>Make sure <code>data.js</code> is in the same folder as <code>app.html</code>.</p></div>';
    return;
  }
  loadChars();loadTheme();loadUnits();renderHome();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
