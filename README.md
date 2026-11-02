# Exile Survivors

เกมแนว survivor (แบบ Vampire Survivors) ที่ใช้ระบบ Skill Gem + Support Gem ตามแบบ Path of Exile 1
เขียนด้วย HTML5 Canvas + JavaScript ล้วน ไม่ต้องติดตั้งอะไร

## วิธีเล่น
- ดับเบิลคลิก `index.html` เพื่อเปิดในเบราว์เซอร์ หรือรันเซิร์ฟเวอร์: `python -m http.server 8765` แล้วเปิด http://localhost:8765
- **WASD / ลูกศร** เดิน · **Space** Flame Dash (อมตะชั่วครู่) · **1–5** ใช้ฟลาสก์ช่อง 1–5 (**Q** / **E** = ช่อง 1 / 2)
- **V** ใช้ท่าไม้ตาย Vaal (เมื่อวิญญาณเต็ม) · **U** เลือกการ์ดที่เก็บไว้ · **I** กระเป๋า/อุปกรณ์ · **C / Tab / Esc** หน้าสถิติตัวละคร (หยุดเกม) · **1–5** เลือกการ์ด · **R** ใช้ Chaos Orb สุ่มการ์ดใหม่ · **M** ปิดเสียง · **N** ปิดตัวเลขดาเมจ
- **L** เปิด/ปิดระบบแสงเงา · **F** เปิด/ปิดอนุภาคและเอฟเฟกต์ (ใช้เมื่อเครื่องช้า)
- **สลับแท็บ/หน้าต่างแล้วเกมยังเดินต่อ**: ไม่เปิด Pause อัตโนมัติ · ล้างปุ่มเดินและจอยที่ค้าง · เก็บการเลือกเลเวลอัป/หีบบอส/Ascendancy/Ritual ไว้จนกลับมา · ถ้าต้องการหยุดให้กด Esc/P/Tab เอง (หน้ากระเป๋าและหน้าตัดสินใจยังหยุดเกม) · ใช้ตัวขับเวลาเบื้องหลังและจำลองก้าวเล็ก ๆ เมื่อตัวจับเวลาถูกหน่วง ทั้งนี้ถ้าเบราว์เซอร์หรือระบบปฏิบัติการพักแท็บทั้งหน้า เกมจะทำงานได้อีกครั้งเมื่อแท็บถูกปลุก
- **T** เปิด/พัก Flicker Strike หรือกดปุ่ม Flicker บนจอ (ใช้ได้ทั้งเมาส์และมือถือ) · ยืนนิ่ง 0.3 วิจึงวาร์ปตัวจริงชุดละ 3 ครั้ง · กดเดินหรือ Dash ยกเลิกชุดที่เหลือทันที · พักระหว่างชุดอย่างน้อย 0.25 วิ · วาร์ปครั้งละไม่เกิน 240 และทั้งชุดอยู่ไม่เกิน 340 จากจุดเริ่ม · Multistrike เพิ่มการฟันซ้ำที่จุดวาร์ปโดยไม่เพิ่มการวาร์ป
- มือถือ: ลากนิ้วเพื่อเดิน, แตะสองครั้งเพื่อ Dash, แตะขวดที่มุมซ้ายล่างเพื่อใช้ Flask, แตะแถบสกิลเพื่อใช้ Vaal
- เมนูหลักมี **📖 Codex** (ข้อมูลเจม/Passive/Ascendancy/Unique/Map Mods ทั้งหมด + คอมโบแนะนำ ค้นหาและกรองแท็กได้) และ **⚙ ตั้งค่า** (เสียง, เพลง, แสง, เอฟเฟกต์, จอสั่น, คุณภาพกราฟิก) ส่วนรอบแรกจะมี Tips แนะนำระบบต่างๆ

