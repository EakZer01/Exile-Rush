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

Build 57 — ขยายบิวเพิ่มอีก 6 Skill / 3 Support / 3 Unique และสกิลจากอาวุธ 1 อัน (`js/data/archetypes.js`, `js/archetypes.js`):

- **Exsanguinate**: เส้นโลหิต Chain พร้อม Physical DoT ไม่ใช่ Bleed สูงสุด 3 ชั้นต่อสกิล/เป้า · **Reap**: เคียวและ Blood Charge สูงสุด 5 เพิ่มดาเมจพร้อมต้นทุนชีวิต · **Forbidden Rite**: กระสุนเคออสอิง Life/ES และเสียชีวิตตาม Chaos Resistance ทั้งสามใช้เพดานต้นทุนชีวิตอัตโนมัติไม่ต่ำกว่าครึ่งหลอดตามระบบเดิม
- **Eye of Winter**: ดวงตาเคลื่อนที่ปล่อยสะเก็ด สะเก็ดเพิ่มจำนวนเฉพาะตอนจบ ความเร็วกระสุนเปลี่ยนจุดจบ · **Tempest Bell**: ต้องถือ Staff และมี Attack เพื่อสะสม Combo 4 วางระฆัง ตีเป้าใกล้ระฆังเพื่อกระตุ้นคลื่นสูงสุด 10 ครั้ง · **Herald of Plague**: ต้องมี Poison เพื่อให้สุ่มเสนอ แพร่ Poison แรงที่สุดด้วยพลัง 75% สูงสุด 3 ทอด
- **Coursing Current** เชื่อม Chill กับ Shock (เปิดคอมโบ Frostbolt → Lightning Conduit) · **Crystalfall** เพิ่มผลึกตกจาก Slam ที่ Hit มีคูลดาวน์ · **Communion** เพิ่ม Hit ของ Spell ตามจำนวนมินเนียนที่อายุเหลือเกิน 2 วิ สูงสุด 8 ตัว
- **The Whispering Ice** (บอส Frozen): มอบ Icestorm ทุก 3 วิ โดยไม่ใช้ช่องสกิลหรือ Support รับโบนัส Spell/Cold/AoE อาวุธอยู่จึงทำงาน ดาเมจแสดงในหน้าสถิติและผลรอบ · สกิลอื่นทำดาเมจลด 15%
- **Voltaxic Rift** (Breach): แปลง Lightning เป็น Chaos ทั้งหมดและให้ Chaos Shock ได้ เปิดแท็ก Chaos เพื่อใส่ Support รวมถึงกรณี Added Lightning · ดาเมจรวมลด 15% ไม่ใช้กฎกลับค่าต้านทานต้นฉบับ
- **Doryani's Prototype** (บอส Void): ทำได้เฉพาะ Lightning ศัตรูใกล้ 220 ใช้ Lightning Resistance ของคุณ รับ Lightning แบบประชิด/กระสุนใช้ Armour แทนค่าต้านทาน ส่วนพื้นที่ยังใช้ค่าต้านทานปกติ · Lightning Resistance -30%
- กลไกดัดแปลงสำหรับ survivor: ไม่มีการเพิ่มระบบ Intelligence หรือ Mana ใหม่, Communion ใช้อายุมินเนียนแทน permanent minion, คอมโบระฆังทำงานอัตโนมัติจาก Attack ในระยะ


Build 56 — ชุดปฏิกิริยาสนาม (ข้อมูล `js/data/reactions.js`, ระบบ `js/reactions.js`):

- **Frost Wall** (เวท/อาวุธ caster): สร้างผลึกขวางศัตรูทั่วไป คุณเดินผ่านได้ ใช้ Hit ของสกิลอื่นทำลายให้ระเบิดน้ำแข็ง; บอสบดผลึกได้ ผลึกหมดอายุสลายโดยไม่ระเบิด
- **Gas Grenade** (ธนู/ไม้กายสิทธิ์ ฉบับ survivor): หลังชนวน 0.8 วิสร้างหมอกเคออส 5 วิ ยิงไฟผ่าน, ใช้ RF/พื้นไฟ หรือพาศัตรูติด Ignite เข้าไปเพื่อจุดระเบิดไฟ หมอกถูกใช้หมดทันที หมอกของสกิลเดียวกันไม่บวก DoT เมื่อทับกัน สูงสุด 6 หมอก
- **Magnetic Salvo** (ธนู): ต้องมี Storm Rain ที่ใช้งานได้จึงสุ่มเสนอการ์ด กินลูกธนูค้างใกล้ตัวสูงสุด 4 จุดแล้วระเบิดหลัง 0.35 วิ ตาข่าย Storm Rain จุดที่ถูกกินหายจริง
- **Mjölner** — ฟาร์มบอสสุดท้าย Void Sanctum: เปิดให้ใช้ Spell สายฟ้ากับกระบอง และเชื่อมให้ Attack กระตุ้นเวทสายฟ้า คูลดาวน์ร่วม 0.8 วิ เลือกเวทผ่านปุ่มเชื่อมเวทตามเดิม เวทที่เชื่อมหยุดร่ายเอง ดาเมจ Attack ลด 20% / เวทที่กระตุ้นลด 30%
- **Arakaali's Fang** — ฟาร์ม Bog Leviathan ใน Toxic Marsh: Attack ฆ่าศัตรูแล้วกินศพเรียกแมงมุมพิษ 2 ตัว สูงสุด 8 ตัว อายุ 8 วิ หรือ Hit บอส 6 ครั้งเรียก 1 ตัวโดยไม่ใช้ศพ ร่วมคูลดาวน์ 1 วิ ถอดมีดแล้วแมงมุมหาย ดาเมจ Attack ลด 20%
- **Sire of Shards** — ฟาร์ม Rime Herald ใน Frozen Hollow: เวทกระสุนที่ยิงจากตัวคุณยิงเป็นวงรอบตัวและเพิ่ม 4 ลูก แลกดาเมจ 25% ไม่เปลี่ยนกระสุนของมินเนียน/ป้อม/กับดัก/ทุ่น
- Unique ทั้งสามใช้แหล่งดรอปบอสเดิม ดูแหล่งได้ใน Codex → Unique และเก็บลง Stash/Heirloom ได้ตามระบบเดิม มีไอคอน สูตร Vaal และคอมโบใหม่ใน Codex


