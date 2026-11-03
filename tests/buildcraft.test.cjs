const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
const setup=`function setup(id){startGame(CLASSES[0]);const p=G.player,i=newSkillInstance(id);p.skills=[i];i.level=12;const d=SKILLS[id];if(d.weapons)p.equip.weapon=makeNormal(Object.keys(BASES).find(b=>BASES[b].w&&d.weapons.includes(BASES[b].w.type)));p.equip.offhand=makeNormal('tower_shield');recomputePlayer();G.enemies=[];for(let n=0;n<8;n++){const e=makeEnemy('zombie',50+n*20,0,0);e.hp=e.maxHp=1e8;e.dmg=0;e.speed=0;G.enemies.push(e);}G.hash.clear();for(const e of G.enemies)G.hash.insert(e);return i;}`;
test('31 new skills render, evolve and execute with their required enablers',()=>{
 const {run}=game();run(setup);
 const result=run(`BUILDCRAFT_SKILLS.map(([id])=>{const i=setup(id);i.evo=true;recomputePlayer();craftMark(craftState().corpses,70,0,10);craftMark(craftState().blades,70,0,10);G.enemies.forEach(e=>{e.shock={t:100,eff:0.25};e.curse={t:100,type:'despair',eff:0.25};});for(let n=0;n<180;n++){G.player.life=G.player.maxLife;if(id==='holy_relic'&&n%60===0)buildcraftHit(G.enemies[0],{...i.st,tags:new Set(['Attack'])},i,false);update(1/60);}skillIcon(id);render();return {id,ok:Number.isFinite(i.dmgDealt)&&i.dmgDealt>0&&!i.st.disabled};})`);
 assert.equal(result.length,31);assert.deepEqual(Array.from(result).filter(x=>!x.ok),[]);
});
test('corpse spells consume a bounded resource, blade combo consumes blades, restart clears entities',()=>{
 const {run}=game();run(setup);run(`const i=setup('detonate_dead');`);
 assert.equal(run('castSkill(i,i.st)'),false);
 run('craftMark(craftState().corpses,80,0,10)');assert.equal(run('castSkill(i,i.st)'),true);assert.equal(run('craftState().corpses.length'),0);
 run(`i.id='bladefall';recomputePlayer();castSkill(i,i.st);`);assert.equal(run('craftState().blades.length'),3);
 run(`i.id='blade_blast';recomputePlayer();castSkill(i,i.st);`);assert.equal(run('craftState().blades.length'),0);
 run(`craftNode({});startGame(CLASSES[0]);`);assert.equal(run('craftState().nodes.length'),0);
});
test('traps arm before firing, expire, are capped, and stop after weapon becomes invalid',()=>{
 const {run}=game();run(setup);run(`const i=setup('fireball');i.supports=['trap'];recomputePlayer();castSkill(i,i.st);`);
 assert.equal(run('G.projectiles.length'),0);run('updateBuildcraft(0.3)');assert.equal(run('G.projectiles.length'),0);
 run('updateBuildcraft(0.3)');assert.ok(run('G.projectiles.length')>0);
 run(`for(let n=0;n<200;n++)castSkill(i,i.st);`);assert.equal(run('craftState().nodes.length'),96);
 run(`G.player.equip.weapon=makeNormal('short_bow');recomputePlayer();updateBuildcraft(0.1);`);assert.equal(run('craftState().nodes.length'),0);
});
test('trigger ownership suspends normal spell casting, secondary hits cannot retrigger',()=>{
 const {run}=game();run(setup);run(`const i=setup('cyclone'),spell=newSkillInstance('ice_nova');G.player.skills.push(spell);i.supports=['cast_on_crit'];recomputePlayer();`);
 assert.equal(run('craftOwnsTrigger(spell)'),true);
 run('buildcraftHit(G.enemies[0],i.st,i,true)');assert.ok(run('G.novas.length')>0||run('spell.dmgDealt')>0);
 const at=run('i.rt.triggerAt');run('G.time+=2;buildcraftHit(G.enemies[0],craftSecondary(i.st),i,true)');assert.equal(run('i.rt.triggerAt'),at);
 run('i.supports=[];recomputePlayer()');assert.equal(run('craftOwnsTrigger(spell)'),false);
});
test('every new unique changes compiled mechanics and removing it restores the original',()=>{
 const {run}=game();run(setup);
 for(const id of run('BUILDCRAFT_UNIQUES.map(x=>x[0])')){
  run(`const entry${id}=BUILDCRAFT_UNIQUES.find(x=>x[0]==='${id}');`);
  const changed=run(`(()=>{const row=entry${id},i=setup(row[3]),u=UNIQUES[row[0]],before=JSON.stringify(i.st,(k,v)=>k==='tags'?Array.from(v):v);const old=G.player.equip[u.slot];G.player.equip[u.slot]={uid:uid(),base:u.base,unique:row[0],slot:u.slot,rarity:'unique',affixes:[],quality:0,ilvl:1};recomputePlayer();const after=JSON.stringify(i.st,(k,v)=>k==='tags'?Array.from(v):v);G.player.equip[u.slot]=old;recomputePlayer();return before!==after&&before===JSON.stringify(i.st,(k,v)=>k==='tags'?Array.from(v):v);})()`);
  assert.equal(changed,true,id);
 }
});
test('minion lifetime costs and defensive movement work, unsupported combinations are rejected',()=>{
 const {run}=game();run(setup);run(`const i=setup('raise_zombie');i.supports=['infernal_legion','minion_instability'];recomputePlayer();castSkill(i,i.st);const m=G.minions[0],t=m.t;updateMinions(0.1);`);
 assert.ok(run('m.t<t-0.1'));assert.ok(run('supportBlockReason("infernal_legion",newSkillInstance("holy_relic"),true)').length>0);
 assert.ok(run('supportBlockReason("trap",newSkillInstance("bladefall"),true)').length>0);
});
test('all 24 supports activate on compatible hosts and survive a combat simulation',()=>{
 const {run}=game();run(setup);
 const results=run(`BUILDCRAFT_SUPPORTS.map(([sid])=>{let id='fireball';if(['locus_mine','spellslinger'].includes(sid))id='power_siphon';else if(['cast_on_crit','cast_on_melee_kill','shockwave','trauma_support','bloodlust'].includes(sid))id='heavy_strike';else if(sid==='cast_while_channelling')id='lightning_tendrils';else if(sid==='fist_of_war')id='earthquake';else if(['rage_support','fleeing','prismatic_burst'].includes(sid))id='split_arrow';else if(['predator','meat_shield','fresh_meat','infernal_legion','minion_instability'].includes(sid))id='raise_zombie';const i=setup(id);i.supports=['cluster_traps','multiple_traps'].includes(sid)?['trap',sid]:[sid];if(SUPPORTS[sid].apply&&sid.startsWith('cast_')||sid==='spellslinger')G.player.skills.push(newSkillInstance('ice_nova'));recomputePlayer();const active=activeSupports(i).active.includes(sid);for(let n=0;n<150;n++){G.player.life=G.player.maxLife;update(1/60);}return {sid,ok:active&&Number.isFinite(i.dmgDealt)};})`);
 assert.equal(results.length,24);assert.deepEqual(Array.from(results).filter(r=>!r.ok),[]);
});
test('unique changes actual cast origin and minion lifetime, not just damage stats',()=>{
 const {run}=game();run(setup);run(`const i=setup('spectral_throw');const u=UNIQUES.helix_anchor;G.player.equip.weapon={uid:uid(),base:u.base,unique:'helix_anchor',slot:'weapon',affixes:[],ilvl:1};recomputePlayer();castSkill(i,i.st);`);
 assert.equal(run('G.projectiles.length'),0);assert.equal(run('craftState().nodes[0].kind'),'helix');
 run(`setup('raise_zombie');G.player.equip.body={uid:uid(),base:'chain_tunic',unique:'grave_furnace',slot:'body',affixes:[],ilvl:1};recomputePlayer();castSkill(G.player.skills[0],G.player.skills[0].st);`);
 assert.equal(run('G.minions[0].t'),4);assert.equal(run('G.minions[0].inst.st.minionBoom'),true);
});
test('link selection cycles valid spells, and conflicting delivery/trigger gems work in neither order',()=>{
 const {run}=game();run(setup);run(`const i=setup('cyclone');i.supports=['cast_on_crit'];G.player.skills.push(newSkillInstance('ice_nova'),newSkillInstance('fireball'));recomputePlayer();const before=craftTriggerTarget(i);craftCycleLink(i);`);
 assert.notEqual(run('craftTriggerTarget(i).uid'),run('before.uid'));
 for(const order of [['blastchain_mine','cast_on_crit'],['cast_on_crit','blastchain_mine']]){
  run(`setup('power_siphon');G.player.skills[0].supports=${JSON.stringify(order)};recomputePlayer();`);
  assert.equal(run('activeSupports(G.player.skills[0]).active.length'),1);
 }
});
test('auto-firing life costs (Trauma, Dark Pact) never take the player below half life',()=>{
 const {run}=game();run(setup);run(`const i=setup('boneshatter');G.player.life=G.player.maxLife;for(let n=0;n<60;n++)craftTrauma(i,i.st);`);
 assert.equal(run('G.player.life/G.player.maxLife'),0.5);
 run('G.player.life=G.player.maxLife*0.3;craftLifeCost(0.08)');assert.equal(run('G.player.life/G.player.maxLife'),0.3);
});
test('Lightning Conduit and Holy Relic are only offered once something can enable them',()=>{
 const {run}=game();run(setup);run(`setup('fireball');`);
 assert.equal(run(`craftSkillUsable('lightning_conduit',G.player)`),false);assert.equal(run(`craftSkillUsable('holy_relic',G.player)`),false);
 run(`G.player.skills.push(newSkillInstance('arc'),newSkillInstance('ice_crash'));recomputePlayer();`);
 assert.equal(run(`craftSkillUsable('lightning_conduit',G.player)`),true);assert.equal(run(`craftSkillUsable('holy_relic',G.player)`),true);
});
test('Spectral Helix keeps hitting enemies next to the cast point',()=>{
 const {run}=game();run(setup);run(`const i=setup('spectral_helix');castSkill(i,i.st);for(let n=0;n<180;n++)updateBuildcraft(1/60);`);
 assert.ok(run('G.enemies[0].hp<1e8'));
});
