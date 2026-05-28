function renderHome(){
  const ids=Object.keys(chars);
  const list=el("charlist");
  if(!ids.length){list.innerHTML='<div class="notice muted" style="text-align:center;padding:24px">No characters yet. Create one to get started.</div>';return}
  let h="";
  ids.forEach(id=>{
    const c=chars[id];
    const cls=getClass(c.class);
    const race=getRace(c.race);
    h+=`<div class="bigcard" onclick="openSheet('${id}')">
      <div style="flex:1">
        <div class="bn">${esc(c.name)}</div>
        <div class="bd">${esc(race?race.name:c.race)} · ${esc(cls?cls.name:c.class)} · Level ${c.level}</div>
      </div>
      <div class="bl">›</div>
      <button class="btn sm danger" onclick="event.stopPropagation();deleteChar('${id}')" style="align-self:flex-start">✕</button>
    </div>`;
  });
  list.innerHTML=h;
}
function deleteChar(id){
  if(!confirm("Delete this character?"))return;
  delete chars[id];saveChars();renderHome();
}

// ======================================================================
// CHARACTER CREATION
// ======================================================================
const CREATE_STEPS=[
  {t:"Identity",f:stepIdentity},
  {t:"Class & Level",f:stepClass},
  {t:"Abilities",f:stepAbilities},
  {t:"Skills",f:stepSkills},
  {t:"Equipment",f:stepEquipment},
  {t:"Hit Points",f:stepHP},
  {t:"Review",f:stepReview}
];
function goCreate(){creationState={step:0,d:{attrs:{str:8,dex:8,con:8,int:8,wis:8,cha:8}}};show("create");renderCW()}
function cwBack(){
  // If leaving step 2 backwards and bgAsi was applied, revert it
  if(creationState.step===2||creationState.step>2){
    const d=creationState.d;
    if(d.bgAsi_applied && d.bgAsi && d.bgAsi.alloc){
      Object.keys(d.bgAsi.alloc).forEach(a=>{d.attrs[a]-=d.bgAsi.alloc[a]});
      d.bgAsi_applied=false;
    }
  }
  if(creationState.step===0){goHome();return}
  creationState.step--;renderCW();
}
function renderCW(){
  const s=CREATE_STEPS[creationState.step];
  el("cstep").textContent=(creationState.step+1)+"/"+CREATE_STEPS.length+" · "+s.t;
  el("ctitle").textContent=s.t;
  el("cbody").innerHTML=s.f();
  if(s.after)s.after();
}
function cwNext(){
  const s=CREATE_STEPS[creationState.step];
  if(s.validate && !s.validate())return;
  // Step 2 validation: ensure bgAsi is filled
  if(creationState.step===2){
    const d=creationState.d;
    const bg=getBackground(d.bg);
    const bgAbils=parseBgAsiAbilities(bg?bg.asiText:"");
    if(bgAbils.length){
      const mode=d.bgAsi&&d.bgAsi.mode;
      const alloc=d.bgAsi&&d.bgAsi.alloc||{};
      const sum=Object.values(alloc).reduce((a,b)=>a+b,0);
      if(!mode){alert("Choose how to distribute the background ASI (+2/+1 or +1/+1/+1).");return}
      if(sum<3){alert("Finish assigning your background ASI points.");return}
    }
    // Apply bgAsi to attrs (store separately so we can recalc on edit)
    d.bgAsi_applied=true;
    if(d.bgAsi&&d.bgAsi.alloc){
      Object.keys(d.bgAsi.alloc).forEach(a=>{d.attrs[a]+=d.bgAsi.alloc[a]});
    }
  }
  creationState.step++;
  if(creationState.step>=CREATE_STEPS.length){finalizeChar();return}
  renderCW();
}

