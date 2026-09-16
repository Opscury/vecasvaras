# Vecās Varas — review two: is it fun?

Read against the build as of 15 Sept 2026 (post-playtest-fix `main`: Anna, quest steps, the
drag-harvest, the plank walk, the physical bargain, audio, holdings HUD). The first REVIEW.md
was about juice and UX and most of it has landed, so this one is about the layer underneath:
what the player actually *decides*, what it *costs* them, and what they *get back*.

**The headline.** The game is now a beautiful, well-signposted, ten-minute walk through the
right answers. Every decision has its answer written next to it and the wrong answers have no
upside, so a first-timer who reads the screen finishes with two whole shares, sees "labāk vairs
nevar", and has no reason to come back — and never sees the game's best writing (the thin loaf,
the Devil weighing it, "viltota nauda"), which lives entirely on the path nobody takes.

The atmosphere, the verbs and the feedback are all good enough now. What is missing is
**temptation**. A game about what you leave behind only works if leaving costs something you
can feel. Right now it costs nothing, so the tithe is a quiz answer rather than a sacrifice.

Everything below is in priority order. The first three are the ones that change the game.

---

## 1. Make leaving the share cost something you can see — size S/M

**The problem.** Leaving the double ear standing has no visible price. You cut around it, pick
"tie it down", and the granary is fuller than if you had taken it. The greedy option is worse
*immediately and in every way*, so it is not a choice; the hint stone even tells you so. There
is no moment where the player wants the ear.

**The fix.** Count the harvest as the player makes it. Put a running sheaf tally in the top
prompt while cutting — `Kūļi: 7` — and let each cell of the field feed it (`done.size` divided
by ~5). The island counts too: the two protected cells are the heaviest sheaf in the field, and
cutting it is the one stroke that makes the number jump by more than the rest. Leaving it
standing means walking home one sheaf short, *on screen, by your own hand*. That is what a
tithe is.

Then let Anna's scene pay it off with the HUD, in front of the player, not in prose: the
greedy cart arrives at 8, she says "Tu paņēmi visu", and the BREAD cells fill to one as the
grain "dries light" — the number goes *down* in her yard. The tithed cart arrives at 7 and fills
to two, "heavier than it has any right to be". The same facts you already have, but the player
watched themselves choose the smaller number and then saw why.

`holdings()` already keys off `state.jumis`, so this is the counter in `JumisScene.strike()`,
one line in `Prompt`, and an animated refresh in `takeHarvestBack()` instead of at arrival.

## 2. Make the bread the *better* answer at the bog, not the alternative — size S

**The problem.** The bread-only-works-if-you-tithed rule is the smartest idea in the project,
and the way the game is built nobody needs it. The cat always works, Anna says "neej viens"
twice, the cat is in the bag, so the cat goes over. The bread path is only ever taken by a
player who missed the optional pickup or is poking at the game. The two encounters are
supposed to be one system; in play they are still two levels.

Also, a thing you may not have noticed: after the bog, `VillageScene` draws the cat on the
doorstep whenever `!bag.has('cat')` — so the cat you handed to the Devil is sitting on the
step the next morning with no comment, and can be picked up again. It is either a lovely beat
or a hole, and right now it is neither.

**The fix.** Give the two good answers different prices, and put the difference in the village:

- **Cat** — the bridge comes out whole, and the cat *does not come home*. Empty doorstep,
  one line from Anna the next morning ("Un kaķis?" — she does not scold; that is worse), the
  hotspot says the step is empty. The classic trick works, and it was still giving something
  living away, which is exactly the game's subject.
- **Bread from a full year** — whole bridge, the cock crows, he is gone, and the cat is asleep
  on the step. The tithe you left in the field is what bought the cat back. That is the link,
  finally *felt* rather than explained.
- **Bread from a thin year** — as now: the best scene in the game, and now a player will
  actually reach it, because they will try the bread to keep the cat.

