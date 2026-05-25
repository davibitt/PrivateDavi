"use strict";

// ======================================================================
// CONSTANTS & DATA LOOKUPS
// ======================================================================
const ABILS = ["str","dex","con","int","wis","cha"];
const ABIL_NAMES = {str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const ABIL_SHORT = {str:"STR",dex:"DEX",con:"CON",int:"INT",wis:"WIS",cha:"CHA"};

// Skills map: skill name → ability
const SKILLS = [
  ["Acrobatics","dex"],["Animal Handling","wis"],["Arcana","int"],["Athletics","str"],
  ["Deception","cha"],["History","int"],["Insight","wis"],["Intimidation","cha"],
  ["Investigation","int"],["Medicine","wis"],["Nature","int"],["Perception","wis"],
  ["Performance","cha"],["Persuasion","cha"],["Religion","int"],["Sleight of Hand","dex"],
  ["Stealth","dex"],["Survival","wis"]
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
              if(sp)out.push({spell:sp,source:sr.name+" (lv "+f.lvl+")",firstCol:g.firstCol||"oncelr",lineage:g.name});
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
  el("modal-ft").innerHTML = footerHtml || '<button class="btn" onclick="closeModal()">Close</button>';
  el("modalbg").classList.add("open");
}
function closeModal(){el("modalbg").classList.remove("open")}

// ======================================================================
// THEME SYSTEM
// ======================================================================
const THEMES = [
  {name:"Light",  modern:true, accent:"#0a0a0a",accent2:"#222222",bg:"#f4f4f5",bg2:"#ffffff",bg3:"#fafafa",card:"#ffffff",border:"#e6e6e8",text:"#0a0a0a",text2:"#737378",text3:"#a1a1aa",danger:"#dc2626",danger2:"#ef4444"},
  {name:"Dark",   accent:"#c8c8c8",accent2:"#e8e8e8",bg:"#000000",bg2:"#0d0d0d",bg3:"#161616",card:"#111111",border:"#2a2a2a",text:"#c8c8c8",text2:"#888888",text3:"#555555",danger:"#6a1414",danger2:"#e04545"}
];
function applyTheme(t){
  const r=document.documentElement.style;
  Object.keys(t).forEach(k=>{if(k==="name"||k==="modern")return;r.setProperty("--"+k.replace(/2$/,"2"),t[k])});
  document.body.style.background=t.bg;
  document.body.classList.toggle("modern",!!t.modern);
  try{localStorage.setItem("dnd24_theme",JSON.stringify(t))}catch(e){}
  el("themename").textContent = t.name;
  const tb=el("themebtn");if(tb)tb.textContent=t.name==="Dark"?"☀︎":"☾";
  document.querySelectorAll(".sw").forEach((s,i)=>s.classList.toggle("active",THEMES[i]&&THEMES[i].name===t.name));
}
function toggleTheme(){
  const cur=el("themename").textContent||"Dark";
  const next=cur==="Dark"?THEMES[0]:THEMES[1];
  applyTheme(next);
}
function applyCustom(hex){
  // Build theme from hex: derive accent/accent2/bg/card/etc
  function hexToHsl(h){h=h.replace("#","");const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let hue=0,s=0;const l=(max+min)/2;if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:hue=((g-b)/d+(g<b?6:0))/6;break;case g:hue=((b-r)/d+2)/6;break;case b:hue=((r-g)/d+4)/6;break}}return[Math.round(hue*360),s*100,l*100]}
  function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,"0")};return "#"+f(0)+f(8)+f(4)}
  const [h,s,l]=hexToHsl(hex);
  const t={name:"Custom",accent:hex,accent2:hslToHex(h,Math.min(100,s),Math.min(90,l+20)),
    bg:hslToHex(h,Math.max(20,s*.4),3),bg2:hslToHex(h,Math.max(20,s*.4),8),bg3:hslToHex(h,Math.max(20,s*.35),12),
    card:hslToHex(h,Math.max(15,s*.3),14),border:hslToHex(h,Math.max(15,s*.3),22),
    text:hslToHex(h,Math.max(20,s*.3),92),text2:hslToHex(h,Math.max(15,s*.25),68),text3:hslToHex(h,Math.max(10,s*.2),42),
    danger:hslToHex(h,Math.max(40,s),18),danger2:hslToHex(h,Math.max(40,s),35)};
  applyTheme(t);
}
function loadTheme(){try{const t=JSON.parse(localStorage.getItem("dnd24_theme"));if(t){applyTheme(t);return}}catch(e){}applyTheme(THEMES[0])}

// ======================================================================
// HOME
// ======================================================================