// ---- Step 0: Identity (name, race, background, alignment) ----
function stepIdentity(){
  const d=creationState.d;
  const races=DATA.races.map(r=>`<option value="${r._key}"${d.race===r._key?" selected":""}>${esc(r.name)}</option>`).join("");
  const bgs=DATA.backgrounds.map(b=>`<option value="${b._key}"${d.bg===b._key?" selected":""}>${esc(b.name)}</option>`).join("");
  const aligns=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"];
  return `<div class="card">
    <div class="f"><div class="lbl">Name</div><input type="text" id="cname" value="${esc(d.name||"")}" placeholder="Character name"></div>
    <div class="f"><div class="lbl">Species</div><select id="crace" onchange="cwShowRace()"><option value="">Choose...</option>${races}</select><div id="rinfo"></div></div>
    <div id="subracewrap"></div>
    <div id="spabilwrap"></div>
    <div class="f"><div class="lbl">Background</div><select id="cbg" onchange="cwShowBg()"><option value="">Choose...</option>${bgs}</select><div id="binfo"></div></div>
    <div class="f"><div class="lbl">Alignment</div><select id="calign">${aligns.map(a=>`<option${d.align===a?" selected":""}>${a}</option>`).join("")}</select></div>
    </div><button class="btn primary full" onclick="cwI()">Next →</button>`;
}
stepIdentity.after=()=>{cwShowRace();cwShowBg()};
function cwShowRace(){
  const k=el("crace").value;const r=getRace(k);
  el("subracewrap").innerHTML="";  // reset
  el("spabilwrap").innerHTML="";
  if(!r){el("rinfo").innerHTML="";return}
  // Base race info
  let h=`<div class="notice info" style="margin-top:6px;font-size:12px"><strong>${esc(r.name)}</strong> · Speed ${r.speed_ft||30}ft${r.vision?" · "+esc(r.vision):""}`;
  if(r.trait)h+=`<div style="margin-top:4px;white-space:pre-line;color:var(--text2)">${esc(r.trait)}</div>`;
  h+='</div>';
  el("rinfo").innerHTML=h;
  // Subrace selector if race has variants
  const subs=getSubracesOf(k);
  if(subs.length){
    const d=creationState.d;
    const curSub=d.subrace&&d.subrace.startsWith(k+"-")?d.subrace:"";
    let opts='<option value="">Choose a lineage/subrace...</option>';
    subs.forEach(s=>{opts+=`<option value="${s._key}"${curSub===s._key?" selected":""}>${esc(s.name)}</option>`});
    el("subracewrap").innerHTML=`<div class="f"><div class="lbl">Lineage / Subrace</div><select id="csubrace" onchange="cwShowSubrace()">${opts}</select><div id="srinfo"></div></div>`;
    if(curSub)cwShowSubrace();
  }
  // Spellcasting ability for racial spells (if any)
  cwMaybeShowSpellAbil();
}

function cwShowSubrace(){
  const k=el("csubrace").value;const sr=getSubrace(k);
  if(!sr){el("srinfo").innerHTML="";cwMaybeShowSpellAbil();return}
  let h=`<div class="notice info" style="margin-top:6px;font-size:12px"><strong>${esc(sr.name)}</strong>`;
  if(sr.trait)h+=`<div style="margin-top:4px;white-space:pre-line;color:var(--text2)">${esc(sr.trait)}</div>`;
  if(sr.dmgres&&sr.dmgres.length)h+=`<div style="margin-top:3px"><strong>Resistance:</strong> ${sr.dmgres.map(esc).join(", ")}</div>`;
  h+='</div>';
  el("srinfo").innerHTML=h;
  cwMaybeShowSpellAbil();
}

