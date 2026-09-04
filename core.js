"use strict";

// ======================================================================
// CONSTANTS & DATA LOOKUPS
// ======================================================================
const ABILS = ["str","dex","con","int","wis","cha"];
const ABIL_NAMES = {str:"Força",dex:"Destreza",con:"Constituição",int:"Inteligência",wis:"Sabedoria",cha:"Carisma"};
const ABIL_SHORT = {str:"For",dex:"Des",con:"Con",int:"Int",wis:"Sab",cha:"Car"};

// Skills map: skill name → ability
const SKILLS = [
  ["Acrobacia","dex"],["Lidar com Animais","wis"],["Arcanismo","int"],["Atletismo","str"],
  ["Enganação","cha"],["História","int"],["Intuição","wis"],["Intimidação","cha"],
  ["Investigação","int"],["Medicina","wis"],["Natureza","int"],["Percepção","wis"],
  ["Atuação","cha"],["Persuasão","cha"],["Religião","int"],["Prestidigitação","dex"],
  ["Furtividade","dex"],["Sobrevivência","wis"]
];

// Point buy costs
const PB_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
function pbCost(v){return PB_COST[v]!==undefined?PB_COST[v]:0}

// Spell slots by class level (full caster: bard, cleric, druid, sorcerer, wizard)
// Format: [level][slot_level-1] = slots available
const FULL_CASTER_SLOTS = [
  [2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],
  [4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],
  [4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]
];
// Half caster (paladin, ranger): slots start level 2
const HALF_CASTER_SLOTS = [
  [],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],
  [4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],
  [4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]
];
// Third caster (eldritch knight, arcane trickster): slots start level 3
const THIRD_CASTER_SLOTS = [
  [],[],[2],[3],[3],[3],[4,2],[4,2],[4,2],[4,3],[4,3],[4,3],
  [4,3,2],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1]
];
// Warlock: pact magic (all slots same level, recover on SR)
const WARLOCK_SLOTS_COUNT = [1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4,4];
const WARLOCK_SLOT_LEVEL  = [1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5];

// Which classes are spellcasters (and type)
const SPELL_CASTER_TYPE = {
  bard:"full", cleric:"full", druid:"full", sorcerer:"full", wizard:"full",
  paladin:"half", ranger:"half",
  warlock:"warlock",
  artificer:"half"
};
const SPELL_ABILITY = {
  bard:"cha", cleric:"wis", druid:"wis", sorcerer:"cha", wizard:"int",
  paladin:"cha", ranger:"wis", warlock:"cha", artificer:"int"
};

// 2024 PHB "Prepared Spells" tables (fixed per-level count, not Level+Mod)
const PREPARED_SPELLS_TABLE = {
  bard:     [4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22],
  cleric:   [4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22],
  druid:    [4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22],
  sorcerer: [2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22],
  wizard:   [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25],
  paladin:  [2,2,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15],
  ranger:   [2,3,4,5,6,6,7,7,8,8,10,10,11,11,12,12,14,14,15,15],
  warlock:  [2,3,4,5,6,7,7,8,9,10,11,11,12,12,13,13,14,14,15,15]
};
function getPreparedMax(c){
  const t=PREPARED_SPELLS_TABLE[c.class];
  return t?t[Math.min(c.level,20)-1]:null;
}

// Battle Master: maneuvers known & superiority dice count by Fighter level
function maneuversKnownAtLevel(lvl){
  if(lvl>=15)return 9;if(lvl>=10)return 7;if(lvl>=7)return 5;if(lvl>=3)return 3;return 0;
}
function superiorityDiceCount(lvl){
  if(lvl>=15)return 6;if(lvl>=7)return 5;if(lvl>=3)return 4;return 0;
}

// Druid Wild Shape eligibility: which beasts can this character turn into right now?
function wildShapeEligibleBeasts(c){
  if(c.class!=="druid"||c.level<2)return[];
  const lvl=c.level;
  const isMoon=c.subclass==="moon"&&lvl>=3;
  let maxCR,allowFly;
  if(isMoon){maxCR=Math.floor(lvl/3);allowFly=true;}
  else{maxCR=lvl>=8?1:lvl>=4?0.5:0.25;allowFly=lvl>=8;}
  return (DATA.beasts||[]).filter(b=>b.cr<=maxCR&&(allowFly||!b.speed.fly));
}
// Temp HP granted by transforming (base Wild Shape = druid level; Circle of the Moon = 3x)
function wildShapeTempHP(c){
  return c.class==="druid"&&c.subclass==="moon"&&c.level>=3?c.level*3:c.level;
}

