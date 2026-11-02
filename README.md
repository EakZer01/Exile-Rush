# Exile Survivors

เกมแนว survivor (แบบ Vampire Survivors) ที่ใช้ระบบ Skill Gem + Support Gem ตามแบบ Path of Exile 1
เขียนด้วย HTML5 Canvas + JavaScript ล้วน ไม่ต้องติดตั้งอะไร

## วิธีเล่น
- ดับเบิลคลิก `index.html` เพื่อเปิดในเบราว์เซอร์ หรือรันเซิร์ฟเวอร์: `python -m http.server 8765` แล้วเปิด http://localhost:8765
- **WASD / ลูกศร** เดิน · **Space** Flame Dash (อมตะชั่วครู่) · **Q** Life Flask · **E** Quicksilver Flask
- **V** ใช้ท่าไม้ตาย Vaal (เมื่อวิญญาณเต็ม) · **I** กระเป๋า/อุปกรณ์ · **Tab / Esc** หยุดเกมและดูบิว · **1–5** เลือกการ์ด · **R** ใช้ Chaos Orb สุ่มการ์ดใหม่ · **M** ปิดเสียง · **N** ปิดตัวเลขดาเมจ
- **L** เปิด/ปิดระบบแสงเงา · **F** เปิด/ปิดอนุภาคและเอฟเฟกต์ (ใช้เมื่อเครื่องช้า)
- มือถือ: ลากนิ้วเพื่อเดิน, แตะสองครั้งเพื่อ Dash, แตะขวดที่มุมซ้ายล่างเพื่อใช้ Flask, แตะแถบสกิลเพื่อใช้ Vaal
- เมนูหลักมี **📖 Codex** (ข้อมูลเจม/Passive/Ascendancy/Unique/Map Mods ทั้งหมด + คอมโบแนะนำ ค้นหาและกรองแท็กได้) และ **⚙ ตั้งค่า** (เสียง, เพลง, แสง, เอฟเฟกต์, จอสั่น, คุณภาพกราฟิก) ส่วนรอบแรกจะมี Tips แนะนำระบบต่างๆ

## ระบบหลัก
- **Skill Gem 27 อัน** ร่ายอัตโนมัติ (สูงสุด 6 สกิล, เลเวล 1–20) มีรูปแบบ Projectile, Nova, Chain, Orbit, Ground, Aura, Minion, Spin, **Brand** (ประทับตราบนศัตรู), **Strike**, **Slam + Aftershock**, **Beam** (Channelling) และ **Herald** (ทำงานตอนศัตรูตาย)
- **Support Gem 44 อัน** ใส่ในซ็อกเก็ตของสกิล (เริ่ม 3-Link, ใช้ Orb of Fusing ขยายได้ถึง 6-Link) ใช้ระบบแท็กแบบ PoE รวมถึงคำสาป (Hextouch), Penetration, Elemental Proliferation, Spell Cascade, Multistrike, Ruthless, Brutality, Deadly Ailments, Returning Projectiles
- **Passive 26 อัน + Keystone 12 อัน** (เช่น Elemental Overload, Avatar of Fire, Elemental Equilibrium, Runebinder, Hex Master)
- **คอมโบตัวอย่าง**: Herald of Ice + Ice Nova/Freezing Pulse (ศัตรูแช่แข็งแตกระเบิดต่อเนื่อง) · Contagion + Essence Drain (พิษแพร่ทั้งฝูง) · Storm/Armageddon Brand + Runebinder · คำสาป + Penetration ทะลุ map mod Warded · Elemental Equilibrium + สกิลหลายธาตุ
- **Ailment**: Ignite, Chill, Freeze, Shock, Poison
- **Ascendancy**: โค่นบอสตัวแรก (5:00) แล้วเลือกคลาสย่อย 1 ใน 2 แบบ (มี 14 แบบ คลาสละ 4 โหนด) บอสตัวถัดไปให้ปลดล็อกโหนดเพิ่ม · Scion สาย Paragon จะสุ่มโหนดจากคลาสอื่นมาให้เลือก
- **Gem Evolution (Vaal)**: เจมเลเวล 10 ขึ้นไปที่ลิงก์ Support ตามสูตรจะได้การ์ด EVOLVE กลายเป็นร่าง Vaal ที่แรงขึ้น พร้อมท่าไม้ตาย: ฆ่าศัตรูเก็บวิญญาณ 90 ดวง แล้วกด V เพื่อระเบิดรอบตัวและร่ายเร็ว 2.5 เท่านาน 6 วิ (ดูสูตรได้ในการ์ดและหน้าบิว)
- **Awakened Support** (เลเวล 12 ขึ้นไป): ปลุกพลัง Support ที่ใส่อยู่ ได้ดาเมจ 20% more พร้อมโบนัสเฉพาะตัว
- **ไอเทม (รีเซ็ตทุกรอบ)**: 6 ช่อง (หมวก, เกราะ, ถุงมือ, รองเท้า, สร้อยคอ, แหวน) ดรอปจาก Rare และบอส (บอสดรอป 2 ชิ้น มีโอกาสได้ Unique 60%)
  - **Magic** มี 1–2 mod, **Rare** มี 3–4 mod (บางตัวหายาก เช่น +1 เลเวลเจมทั้งหมด หรือ +1 Projectile) ค่า mod แรงขึ้นตามเวลาที่ดรอป
  - **Unique 24 ชิ้น** (ออกแบบเอง) มีเอฟเฟกต์เปลี่ยนบิว เช่น ศัตรูติดไฟตายแล้วระเบิด, ฟ้าผ่าเอง, +2 เลเวลเจม, +1 Projectile, ตรา Brand +1, Aftershock +1
  - **Crafting**: Regal (Magic → Rare), Exalted (+1 mod), Divine (สุ่มตัวเลขใหม่), Annulment (ลบ mod), Chaos (สุ่ม mod Rare ใหม่ทั้งหมด — ใช้ร่วมกับการสุ่มการ์ด) ดรอปจาก Rare, บอส และ Breach ใช้ในหน้า **I**
  - Rare/Unique มีลำแสงบนพื้น ไอเทมเก็บอัตโนมัติเมื่อเดินผ่าน (ถ้าช่องว่างจะสวมให้ทันที) กด **I** เพื่อเปรียบเทียบ สวมใส่ หรือย่อยเป็น Ancient Shards
  - คลัง Unique ที่เคยค้นพบบันทึกถาวรและดูได้ที่ Altar of Legacy
