'use strict';
// Survivor adaptations: mechanics and costs below describe this game, not PoE balance.
const BUILDCRAFT_SKILLS = [
  ['spectral_throw','Spectral Throw','ขว้างเงาอาวุธ','projectile',['Attack','Projectile','Physical'],26,0.9,{returning:true,pierce:99,life:0.65},['sword','axe','dagger']],
  ['spectral_helix','Spectral Helix','เกลียวอาวุธ','helix',['Attack','Projectile','Physical','Duration'],23,1.3,{},['sword','axe','dagger']],
  ['splitting_steel','Splitting Steel','เหล็กแตกกระจาย','steel',['Attack','Projectile','Physical'],19.2,0.9,{},['sword','axe']],
  ['blade_flurry','Blade Flurry','พายุคมสะสม','charge',['Attack','Melee','Channelling','Physical','AoE'],24,0.3,{},['sword','dagger']],
  ['bladestorm','Bladestorm','พายุใบดาบ','storm',['Attack','Melee','Physical','AoE','Duration'],22,1.4,{},['sword','axe']],
  ['rage_vortex','Rage Vortex','วังวนโทสะ','vortex',['Attack','Melee','Physical','AoE','Duration'],25,2.4,{},['sword','axe']],
  ['boneshatter','Boneshatter','บดกระดูก','trauma',['Attack','Melee','Strike','Physical','AoE'],48,0.8,{},['mace','axe','staff']],
  ['earthshatter','Earthshatter','หนามปฐพี','spikes',['Attack','Melee','Slam','Physical','AoE','Duration'],10.8,1.3,{},['mace','axe','staff']],
  ['volcanic_fissure','Volcanic Fissure of Snaking','รอยแยกเลื้อย','fissure',['Attack','Melee','Slam','Fire','AoE'],17.4,1.5,{types:{fire:0.7,physical:0.3}},['mace','axe','staff']],
  ['ice_crash','Ice Crash','น้ำแข็งถล่ม','crash',['Attack','Melee','Slam','Cold','AoE'],48,1.5,{types:{cold:0.7,physical:0.3}},['mace','sword','axe','staff']],
  ['shield_crush','Shield Crush','บดโล่','shield',['Attack','Melee','Physical','AoE'],32,1.0,{},['sword','mace','axe','dagger','sceptre']],
  ['shield_throw','Spectral Shield Throw','ขว้างเงาโล่','projectile',['Attack','Projectile','Physical'],35,1.1,{chain:3},['sword','mace','axe','dagger','sceptre']],
  ['lightning_strike','Lightning Strike','ฟาดสายฟ้า','lightstrike',['Attack','Melee','Projectile','Lightning','AoE'],20.4,1,{types:{physical:0.4,lightning:0.6},shock:0.3},['sword','axe','dagger','mace','sceptre']],
  ['elemental_hit','Elemental Hit of the Spectrum','ศรตรีธาตุ','projectile',['Attack','Projectile','Bow','Fire','Cold','Lightning'],32,1.0,{types:{fire:0.34,cold:0.33,lightning:0.33},ignite:0.2,shock:0.2,explode:true,area:55},['bow','wand']],
  ['galvanic_arrow','Galvanic Arrow','ธนูกรวยสายฟ้า','galvanic',['Attack','Bow','Projectile','Lightning','AoE'],28,0.95,{types:{lightning:1}},['bow']],
  ['storm_rain','Storm Rain','ตาข่ายสายฟ้า','rain',['Attack','Bow','Lightning','AoE','Duration'],10.8,1.2,{types:{lightning:1},shock:0.3},['bow']],
  ['artillery_ballista','Artillery Ballista','ป้อมปืนใหญ่','artillery',['Attack','Bow','Totem','Fire','AoE','Duration'],7,2,{types:{fire:1}},['bow']],
  ['kinetic_fusion','Kinetic Fusion','จลน์รวมพลัง (ออกแบบใหม่)','fusion',['Attack','Projectile','Physical','AoE'],65,2.2,{explode:true},['wand']],
  ['bladefall','Bladefall','ฝนใบมีด','blades',['Spell','Physical','AoE','Duration'],27,1.4,{},CASTER_WEAPONS],
  ['blade_blast','Blade Blast','ระเบิดใบมีด','blast',['Spell','Physical','AoE'],40,1.3,{},CASTER_WEAPONS],
  ['desecrate','Desecrate','สร้างศพ','corpses',['Spell','Chaos','AoE','Duration'],12,1.6,{types:{chaos:1}},CASTER_WEAPONS],
  ['detonate_dead','Detonate Dead','ระเบิดศพ','detonate',['Spell','Fire','AoE'],70,1.2,{types:{fire:1}},CASTER_WEAPONS],
  ['volatile_dead','Volatile Dead','ลูกไฟจากศพ','volatile',['Spell','Fire','Projectile','AoE'],38,1.4,{types:{fire:1},seek:true,explode:true},CASTER_WEAPONS],
  ['cremation','Cremation','ปล่องเผาศพ','cremation',['Spell','Fire','AoE','Duration'],27,2,{types:{fire:1}},CASTER_WEAPONS],
  ['hexblast','Hexblast','ระเบิดคำสาป','hex',['Spell','Chaos','AoE'],65,1.6,{types:{chaos:1}},CASTER_WEAPONS],
  ['lightning_conduit','Lightning Conduit','ระบายช็อก','conduit',['Spell','Lightning','AoE'],70,1.4,{types:{lightning:1}},CASTER_WEAPONS],
  ['holy_relic','Summon Holy Relic','วัตถุศักดิ์สิทธิ์','relic',['Spell','Minion','Physical','AoE'],30,1,{},null],
  ['summon_reaper','Summon Reaper','อัญเชิญยมทูต','minion',['Spell','Minion','Physical','Duration'],55,3,{maxCount:1,duration:30,speed:220,hitCd:0.8,minionSprite:'skeleton',reaper:true},null],
  ['dark_pact','Dark Pact','พันธสัญญามืด','pact',['Spell','Chaos','AoE'],35,1.2,{types:{chaos:1}},CASTER_WEAPONS],
  ['absolution','Absolution','พิพากษาปลดบาป','absolution',['Spell','Minion','Lightning','AoE','Duration'],32,1.3,{types:{lightning:1},maxCount:3,duration:12,speed:190,hitCd:0.8,minionSprite:'skeleton'},null],
  ['penance_brand','Penance Brand of Dissipation','ตราสะสมโทษ','penance',['Spell','Brand','Lightning','AoE','Duration'],20,2,{types:{lightning:1},maxCount:2,hitCd:0.5},CASTER_WEAPONS],
];
for (const [id,name,th,mode,tags,dmg,cd,base,weapons] of BUILDCRAFT_SKILLS) defSkill({id,name,th,gem:tags.includes('Spell')?'b':tags.includes('Bow')?'g':'r',icon:'✦',tags,
  behavior:mode==='projectile'?'projectile':mode==='minion'?'minion':'buildcraft',weapons:weapons||undefined,
  desc:th+' · '+({helix:'เกลียวออกจากจุดร่าย เดินล่อศัตรูผ่าน',steel:'ยิง 4 ครั้งแล้วเรียกเศษเหล็กระเบิด',charge:'ยืนนิ่งสะสม 6 ขั้น เดินเพื่อปล่อยชุดฟัน',storm:'ทิ้งพายุ 3 วิ ณ จุดฟัน',vortex:'สะสมโทสะขณะเดินแล้วปล่อยวงดาบ',trauma:'ตีสะสม Trauma แลกชีวิต 1% ต่อขั้น (ไม่ต่ำกว่าครึ่งหลอด)',spikes:'วางหนาม 5 จุด Dash เพื่อระเบิด',fissure:'รอยแยกไล่เป้า 4 ครั้ง',crash:'ใจกลางแรง วงนอกเบาลง',shield:'ต้องถือโล่ ดาเมจเพิ่มตาม Armour/Evasion ของโล่',lightstrike:'ฟาดใกล้พร้อมกระสุนสายฟ้า',galvanic:'ลูกธนูพร้อมกรวยประชิด',rain:'ปักจุดสายฟ้า เชื่อมจุดที่อยู่ใกล้กัน',artillery:'ตั้งป้อมยิงระเบิดเป็นแนว',fusion:'กระสุนหนัก ทุก 3 นัดระเบิดใหญ่',blades:'ทิ้งใบมีดไว้ให้ Blade Blast',blast:'ระเบิดใบมีดใกล้ตัว (ถ้าไม่มีใบมีดระเบิดเล็ก)',corpses:'สร้างศพจำลอง 3 ศพและทำเคออส',detonate:'ใช้ศพ 1 ศพ ระเบิดไฟ (ต้องมีศพ)',volatile:'ใช้ศพสร้างลูกไฟไล่เป้า',cremation:'ใช้ศพสร้างปล่องยิง 5 วิ',hex:'กิน Hex เพื่อระเบิดวงกว้าง ดาเมจ ×1.8',conduit:'กิน Shock เพื่อดาเมจ ×2.2 (ไม่ Shock เอง)',relic:'Attack ของคุณกระตุ้นโนวา มีคูลดาวน์ 0.8 วิ',pact:'กินอายุโครงกระดูก 2 วิ ระเบิดจากมินเนียน; ไม่มีใช้ชีวิต 3% (ไม่ต่ำกว่าครึ่งหลอด)',absolution:'สายฟ้าสร้าง Sentinel เมื่อฆ่าหรือ Hit บอส 3 ครั้ง',penance:'ติดตราเดิมสะสมพลังสูงสุด 10 ขั้น',minion:'ยมทูตกินอายุมินเนียนอื่นเพื่อเสริมการฟัน'}[mode]||'จัดระยะและเชื่อม Support เพื่อสร้างบิว'),
  color:tags.includes('Fire')?'#ff965b':tags.includes('Lightning')?'#d1c3ff':tags.includes('Chaos')?'#bb88ef':'#b8daeb',core:'#fff8df',
  base:{dmg,cd,types:{physical:1},area:95,range:440,duration:5,proj:1,speed:520,life:1.1,size:9,mode,...base},scale(s,l){s.area*=1+0.008*(l-1);},levelNote:'ทุกเลเวล: ดาเมจและพื้นที่เพิ่ม'});