// ======================================================================
// DATA HELPERS
// ======================================================================
function getClass(key){return DATA.classes.find(c=>c._key===key)}
function getSubclass(key){return DATA.subclasses.find(s=>s._key===key)}
function getSubclassesOf(classKey){return DATA.subclasses.filter(s=>s._class===classKey)}
function getRace(key){return DATA.races.find(r=>r._key===key)}
function getSubrace(key){return (DATA.subraces||[]).find(s=>s._key===key)}
function getSubracesOf(raceKey){return (DATA.subraces||[]).filter(s=>s._key.startsWith(raceKey+"-"))}
function getBackground(key){return DATA.backgrounds.find(b=>b._key===key)}
function getFeat(key){return DATA.feats.find(f=>f._key===key)}
function getWeapon(key){return DATA.weapons.find(w=>w._key===key)}
function getArmor(key){return DATA.armor.find(a=>a._key===key)}
function getSpellByKey(key){return DATA.spells.find(s=>s._key===key)}
function getManeuver(key){return (DATA.maneuvers||[]).find(m=>m._key===key)}
function getBeast(key){return (DATA.beasts||[]).find(b=>b._key===key)}

// Parse the weapon mastery keyword out of a weapon's description (the last
// ";"-separated segment, e.g. "Acuidade, Leve, Arremesso; Ágil" -> "Ágil") and
// look it up in DATA.weaponMasteries by its translated display name.
// Returns {key,name,desc} or null.
function getWeaponMastery(wd){
  if(!wd||!wd.description)return null;
  const parts=wd.description.split(";");
  const last=parts[parts.length-1].trim().toLowerCase();
  const masteries=DATA.weaponMasteries||{};
  for(const key in masteries){
    const m=masteries[key];
    if(m.name&&m.name.toLowerCase()===last)return{key,name:m.name,desc:m.desc};
  }
  return null;
}
// Small HTML block explaining a weapon's mastery property, or "" if none.
function masteryHtml(wd){
  const m=getWeaponMastery(wd);if(!m)return"";
  return `<div style="font-size:11px;margin-top:4px;padding:6px 8px;background:var(--bg3);border-left:2px solid var(--accent);border-radius:4px">
    <span class="tag accent" style="margin-right:6px">Maestria: ${esc(m.name)}</span>${esc(m.desc)}
  </div>`;
}

// Get all spells granted to character by race/subrace/feats (racial spells)
function getRacialSpells(c){
  const out=[];
  const race=getRace(c.race);
  if(race&&race.grants_spells){
    race.grants_spells.forEach(g=>{
      (g.spells||[]).forEach(k=>{
        const sp=getSpellByKey(k);
        if(sp)out.push({spell:sp,source:race.name,firstCol:g.firstCol||"atwill",lineage:g.name});
      });
    });
  }
  if(c.subrace){
    const sr=getSubrace(c.subrace);
    if(sr&&sr.grants_spells){
      sr.grants_spells.forEach(g=>{
        (g.spells||[]).forEach(k=>{
          // skip if already granted by base race
          if(out.find(x=>x.spell._key===k))return;
          const sp=getSpellByKey(k);
          if(sp)out.push({spell:sp,source:sr.name,firstCol:g.firstCol||"atwill",lineage:g.name});
        });
      });
    }
    // Level-gated spells from subrace features
    if(sr&&sr.features){
      sr.features.forEach(f=>{
        if(f.lvl<=c.level && f.grants_spells){
          f.grants_spells.forEach(g=>{
            (g.spells||[]).forEach(k=>{
              const sp=getSpellByKey(k);
              if(sp)out.push({spell:sp,source:sr.name+" (nv "+f.lvl+")",firstCol:g.firstCol||"oncelr",lineage:g.name});
            });
          });
        }
      });
    }
  }
  return out;
}

// Does character have any spellcasting (class OR racial)?
function hasAnySpells(c){
  if(SPELL_CASTER_TYPE[c.class])return true;
  if(getRacialSpells(c).length>0)return true;
  return false;
}