function cwMaybeShowSpellAbil(){
  // Show ability picker if race or subrace grants spells that need casting ability
  const raceKey=el("crace")?el("crace").value:"";
  const subKey=el("csubrace")?el("csubrace").value:"";
  const r=getRace(raceKey);const sr=getSubrace(subKey);
  const hasGrants=(r&&r.grants_spells&&r.grants_spells.length)||(sr&&sr.grants_spells&&sr.grants_spells.length);
  if(!hasGrants){el("spabilwrap").innerHTML="";return}
  const d=creationState.d;
  const cur=d.racial_spell_ability||"cha";
  el("spabilwrap").innerHTML=`<div class="f"><div class="lbl">Racial Spellcasting Ability</div>
    <select id="cspabil">
      <option value="int"${cur==="int"?" selected":""}>Intelligence</option>
      <option value="wis"${cur==="wis"?" selected":""}>Wisdom</option>
      <option value="cha"${cur==="cha"?" selected":""}>Charisma</option>
    </select>
    <div class="muted" style="font-size:11px;margin-top:3px">Used for racial cantrips/spells</div></div>`;
}
function cwShowBg(){
  const k=el("cbg").value;const b=getBackground(k);
  if(!b){el("binfo").innerHTML="";return}
  let h=`<div class="notice info" style="margin-top:6px;font-size:12px"><strong>${esc(b.name)}</strong>`;
  if(b.skills)h+=`<div><strong>Skills:</strong> ${b.skills.map(esc).join(", ")}</div>`;
  if(b.tools)h+=`<div><strong>Tool:</strong> ${b.tools.map(esc).join(", ")}</div>`;
  if(b.feat)h+=`<div><strong>Feat:</strong> ${esc(b.feat)}</div>`;
  if(b.asiText)h+=`<div style="margin-top:3px;color:var(--text3)">${esc(b.asiText)}</div>`;
  h+='</div>';
  el("binfo").innerHTML=h;
}
function cwI(){
  const name=el("cname").value.trim();const race=el("crace").value;const bg=el("cbg").value;
  if(!name){alert("Enter a name.");return}
  if(!race){alert("Choose a species.");return}
  // Subrace: if race has variants, must choose one
  const subs=getSubracesOf(race);
  let subrace=null;
  if(subs.length){
    const sel=el("csubrace");
    if(!sel||!sel.value){alert("Choose a lineage/subrace for this species.");return}
    subrace=sel.value;
  }
  if(!bg){alert("Choose a background.");return}
  creationState.d.name=name;
  creationState.d.race=race;
  creationState.d.subrace=subrace;
  creationState.d.bg=bg;
  creationState.d.align=el("calign").value;
  // racial spellcasting ability
  const spabil=el("cspabil");
  if(spabil)creationState.d.racial_spell_ability=spabil.value;
  creationState.step++;renderCW();
}

// ---- Step 1: Class & Level ----
function stepClass(){
  const d=creationState.d;
  const classes=DATA.classes.map(c=>`<option value="${c._key}"${d.class===c._key?" selected":""}>${esc(c.name)}</option>`).join("");
  let lvls="";for(let i=1;i<=20;i++)lvls+=`<option value="${i}"${d.level==i?" selected":""}>${i}</option>`;
  return `<div class="card">
    <div class="f"><div class="lbl">Class</div><select id="ccls" onchange="cwShowClass()"><option value="">Choose...</option>${classes}</select><div id="clsinfo"></div></div>
    <div class="f"><div class="lbl">Level</div><select id="clvl">${lvls}</select></div>
    </div><button class="btn primary full" onclick="cwC()">Next →</button>`;
}
stepClass.after=()=>cwShowClass();
function cwShowClass(){
  const k=el("ccls").value;const cl=getClass(k);
  if(!cl){el("clsinfo").innerHTML="";return}
  const caster=SPELL_CASTER_TYPE[k];
  let h=`<div class="notice info" style="margin-top:6px;font-size:12px"><strong>${esc(cl.name)}</strong> · d${cl.hd} HP · Saves: ${cl.saves.join(", ")}`;
  if(caster){h+=` · ✨ ${caster==="full"?"Full":caster==="half"?"Half":caster} caster (${ABIL_SHORT[SPELL_ABILITY[k]]})`}
  if(cl.skillsText)h+=`<div style="margin-top:3px">${esc(cl.skillsText)}</div>`;
  h+='</div>';
  el("clsinfo").innerHTML=h;
}
function cwC(){
  const cls=el("ccls").value;if(!cls){alert("Choose a class.");return}
  creationState.d.class=cls;creationState.d.level=parseInt(el("clvl").value);
  creationState.step++;renderCW();
}