- **Atlas / Map Device**: หลังเลือกคลาสจะเข้าหน้า Map Device เพื่อเลือกแผนที่
  - **5 พื้นที่**: Cursed Graveyard, Ashen Wastes (Volatile/Brute), Frozen Hollow (Frost Wraith, ปลดล็อกที่ Tier 2), Toxic Marsh (ซากศพ/Cultist, Tier 3), Void Sanctum (มอนสเตอร์แข็งขึ้น 15%, Tier 5) แต่ละพื้นที่มีสีพื้น แสง และชนิดมอนสเตอร์ต่างกัน
  - **Tier 1–10**: Tier 1 คือเกมปกติ ทุก Tier เพิ่มชีวิตมอนสเตอร์ +25% ดาเมจ +8% และรางวัล Shards +15% ชนะแผนที่เพื่อปลดล็อก Tier ถัดไป
  - **Map Mods 16 แบบ** เช่น Hardened, Elite, Burning Ground, Withering Air, Lightless กด Alchemy เพื่อสุ่ม mod ฟรี (3–5 อันตาม Tier) หรือสุ่มใหม่ด้วย 3 ✦ ทุก mod เพิ่ม Item Quantity และโบนัส Shards
  - ผ่านแผนที่ใหม่แต่ละอัน (พื้นที่+Tier) ได้ **+1 แต้ม Legacy Tree** ถาวร (สูงสุด +15)
- **Meta-progression**: จบทุกรอบจะได้ **Ancient Shards ✦** (ตามเวลารอด, จำนวนฆ่า, บอส, เลเวล, ชนะ +100) เอาไปใช้ที่ **Altar of Legacy** ในเมนูหลัก
  - **Legacy Tree** แบบ passive tree ของ PoE มี 66 โหนด แบ่งเป็น 6 สาย: Arcane (เวท/ธาตุ), Shadow (คริ/เคออส), Hunt (Projectile/ความเร็ว), Bastion (ชีวิต/ป้องกัน/ฟลาสก์), Warfare (Attack/กายภาพ/AoE), Occult (มินเนียน/เผาไหม้/XP)
  - แต่ละสายมีโหนดเล็ก, Notable 3 อัน และ **Keystone** ที่เปลี่ยนแนวบิวที่ปลายสาย ได้แก่ Specialist, Glass Cannon, Collector, Born Ascendant, Gem Savant, Minion Lord มีโหนดเชื่อมระหว่างสายเป็นวงใน ทำให้เดินได้หลายเส้นทาง
  - จัดสรรได้เฉพาะโหนดที่ติดกับโหนดที่มีอยู่แล้ว สูงสุด **40 แต้ม** จึงต้องเลือกทิศทาง ราคาโหนดเพิ่มขึ้นตามจำนวนที่จัดสรรแล้ว
  - คืนแต้มฟรี: คลิกโหนดปลายทางเพื่อคืนทีละโหนด หรือกด "คืนแต้มทั้งหมด"
  - คลาส Templar / Shadow / Duelist / Scion และเจม Caustic Arrow / Raging Spirit / Firestorm / Righteous Fire เริ่มแบบล็อก ปลดล็อกได้ด้วยการทำเงื่อนไขในเกม หรือซื้อด้วย Shards
  - ข้อมูลถาวรเก็บใน localStorage ของเบราว์เซอร์ (`exile_meta`) ถ้าเคยเล่นมาก่อน สถิติดีที่สุดเดิมจะปลดล็อกของที่เข้าเงื่อนไขให้อัตโนมัติ
