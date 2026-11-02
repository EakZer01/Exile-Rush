# Exile Survivors

เกมแนว survivor (แบบ Vampire Survivors) ที่ใช้ระบบ Skill Gem + Support Gem ตามแบบ Path of Exile 1
เขียนด้วย HTML5 Canvas + JavaScript ล้วน ไม่ต้องติดตั้งอะไร

## วิธีเล่น
- ดับเบิลคลิก `index.html` เพื่อเปิดในเบราว์เซอร์ หรือรันเซิร์ฟเวอร์: `python -m http.server 8765` แล้วเปิด http://localhost:8765
- **WASD / ลูกศร** เดิน · **Space** Flame Dash (อมตะชั่วครู่) · **1–5** ใช้ฟลาสก์ช่อง 1–5 (**Q** / **E** = ช่อง 1 / 2)
- **V** ใช้ท่าไม้ตาย Vaal (เมื่อวิญญาณเต็ม) · **U** เลือกการ์ดที่เก็บไว้ · **I** กระเป๋า/อุปกรณ์ · **C / Tab / Esc** หน้าสถิติตัวละคร (หยุดเกม) · **1–5** เลือกการ์ด · **R** ใช้ Chaos Orb สุ่มการ์ดใหม่ · **M** ปิดเสียง · **N** ปิดตัวเลขดาเมจ
- **L** เปิด/ปิดระบบแสงเงา · **F** เปิด/ปิดอนุภาคและเอฟเฟกต์ (ใช้เมื่อเครื่องช้า)
- มือถือ: ลากนิ้วเพื่อเดิน, แตะสองครั้งเพื่อ Dash, แตะขวดที่มุมซ้ายล่างเพื่อใช้ Flask, แตะแถบสกิลเพื่อใช้ Vaal
- เมนูหลักมี **📖 Codex** (ข้อมูลเจม/Passive/Ascendancy/Unique/Map Mods ทั้งหมด + คอมโบแนะนำ ค้นหาและกรองแท็กได้) และ **⚙ ตั้งค่า** (เสียง, เพลง, แสง, เอฟเฟกต์, จอสั่น, คุณภาพกราฟิก) ส่วนรอบแรกจะมี Tips แนะนำระบบต่างๆ

## ระบบหลัก
- **Skill Gem 33 อัน** ร่ายอัตโนมัติ (สูงสุด 6 สกิล, เลเวล 1–20) มีรูปแบบ Projectile, Nova, Chain, Orbit, Ground, Aura, Minion, Spin, **Brand** (ประทับตราบนศัตรู), **Strike**, **Slam + Aftershock**, **Beam** (Channelling), **Herald** (ทำงานตอนศัตรูตาย) และ **Flicker Strike** (วาร์ปเข้าหาศัตรูแล้วฟาด) · สกิลใหม่: Smite, Frost Blades, Kinetic Blast, Glacial Cascade, Shock Nova
- **Support Gem 55 อัน** ใส่ในซ็อกเก็ตของสกิล (เริ่ม 3-Link, ใช้ Orb of Fusing ขยายได้ถึง 6-Link) ใช้ระบบแท็กแบบ PoE รวมถึงคำสาป (Hextouch), Penetration, Elemental Proliferation, Spell Cascade, Multistrike, Ruthless, Brutality, Deadly Ailments, Returning Projectiles, Fortify, Close Combat, Impale, Trinity, Arcane Surge, Unleash, Barrage, Pulverise
- **Passive 34 อัน + Keystone 15 อัน** (เช่น Elemental Overload, Avatar of Fire, Elemental Equilibrium, Runebinder, Hex Master, **Chaos Inoculation**, Perfect Agony, Arrow Dancing)
- **คอมโบตัวอย่าง**: Herald of Ice + Ice Nova/Freezing Pulse (ศัตรูแช่แข็งแตกระเบิดต่อเนื่อง) · Contagion + Essence Drain (พิษแพร่ทั้งฝูง) · Storm/Armageddon Brand + Runebinder · คำสาป + Penetration ทะลุ map mod Warded · Elemental Equilibrium + สกิลหลายธาตุ
- **เลเวลอัป**: เลือกการ์ด 3 ใบ (สกิลใหม่ / เลเวลเจม +2 / Support / Passive +2 ระดับ) ประมาณ 50–60 ครั้งต่อรอบ การ์ดที่เข้ากับบิลด์มีป้าย **★** · ทุก 10 เลเวลเป็น **MILESTONE** (Keystone ที่เข้ากับสกิลของคุณ, Awaken, Empower +3 เลเวลเจมหลัก)
  - หีบจากมอนสเตอร์ Rare ให้ของทันทีไม่ต้องหยุดเกม (เลเวลเจม, Orb) — หีบจากบอสยังให้เลือกการ์ด
  - ตั้งค่า "เลเวลอัป": เปิดการ์ดทันที / **เปิดทันทียกเว้นตอนสู้บอส** (ค่าเริ่มต้น) / เก็บไว้กด **U** เมื่อพร้อม — การ์ดที่รออยู่แสดงเป็นป้าย "⬆ เลือกการ์ด ×N" มุมซ้ายบน