## ระบบหลัก
- **Skill Gem 33 อัน** ร่ายอัตโนมัติ (เริ่ม 4 ช่องสกิล — Milestone เลเวล 30 ขึ้นไปมีการ์ดช่องสกิล +1 ได้สูงสุด 2 ครั้ง · Ascendancy Wanderlust +1 · Keystone Specialist -1 / Collector +2 · เลเวลเจม 1–20) มีรูปแบบ Projectile, Nova, Chain, Orbit, Ground, Aura, Minion, Spin, **Brand** (ประทับตราบนศัตรู), **Strike**, **Slam + Aftershock**, **Beam** (Channelling), **Herald** (ทำงานตอนศัตรูตาย) และ **Flicker Strike** (วาร์ปตัวจริงเป็นชุดสั้น ๆ กดเดินเพื่อหยุด หรือ T เพื่อเปิด/พัก) · สกิลใหม่: Smite, Frost Blades, Kinetic Blast, Glacial Cascade, Shock Nova
- **Support Gem 55 อัน** ทุกสกิลเริ่มด้วย **2 ช่อง Support ของตัวเอง** เพิ่มได้ถึง **6 ช่อง Support** ด้วย Jeweller's Orb · ไม่จำกัดสี ไม่มี Socket/Link บนอุปกรณ์ · Support ยังต้องมีแท็กที่เข้ากับสกิลและไม่ขัดกัน รวมถึงคำสาป (Hextouch), Penetration, Elemental Proliferation, Spell Cascade, Multistrike, Ruthless, Brutality, Deadly Ailments, Returning Projectiles, Fortify, Close Combat, Impale, Trinity, Arcane Surge, Unleash, Barrage, Pulverise
- **Passive 34 อัน + Keystone 15 อัน** (เช่น Elemental Overload, Avatar of Fire, Elemental Equilibrium, Runebinder, Hex Master, **Chaos Inoculation**, Perfect Agony, Arrow Dancing)
- **คอมโบตัวอย่าง**: Herald of Ice + Ice Nova/Freezing Pulse (ศัตรูแช่แข็งแตกระเบิดต่อเนื่อง) · Contagion + Essence Drain (พิษแพร่ทั้งฝูง) · Storm/Armageddon Brand + Runebinder · คำสาป + Penetration ทะลุ map mod Warded · Elemental Equilibrium + สกิลหลายธาตุ
- **เลเวลอัป**: เลือกการ์ด 3 ใบ (สกิลใหม่ / เลเวลเจม +2 / Support / Passive +2 ระดับ) ประมาณ 50–60 ครั้งต่อรอบ การ์ดที่เข้ากับบิลด์มีป้าย **★** · ทุก 10 เลเวลเป็น **MILESTONE** (Keystone ที่เข้ากับสกิลของคุณ, Awaken, Empower +3 เลเวลเจมหลัก, ช่องสกิล +1 ตั้งแต่เลเวล 30)
  - หีบจากมอนสเตอร์ Rare ให้ของทันทีไม่ต้องหยุดเกม (เลเวลเจม, Orb) — หีบจากบอสยังให้เลือกการ์ด
  - ตั้งค่า "เลเวลอัป": เปิดการ์ดทันที / **เปิดทันทียกเว้นตอนสู้บอส** (ค่าเริ่มต้น) / เก็บไว้กด **U** เมื่อพร้อม — การ์ดที่รออยู่แสดงเป็นป้าย "⬆ เลือกการ์ด ×N" มุมซ้ายบน
