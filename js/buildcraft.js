'use strict';
// All persistent combat entities belong to this run. No timers survive a restart.
function craftState(){return G.craft||(G.craft={nodes:[],corpses:[],blades:[]});}
function craftLive(i){return G.player.skills.includes(i)&&i.st&&!i.st.disabled;}
function craftNode(n){const a=craftState().nodes;if(a.length>=96)a.shift();a.push(n);return n;}
function craftMark(list,x,y,ttl){if(list.length>=48)list.shift();list.push({x,y,ttl});}
function craftBurst(i,s,x,y,r,k=1){
 reactionImpact(i,s,x,y,r,s.hitTotal*k);
 for(const e of enemiesInRadius(x,y,r,[]))hitEnemy(e,s,i,k,x,y);
 addEffect({kind:'ring',x,y,r,t:0,dur:0.3,color:s.color});
}
function craftSecondary(s,k=1){return {...scaledStats(s,k),proc:true,echo:0,delivery:null,triggerMode:null,prismatic:false,shockwave:false,phantasm:false};}
function craftOrigin(x,y,fn){const p=G.player,ox=p.x,oy=p.y;try{p.x=x;p.y=y;return fn();}finally{p.x=ox;p.y=oy;}}
function craftProjectile(i,s,x,y,a){if(G.projectiles.length<700)spawnProjectile(i,s,x,y,a,null);}
function craftTarget(s){return nearestEnemy(G.player.x,G.player.y,s.range||500);}
function craftTriggerTarget(i){
 const list=G.player.skills,at=list.indexOf(i);
 const chosen=list.find(t=>t.uid===i.triggerPick);
 const valid=t=>(i.st.triggerMode!=='mjolner'||t&&t.st&&t.st.tags.has('Lightning'))&&t&&t!==i&&t.st&&!t.st.disabled&&t.st.tags.has('Spell')&&!t.st.tags.has('Minion')&&!t.st.tags.has('Channelling')&&!t.st.triggerMode&&!t.st.delivery&&['projectile','nova','chain','ground','cone','slam','buildcraft'].includes(t.st.behavior)&&!['relic','corpses','blades'].includes(t.st.mode);
 if(valid(chosen))return chosen;
 for(let n=1;n<list.length;n++){const t=list[(at+n)%list.length],s=t.st;if(s&&(i.st.triggerMode!=='mjolner'||s.tags.has('Lightning'))&&!s.disabled&&s.tags.has('Spell')&&!s.tags.has('Minion')&&!s.tags.has('Channelling')&&!s.triggerMode&&!s.delivery&&['projectile','nova','chain','ground','cone','slam','buildcraft'].includes(s.behavior)&&!['relic','corpses','blades'].includes(s.mode))return t;}
 return null;
}
function craftTrigger(i,x,y){const t=craftTriggerTarget(i);if(!t||G.time<(i.rt.triggerAt||0))return; i.rt.triggerAt=G.time+(i.st.triggerMode==='sling'?0.9:i.st.triggerMode==='channel'?0.8:0.5);craftOrigin(x,y,()=>castSkill(t,craftSecondary(t.st,0.7)));}
function craftOwnsTrigger(t){return G.player.skills.some(i=>i!==t&&i.st&&!i.st.disabled&&i.st.triggerMode&&craftTriggerTarget(i)===t);}