Build 48 — เพิ่ม 31 สกิล / 24 Support / Unique เปลี่ยนกลไก 12 ชิ้น รวม 94 Skill, 110 Support และ 52 Unique:

- ข้อมูลใหม่อยู่ที่ `js/data/buildcraft.js` และกลไกสนาม/การเชื่อมเวทอยู่ที่ `js/buildcraft.js`
- **คอมโบ**: Bladefall → Blade Blast, Desecrate → Detonate Dead / Volatile Dead / Cremation, สกิล Shock → Lightning Conduit, สกิล Hex → Hexblast, Attack → Holy Relic, Skeletons → Dark Pact
- **วิธีเดินต่างกัน**: Spectral Throw จัดแนวขากลับ, Spectral Helix/Bladestorm ล่อฝูงเข้าพื้นที่, Blade Flurry หยุดเดินสะสมแล้วเดินปล่อย, Earthshatter วางหนามแล้ว Dash ระเบิด, Storm Rain วางตาข่ายสายฟ้า
- **Trigger**: ใส่ CoC/CwC/CoMK/Spellslinger ในสกิลต้นทาง แล้วเพิ่ม Spell ที่รองรับ ระบบเลือก Spell ถัดไปในแถบให้อัตโนมัติ; กดปุ่ม “เชื่อมเวท” ที่หน้าสถิติหรือ I → ช่อง Support เพื่อเปลี่ยนเป้า Spell ที่เชื่อมจะหยุดร่ายเอง การกระตุ้นมีคูลดาวน์และไม่กระตุ้นต่อเป็นวงจร
- **Unique**: ค้นชื่อ Anchor of the Spiral, Storm Garden, Blade Hourglass, Frost Relay, Grave Furnace, Reaper Covenant, Faultline, Hex Reservoir, Cinder Walker, Shatter Clock, Steel Magnet และ Relic Procession ใน Codex → Unique ทุกชิ้นดรอปทั่วไปและเข้าคลังเดิมได้
- Shield Crush / Spectral Shield Throw ต้องมีโล่มือรอง; สกิลศพต้องมีศพจากศัตรูตายหรือ Desecrate; Holy Relic ต้องมี Attack มาช่วยกระตุ้น
- ตัวเลขและกลไกเป็นฉบับ survivor: ทุ่นระเบิดเอง, มินเนียนใช้ “อายุ” เป็นทรัพยากร, ค่าเสียชีวิตของ Trauma/Dark Pact ไม่ลดชีวิตต่ำกว่า 1 โดยตรง และยังไม่ได้จำลอง Mana ของ PoE


ช่อง Skill Gem เริ่มที่ 4 และ **รวมทุกโบนัสแล้วไม่เกิน 6 ช่อง** (Collector, Wanderlust, Expanded Arsenal ใช้เพดานร่วมกัน) · เมื่อถึง 6 จะไม่มีการ์ดเพิ่มช่องให้เลือกอีก · สกิลฟรีจาก Grave Command ต้องมีช่องว่าง หากเต็มจะได้ +3 เลเวลให้เจมมินเนียนที่ยังไม่เต็มหรือเจมที่ทำดาเมจสูงสุดแทน ไม่เกิน Lv 20


Build 44 เพิ่ม [js/data/specialists.js](js/data/specialists.js) และ [js/specialists.js](js/specialists.js):

- **Attack ไม้กายสิทธิ์**: Power Siphon (คริ+กระโดด+ประหาร), Kinetic Bolt (กายภาพแตกแขนง) · **มีดสั้น**: Cobra Lash (พิษกระโดด), Venom Gyre (คมพิษบินกลับหนึ่งรอบ)
- **Wintertide Brand**: ตราน้ำแข็ง DoT รอบเป้าพร้อมหน่วงการเดิน ไม่ Hit/คริ/สร้าง Ailment · **Lightning Tendrils**: ลำแสงสายฟ้าพัลส์แรงทุกครั้งที่ 4 · **Summon Skeletal Mages**: มินเนียนยิงน้ำแข็งจากตัวเอง เพิ่มกระสุน/Chain/ความเร็วมินเนียนได้
- **Support Brand**: Swiftbrand (ถี่ขึ้นแลกอายุ), Brand Persistence (นานขึ้นแลกความถี่), Brand Relay (ย้ายหาเป้าใหม่ไกลขึ้นเมื่อเจ้าบ้านตาย)
- **Support Herald**: Herald Amplification (แรง/กว้างขึ้น), Herald Echo (ซ้ำครั้งเดียวที่ 45%), Herald Catalyst (Ice/Ash กระตุ้นจากศพใกล้ตัวได้ทุกศพแลกดาเมจ; Thunder เพิ่มเป้าที่ติด Shock)
- **Support Channelling**: Channel Intensity (ยืนนิ่งสะสมดาเมจ), Mobile Channel (หันไว/ยิงถี่ขึ้นขณะเดิน), Channel Fan (กว้างขึ้นแลกระยะ)
- แก้ Support ที่ไม่เข้ากับกลไก: ไม่สุ่ม/ให้ใส่คู่ที่ใช้ผลหลักไม่ได้ เช่น Deadly Ailments / Unbound Ailments / Combustion / Penetration กับ RF; เจมเดิมยังอยู่ในช่องแต่ไม่ให้ผลและมีเหตุผลแสดงในกระเป๋า