- **แผนที่มีขอบเขต**: ลานสี่เหลี่ยมขนาด 4,400 × 4,400 มีกำแพงล้อมรอบ (มอนสเตอร์ ศาลเจ้า และ league content เกิดในขอบเขตเสมอ) · **มินิแมพ**มุมขวาล่างแสดงทั้งแผนที่: มอนสเตอร์ (แดง / Magic น้ำเงิน / Rare เหลือง), บอส, ไอเทม Rare/Unique, ศาลเจ้า และวงสีของ Breach / Strongbox / Essence / Ritual / Delirium · กด **Z** หรือปิดในหน้าตั้งค่า
- **Ailment**: Ignite, Chill, Freeze, Shock, Poison
- **ค่าต้านทาน (Resistance)**: มอนสเตอร์บางชนิด/บอส/map mod โจมตีเป็นไฟ น้ำแข็ง สายฟ้า หรือเคออส ผู้เล่นมีค่าต้านทานสูงสุด 75% (+max res) และ **แผนที่ Tier สูงลดค่าต้านทาน -8% ต่อ Tier** (T8 = -56%) — หาได้จาก mod ไอเทม (of the Drake / Penguin / Squall / Prism / Lost), แหวน Ruby/Sapphire/Topaz/Amethyst, ฟลาสก์ Ruby/Sapphire/Topaz/Amethyst, Passive, Jewel และ Legacy Tree
- **หน้าสถิติ (C)**: ค่าต้านทานทุกธาตุ, Hit ใหญ่สุดที่รับได้ต่อธาตุ, DPS จริงของแต่ละสกิล (10 วิล่าสุด) · **สรุปก่อนตาย**: ดาเมจที่รับใน 6 วิสุดท้ายแยกตามแหล่งและธาตุ พร้อมคำแนะนำ
- **บอสมีสัญญาณเตือน**: วงกลม, แนวลำแสง (line), กรวย (cone), วงแหวน (ยืนใกล้บอสถึงรอด) และอุกกาบาตตามตัว — หลบได้ทุกท่า
- **League mechanics**: **Breach** · **Strongbox** (ยืนข้างกล่อง ผู้พิทักษ์ออกมา 3 ระลอก แล้วได้ของตามชนิดกล่อง) · **Essence** (Rare ถูกผนึกในคริสตัล เดินเข้าไปปลดผนึก ฆ่าแล้วได้ Essence ใช้สร้าง Rare ที่การันตี mod) · **Ritual** (ยืนในวงพิธี 20 วิ ฆ่าเก็บ Tribute แล้วแลกรางวัล) · **Delirium** (แตะกระจก หมอกตามตัว 45 วิ มอนสเตอร์แกร่งขึ้นเรื่อยๆ แต่ของดีขึ้นเรื่อยๆ)
- **Crafting Bench**: เพิ่ม mod ที่เลือกเองได้ 1 อันต่อไอเทม (เช่น +30 ชีวิต, +20% ต้านทาน) จ่ายด้วย Orb · **Loot Filter** ในหน้าตั้งค่า (ซ่อน Normal / Rare ขึ้นไป / เข้มงวด — ของที่ซ่อนย่อยเป็น Shard อัตโนมัติ) และไฮไลต์ไอเทมที่มีค่าต้านทาน
- **Ascendancy**: โค่นบอสตัวแรก (3:45) แล้วเลือกคลาสย่อย 1 ใน 2 แบบ (มี 14 แบบ คลาสละ 4 โหนด) บอสตัวถัดไปให้ปลดล็อกโหนดเพิ่ม · Scion สาย Paragon จะสุ่มโหนดจากคลาสอื่นมาให้เลือก
- **Gem Evolution (Vaal)**: เจมเลเวล 10 ขึ้นไปที่ใส่ Support ตามสูตรจะได้การ์ด EVOLVE กลายเป็นร่าง Vaal ที่แรงขึ้น พร้อมท่าไม้ตาย: ฆ่าศัตรูเก็บวิญญาณ 90 ดวง แล้วกด V เพื่อระเบิดรอบตัวและร่ายเร็ว 2.5 เท่านาน 6 วิ (ดูสูตรได้ในการ์ดและหน้าบิว)
- **Awakened Support** (เลเวล 12 ขึ้นไป): ปลุกพลัง Support ที่ใส่อยู่ ได้ดาเมจ 20% more พร้อมโบนัสเฉพาะตัว
- **ไอเทมแบบ PoE (รีเซ็ตทุกรอบ)**: หน้า **I** เป็นตัวละคร (paper doll) 10 ช่อง — อาวุธ, มือรอง, หมวก, เกราะ, ถุงมือ, รองเท้า, เข็มขัด, สร้อยคอ, แหวน 2 วง — และฟลาสก์ 5 ช่อง
  - **อาวุธ** 8 ประเภท (ธนู, คทายาว, ไม้กายสิทธิ์, คทา, ดาบ, ขวาน, มีดสั้น, กระบอง) ทุกคลาสเริ่มด้วยอาวุธประจำคลาส สกิล **Attack** แรงตามพลังอาวุธ (ดาเมจ × ความเร็วโจมตี) สกิลธนูต้องถือธนู อาวุธสองมือใช้โล่ไม่ได้ ส่วน Quiver ใช้กับธนูเท่านั้น
  - **ระบบป้องกัน**: Armour (ลดดาเมจกายภาพ ได้ผลดีกับ hit เล็ก) · Evasion (หลบการโจมตีและกระสุน) · Energy Shield (โล่บนชีวิต ฟื้นเองหลังไม่โดนตี 2 วิ — แหวนสีฟ้ารอบลูกแก้วชีวิต) · Block (จากโล่) ฐานไอเทมแบ่งเป็นสาย Armour / Evasion / ES / ผสม
  - **Prefix / Suffix + Tier**: Magic มีได้ 1+1, Rare 3+3 mod แต่ละอันมี Tier T1–T7 ตาม Item Level (ดรอปช้าในรอบ / Tier แผนที่สูง = ได้ Tier ดีขึ้น) ติ๊ก "แสดง Prefix / Suffix และ Tier" หรือกด Alt เพื่อดู
  - **ช่อง Support ของสกิล**: กด I → "ช่อง Support ของสกิล" หรือ C / Tab / Esc → "บิวของคุณ" แล้วกด Jeweller ข้างสกิลที่ต้องการได้เลย · ทุกสกิลเริ่ม 2 ช่อง ไม่ใช้ Socket ใส่ Skill Gem เอง · แต่ละสกิลเพิ่มแยกกัน และเปลี่ยน/ถอดเกราะหรืออาวุธแล้วจำนวนช่องไม่เปลี่ยน · อุปกรณ์ใน Stash รุ่นเก่าจะลบเฉพาะข้อมูล Socket/Link โดยคง mod และความคืบหน้าไว้
  - **Jeweller's Orb 3 / 4 / 5 / 6**: ใช้ 1 ลูกเพิ่มช่องเป็น 3 / 4 / 5 / 6 แน่นอน ไม่สุ่มและไม่ลดช่องเดิม · ใช้ข้ามขั้นได้ เช่น 2 → 5 หรือ 2 → 6 · ใช้กับสกิลที่มีช่องเท่ากันหรือมากกว่าไม่ได้และไม่เสีย Orb · ระดับ 3 พบบ่อยที่สุด ตามด้วย 4, 5 และ 6 หายากที่สุด · ดรอปจากมอนสเตอร์ บอส หีบและกิจกรรม · เอา Fusing และ Chromatic ออกจากรางวัลและคราฟต์แล้ว
  - **ฟลาสก์เป็นไอเทม**: Life, Quicksilver, Granite (Armour), Jade (Evasion), Silver (ความเร็ว), Sulphur (ดาเมจ), Diamond (คริ) พร้อม mod เช่น Ample, Chemist's, of Fending, of Adrenaline
  - **กระเป๋าแบบตาราง 12×5**: ไอเทมมีขนาดต่างกัน **ลากวาง**ไปมาระหว่างกระเป๋า ตัวละคร และช่องฟลาสก์ได้ มีปุ่ม "จัดเรียง" อัตโนมัติ
  - **ดูง่ายว่าของไหนดี**: ทุกไอเทมในกระเป๋ามีป้าย **▲ เขียว** (ดีกว่าที่สวมอยู่) / **▼ แดง** (แย่กว่า) / **● เทา** (ใกล้เคียง) คิดจากผลจริงต่อ DPS, ชีวิต, ES, ค่าต้านทาน, Armour/Evasion, Block, ความเร็ว · กด/ชี้ไอเทมเห็นส่วนต่างเป็นตัวเลข (เช่น "DPS +12% · ต้านไฟ -8%") · ช่องที่ว่างแต่มีของใส่ได้จะขึ้นกรอบเขียว
  - **สรุปสเตตัสใต้ตัวละคร**: ชีวิต, ES, ดาเมจ/วิ, Armour, หลบ, Block, ความเร็ว, ค่าต้านทาน 4 ธาตุ (อัปเดตทันทีเมื่อเปลี่ยนของ)
  - **ย่อยของทีละหลายชิ้น**: "♻ ย่อยของที่แย่กว่า" (เฉพาะ ▼ และฟลาสก์ขาว) และ "♻ ย่อยทั้งหมด" (กดยืนยัน 2 ครั้ง) — ไม่ย่อย Unique, Jewel และของที่ **🔒 ล็อก** ไว้
  - เมนูคราฟต์อุปกรณ์ (Orb / Essence / Bench) พับเก็บไว้ ส่วนช่อง Support และปุ่ม Jeweller อยู่ใต้ตัวละคร
  - **Unique 29 ชิ้น** (ออกแบบเอง) รวมอาวุธ (Stormstring, Pyre of the Ancients, Oathbreaker), โล่ Bastion of Echoes และเข็มขัด Girdle of Plenty
  - **Currency**: Regal, Exalted, Divine, Annulment, Chaos (ปรับ mod) · Jeweller's Orb 3/4/5/6 (เพิ่มช่อง Support ของสกิลเท่านั้น) · Whetstone / Armourer's Scrap (Quality สูงสุด 20%) · **Vaal Orb** (Corrupt: ได้ implicit พิเศษ / ไม่เปลี่ยน / สุ่ม mod ใหม่ / mod หาย — แล้วแก้ไขไม่ได้อีก)
  - Rare/Unique มีลำแสงบนพื้น ไอเทมเก็บอัตโนมัติเมื่อเดินผ่าน (ถ้าช่องว่างจะสวมให้ทันที) ย่อยไอเทมเป็น Ancient Shards ได้
  - คลัง Unique ที่เคยค้นพบบันทึกถาวรและดูได้ที่ Altar of Legacy
  - **Unique 31 ชิ้น** รวม Ward of the Tempest (โล่ต้านธาตุ) และ Stillwater Vestment (ES / ต้านเคออส — เข้ากับ Chaos Inoculation)