// ======================================================================
// MATH HELPERS
// ======================================================================
function mod(score){return Math.floor((score-10)/2)}
function fmtMod(m){return (m>=0?"+":"")+m}
function profBonus(lvl){return Math.ceil(lvl/4)+1}
function roll(sides){return Math.floor(Math.random()*sides)+1}

// ======================================================================
// STATE
// ======================================================================
let chars = {};
let currentId = null;
let currentTab = 0;
let creationState = null;
let combatState = {action:0,bonus:0,reaction:0,actionMax:1};

function loadChars(){
  try{chars=JSON.parse(localStorage.getItem("dnd24_chars")||"{}")}catch(e){chars={}}
}
function saveChars(){
  try{localStorage.setItem("dnd24_chars",JSON.stringify(chars))}catch(e){}
}

// ======================================================================
// UTILS
// ======================================================================
function el(id){return document.getElementById(id)}

// ======================================================================
// UNITS (feet ↔ meters)
// ======================================================================
let useMeters=false;
function loadUnits(){try{useMeters=localStorage.getItem("dnd24_units")==="m"}catch(e){}updateUnitsButton()}
function toggleUnits(){
  useMeters=!useMeters;
  try{localStorage.setItem("dnd24_units",useMeters?"m":"ft")}catch(e){}
  updateUnitsButton();
  if(currentId)renderSheet();
}
function updateUnitsButton(){const b=el("unitsbtn");if(b)b.textContent=useMeters?"m":"ft"}
// Convert any string with "N ft" / "N feet" / "N foot" → "M m" (rounded). 1 ft = 0.3 m, 5 ft = 1.5 m
function convUnits(s){
  if(!useMeters||!s||typeof s!=="string")return s;
  return s.replace(/(\d+(?:\.\d+)?)[ -]?(?:ft|feet|foot|')(?!\w)/gi,(m,n)=>{
    const meters=parseFloat(n)/5*1.5;
    return (Number.isInteger(meters)?meters:meters.toFixed(1))+" m";
  });
}
// Wrapper: like esc, but also converts units when in meters mode
function escU(s){return esc(convUnits(s))}

function esc(s){return (s==null?"":String(s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function show(screenId){["home","create","sheet"].forEach(s=>el(s).classList.toggle("active",s===screenId))}

// ======================================================================
// MODAL
// ======================================================================
function openModal(title, bodyHtml, footerHtml){
  el("modal-title").textContent = title;
  el("modal-body").innerHTML = bodyHtml;
  el("modal-ft").innerHTML = footerHtml || '<button class="btn" onclick="closeModal()">Fechar</button>';
  el("modalbg").classList.add("open");
}
function closeModal(){el("modalbg").classList.remove("open")}

// ======================================================================
// THEME SYSTEM
// ======================================================================
// Each theme is just a body class — all colors/shapes/mist live in style.css
// (:root = Escuro/dark, body.modern = Claro/light, body.claude = Claude).
const THEMES = [
  {name:"Claro",  cls:"modern", icon:"☾"},
  {name:"Escuro", cls:"",       icon:"✦"},
  {name:"Claude", cls:"claude", icon:"☀︎"}
];
function applyTheme(t){
  document.body.classList.remove("modern","claude");
  const cls=t.cls!==undefined?t.cls:(t.modern?"modern":"");
  cls.split(" ").filter(Boolean).forEach(c=>document.body.classList.add(c));
  try{localStorage.setItem("dnd24_theme",JSON.stringify({name:t.name,cls}))}catch(e){}
  el("themename").textContent = t.name;
  const tb=el("themebtn");if(tb)tb.textContent=t.icon||"☾";
  document.querySelectorAll(".sw").forEach((s,i)=>s.classList.toggle("active",THEMES[i]&&THEMES[i].name===t.name));
}
function toggleTheme(){
  const cur=el("themename").textContent||"Escuro";
  const idx=THEMES.findIndex(t=>t.name===cur);
  applyTheme(THEMES[(idx+1+THEMES.length)%THEMES.length]||THEMES[0]);
}
function loadTheme(){
  try{
    const t=JSON.parse(localStorage.getItem("dnd24_theme"));
    if(t){applyTheme(THEMES.find(x=>x.name===t.name)||t);return}
  }catch(e){}
  applyTheme(THEMES[0]);
}

// ======================================================================
// HOME
// ======================================================================