const previousSupportUseReason=supportUseReason;
supportUseReason=function(id,d,tags,enabled=[],mods=G.player&&G.player.mods){
 if(DELIVERY_SUPPORTS.includes(id)&&BUILDCRAFT_SUPPORTS.some(x=>x[0]===id)){
  if(!['projectile','nova','chain','cone'].includes(d.behavior))return 'รองรับเฉพาะกระสุน โนวา Chain และกรวยเวท';
  if(tags.has('Minion')||tags.has('Channelling'))return 'ไม่รองรับ Minion หรือ Channel';
  if(id==='locus_mine'&&(!tags.has('Attack')||!d.weapons||!d.weapons.some(w=>['bow','wand'].includes(w))))return 'ต้องเป็นกระสุน Attack ธนู/ไม้กายสิทธิ์';
 }
 if(['cluster_traps','multiple_traps'].includes(id)&&!enabled.includes('trap'))return 'ต้องมี Trap ที่ทำงานอยู่';
 if(['predator','meat_shield','fresh_meat','infernal_legion','minion_instability'].includes(id)&&d.behavior!=='minion'&&d.base.mode!=='absolution')return 'ต้องเป็นมินเนียนที่มีอายุและเคลื่อนที่ได้';
 if(id==='spellslinger'&&(!d.weapons||!d.weapons.includes('wand')))return 'ต้องเป็น Attack ไม้กายสิทธิ์';
 if(id==='shockwave'&&(!d.weapons||!d.weapons.some(w=>['mace','staff','sceptre'].includes(w))))return 'ต้องใช้สกิลประชิดที่รองรับกระบอง คทา หรือคทายาว';
 if(['cast_on_crit','cast_on_melee_kill','spellslinger','prismatic_burst','phantasm','summon_phantasm','trauma_support','rage_support','fleeing','bloodlust'].includes(id)&&['aura','herald','minion'].includes(d.behavior))return 'ต้องเป็นสกิลที่คุณ Hit เอง';
 if (['steel','lightstrike','galvanic','fusion','volatile'].includes(d.base.mode) && ['pierce','chain','fork','faster_projectiles','slower_projectiles','returning','barrage'].includes(id)) return '';
 if (['helix'].includes(d.base.mode) && ['multiple_projectiles','gmp','pierce','chain','fork','volley','arrow_nova','barrage','returning','faster_projectiles','slower_projectiles'].includes(id)) return 'เกลียวนี้เป็นพื้นที่หมุน ไม่ใช่ลูกกระสุนที่แตกหรือเพิ่มจำนวนได้';
 if (d.behavior==='buildcraft' && ['spell_totem','ballista_totem','mirage_archer'].includes(id)) return 'สกิลนี้มีวงจรเฉพาะ ไม่รองรับป้อมหรือ Mirage';
 return previousSupportUseReason(id,d,tags,enabled,mods);
};