- **อาวุธกำหนดสกิล**: เจมธนู (Split/Caustic/Lightning Arrow, Tornado Shot, Toxic Rain) ต้องถือธนู · เจม Melee ต้องถืออาวุธประชิดตามชนิด (เช่น Earthquake ใช้กระบอง/คทา/ขวาน/คทายาว) · Kinetic Blast ใช้ไม้กายสิทธิ์ · เจมเวทยิงกระสุน (Fireball, Arc, Spark ฯลฯ) ใช้กับไม้กายสิทธิ์/คทายาว/คทา/มีดสั้น · **ใช้ได้ทุกอาวุธ**: Ice Nova, Shock Nova, Contagion, Righteous Fire, Herald of Ice, Brand, Minion, Firestorm · ถืออาวุธไม่ตรง สกิลจะหยุดทำงาน (กากบาทแดงบนแถบสกิล) · ดูได้ในการ์ด, Codex และ tooltip อาวุธ
- **Passive Tree ระหว่างรอบ + Mastery**: Passive แบ่งเป็น 7 สาย — Projectile, Critical, Ailment, Defence, Caster, Warfare, Minion · ลงครบ 6 ระดับ (Defence 8) แล้ว **Milestone** ถัดไปจะให้เลือก Mastery 1 ใน 2 เช่น Projectile: Boomerang (กระสุนย้อนกลับ) หรือ Close Quarters (ใกล้แรง ไกลอ่อน) · Critical: Assassin's Edge หรือ Lucky Strikes · ดูความคืบหน้าในหน้าบิว (C) และ Codex
- **Unique เฉพาะแหล่ง**: Unique บางชิ้นดรอปเฉพาะบอสประจำพื้นที่, Pinnacle, Echo, Breach, Ritual, Delirium หรือ Strongbox (ดูใน Codex → Unique ตัวกรองตามแหล่ง) · Unique ที่เปลี่ยนสกิล เช่น Stormheart Fang (Flicker → สายฟ้า), Eye of the Gale (Tornado Shot แนวแคบ), The Pale Engine (Fireball → น้ำแข็ง), Earthbreaker Maul, Voidweave Coil (Arc → เคออส), Crown of the Hollow King (Keystone +1)
- **Scarab**: ใส่ที่ Map Device ก่อนเปิดแผนที่ (เริ่ม 2 ช่อง) ใช้แล้วหมด — Breach / Strongbox / Essence / Ritual / Delirium / Cartography / Gilded / Elites / Reliquary / Hunted / Vault · ดรอปจากบอส, Rare, league content, ห้องรางวัล หรือซื้อสุ่ม 45 ✦
- **ห้องรางวัล (Vault)**: โค่นบอสสุดท้ายแล้วเลือกรางวัลถาวร 1 จาก 3 การ์ด (ธรรมดา / หายาก / ตำนาน — Tier และ mod สูงยิ่งได้ตำนานบ่อย)
- **Gem Mastery** (Altar → Gem Mastery): เจมที่ใช้ได้ XP ข้ามรอบ · +2% ดาเมจต่อเลเวล (หลัง Lv 20 +0.5% ไม่จำกัด) · Lv 3/6/10 ปลด Alternate Quality Anomalous / Divergent / Phantasmal · Lv 15 ได้เจมนี้เริ่ม +2 เลเวล · เติม XP ด้วย Shards ได้ไม่จำกัด
- **Heirloom**: ใน Stash กด "ผูกเป็น Heirloom" (80 ✦, สูงสุด 4 ชิ้น) · พกเข้ารอบแล้วกลับเข้า Stash เอง · ได้ XP ทุกรอบ (ชนะได้มากกว่า) · Lv 1–5: +3% ดาเมจและชีวิตต่อเลเวล, Lv 5 +1 เลเวลเจม · ตายใน Hardcore = หาย
- **Challenges 24 ข้อ** (Altar → Challenges): ทำสำเร็จได้ Shards · ทุก 4 ข้อได้โบนัสถาวร (ช่อง Scarab, Stash +1, Shards +10%, การ์ดห้องรางวัล +1, ดาเมจ/ชีวิต, Unique บ่อยขึ้น)
- **Unique Collection**: ค้นพบครบ 5/10/15/20/25/30/40 ชิ้นได้โบนัสถาวร
- **Voidstone 4 อัน**: โค่น The Hollow Crown, ผ่านครบทุกพื้นที่ใน Tier 6+, โค่น Echo รวม 10 ตัว, ชนะ Tier 8+ ใน Hardcore · แต่ละอันทำให้แผนที่ Tier 6 ขึ้นไปมอนสเตอร์แข็งขึ้นแต่ไอเทม/Unique/Shards/Scarab เพิ่มขึ้น · **Atlas Completion**: ผ่านครบทุกพื้นที่ใน Tier เดียวกัน = +1 แต้ม Atlas Tree + 2 Scarab
- **Stash (เก็บของข้ามรอบ)**: จบรอบเลือกไอเทมเก็บได้ (ตาย 2 ชิ้น, ชนะ 4 ชิ้น) Jewel เก็บอัตโนมัติ · ที่ Map Device เลือกพกของจาก Stash เข้ารอบได้ 2 ชิ้น (จ่าย Shards ตามความหายาก) · ดู/ย่อยของได้ที่ปุ่ม 📦 Stash ในเมนูหลัก
- **Jewel**: Crimson / Viridian / Cobalt ดรอปจากบอส, Rare, Strongbox, Ritual, Delirium ใส่ใน **Jewel Socket 6 ช่องบน Legacy Tree** (ช่องละสาย) เพื่อรับ mod ทุกรอบ
- **Atlas / Map Device**: หลังเลือกคลาสจะเข้าหน้า Map Device เพื่อเลือกแผนที่
  - **5 พื้นที่**: Cursed Graveyard, Ashen Wastes (Volatile/Brute), Frozen Hollow (Frost Wraith, ปลดล็อกที่ Tier 2), Toxic Marsh (ซากศพ/Cultist, Tier 3), Void Sanctum (มอนสเตอร์แข็งขึ้น 15%, Tier 5) แต่ละพื้นที่มีสีพื้น แสง และชนิดมอนสเตอร์ต่างกัน
  - **Tier 1–10**: Tier 1 คือเกมปกติ ทุก Tier เพิ่มชีวิตมอนสเตอร์ +25% ดาเมจ +8% และรางวัล Shards +15% ชนะแผนที่เพื่อปลดล็อก Tier ถัดไป
  - **Map Mods 16 แบบ** เช่น Hardened, Elite, Burning Ground, Withering Air, Lightless กด Alchemy เพื่อสุ่ม mod ฟรี (3–5 อันตาม Tier) หรือสุ่มใหม่ด้วย 3 ✦ ทุก mod เพิ่ม Item Quantity และโบนัส Shards
  - ผ่านแผนที่ใหม่แต่ละอัน (พื้นที่+Tier) ได้ **+1 แต้ม Legacy Tree** ถาวร (สูงสุด +15)
  - **แผนที่เป็นไอเทม**: ดรอปจากบอส (บอสสุดท้ายให้แผนที่ Tier ถัดไปแน่นอน), Rare, Strongbox, Ritual, Delirium เก็บไว้ในคลังแผนที่ (40 ใบ) · Tier 1 เล่นฟรี · Tier สูงกว่าต้องใช้แผนที่ หรือซื้อด้วย Shards (8 ✦ × Tier)
  - **Atlas Passive Tree**: 6 สาย (Strongbox, Essence, Ritual, Delirium, Breach, Cartography) ปรับว่า league content ไหนเกิดบ่อย/ให้ของมาก แต้ม = แผนที่ที่ผ่าน + บอสสะสมทุก 8 ตัว คืนแต้มฟรี
  - **☠ Hardcore**: ตาย = เสีย Shard แผนที่ Jewel ของรอบนั้น และเก็บของเข้า Stash ไม่ได้ · ชนะ = Shard ×1.5 และเก็บของได้ +2 ชิ้น