const BUILDCRAFT_SUPPORTS = [
 ['trap','Trap',['Spell','Projectile'],{delivery:'trap'},0.85],['cluster_traps','Cluster Traps',['Trap'],{trapCount:3},0.6],['multiple_traps','Multiple Traps',['Trap'],{trapLine:true,trapCount:3},0.65],
 ['blastchain_mine','Blastchain Mine',['Spell','Projectile'],{delivery:'mine'},0.75],['high_impact_mine','High-Impact Mine',['Spell','Projectile'],{delivery:'impact'},0.8],['locus_mine','Locus Mine',['Projectile'],{delivery:'locus'},0.65],
 ['cast_on_crit','Cast on Critical Strike',['Attack'],{triggerMode:'crit'},0.8],['cast_while_channelling','Cast while Channelling',['Channelling'],{triggerMode:'channel'},0.85],['cast_on_melee_kill','Cast on Melee Kill',['Melee'],{triggerMode:'kill'},0.9],['spellslinger','Spellslinger',['Attack'],{triggerMode:'sling'},0.8],['prismatic_burst','Prismatic Burst',['Attack'],{prismatic:true},0.85],['arcanist_brand','Arcanist Brand',['Spell'],{delivery:'brand'},0.65],
 ['fist_of_war','Fist of War',['Slam'],{fistWar:true},1],['shockwave','Shockwave',['Melee'],{shockwave:true},0.9],['trauma_support','Trauma',['Melee'],{traumaSupport:true},1],['rage_support','Rage',['Attack'],{rageSupport:true},1],['fleeing','Fleeing (ออกแบบใหม่)',['Attack'],{fleeing:true},0.85],['bloodlust','Bloodlust',['Melee'],{bloodlust:true},1],
 ['predator','Predator',['Minion'],{predator:true},1],['meat_shield','Meat Shield',['Minion'],{meatShield:true},0.85],['fresh_meat','Fresh Meat',['Minion'],{freshMeat:true},1],['infernal_legion','Infernal Legion',['Minion'],{infernalLegion:true},0.8],['minion_instability','Minion Instability (ดัดแปลง)',['Minion'],{minionBoom:true,unstable:true},0.85],['summon_phantasm','Summon Phantasm',['Attack','Spell'],{phantasm:true},0.85],
];
if (!SKILLS.earthquake.tags.includes('Slam')) SKILLS.earthquake.tags.push('Slam');
const BUILDCRAFT_SUPPORT_TEXT = ['วางกับดักแทนร่าย รอ 0.5 วิ ศัตรูเข้าระยะ 110 จึงทำงาน อายุ 5 วิ','กระจายกับดัก 3 อัน','วางกับดัก 3 อันเป็นแนว','ทุ่นระเบิดเป็นชุดหลัง 1.2 วิ ดอกท้ายแรงขึ้น','ทุ่นรอ 1.8 วิ ยิ่งมีทุ่นใกล้กันยิ่งแรง','วางทุ่น 3 อัน ยิงเข้าหาตำแหน่งผู้เล่นเมื่อระเบิด','Attack คริกระตุ้น Spell ถัดไปในแถบสกิล คูลดาวน์ 0.5 วิ','ขณะ Channel กระตุ้น Spell ถัดไปทุก 0.8 วิ','ฆ่าด้วย Melee หรือ Hit บอส 3 ครั้ง กระตุ้น Spell ถัดไป','Attack ไม้กายสิทธิ์กระตุ้น Spell ถัดไปทุก 0.9 วิ','Hit กระตุ้นระเบิดสุ่มธาตุทุก 1 วิ','ร่ายเวทจากตราที่เกาะเป้า 4 วิ','ทุก 2.5 วิ Slam แรง ×1.8 และกว้างขึ้น','Mace/Sceptre/Staff: Hit ปล่อยคลื่นทุก 1 วิ','ตีสะสม Trauma สูงสุด 8 แลกชีวิต (ไม่ต่ำกว่าครึ่งหลอด)','Attack สะสม Rage 8 ขั้น เดินพัก 2 วิเพื่อล้าง','ผลักศัตรูทั่วไปออกแรง แลกดาเมจ','สร้าง Bleed เองไม่ได้ แต่ตีเป้าที่ Bleed ×1.6','มินเนียนเลือกเป้าระดับสูงสุดในระยะก่อน','มินเนียนอยู่ใกล้คุณ คอยผลักศัตรู','มินเนียนเกิดใหม่ 2 วิแรกดาเมจ ×1.8','มินเนียนเผารอบตัว อายุลดเร็วขึ้น','มินเนียนอายุสั้นลงครึ่งหนึ่งและระเบิดตอนหมดอายุ','Hit ทุก 2 วิเรียก Phantasm ยิงไกลสูงสุด 3 ตัว'];
BUILDCRAFT_SUPPORTS.forEach(([id,name,req,fields,mul],i)=>defSupport({id,name,th:name,gem:i<12?'b':i<18?'r':'g',req,desc:BUILDCRAFT_SUPPORT_TEXT[i]+(mul<1?' · ดาเมจ '+Math.round((1-mul)*100)+'% less':''),addTags:id==='trap'?['Trap']:id.includes('mine')?['Mine']:[],apply(s){Object.assign(s,fields);s.more*=mul;}}));
const DELIVERY_SUPPORTS=['trap','blastchain_mine','high_impact_mine','locus_mine','arcanist_brand','spell_totem','ballista_totem','mirage_archer'];
for(const id of DELIVERY_SUPPORTS) for(const other of DELIVERY_SUPPORTS) if(id!==other&&!SUPPORTS[id].conflicts.includes(other)) SUPPORTS[id].conflicts.push(other);
for(const id of ['cluster_traps','multiple_traps']) SUPPORTS[id].conflicts.push(id==='cluster_traps'?'multiple_traps':'cluster_traps');
for(const id of ['cast_on_crit','cast_while_channelling','cast_on_melee_kill','spellslinger']) SUPPORTS[id].conflicts.push(...DELIVERY_SUPPORTS,...['cast_on_crit','cast_while_channelling','cast_on_melee_kill','spellslinger'].filter(x=>x!==id));
for(const d of BUILDCRAFT_SKILLS) EVOLUTIONS[d[0]]={name:'Vaal '+d[1],req:['inc_aoe','inc_crit','added_fire'],desc:'ร่างดัดแปลง: พื้นที่ +20% · ดาเมจ 20% more',apply(s){s.area*=1.2;s.more*=1.2;}};

