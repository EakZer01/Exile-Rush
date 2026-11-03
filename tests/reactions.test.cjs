const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
function sandbox() {
  const g = game();
  g.run(`
    function setup(id, weapon='gnarled_staff') {
      startGame(CLASSES[0]); G.player.equip.weapon=makeNormal(weapon);
      const i=newSkillInstance(id); G.player.skills=[i]; recomputePlayer();
      G.enemies=[];const e=makeEnemy('zombie',180,0,0);e.hp=e.maxHp=1e7;e.dmg=0;e.speed=0;
      G.enemies.push(e);G.hash.clear();G.hash.insert(e);return i;
    }
    function equipUnique(id){const u=UNIQUES[id];G.player.equip[u.slot]={uid:uid(),slot:u.slot,base:u.base,unique:id,affixes:[],quality:0,ilvl:1};recomputePlayer();}
  `);
  return g;
}
test('Frost Wall blocks regular enemies, bosses crush it, and expiry is harmless', () => {
  const {run}=sandbox(); run(`const i=setup('frost_wall');castSkill(i,i.st);const w=reactionState().walls[2],e=G.enemies[0];e.x=w.x+8;e.y=w.y;reactionBlockEnemy(e,w.x+45,w.y,1/60);`);
  assert.ok(run('Math.hypot(e.x-w.x,e.y-w.y)>=w.r+e.r'));
  run('e.rarity=3;e.x=w.x;e.y=w.y;reactionBlockEnemy(e,w.x+45,w.y,1/60);');
  assert.equal(run('reactionState().walls.includes(w)'),false);
  run('const dmg=i.dmgDealt;updateReactions(7);');assert.equal(run('i.dmgDealt'),run('dmg'));
});
test('swept projectiles shatter crystals once and secondary explosions cannot cascade', () => {
  const {run}=sandbox();run(`const wall=setup('frost_wall');castSkill(wall,wall.st);const shot=newSkillInstance('ice_spear');G.player.skills.push(shot);recomputePlayer();G.time=1;const w=reactionState().walls[2];spawnProjectile(shot,shot.st,w.x-100,w.y,0,null);const bullet=G.projectiles[0];bullet.x=w.x+100;bullet.s={...bullet.s,hitTotal:1e6};reactionProjectile(bullet,w.x-100,w.y);`);
  assert.equal(run('reactionState().walls.includes(w)'),false);
  assert.equal(run('reactionState().walls.length'),4);
  run('reactionImpact(shot,reactionSecondary(shot.st),0,0,1000,1e9);');assert.equal(run('reactionState().walls.length'),4);
});
test('Gas Grenade has a fuse, nonstacking DoT, and fire consumes the cloud once', () => {
  const {run}=sandbox();run(`const gas=setup('gas_grenade','short_bow');castSkill(gas,gas.st);updateReactions(0.4);`);
  assert.equal(run('reactionState().clouds.length'),0);
  run('G.time=1;updateReactions(0.5);const hp=G.enemies[0].hp;');assert.equal(run('reactionState().clouds.length'),1);
  run(`reactionState().clouds.push({...reactionState().clouds[0],tick:0});updateReactions(0.01);`);assert.equal(run('G.enemies[0].hp'),run('hp'));
  run(`const fire=newSkillInstance('burning_arrow');G.player.skills.push(fire);recomputePlayer();const c=reactionState().clouds[0];reactionImpact(fire,fire.st,c.x,c.y,10,1);const dmg=gas.dmgDealt;reactionIgnite(c);`);
  assert.equal(run('gas.dmgDealt'),run('dmg'));assert.equal(run('reactionState().clouds.length'),0);
});
test('fire supports scale the gas explosion through the fire damage path', () => {
  const {run}=sandbox();run(`const gas=setup('gas_grenade','short_bow');const before=buildSkillStats(gas,G.player,{fire:1}).hitTotal;gas.supports=['elemental_attacks'];recomputePlayer();`);
  assert.ok(run('buildSkillStats(gas,G.player,{fire:1}).hitTotal>before*1.3'));
});
test('Gas Grenade uses global additional projectile bonuses for grenade coverage', () => {
  const {run}=sandbox();run(`const gas=setup('gas_grenade','short_bow');G.player.mods.projAdd=2;gas.st=buildSkillStats(gas,G.player);castSkill(gas,gas.st);`);
  assert.equal(run('gas.st.proj'),3);assert.equal(run('reactionState().grenades.length'),3);
});
test('Ignite and RF can ignite gas; a chaos hit cannot', () => {
  const {run}=sandbox();run(`const gas=setup('gas_grenade','short_bow');castSkill(gas,gas.st);G.time=1;updateReactions(1);reactionImpact(gas,gas.st,180,0,30,100);`);
  assert.equal(run('reactionState().clouds.length'),1);
  run('G.enemies[0].ign.t=2;updateReactions(0.01);');assert.equal(run('reactionState().clouds.length'),0);
  run(`G.enemies[0].ign.t=0;castSkill(gas,gas.st);updateReactions(1);const rf=newSkillInstance('righteous_fire');G.player.skills.push(rf);recomputePlayer();G.player.x=180;updateReactions(0.01);`);
  assert.equal(run('reactionState().clouds.length'),0);
});
test('Magnetic Salvo consumes only nearby live Storm Rain nodes and detonates after its delay', () => {
  const {run}=sandbox();run(`const salvo=setup('magnetic_salvo','short_bow');`);assert.equal(run('castSkill(salvo,salvo.st)'),false);
  run(`const rain=newSkillInstance('storm_rain');G.player.skills.push(rain);recomputePlayer();castSkill(rain,rain.st);craftNode({kind:'spike',i:rain,s:rain.st,x:180,y:0,ttl:5,age:0});const before=salvo.dmgDealt;castSkill(salvo,salvo.st);`);
  assert.equal(run('craftState().nodes.filter(n=>n.kind==="rain").length'),0);assert.equal(run('craftState().nodes.length'),1);
  assert.equal(run('salvo.dmgDealt'),run('before'));run('updateReactions(0.4)');assert.ok(run('salvo.dmgDealt>before'));
  assert.equal(run('craftSkillUsable("magnetic_salvo",G.player)'),true);
});
test('Mjolner selects lightning spells only, owns their casts, and shares a cooldown across attacks', () => {
  const {run}=sandbox();run(`const hit=setup('heavy_strike','driftwood_club'),fire=newSkillInstance('fireball'),arc=newSkillInstance('arc'),other=newSkillInstance('ground_slam');G.player.skills.push(fire,arc,other);equipUnique('mjolner');`);
  assert.equal(run('craftTriggerTarget(hit)===arc'),true);assert.equal(run('craftOwnsTrigger(arc)'),true);assert.equal(run('craftOwnsTrigger(fire)'),false);
  run('hitEnemy(G.enemies[0],hit.st,hit,1,0,0);const dmg=arc.dmgDealt;hitEnemy(G.enemies[0],other.st,other,1,0,0);');assert.ok(run('dmg>0'));assert.equal(run('arc.dmgDealt'),run('dmg'));
  run('G.time+=0.81;hitEnemy(G.enemies[0],hit.st,hit,1,0,0);');assert.ok(run('arc.dmgDealt>dmg'));
  run(`G.player.equip.weapon=makeNormal('driftwood_club');recomputePlayer();`);assert.equal(run('craftOwnsTrigger(arc)'),false);
});
test('Arakaali consumes corpses on kill, has a boss fallback, applies poison, and clears on unequip', () => {
  const {run}=sandbox();run(`const hit=setup('viper_strike','glass_shank');equipUnique('arakaalis_fang');G.enemies[0].hp=1;hitEnemy(G.enemies[0],hit.st,hit,1,0,0);`);
  assert.equal(run('reactionState().spiders.length'),2);assert.equal(run('craftState().corpses.length'),0);
  run(`const boss=makeEnemy('zombie',180,0,0);boss.rarity=3;boss.hp=boss.maxHp=1e8;G.enemies.push(boss);G.hash.insert(boss);G.time=2;for(let n=0;n<6;n++)hitEnemy(boss,hit.st,hit,1,0,0);updateReactions(0.1);`);
  assert.equal(run('reactionState().spiders.length'),3);assert.ok(run('boss.poison.length>0'));
  run(`G.player.equip.weapon=makeNormal('glass_shank');recomputePlayer();updateReactions(0.01);`);assert.equal(run('reactionState().spiders.length'),0);
});
test('Sire changes real projectile angles and restores ordinary targeting after removal', () => {
  const {run}=sandbox();run(`const i=setup('fireball');const base=i.st.proj;equipUnique('sire_of_shards');castSkill(i,i.st);`);
  assert.equal(run('G.projectiles.length'),run('base+4'));assert.ok(run('G.projectiles.some(p=>p.vx<0)'));
  run(`G.player.equip.weapon=makeNormal('gnarled_staff');recomputePlayer();G.projectiles=[];castSkill(i,i.st);`);assert.equal(run('G.projectiles.length'),run('base'));assert.ok(run('G.projectiles.every(p=>p.vx>0)'));
});
test('all reaction skills render evolved and support rules reject flight-only and delivery no-ops', () => {
  const {run}=sandbox();for(const id of ['frost_wall','gas_grenade','magnetic_salvo']) {
    run(`const i_${id}=setup('${id}',${id==='frost_wall'?"'gnarled_staff'":"'short_bow'"});i_${id}.evo=true;recomputePlayer();castSkill(i_${id},i_${id}.st);skillIcon('${id}');render();`);
    assert.equal(run(`Number.isFinite(i_${id}.st.hitTotal)`),true);
    for(const sid of ['fork','returning','spell_totem','trap'])assert.notEqual(run(`supportBlockReason('${sid}',i_${id},true)`),'');
  }
});
test('entities are bounded, invalid weapon effects stop, restarts clear everything, and unique drops are source-only', () => {
  const {run}=sandbox();run(`const i=setup('frost_wall');for(let n=0;n<100;n++)castSkill(i,i.st);`);assert.equal(run('reactionState().walls.length'),28);
  run(`G.player.equip.weapon=makeNormal('short_bow');recomputePlayer();updateReactions(0.01);`);assert.equal(run('reactionState().walls.length'),0);
  run(`startGame(CLASSES[0]);`);assert.equal(run('reactionState().spiders.length+reactionState().clouds.length+reactionState().walls.length'),0);
  assert.equal(run(`Array.from({length:250},()=>makeItem('unique',null,0,1)).some(it=>['mjolner','arakaalis_fang','sire_of_shards'].includes(it.unique))`),false);
  for(const [id,src] of [['mjolner','boss_void'],['arakaalis_fang','boss_marsh'],['sire_of_shards','boss_frozen']])assert.equal(run(`UNIQUES['${id}'].src`),src);
});
