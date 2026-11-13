# VieAni – illustration prompt pack (batch 2: V006–V087, 82 VieAni)

Same method and style as batch 1 (`docs/SPRITE_PROMPTS.md`, V001–V005; V005 Cá Ông is still to be generated from there). The art direction is clean 2D creature illustration:
smooth line art, soft cel shading, NOT pixel art. Designs are our own; use style references only, never copy an existing
Pokémon or character.

## How to use
1. One prompt = **STYLE** + one **SUBJECT** line + one **VIEW**.
2. Generate **FRONT** first, then **BACK** with the front image attached: *"Same character as the attached image, same colours and markings."*
3. **Keep the look consistent:** attach `assets/illustrations/raw/V001_front.png` (Báo Gấm) as a style reference and add
   *"Match the art style, line weight and colouring of the attached reference image."*
4. Save as `V006_front.png`, `V006_back.png`, … (square, ≥ 1024 px, plain white background) and upload to
   `assets/illustrations/raw/`. Claude then runs the cut-out and the game picks them up automatically.
5. Work in batches (A–H below), in one chat per batch.

## STYLE (same for every VieAni)
> Original creature character design for a 2D monster-collecting strategy game, official character art style:
> clean smooth dark-brown line art with varying line weight, flat colours with soft cel shading (2–3 tones per
> colour), light coming from the top-left, a little soft watercolor texture, friendly but strong expressive eyes,
> slightly stylised and chunky proportions, readable silhouette. Full body, whole creature visible, centered, about
> 10% empty margin around it, plain pure white background, no ground shadow, no text, no logo, no frame, no humans,
> no other characters.

## VIEW
- **FRONT:** *Three-quarter front view: the creature faces the viewer and turns slightly to the left, standing in a confident ready-to-fight pose.*
- **BACK:** *Three-quarter back view: we see the creature from behind and slightly to the left, its back and the back of its head, facing up and to the right as if looking at an opponent in the distance; same ready-to-fight pose.*
- Flying VieAni (birds, insects with wings): add *"hovering / wings half open"*.
- Swimming VieAni (fish, ray, cuttlefish, jellyfish, dolphin-like): add *"floating upright as if swimming in the air, a few water droplets around it"*.

## Extra lines by group (add after the SUBJECT)
- **Legendary (Linh vật, T5):** *"Inspired by traditional Vietnamese art (Đông Sơn bronze drums, Lý–Trần dynasty carvings, communal-house (đình) wood carving) – NOT a Chinese or Japanese design; majestic, glowing, slightly larger and more ornate than normal creatures."*
- **Insects and tiny animals:** *"Creature-sized hero version, bold and cute-but-cool, but keep the real body plan (correct number of legs, wings and antennae)."*
- **Domestic breeds (dogs, cats, pigs, chickens…):** *"Keep the real breed's coat colours and markings exactly; village/countryside character."*
- **Lost / possibly extinct species (T4):** *"a faint ghostly mist at its feet (a lost species)"* (same as Bò Xám V003).

## SUBJECTS
The features are the real animal's, taken from the species' Wikipedia and IUCN pages and from the sourced notes in VieIndex
(`data/vn_info.json`). ⚠ marks a line where the sources are thin or disagree; the PO should check the result.