const BUILDCRAFT_UNIQUES = [
 ['helix_anchor','Anchor of the Spiral','rusted_sword','spectral_throw','Spectral Throw กลายเป็นเกลียวค้างที่จุดร่าย แลกการย้อนกลับ',s=>{s.behavior='buildcraft';s.mode='helix';s.returning=false;}],
 ['storm_garden','Storm Garden','long_bow','storm_rain','Storm Rain จุดสายฟ้าตามตัวคุณแทนอยู่กับที่ · ระยะเชื่อมสั้นลง',s=>{s.followGarden=true;}],
 ['blade_hourglass','Blade Hourglass','amber_amulet','blade_vortex','Blade Vortex หมุนรอบจุดที่ร่ายล่าสุดแทนตัวคุณ · ต้องกลับไปเติมใบมีด',s=>{s.anchoredOrbit=true;}],
 ['frost_relay','Frost Relay','silk_hood','ice_nova','Ice Nova ระเบิดจาก Frostbolt ใกล้สุดไม่เกิน 2 ลูก; ไม่มีลูกระเบิดจากตัวตามเดิม',s=>{s.frostRelay=true;s.more*=0.8;}],
 ['grave_furnace','Grave Furnace','chain_tunic','raise_zombie','Zombie อายุเหลือ 4 วิ เผารอบตัวและระเบิดเมื่อหมดอายุ',s=>{s.duration=4;s.infernalLegion=true;s.minionBoom=true;}],
 ['reapers_covenant','Reaper Covenant','amethyst_ring','summon_reaper','Reaper ไม่กินบริวาร เปลี่ยนเป็นคุ้มกันใกล้คุณและผลักศัตรู',s=>{s.reaper=false;s.meatShield=true;s.knock+=50;}],
 ['faultline_boots','Faultline','leather_boots','earthshatter','หนาม Earthshatter ระเบิดเองหลัง 1 วิ แทนรอ Dash · ดาเมจ 25% less',s=>{s.autoSpikes=true;s.more*=0.75;}],
 ['hex_reservoir','Hex Reservoir','amethyst_ring','hexblast','Hexblast ไม่กิน Hex แต่ระเบิดซ้ำหลัง 0.5 วิที่จุดเดิม ดาเมจซ้ำ 40%',s=>{s.hexEcho=true;}],
 ['cinder_walker','Cinder Walker','leather_boots','righteous_fire','RF ทิ้งวงไฟที่จุดร่าย 2 วิแทนติดตัว · วงไฟทับกันไม่บวกดาเมจ',s=>{s.behavior='buildcraft';s.mode='rftrail';s.cd=0.5;}],
 ['shatter_clock','Shatter Clock','iron_gauntlets','boneshatter','Trauma ครบ 6 ขั้น ระเบิดแล้วรีเซ็ต แทนสะสมต่อ · ระเบิดไม่เพิ่ม Trauma',s=>{s.traumaRelease=true;}],
 ['steel_magnet','Steel Magnet','amber_amulet','splitting_steel','เรียกเศษเหล็กกลับทุก 2 ครั้งแทน 4 · ระเบิดเล็กลง 30%',s=>{s.steelCycle=2;s.area*=0.7;}],
 ['relic_procession','Relic Procession','silk_robe','holy_relic','Relic โนวาจากมินเนียนใกล้สุดแทนตัวคุณ สูงสุด 3 ตัว · ดาเมจ 40% less',s=>{s.relicProcession=true;s.more*=0.6;}],
];
for(const [id,name,base,skill,line,hook] of BUILDCRAFT_UNIQUES){
 const b=BASES[base]; if(!b) throw new Error('Unknown unique base '+base);
 UNIQUES[id]={name,th:name,base,slot:b.slot,flavor:'เส้นทางเดิม เปลี่ยนไปเมื่อสวมใส่',lines:[line,'กลไกดัดแปลงสำหรับ Exile Survivors'],apply(){},skill(s,sid){if(sid===skill)hook(s);}};
}


// Conflicts are symmetric, including delivery/trigger combinations from saved sockets.
for (const [id] of BUILDCRAFT_SUPPORTS) for (const other of SUPPORTS[id].conflicts) if (SUPPORTS[other] && !SUPPORTS[other].conflicts.includes(id)) SUPPORTS[other].conflicts.push(id);