// ---- Step 2: Abilities (point buy + background ASI) ----
function stepAbilities(){
  const d=creationState.d;
  const attrs=d.attrs;
  if(!d.bgAsi)d.bgAsi={};  // {mode:"2+1"|"1+1+1", alloc:{str:2,dex:1,...}}
  // Parse background ASI text to find the 3 eligible abilities
  const bg=getBackground(d.bg);
  const bgAbils=parseBgAsiAbilities(bg?bg.asiText:"");

  let used=0;ABILS.forEach(a=>used+=pbCost(attrs[a]));
  const rem=27-used;

  let boxes="";
  ABILS.forEach(a=>{
    const bgBonus=(d.bgAsi.alloc&&d.bgAsi.alloc[a])||0;
    const total=attrs[a]+bgBonus;
    boxes+=`<div class="ab"><div class="abn">${ABIL_SHORT[a]}</div>
      <div class="abctl"><button onclick="cwAbil('${a}',-1)">−</button>
      <div class="abv" id="av${a}">${attrs[a]}</div>
      <button onclick="cwAbil('${a}',1)">+</button></div>
      <div class="abm">${fmtMod(mod(attrs[a]))}</div>
      ${bgBonus?`<div style="font-size:10px;color:var(--ok);margin-top:3px">+${bgBonus} bg</div><div style="font-size:10px;color:var(--accent2);font-family:Cinzel,serif">${total} · ${fmtMod(mod(total))}</div>`:""}
      </div>`;
  });

  // ASI banner
  let bgBanner="";
  if(bg && bgAbils.length){
    const alloc=d.bgAsi.alloc||{};
    const allocSum=Object.values(alloc).reduce((a,b)=>a+b,0);
    const mode=d.bgAsi.mode||"";
    bgBanner=`<div class="notice warn" style="font-size:12px;margin-bottom:10px">
      <strong>⭐ Background ASI:</strong> ${esc(bg.name)} grants bonus to ${bgAbils.map(a=>ABIL_SHORT[a]).join(", ")}.
      <div style="margin-top:6px">Choose distribution:</div>
      <div class="row" style="gap:6px;margin-top:4px">
        <button class="btn sm" style="flex:1;${mode==="2+1"?"background:var(--accent);color:var(--bg)":""}" onclick="cwBgAsiMode('2+1')">+2 / +1</button>
        <button class="btn sm" style="flex:1;${mode==="1+1+1"?"background:var(--accent);color:var(--bg)":""}" onclick="cwBgAsiMode('1+1+1')">+1 / +1 / +1</button>
      </div>
      ${mode?`<div id="bgasi-distrib" style="margin-top:8px">${renderBgAsiDistrib(mode,bgAbils,alloc)}</div>`:""}
      ${mode?`<div class="muted" style="font-size:11px;margin-top:4px">Assigned: ${allocSum}/${mode==="2+1"?3:3}</div>`:""}
    </div>`;
  }

  return `<div class="card">
    <div class="ct">Ability Scores <span id="pbc" style="color:var(--accent2)">${rem}/27 pts</span></div>
    ${bgBanner}
    <div class="g3">${boxes}</div>
    <div style="margin-top:10px" class="row">
      <button class="btn sm" onclick="cwRoll()">🎲 Random (27 pts)</button>
      <button class="btn sm" onclick="cwReset()">↺ Reset</button>
    </div>
    <div class="muted" style="font-size:11px;margin-top:8px">Point buy (27 pts). Values 8–15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9.</div>
    </div><button class="btn primary full" onclick="cwNext()">Next →</button>`;
}
function parseBgAsiAbilities(txt){
  if(!txt)return [];
  // Expected like: "+2 and +1 -or- +1 to each from Strength, Dexterity, and Intelligence"
  const m=txt.match(/from\s+([A-Za-z,\s]+)$/i);
  if(!m)return [];
  const abs=[];
  const mapping={"strength":"str","dexterity":"dex","constitution":"con","intelligence":"int","wisdom":"wis","charisma":"cha"};
  m[1].toLowerCase().split(/[,\s]+and\s+|[,\s]+/).forEach(w=>{w=w.trim();if(mapping[w])abs.push(mapping[w])});
  return abs;
}
function cwBgAsiMode(mode){
  creationState.d.bgAsi={mode,alloc:{}};
  // re-render full step to reflect
  el("cbody").innerHTML=stepAbilities();
}
function renderBgAsiDistrib(mode,abils,alloc){
  // mode "2+1": 1 ability gets +2, 1 gets +1; can be picked via buttons
  // mode "1+1+1": each of the 3 abilities gets +1 (auto)
  if(mode==="1+1+1"){
    // auto-apply +1 to each
    const next={};abils.forEach(a=>next[a]=1);
    creationState.d.bgAsi.alloc=next;
    return `<div class="muted" style="font-size:11px">+1 applied to each: ${abils.map(a=>ABIL_SHORT[a]+" +1").join(", ")}</div>`;
  }
  // mode 2+1
  let h='<div class="row" style="gap:4px;flex-wrap:wrap"><span class="muted" style="font-size:11px;width:100%">Tap to assign:</span>';
  abils.forEach(a=>{
    const cur=alloc[a]||0;
    h+=`<button class="btn sm" style="${cur?'background:var(--accent);color:var(--bg)':''};flex:1" onclick="cwBgAsiAssign('${a}')">${ABIL_SHORT[a]} ${cur?"+"+cur:""}</button>`;
  });
  h+='</div>';
  return h;
}
function cwBgAsiAssign(a){
  const d=creationState.d;if(!d.bgAsi||d.bgAsi.mode!=="2+1")return;
  const alloc=d.bgAsi.alloc||{};
  const cur=alloc[a]||0;
  const hasTwo=Object.values(alloc).some(v=>v===2);
  const hasOne=Object.values(alloc).some(v=>v===1);
  let next;
  if(cur===0){
    if(!hasTwo)next=2;
    else if(!hasOne)next=1;
    else return;
  } else if(cur===2){
    next=hasOne?0:1;
  } else {
    next=hasTwo?0:2;
  }
  if(next)alloc[a]=next;else delete alloc[a];
  d.bgAsi.alloc=alloc;
  el("cbody").innerHTML=stepAbilities();
}
function cwAbil(a,d){
  const attrs=creationState.d.attrs;const cur=attrs[a];const nxt=cur+d;
  if(nxt<8||nxt>15)return;
  const test={...attrs,[a]:nxt};let used=0;ABILS.forEach(x=>used+=pbCost(test[x]));
  if(used>27){alert("Not enough points!");return}
  attrs[a]=nxt;
  el("cbody").innerHTML=stepAbilities();
}
function cwRoll(){
  // Distribute exactly 27 points among 6 abilities, each 8-15
  const attrs={str:8,dex:8,con:8,int:8,wis:8,cha:8};
  let rem=27,safety=500;
  while(rem>0&&safety-->0){
    const a=ABILS[Math.floor(Math.random()*6)];
    if(attrs[a]>=15)continue;
    const delta=pbCost(attrs[a]+1)-pbCost(attrs[a]);
    if(delta<=rem){attrs[a]+=1;rem-=delta}
    else{
      const any=ABILS.some(x=>attrs[x]<15&&(pbCost(attrs[x]+1)-pbCost(attrs[x]))<=rem);
      if(!any)break;
    }
  }
  creationState.d.attrs=attrs;
  el("cbody").innerHTML=stepAbilities();
}
function cwReset(){creationState.d.attrs={str:8,dex:8,con:8,int:8,wis:8,cha:8};el("cbody").innerHTML=stepAbilities()}