### Batch A – V006–V015
| ID | Name | SUBJECT line |
|---|---|---|
| V006 | Cá Sấu Nước Ngọt (Siamese Crocodile) | *A Siamese crocodile creature: medium-sized freshwater crocodile, olive-green to dark green scaly armour, broad smooth snout, a raised bony crest behind the eyes, golden reptile eyes, armoured ridges along the back and thick powerful tail; patient river ambusher.* |
| V007 | Cá Tra Dầu (Mekong Giant Catfish) | *A Mekong giant catfish creature: huge heavy catfish, smooth scaleless grey skin with a paler whitish belly, very broad flat head with small eyes set low, NO whiskers (the adults have no barbels), small fins and a forked tail; gentle giant of the Mekong river, calm and immovable.* |
| V008 | Cầy vằn bắc (Owston's Civet) | *An Owston's civet creature: slender long-bodied civet with a pointed snout, pale grey-buff fur crossed by 4–5 broad dark bands over the back, dark stripes along the neck, dark spots on the legs and flanks, long dark tail; agile night forager of the northern Vietnamese forests.* ⚠ the tail pattern is not described in the sources found; check it against a reference photo. |
| V009 | Chà vá chân xám (Grey-shanked Douc) | *A grey-shanked douc langur creature: slim long-limbed leaf monkey, speckled grey body and arms, dark grey lower legs, black hands and feet, bright orange-brown face with a white chin and white cheek whiskers, long pale tail; elegant and acrobatic, carries the Thân (Monkey) zodiac sign – a small golden zodiac medallion on its chest.* |
| V010 | Cheo cheo lưng bạc (Silver-backed Chevrotain) | *A silver-backed chevrotain creature: tiny deer-like mouse-deer on thin delicate legs, NO antlers, two small tusk-like upper fangs, front half rusty reddish-brown and the rear half silver-grey, white markings on the throat, big shy dark eyes; rediscovered secret of the forest floor.* |
| V011 | Chim Lạc (Lạc Bird, legendary) | *The legendary Lạc bird: a majestic long-necked water bird with a long straight beak and a crest of long feathers, wings spread in a circle, its whole body decorated with the geometric patterns of the Đông Sơn bronze drums (Ngọc Lũ drum), bronze-gold and verdigris-green colours, soft golden glow; totem of the ancient Lạc Việt people.* |
| V012 | Cò quắm lớn (Giant Ibis) | *A giant ibis creature: very large dark grey-brown ibis, bare grey head and neck with dark bands on the back of the head, long down-curved bill, pale silver-grey wing tips with black bars, orange-red legs, deep red eyes; mysterious, solitary, wise.* |
| V013 | Cò thìa (Black-faced Spoonbill) | *A black-faced spoonbill creature: white wading bird with a long flat black spoon-shaped bill, bare black face skin that joins the bill, a golden-yellow crest and chest patch (breeding plumage), long black legs; gentle wetland healer.* |
| V014 | Công (Green Peafowl) | *A green peafowl creature: tall proud peacock with metallic green-bronze scale-like feathers on neck and breast, an upright tuft crest of packed feathers, blue and yellow bare skin on the face, a long shimmering green train full of eye-spots spread like a fan.* |
| V015 | Cu li nhỏ (Pygmy Slow Loris) | *A pygmy slow loris creature: small round fluffy primate with a round head, huge orange-brown eyes ringed with dark patches, a dark stripe down the back, tiny ears, woolly orange-brown fur, slow careful grip; its elbows hold a venom gland – a faint purple venom shimmer on its forearms.* |

### Batch B – V016–V025
| ID | Name | SUBJECT line |
|---|---|---|
| V016 | Đồi mồi (Hawksbill Turtle) | *A hawksbill sea turtle creature: narrow pointed hawk-like beak, overlapping amber, brown and gold shell plates with streaky "tortoiseshell" pattern, saw-toothed back edge of the shell, flippers each with two small claws; tough reef guardian.* |
| V017 | Gà chín cựa (Nine-spurred Rooster, legendary) | *The legendary nine-spurred rooster: a heroic fighting rooster with brilliant red, orange and gold plumage, tall red comb, long arching black-green tail feathers, and NINE sharp golden spurs along its legs; one of the three wedding gifts in the Sơn Tinh – Thủy Tinh legend; carries the Dậu (Rooster) zodiac sign.* |
| V018 | Gà lôi lam mào trắng (Edwards's Pheasant) | *An Edwards's pheasant creature: male pheasant with glossy blue-black plumage, metallic green edges on the wing feathers, a short white crest, large bright scarlet bare face skin, white upper tail feathers, crimson legs; a lost species (faint ghostly mist at its feet).* |
| V019 | Gấu chó (Sun Bear) | *A sun bear creature: the smallest bear, short sleek black fur, a pale golden-orange U-shaped crescent on the chest, short pale muzzle, small round ears, very long curved claws, long tongue; strong and fearless tree climber.* |
| V020 | Hồ Tinh (Nine-tailed Fox Spirit, legendary) | *The legendary nine-tailed fox spirit of West Lake (Hồ Tây): an elegant cunning fox with silvery-white fur and NINE flowing tails, glowing violet eyes, wisps of purple fox-fire around it, a shape-shifter's mysterious smile; defeated by Lạc Long Quân in the Lĩnh Nam chích quái legend.* |
| V021 | Hồng hoàng (Great Hornbill) | *A great hornbill creature: huge black-and-white bird, enormous yellow bill topped by a big concave yellow-and-black casque, yellow-stained neck, white tail with a black band, red eyes, broad black wings with white bars; forest king of the canopy.* |
| V022 | Hổ Đông Dương (Indochinese Tiger) | *An Indochinese tiger creature: powerful orange tiger, slightly darker and smaller than other tigers, with narrow dark stripes, white cheeks and belly, intense amber eyes; carries the Dần (Tiger) zodiac sign; a lost species in Vietnam (faint ghostly mist at its paws).* |
| V023 | Kim Quy (Golden Turtle God, legendary) | *The legendary Golden Turtle God: a wise ancient giant turtle with a shining golden shell carved with Đông Sơn spiral patterns, kind old eyes, a long white beard, holding a glowing magic crossbow claw; helped King An Dương Vương build Cổ Loa citadel and took back Lê Lợi's sword at Hoàn Kiếm Lake.* |
| V024 | Lân (Vietnamese Lân, legendary) | *The legendary Vietnamese lân of the Tết and Mid-Autumn lion dance: lion-like sacred beast with a big round head, a single short horn, huge round eyes, a short beard, colourful scales on the body and a flowing mane in red, yellow and green, cloud motifs; joyful and brave.* |
| V025 | Mang lớn (Large-antlered Muntjac) | *A large-antlered muntjac creature: the biggest muntjac deer, dark grey-brown coat, long curved antlers on furry stalks, small tusk-like upper fangs in the male, white underside of the tail; discovered in Vũ Quang in the 1990s.* |

### Batch C – V026–V035
| ID | Name | SUBJECT line |
|---|---|---|
| V026 | Nghê (Nghê Guardian, legendary) | *The legendary Nghê: a dog-like guardian beast of Vietnamese communal houses and temples, sturdy stone-grey and moss body, a mane and tail made of curly flame-shaped locks, a friendly but fierce grinning face, carved-wood texture; loyal protector at the temple gate.* |
| V027 | Ngựa chín hồng mao (Nine-red-maned Horse, legendary) | *The legendary nine-red-maned horse: a noble white horse with NINE separate flowing crimson manes along its neck, red tail, golden hooves; one of the three wedding gifts in the Sơn Tinh – Thủy Tinh legend; carries the Ngọ (Horse) zodiac sign.* |
| V028 | Ngựa sắt Thánh Gióng (Iron Horse of Saint Gióng, legendary) | *The legendary iron horse of Saint Gióng: a massive armoured horse made of dark iron plates, breathing fire from its mouth, glowing orange cracks and embers, flaming hoof prints, a few burnt golden bamboo stems nearby (the "tre đằng ngà" legend); unstoppable charge.* |
| V029 | Phượng Hoàng (Vietnamese Phoenix, legendary) | *The legendary Vietnamese phoenix in Lý–Trần dynasty style: an elegant bird with a long slender neck, a curled crest, long flowing tail feathers that curl like flames and clouds, red, gold and jade-green plumage, gentle royal expression, soft fire glow.* |
| V030 | Rẽ mỏ thìa (Spoon-billed Sandpiper) | *A spoon-billed sandpiper creature: tiny sparrow-sized shorebird, black bill with a wide flat spoon-shaped tip, rusty-red head and breast (breeding plumage), mottled brown back, white belly, short black legs; small but clever.* |
| V031 | Rồng Lạc Việt (Vietnamese Dragon, legendary) | *The legendary Vietnamese dragon in Lý-dynasty style: a slender serpent-like dragon with a long body in rhythmic S-curves, a flame-like crest along the back, curling whiskers, small fine scales, holding a glowing pearl, lightning and rain clouds around it, jade-green and gold; ancestor of the Vietnamese people (Lạc Long Quân); carries the Thìn (Dragon) zodiac sign.* |
| V032 | Sao la (Saola) | *A saola creature: forest bovine with a dark chocolate-brown coat, two long almost straight parallel horns sweeping back, striking white markings on the face, white bands above the hooves, big scent glands on the muzzle; shy "Asian unicorn" of the Trường Sơn mountains.* |
| V033 | Sếu đầu đỏ (Sarus Crane) | *A sarus crane creature: the tallest flying bird, soft grey plumage, bare bright red head and upper neck, pale grey crown, long pinkish-red legs, long grey-green bill; graceful dancer of the Đồng Tháp wetlands.* |
| V034 | Tê giác Java (Vietnamese Javan Rhinoceros) | *A Javan rhinoceros creature: grey rhino with ONE small horn, deep skin folds that look like armour plates, a scale-like mosaic skin texture, pointed upper lip; the last one in Vietnam died in Cát Tiên in 2010 – a lost species (faint ghostly mist at its feet).* |
| V035 | Tê tê Java (Sunda Pangolin) | *A Sunda pangolin creature: covered in overlapping brown-olive scales like a pine cone, small cone-shaped head, long sticky tongue, strong curved front claws, long scaly tail; it can curl into an armoured ball.* |

### Batch D – V036–V045
| ID | Name | SUBJECT line |
|---|---|---|
| V036 | Thỏ vằn Trường Sơn (Annamite Striped Rabbit) | *An Annamite striped rabbit creature: buff-grey rabbit with bold dark brown-black stripes along the body and across the face, a reddish rump and short red tail, short ears; secretive and quick.* |
| V037 | Voi châu Á (Asian Elephant) | *An Asian elephant creature: grey elephant with smaller rounded ears, twin-domed head, arched back, pink freckled patches on the face and ears, curved ivory tusks (male), long trunk; strong, wise and kind.* |
| V038 | Voi chín ngà (Nine-tusked Elephant, legendary) | *The legendary nine-tusked elephant: a huge noble elephant with NINE curved ivory tusks, a red-and-gold ceremonial cloth with Đông Sơn patterns on its back, golden ornaments; one of the three wedding gifts in the Sơn Tinh – Thủy Tinh legend.* |
| V039 | Vượn đen má trắng (Northern White-cheeked Gibbon) | *A northern white-cheeked gibbon creature: male gibbon with black fur, bright white cheek patches reaching up to the ears, a small tuft crest on the head, very long arms, no tail; a singer – musical sound waves around it.* |
| V040 | Vượn khổng lồ (Gigantopithecus) | *A Gigantopithecus creature: a prehistoric giant ape about 3 m tall, orangutan-like shaggy reddish-brown fur, massive jaw and big flat teeth, heavy powerful arms, standing on all fours ready to rise; fossil teeth found in Lạng Sơn and Thanh Hóa caves; a lost species (faint ghostly mist).* ⚠ It is known only from teeth and jaws, so this look is a reconstruction. |
| V041 | Bọ Ngựa (Praying Mantis) | *A praying mantis creature: bright green mantis with a triangular head, big compound eyes, long neck, folded spiky raptorial front legs held like a fighter's guard, leaf-like wings; precise and patient.* |
| V042 | Cá Chép (Common Carp) | *A common carp creature: golden-olive carp with large shiny scales, two pairs of small whiskers, a red-gold tail, determined eyes, leaping upward; dreams of jumping the Vũ Môn gate to become a dragon (Vietnamese "cá chép hóa rồng" story).* |
| V043 | Châu Chấu (Rice Grasshopper) | *A rice grasshopper creature: slender bright green grasshopper with a brown stripe behind each eye, long antennae, long powerful jumping hind legs, folded wings; energetic paddy-field fighter.* |
| V044 | Chim Sẻ (Eurasian Tree Sparrow) | *A tree sparrow creature: small plump sparrow with a chestnut-brown cap, white cheeks with a black spot, a small black bib, brown streaked back, two thin white wing bars; cheerful village bird.* |
| V045 | Chó Cỏ (Vietnamese Native Dog) | *A Vietnamese native village dog creature: medium-sized lean dog with a short golden-yellow coat, upright pointed ears, curled tail, alert loyal face; carries the Tuất (Dog) zodiac sign.* |

### Batch E – V046–V055
| ID | Name | SUBJECT line |
|---|---|---|
| V046 | Chó H'Mông Cộc Đuôi (Hmong Bobtail Dog) | *A Hmong bobtail dog creature: sturdy mountain dog with a thick double coat (dark black-brindle), strong legs, upright ears, a very short stubby bobtail, brave serious face; from the Hà Giang highlands; carries the Tuất (Dog) zodiac sign.* |
| V047 | Chó Lài (Lài Dog) | *A Lài dog creature: primitive native dog from the Mã river region (Thanh Hóa), long and broad body, short single-colour sandy-yellow coat, lean athletic hunter, upright ears, wild "Indochinese dingo" look; carries the Tuất (Dog) zodiac sign.* ⚠ There is no breed standard: sources only give the long, broad body and a single-colour coat. The ears and coat colour here are a choice for the PO. |
| V048 | Chó Phú Quốc (Phu Quoc Ridgeback) | *A Phú Quốc ridgeback dog creature: lean athletic hunting dog with a short coat, a ridge of hair growing the opposite way along its spine, long legs, upright ears, a curved tail, a few sea water splashes (a strong swimmer from Phú Quốc island); carries the Tuất (Dog) zodiac sign.* |
| V049 | Chuồn Chuồn (Dragonfly) | *A dragonfly creature: red dragonfly with four long transparent veined wings, huge round compound eyes, long slim segmented body, six thin legs; super-fast aerial hunter.* |
| V050 | Chuột Cống (Brown Rat) | *A brown rat creature: stocky grey-brown rat, small ears, blunt nose, long whiskers, thick scaly tail shorter than its body, sharp orange front teeth; tough survivor of the sewers; carries the Tý (Rat) zodiac sign.* |
| V051 | Chuột Nhắt (House Mouse) | *A house mouse creature: small slim grey-brown mouse with big round ears, bright black eyes, pointed nose, long thin tail; quick and sneaky; carries the Tý (Rat) zodiac sign.* |
| V052 | Cò Trắng (Little Egret) | *A little egret creature: slim pure-white heron, black bill, black legs with bright yellow feet, two long white plumes on the back of the head (breeding plumage); the egret of Vietnamese folk songs over the rice fields.* |
| V053 | Cóc Nhà (Asian Common Toad) | *An Asian common toad creature: chunky brown toad with warty skin, black-tipped warts, black bony ridges on the head, big poison glands behind the eyes, golden eyes; "the toad is the uncle of the sky god" (Cóc kiện trời folk tale).* |
| V054 | Cua Đồng (Rice-field Crab) | *A rice-field crab creature: small freshwater crab with a rounded brownish-olive shell, one claw a bit bigger than the other, raised stalk eyes, eight walking legs; stubborn defender of the rice paddy.* |
| V055 | Dê (Domestic Goat) | *A Vietnamese native goat creature: small sturdy goat with a short brown-black coat, small horns curving backward, a little beard, sure-footed hooves on a rock; carries the Mùi (Goat) zodiac sign.* |

### Batch F – V056–V065
| ID | Name | SUBJECT line |
|---|---|---|
| V056 | Đom Đóm (Firefly) | *A firefly creature: soft-bodied beetle with a dark body, an orange shield over its head, long antennae, wing covers slightly open, and a glowing yellow-green lantern at the tip of its abdomen lighting up the dark.* |
| V057 | Gà Đông Tảo (Đông Tảo Chicken) | *A Đông Tảo rooster creature: big stocky rooster with enormously thick red scaly legs (the breed's famous feature), rust-red and black plumage, small comb; solid and immovable; carries the Dậu (Rooster) zodiac sign.* |
| V058 | Gián (American Cockroach) | *A cockroach creature: shiny reddish-brown cockroach with long whip-like antennae, a pale yellow band around the shield behind the head, spiny legs, wings folded flat; impossible to squash.* |
| V059 | Heo Ỉ (Ỉ Pig) | *An Ỉ pig creature: small round black pig with a heavy sagging belly almost touching the ground, a sway back, short snout, deep wrinkles on the face; traditional Vietnamese pig, calm and stubborn; carries the Hợi (Pig) zodiac sign.* |
| V060 | Heo Móng Cái (Móng Cái Pig) | *A Móng Cái pig creature: sturdy pig with a black head and neck, a white star mark on the forehead, a black saddle over the back and rump, and a white band across the shoulders, belly and legs; carries the Hợi (Pig) zodiac sign.* |
| V061 | Kiến Lửa (Tropical Fire Ant) | *A tropical fire ant creature: reddish-brown ant with a big square head and strong jaws, elbowed antennae, a stinger at the tip of the abdomen, small fiery sparks around it; small but furious.* |
| V062 | Kiến Vàng (Weaver Ant) | *A weaver ant creature: orange-red long-legged ant with big eyes and strong jaws, holding a green leaf stitched with white silk (they build leaf nests); team worker, fierce defender.* |
| V063 | Mèo Mun (Black Cat) | *A black cat creature: sleek all-black cat with glossy fur, bright yellow-green eyes, slim body, long tail curling like a question mark; mysterious; carries the Mão (Cat) zodiac sign – the Vietnamese zodiac has the Cat, not the Rabbit.* |
| V064 | Mèo Mướp (Tabby Cat) | *A tabby cat creature: grey-brown cat with dark mackerel tabby stripes, an "M" mark on the forehead, green eyes, striped tail; clever village mouser; carries the Mão (Cat) zodiac sign.* |
| V065 | Mèo Tam Thể (Calico Cat) | *A calico cat creature: three-coloured cat with patches of white, orange and black, bright eyes, confident fighting stance; brings good luck; carries the Mão (Cat) zodiac sign.* |

### Batch G – V066–V076
| ID | Name | SUBJECT line |
|---|---|---|
| V066 | Muỗi Vằn (Yellow Fever Mosquito) | *A tiger mosquito creature: small black mosquito with white bands on its legs and a white lyre-shaped mark on its back, long thin piercing mouth, clear wings, long legs; sneaky and dangerous.* |
| V067 | Ngựa Ta (Vietnamese Horse) | *A Vietnamese native horse creature: small, short and sturdy horse, bay-brown coat, thick black mane and tail, strong hooves; tireless mountain carrier; carries the Ngọ (Horse) zodiac sign.* |
| V068 | Ong Mật (Asian Honeybee) | *An Asian honeybee creature: fuzzy golden-brown bee with dark stripes on the abdomen, clear wings, big eyes, pollen baskets on the hind legs, a stinger; busy and brave hive defender.* |
| V069 | Ốc Bươu Vàng (Golden Apple Snail) | *A golden apple snail creature: big snail with a round, globe-shaped golden-brown shell with dark spiral bands, a soft grey-yellow body, long tentacles, a cluster of bright pink eggs nearby; an invasive species, very hard to stop.* |
| V070 | Sáo Sậu (Black-collared Starling) | *A black-collared starling creature: starling with a white head, a broad black collar and breast band, yellow bare skin around the eyes, black wings with white spots, brown-grey back; loud and cheerful mimic.* |
| V071 | Thằn Lằn Bóng (Common Sun Skink) | *A common sun skink creature: sleek glossy lizard with smooth shiny bronze-brown scales, dark stripes along the back, orange-yellow flanks, short legs, long tail; fast in the sun.* |
| V072 | Thạch Sùng (Common House Gecko) | *A common house gecko creature: small pale grey-pink gecko, slightly see-through skin, big lidless eyes, sticky toe pads, small spines on the tail; clings to walls and chirps "tắc tắc".* |
| V073 | Trâu (Water Buffalo) | *A water buffalo creature: big dark grey-black buffalo with huge swept-back crescent horns, pale chevron marks on the throat, muddy legs, calm strong eyes; partner of the Vietnamese farmer; carries the Sửu (Buffalo) zodiac sign.* |
| V074 | Ve Sầu (Cicada) | *A cicada creature: stout green-brown cicada with a broad head, wide-set eyes, clear veined wings held like a tent over its back, sound waves around it (the song of Vietnamese summer).* |
| V075 | Vịt Cỏ (Native Duck) | *A Vietnamese native duck creature: small light duck with mottled brown-and-white feathers, orange bill and feet, bright eyes; field duck of the Mekong delta.* |
| V076 | Cá Đuối Điện (Electric Ray) | *An electric ray creature: small round flat brown disc-shaped ray, short thick tail with a small fin, tiny eyes on top, crackling electric arcs around the sides of its body (where its electric organs are).* |

### Batch H – V077–V087
| ID | Name | SUBJECT line |
|---|---|---|
| V077 | Cú Mèo (Collared Scops Owl) | *A collared scops owl creature: small owl with ear tufts, grey-brown camouflaged bark-like plumage, a pale collar on the back of the neck, big dark orange-brown eyes; silent night hunter.* |
| V078 | Diều Hâu (Black Kite) | *A black kite creature: dark brown bird of prey, slightly forked tail, long angled wings, black bill with yellow base, yellow feet with sharp talons, sharp eyes; sky hunter.* |
| V079 | Heo Rừng (Wild Boar) | *A wild boar creature: dark grey-brown boar with coarse bristly fur, a mane of stiff hair along the spine, long snout, curved white tusks, small fierce eyes; charging fighter; carries the Hợi (Pig) zodiac sign.* |
| V080 | Hoẵng (Red Muntjac) | *A red muntjac (barking deer) creature: small reddish-brown deer, short antlers on long furry stalks, dark V-shaped lines on the face, small tusks, white underside of the tail; alert, barks at danger.* |
| V081 | Mực (Cuttlefish) | *A cuttlefish creature: oval body with a wavy fin skirt around it, W-shaped pupils, eight short arms and two long tentacles, skin rippling with changing colour patterns, a puff of black ink.* |
| V082 | Rắn Hổ Mang (Monocled Cobra) | *A monocled cobra creature: olive-brown cobra raising its spread hood, with ONE round "O" mark (monocle) on the back of the hood, flicking tongue, glowing eyes; carries the Tỵ (Snake) zodiac sign.* |
| V083 | Sóc Bụng Đỏ (Pallas's Squirrel) | *A Pallas's squirrel creature: olive-brown squirrel with a bright chestnut-red belly, big bushy tail, small round ears, holding a nut; quick and helpful.* |
| V084 | Sứa (Jellyfish) | *A jellyfish creature: translucent glowing bell, frilly oral arms and long stinging tentacles, soft pink-violet colours, gentle drifting pose.* |
| V085 | Tắc Kè (Tokay Gecko) | *A tokay gecko creature: big blue-grey gecko covered with bright orange-red spots, large head, big yellow-orange eyes, wide toe pads, open mouth calling "tắc kè".* |
| V086 | Trăn Gấm (Reticulated Python) | *A reticulated python creature: huge python with a net-like pattern of black, gold-yellow and brown diamond shapes, a rainbow sheen on its scales, thick coils, golden eyes; the world's longest snake; carries the Tỵ (Snake) zodiac sign.* |
| V087 | Sói Đỏ (Dhole) | *A dhole creature: wild dog with a rusty-red coat, a black bushy tail, rounded ears, whitish throat and chest, lean athletic body; hunts as a pack.* |

## Tips
- Same tips as batch 1: if it adds a background, repeat *"isolated on pure white background"*; if too realistic, add
  *"more stylised, cartoon proportions, bigger head and eyes"*; if too childish, add *"slightly more mature and heroic"*.
- Insects and other tiny animals are drawn at the same picture size as large ones; the game scales by role, not by real size.
- Licence note (task T39): in many countries purely AI-generated images get no copyright; check before a commercial release.

## Sources checked for this pack (13 Nov 2026)
- Species features: each species' English Wikipedia page and IUCN Red List account; VieIndex notes with their sources in `data/vn_info.json`.
- Grey-shanked douc: [Wikipedia](https://en.wikipedia.org/wiki/Gray-shanked_douc), [Animal Diversity Web](https://animaldiversity.org/accounts/Pygathrix_cinerea/).
- Edwards's pheasant: [Birds of the World](https://hbw.com/node/53492), [Wikipedia](https://en.wikipedia.com/wiki/Edward%27s_pheasant).
- Owston's civet: [Wikipedia](https://en.wikipedia.org/wiki/Owston%27s_palm_civet), [Ecology Asia](https://www.ecologyasia.com/verts/mammals/owstons-civet.htm).
- Chó Lài: [Wikipedia – Lài dog](https://en.wikipedia.org/wiki/L%C3%A0i_dog), [Chợ Tốt – chó cỏ Việt Nam](https://www.chotot.com/kinh-nghiem/tim-hieu-cho-co-viet-nam.html).
- Legends (Sơn Tinh – Thủy Tinh gifts, Thánh Gióng, Kim Quy, Hồ Tinh, Chim Lạc, Lý-dynasty dragon and phoenix): VieIndex story texts and their sources in `data/vieindex.json` / `data/vn_info.json`.