- มอนสเตอร์ 12 ชนิด Normal / Magic / Rare (มี mod สุ่ม) รวมถึง **Ash Ghoul** (กระโจนใส่), **Bile Spitter** (พ่นแอ่งพิษ), **Bone Shaman** (บัฟมอนสเตอร์รอบตัว — ฆ่าก่อน)
- บอส 4 ตัว (5:00, 10:00, 15:00, 20:00) โค่นบอสสุดท้ายเพื่อชนะ · บอสมี **Phase**: ที่ 66% และ 33% จะอมตะชั่วครู่และเรียกลูกน้อง
  - บอสประจำพื้นที่: Cinder Colossus (Ashen), Rime Herald (Frozen), Bog Leviathan (Marsh), Herald of the Void (Void)
  - **Pinnacle Boss** — The Hollow Crown แทนบอสสุดท้ายใน Tier 8 ขึ้นไป (โบนัส +250 ✦)
- **Breach** (league mechanic): รอยแยกสีม่วงปรากฏเป็นระยะ เดินเข้าไปเพื่อเปิด ฆ่ามอนสเตอร์ Breach ให้มากที่สุดก่อนวงปิด รางวัลตามจำนวนที่ฆ่า (Orb คราฟต์, หีบ, ไอเทม Rare/Unique)
- **ความยาก**: มอนสเตอร์แข็งและแรงขึ้นมากช่วงท้ายเกม · Keystone เลือกได้สูงสุด 3 อันต่อรอบ
- Shrine, Flask, Chaos Orb (สุ่มใหม่), Orb of Fusing, หีบสมบัติจาก Rare/บอส

## โครงสร้างไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `js/data/skills.js` | Skill Gem ทั้งหมด (ปรับตัวเลขได้ที่นี่) |
| `js/data/supports.js` | Support Gem |
| `js/data/passives.js` | Passive / Keystone |
| `js/data/monsters.js` | มอนสเตอร์, wave, บอส, shrine, ความยากตามเวลา |
| `js/data/classes.js` | คลาสเริ่มต้น |
| `js/data/ascendancy.js` | คลาสย่อย Ascendancy และโหนดทั้งหมด |
| `js/data/meta.js` | Legacy Tree (โหนด, Keystone, ราคา, จำนวนแต้มสูงสุด), เงื่อนไขปลดล็อก, สูตรคำนวณ Shards |
| `js/meta.js` | บันทึก/โหลดข้อมูลถาวร, จัดสรร/คืนแต้มโหนด, สรุปรางวัลตอนจบรอบ |
| `js/breach.js` | Breach event (เกิด, เปิด, ขยายวง, รางวัลตอนปิด) |
| `js/settings.js` | ตั้งค่า (บันทึกถาวร), เพลงประกอบแบบสังเคราะห์, ลดคุณภาพอัตโนมัติ, Tips |
| `js/codex.js` | หน้า Codex, คอมโบแนะนำ, หน้าตั้งค่า |
| `js/data/maps.js` | พื้นที่ (Biome), การเพิ่มความยากตาม Tier, Map Mods, จำนวนแต้มจาก Atlas |
| `js/data/items.js` | ฐานไอเทม, Affix (ช่วงค่า/ช่องที่ออกได้), Unique ทั้งหมด, การสุ่มสร้างไอเทม |
| `js/items.js` | การดรอป (โอกาสตามความหายากของมอนสเตอร์), เก็บของ, สวมใส่/ย่อย, วาดไอเทมบนพื้น |
| `js/data/evolutions.js` | สูตรวิวัฒนาการเจม (Vaal), Awakened Support, จำนวนวิญญาณที่ต้องใช้ |
| `js/stats.js` | คำนวณสเตตัสของสกิล (base + level + support + passive) |
| `js/combat.js` | การโจมตี, ailment, ดรอปของ |
| `js/skills.js` | พฤติกรรมของสกิลแต่ละแบบ |
| `js/enemies.js` | การเกิดศัตรู, AI, บอส |
| `js/fx.js` | อนุภาค, รอยบนพื้น (เลือด/รอยไหม้), hit-stop |
| `js/lighting.js` | ความมืดและแสงไดนามิก |
| `js/world.js` | ของตกแต่งฉาก (หลุมศพ, ต้นไม้ตาย, ซากปรักหักพัง, กระถางไฟ) |
| `js/icons.js` | ไอคอนเจมที่วาดด้วยโค้ด |
| `js/data/sprite_art.js` | Pixel art ของตัวละคร มอนสเตอร์ และบอส (1 ตัวอักษร = 1 พิกเซล แก้ภาพได้ตรงนี้) |
| `js/sprites.js` | แปลง pixel art เป็นภาพ, ขอบ, สีตอนโดนตี/แช่แข็ง, ส่วนที่เรืองแสง |
| `js/player.js` · `js/render.js` · `js/ui.js` · `js/game.js` | ผู้เล่น · วาดภาพ · เมนู · ลูปหลัก |

> หลังแก้ไฟล์ JS/CSS ให้เปลี่ยนเลข `?v=` ใน `index.html` เพื่อให้เบราว์เซอร์โหลดไฟล์ใหม่แทนไฟล์ที่ cache ไว้