// ---- Step 3: Skills ----
function stepSkills(){
  const d=creationState.d;const cls=getClass(d.class);const bg=getBackground(d.bg);
  const bgSkills=bg?(bg.skills||[]):[];
  // Parse classe skills: skillstxt fala "Choose X: A, B, C, ..."
  const classSkillsInfo=parseClassSkills(cls?cls.skillsText:"");
  const numClassSkills=classSkillsInfo.choose;
  const classOpts=classSkillsInfo.options;
  if(!d.skills)d.skills=bgSkills.slice();  // background skills start auto

  let info=`<div class="notice info" style="margin-bottom:10px;font-size:12px">`;
  if(bgSkills.length)info+=`<div><strong>Background (${esc(bg.name)}):</strong> ${bgSkills.map(esc).join(", ")} <span class="muted">(auto)</span></div>`;
  info+=`<div style="margin-top:3px"><strong>Class (${esc(cls.name)}):</strong> choose ${numClassSkills} from the list</div>`;
  info+='</div>';

  let rows="";
  SKILLS.forEach(([n,a])=>{
    const isBg=bgSkills.indexOf(n)>=0;
    const isClassOpt=classOpts.length===0 || classOpts.indexOf(n)>=0;
    const checked=d.skills.indexOf(n)>=0;
    let tags="";
    if(isBg)tags+='<span class="tag ok">Bg</span>';
    else if(isClassOpt)tags+='<span class="tag info">Class</span>';
    rows+=`<label class="skr" style="${!isBg&&!isClassOpt?'opacity:.5':''}">
      <input type="checkbox" class="skck" value="${esc(n)}"${checked?" checked":""}${isBg?" disabled":""} onchange="cwSkChk()">
      <span style="flex:1">${esc(n)} <span class="muted" style="font-size:10px">(${ABIL_SHORT[a]})</span></span>
      ${tags}</label>`;
  });

  return `<div class="card"><div class="ct">Skills</div>${info}${rows}</div>
    <button class="btn primary full" onclick="cwSkDone(${numClassSkills})">Next →</button>`;
}
function parseClassSkills(text){
  if(!text)return {choose:2,options:[]};
  const m=text.match(/Choose (\d+)[:\s]+(.+)/i);
  if(!m)return {choose:2,options:[]};
  const choose=parseInt(m[1]);
  const rest=m[2].replace(/\s+or\s+/gi,",");
  const options=rest.split(/[,;]/).map(s=>s.trim()).filter(s=>s.length);
  return {choose,options};
}
function cwSkChk(){
  const d=creationState.d;const bg=getBackground(d.bg);const bgSkills=bg?(bg.skills||[]):[];
  const cls=getClass(d.class);const info=parseClassSkills(cls?cls.skillsText:"");
  // Count non-bg checked
  const checked=[...document.querySelectorAll(".skck:checked")].map(c=>c.value);
  const extra=checked.filter(s=>bgSkills.indexOf(s)<0);
  if(extra.length>info.choose){
    // uncheck last checked
    const last=[...document.querySelectorAll(".skck:checked")].filter(c=>bgSkills.indexOf(c.value)<0).pop();
    if(last)last.checked=false;
    alert("Max "+info.choose+" class skills.");
  }
}
function cwSkDone(num){
  const d=creationState.d;const bg=getBackground(d.bg);const bgSkills=bg?(bg.skills||[]):[];
  const checked=[...document.querySelectorAll(".skck:checked")].map(c=>c.value);
  bgSkills.forEach(s=>{if(checked.indexOf(s)<0)checked.push(s)});
  const classChosen=checked.filter(s=>bgSkills.indexOf(s)<0).length;
  if(classChosen<num){alert("Choose "+num+" class skill(s).");return}
  d.skills=checked;
  creationState.step++;renderCW();
}