- **📅 Daily Challenge**: ทุกวันได้คลาส แผนที่ Tier และ mod ชุดเดียวกัน (สุ่มแบบ seed ตามวันที่) บันทึกสถิติดีที่สุดของวัน
- **Meta-progression**: จบทุกรอบจะได้ **Ancient Shards ✦** (ตามเวลารอด, จำนวนฆ่า, บอส, เลเวล, ชนะ +100) เอาไปใช้ที่ **Altar of Legacy** ในเมนูหลัก
  - **Legacy Tree** แบบ passive tree ของ PoE มี 66 โหนด แบ่งเป็น 6 สาย: Arcane (เวท/ธาตุ), Shadow (คริ/เคออส), Hunt (Projectile/ความเร็ว), Bastion (ชีวิต/ป้องกัน/ฟลาสก์), Warfare (Attack/กายภาพ/AoE), Occult (มินเนียน/เผาไหม้/XP)
  - แต่ละสายมีโหนดเล็ก, Notable 3 อัน และ **Keystone** ที่เปลี่ยนแนวบิวที่ปลายสาย ได้แก่ Specialist, Glass Cannon, Collector, Born Ascendant, Gem Savant, Minion Lord มีโหนดเชื่อมระหว่างสายเป็นวงใน ทำให้เดินได้หลายเส้นทาง
  - จัดสรรได้เฉพาะโหนดที่ติดกับโหนดที่มีอยู่แล้ว สูงสุด **40 แต้ม** จึงต้องเลือกทิศทาง ราคาโหนดเพิ่มขึ้นตามจำนวนที่จัดสรรแล้ว
  - คืนแต้มฟรี: คลิกโหนดปลายทางเพื่อคืนทีละโหนด หรือกด "คืนแต้มทั้งหมด"
  - คลาส Templar / Shadow / Duelist / Scion และเจม Caustic Arrow / Raging Spirit / Firestorm / Righteous Fire เริ่มแบบล็อก ปลดล็อกได้ด้วยการทำเงื่อนไขในเกม หรือซื้อด้วย Shards
  - ข้อมูลถาวรเก็บใน localStorage ของเบราว์เซอร์ (`exile_meta`) ถ้าเคยเล่นมาก่อน สถิติดีที่สุดเดิมจะปลดล็อกของที่เข้าเงื่อนไขให้อัตโนมัติ
