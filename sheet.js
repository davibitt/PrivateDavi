function openSheet(id){currentId=id;currentTab=0;combatState={action:0,bonus:0,reaction:0,actionMax:1};show("sheet");renderSheet()}
function renderSheet(){
  const c=chars[currentId];if(!c){goHome();return}
  _renderSheetInner(c);
  if(useMeters)applyUnitsToDom(el("sheet"));
}
function applyUnitsToDom(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
  nodes.forEach(node=>{
    const orig=node.nodeValue;
    if(!orig||!/\d+[ -]?(?:ft|feet|foot)\b/i.test(orig))return;
    node.nodeValue=orig.replace(/(\d+(?:\.\d+)?)[ -]?(?:ft|feet|foot)(?!\w)/gi,(m,nm)=>{
      const meters=parseFloat(nm)/5*1.5;
      return (Number.isInteger(meters)?meters:meters.toFixed(1))+" m";
    });
  });
}

function _renderSheetInner(c){
  const cls=getClass(c.class);const race=getRace(c.race);const sr=c.subrace?getSubrace(c.subrace):null;
  const lvl=c.level;const p=profBonus(lvl);
  // Compute combat stats (AC/init/passive)
  const initB=mod(c.attrs.dex);
  const passPercep=10+mod(c.attrs.wis)+((c.skills||[]).indexOf("Perception")>=0?p:0);
  const arm=getArmor(c.armor)||{ac:10};
  let ac=10+mod(c.attrs.dex);
  if(arm.ac){
    if(arm.type==="light")ac=arm.ac+mod(c.attrs.dex);
    else if(arm.type==="medium")ac=arm.ac+Math.min(2,mod(c.attrs.dex));
    else if(arm.type==="heavy")ac=arm.ac;
    else ac=arm.ac+mod(c.attrs.dex);
  }
  ac+=(c.armor_mag||0);
  if(c.shield)ac+=2+(c.shield_mag||0);
  // Magic items equipados (baseado em equipped_slots)
  const equippedSlots=c.equipped_slots||{};
  const mis=c.magic_items||[];
  Object.entries(equippedSlots).forEach(([slotKey,idx])=>{
    const mi=mis[idx];if(!mi)return;
    const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);if(!def)return;
    const b=mi.bonus||0;
    if(def.slot==="armor"){
      // Armadura mágica substitui a armadura base? Por simplicidade, soma o bônus +N do item
      ac+=b;
    } else if(def.slot==="shield"){
      // Escudo mágico: se não tem escudo base equipado, adiciona +2 base; sempre adiciona +N
      if(!c.shield)ac+=2;
      ac+=b;
    } else {
      // Outros slots: bônus de CA do item (se houver) — para itens como Anel da Proteção, Capa da Proteção etc.
      if(def.bonusAC)ac+=def.bonusAC;
    }
  });
  const raceName=sr?sr.name:race.name;
  // Header
  el("headcard").innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div style="flex:1;min-width:0">
        <div class="cin" style="font-size:16px;color:var(--accent2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</div>
        <div class="muted" style="font-size:12px">${esc(raceName)} · ${esc(cls.name)}${c.subclass?" ("+esc(getSubclass(c.subclass).name)+")":""}</div>
        <div class="muted" style="font-size:11px">${esc(getBackground(c.bg).name)} · ${esc(c.align)}</div>
      </div>
      <div class="right" style="flex-shrink:0">
        <div class="stat" style="padding:4px 8px;min-width:62px">
          <div class="row" style="gap:3px;justify-content:center;align-items:center;flex-wrap:nowrap">
            <button class="hbt" style="width:22px;height:22px;font-size:13px" onclick="changeLevel(-1)">−</button>
            <div class="sv" style="font-size:22px">${lvl}</div>
            <button class="hbt" style="width:22px;height:22px;font-size:13px" onclick="changeLevel(1)">+</button>
          </div>
          <div class="sl">Level</div>
        </div>
      </div>
    </div>

    <div class="sep"></div>

    <!-- HP Row -->
    <div class="hprow">
      <div class="hpcell hpcell-cur">
        <div class="hpcell-inner">
          <button class="hbt hbt-sm" onclick="adjHP(-1)">−</button>
          <input type="number" class="hpi" id="hpc" value="${c.hp_cur}" onchange="saveHP()">
          <button class="hbt hbt-sm" onclick="adjHP(1)">+</button>
        </div>
        <div class="hpl">Current</div>
      </div>
      <div class="hp-slash">/</div>
      <div class="hpcell hpcell-max">
        <div class="hpv">${effectiveMaxHP(c)}</div>
        <div class="hpl">Max</div>
      </div>
      <div class="hpcell hpcell-tmp">
        <input type="number" class="hpi hpi-sm" id="hptmp" value="${c.hp_tmp||""}" placeholder="0" onchange="saveHP()">
        <div class="hpl">Temp</div>
      </div>
    </div>

    <div class="sep"></div>

    <!-- Combat stats row (4 compact cells) -->
    <div class="cstats">
      <div class="cstat"><div class="csv">${ac}</div><div class="csl">AC</div></div>
      <div class="cstat"><div class="csv">${fmtMod(initB)}</div><div class="csl">Init</div></div>
      <div class="cstat"><div class="csv">${passPercep}</div><div class="csl">Passive</div></div>
      <div class="cstat"><div class="csv">+${p}</div><div class="csl">Prof</div></div>
    </div>
  `;
  // Tabs
  el("tabs").innerHTML=TABS.map((t,i)=>`<button class="tab${i===currentTab?" active":""}" onclick="switchTab(${i})">${t.n}</button>`).join("");
  // Render current tab
  TABS.forEach((t,i)=>{el("tab"+i).style.display=i===currentTab?"block":"none"});
  TABS[currentTab].f(c,cls,lvl,p);
}
function switchTab(i){currentTab=i;renderSheet()}

function saveHP(){
  const c=chars[currentId];const cv=parseInt(el("hpc").value);const tv=parseInt(el("hptmp").value)||0;
  c.hp_cur=Math.max(0,Math.min(effectiveMaxHP(c),cv));c.hp_tmp=tv;saveChars();
}
function adjHP(d){const c=chars[currentId];c.hp_cur=Math.max(0,Math.min(effectiveMaxHP(c),c.hp_cur+d));saveChars();renderSheet()}

// Returns list of feat names the character has (from background + manual feats)
function getCharFeats(c){
  const list=[];
  if(c.bg){
    const bg=DATA.backgrounds.find(b=>b._key===c.bg);
    if(bg&&bg.feat)list.push(bg.feat);
  }
  if(c.feats&&c.feats.length)c.feats.forEach(f=>list.push(f));
  return list;
}
// Check if the character has the Tough feat (auto from any source)
function hasToughFeat(c){
  return getCharFeats(c).some(f=>/^tough\b/i.test(f));
}
// Effective max HP including Tough bonus (+2 per level)
function effectiveMaxHP(c){
  let hp=c.hp_max||0;
  if(hasToughFeat(c))hp+=2*(c.level||1);
  return hp;
}
// List of feats that grant choices (player must manually configure)
const CHOICE_FEATS=[
  {match:/magic initiate/i,what:"Choose 2 cantrips and 1 level-1 spell from the listed class spell list"},
  {match:/^skilled\b/i,what:"Choose 3 skill or tool proficiencies"},
  {match:/^crafter\b/i,what:"Choose 3 Artisan's Tools to gain proficiency in"},
  {match:/^musician\b/i,what:"Choose 3 Musical Instruments to gain proficiency in"},
];
function getChoiceFeats(c){
  const r=[];
  getCharFeats(c).forEach(name=>{
    const m=CHOICE_FEATS.find(cf=>cf.match.test(name));
    if(m)r.push({name,what:m.what});
  });
  return r;
}

function changeLevel(delta){
  const c=chars[currentId];const newLvl=c.level+delta;
  if(newLvl<1||newLvl>20)return;
  const cls=getClass(c.class);
  const conMod=mod(c.attrs.con);
  const perLvl=Math.ceil(cls.hd/2)+1+conMod;
  if(delta>0){
    c.level=newLvl;
    c.hp_max+=perLvl;
    c.hp_cur+=perLvl;
    saveChars();renderSheet();
    showLevelUpSummary(newLvl);
  } else {
    if(!confirm("Level down? This will reduce your HP.")) return;
    c.level=newLvl;
    c.hp_max=Math.max(1,c.hp_max-perLvl);
    c.hp_cur=Math.min(c.hp_cur,c.hp_max);
    saveChars();renderSheet();
  }
}

function showLevelUpSummary(newLvl){
  const c=chars[currentId];const cls=getClass(c.class);
  const conMod=mod(c.attrs.con);
  const hpGain=Math.ceil(cls.hd/2)+1+conMod;
  const oldProf=profBonus(newLvl-1);const newProf=profBonus(newLvl);
  let body=`<div class="notice ok" style="margin-bottom:10px">
    <strong>Level ${newLvl} · ${esc(cls.name)}</strong>
    <div style="margin-top:4px">+${hpGain} HP (d${cls.hd} avg ${Math.ceil(cls.hd/2)+1} + CON ${fmtMod(conMod)})</div>
  </div>`;

  // Proficiency bonus increase
  if(newProf>oldProf){
    body+=`<div class="opt open"><div class="on">Proficiency Bonus +1 <span class="lvtag">now +${newProf}</span></div>
      <div class="od">All your proficient saves, skills, attacks, and spell DCs improve.</div></div>`;
  }

  // Extra attacks
  const oldAtk=(cls.attacks||[])[newLvl-2]||1;
  const newAtk=(cls.attacks||[])[newLvl-1]||1;
  if(newAtk>oldAtk){
    body+=`<div class="opt open"><div class="on">Extra Attack <span class="lvtag">${newAtk} attacks</span></div>
      <div class="od">You can attack ${newAtk} times whenever you take the Attack action.</div></div>`;
  }

  // ASI / Feat (improvements array: 0=no, 1,2,3,4,5=nth ASI opportunity)
  const oldImp=(cls.improvements||[])[newLvl-2]||0;
  const newImp=(cls.improvements||[])[newLvl-1]||0;
  if(newImp>oldImp){
    body+=`<div class="opt open" style="border-color:var(--accent)"><div class="on" style="color:var(--accent)">⭐ Ability Score Improvement / Feat</div>
      <div class="od">You can either: <br>• Increase one ability score by +2 (max 20)<br>• Increase two ability scores by +1 each<br>• Take a feat of your choice<br><br><em>Remember to apply this manually in the character sheet.</em></div></div>`;
  }

  // New class features at this level
  const newClsFeats=(cls.features||[]).filter(f=>f.lvl===newLvl && f.desc);
  newClsFeats.forEach(f=>{
    // Skip "Subclass" feature — handled separately below
    if(/Subclass/i.test(f.n))return;
    body+=`<div class="opt open"><div class="on">${esc(f.n)}</div><div class="od">${esc(f.desc)}</div></div>`;
  });

  // Subclass choice prompt
  const subFeat=(cls.features||[]).find(f=>/Subclass/i.test(f.n));
  if(subFeat && subFeat.lvl===newLvl && !c.subclass){
    body+=`<div class="opt open" style="border-color:var(--accent)"><div class="on" style="color:var(--accent)">⭐ Choose Subclass!</div>
      <div class="od">You can now choose your ${esc(cls.name)} subclass. Go to the Combat tab and tap "Choose →".</div></div>`;
  }

  // New subclass features at this level
  if(c.subclass){
    const sc=getSubclass(c.subclass);
    if(sc){
      const newScFeats=(sc.features||[]).filter(f=>f.lvl===newLvl && f.desc);
      newScFeats.forEach(f=>{
        body+=`<div class="opt open" style="border-color:var(--accent)"><div class="on" style="color:var(--accent)">${esc(f.n)} <span class="lvtag">${esc(sc.name)}</span></div><div class="od">${esc(f.desc)}</div></div>`;
      });
    }
  }

  // New spell slots (full/half casters)
  const caster=SPELL_CASTER_TYPE[c.class];
  if(caster){
    let oldSlots=[],newSlots=[];
    if(caster==="full"){oldSlots=FULL_CASTER_SLOTS[newLvl-2]||[];newSlots=FULL_CASTER_SLOTS[newLvl-1]||[]}
    else if(caster==="half"){oldSlots=HALF_CASTER_SLOTS[newLvl-2]||[];newSlots=HALF_CASTER_SLOTS[newLvl-1]||[]}
    else if(caster==="warlock"){
      const oldTotal=WARLOCK_SLOTS_COUNT[newLvl-2]||0;const newTotal=WARLOCK_SLOTS_COUNT[newLvl-1]||0;
      const oldLv=WARLOCK_SLOT_LEVEL[newLvl-2]||0;const newLv=WARLOCK_SLOT_LEVEL[newLvl-1]||0;
      if(newTotal>oldTotal || newLv>oldLv){
        body+=`<div class="opt open"><div class="on">Pact Magic <span class="lvtag">${newTotal} slot${newTotal>1?"s":""} of L${newLv}</span></div>
          <div class="od">Your pact slots are now L${newLv}. Recover on short rest.</div></div>`;
      }
    }
    if(caster==="full"||caster==="half"){
      for(let i=0;i<newSlots.length;i++){
        const o=oldSlots[i]||0;const n=newSlots[i]||0;
        if(n>o){
          body+=`<div class="opt open"><div class="on">New spell slot: Level ${i+1} <span class="lvtag">${n-o} new</span></div>
            <div class="od">You have ${n} total level-${i+1} slots now.</div></div>`;
        }
      }
    }
  }

  // Racial features that unlock at new level
  // Base race (traits with minlevel)
  const baseRace=getRace(c.race);
  if(baseRace && baseRace.traits){
    const newBaseFeats=baseRace.traits.filter(f=>f.lvl===newLvl && f.desc);
    newBaseFeats.forEach(f=>{
      body+=`<div class="opt open" style="border-color:var(--magic)"><div class="on" style="color:var(--magic)">${esc(f.n)} <span class="lvtag">${esc(baseRace.name)}</span></div><div class="od">${esc(f.desc)}</div></div>`;
    });
  }
  // Subrace/lineage features
  if(c.subrace){
    const sr=getSubrace(c.subrace);
    if(sr && sr.features){
      const newRaceFeats=sr.features.filter(f=>f.lvl===newLvl && f.desc);
      newRaceFeats.forEach(f=>{
        body+=`<div class="opt open" style="border-color:var(--magic)"><div class="on" style="color:var(--magic)">${esc(f.n)} <span class="lvtag">${esc(sr.name)}</span></div><div class="od">${esc(f.desc)}</div></div>`;
      });
    }
  }

  // Prompt to choose subclass if applies (shown separately from class features)
  // (already handled above by "Choose Subclass!" prompt)

  openModal(`Level Up! → Level ${newLvl}`,body,'<button class="btn primary" onclick="closeModal()">Awesome!</button>');
}

function shortRest(){
  const c=chars[currentId];
  // Reset warlock slots (pact magic recovers on SR)
  if(c.class==="warlock")c.spell_slots_used={};
  saveChars();renderSheet();alert("Short rest complete.");
}
function longRest(){
  const c=chars[currentId];
  c.hp_cur=effectiveMaxHP(c);c.hp_tmp=0;c.spell_slots_used={};c.limited_used={};
  combatState={action:0,bonus:0,reaction:0,actionMax:1};
  saveChars();renderSheet();alert("Long rest complete. HP, spell slots, and features restored.");
}
function goHome(){show("home");renderHome()}

// ======================================================================
// TAB 0: STATS (abilities, saves, skills)
// ======================================================================
function renderStats(c,cls,lvl,p){
  // Abilities: score, mod, and save mod inline (compact)
  let h='<div class="card"><div class="ct">Ability Scores <button class="btn sm" onclick="editAttrs()" style="font-size:10px">✎ Edit</button></div><div class="g6">';
  ABILS.forEach(a=>{
    const sc=c.attrs[a];const m=mod(sc);
    const isSave=cls.saves.map(s=>s.toLowerCase().slice(0,3)).indexOf(a.slice(0,3))>=0;
    const saveMod=m+(isSave?p:0);
    h+=`<div class="ab"><div class="abn">${ABIL_SHORT[a]}</div>
      <div class="abv">${sc}</div>
      <div class="abm">${fmtMod(m)}</div>
      <div style="font-size:9px;color:${isSave?"var(--accent)":"var(--text3)"};margin-top:3px;letter-spacing:.5px">SV ${fmtMod(saveMod)}${isSave?"●":""}</div></div>`;
  });
  h+='</div></div>';
  // Skills
  h+='<div class="card"><div class="ct">Skills <button class="btn sm" onclick="editSkills()" style="font-size:10px">✎ Edit</button></div>';
  SKILLS.forEach(([n,a])=>{
    const prof=(c.skills||[]).indexOf(n)>=0;
    const exp=(c.expertise||[]).indexOf(n)>=0;
    const bonus=mod(c.attrs[a])+(prof?(exp?p*2:p):0);
    h+=`<div class="skr"><span class="skd">${exp?"◉":prof?"●":"○"}</span>
      <span style="flex:1">${esc(n)} <span class="muted" style="font-size:10px">${ABIL_SHORT[a]}</span></span>
      <span class="skm">${fmtMod(bonus)}</span></div>`;
  });
  h+='</div>';
  el("tab0").innerHTML=h;
}

// ======================================================================
// EDIT ATTRIBUTES & SKILLS (from sheet)
// ======================================================================
function editAttrs(){
  const c=chars[currentId];
  let body='<div class="muted" style="font-size:12px;margin-bottom:8px">Adjust your ability scores directly. Use this to apply ASI, background bonuses, or fix mistakes.</div><div class="g6">';
  ABILS.forEach(a=>{
    body+=`<div class="ab"><div class="abn">${ABIL_SHORT[a]}</div>
      <input type="number" id="ea-${a}" value="${c.attrs[a]}" min="1" max="30" style="width:100%;padding:4px;font-family:Cinzel,serif;font-size:18px;text-align:center;border:1px solid var(--border);border-radius:4px;background:var(--bg2);color:var(--text)">
      </div>`;
  });
  body+='</div>';
  openModal("Edit Abilities",body,`<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveAttrs()">Save</button>`);
}
function saveAttrs(){
  const c=chars[currentId];
  ABILS.forEach(a=>{
    const v=parseInt(el("ea-"+a).value);
    if(v>=1&&v<=30)c.attrs[a]=v;
  });
  saveChars();closeModal();renderSheet();
}
function editSkills(){
  const c=chars[currentId];const current=new Set(c.skills||[]);
  let body='<div class="muted" style="font-size:12px;margin-bottom:8px">Toggle proficiency in skills.</div>';
  SKILLS.forEach(([n,a])=>{
    const checked=current.has(n);
    body+=`<label class="skr" style="cursor:pointer">
      <input type="checkbox" class="esk" value="${esc(n)}"${checked?" checked":""}>
      <span style="flex:1">${esc(n)} <span class="muted" style="font-size:10px">${ABIL_SHORT[a]}</span></span>
    </label>`;
  });
  openModal("Edit Skills",body,`<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveSkillsEdit()">Save</button>`);
}
function saveSkillsEdit(){
  const c=chars[currentId];
  c.skills=[...document.querySelectorAll(".esk:checked")].map(i=>i.value);
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// TAB 1: COMBAT (action pips, weapons, features)
// ======================================================================
// ======================================================================
// STANDARD D&D 2024 ACTIONS (for Combat tab accordion)
// ======================================================================
const STD_ACTIONS=[
  {n:"Attack",desc:"Make one weapon attack or unarmed strike (or more with Extra Attack). Tap a weapon above to roll."},
  {n:"Dash",desc:"Gain extra movement equal to your Speed for this turn."},
  {n:"Disengage",desc:"Your movement this turn doesn't provoke Opportunity Attacks."},
  {n:"Dodge",desc:"Until your next turn, attack rolls against you have Disadvantage and you have Advantage on Dex saves (if you can see the attacker and aren't Incapacitated)."},
  {n:"Grapple",desc:"Unarmed Strike (Grapple) vs a target no more than one size larger. Target makes a Str or Dex save vs your DC (8 + Str mod + Prof). On fail, target has the Grappled condition."},
  {n:"Help",desc:"Either: (a) an ally gains Advantage on their next ability check you can help with, or (b) an ally within 5 ft gains Advantage on their next attack roll vs a creature within 5 ft of you."},
  {n:"Hide",desc:"Dex (Stealth) check. You must be Heavily Obscured or have 3/4 Cover from your watchers. On success, gain the Invisible condition until you attack, make a damage roll, force a save, or make noise."},
  {n:"Influence",desc:"Interact with a creature using Deception, Intimidation, Performance, or Persuasion (vs the DM's DC)."},
  {n:"Magic",desc:"Cast a spell with a casting time of 1 Action, or use a magic feature whose action is Magic."},
  {n:"Ready",desc:"Prepare an action to trigger on a specific condition you describe before the start of your next turn."},
  {n:"Search",desc:"Wis check (Insight, Medicine, Perception, or Survival, as the DM decides)."},
  {n:"Shove",desc:"Unarmed Strike (Shove) vs a target no more than one size larger. Target makes Str or Dex save vs your DC. On fail, push 5 ft or knock Prone."},
  {n:"Study",desc:"Int check (Arcana, History, Investigation, Nature, or Religion, as the DM decides)."},
  {n:"Utilize",desc:"Use a nonmagical object such as a torch, lantern, or similar item."}
];
const STD_BONUS=[
  {n:"Offhand Attack",desc:"If you attack with a Light weapon as part of the Attack action, you can use a Bonus Action to attack with a different Light weapon in your other hand. No ability mod added to damage unless negative."}
];
const STD_REACTION=[
  {n:"Opportunity Attack",desc:"When a creature you can see moves out of your reach, use your Reaction to make one melee attack against it."}
];

// Features that should be shown on COMBAT tab (actionable/combat-relevant)
const COMBAT_KEYWORDS = /\b(sneak attack|rage|second wind|action surge|divine smite|channel divinity|wild shape|ki|bardic inspiration|martial arts|stunning strike|deflect|lay on hands|favored foe|hunter's mark|reckless attack|brutal strike|mage hand legerdemain|arcane recovery|font of magic|pact magic|eldritch blast|innate sorcery|metamagic|bonus action|reaction|unarmed strike|weapon mastery)\b/i;

// Features that are purely passive/lore (show only in Features tab)
function isCombatFeature(feat){
  if(!feat||!feat.n)return false;
  const n=feat.n.toLowerCase();
  // Explicit combat feature names
  if(COMBAT_KEYWORDS.test(n))return true;
  // Scaling dice (implies damage/effect that scales) + description mentions combat
  if(feat.scaling){
    const hasDice=feat.scaling.some(s=>typeof s==="string"&&/\d+d\d+/.test(s));
    if(hasDice)return true;
  }
  const desc=(feat.desc||"").toLowerCase();
  if(/attack roll|damage|saving throw|hit points|bonus action|reaction|once per turn|weapon mastery/.test(desc) && !/proficiency in|my choice of|i learn|lore|tool proficiency/.test(desc))return true;
  return false;
}

function getScalingAt(scaling,lvl){
  if(!scaling||!scaling.length)return"";
  const idx=Math.min(lvl,scaling.length)-1;
  return scaling[idx]||"";
}

function renderCombat(c,cls,lvl,p){
  let h="";
  // Actions pips + standard actions accordion
  h+='<div class="card"><div class="ct">Turn Actions <button class="btn sm" onclick="resetTurn()">↺ New Turn</button></div>';
  // Action
  let actPips="";for(let i=0;i<combatState.actionMax;i++){actPips+=`<span class="pip ${i<combatState.action?"off":"on"}" onclick="togglePip('action',${i})"></span>`}
  h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="display:flex;justify-content:space-between;align-items:center">
    <span style="flex:1">Action</span><span class="pips" onclick="event.stopPropagation()">${actPips}</span><span class="tog" style="margin-left:8px">▾</span>
  </div><div class="od">${renderActionOptions("action",c,cls,lvl,p)}</div></div>`;
  // Bonus
  h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="display:flex;justify-content:space-between;align-items:center">
    <span style="flex:1">Bonus Action</span><span class="pips" onclick="event.stopPropagation()"><span class="pip ${combatState.bonus?"off":"on"}" onclick="togglePip('bonus',0)"></span></span><span class="tog" style="margin-left:8px">▾</span>
  </div><div class="od">${renderActionOptions("bonus",c,cls,lvl,p)}</div></div>`;
  // Reaction
  h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on" style="display:flex;justify-content:space-between;align-items:center">
    <span style="flex:1">Reaction</span><span class="pips" onclick="event.stopPropagation()"><span class="pip ${combatState.reaction?"off":"on"}" onclick="togglePip('reaction',0)"></span></span><span class="tog" style="margin-left:8px">▾</span>
  </div><div class="od">${renderActionOptions("reaction",c,cls,lvl,p)}</div></div>`;
  // Action Surge (Fighter)
  if(c.class==="fighter"&&lvl>=2){
    const used=(c.limited_used||{})["Action Surge"]||0;
    const max=lvl>=17?2:1;
    let pipsH="";for(let i=0;i<max;i++){pipsH+=`<span class="pip ${i<used?"off":"on"}" onclick="useSurge()"></span>`}
    h+=`<div class="acr" style="border-color:var(--accent)"><div class="an" style="color:var(--accent)">⚡ Action Surge</div><div class="pips">${pipsH}</div></div>`;
  }
  h+='</div>';

  // Weapons
  h+='<div class="card"><div class="ct">Weapons <button class="btn sm" onclick="addWeapon()">+ Add</button></div>';
  if(!c.weapons||!c.weapons.length){h+='<div class="muted" style="font-size:12px">No weapons added.</div>'}
  else{
    c.weapons.forEach((w,i)=>{
      const wd=getWeapon(w.key);if(!wd)return;
      const ab=wd.ability==="Dex"?"dex":"str";
      const isFin=(wd.description||"").toLowerCase().indexOf("finesse")>=0;
      const useAbil=isFin?(mod(c.attrs.str)>=mod(c.attrs.dex)?"str":"dex"):ab;
      const atkMod=mod(c.attrs[useAbil])+p+(w.mag||0);
      const dmgBonus=mod(c.attrs[useAbil])+(w.mag||0);
      const dmg=wd.damage+(dmgBonus>=0?"+"+dmgBonus:dmgBonus);
      h+=`<div class="wpr"><div class="wpn">${esc(w.custom_name||wd.name)}${w.mag?` <span class="tag accent">+${w.mag}</span>`:""}
        <button class="btn sm" onclick="editWeapon(${i})" style="font-size:10px">✎</button></div>
        <div class="wps">
          <div><div class="v">${fmtMod(atkMod)}</div><div class="l">Hit</div></div>
          <div><div class="v">${dmg}</div><div class="l">${esc(wd.damageType||"")}</div></div>
          <div><div class="v" style="font-size:12px">${esc(wd.range||"Melee")}</div><div class="l">Range</div></div>
        </div>
        ${wd.description?`<div class="muted" style="font-size:11px;margin-top:4px">${esc(wd.description)}</div>`:""}
        ${w.note?`<div style="font-size:11px;margin-top:4px;color:var(--accent2);white-space:pre-wrap">${esc(w.note)}</div>`:""}
        </div>`;
    });
  }
  // Magic weapons being carried
  const magicWeapons=(c.magic_items||[]).filter(mi=>{const d=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);return d&&d.slot==="weapon"&&mi.carrying;});
  magicWeapons.forEach((mi)=>{
    const def=MAGIC_ITEMS_DB.find(x=>x._key===mi.key);if(!def||!def.weaponKey)return;
    const wd=getWeapon(def.weaponKey);if(!wd)return;
    const bonus=mi.bonus||0;
    const ab=wd.ability==="Dex"?"dex":"str";
    const isFin=(wd.description||"").toLowerCase().indexOf("finesse")>=0;
    const useAbil=isFin?(mod(c.attrs.str)>=mod(c.attrs.dex)?"str":"dex"):ab;
    const atkMod=mod(c.attrs[useAbil])+p+bonus;
    const dmgBonus=mod(c.attrs[useAbil])+bonus;
    const dmg=wd.damage+(dmgBonus>=0?"+"+dmgBonus:dmgBonus);
    const miIdx=(c.magic_items||[]).indexOf(mi);
    h+=`<div class="wpr"><div class="wpn">${esc(def.name)}${bonus?` <span class="tag accent">+${bonus}</span>`:""} <span class="tag magic" style="font-size:10px">✦</span>
      <button class="btn sm" onclick="openMagicItemDetail(${miIdx})" style="font-size:10px">✎</button></div>
      <div class="wps">
        <div><div class="v">${fmtMod(atkMod)}</div><div class="l">Hit</div></div>
        <div><div class="v">${dmg}</div><div class="l">${esc(wd.damageType||"")}</div></div>
        <div><div class="v" style="font-size:12px">${esc(wd.range||"Melee")}</div><div class="l">Range</div></div>
      </div>
      <div class="muted" style="font-size:11px;margin-top:4px">${esc(def.desc.slice(0,100))}${def.desc.length>100?"…":""}</div>
      </div>`;
  });
  h+='</div>';
  const combatFeats=[];
  (cls.features||[]).filter(f=>f.lvl<=lvl&&f.desc&&isCombatFeature(f)).forEach(f=>combatFeats.push({...f,_src:"class",_srcName:cls.name}));
  if(c.subclass){
    const sc=getSubclass(c.subclass);
    if(sc)(sc.features||[]).filter(f=>f.lvl<=lvl&&f.desc&&isCombatFeature(f)).forEach(f=>combatFeats.push({...f,_src:"subclass",_srcName:sc.name}));
  }
  if(c.subrace){
    const sr=getSubrace(c.subrace);
    if(sr)(sr.features||[]).filter(f=>f.lvl<=lvl&&f.desc&&isCombatFeature(f)).forEach(f=>combatFeats.push({...f,_src:"subrace",_srcName:sr.name}));
  }
  const race=getRace(c.race);
  if(race)(race.traits||[]).filter(f=>f.lvl<=lvl&&f.desc&&isCombatFeature(f)).forEach(f=>combatFeats.push({...f,_src:"race",_srcName:race.name}));

  if(combatFeats.length){
    h+='<div class="card"><div class="ct">Combat Features</div>';
    combatFeats.forEach(f=>{
      const scale=getScalingAt(f.scaling,lvl);
      const srcBadge=f._src==="subclass"?' <span class="tag accent">Subclass</span>':f._src==="race"||f._src==="subrace"?' <span class="tag magic">Racial</span>':'';
      h+=`<div class="opt" onclick="this.classList.toggle('open')"><div class="on">${esc(f.n)}${scale?` <span class="tag ok">${esc(scale)}</span>`:""}${srcBadge}<span class="tog">▾</span></div><div class="od">${esc(f.desc)}</div></div>`;
    });
    h+='</div>';
  }

  // Subclass prompt
  if(!c.subclass && hasSubclassAtLevel(cls,lvl)){
    h+=`<div class="notice warn" style="font-size:12px">⭐ You can choose a subclass! <button class="btn sm" onclick="pickSubclass()">Choose →</button></div>`;
  }
  el("tab2").innerHTML=h;
}

function renderActionOptions(kind,c,cls,lvl,p){
  const list=kind==="action"?STD_ACTIONS:kind==="bonus"?STD_BONUS:STD_REACTION;
  let h='<div style="font-size:12px;line-height:1.5">';
  list.forEach(a=>{
    h+=`<div style="margin-bottom:6px"><strong style="color:var(--accent2)">${esc(a.n)}:</strong> ${esc(a.desc)}</div>`;
  });
  // Add class/race/subrace features that are bonus/reaction actions
  const extras=[];
  const considerFeat=(f,source)=>{
    if(!f.desc)return;
    const d=f.desc.toLowerCase();
    if(kind==="bonus"&&/bonus action/.test(d))extras.push({...f,_src:source});
    else if(kind==="reaction"&&/\breaction\b/.test(d))extras.push({...f,_src:source});
    else if(kind==="action"&&/(magic action|as an action|take an action)/.test(d))extras.push({...f,_src:source});
  };
  (cls.features||[]).filter(f=>f.lvl<=lvl).forEach(f=>considerFeat(f,cls.name));
  if(c.subclass){const sc=getSubclass(c.subclass);if(sc)(sc.features||[]).filter(f=>f.lvl<=lvl).forEach(f=>considerFeat(f,sc.name))}
  if(c.subrace){const sr=getSubrace(c.subrace);if(sr)(sr.features||[]).filter(f=>f.lvl<=lvl).forEach(f=>considerFeat(f,sr.name))}
  const race=getRace(c.race);if(race)(race.traits||[]).filter(f=>f.lvl<=lvl).forEach(f=>considerFeat(f,race.name));

  if(extras.length){
    h+='<div style="border-top:1px dashed var(--border);margin:8px 0;padding-top:6px"><div class="lbl" style="margin-bottom:4px">From your features</div>';
    extras.forEach(f=>{
      const scale=getScalingAt(f.scaling,lvl);
      h+=`<div style="margin-bottom:6px"><strong style="color:var(--magic)">${esc(f.n)}${scale?" ("+esc(scale)+")":""}:</strong> <span class="muted" style="font-size:10px">${esc(f._src)}</span><br><span style="font-size:11px">${esc(f.desc)}</span></div>`;
    });
    h+='</div>';
  }
  h+='</div>';
  return h;
}
function togglePip(type,idx){
  if(type==="action")combatState.action=idx<combatState.action?idx:idx+1;
  else if(type==="bonus")combatState.bonus=combatState.bonus?0:1;
  else if(type==="reaction")combatState.reaction=combatState.reaction?0:1;
  renderSheet();
}
function resetTurn(){combatState={action:0,bonus:0,reaction:0,actionMax:1};renderSheet()}
function useSurge(){
  const c=chars[currentId];const lvl=c.level;
  const used=(c.limited_used||{})["Action Surge"]||0;const max=lvl>=17?2:1;
  if(used>=max){alert("No surges left!");return}
  c.limited_used=c.limited_used||{};c.limited_used["Action Surge"]=used+1;
  combatState.action=0;  // reset action used (Surge refreshes it)
  saveChars();renderSheet();
}

function hasSubclassAtLevel(cls,lvl){
  // Most classes get subclass at 3; warlock/cleric/sorcerer at 1-3
  const subFeat=(cls.features||[]).find(f=>/Subclass/i.test(f.n));
  return subFeat && lvl>=subFeat.lvl;
}

function pickSubclass(){
  const c=chars[currentId];const subs=getSubclassesOf(c.class);const lvl=c.level;
  const rows=subs.map(s=>{
    const active=c.subclass===s._key;
    const avail=(s.features||[]).filter(f=>f.lvl<=lvl && f.desc);
    // Preview: list feature names as compact bullets
    const previewList=avail.map(f=>`<div style="margin-top:4px"><strong style="color:var(--accent2)">${esc(f.n)}</strong> <span class="muted" style="font-size:10px">(lv ${f.lvl})</span><br><span style="font-size:11px;color:var(--text2)">${esc(f.desc.slice(0,120))}${f.desc.length>120?"…":""}</span></div>`).join("");
    return `<div class="card" style="border:1px solid ${active?"var(--accent)":"var(--border)"};cursor:pointer;margin-bottom:10px" onclick="selectSub('${s._key}')">
      <div style="font-family:Cinzel,serif;font-size:14px;color:${active?"var(--accent)":"var(--accent2)"}">${esc(s.name)}${active?' <span class="tag ok">Current</span>':''}</div>
      <div style="margin-top:6px">${previewList||'<span class="muted">No features at this level yet.</span>'}</div>
    </div>`;
  }).join("");
  openModal("Choose Subclass",rows,'<button class="btn" onclick="closeModal()">Cancel</button>');
}
function selectSub(k){
  chars[currentId].subclass=k;chars[currentId].subclass_choices=[];
  saveChars();closeModal();renderSheet();
}

function addWeapon(){
  const ws=DATA.weapons.filter(w=>w.damage);
  const rows=ws.map(w=>`<div class="opt" onclick="pickWpn('${w._key}')"><div class="on">${esc(w.name)} <span class="lvtag">${w.damage} ${esc(w.damageType||"")}</span></div><div class="od" style="display:block">${esc(w.description||"")}${w.range?" · "+esc(w.range):""}</div></div>`).join("");
  openModal("Add Weapon",rows);
}
function pickWpn(k){
  const w=getWeapon(k);
  const c=chars[currentId];
  c.weapons.push({key:k,name:w.name,mag:0,note:"",custom_name:null});
  saveChars();closeModal();renderSheet();
  // Open edit right away so user can set +N / notes if needed
  editWeapon(c.weapons.length-1);
}
function rmWeapon(i){chars[currentId].weapons.splice(i,1);saveChars();renderSheet()}

function openWeaponDetails(i){
  const c=chars[currentId];const w=c.weapons[i];if(!w)return;
  const wd=getWeapon(w.key);
  const name=w.custom_name||(wd?wd.name:w.name);
  const bonus=w.mag||0;
  let body=`<div class="muted" style="font-size:12px;margin-bottom:8px">${wd?esc(wd.damage+" "+(wd.damageType||"")):""}${wd&&wd.range?" · "+esc(wd.range):""}</div>`;
  if(wd&&wd.description)body+=`<div style="font-size:12px;margin-bottom:8px">${esc(wd.description)}</div>`;
  if(bonus)body+=`<div class="tag accent" style="margin-bottom:8px">Magical +${bonus}</div>`;
  if(w.note)body+=`<div style="font-size:13px;white-space:pre-wrap;line-height:1.5;margin-top:6px;padding:8px;background:var(--bg2);border-radius:var(--r)">${esc(w.note)}</div>`;
  openModal(name,body,
    `<button class="btn danger" onclick="rmWeaponConfirm(${i})">✕ Delete</button>
     <button class="btn" onclick="editWeapon(${i})">✎ Edit</button>
     <button class="btn" onclick="closeModal()">Close</button>`);
}
function rmWeaponConfirm(i){if(!confirm("Delete this weapon?"))return;rmWeapon(i);closeModal()}

function editWeapon(i){
  const c=chars[currentId];const w=c.weapons[i];if(!w)return;
  const wd=getWeapon(w.key);
  const baseName=wd?wd.name:w.name;
  openModal(baseName,
    `<div class="f"><div class="lbl">Custom name (optional)</div><input type="text" id="wname" value="${esc(w.custom_name||"")}" placeholder="e.g. Oathbow, Flame Tongue"></div>
     <div class="f"><div class="lbl">Magical Bonus</div><select id="wmag">
       ${[0,1,2,3].map(n=>`<option value="${n}"${(w.mag||0)===n?" selected":""}>${n?"+"+n:"None"}</option>`).join("")}
     </select></div>
     <div class="f"><div class="lbl">Magical Properties / Notes</div><textarea id="wnote" rows="5" placeholder="e.g. +3d6 piercing vs your sworn enemy; glows when undead within 60 ft">${esc(w.note||"")}</textarea></div>`,
    `<button class="btn danger" onclick="rmWeaponConfirm(${i})">✕ Delete</button>
     <button class="btn" onclick="closeModal()">Cancel</button>
     <button class="btn primary" onclick="saveWeaponEdit(${i})">💾 Save</button>`);
  setTimeout(()=>{const t=el("wname");if(t)t.focus()},50);
}
function saveWeaponEdit(i){
  const c=chars[currentId];const w=c.weapons[i];if(!w)return;
  const cn=el("wname").value.trim();
  w.custom_name=cn||null;
  w.mag=parseInt(el("wmag").value)||0;
  w.note=el("wnote").value.trim();
  saveChars();closeModal();renderSheet();
}

// ======================================================================
// TAB 2: SPELLS
// ======================================================================
function renderSpells(c,cls,lvl,p){
  const caster=SPELL_CASTER_TYPE[c.class];
  const racial=getRacialSpells(c);

  let h="";

  // Class spellcasting header
  if(caster){
    const ab=SPELL_ABILITY[c.class];const abMod=mod(c.attrs[ab]);
    const dc=8+p+abMod;const atk=p+abMod;
    h+=`<div class="card"><div class="ct">${esc(cls.name)} Spellcasting</div>
      <div class="row">
        <div class="stat"><div class="sv">${dc}</div><div class="sl">Save DC</div></div>
        <div class="stat"><div class="sv">${fmtMod(atk)}</div><div class="sl">Attack</div></div>
        <div class="stat"><div class="sv">${ABIL_SHORT[ab]}</div><div class="sl">Ability</div></div>
      </div></div>`;
    // Slots
    let slots=[];
    if(caster==="full")slots=FULL_CASTER_SLOTS[lvl-1]||[];
    else if(caster==="half")slots=HALF_CASTER_SLOTS[lvl-1]||[];
    else if(caster==="warlock"){
      const total=WARLOCK_SLOTS_COUNT[lvl-1];const lvSlot=WARLOCK_SLOT_LEVEL[lvl-1];
      slots=new Array(lvSlot).fill(0);slots[lvSlot-1]=total;
    }
    if(slots.length){
      h+='<div class="card"><div class="ct">Spell Slots</div>';
      slots.forEach((total,i)=>{
        if(!total)return;
        const circle=i+1;
        const used=(c.spell_slots_used||{})[circle]||0;
        let pipsH="";for(let j=0;j<total;j++){pipsH+=`<span class="pip ${j<used?"off":"on"}" onclick="toggleSlot(${circle},${j})"></span>`}
        h+=`<div class="acr"><div class="an">${caster==="warlock"?"Pact":"Lv"} ${circle}</div><div class="pips">${pipsH}</div></div>`;
      });
      h+='</div>';
    }
  }

  // Racial spells (shown separately, using racial_spell_ability)
  if(racial.length){
    const ab=c.racial_spell_ability||"cha";const abMod=mod(c.attrs[ab]);
    const dc=8+p+abMod;const atk=p+abMod;
    h+=`<div class="card"><div class="ct" style="color:var(--magic)">Racial Magic · ${ABIL_SHORT[ab]}</div>
      <div class="row" style="margin-bottom:8px">
        <div class="stat"><div class="sv">${dc}</div><div class="sl">Save DC</div></div>
        <div class="stat"><div class="sv">${fmtMod(atk)}</div><div class="sl">Attack</div></div>
      </div>`;
    racial.forEach(rs=>{
      const sp=rs.spell;
      const isAtWill=rs.firstCol==="atwill";
      const isOnceLR=rs.firstCol==="oncelr";
      // Usage pip for once-per-long-rest
      const key="racial:"+sp._key;
      const used=(c.racial_spell_uses||{})[key]||0;
      let badge='<span class="tag magic">At Will</span>';
      let usageHtml="";
      if(isOnceLR){
        badge='<span class="tag warn">1/LR</span>';
        usageHtml=`<span class="pip ${used?"off":"on"}" onclick="event.stopPropagation();toggleRacialUse('${esc(sp._key)}')"></span>`;
      }
      h+=`<div class="spl" onclick="showRacialSpell('${esc(sp._key)}','${esc(rs.source)}','${esc(rs.firstCol)}')">
        <div class="sph">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;flex:1">
            <span class="spb">${sp.level===0?"Cantrip":"L"+sp.level}</span>
            <span class="spn">${esc(sp.name)}</span>
            ${badge}
          </div>
          ${usageHtml}
        </div>
        <div class="spt">${esc(rs.source)} · ${esc(sp.time||"")}${sp.range?" · "+esc(sp.range):""}</div>
      </div>`;
    });
    h+='</div>';
  }

  // My chosen spells (always shown)
  {
    h+=`<div class="card"><div class="ct">My Spells <button class="btn sm" onclick="searchSpells()">+ Search</button></div>`;
    const mySpells=c.spells||[];
    if(!mySpells.length){h+='<div class="muted" style="font-size:12px">No spells yet.</div>'}
    else{
      const byLvl={};mySpells.forEach((s,i)=>{(byLvl[s.level]=byLvl[s.level]||[]).push({...s,_i:i})});
      Object.keys(byLvl).sort((a,b)=>a-b).forEach(l=>{
        const ln=l==0?"Cantrips":"Level "+l;
        h+=`<div class="lbl" style="margin-top:10px">${ln}</div>`;
        byLvl[l].forEach(s=>{
          h+=`<div class="spl" onclick="showSpell(${s._i})">
            <div class="sph"><div style="flex:1"><span class="spn">${esc(s.name)}</span>${s.conc?' <span class="tag magic">Conc</span>':''}${s.ritual?' <span class="tag info">Ritual</span>':''}</div></div>
            <div class="spt">${esc(s.time||"")} · ${esc(s.range||"")} · ${esc(s.duration||"")}</div>
          </div>`;
        });
      });
    }
    h+='</div>';
  }

  el("tab3").innerHTML=h;
}
function toggleRacialUse(key){
  const c=chars[currentId];c.racial_spell_uses=c.racial_spell_uses||{};
  const k="racial:"+key;c.racial_spell_uses[k]=c.racial_spell_uses[k]?0:1;saveChars();renderSheet();
}
function showRacialSpell(key,source,firstCol){
  const sp=getSpellByKey(key);if(!sp)return;
  const lvlLabel=sp.level===0?"Cantrip":"Level "+sp.level;
  const freq=firstCol==="atwill"?"At Will":firstCol==="oncelr"?"1× / Long Rest":"";
  let body=`<div class="notice magic" style="margin-bottom:10px;background:rgba(176,141,224,.1);border-color:rgba(176,141,224,.3)">
    <strong style="color:var(--magic);font-size:14px">${esc(sp.name)}</strong> — ${lvlLabel}
    <div style="margin-top:3px;font-size:12px">From <strong>${esc(source)}</strong>${freq?" · "+esc(freq):""}</div>
  </div><div style="font-size:13px;color:var(--text2);line-height:1.8">`;
  if(sp.time)body+=`<div><strong>Casting:</strong> ${esc(sp.time)}</div>`;
  if(sp.range)body+=`<div><strong>Range:</strong> ${esc(sp.range)}</div>`;
  if(sp.duration)body+=`<div><strong>Duration:</strong> ${esc(sp.duration)}</div>`;
  if(sp.components)body+=`<div><strong>Components:</strong> ${esc(sp.components)}</div>`;
  if(sp.compMaterial)body+=`<div><strong>Material:</strong> ${esc(sp.compMaterial)}</div>`;
  if(sp.save)body+=`<div><strong>Save:</strong> ${esc(sp.save)}</div>`;
  if(sp.description)body+=`<div style="margin-top:8px;color:var(--text)">${esc(sp.description)}</div>`;
  body+='</div>';
  openModal("Racial Spell",body);
}
function toggleSlot(circle,idx){
  const c=chars[currentId];c.spell_slots_used=c.spell_slots_used||{};
  const cur=c.spell_slots_used[circle]||0;
  c.spell_slots_used[circle]=idx<cur?idx:idx+1;
  saveChars();renderSheet();
}
function searchSpells(){
  const c=chars[currentId];
  const existing=new Set((c.spells||[]).map(s=>s.name));
  let body=`<div class="f"><input type="text" id="spq" placeholder="Search..." oninput="filterSpellSearch()"></div>
    <div class="row" style="gap:6px;margin-bottom:8px">
      <select id="spfc" onchange="filterSpellSearch()" style="flex:1">
        <option value="">All classes</option>
        ${DATA.classes.filter(x=>SPELL_CASTER_TYPE[x._key]).map(x=>`<option value="${x._key}"${x._key===c.class?" selected":""}>${esc(x.name)}</option>`).join("")}
      </select>
      <select id="spfl" onchange="filterSpellSearch()" style="flex:1">
        <option value="">All levels</option>
        <option value="0">Cantrips</option>
        ${Array.from({length:9},(_,i)=>`<option value="${i+1}">Level ${i+1}</option>`).join("")}
      </select>
    </div>
    <div id="splist" style="max-height:60vh;overflow-y:auto"></div>`;
  openModal("Search Spells",body);
  filterSpellSearch();
}
function filterSpellSearch(){
  const q=(el("spq").value||"").toLowerCase();
  const fc=el("spfc").value;
  const fl=el("spfl").value;
  const c=chars[currentId];const existing=new Set((c.spells||[]).map(s=>s.name));
  const results=DATA.spells.filter(s=>{
    if(q&&s.name.toLowerCase().indexOf(q)<0)return false;
    if(fc&&(!s.classes||s.classes.indexOf(fc)<0))return false;
    if(fl!==""&&s.level!==parseInt(fl))return false;
    return true;
  }).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
  let h="";
  if(!results.length){h='<div class="muted" style="padding:8px">No spells found.</div>'}
  else{
    results.forEach((s,ri)=>{
      const added=existing.has(s.name);
      h+=`<div class="spl" ${added?"":`onclick="addSpellByKey(this.dataset.k)"`} data-k="${esc(s._key)}" style="${added?'opacity:.5':''}">
        <div class="sph"><div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
          <span class="spb">${s.level===0?"Cantrip":"L"+s.level}</span>
          <span class="spn">${esc(s.name)}</span>
          ${s.duration&&s.duration.indexOf("Conc")>=0?'<span class="tag magic">Conc</span>':''}
        </div>${added?'<span class="tag ok">✓</span>':'<span class="tag accent">+</span>'}</div>
        <div class="spt">${esc(s.time||"")} · ${esc(s.range||"")} · ${esc(s.duration||"")}${s.save?" · Save "+s.save:""}</div>
        ${s.description?`<div style="font-size:11px;color:var(--text2);margin-top:3px;line-height:1.4">${esc(s.description)}</div>`:""}
      </div>`;
    });
  }
  el("splist").innerHTML=h;
}
function addSpellByKey(key){addSpell(key);}
function addSpell(key){
  const s=DATA.spells.find(x=>x._key===key);if(!s)return;
  const c=chars[currentId];c.spells=c.spells||[];
  if(c.spells.find(x=>x.name===s.name))return;
  c.spells.push({
    name:s.name,level:s.level,school:s.school,time:s.time,range:s.range,
    components:s.components,duration:s.duration,save:s.save||"",
    material:s.compMaterial||"",description:s.description||"",
    conc:(s.duration||"").indexOf("Conc")>=0?1:0,
    ritual:s.ritual?1:0
  });
  saveChars();filterSpellSearch();renderSheet();  // refresh modal list + sheet
}
function searchFeats(){
  let body=`<div class="f"><input type="text" id="ftq" placeholder="Search feats..." oninput="filterFeatSearch()"></div>
    <div id="ftlist" style="max-height:60vh;overflow-y:auto"></div>`;
  openModal("Add Feat",body);
  filterFeatSearch();
}
function filterFeatSearch(){
  const q=(el("ftq").value||"").toLowerCase();
  const c=chars[currentId];const existing=new Set(getCharFeats(c).map(f=>f.toLowerCase()));
  const results=DATA.feats.filter(f=>!q||f.name.toLowerCase().indexOf(q)>=0||(f.description||"").toLowerCase().indexOf(q)>=0)
    .sort((a,b)=>a.name.localeCompare(b.name));
  let h="";
  if(!results.length){h='<div class="muted" style="padding:8px">No feats found.</div>'}
  else{
    results.forEach(f=>{
      const added=existing.has(f.name.toLowerCase());
      h+=`<div class="spl" ${added?"":`onclick="addFeatToChar('${esc(f._key)}')"`} style="${added?'opacity:.5':''}">
        <div class="sph"><div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;flex:1">
          <span class="spn">${esc(f.name)}</span>
        </div>${added?'<span class="tag ok">✓</span>':'<span class="tag accent">+</span>'}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:3px;line-height:1.4">${esc(f.description||"")}</div>
      </div>`;
    });
  }
  el("ftlist").innerHTML=h;
}
function addFeatToChar(key){
  const f=DATA.feats.find(x=>x._key===key);if(!f)return;
  const c=chars[currentId];c.feats=c.feats||[];
  if(c.feats.indexOf(f.name)>=0)return;
  c.feats.push(f.name);
  saveChars();filterFeatSearch();renderSheet();
}
function rmFeat(idx){
  const c=chars[currentId];if(!c.feats||!c.feats[idx])return;
  if(!confirm("Remove this feat?"))return;
  c.feats.splice(idx,1);saveChars();renderSheet();
}
function showSpell(idx){
  const c=chars[currentId];const s=c.spells[idx];if(!s)return;
  const lvlLabel=s.level===0?"Cantrip":"Level "+s.level;
  let body=`<div class="notice" style="margin-bottom:10px"><strong style="color:var(--accent2);font-size:14px">${esc(s.name)}</strong> — ${lvlLabel}`;
  if(s.school)body+=` · ${esc(s.school)}`;
  if(s.conc)body+=' · <span style="color:var(--magic)">Concentration</span>';
  if(s.ritual)body+=' · <span style="color:var(--info)">Ritual</span>';
  body+='</div><div style="font-size:13px;color:var(--text2);line-height:1.8">';
  if(s.time)body+=`<div><strong>Casting:</strong> ${esc(s.time)}</div>`;
  if(s.range)body+=`<div><strong>Range:</strong> ${esc(s.range)}</div>`;
  if(s.duration)body+=`<div><strong>Duration:</strong> ${esc(s.duration)}</div>`;
  if(s.components)body+=`<div><strong>Components:</strong> ${esc(s.components)}</div>`;
  if(s.material)body+=`<div><strong>Material:</strong> ${esc(s.material)}</div>`;
  if(s.save)body+=`<div><strong>Save:</strong> ${esc(s.save)}</div>`;
  if(s.description)body+=`<div style="margin-top:8px;color:var(--text)">${esc(s.description)}</div>`;
  body+='</div>';
  openModal("Spell Details",body,`<button class="btn" onclick="closeModal()">Close</button><button class="btn danger" onclick="rmSpell(${idx})">✕ Remove</button>`);
}
function rmSpell(i){chars[currentId].spells.splice(i,1);saveChars();closeModal();renderSheet()}

function addLang(){
  const v=prompt("Language name:");
  if(!v||!v.trim())return;
  const c=chars[currentId];
  if(!c.extra_langs)c.extra_langs=[];
  c.extra_langs.push(v.trim());
  saveChars();renderSheet();
}
function rmLang(i){
  const c=chars[currentId];
  c.extra_langs.splice(i,1);
  saveChars();renderSheet();
}

// ======================================================================
// TAB 3: INVENTORY
// ======================================================================