// ---- Step 4: Equipment (basic starting) ----
function stepEquipment(){
  const d=creationState.d;const cls=getClass(d.class);
  const weapons=DATA.weapons.filter(w=>w._key!=="unarmed strike"&&w._key!=="unarmed strike dc").map(w=>w);
  // Filter armor by class proficiency (approximation: use cls.features description or simply allow all for now)
  const armors=DATA.armor.filter(a=>a.ac);
  if(!d.weapons)d.weapons=[];
  if(!d.armor)d.armor="unarmored";

  const armorOpts=armors.map(a=>`<option value="${a._key}"${d.armor===a._key?" selected":""}>${esc(a.name)} (AC ${a.ac}${a.type?", "+a.type:""})</option>`).join("");
  let h=`<div class="card">
    <div class="ct">Starting Equipment</div>
    ${cls.equipment?`<div class="notice info" style="font-size:12px;margin-bottom:10px;white-space:pre-line">${esc(cls.equipment)}</div>`:""}
    <div class="f"><div class="lbl">Armor</div><select id="carmor">${armorOpts}</select></div>
    <div class="f"><label class="row"><input type="checkbox" id="cshield"${d.shield?" checked":""}> Equip shield (+2 AC)</label></div>
    <div class="sep-dashed"></div>
    <div class="lbl" style="margin-bottom:6px">Weapons (add a few)</div>
    <div id="wpList">${d.weapons.map((w,i)=>`<div class="row" style="margin-bottom:4px"><span style="flex:1">${esc(w.name)}</span><button class="btn sm danger" onclick="cwRmWpn(${i})">✕</button></div>`).join("")}</div>
    <button class="btn sm" onclick="cwAddWpn()" style="margin-top:4px">+ Add weapon</button>
    </div>
    <button class="btn primary full" onclick="cwEq()">Next →</button>`;
  return h;
}
function cwAddWpn(){
  const weapons=DATA.weapons.filter(w=>w.damage);
  const rows=weapons.map(w=>`<div class="opt" onclick="cwPickWpn('${w._key}')"><div class="on">${esc(w.name)} <span class="lvtag">${w.damage} ${esc(w.damageType||"")}${w.range?" · "+esc(w.range):""}</span></div></div>`).join("");
  openModal("Choose Weapon",rows,'<button class="btn" onclick="closeModal()">Cancel</button>');
}
function cwPickWpn(k){
  const w=getWeapon(k);creationState.d.weapons.push({key:k,name:w.name});
  closeModal();el("cbody").innerHTML=stepEquipment();
}
function cwRmWpn(i){creationState.d.weapons.splice(i,1);el("cbody").innerHTML=stepEquipment()}
function cwEq(){
  creationState.d.armor=el("carmor").value;
  creationState.d.shield=el("cshield").checked;
  creationState.step++;renderCW();
}