- มอนสเตอร์ 20 ชนิด Normal / Magic / Rare (มี mod สุ่ม) แต่ละแบบต้องรับมือต่างกัน (ดูได้ใน Codex แท็บ "มอนสเตอร์"):
  - **Ash Ghoul** กระโจนใส่ · **Bile Spitter** พ่นแอ่งพิษ · **Bone Shaman** บัฟพวกเดียวกัน
  - **Grave Caller** อัญเชิญโครงกระดูกแล้วหนี · **Bristleback Charger** พุ่งชาร์จเป็นเส้นตรง (มีเส้นเตือน) · **Plague Bloater** ตายแล้วแตกเป็นแอ่งพิษใหญ่
  - **Ember Mortar** ยิงกระสุนครกลงตรงที่คุณกำลังจะเดินไป · **Aegis Sentinel** สร้างเกราะให้มอนสเตอร์รอบตัว (รับดาเมจครึ่งเดียว) · **Void Stalker** วาร์ปมาโผล่ข้างหลัง · **Carrion Broodmother** ตายแล้วแตกเป็นฝูง Scuttler
  - แต่ละพื้นที่มีมอนสเตอร์เด่นต่างกัน (Ashen: Mortar/Charger · Frozen: Stalker/Sentinel · Marsh: Bloater/Broodmother/Grave Caller · Void: Stalker/Sentinel)