Build 43 เพิ่มชุดธนูใน [js/data/bows.js](js/data/bows.js) และ [js/bows.js](js/bows.js):

- **Burning Arrow** ยิงไฟและ Ignite, **Explosive Arrow** ปักชนวนสะสมแล้วระเบิด, **Puncture** ยิงทะลุพร้อม Bleed, **Scourge Arrow** ยิงอัตโนมัติและวางฝักพิษที่แตกยิงหนาม (ไม่ต้องกดชาร์จ)
- **Volley** เพิ่มลูกธนูแนวขนาน, **Arrow Nova** ยิงขึ้นฟ้าแล้วกระจายรอบจุดตก, **Maim** หน่วงความเร็วเดิน, **Deadly Draw** แลกคูลดาวน์กับ Hit/Bleed ที่หนักขึ้น
- **Heavy Draw, King of the Hill, Ballistic Mastery, Watchtowers** อยู่ในสาย Mastery เดิม · **Lone Archer** เสริมการยิงเองและปิดสกิลธนูที่ใช้ Ballista/Mirage · **Siege Doctrine** เสริมป้อมธนูแลกดาเมจธนูที่ยิงเอง สอง Keystone นี้ใช้ร่วมกันไม่ได้
- ระเบิด Explosive Arrow จับเวลาจากดอกแรก (พื้นฐาน 1.2 วิ) หรือทันทีเมื่อครบ 12 ดอก · Arrow Nova ทำงานหลัง 0.4 วิ · Scourge สร้างฝักชุดเดียวต่อการร่าย ไม่คูณตาม GMP/Fork/Returning และหนามไม่สร้างฝักต่อ
- จำกัดชนวนค้าง 64 จุด และฝัก/จุดยิง Nova รวม 64 จุดต่อรอบ (ชนวนเก่าสุดระเบิดเมื่อเต็ม; จุดฝักเก่าสุดถูกแทนที่) เพื่อควบคุมภาระในบิวความเร็วสูง · ป้อมมีชีวิตการใช้งานตามเวลาและไม่มีระบบเลือดตามเดิม


Build 42 เพิ่มเนื้อหาที่ [js/data/expansion.js](js/data/expansion.js) และไอคอน/การแนะนำบิวที่ [js/expansion-ui.js](js/expansion-ui.js):

