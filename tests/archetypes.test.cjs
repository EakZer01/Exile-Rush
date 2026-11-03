const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
function sandbox() {
  const g = game();
  g.run(`function setup(id,weapon='gnarled_staff'){
    startGame(CLASSES[0]);G.player.equip.weapon=makeNormal(weapon);const i=newSkillInstance(id);G.player.skills=[i];recomputePlayer();G.enemies=[];
    for(let n=0;n<6;n++){const e=makeEnemy('zombie',80+n*35,(n%2)*20,0);e.hp=e.maxHp=1e7;e.speed=0;e.dmg=0;G.enemies.push(e);}G.hash.clear();G.enemies.forEach(e=>G.hash.insert(e));return i;}
    function equip(id){const u=UNIQUES[id];G.player.equip[u.slot]={uid:uid(),slot:u.slot,base:u.base,unique:id,affixes:[],quality:0,ilvl:1};recomputePlayer();}`);
  return g;
}
test('Exsanguinate chains, costs life, and its separate physical DoT caps at three stacks per target', () => {
  const {run}=sandbox();run(`const i=setup('exsanguinate');const life=G.player.life;for(let n=0;n<6;n++)castSkill(i,i.st);`);
  assert.ok(run('G.player.life<life'));assert.equal(run('archetypeState().dots.filter(d=>d.target===G.enemies[0]).length'),3);
  assert.ok(run('G.enemies.filter(e=>e.hp<e.maxHp).length')>=3);
  run('const hp=G.enemies[0].hp;updateArchetypes(0.5);');assert.ok(run('G.enemies[0].hp<hp'));assert.equal(run('G.enemies[0].bleeds.length'),0);
});
test('Reap charges raise damage and life cost; charges cap and kills reduce them', () => {
  const {run}=sandbox();run(`const i=setup('reap');castSkill(i,i.st);const first=i.dmgDealt;castSkill(i,i.st);const second=i.dmgDealt-first;for(let n=0;n<8;n++)castSkill(i,i.st);`);
  assert.ok(run('second>first'));assert.equal(run('i.rt.bloodCharges'),5);
  run(`G.enemies[0].hp=1;castSkill(i,i.st);`);assert.ok(run('i.rt.bloodCharges<5'));
});
test('Forbidden Rite scales from life and ES; Chaos resistance mitigates its bounded life cost', () => {
  const {run}=sandbox();run(`const i=setup('forbidden_rite');const base=i.st.hitTotal;G.player.baseLife*=2;recomputePlayer();`);assert.ok(run('i.st.hitTotal>base'));
  run('const life=G.player.life;castSkill(i,i.st);const lost=life-G.player.life;');assert.ok(run('lost>0'));
  run(`G.player.life=G.player.maxLife;G.player.resRaw.chaos=0.75;const full=G.player.life;castSkill(i,i.st);`);assert.ok(run('full-G.player.life<lost'));
  run(`G.player.mods.ks.ci=true;G.player.es=G.player.maxES=100;const es=G.player.es;castSkill(i,i.st);`);assert.equal(run('G.player.es'),run('es'));
});
test('Eye of Winter emits from a moving parent, extra projectiles affect final burst, and state is bounded', () => {
  const {run}=sandbox();run(`const i=setup('eye_of_winter');castSkill(i,i.st);updateArchetypes(0.2);`);
  assert.ok(run('archetypeState().eyes[0].x>0'));assert.equal(run('G.projectiles.length'),2);
  run(`G.projectiles=[];i.supports=['gmp'];recomputePlayer();updateArchetypes(2);`);
  assert.equal(run('G.projectiles.length'),run('8+i.st.proj'));assert.equal(run('archetypeState().eyes.length'),0);
  run(`for(let n=0;n<20;n++)castSkill(i,i.st);`);assert.equal(run('archetypeState().eyes.length'),6);
});
test('Tempest Bell requires combo and staff attacks, has limited uses, and cannot pulse recursively', () => {
  const {run}=sandbox();run(`const bell=setup('tempest_bell'),attack=newSkillInstance('heavy_strike');G.player.skills.push(attack);recomputePlayer();`);
  assert.equal(run('castSkill(bell,bell.st)'),false);
  run(`for(let n=0;n<4;n++){G.time+=0.2;hitEnemy(G.enemies[0],attack.st,attack,1,0,0);}castSkill(bell,bell.st);const b=archetypeState().bells[0];`);
  assert.equal(run('archetypeState().bells.length'),1);assert.equal(run('b.uses'),10);
  run(`G.time+=0.2;hitEnemy(G.enemies[0],attack.st,attack,1,0,0);`);assert.equal(run('b.uses'),9);assert.ok(run('bell.dmgDealt>0'));
  run(`archetypeAfterHit(G.enemies[0],reactionSecondary(attack.st),attack);`);assert.equal(run('b.uses'),9);
});
test('Herald of Plague transfers strongest poison, respects immunity and the three-hop limit', () => {
  const {run}=sandbox();run(`const i=setup('herald_of_plague');const e=G.enemies[0];e.poison=[{dps:10,t:4},{dps:100,t:4}];G.enemies[1].ailImmune=true;killEnemy(e,i);`);
  assert.equal(run('G.enemies[1].poison.length'),0);assert.equal(run('G.enemies[2].poison[0].dps'),75);
  assert.equal(run('G.enemies[2].poison[0].plagueHop'),1);
  run(`const e2=G.enemies[2];e2.poison=[{dps:100,t:4,plagueHop:3}];G.enemies[3].poison=[];killEnemy(e2,i);`);assert.equal(run('G.enemies[3].poison.length'),0);
  assert.notEqual(run(`supportBlockReason('inc_crit',i,true)`),'');
});
test('Coursing Current supplies Shock from cold hits but Elemental Focus suppresses both ailments', () => {
  const {run}=sandbox();run(`const i=setup('frostbolt');i.supports=['coursing_current'];recomputePlayer();hitEnemy(G.enemies[0],i.st,i,1,0,0);`);assert.ok(run('G.enemies[0].shock.t>0'));
  run(`i.supports=['coursing_current','elemental_focus'];recomputePlayer();const e=G.enemies[1];hitEnemy(e,i.st,i,1,0,0);`);assert.equal(run('e.chill.t+e.shock.t'),0);
});
test('Crystalfall has a delay, a cooldown and a non-recursive secondary blast', () => {
  const {run}=sandbox();run(`const i=setup('earthquake');i.supports=['crystalfall'];recomputePlayer();hitEnemy(G.enemies[0],i.st,i,1,0,0);hitEnemy(G.enemies[0],i.st,i,1,0,0);const dmg=i.dmgDealt;`);
  assert.equal(run('archetypeState().falling.length'),1);run('updateArchetypes(0.2)');assert.equal(run('i.dmgDealt'),run('dmg'));
  run('updateArchetypes(0.4)');assert.ok(run('i.dmgDealt>dmg'));assert.equal(run('archetypeState().falling.length'),0);
});
test('Communion counts living long-lived minions at hit time and stops when they expire', () => {
  const {run}=sandbox();run(`const i=setup('ethereal_knives');i.supports=['communion'];recomputePlayer();const s={...i.st,noCrit:true,critChance:0};const a=hitEnemy(G.enemies[0],s,i,1,0,0);const zombie=newSkillInstance('raise_zombie');G.player.skills.push(zombie);recomputePlayer();craftSummon(zombie,zombie.st,0,0);const b=hitEnemy(G.enemies[0],s,i,1,0,0);`);
  assert.ok(run('b>a*1.05'));run('G.minions[0].t=1;const c=hitEnemy(G.enemies[0],s,i,1,0,0);');assert.equal(run('c'),run('a'));
  assert.notEqual(run(`supportBlockReason('communion',newSkillInstance('wintertide_brand'),true)`),'');
});
test('Whispering Ice grants a real damaging skill without spending a slot and removes storms on unequip', () => {
  const {run}=sandbox();run(`setup('frostbolt');equip('whispering_ice');const slots=G.player.skills.length;updateArchetypes(1);updateArchetypes(1);`);
  assert.equal(run('G.player.skills.length'),run('slots'));assert.ok(run('archetypeState().ice.dmgDealt>0'));
  run(`G.player.equip.weapon=makeNormal('gnarled_staff');recomputePlayer();updateArchetypes(0.1);`);assert.equal(run('archetypeState().ice'),null);assert.equal(run('archetypeState().storms.length'),0);
});
test('Voltaxic converts added and base lightning to chaos, enables chaos supports and lets chaos Shock', () => {
  const {run}=sandbox();run(`const i=setup('lightning_arrow','short_bow');equip('voltaxic_rift');i.supports=['void_manipulation'];recomputePlayer();`);
  assert.equal(run('activeSupports(i).active.includes("void_manipulation")'),true);assert.ok(run('i.st.hit.chaos>0'));assert.equal(run('i.st.hit.lightning||0'),0);
  run(`const s={...i.st,shock:1,noCrit:true};hitEnemy(G.enemies[0],s,i,1,0,0);`);assert.ok(run('G.enemies[0].shock.t>0'));
  run(`G.player.equip.weapon=makeNormal('short_bow');recomputePlayer();`);assert.ok(run('i.st.hit.lightning>0'));assert.equal(run('activeSupports(i).active.includes("void_manipulation")'),false);
});
test('Doryani changes nearby enemy resistance and actual incoming lightning mitigation', () => {
  const {run}=sandbox();run(`const i=setup('arc');equip('doryanis_prototype');G.player.resRaw.lightning=-0.3;const s={...i.st,noCrit:true,shock:0,noAilment:true};const near=hitEnemy(G.enemies[0],s,i,1,0,0);G.enemies[0].x=400;const far=hitEnemy(G.enemies[0],s,i,1,0,0);`);
  assert.ok(run('near>far*1.2'));
  run(`const f=newSkillInstance('fireball');G.player.skills.push(f);recomputePlayer();`);assert.equal(run('f.st.hitTotal'),0);
  run(`G.player.life=G.player.maxLife=10000;G.player.block=0;G.player.evasion=0;G.player.armour=1200;G.player.iframes=0;G.player.resRaw.lightning=-0.3;hurtPlayer(100,'test','proj','lightning');const hit=G.dmgLog.at(-1).taken;G.player.iframes=0;hurtPlayer(100,'test','area','lightning');const area=G.dmgLog.at(-1).taken;`);
  assert.ok(run('hit<area'));
});
test('new gems, evolved forms and granted skill render and item-only skills never roll as starters', () => {
  const {run}=sandbox();for(const [id] of run('ARCHETYPE_SKILLS'))run(`const i_${id}=setup('${id}');i_${id}.evo=true;recomputePlayer();skillIcon('${id}');render();`);
  run(`setup('fireball');equip('whispering_ice');updateArchetypes(0.1);skillIcon('icestorm');render();startGame(CLASSES[0]);`);
  assert.equal(run('archetypeState().dots.length+archetypeState().bells.length+archetypeState().eyes.length'),0);
  assert.equal(run(`Array.from({length:80},()=>{startGame(CLASSES.find(c=>c.id==='scion'));return G.player.skills[0].id}).includes('icestorm')`),false);
});
test('Voltaxic support dependencies resolve in either socket order and grant damage appears in build stats', () => {
  const {run}=sandbox();run(`const i=setup('lightning_arrow','short_bow');equip('voltaxic_rift');`);
  assert.notEqual(run(`supportBlockReason('light_pen',i,true)`),'');
  for(const order of [['elemental_attacks','added_cold'],['added_cold','elemental_attacks']]) {
    run(`i.supports=${JSON.stringify(order)};recomputePlayer();`);assert.equal(run('activeSupports(i).active.length'),2);
  }
  run(`setup('frostbolt');equip('whispering_ice');updateArchetypes(0.5);updateArchetypes(0.5);`);
  assert.ok(run(`buildViewHtml(false).includes('Icestorm')`));assert.ok(run(`runRecord(false).skills.some(s=>s.id==='icestorm'&&s.dmg>0)`));
});
test('Forbidden Rite gear preview uses candidate life and ES without changing the real player', () => {
  const {run}=sandbox();run(`setup('forbidden_rite');const before=statSnapshot(G.player.equip),life=G.player.maxLife;const body=makeNormal('plate_vest');body.affixes=[{id:'lifeflat',v:100}];const candidate={...G.player.equip,body};const after=statSnapshot(candidate);`);
  assert.ok(run('Number.isFinite(before.dps)&&Number.isFinite(after.dps)'));
  assert.ok(run('after.life>before.life&&after.dps>before.dps'));
  assert.equal(run('G.player.maxLife'),run('life'));
  // Build the CI modifier directly: this preview uses the candidate's life converted to ES.
  run(`const fake={mods:{...G.player.mods,ks:{...G.player.mods.ks,ci:true}},equip:G.player.equip,maxLife:1,maxES:500,weapon:G.player.weapon};`);
  assert.ok(run('Number.isFinite(buildSkillStats(G.player.skills[0],fake).hitTotal)'));
});
test('Doryani also suppresses handcrafted spider chaos damage and poison', () => {
  const {run}=sandbox();run(`const i=setup('viper_strike','glass_shank');equip('arakaalis_fang');equip('doryanis_prototype');i.supports=['added_lightning'];recomputePlayer();const e=G.enemies[0],s=reactionSpiderSource(i),hp=e.hp;hitEnemy(e,s,i,1,0,0);`);
  assert.equal(run('s.hitTotal'),0);assert.equal(run('e.hp'),run('hp'));assert.equal(run('e.poison.length'),0);
  run(`const burst={...reactionSecondary(i.st),hit:{fire:100},hitTotal:100,ignite:1};hitEnemy(e,burst,i,1,0,0);`);
  assert.equal(run('e.hp'),run('hp'));assert.equal(run('e.ign.t'),0);
});