- **หนึ่งรอบยาว 15 นาที**: บอส 4 ตัว (3:45, 7:30, 11:15, 15:00) โค่นบอสสุดท้ายเพื่อชนะ · บอสมี **Phase**: ที่ 66% และ 33% จะอมตะชั่วครู่และเรียกลูกน้อง
  - บอสประจำพื้นที่: Cinder Colossus (Ashen), Rime Herald (Frozen), Bog Leviathan (Marsh), Herald of the Void (Void)
  - **Pinnacle Boss** — The Hollow Crown แทนบอสสุดท้ายใน Tier 8 ขึ้นไป (โบนัส +250 ✦)
- **Endgame ∞**: ชนะแล้วเลือกได้ว่าจะออกจากแผนที่ หรืออยู่ต่อใน Endgame — มอนสเตอร์แข็งขึ้นไม่สิ้นสุด, **Echo บอส** มาทุก 100 วิ (แต่ละตัวแข็งกว่าเดิม 40% ดรอปแผนที่ Tier ถัดไป, Orb และอาจได้ Unique) · ได้ +15 ✦ ต่อนาทีและ +40 ✦ ต่อ Echo · ตายใน Endgame ยังนับว่าชนะ
- **Breach** (league mechanic): รอยแยกสีม่วงปรากฏเป็นระยะ เดินเข้าไปเพื่อเปิด ฆ่ามอนสเตอร์ Breach ให้มากที่สุดก่อนวงปิด รางวัลตามจำนวนที่ฆ่า (Orb คราฟต์, หีบ, ไอเทม Rare/Unique)
- **ความยาก**: มอนสเตอร์แข็งและแรงขึ้นมากช่วงท้ายเกม · Keystone เลือกได้สูงสุด 3 อันต่อรอบ
- Shrine, Flask, Chaos Orb (สุ่มใหม่), Jeweller's Orb 3/4/5/6, หีบสมบัติจาก Rare/บอส

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
| `js/leagues.js` | Strongbox, Essence, Ritual (+หน้าต่างแลกรางวัล), Delirium |
| `js/data/runtree.js` | สาย Passive ระหว่างรอบ และ Mastery ของแต่ละสาย |
| `js/data/endgame.js` | แหล่งดรอป Unique + Unique เปลี่ยนบิว, Scarab, Gem Mastery / Alternate Quality, Heirloom, ห้องรางวัล, Challenges, Unique Collection, Voidstone |
| `js/progression.js` | ระบบข้ามรอบข้างต้นตอนเล่นจริง: ดรอป Scarab/Unique ตามแหล่ง, สรุปจบรอบ, หน้า Altar และ Scarab ที่ Map Device |
| `js/stash.js` | แผนที่/Jewel ที่ดรอป, Stash, ของที่พกเข้ารอบ, Atlas Tree, Jewel Socket, Daily Challenge |
| `js/settings.js` | ตั้งค่า (บันทึกถาวร), เพลงประกอบแบบสังเคราะห์, ลดคุณภาพอัตโนมัติ, Tips |
| `js/codex.js` | หน้า Codex, คอมโบแนะนำ, หน้าตั้งค่า |
| `js/data/maps.js` | พื้นที่ (Biome), การเพิ่มความยากตาม Tier, Map Mods, จำนวนแต้มจาก Atlas |
| `js/data/items.js` | ฐานไอเทม (อาวุธ/เกราะ/ฟลาสก์), Prefix/Suffix + Tier, Unique, Jeweller แต่ละระดับ, Currency และการคราฟต์ |
| `js/items.js` | การดรอป, กระเป๋าตาราง, กฎการสวมใส่, ช่อง Support ของสกิลและการใช้ Jeweller, ฟลาสก์, Armour/Evasion |
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

## ตรวจสอบก่อนปล่อยเวอร์ชัน

รันชุดทดสอบด้วย Node.js จากโฟลเดอร์โปรเจกต์:

```sh
node --test tests/*.test.cjs
```

ครอบคลุม Flicker และการยกเลิกด้วยปุ่มเดิน, ลูปเบื้องหลัง, Tornado Shot/Fork และ Jeweller เพิ่มช่อง Support รวมถึงการย้ายข้อมูล Stash รุ่นเก่า · อาวุธกำหนดสกิล, Mastery, Unique ตามแหล่ง, Scarab, ห้องรางวัล, Heirloom และ Gem Mastery