- **ประชิด**: Cleave (กรวยกวาด), Heavy Strike (ฟาดหนัก), Glacial Hammer (Chill), Infernal Blow (ประทับตราแล้วระเบิดเมื่อเป้าตาย), Sweep (กวาดรอบตัว), Sunder (คลื่นพื้นเรียงแนว)
- **เวท/มินเนียน**: Rolling Magma (ระเบิดแล้วกระเด้ง), Blazing Salvo (พัดกระสุนระเบิด), Ice Spear (ทะลุ+คริ), Soulrend (ไล่เป้า+หมอกเคออส), Incinerate (ลำเพลิงกว้างขึ้นเมื่อยืนนิ่ง), Raise Zombie (มินเนียนช้าแต่ตีแรง)
- **Support**: Slower Projectiles, Less Duration, Chance to Poison, Cold to Fire, Physical to Lightning, Elemental Damage with Attacks, Spell Totem, Multiple Totems, Life Gain on Hit, Ancestral Call, Unbound Ailments, Combustion
- **Passive**: Heart of Flame / Ice / Thunder, Fatal Toxins, Blood Siphon, Written in Blood, Arcane Focus, Sanctuary, Harrier, Lethal Assault, Master Fletcher, Longshot, Spiritual Command, Enduring Bond, Shamanistic Fury, Runesmith — ทุกอันมีสาย Mastery และสูงสุด 3 ระดับ
- **Keystone**: Precise Technique (Attack แรงขึ้นแต่คริไม่ได้), Ancestral Bond (ป้อม +1 แลกดาเมจสกิลอื่น), Iron Grip (กระสุน Attack กายภาพแรงขึ้นแลกความเร็วเดิน)
- Spell Totem ใช้กับเวทที่ยิงกระสุนเท่านั้น ป้อมไม่มีเลือดตามระบบเดิม; Raise Zombie ไม่ต้องใช้ศพและไม่มีเลือดมินเนียน; Life Gain on Hit สูงสุด 5% ชีวิต/วินาที/สกิล; ร่าง Vaal ใหม่เป็นรูปแบบดัดแปลงของเกมนี้
- อ้างอิง: [PoEDB Skill Gems](https://poedb.tw/us/Skill_Gems), [PoEDB Support Gems](https://poedb.tw/us/Support_Gems), [Passive Tree ทางการ](https://www.pathofexile.com/passive-skill-tree) (ลิงก์ PoEDB Passive API ตอบ 404 ตอนตรวจ)

- **Skill Gem 63 อัน** ร่ายอัตโนมัติ (เริ่ม 4 ช่องสกิล — Milestone เลเวล 30 ขึ้นไปมีการ์ดช่องสกิล +1 ได้สูงสุด 2 ครั้ง · Ascendancy Wanderlust +1 · Keystone Specialist -1 / Collector +2 · เลเวลเจม 1–20) มีรูปแบบ Projectile, Nova, Chain, Orbit, Ground, Aura, Minion, Spin, **Brand** (ประทับตราบนศัตรู), **Strike**, **Slam + Aftershock**, **Beam** (Channelling), **Herald** (ทำงานตอนศัตรูตาย) และ **Flicker Strike** (วาร์ปตัวจริงเป็นชุดสั้น ๆ กดเดินเพื่อหยุด หรือ T เพื่อเปิด/พัก) · สกิลใหม่: Lacerate (ดาบ/ขวาน, Bleed), Viper Strike (มีดสั้น/ดาบ, Poison), Ground Slam (กระบอง/คทา/ขวาน/คทายาว, คลื่นกรวย), Ice Shot (ธนู, กรวยน้ำแข็ง), Rain of Arrows (ธนู, ห่าฝน), **Herald of Ash** (ศัตรูที่ติด Ignite ตายแล้วไฟลุกลามต่อ), **Herald of Thunder** (ฟ้าผ่าศัตรูที่ติด Shock รอบตัวเป็นระยะ)
- **Support Gem 86 อัน** (ใหม่: **Ballista Totem** วางป้อมยิงอัตโนมัติแทนการยิงเอง, **Mirage Archer** ร่างเงายิงตาม, **Melee Splash** สำหรับสกิล Strike, **Onslaught** ฆ่าแล้วเร็วขึ้น) ทุกสกิลเริ่มด้วย **2 ช่อง Support ของตัวเอง** เพิ่มได้ถึง **6 ช่อง Support** ด้วย Jeweller's Orb · ไม่จำกัดสี ไม่มี Socket/Link บนอุปกรณ์ · Support ยังต้องมีแท็กที่เข้ากับสกิลและไม่ขัดกัน รวมถึงคำสาป (Hextouch), Penetration, Elemental Proliferation, Spell Cascade, Multistrike, Ruthless, Brutality, Deadly Ailments, Returning Projectiles, Fortify, Close Combat, Impale, Trinity, Arcane Surge, Unleash, Barrage, Pulverise
- **Passive 55 อัน + Keystone 21 อัน** (เช่น Crimson Dance, Elemental Overload, Avatar of Fire, Elemental Equilibrium, Runebinder, Hex Master, **Chaos Inoculation**, Perfect Agony, Arrow Dancing)
- **คอมโบตัวอย่าง**: Herald of Ice + Ice Nova/Freezing Pulse (ศัตรูแช่แข็งแตกระเบิดต่อเนื่อง) · Contagion + Essence Drain (พิษแพร่ทั้งฝูง) · Storm/Armageddon Brand + Runebinder · คำสาป + Penetration ทะลุ map mod Warded · Elemental Equilibrium + สกิลหลายธาตุ
- **เลเวลอัป**: เลือกการ์ด 3 ใบ (สกิลใหม่ / เลเวลเจม +2 / Support / Passive +2 ระดับ) ประมาณ 50–60 ครั้งต่อรอบ การ์ดที่เข้ากับบิลด์มีป้าย **★** · ทุก 10 เลเวลเป็น **MILESTONE** (Keystone ที่เข้ากับสกิลของคุณ, Awaken, Empower +3 เลเวลเจมหลัก, ช่องสกิล +1 ตั้งแต่เลเวล 30)
  - หีบจากมอนสเตอร์ Rare ให้ของทันทีไม่ต้องหยุดเกม (เลเวลเจม, Orb) — หีบจากบอสยังให้เลือกการ์ด
  - ตั้งค่า "เลเวลอัป": เปิดการ์ดทันที / **เปิดทันทียกเว้นตอนสู้บอส** (ค่าเริ่มต้น) / เก็บไว้กด **U** เมื่อพร้อม — การ์ดที่รออยู่แสดงเป็นป้าย "⬆ เลือกการ์ด ×N" มุมซ้ายบน
- **แผนที่มีขอบเขต**: ลานสี่เหลี่ยมขนาด 4,400 × 4,400 มีกำแพงล้อมรอบ (มอนสเตอร์ ศาลเจ้า และ league content เกิดในขอบเขตเสมอ) · **มินิแมพ**มุมขวาล่างแสดงทั้งแผนที่: มอนสเตอร์ (แดง / Magic น้ำเงิน / Rare เหลือง), บอส, ไอเทม Rare/Unique, ศาลเจ้า และวงสีของ Breach / Strongbox / Essence / Ritual / Delirium · กด **Z** หรือปิดในหน้าตั้งค่า
- **Ailment**: Ignite, Chill, Freeze, Shock, Poison, **Bleed** (ดาเมจกายภาพต่อเนื่อง 70% ของ Hit ต่อวินาที นาน 4 วิ · เก็บได้ 8 ชั้นแต่ทำงานเฉพาะชั้นที่แรงสุด · Keystone Crimson Dance ให้ทุกชั้นทำงานที่ 50% · Support Chance to Bleed / Crimson Bleed · Passive Bloodletting ในสาย Ailment)
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
- **อาวุธกำหนดสกิล**: เจมธนู (Split/Caustic/Lightning Arrow, Tornado Shot, Toxic Rain) ต้องถือธนู · เจม Melee ต้องถืออาวุธประชิดตามชนิด (เช่น Earthquake ใช้กระบอง/คทา/ขวาน/คทายาว) · Kinetic Blast ใช้ไม้กายสิทธิ์ · เจมเวทยิงกระสุน (Fireball, Arc, Spark ฯลฯ) ใช้กับไม้กายสิทธิ์/คทายาว/คทา/มีดสั้น · **ใช้ได้ทุกอาวุธ**: Ice Nova, Shock Nova, Contagion, Righteous Fire, Herald of Ice / Ash / Thunder, Brand, Minion, Firestorm · ถืออาวุธไม่ตรง สกิลจะหยุดทำงาน (กากบาทแดงบนแถบสกิล) · ดูได้ในการ์ด, Codex และ tooltip อาวุธ
- **Passive Tree ระหว่างรอบ + Mastery**: Passive แบ่งเป็น 7 สาย — Projectile, Critical, Ailment, Defence, Caster, Warfare, Minion · ลงครบ 6 ระดับ (Defence 8) แล้ว **Milestone** ถัดไปจะให้เลือก Mastery 1 ใน 2 เช่น Projectile: Boomerang (กระสุนย้อนกลับ) หรือ Close Quarters (ใกล้แรง ไกลอ่อน) · Critical: Assassin's Edge หรือ Lucky Strikes · ดูความคืบหน้าในหน้าบิว (C) และ Codex
- **Unique เฉพาะแหล่ง**: Unique บางชิ้นดรอปเฉพาะบอสประจำพื้นที่, Pinnacle, Echo, Breach, Ritual, Delirium หรือ Strongbox (ดูใน Codex → Unique ตัวกรองตามแหล่ง) · Unique ที่เปลี่ยนสกิล เช่น Stormheart Fang (Flicker → สายฟ้า), Eye of the Gale (Tornado Shot แนวแคบ), The Pale Engine (Fireball → น้ำแข็ง), Earthbreaker Maul, Voidweave Coil (Arc → เคออส), Crown of the Hollow King (Keystone +1)
- **Scarab**: ใส่ที่ Map Device ก่อนเปิดแผนที่ (เริ่ม 2 ช่อง) ใช้แล้วหมด — Breach / Strongbox / Essence / Ritual / Delirium / Cartography / Gilded / Elites / Reliquary / Hunted / Vault · ดรอปจากบอส, Rare, league content, ห้องรางวัล หรือซื้อสุ่ม 100 ✦
- **ห้องรางวัล (Vault)**: โค่นบอสสุดท้ายแล้วเลือกรางวัลถาวร 1 จาก 3 การ์ด (ธรรมดา / หายาก / ตำนาน — Tier และ mod สูงยิ่งได้ตำนานบ่อย)
- **Gem Mastery** (Altar → Gem Mastery): เจมที่ใช้ได้ XP ข้ามรอบ · +2% ดาเมจต่อเลเวล (หลัง Lv 20 +0.5% ไม่จำกัด) · Lv 3/6/10 ปลด Alternate Quality Anomalous / Divergent / Phantasmal · Lv 15 ได้เจมนี้เริ่ม +2 เลเวล · เติม XP ด้วย Shards ได้ไม่จำกัด
- **Heirloom**: ใน Stash กด "ผูกเป็น Heirloom" (250 ✦, สูงสุด 4 ชิ้น) · พกเข้ารอบแล้วกลับเข้า Stash เอง · ได้ XP ทุกรอบ (ชนะได้มากกว่า) · Lv 1–5: +3% ดาเมจและชีวิตต่อเลเวล, Lv 5 +1 เลเวลเจม · ตายใน Hardcore = หาย
- **Challenges 24 ข้อ** (Altar → Challenges): ทำสำเร็จได้ Shards · ทุก 4 ข้อได้โบนัสถาวร (ช่อง Scarab, Stash +1, Shards +10%, การ์ดห้องรางวัล +1, ดาเมจ/ชีวิต, Unique บ่อยขึ้น)
- **Unique Collection**: ค้นพบครบ 5/10/15/20/25/30/40 ชิ้นได้โบนัสถาวร
- **Voidstone 4 อัน**: โค่น The Hollow Crown, ผ่านครบทุกพื้นที่ใน Tier 6+, โค่น Echo รวม 10 ตัว, ชนะ Tier 8+ ใน Hardcore · แต่ละอันทำให้แผนที่ Tier 6 ขึ้นไปมอนสเตอร์แข็งขึ้นแต่ไอเทม/Unique/Shards/Scarab เพิ่มขึ้น · **Atlas Completion**: ผ่านครบทุกพื้นที่ใน Tier เดียวกัน = +1 แต้ม Atlas Tree + 2 Scarab
- **🎯 เป้าหมายถัดไป** (เมนูหลัก): แสดง 4 อย่างที่ใกล้สำเร็จที่สุด — ภารกิจปัจจุบัน, เจมที่ใกล้ปลด Alternate Quality, Challenge, Unique Collection, Corruption, Legacy Tree, ของที่ปลดล็อกได้ · กดเพื่อไปหน้าที่เกี่ยวข้อง
- **📜 ภารกิจผู้เริ่มต้น 10 ข้อ** (ทำทีละข้อ): โค่นบอสแรก → เลือก Ascendancy → จัดสรร Legacy Tree → ใช้ Jeweller → ปลด Mastery → ชนะแผนที่ → ใช้ Scarab → ชนะ T3 → เลือก Alternate Quality → ชนะด้วย Corruption 3 · ให้ Shards, Scarab และฉายา
- **☠ Corruption** (ปลดหลังชนะครั้งแรก, ที่ Map Device): เลือกความโหดเอง 10 แบบ (มอนสเตอร์ชีวิต/ดาเมจ/ความเร็ว/จำนวน, Rare บ่อยขึ้น, ฟลาสก์น้อยลง, ฟื้นฟูน้อยลง, บอสแข็งขึ้น, ค่าต้านทานสูงสุดลดลง, การ์ดให้เลือกน้อยลง) · แต่ละแต้ม: Shards +6%, Unique +4%, ไอเทม +3%, ห้องรางวัลระดับตำนานบ่อยขึ้น · 10 / 20 แต้มได้การ์ดห้องรางวัลเพิ่ม · บันทึกสถิติชนะสูงสุดของแต่ละคลาส
- **✨ Cosmetic** (Altar → Cosmetic): ออร่า 5 แบบ, รอยเท้า 5 แบบ, ฉายา 7 แบบ ปลดจาก Corruption, Challenge, Voidstone, Hardcore, Unique Collection และภารกิจ · ไม่เพิ่มพลัง · ฉายาและ Corruption แสดงมุมซ้ายบนระหว่างเล่น
- **Stash (เก็บของข้ามรอบ)**: จบรอบเลือกไอเทมเก็บได้ (ตาย 2 ชิ้น, ชนะ 4 ชิ้น) Jewel เก็บอัตโนมัติ · ที่ Map Device เลือกพกของจาก Stash เข้ารอบได้ 2 ชิ้น (จ่าย Shards ตามความหายาก) · ดู/ย่อยของได้ที่ปุ่ม 📦 Stash ในเมนูหลัก
- **Jewel**: Crimson / Viridian / Cobalt ดรอปจากบอส, Rare, Strongbox, Ritual, Delirium ใส่ใน **Jewel Socket 6 ช่องบน Legacy Tree** (ช่องละสาย) เพื่อรับ mod ทุกรอบ
- **Atlas / Map Device**: หลังเลือกคลาสจะเข้าหน้า Map Device เพื่อเลือกแผนที่
  - **5 พื้นที่**: Cursed Graveyard, Ashen Wastes (Volatile/Brute), Frozen Hollow (Frost Wraith, ปลดล็อกที่ Tier 2), Toxic Marsh (ซากศพ/Cultist, Tier 3), Void Sanctum (มอนสเตอร์แข็งขึ้น 15%, Tier 5) แต่ละพื้นที่มีสีพื้น แสง และชนิดมอนสเตอร์ต่างกัน
  - **Tier 1–10**: Tier 1 คือเกมปกติ ทุก Tier เพิ่มชีวิตมอนสเตอร์ +25% ดาเมจ +8% และรางวัล Shards +15% ชนะแผนที่เพื่อปลดล็อก Tier ถัดไป
  - **Map Mods 16 แบบ** เช่น Hardened, Elite, Burning Ground, Withering Air, Lightless กด Alchemy เพื่อสุ่ม mod ฟรี (3–5 อันตาม Tier) หรือสุ่มใหม่ด้วย 15 ✦ ทุก mod เพิ่ม Item Quantity และโบนัส Shards
  - ผ่านแผนที่ใหม่แต่ละอัน (พื้นที่+Tier) ได้ **+1 แต้ม Legacy Tree** ถาวร (สูงสุด +15)
  - **แผนที่เป็นไอเทม**: ดรอปจากบอส (บอสสุดท้ายให้แผนที่ Tier ถัดไปแน่นอน), Rare, Strongbox, Ritual, Delirium เก็บไว้ในคลังแผนที่ (40 ใบ) · Tier 1 เล่นฟรี · Tier สูงกว่าต้องใช้แผนที่ หรือซื้อด้วย Shards (20 ✦ × Tier)
  - **Atlas Passive Tree**: 6 สาย (Strongbox, Essence, Ritual, Delirium, Breach, Cartography) ปรับว่า league content ไหนเกิดบ่อย/ให้ของมาก แต้ม = แผนที่ที่ผ่าน + บอสสะสมทุก 8 ตัว คืนแต้มฟรี
  - **☠ Hardcore**: ตาย = เสีย Shard แผนที่ Jewel ของรอบนั้น และเก็บของเข้า Stash ไม่ได้ · ชนะ = Shard ×1.5 และเก็บของได้ +2 ชิ้น
- **📅 Daily Challenge**: ทุกวันได้คลาส แผนที่ Tier และ mod ชุดเดียวกัน (สุ่มแบบ seed ตามวันที่) บันทึกสถิติดีที่สุดของวัน
- **🗓 Weekly Challenge**: เหมือน Daily แต่เป็นรายสัปดาห์ Tier 3–5 + mod แน่นกว่า ชนะครั้งแรกของสัปดาห์ได้ ✦150 · เทียบอันดับกับทุกคนได้ที่ Leaderboard
- **🏆 Leaderboard**: แท็บใหม่ในหน้าสถิติ (ปุ่ม 🏆 บนเมนู) ดูอันดับ Daily วันนี้ / Weekly สัปดาห์นี้ / Endgame ที่ลึกที่สุด ตั้งชื่อบนกระดานได้ที่ ⚙ ตั้งค่า (ไม่ตั้ง = ไม่ระบุตัวตน)
- **∞ Endgame Echo milestone**: โค่น Echo บอสใน Endgame ให้ครบ 5 / 10 / 15 / 20 ตัวในรอบเดียว เพื่อออร่า "เสียงก้อง", ฉายา "ผู้ข้ามห้วง", Unique เสียงก้องแห่งจักรพรรดิ (การันตีดรอป) และฉายา "ราชาห้วงว่าง" + Shards ถาวร +10%
- **Meta-progression**: จบทุกรอบจะได้ **Ancient Shards ✦** (ตามเวลารอด, จำนวนฆ่า, บอส, เลเวล, ชนะ +100) เอาไปใช้ที่ **Altar of Legacy** ในเมนูหลัก
  - **Legacy Tree** แบบ passive tree ของ PoE มี 103 โหนด แบ่งเป็น 6 สาย: Arcane (เวท/ธาตุ), Shadow (คริ/เคออส), Hunt (Projectile/ความเร็ว), Bastion (ชีวิต/ป้องกัน/ฟลาสก์), Warfare (Attack/กายภาพ/AoE), Occult (มินเนียน/เผาไหม้/XP)
  - แต่ละสายมีโหนดเล็ก, Notable 3 อัน และ **Keystone** ที่เปลี่ยนแนวบิวที่ปลายสาย ได้แก่ Specialist, Glass Cannon, Collector, Born Ascendant, Gem Savant, Minion Lord มีโหนดเชื่อมระหว่างสายเป็นวงใน ทำให้เดินได้หลายเส้นทาง
  - **6 ภูมิภาคขอบนอก** เชื่อมสองสายข้างเคียง (เข้าได้จาก Notable ปลายแขนของทั้งสองสาย) แต่ละภูมิภาคมี Notable ผสมและ Keystone ของตัวเอง: Spellblade → Spellweaver, Venom Archer → Wind Dancer, Trailblazer → Unbreakable, Juggernaut → Heavy Hitter, Bonecrusher → Vampiric Pact, Sage → Scholar
  - จัดสรรได้เฉพาะโหนดที่ติดกับโหนดที่มีอยู่แล้ว สูงสุด **40 แต้ม** จึงต้องเลือกทิศทาง ราคาโหนดเพิ่มขึ้นตามจำนวนที่จัดสรรแล้ว
  - คืนแต้มฟรี: คลิกโหนดปลายทางเพื่อคืนทีละโหนด หรือกด "คืนแต้มทั้งหมด"
  - คลาส Templar / Shadow / Duelist / Scion และเจม Caustic Arrow / Raging Spirit / Firestorm / Righteous Fire เริ่มแบบล็อก ปลดล็อกได้ด้วยการทำเงื่อนไขในเกม หรือซื้อด้วย Shards
  - ข้อมูลถาวรเก็บใน localStorage ของเบราว์เซอร์ (`exile_meta`) ถ้าเคยเล่นมาก่อน สถิติดีที่สุดเดิมจะปลดล็อกของที่เข้าเงื่อนไขให้อัตโนมัติ
- มอนสเตอร์ 28 ชนิด Normal / Magic / Rare (มี mod สุ่ม) แต่ละแบบต้องรับมือต่างกัน (ดูได้ใน Codex แท็บ "มอนสเตอร์"):
  - **Ash Ghoul** กระโจนใส่ · **Bile Spitter** พ่นแอ่งพิษ · **Bone Shaman** บัฟพวกเดียวกัน
  - **Grave Caller** อัญเชิญโครงกระดูกแล้วหนี · **Bristleback Charger** พุ่งชาร์จเป็นเส้นตรง (มีเส้นเตือน) · **Plague Bloater** ตายแล้วแตกเป็นแอ่งพิษใหญ่
  - **Ember Mortar** ยิงกระสุนครกลงตรงที่คุณกำลังจะเดินไป · **Aegis Sentinel** สร้างเกราะให้มอนสเตอร์รอบตัว (รับดาเมจครึ่งเดียว) · **Void Stalker** วาร์ปมาโผล่ข้างหลัง · **Carrion Broodmother** ตายแล้วแตกเป็นฝูง Scuttler
  - **มอนสเตอร์ลึก (Tier 11+)**: **Carapace Creeper** เกราะกัน 3 ฮิต · **Ashen Ravager** ยิ่งโดนตียิ่งเร็ว/แรง · **Void Maw** ดูดคุณเข้าหา · **Storm Bearer** เล็งเส้นสายฟ้าแล้วยิงบีม · **Flesh Nest** รังฝังพื้นปล่อยฝูงเรื่อยๆ · **Soul Leech** ระบายชีวิตเป็น %/วิ · **Iron Juggernaut** ต้านสถานะ-ดันไม่ได้ · **Doom Sapper** วางกับดักระเบิด
  - แต่ละพื้นที่มีมอนสเตอร์เด่นต่างกัน (Ashen: Mortar/Charger/Ravager · Frozen: Stalker/Sentinel/Creeper · Marsh: Bloater/Broodmother/Nest · Void: Stalker/Sentinel/Maw/Bearer/Juggernaut)
- **หนึ่งรอบยาว 15 นาที**: บอส 4 ตัว (3:45, 7:30, 11:15, 15:00) โค่นบอสสุดท้ายเพื่อชนะ · บอสมี **Phase**: ที่ 66% และ 33% จะอมตะชั่วครู่และเรียกลูกน้อง
  - บอสประจำพื้นที่: Cinder Colossus (Ashen), Rime Herald (Frozen), Bog Leviathan (Marsh), Herald of the Void (Void)
  - **Pinnacle Boss** — The Hollow Crown แทนบอสสุดท้ายใน Tier 8 ขึ้นไป (โบนัส +250 ✦)
  - **Uber Pinnacle** — The Hollow King, Awakened แทนที่ใน Tier 13 ขึ้นไป: 4 ฟาเซส ลายท่าครบ และการันตีดรอป Unique ประจำ Pinnacle
- **แผนที่ Tier 1–15** (เดิม 10): Tier 11+ คือเนื้อหาลึก — **บังคับ mod ลึก 1–2 อัน** (ขอบแดงบน Map Device: Chitin, Furious, Gravity Well, Unstoppable, Overcharged, Warband, Minefield, Chill Wind), ค่าต้านทานถูกกดถึง -75% ที่ T13+ · Tier 12+ ได้ 6 mods อัตโนมัติ · ราคา/รางวัลสูงขึ้นตามเส้นโค้งใหม่
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
| `js/data/goals.js` · `js/goals.js` | ภารกิจผู้เริ่มต้น, Corruption, Cosmetic (ข้อมูล · ระบบ) และ "เป้าหมายถัดไป" ที่เมนูหลัก |
| `js/stash.js` | แผนที่/Jewel ที่ดรอป, Stash, ของที่พกเข้ารอบ, Atlas Tree, Jewel Socket, Daily Challenge |
| `js/leaderboard.js` | กระดานผู้นำ (อ่านอย่างเดียวจากตาราง Supabase): Daily/Weekly/Endgame |
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
| `js/stats-config.js` · `js/telemetry.js` | ที่อยู่ฐานข้อมูลสถิติและเลข Build · ส่งผลของแต่ละรอบแบบไม่ระบุตัวตน (ปิดได้ในตั้งค่า) |
| `stats.html` | หน้าสถิติรวม: อัตราชนะและความคืบหน้าตามคลาส, Ascendancy, สกิลหลัก, Support, Keystone, อาวุธ, สาเหตุการตาย |
| `supabase/schema.sql` | ตารางเก็บผลแต่ละรอบใน Supabase (เพิ่มและอ่านได้อย่างเดียว) |
| `tools/sim/` | ตัวจำลองสมดุล: รันโค้ดเกมจริงแบบไม่มีหน้าจอ ทดสอบทุกสกิล × อาวุธ และให้บอทเล่นเต็มรอบ |

> หลังแก้ไฟล์ JS/CSS ให้เปลี่ยนเลข `?v=` ใน `index.html` เพื่อให้เบราว์เซอร์โหลดไฟล์ใหม่แทนไฟล์ที่ cache ไว้

## ความเร็วเกม

เลือก ×1 / ×1.5 / ×2 ที่ Map Device หรือกด **G** ระหว่างเล่น ใช้ได้เฉพาะ Tier ที่เคยผ่านมาแล้ว และไม่มีผลใน Daily / Weekly · เร่งทั้งเกมเท่ากัน (`GAME_SPEEDS` ใน `js/data/maps.js`, เงื่อนไขใน `speedAllowed` ที่ `js/meta.js`)

## สถิติผู้เล่น (Supabase)

ทุกรอบที่จบ (ยกเว้นตายใน 30 วินาทีแรก) จะส่งคลาส, Ascendancy, สกิลพร้อมเลเวลและ Support, Keystone, Tier, Corruption, ผลแพ้/ชนะ, เวลาที่รอด, จำนวน Echo และสาเหตุการตาย ไปที่ตาราง `runs` ใช้รหัสสุ่มประจำเบราว์เซอร์แทนชื่อ (ตั้งชื่อบน Leaderboard ได้ที่ ⚙ ตั้งค่า — ไม่ตั้ง = ไม่ระบุตัวตน) ผู้เล่นปิดได้ที่ ⚙ ตั้งค่า ถ้าส่งไม่สำเร็จ (ออฟไลน์) จะเก็บไว้ส่งรอบถัดไป ดูผลรวมได้ที่ `stats.html` และอันดับในเกมได้ที่ 🏆 Leaderboard

ตั้งค่าครั้งแรก:
1. สร้าง project ฟรีที่ supabase.com
2. เปิด **SQL Editor** วางเนื้อหา `supabase/schema.sql` ทั้งไฟล์แล้วกด Run
3. ไปที่ **Project Settings → API** คัดลอก Project URL และ anon public key ใส่ใน `js/stats-config.js`
4. **อัปเดตจากเวอร์ชันเก่า (build 53 ลงมา)**: เปิด **SQL Editor** วางเนื้อหา `supabase/migrate_leaderboard.sql` แล้วกด Run (เพิ่มคอลัมน์ weekly / name / echoes ให้ Leaderboard) — ทำครั้งเดียว
5. ถ้าเปลี่ยนตัวเลขสมดุล ให้เพิ่ม `GAME_BUILD` ใน `js/stats-config.js` เพื่อให้หน้าสถิติแยกข้อมูลก่อนและหลังได้

anon key ออกแบบมาให้อยู่ในหน้าเว็บได้ ตารางยอมให้เพิ่มและอ่านเท่านั้น แก้หรือลบผ่าน key นี้ไม่ได้

## ตัวจำลองสมดุล

```sh
node tools/sim/run.cjs bench
node tools/sim/run.cjs bots
```

`bench` ทดสอบทุกสกิล × อาวุธที่ใช้ได้ (เป้าเดียว, กลุ่ม 15 ตัว, ฆ่าฝูงจริง 60 วินาที ที่เจมเลเวล 3/10/20) ใช้เวลาประมาณ 2 นาที · `bots` ให้บอทเล่นเต็มรอบทุกคลาสและทุกสกิลแบบใช้สกิลเดียว ใช้เวลาหลายนาที · ผลอยู่ใน `tools/sim/out/` และพิมพ์ซ้ำได้ด้วย `node tools/sim/run.cjs report` · บอทหลบไม่เก่งเท่าคน ใช้ดูความต่างระหว่างสกิลมากกว่าค่าจริง

## ตรวจสอบก่อนปล่อยเวอร์ชัน

รันชุดทดสอบด้วย Node.js จากโฟลเดอร์โปรเจกต์:

```sh
node --test tests/*.test.cjs
```

ครอบคลุม Flicker และการยกเลิกด้วยปุ่มเดิน, ลูปเบื้องหลัง, Tornado Shot/Fork และ Jeweller เพิ่มช่อง Support รวมถึงการย้ายข้อมูล Stash รุ่นเก่า · อาวุธกำหนดสกิล, Mastery, Unique ตามแหล่ง, Scarab, ห้องรางวัล, Heirloom และ Gem Mastery, Weekly Challenge และรางวัล Echo milestone ของ Leaderboard