function castBuildcraft(i,s){
 const p=G.player,c=craftState(),rt=i.rt,e=craftTarget(s),x=e?e.x:p.x,y=e?e.y:p.y,a=e?angleTo(p.x,p.y,e.x,e.y):p.facing;
 if(s.delivery&&!s.proc){
  if(!e)return false;
  const count=s.delivery==='locus'?3:s.trapCount||1;
  const order=c.nodes.filter(b=>b.i===i&&b.kind==='delivery').length%6;
  for(let n=0;n<count;n++)craftNode({kind:'delivery',i,s,x:x+(n-(count-1)/2)*45,y:y+(s.trapLine?0:Math.sin(n*2.1)*50),ttl:s.delivery==='brand'?4:5,age:0,act:0,order:order+n});
  return true;
 }
 if(s.frostRelay){const bolts=G.projectiles.filter(b=>b.inst&&b.inst.id==='frostbolt'&&!b.dead).sort((u,v)=>dist2(u.x,u.y,p.x,p.y)-dist2(v.x,v.y,p.x,p.y)).slice(0,2);if(bolts.length){for(const b of bolts)craftBurst(i,s,b.x,b.y,s.radius);return true;}}
 if(s.behavior!=='buildcraft')return null;
 if(!e&&!['corpses','relic','rftrail'].includes(s.mode))return false;
 const burst=(xx=x,yy=y,r=s.radius,k=1)=>craftBurst(i,s,xx,yy,r,k);
 switch(s.mode){
 case 'helix':craftNode({kind:'helix',i,s,x:p.x,y:p.y,ttl:3,age:0,act:0});break;
 case 'steel':rt.steel=(rt.steel||0)+1;if(rt.steel%(s.steelCycle||4)===0){for(const b of c.blades.splice(0))burst(b.x,b.y,s.radius,1.4);}else{castProjectiles(i,{...s,proj:s.proj+2});craftMark(c.blades,x,y,6);}break;
 case 'charge':if(channelMoving())return false;rt.channelAt=G.time;rt.charge=Math.min(6,(rt.charge||0)+1);addText(p.x,p.y-35,'◆ '+rt.charge,s.color,0.8);if(rt.charge===6){burst(p.x+Math.cos(a)*90,p.y+Math.sin(a)*90,s.radius,rt.charge*0.6);rt.charge=0;}break;
 case 'storm':craftNode({kind:'pulse',i,s,x,y,ttl:3,age:0,act:0});break;
 case 'vortex':{const rage=rt.walkRage||0;rt.walkRage=0;craftNode({kind:'vortex',i,s:craftSecondary(s,1+rage*0.12),x:p.x,y:p.y,a,ttl:2.5,age:0,act:0});break;}
 case 'trauma':hitEnemy(e,s,i,1+(rt.trauma||0)*0.12,p.x,p.y);craftTrauma(i,s);if(s.traumaRelease&&rt.trauma>=6){burst(p.x,p.y,s.radius*1.6,3);rt.trauma=0;}break;
 case 'spikes':for(let n=0;n<5;n++){const an=a+(n-2)*0.35;craftNode({kind:'spike',i,s,x:p.x+Math.cos(an)*140,y:p.y+Math.sin(an)*140,ttl:5,age:0,act:0});}burst(x,y,55,0.5);break;
 case 'fissure':craftNode({kind:'fissure',i,s,x:p.x,y:p.y,ttl:2,age:0,act:0,steps:0});break;
 case 'crash':burst(p.x,p.y,s.radius*1.8,0.45);burst(p.x,p.y,s.radius,0.75);break;
 case 'shield':{const shield=p.equip.offhand;if(!shield||!shield.base.includes('shield')&&shield.base!=='buckler')return false;const def=BASES[shield.base].def||{};burst(p.x+Math.cos(a)*65,p.y+Math.sin(a)*65,s.radius,1+Math.min(1.5,((def.ar||0)+(def.ev||0))/100));break;}
 case 'lightstrike':if(dist2(p.x,p.y,x,y)<170*170)hitEnemy(e,s,i,1.2,p.x,p.y);castProjectiles(i,{...s,proj:s.proj+2});break;
 case 'galvanic':castProjectiles(i,s);for(const t of enemiesInRadius(p.x,p.y,160,[]))if(Math.cos(angleTo(p.x,p.y,t.x,t.y)-a)>0.5)hitEnemy(t,s,i,1.2,p.x,p.y);break;
 case 'rain':for(let n=0;n<2;n++)craftNode({kind:'rain',i,s,x:x+(n?65:-65),y,ttl:s.durFinal,age:0,act:0,dx:(n?65:-65)});break;
 case 'artillery':craftNode({kind:'artillery',i,s,x:p.x,y:p.y,ttl:6,age:0,act:0});break;
 case 'fusion':rt.fusion=(rt.fusion||0)+1;castProjectiles(i,rt.fusion%3?s:{...craftSecondary(s,1.8),radius:s.radius*1.5});break;
 case 'blades':for(let n=0;n<3;n++){const xx=x+(n-1)*55;burst(xx,y,45,0.6);craftMark(c.blades,xx,y,s.durFinal);}break;
 case 'blast':{const b=c.blades.splice(0,12);if(!b.length)burst(x,y,45,0.45);else for(const t of b)burst(t.x,t.y,s.radius);break;}
 case 'corpses':for(let n=0;n<3;n++)craftMark(c.corpses,x+(n-1)*45,y,10);burst(x,y,s.radius,0.5);break;
 case 'detonate':case 'volatile':case 'cremation':{const b=c.corpses.shift();if(!b)return false;if(s.mode==='detonate')burst(b.x,b.y,s.radius*1.3);else if(s.mode==='volatile')for(let n=0;n<Math.min(6,s.proj+2);n++)craftProjectile(i,s,b.x,b.y,a+n*0.3);else craftNode({kind:'artillery',i,s,x:b.x,y:b.y,ttl:s.durFinal,age:0,act:0});break;}
 case 'hex':{const hex=e.curse&&e.curse.t>G.time;burst(x,y,hex?s.radius*1.6:s.radius*0.6,hex?1.8:0.7);if(hex&&!s.hexEcho)e.curse=null;if(s.hexEcho)craftNode({kind:'echo',i,s:craftSecondary(s,0.4),x,y,ttl:0.5,age:0});break;}
 case 'conduit':for(const t of enemiesInRadius(p.x,p.y,s.range,[])){if(t.shock.t>0){hitEnemy(t,{...s,noAilment:true},i,2.2,p.x,p.y);t.shock.t=0;}}break;
 case 'relic':rt.relicReady=true;break;
 case 'pact':{const m=G.minions.find(m=>m.inst.id==='summon_skeletons'||m.inst.id==='skeletal_mages');if(m){m.t-=2;burst(m.x,m.y,s.radius,1.7);}else{craftLifeCost(0.03);burst(p.x,p.y,s.radius);}break;}
 case 'absolution':{const hp=e.hp;burst(x,y,s.radius);rt.absHits=(rt.absHits||0)+1;if(e.dead||isBoss(e)&&rt.absHits%3===0)craftSummon(i,s,p.x,p.y);else if(hp>0&&rt.absHits%5===0)craftSummon(i,s,p.x,p.y);break;}
 case 'penance':{let b=c.nodes.find(n=>n.kind==='penance'&&n.i===i&&n.target===e);if(!b){const mine=c.nodes.filter(n=>n.i===i&&n.kind==='penance');if(mine.length>=s.maxCount)c.nodes.splice(c.nodes.indexOf(mine[0]),1);craftNode({kind:'penance',i,s,target:e,x,y,ttl:s.durFinal,age:0,act:0,stacks:0});}break;}
 case 'rftrail':craftNode({kind:'rf',i,s,x:p.x,y:p.y,ttl:2,age:0,act:0});break;
 }
 return true;
}
// Skills fire on their own, so a life cost can't be paused by the player: it never takes you below half.
const CRAFT_COST_FLOOR=0.5;
function craftLifeCost(f){const p=G.player;if(p.mods.ks.ci){const fl=p.maxES*CRAFT_COST_FLOOR;if(p.es>fl)p.es=Math.max(fl,p.es-p.maxES*f);}else{const fl=p.maxLife*CRAFT_COST_FLOOR;if(p.life>fl)p.life=Math.max(fl,p.life-p.maxLife*f);}}
function craftTrauma(i,s){i.rt.trauma=Math.min(8,(i.rt.trauma||0)+1);i.rt.traumaAt=G.time;craftLifeCost(i.rt.trauma*0.01);}
function craftSummon(i,s,x,y,phantasm=false){
 const list=G.minions.filter(m=>m.inst===i&&!!m.craftPhantasm===phantasm);if(list.length>=(phantasm?3:s.maxCount||3))return;
 G.minions.push({inst:i,x,y,vx:0,vy:0,t:phantasm?4:s.durFinal,atkCd:0,target:null,retarget:0,born:G.time,craftPhantasm:phantasm});
}
function updateBuildcraft(dt){
 const p=G.player,c=craftState();
 for(const list of [c.corpses,c.blades])for(let n=list.length-1;n>=0;n--){list[n].ttl-=dt;if(list[n].ttl<=0)list.splice(n,1);}
 for(const i of p.skills){const s=i.st;if(!s||s.disabled)continue;
  if(s.mode==='vortex')i.rt.walkRage=Math.min(8,(i.rt.walkRage||0)+(channelMoving()?dt*2:0));
  if(i.rt.trauma&&G.time-(i.rt.traumaAt||0)>2)i.rt.trauma=0;
  if(i.rt.charge&&s.mode==='charge'&&channelMoving()){const e=craftTarget(s);craftBurst(i,s,e?e.x:p.x,e?e.y:p.y,s.radius,i.rt.charge*0.6);i.rt.charge=0;}
  if(s.triggerMode==='channel'&&!s.proc&&((i.rt.beamT||0)>0||s.mode==='charge'&&!channelMoving()&&(i.rt.channelAt||-10)>G.time-0.5))craftTrigger(i,p.x,p.y);
 }
 for(let n=c.nodes.length-1;n>=0;n--){const b=c.nodes[n],s=b.i.st;
  if(!craftLive(b.i)||s.mode!==b.s.mode||(s.delivery||null)!==(b.s.delivery||null)){c.nodes.splice(n,1);continue;}
  b.ttl-=dt;b.age+=dt;b.act=(b.act||0)-dt;
  if(b.kind==='delivery'){
   if(s.delivery==='brand'){if(!b.target||b.target.dead)b.target=nearestEnemy(b.x,b.y,250);if(b.target){b.x=b.target.x;b.y=b.target.y;}}
   const go=s.delivery==='trap'?b.age>=0.5&&nearestEnemy(b.x,b.y,110):s.delivery==='brand'?b.act<=0:b.age>=(s.delivery==='impact'?1.8:1.2)+b.order*0.12;
   if(go){let k=1;if(s.delivery==='mine')k=1+b.order*0.2;if(s.delivery==='impact')k=1+Math.min(0.8,c.nodes.filter(t=>t.kind==='delivery'&&t.i===b.i).length*0.08);
    const ss={...craftSecondary(s,k),aim:s.delivery==='locus'?'nearest':s.aim};
    if(s.delivery==='locus'){const a=angleTo(b.x,b.y,p.x,p.y);for(let j=0;j<s.proj;j++)craftProjectile(b.i,ss,b.x,b.y,a+(j-(s.proj-1)/2)*s.spread);}
    else craftOrigin(b.x,b.y,()=>castSkill(b.i,ss));
    b.act=Math.max(0.4,s.cdFinal);if(s.delivery!=='brand')b.ttl=0;
   }
  }else if(b.kind==='spike'){if(p.dashT>0.05||s.autoSpikes&&b.age>=1||b.ttl<=0){craftBurst(b.i,s,b.x,b.y,s.radius,1.5);b.ttl=0;}}
  else if(b.kind==='echo'){if(b.ttl<=0)craftBurst(b.i,b.s,b.x,b.y,b.s.radius);}
  else if(b.act<=0){b.act=b.kind==='penance'?s.hitCd/(s.brandRate||1):b.kind==='helix'?0.12:0.5;
   if(b.kind==='helix'){const a=b.age*7,r=25+b.age*60;craftBurst(b.i,s,b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,55,0.35);}
   else if(b.kind==='vortex'){b.x+=Math.cos(b.a)*90*b.act;b.y+=Math.sin(b.a)*90*b.act;craftBurst(b.i,b.s,b.x,b.y,s.radius,0.6);}
   else if(b.kind==='fissure'){const e=nearestEnemy(b.x,b.y,450);if(e){const a=angleTo(b.x,b.y,e.x,e.y);b.x+=Math.cos(a)*90;b.y+=Math.sin(a)*90;}craftBurst(b.i,s,b.x,b.y,s.radius);if(++b.steps>=4)b.ttl=0;}
   else if(b.kind==='artillery'){const e=nearestEnemy(b.x,b.y,550);if(e)for(let j=0;j<3;j++)G.meteors.push({x:e.x+(j-1)*45,y:e.y,delay:0.4+j*0.1,fall:0.3,r:s.radius*0.6,inst:b.i,s});b.act=1.2;}
   else if(b.kind==='rain'){if(s.followGarden){b.x=p.x+b.dx;b.y=p.y;}const other=c.nodes.find(t=>t!==b&&t.kind==='rain'&&t.i===b.i&&dist2(t.x,t.y,b.x,b.y)<(s.followGarden?150:240)**2);if(other){for(const e of enemiesOnLine(b.x,b.y,angleTo(b.x,b.y,other.x,other.y),Math.hypot(b.x-other.x,b.y-other.y),25))hitEnemy(e,s,b.i,0.7,b.x,b.y);addEffect({kind:'bolt',pts:[[b.x,b.y],[other.x,other.y]],t:0,dur:0.2,color:s.color});}}
   else if(b.kind==='penance'){if(!b.target||b.target.dead){b.ttl=0;}else{b.x=b.target.x;b.y=b.target.y;b.stacks=Math.min(10,b.stacks+1);craftBurst(b.i,s,b.x,b.y,s.radius,0.4+b.stacks*0.18);}}
   else if(b.kind==='rf'){// Overlap from the same skill never stacks.
    for(const e of enemiesInRadius(b.x,b.y,s.radius,[])){const key='craftRF'+b.i.uid;if((e[key]||0)>G.time)continue;e[key]=G.time+0.49;dotDamage(e,s.auraDps*0.5,b.i,s.color);}}
   else craftBurst(b.i,s,b.x,b.y,s.radius,0.6);
  }
  if(b.ttl<=0)c.nodes.splice(n,1);
 }
}
function buildcraftHit(e,s,i,crit){
 if(!i||s.proc||!craftLive(i))return;
 const rt=i.rt,p=G.player;
 if(s.triggerMode==='crit'&&crit||s.triggerMode==='sling'&&p.weapon&&p.weapon.wtype==='wand')craftTrigger(i,e.x,e.y);
 if(s.triggerMode==='kill'){if(e.dead)craftTrigger(i,e.x,e.y);else if(isBoss(e)){rt.bossHits=(rt.bossHits||0)+1;if(rt.bossHits%3===0)craftTrigger(i,e.x,e.y);}}
 if(s.traumaSupport&&G.time>=(rt.traumaSupportAt||0)){rt.traumaSupportAt=G.time+0.15;craftTrauma(i,s);}
 if(s.rageSupport&&G.time>=(rt.rageSupportAt||0)){if(G.time-(rt.rageAt||0)>2)rt.rage=0;rt.rageSupportAt=G.time+0.15;rt.rage=Math.min(8,(rt.rage||0)+1);rt.rageAt=G.time;}
 if(s.fleeing&&!isBoss(e)){const a=angleTo(p.x,p.y,e.x,e.y);e.kx+=Math.cos(a)*150;e.ky+=Math.sin(a)*150;}
 if(s.phantasm&&G.time>=(rt.phantasmAt||0)){rt.phantasmAt=G.time+2;craftSummon(i,s,e.x,e.y,true);}
 for(const [flag,cd] of [['shockwave',1],['prismatic',1]])if(s[flag]&&G.time>=(rt[flag+'At']||0)&&(!s.shockwave||!flag.startsWith('shock')||p.weapon&&['mace','staff','sceptre'].includes(p.weapon.wtype))){rt[flag+'At']=G.time+cd;const ss=craftSecondary(s,0.6);if(flag==='prismatic'){const type=pick(['fire','cold','lightning']);ss.hit={[type]:ss.hitTotal};}craftBurst(i,ss,e.x,e.y,100);}
 if(s.tags.has('Attack'))for(const relic of p.skills)if(relic.st&&!relic.st.disabled&&relic.st.mode==='relic'&&G.time>=(relic.rt.relicAt||0)){relic.rt.relicAt=G.time+0.8;const origins=relic.st.relicProcession?G.minions.slice(0,3):[p];for(const m of origins)craftBurst(relic,craftSecondary(relic.st),m.x,m.y,relic.st.radius);}
}
function buildcraftMinion(m,s,dt){
 if(s.disabled)return true;
 if(m.craftPhantasm){if(m.atkCd<=0){const e=nearestEnemy(m.x,m.y,450);if(e){const ss={...craftSecondary(s,0.3),explode:false,split:0,fuseArrow:false,speedFinal:400,lifeFinal:1.2,pierce:0,chain:0,fork:false,returning:false};craftProjectile(m.inst,ss,m.x,m.y,angleTo(m.x,m.y,e.x,e.y));m.atkCd=0.8;}}return true;}
 if(s.unstable||s.infernalLegion)m.t-=dt;
 if(s.infernalLegion){m.burnT=(m.burnT||0)-dt;if(m.burnT<=0){m.burnT=0.5;for(const e of enemiesInRadius(m.x,m.y,65,[]))dotDamage(e,s.hitTotal*0.3*s.burnMore*s.dotMul*(1-Math.max(-0.5,e.res.fire)),m.inst,'#ff9855');addEffect({kind:'ring',x:m.x,y:m.y,r:65,t:0,dur:0.25,color:'#ff9855'});}}
 if(s.predator){let best=null;for(const e of G.enemies)if(!e.dead&&dist2(e.x,e.y,m.x,m.y)<520**2&&(!best||e.rarity>best.rarity))best=e;if(best){m.target=best;m.retarget=Math.max(m.retarget,0.1);}}
 if(s.meatShield&&!nearestEnemy(G.player.x,G.player.y,140)&&dist2(m.x,m.y,G.player.x,G.player.y)<=110**2)return true;
 if(s.meatShield&&dist2(m.x,m.y,G.player.x,G.player.y)>110**2){const a=angleTo(m.x,m.y,G.player.x,G.player.y);m.x+=Math.cos(a)*s.speed*dt*2;m.y+=Math.sin(a)*s.speed*dt*2;m.target=nearestEnemy(G.player.x,G.player.y,140);return true;}
 if(s.reaper&&G.time>=(m.feedAt||0)){const food=G.minions.find(t=>t!==m&&!t.craftPhantasm&&t.inst.id!=='summon_reaper');if(food){food.t=0;m.feedAt=G.time+3;m.fedUntil=G.time+2;}}
 return false;
}
function craftMinionMult(m,s){return (s.freshMeat&&G.time-(m.born||0)<2?1.8:1)*(m.fedUntil>G.time?1.7:1);}
function drawBuildcraft(ctx){
 const c=craftState();ctx.save();ctx.lineWidth=2;
 for(const [list,color] of [[c.corpses,'#a58966'],[c.blades,'#c6d8ed']]){ctx.strokeStyle=color;for(const b of list){ctx.beginPath();ctx.moveTo(b.x-5,b.y-5);ctx.lineTo(b.x+5,b.y+5);ctx.moveTo(b.x+5,b.y-5);ctx.lineTo(b.x-5,b.y+5);ctx.stroke();}}
 for(const b of c.nodes){ctx.strokeStyle=b.s.color;ctx.beginPath();ctx.arc(b.x,b.y,b.kind==='delivery'?12:b.kind==='spike'?8:18,0,TAU);ctx.stroke();if(b.kind==='penance'){ctx.fillStyle=b.s.color;ctx.fillText(String(b.stacks),b.x,b.y-22);}}
 ctx.restore();
}
for(const [id,,,mode] of BUILDCRAFT_SKILLS)SYMBOLS[id]=g=>{SYMBOLS[mode==='projectile'?'sup_proj':mode==='minion'?'sup_skull':'sup_echo'](g);g.fillRect(-3,-18,6,6);};
for(const [id] of BUILDCRAFT_SUPPORTS)SUPPORT_ICON[id]=['echo'];
COMBOS.push({name:'Blade Engine',parts:['bladefall','blade_blast','inc_aoe'],desc:'ทิ้งใบมีดแล้วระเบิดชุดใหญ่'},{name:'Corpse Factory',parts:['desecrate','volatile_dead','cremation'],desc:'สร้างศพแล้วเปลี่ยนเป็นลูกไฟหรือปล่องยิง'},{name:'Critical Cyclone',parts:['cyclone','cast_on_crit','ice_nova'],desc:'Attack คริกระตุ้น Spell ถัดไปในแถบ · Spell ที่เชื่อมหยุดร่ายเอง'},{name:'Walking Furnace',parts:['raise_zombie','infernal_legion','minion_instability'],desc:'มินเนียนอายุสั้น เผาฝูงแล้วระเบิด'});