// ---- Step 5: HP ----
function stepHP(){
  const d=creationState.d;const cls=getClass(d.class);const conMod=mod(d.attrs.con);
  const hd=cls.hd;
  // Default: max at lvl 1, avg+1 for subsequent levels
  const base=hd+conMod;
  const perLvl=Math.ceil(hd/2)+1+conMod;  // fixed average
  const defaultHP=base+(d.level-1)*perLvl;
  if(!d.hp_max)d.hp_max=defaultHP;
  return `<div class="card">
    <div class="ct">Hit Points</div>
    <div class="notice info" style="font-size:12px;margin-bottom:10px">
      <div>HD: d${hd} · CON mod: ${fmtMod(conMod)}</div>
      <div>Level 1: ${hd} + CON = <strong>${base}</strong></div>
      ${d.level>1?`<div>Levels 2–${d.level}: ${d.level-1}× (${perLvl}) = <strong>${(d.level-1)*perLvl}</strong></div>`:""}
      <div style="margin-top:4px">Suggested total: <strong style="color:var(--accent2)">${defaultHP}</strong></div>
    </div>
    <div class="f"><div class="lbl">Max HP</div><input type="number" id="chp" value="${d.hp_max}"></div>
    </div>
    <button class="btn primary full" onclick="cwHPDone()">Next →</button>`;
}
function cwHPDone(){
  const v=parseInt(el("chp").value);if(!v||v<1){alert("Enter a valid HP value.");return}
  creationState.d.hp_max=v;creationState.step++;renderCW();
}

// ---- Step 6: Review ----
function stepReview(){
  const d=creationState.d;const cls=getClass(d.class);const race=getRace(d.race);const bg=getBackground(d.bg);
  return `<div class="card">
    <h2 style="margin:0 0 4px 0;color:var(--accent2)">${esc(d.name)}</h2>
    <div class="muted">${esc(race.name)} · ${esc(cls.name)} ${d.level} · ${esc(bg.name)} · ${esc(d.align)}</div>
    <div class="sep"></div>
    <div class="g6" style="grid-template-columns:repeat(6,1fr);gap:4px">
      ${ABILS.map(a=>`<div class="ab"><div class="abn">${ABIL_SHORT[a]}</div><div class="abv">${d.attrs[a]}</div><div class="abm">${fmtMod(mod(d.attrs[a]))}</div></div>`).join("")}
    </div>
    <div class="sep"></div>
    <div style="font-size:13px"><strong>HP:</strong> ${d.hp_max} · <strong>Skills:</strong> ${d.skills.map(esc).join(", ")}</div>
    </div>
    <button class="btn primary full" onclick="finalizeChar()">Create Character ✓</button>`;
}
function finalizeChar(){
  const d=creationState.d;const id="c"+Date.now();
  chars[id]={
    id,name:d.name,race:d.race,subrace:d.subrace||null,class:d.class,subclass:null,level:d.level,
    bg:d.bg,align:d.align,attrs:d.attrs,skills:d.skills,
    racial_spell_ability:d.racial_spell_ability||"cha",
    hp_max:d.hp_max,hp_cur:d.hp_max,hp_tmp:0,
    armor:d.armor,shield:d.shield,weapons:d.weapons||[],
    spells:[],spell_slots_used:{},limited_used:{},racial_spell_uses:{},
    notes_list:[],subclass_choices:[],class_choices:[],extra_langs:[]
  };
  saveChars();creationState=null;openSheet(id);
}