Add one line from the Devil before the bargain when the cat is in the bag ("Un kas tev tur
kulē ņaud?") so the player knows he has seen it — foreshadowing, and he is your best voice.
The tally then has a third row or a suffix ("Pāreja — vesela daļa, un kaķis mājās"), which
gives "Otrā reizē var labāk" something true to point at.

This is text, a `catGone` flag in `RunState`, one conditional in the village, and one in the
tally. Nothing in `rules.ts` changes except a new boolean out of `velnsMisses`.

## 3. The double ear: make the last choice a gesture, not a list — size M

You already wrote the argument for this in `JumisScene`'s header: the drag *is* the verb,
picking off a list is not. And then the encounter ends on a two-item list. The sickle is still
in hand, the island is the only rye standing, and the game switches back to reading.

Make the three endings three strokes on the island, with the blade already in hand:

- a stroke that **starts on the ear and sweeps down** bends it to the ground — the tithe;
  `bound` fades in, the wind comes back over the island for a moment (Jumis noticing).
- a stroke that **starts on it and pulls up** uproots it — carried home.
- a stroke that **starts on it and sweeps across** cuts it — the existing warn-then-cut rule.

The direction is read off `strokeFrom` against the release point; anything under ~60px is a
tap and gets the warning. Show the three verbs once as a three-word prompt at the top
("Pieliekt · Izraut · Nocirst") so it is not a guessing game, and keep the list as the 20-second
fallback the way the bog does. On a phone this is more natural than the list, not less.

## 4. The stone remembers — carve the marks into it, in the village — size S

The Reckoning card carves a mark and then it is gone; the tally shows both at the very end.
Meanwhile there is a rune stone in the middle of the hub whose whole text is "nobody
remembers what was cut into it" and "it remembers better than I do". Put the marks *on the
stone*: after each encounter the Jumja zīme or the crossing glyph appears on it (whole or
broken, same `SignMark`, drawn small into the painting and tinted to the stone), carved in
front of the player on arrival, where the granary appears now. The stone becomes the record
the player walks past every time, and the ending's tally is a close-up of something they have
already seen grow. Two marks, with obvious room for more, is a better promise of "this
continues" than the empty HUD cells (see 9).

## 5. The first crumb — a secret that uses what is already there — size S

The stone text says everyone throws it the first crumb of the first loaf. Nothing lets the
player do it. Let them: bread used on the stone (while it is still whole, before the bog)
breaks off a crumb, a tiny warm light, one line, and the loaf is still the loaf. No mechanical
reward beyond a mark or a word from Anna — it is the kind of optional thing that makes a
player feel the world listened. Point-and-click fun lives in these. Along the same line, four
or five bespoke replies to items used on the wrong thing (sickle on Anna, cat on Anna, bread on
the cat, sickle on the stone) instead of the one generic `cutWrongTool`. Cheap, and it is what
players remember from the genre.

## 6. The plank walk needs one consequence — size S

Three planks in order, two decoys, wrong step = shake and a line. There is nothing to read
and nothing at stake, so it is three taps on the next lit disc. Two changes:

- a wrong step **puts you back on the bank** (`stepsTaken = 0`, the dark planks come back).
  Not a fail state, a scramble. Ten seconds lost, and now the order is something you remember.
- **use the wisps as false guides.** *Maldugunis* leading walkers off the path is real
  Latvian belief, and you already render wandering lights. Let one settle over a hummock and
  invite the step; let a frog croak (you have the bog bed) from the plank that holds. The
  walk becomes "read the bog", which is the encounter's theme in miniature.

## 7. A replay has to be shorter than the first run — size S

The ending invites a second go and then charges the full price: title, intro, both daina
cards, every arrival line. Once `outroSeen` is set: skip the intro from `Sākt no jauna`, show
each daina once per install (registry flag persisted with the save), let the bag skip its
introduction card. And consider framing the restart as **"Nākamais gads"** rather than "start
over" — the outro already says next year the rye will stand ready again. If the marks on the
stone from item 4 accumulate across years, replaying reads as history rather than reset, which
is a small meta-loop you can extend when encounter three exists.

## 8. The riddle: two beats instead of one — size S

"Without hands, without feet, opens doors" is a freebie; most players get it and the ones who
do not lose the good bridge instantly, for one tap. Give a wrong answer a second, harder riddle
(he is bored — he *wants* to keep going) rather than an immediate downgrade; fumble both and
you get the poor bridge. It doubles the Devil's screen time on the path where he is funniest
and turns a coin flip into a short exchange. Optional: let the player ask him one back on a
right answer — the folk-tale devil losing a riddle contest is the oldest shape there is.

## 9. Two things to push back on

**The holdings HUD.** Six bread cells and four road nodes with two encounters means a perfect
run ends at 2/6 and 2/4, next to a line that says it cannot be done better. I know the empty
half is a deliberate promise, but to a first-timer an unfillable meter reads as failure. Either
size the caps to what exists now and grow them as encounters land, or hide the empty cells
until a third encounter exists and let the stone (item 4) carry the "this continues" signal.

**Text between plays at the bog.** Arrive (2) → planks → greet (3) → riddle → answer + terms
(2) → bargain → outcome (2–3) → reckoning → arrival → Anna (2) → stone (2) → outro (3) →
tally. It is still a lot of reading around the two good minutes. The greet can be two lines,
and the terms can be spoken *while* the bargain prompt is already on screen so the player is
reaching for the bag as he finishes.

---

## Do these three first

1. **Sheaf count + Anna's yard** (item 1) — the tithe becomes something you give up.
2. **Cat vs bread prices + the empty doorstep** (item 2) — the two encounters become one
   system, and the poor-bread scene gets played.
3. **The stone carries the marks** (item 4) — the hub gets a record the player watches grow.

Together they are maybe two evenings, touch no art, and change what the game *is* from "read
the rule, do the rule" to "decide what to keep". Item 3 (the gesture) is the next evening.

Still on the release gate list, unchanged from before: the dainas are `verified: false`, the
riddle is unchecked, and it has not been played on a real phone.

---

# Part two — the deeper cuts

The first nine items fix the game you have. These change what kind of game it is. They are
ordered by how much I believe in them, and I have tried to say what each one is *for*, not
just what it is. The thread through all of them: the game's subject is *what you leave*, so
the mechanics should be about quantity, cost and memory — not about finding the right button.

## 10. The tithe is a quantity, not a checkbox — size M, and it *simplifies* the code

Right now "leave a share" is binary: the island is protected for you, you cut to 86%, the game
fells the rest, and you pick from a list. The player never decides *how much* to leave. But
the real rule — the one on your own boundary stone — is about proportion: leave a share,
never take the last. That is an analog instruction and the harvest is an analog mechanic.
The two should meet.

Make the harvest end when the *player* ends it: sweep until you are done, then put the
sickle back in the bag (you have the put-back chip already; it becomes the "I'm finished"
verb). The game then reads the field:

- nothing standing, ear cut → *paņēmi visu*. Greedy.
- the ear standing in a patch of a few cells → the tithe. Full granary.
- the ear standing in a *third of the field* → Anna: "Tu atstāji laukam pusi lauka. Ar ko
  ciems ziemos?" Not the same failure as greed — the opposite one — but not a full granary
  either. Leaving too much is also a way of not understanding the rule.

Three outcomes from one continuous input, and the poor one splits into two *different*
poors, which is where the writing gets interesting. The bread meter from item 1 becomes the
live readout of the decision. And you delete `TITHE_ISLAND`, `ISLAND_LOBES`, `protectIsland`,
the eraser texture and `fellTheRest` — the standing patch is simply whatever the player did not
cut. The warn-before-cut rule on the ear itself stays.

What this buys: the field becomes a place where the player *expresses* how they read the rule
rather than confirms it. Two players will leave different fields. That is the difference
between a puzzle and a decision.

## 11. The night has a clock: the bridge builds while you bargain — size M

The folk tale's whole engine is *before the cocks crow*. Your Devil says it in his second line
and then nothing in the scene has time in it. Meanwhile you already have the payoff drawn:
`bridge_poor`, `bridge_full_v3`, and a bog painting whose planks stop halfway.

Once the terms are spoken, he starts building — and the player watches. Every ten or twelve
seconds a plank lays itself across the water, the far end of the causeway creeping toward the
near bank, the sky lifting a shade toward grey, the frogs thinning out. The bargain prompt and
the bag are up the whole time. Whatever the player does *ends the night*: the offering is
made, the cock crows, and what is built stays built. Hesitate too long and the cock crows on
its own — he shrugs, "gaiļi", and you get what stood at that moment.

This is the 20-second fallback timer, made diegetic. It gives the negotiation a pulse without
a timer bar, makes his "es uzbūvēšu — un lēti" a thing you see him do, and it makes the
*visible* bridge the reward, not the reckoning card. It also lets the poor outcomes be shown
rather than told: "tik daudz, cik tava maize bija vērta" is a bridge that stops at plank four.

Art: six or seven plank sprites in the bog's light, or cut them from `bog.jpg` itself. Code:
one timer, one `planksBuilt` counter that `resolve()` reads for the *frail* bridge's length.

## 12. The cat scouts the bog — size S

If you brought the cat, it walks out ahead of you on the planks — the walk cycle you already
solved the paw-slide for — and it only walks on the ones that hold. It stops at the edge of a
hummock and looks back. A player with the cat reads the crossing off the cat; a player
without it reads it off the bog. Animals sensing what people cannot is as folk as it gets, it
rewards the optional pickup with something *useful* rather than something explained, and it
does the one thing item 2 needs: it makes you fond of the cat before the Devil asks for it.
Giving away the thing that just got you across is a real decision. Right now the cat is an
icon in a tray.

## 13. Stop telling the player the answer twice — size S, mostly deletions

Teach, test, twist — that is the shape of every good puzzle game. The field *teaches* the rule
(the stone says it outright, and that is fine — it is a first encounter). The bog should
*test* whether the player can see the same rule wearing different clothes: "the first living
thing across" is a share, and the bread — the field's share, passed on — is the answer for a
player who understood the field. That is a lovely piece of reasoning to let someone do.

The game does not let them. Anna says "neej viens" twice. `needOffering` says "do not go
alone". The cat is the answer before the question is asked. Cut every hint that names the cat.
Anna reminds you of *errands*, never of *solutions* — "the crossing over the bog, and take
the bread" is all she should say. The cat is a thing on a doorstep that you picked up because
it was there, and whether you thought to use it is yours. The player who sends the bread and
sees the cock crow has *solved* the game's thesis, and they will know it. The player who
sends the cat has done the folk tale. Both good; neither told.

## 14. A fed village smokes — size S

`holdings()` is a model of how well the village is doing. `Atmosphere.smoke()` takes a rate.
Connect them: an empty granary is one thin chimney; a full one is both chimneys going and a
window lit in Anna's cottage. Come home from the bog at dusk — the bog is already dusk — with
the village painting cooled a shade and warm light in two windows if the winter is provided
for, one if it is not. The player has been reading the HUD for the whole game; this is the
moment the *painting* says the same thing, and it is the cheapest emotional payoff in the
whole list. Nothing new to draw: a tint, two glow sprites, two numbers.

## 15. Ticējumi — the folklore as a collection — size S/M

Every belief the player meets is a real one: leave the field a share, the last sheaf, the
wind that opens doors, the first crumb to the stone, the animal over the Devil's bridge, the
cock that ends the night. Record them. A page off the ⟲ chip, "Ticējumi 4 / 7", each one
written the way Šmits wrote it down — with the source number, which turns your verify-before-
release gate into a feature: the game *shows its sources*. It is the completionist hook this
genre has always had (Roadwarden, Pentiment, Kentucky Route Zero all keep a book), it is the
cultural payload made explicit for a VKKF reader, and it is the excuse for the two or three
optional discoveries per scene (the crumb, the bound ear, the hummock lights) that make people
look at paintings instead of clicking through them. Seven entries in the slice, with the
number visibly unfinished — *that* is a promise of more that reads as a promise.

## 16. The field, afterwards — size S

`pathField.done` says "the field is cut, stubble and a cold wind" and refuses the door. Open
it. No encounter — the cut painting, the bound ear in its patch (or the bare spot where you
tore it out), the wind gone, birds on the stubble, one line if you touch the ear. Thirty
seconds of nothing happening. Places that stay changed are how a world becomes a place, and a
player who went back to look at what they left is the player who understood the game. It is
`JumisScene` with `cutting` never set and the mask pre-filled; an afternoon.

## 17. Sing the dainas — asset, not code

The cards are silent, and dainas are *sung*. Traditional melodies are public domain. One line,
unaccompanied — Agnese, a friend, anyone who can hold a tune, recorded on a phone in a quiet
room, or a single kokle line under it — on each card, and the game changes register from
"illustrated text" to something a Latvian player will feel in their chest before they read a
word. It is the biggest atmosphere upgrade per euro available to you, and it is also the
thing a funder's reviewer will remember after they close the tab.

While in the sound: let the bog answer the riddle. When he asks what opens doors without
hands, gust the wind shader across the reeds, roll the mist, swell the bed for two seconds.
The answer is in the world for anyone looking at it. Keep the three options; the player who
noticed gets to feel clever.

## 18. "Take" deserves to be a rival good — flag first, decide deliberately

A folklore point that a Latvian reviewer *will* raise: *Jumja ķeršana* — catching Jumis in the
last sheaf and carrying it home to the granary — is in many accounts the desired outcome, not
a lesser one. The game currently scores it as diminished. You may want that reading (the game
is about leaving, and it says so), but consider the alternative, because it is a better
*dilemma*: **leave** = full granary, ordinary loaf; **take** = the granary is lighter but the
loaf carries Jumis — the bread argument at the bog is at its strongest, the Devil leaves the
bog for good, and the cat stays home. Two goods with different downstream uses, and the greedy
cut stays the only true poor. The field would then be asking "what do you want this year's
share to *do*?", which is a question with no answer written on a stone. It does change the
thesis, so I would not do it quietly — but I would think about it before a folklorist does.

## 19. A share card at the end — size S, and it is marketing

At the tally, a "Dalīties" button that renders the two marks, the verdict line and the game's
name to a PNG (`canvas.toBlob` on a hidden Phaser render texture) and hands it to the Web
Share API, or downloads it on desktop. Two marks whole or broken is a *legible* result — it
reads on a phone screen in a feed — and a folklore game from Jelgava with a shareable ending is
how a vertical slice gets its first hundred players without a euro of marketing. Ten minutes
of code, and put `vecasvaras.protu.lv` in the corner of the image.

---

## If I could only add three from part two

**10** (the tithe as a quantity), **11** (the bridge builds during the bargain), and **14** (a
fed village smokes). Ten turns the field into a decision, eleven turns the bog into a scene,
fourteen makes the hub answer both. Then 13, which is deletions, and 17, which is a phone
recording. The rest are for after a real phone playtest.