// Conduit needs Shock (lightning hits), Holy Relic needs your Attacks: never offer them as a dead card
function craftSkillUsable(id,p){
 if(id==='tempest_bell')return p.skills.some(i=>i.st&&!i.st.disabled&&i.st.tags.has('Attack'));
 if(id==='herald_of_plague')return p.skills.some(i=>i.st&&!i.st.disabled&&i.st.poison>0);
 if(id==='magnetic_salvo')return p.skills.some(i=>i.id==='storm_rain'&&i.st&&!i.st.disabled);
 if(id==='lightning_conduit')return p.skills.some(i=>i.st&&!i.st.disabled&&(i.st.tags.has('Lightning')||i.st.hit&&i.st.hit.lightning>0));
 if(id==='holy_relic')return p.skills.some(i=>i.st&&!i.st.disabled&&i.st.tags.has('Attack'));
 return true;
}
function craftLinkButton(i){if(!i.st||!i.st.triggerMode)return '';const t=craftTriggerTarget(i);return '<button class="btn btn-small" data-craft-link="'+i.uid+'">เชื่อมเวท: '+(t?SKILLS[t.id].name:'ยังไม่มี Spell')+' · คลิกเปลี่ยน</button>';}
function craftCycleLink(i){const current=craftTriggerTarget(i),list=[];for(const t of G.player.skills){i.triggerPick=t.uid;if(craftTriggerTarget(i)===t)list.push(t);}const at=list.indexOf(current);i.triggerPick=list.length?list[(at+1)%list.length].uid:null;}