- **Ailment**: Ignite, Chill, Freeze, Shock, Poison
- **ค่าต้านทาน (Resistance)**: มอนสเตอร์บางชนิด/บอส/map mod โจมตีเป็นไฟ น้ำแข็ง สายฟ้า หรือเคออส ผู้เล่นมีค่าต้านทานสูงสุด 75% (+max res) และ **แผนที่ Tier สูงลดค่าต้านทาน -8% ต่อ Tier** (T8 = -56%) — หาได้จาก mod ไอเทม (of the Drake / Penguin / Squall / Prism / Lost), แหวน Ruby/Sapphire/Topaz/Amethyst, ฟลาสก์ Ruby/Sapphire/Topaz/Amethyst, Passive, Jewel และ Legacy Tree
- **หน้าสถิติ (C)**: ค่าต้านทานทุกธาตุ, Hit ใหญ่สุดที่รับได้ต่อธาตุ, DPS จริงของแต่ละสกิล (10 วิล่าสุด) · **สรุปก่อนตาย**: ดาเมจที่รับใน 6 วิสุดท้ายแยกตามแหล่งและธาตุ พร้อมคำแนะนำ
- **บอสมีสัญญาณเตือน**: วงกลม, แนวลำแสง (line), กรวย (cone), วงแหวน (ยืนใกล้บอสถึงรอด) และอุกกาบาตตามตัว — หลบได้ทุกท่า
- **League mechanics**: **Breach** · **Strongbox** (ยืนข้างกล่อง ผู้พิทักษ์ออกมา 3 ระลอก แล้วได้ของตามชนิดกล่อง) · **Essence** (Rare ถูกผนึกในคริสตัล เดินเข้าไปปลดผนึก ฆ่าแล้วได้ Essence ใช้สร้าง Rare ที่การันตี mod) · **Ritual** (ยืนในวงพิธี 20 วิ ฆ่าเก็บ Tribute แล้วแลกรางวัล) · **Delirium** (แตะกระจก หมอกตามตัว 45 วิ มอนสเตอร์แกร่งขึ้นเรื่อยๆ แต่ของดีขึ้นเรื่อยๆ)
- **Crafting Bench**: เพิ่ม mod ที่เลือกเองได้ 1 อันต่อไอเทม (เช่น +30 ชีวิต, +20% ต้านทาน) จ่ายด้วย Orb · **Loot Filter** ในหน้าตั้งค่า (ซ่อน Normal / Rare ขึ้นไป / เข้มงวด — ของที่ซ่อนย่อยเป็น Shard อัตโนมัติ) และไฮไลต์ไอเทมที่มีค่าต้านทาน
- **Ascendancy**: โค่นบอสตัวแรก (3:45) แล้วเลือกคลาสย่อย 1 ใน 2 แบบ (มี 14 แบบ คลาสละ 4 โหนด) บอสตัวถัดไปให้ปลดล็อกโหนดเพิ่ม · Scion สาย Paragon จะสุ่มโหนดจากคลาสอื่นมาให้เลือก
- **Gem Evolution (Vaal)**: เจมเลเวล 10 ขึ้นไปที่ลิงก์ Support ตามสูตรจะได้การ์ด EVOLVE กลายเป็นร่าง Vaal ที่แรงขึ้น พร้อมท่าไม้ตาย: ฆ่าศัตรูเก็บวิญญาณ 90 ดวง แล้วกด V เพื่อระเบิดรอบตัวและร่ายเร็ว 2.5 เท่านาน 6 วิ (ดูสูตรได้ในการ์ดและหน้าบิว)
- **Awakened Support** (เลเวล 12 ขึ้นไป): ปลุกพลัง Support ที่ใส่อยู่ ได้ดาเมจ 20% more พร้อมโบนัสเฉพาะตัว
- **ไอเทมแบบ PoE (รีเซ็ตทุกรอบ)**: หน้า **I** เป็นตัวละคร (paper doll) 10 ช่อง — อาวุธ, มือรอง, หมวก, เกราะ, ถุงมือ, รองเท้า, เข็มขัด, สร้อยคอ, แหวน 2 วง — และฟลาสก์ 5 ช่อง
  - **อาวุธ** 8 ประเภท (ธนู, คทายาว, ไม้กายสิทธิ์, คทา, ดาบ, ขวาน, มีดสั้น, กระบอง) ทุกคลาสเริ่มด้วยอาวุธประจำคลาส สกิล **Attack** แรงตามพลังอาวุธ (ดาเมจ × ความเร็วโจมตี) สกิลธนูต้องถือธนู อาวุธสองมือใช้โล่ไม่ได้ ส่วน Quiver ใช้กับธนูเท่านั้น
  - **ระบบป้องกัน**: Armour (ลดดาเมจกายภาพ ได้ผลดีกับ hit เล็ก) · Evasion (หลบการโจมตีและกระสุน) · Energy Shield (โล่บนชีวิต ฟื้นเองหลังไม่โดนตี 2 วิ — แหวนสีฟ้ารอบลูกแก้วชีวิต) · Block (จากโล่) ฐานไอเทมแบ่งเป็นสาย Armour / Evasion / ES / ผสม
  - **Prefix / Suffix + Tier**: Magic มีได้ 1+1, Rare 3+3 mod แต่ละอันมี Tier T1–T7 ตาม Item Level (ดรอปช้าในรอบ / Tier แผนที่สูง = ได้ Tier ดีขึ้น) ติ๊ก "แสดง Prefix / Suffix และ Tier" หรือกด Alt เพื่อดู
  - **Socket & Link**: อาวุธ/โล่/ชุดเกราะมี Socket สีแดง/เขียว/น้ำเงิน/ขาว พร้อม Link สกิลจะใส่อยู่ในกลุ่ม Link ที่ใหญ่ที่สุดของไอเทม (ย้ายเองได้ในแผง "ลิงก์สกิล") ถ้าไอเทมมี Link มากกว่าลิงก์พื้นฐานของสกิล Support ต้องตรงสี Socket (สีขาว = ใส่ได้ทุกสี) ไม่งั้นจะไม่ทำงาน · ไอเทม 5–6 Link มีลำแสงสีขาว
  - **ฟลาสก์เป็นไอเทม**: Life, Quicksilver, Granite (Armour), Jade (Evasion), Silver (ความเร็ว), Sulphur (ดาเมจ), Diamond (คริ) พร้อม mod เช่น Ample, Chemist's, of Fending, of Adrenaline
  - **กระเป๋าแบบตาราง 12×5**: ไอเทมมีขนาดต่างกัน **ลากวาง**ไปมาระหว่างกระเป๋า ตัวละคร และช่องฟลาสก์ได้ มีปุ่ม "จัดเรียง" อัตโนมัติ
  - **ดูง่ายว่าของไหนดี**: ทุกไอเทมในกระเป๋ามีป้าย **▲ เขียว** (ดีกว่าที่สวมอยู่) / **▼ แดง** (แย่กว่า) / **● เทา** (ใกล้เคียง) คิดจากผลจริงต่อ DPS, ชีวิต, ES, ค่าต้านทาน, Armour/Evasion, Block, ความเร็ว · กด/ชี้ไอเทมเห็นส่วนต่างเป็นตัวเลข (เช่น "DPS +12% · ต้านไฟ -8%") · ช่องที่ว่างแต่มีของใส่ได้จะขึ้นกรอบเขียว
  - **สรุปสเตตัสใต้ตัวละคร**: ชีวิต, ES, ดาเมจ/วิ, Armour, หลบ, Block, ความเร็ว, ค่าต้านทาน 4 ธาตุ (อัปเดตทันทีเมื่อเปลี่ยนของ)
  - **ย่อยของทีละหลายชิ้น**: "♻ ย่อยของที่แย่กว่า" (เฉพาะ ▼ และฟลาสก์ขาว) และ "♻ ย่อยทั้งหมด" (กดยืนยัน 2 ครั้ง) — ไม่ย่อย Unique, Jewel และของที่ **🔒 ล็อก** ไว้
  - เมนูคราฟต์ (Orb / Essence / Bench) และลิงก์สกิลพับเก็บไว้ กดเปิดเมื่อต้องการ
  - **Unique 29 ชิ้น** (ออกแบบเอง) รวมอาวุธ (Stormstring, Pyre of the Ancients, Oathbreaker), โล่ Bastion of Echoes และเข็มขัด Girdle of Plenty
  - **Currency**: Regal, Exalted, Divine, Annulment, Chaos (ปรับ mod) · Jeweller's (จำนวน Socket), Fusing (Link), Chromatic (สี Socket) · Whetstone / Armourer's Scrap (Quality สูงสุด 20%) · **Vaal Orb** (Corrupt: ได้ implicit พิเศษ / ไม่เปลี่ยน / สุ่ม mod ใหม่ / 6 Socket / mod หาย — แล้วแก้ไขไม่ได้อีก)
  - Rare/Unique มีลำแสงบนพื้น ไอเทมเก็บอัตโนมัติเมื่อเดินผ่าน (ถ้าช่องว่างจะสวมให้ทันที) ย่อยไอเทมเป็น Ancient Shards ได้
  - คลัง Unique ที่เคยค้นพบบันทึกถาวรและดูได้ที่ Altar of Legacy
  - **Unique 31 ชิ้น** รวม Ward of the Tempest (โล่ต้านธาตุ) และ Stillwater Vestment (ES / ต้านเคออส — เข้ากับ Chaos Inoculation)
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
| `js/leagues.js` | Strongbox, Essence, Ritual (+หน้าต่างแลกรางวัล), Delirium |
| `js/stash.js` | แผนที่/Jewel ที่ดรอป, Stash, ของที่พกเข้ารอบ, Atlas Tree, Jewel Socket, Daily Challenge |
| `js/settings.js` | ตั้งค่า (บันทึกถาวร), เพลงประกอบแบบสังเคราะห์, ลดคุณภาพอัตโนมัติ, Tips |
| `js/codex.js` | หน้า Codex, คอมโบแนะนำ, หน้าตั้งค่า |
| `js/data/maps.js` | พื้นที่ (Biome), การเพิ่มความยากตาม Tier, Map Mods, จำนวนแต้มจาก Atlas |
| `js/data/items.js` | ฐานไอเทม (อาวุธ/เกราะ/ฟลาสก์), Prefix/Suffix + Tier, Socket, Unique, Currency และการคราฟต์ |
| `js/items.js` | การดรอป, กระเป๋าตาราง, กฎการสวมใส่, สกิลใน Socket ของไอเทม, ฟลาสก์, Armour/Evasion |
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
