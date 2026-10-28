// Local chat "brain" for the WhatsUp app: no network, no AI. It reads what
// you type (keywords, phrases, a rough mood score), remembers facts you tell
// her, and answers in her own voice using what's going on in the game.
//   CHATBOT.reply(id, text, ctx) -> { lines: [string], aff, intent, invite }
//   ctx: { name, aff, gf, place, hour, weather, mood, job, mem, others }
(function (global) {
  'use strict';

  // ------------------------------------------------------- understanding
  const has = (t, list) => list.some((w) => (w instanceof RegExp ? w.test(t) : new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])').test(t)));
  const POS = ['love', 'like', 'great', 'good', 'nice', 'awesome', 'amazing', 'happy', 'fun', 'cool', 'sweet', 'cute', 'pretty', 'beautiful', 'best', 'wonderful', 'glad', 'yay', 'thanks', 'thank', 'perfect', 'lovely', 'excited', '❤', '♥', '😊', '😍', '🥰', '😘', '💕', '💖', ':)', '<3'];
  const NEG = ['hate', 'bad', 'awful', 'terrible', 'stupid', 'dumb', 'ugly', 'boring', 'annoying', 'sad', 'angry', 'worst', 'gross', 'idiot', 'shut up', 'loser', 'tired', 'lonely', 'cry', 'sucks', '😡', '😢', '😭', ':('];
  function sentiment(t) {
    let s = 0;
    for (const w of POS) if (t.includes(w)) s += 1;
    for (const w of NEG) if (t.includes(w)) s -= 1;
    if (/\b(not|don't|dont|never|no)\b/.test(t) && s) s = -s / 2;
    return s;
  }

  // Ordered: the first match wins.
  const INTENTS = [
    ['insult', [/\b(stupid|idiot|dumb|ugly|fat|loser|shut up|hate you|annoying|boring|gross|moron|useless|f+u+c*k|bitch|jerk|creep)\b/]],
    ['love', [/\bi (really |truly )?love (you|u)\b/, /\bily\b/, /\b(be my (girlfriend|gf)|marry me|date me|go out with me)\b/, /\bi'?m in love\b/]],
    ['recall', [/\bwhat('?s| is) my fav(ou?rite)?\b/, /\bdo you remember\b/, /\bwhat do (you know about me|i like)\b/, /\bremember me\b/]],
    ['fact', [/\bmy fav(ou?rite)? [a-z ]{2,20} is\b/, /\bi'?m from\b/, /\bi am from\b/, /\bi (really )?(like|love|enjoy|adore|hate|dislike) (?!you\b|u\b)[a-z]/]],
    ['meet', [/\b(meet( up)?|hang ?out|go out|wanna go|want to go|let'?s go|come (over|with)|date\b|see you (at|in)|free (today|later|tonight))/]],
    ['night', [/\b(good ?night|gn|nighty|sleep (well|tight)|sweet dreams|going to (bed|sleep))\b/]],
    ['bye', [/\b(bye|goodbye|see (ya|you)|later|ttyl|gotta go|cya)\b/]],
    ['sorry', [/\b(sorry|apologi[sz]e|my bad|forgive me)\b/]],
    ['thanks', [/\b(thanks|thank you|thx|ty|appreciate)\b/]],
    ['flirt', [/\b(kiss|hug|cuddle|miss (you|u)|thinking (of|about) (you|u)|i like (you|u)|crush|wanna see you|want to see you|hold (your )?hand)\b/, /😘|😍|🥰|💋/]],
    ['compliment', [/\b(you'?re|you are|ur|so|really|very) (cute|pretty|beautiful|gorgeous|adorable|hot|lovely|amazing|cool|smart|funny|kind|sweet|awesome|stunning)\b/, /\b(cute|pretty|beautiful|gorgeous|adorable)\b/]],
    ['userSad', [/\bi'?m (so |really |kinda |a bit )?(sad|tired|lonely|stressed|depressed|upset|down|sick|exhausted|bored)\b/, /\b(bad|rough|awful|terrible) day\b/, /\bi feel (bad|sad|down|lonely|sick)\b/]],
    ['userHappy', [/\bi'?m (so |really )?(happy|excited|great|good|fine|awesome)\b/, /\b(good|great|amazing|awesome) day\b/, /\bi (passed|won|got (a|the|promoted)|finished)\b/]],
    ['how', [/\bhow (are|r) (you|u|ya)\b/, /\bhow'?s (it going|your day|life|things)\b/, /\bhow was (your|ur) day\b/, /\bwhat'?s up\b/, /\bsup\b/, /\bhow (you|u) doing\b/]],
    ['doing', [/\b(what are you|what r u|whatcha|wyd|what you) (doing|up to)\b/, /\bwhere are (you|u)\b/, /\bwyd\b/, /\bbusy\b/]],
    ['greet', [/^(hi+|hey+|hello+|yo+|hiya|howdy|heya|good (morning|afternoon|evening)|morning|ohayo|konnichiwa|sup)\b/]],
    ['food', [/\b(hungry|eat|ate|food|lunch|dinner|breakfast|snack|cook|ramen|sushi|pizza|burger|cake|dessert|sweets?|candy|honey|tea|coffee|curry|crepe)\b/]],
    ['work', [/\b(work|job|shift|money|rent|broke|salary|paid|boss|school|class|study|exam|homework)\b/]],
    ['weather', [/\b(weather|rain|raining|sunny|storm|thunder|cold|hot outside|snow|cloudy|sakura|blossom)\b/]],
    ['gift', [/\b(gift|present|buy you|bought you|get you something|surprise for you)\b/]],
    ['laugh', [/\b(lol|lmao|haha+|hehe+|rofl|funny|joke)\b/, /😂|🤣/]],
    ['aboutHer', [/\b(tell me about (yourself|you)|about you|your hobby|hobbies|what do you like|do you like|your fav(ou?rite)?|what'?s your)\b/]],
    ['yes', [/^(yes|yeah|yep|yup|sure|ok(ay)?|of course|definitely|totally|absolutely|uh huh|y)\b/]],
    ['no', [/^(no|nope|nah|not really|never|n)\b/]],
  ];
  function intentOf(t) {
    for (const [k, pats] of INTENTS) if (has(t, pats)) return k;
    return t.includes('?') ? 'question' : 'fallback';
  }

  // facts you tell her: "my favourite food is ramen", "I like cats", "I'm from Osaka"
  const clean = (v) => v.replace(/[!?.,~]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  function learn(t, mem) {
    let m;
    if ((m = t.match(/\bmy fav(?:ou?rite)? ([a-z ]{2,20}?) is ([a-z0-9' -]{2,30})/))) { mem.fav = mem.fav || {}; mem.fav[clean(m[1])] = clean(m[2]); return `your favourite ${clean(m[1])} is ${clean(m[2])}`; }
    if ((m = t.match(/\bi(?:'?m| am) from ([a-z' -]{2,30})/))) { mem.from = clean(m[1]); return `you're from ${mem.from}`; }
    if ((m = t.match(/\bi (?:really )?(like|love|enjoy|adore) ([a-z0-9' -]{2,30})/)) && !/^(you|u)\b/.test(m[2])) { mem.likes = [...new Set([clean(m[2]), ...(mem.likes || [])])].slice(0, 6); return `you like ${clean(m[2])}`; }
    if ((m = t.match(/\bi (?:hate|dislike|can'?t stand) ([a-z0-9' -]{2,30})/)) && !/^(you|u)\b/.test(m[1])) { mem.hates = [...new Set([clean(m[1]), ...(mem.hates || [])])].slice(0, 6); return `you don't like ${clean(m[1])}`; }
    return null;
  }
  function recall(t, mem) {
    const m = t.match(/\bfav(?:ou?rite)? ([a-z ]{2,20})/);
    if (m && mem.fav) { const k = clean(m[1]); if (mem.fav[k]) return `your favourite ${k} is ${mem.fav[k]}`; }
    const bits = [];
    if (mem.fav) for (const [k, v] of Object.entries(mem.fav)) bits.push(`your favourite ${k} is ${v}`);
    if (mem.likes && mem.likes.length) bits.push(`you like ${mem.likes.slice(0, 2).join(' and ')}`);
    if (mem.hates && mem.hates.length) bits.push(`you don't like ${mem.hates[0]}`);
    if (mem.from) bits.push(`you're from ${mem.from}`);
    return bits.length ? bits.slice(0, 2).join(', and ') : null;
  }

  // -------------------------------------------------------- her voice
  // {name} you · {place} where she is · {weather} · {job} · {fact} · {girl}
  const V = {
    nami: {
      greet: ['Hey hey! Customer number one of the day! 🍊', 'Oh, {name}! Perfect timing, I was bored.', 'Hiii! You owe me a message, you know. Interest is adding up.'],
      how: ['Good! Tips were great today. 💰', "Tired, but my savings jar is fuller, so I'm happy!", "Pretty good! Better now that you're texting. Don't let it go to your head."],
      doing: ["I'm at {place}. Counting coins, obviously.", 'Drawing a map at {place}! It has a secret shortcut on it.', "At {place}. Come buy something and I'll tell you more~"],
      compliment: ['Flattery is free, so... keep going. 😏', 'Hehe, I know~ But hearing it from you is nice.', "Cute? Me? ...Okay, that one's going in my memory jar."],
      flirt: ['Wh-what?! Since when are you so smooth?! 🧡', "Miss me already? Ha! ...Me too. A little.", "Careful, {name}. I charge extra for my heart."],
      loveLow: ["Whoa there! We're not there yet! ...Buy me lunch first.", "Pfft. You're bold. Ask me again when you mean it."],
      loveHigh: ["...Idiot. I love you too. Don't make me say it twice. 🧡", "I'd give up my whole treasure map for you. ...Don't tell anyone."],
      insult: ['Excuse me?! That just cost you ¥1000. 😤', "Wow. Rude. I'm charging you for that.", '...Okay, that actually stung. Not cool.'],
      sorry: ['Hmph. Fine. Apology accepted. Tip included?', "Okay, okay. I forgive you. This time."],
      thanks: ["You're welcome! That'll be ¥100. Kidding~", 'Anytime! Well, almost anytime.'],
      bye: ['Bye bye! Come by the café!', 'Later! Bring snacks next time!'],
      night: ['Night! Dream of tangerines 🍊', 'Good night! Count coins, not sheep.'],
      food: ["Food talk?! I'm starving. You buying?", 'Tangerines. Always tangerines. 🍊', 'The café curry is cheap AND good. Best combo.'],
      work: ['Work is work. But I get to see the sea on my break!', "Money talk is my favourite talk. How's your wallet?"],
      weather: ['{weather} today... Perfect for a walk by the sea. Or for counting money inside.', '{weather}! I can smell the ocean from here.'],
      gift: ['A gift?! For me?! ...Is it shiny? Is it money?', "Ooh, gifts! Tangerines are always a safe bet, hint hint."],
      laugh: ['Hahaha! Okay, that was good.', "Pfft— stop, the customers are staring!"],
      aboutHer: ["Me? I'm saving up to sail the whole world and draw every coastline!", 'I love maps, money and tangerines. In that order. ...Maybe.'],
      userSad: ["Hey... want me to come cheer you up? Free of charge. Just this once.", "Aww. Bad days happen. Come by the café, I'll sneak you a cake."],
      userHappy: ["Yay! Good news deserves a celebration. You're treating me, right?", "That's awesome! See? Things work out!"],
      girl: ['{girl}? She owes me money. ...Okay, she\'s nice.', 'Why are you talking about {girl} to ME? Hmph.'],
      remember: ['Got it, {fact}. I wrote it down in my notebook!', "Noted! {fact}. That's valuable information."],
      recall: ['Of course I remember! {fact}. I never forget a customer.', 'Hmm... {fact}. Right?'],
      forgot: ["Uhh... you never told me! Spill it!", 'Hmm, I don\'t think you told me anything about that yet.'],
      question: ['Hmm, good question! ...I dunno. What do you think?', "That's a secret. Secrets cost extra~"],
      yes: ['Great! Glad we agree.', 'Hehe, I knew you would say that.'],
      no: ["Aww, really? Boo.", 'Hmph. Okay then.'],
      fallback: ['Hehe, you\'re weird. I like it.', "Huh? Say that again, slowly.", "I'll pretend I understood that. 🍊"],
    },
    aqua: {
      greet: ['A message for the goddess! Speak, mortal! 💧', 'Hello, my devoted follower!', 'Oh! {name}! Did you bring an offering?'],
      how: ["Terrible! I spent all my money! ...But I'm a goddess so I'm fine!", 'The goddess is radiant as always! ✨', "Good! I won a drinking contest! ...Don't tell anyone."],
      doing: ['Blessing {place} with my presence!', "I'm at {place}. Hiding from someone I owe money to.", "Being worshipped at {place}! ...Nobody's worshipping. Come worship me."],
      compliment: ['Of course I am! I\'m a goddess! Say it again!', 'Hehe~ finally, someone with good taste! ✨', 'More! Praise me more!'],
      flirt: ['W-what?! Flirting with a goddess is a great sin! ...A small one. 💙', 'Ehehe, you missed me? Of course you did!', 'A hug from the goddess? Only for the faithful! ...Okay, you can have one.'],
      loveLow: ["L-love?! I'm a goddess! You need way more offerings first!", 'Eeeh?! S-so sudden! The goddess needs time!'],
      loveHigh: ['The goddess loves you too! You are my number one believer forever! 💙💙', 'Waaah, I love you! Never leave me, okay?!'],
      insult: ['WAAAAH! How dare you insult a goddess?! 😭', "I'm telling everyone you were mean to me!", 'Divine punishment is coming for you! ...Probably tomorrow.'],
      sorry: ["Hmph! The goddess forgives you! Offerings required.", "Okay... but say I'm the best goddess first."],
      thanks: ["Of course! Thank me with offerings!", 'The goddess accepts your gratitude! ✨'],
      bye: ['Farewell, mortal! Pray to me!', 'Bye! Bring drinks next time!'],
      night: ['Good night! May the goddess bless your dreams! 💤', 'Night night! Dream of me, obviously.'],
      food: ['Food?! Buy me a drink and some snacks! 🍹', 'I could eat ten crêpes right now. Divine metabolism!'],
      work: ['Work? Goddesses don\'t work! ...Okay, I sweep the shrine sometimes.', "Money? Don't ask about my money. Please."],
      weather: ['{weather}? Water is my element! Rain is the best!', "It's {weather}. The heavens obey my mood!"],
      gift: ['An offering?! Yes yes yes! I accept!', 'Gifts for the goddess are always welcome! Especially drinks!'],
      laugh: ['Ahahaha! Wait, are you laughing at me?!', "Hehe, even a goddess needs to laugh!"],
      aboutHer: ['I am Aqua, the goddess of water! Worship me!', 'I like parties, drinks, and being praised. Normal goddess stuff.'],
      userSad: ['Waaah, don\'t be sad! The goddess will bless you! *splash* There!', "Come to the shrine. I'll heal you! I'm actually good at that!"],
      userHappy: ['Yay! That\'s the goddess\'s blessing working!', 'Good news! We should celebrate with drinks!'],
      girl: ["{girl}? She's not a goddess though. I'm better.", 'Why are you talking about {girl}?! Focus on the goddess!'],
      remember: ['The goddess shall remember: {fact}! Probably!', 'Noted in my divine memory! {fact}!'],
      recall: ['Hmm... {fact}! See? Goddess memory!', 'Of course I remember! {fact}!'],
      forgot: ['Ehh? You never told me! Or I forgot. Goddesses are busy!', "Umm... I don't remember. Tell me again?"],
      question: ['A question for the goddess? The answer is... yes! Probably!', "Hmm! That's a divine mystery!"],
      yes: ['Yay! Good answer!', 'Correct! The goddess approves!'],
      no: ['Eh?! Why not?!', 'Booo! Wrong answer!'],
      fallback: ['I have no idea what that means, but I bless it! 💧', 'Huh? Is that a riddle?', 'The goddess is confused. Explain!'],
    },
    yumeko: {
      greet: ['Ufufu, good timing. I was just thinking about our next game. 🎲', 'Hello, {name}. Shall we play?', 'Ara, a message from you. What a lucky draw.'],
      how: ['Thrilling, as always. I won three bets before lunch.', "Wonderful. The student council has a new secret. Ufufu.", "Better now. Talking to you is a gamble I enjoy."],
      doing: ['I am at {place}, shuffling cards.', 'Watching people at {place}. Everyone is a gambler if you look closely.', "At {place}. Waiting for someone interesting. Oh, it's you."],
      compliment: ["Ufufu. You're betting on flattery? It's working.", "My, how bold. I'll accept that.", "Thank you. You're not so bad yourself."],
      flirt: ['How reckless... I love it. ❤️', 'Missing me? Ufufu, I knew you would fold eventually.', "A dangerous play, {name}. Let's see where it goes."],
      loveLow: ['Ara, you\'re going all in so early? How exciting... but no.', 'Ufufu. Bold bet. The answer is "not yet."'],
      loveHigh: ["I love you too. It's the best gamble I've ever made. ❤️", 'All in. Always all in, for you.'],
      insult: ['Ufufu... how boring of you.', "That was a poor move. You'll lose this game.", "I'll remember that. I never forget a debt."],
      sorry: ['Ufufu. Apology accepted. You still owe me a game.', 'Fine. I forgive you. Losing is part of the thrill.'],
      thanks: ['Ufufu, you are welcome.', 'No need. You can repay me at the card table.'],
      bye: ['Until next time. Bring your luck.', 'Goodbye, {name}. The game continues later.'],
      night: ['Good night. Dream of high stakes. ♠️', 'Sleep well. Tomorrow we play again.'],
      food: ['I had tea and sweets. A small luxury.', "Let's bet on dinner. Loser pays."],
      work: ['School is fine. The real lessons are in the games.', 'Money is just a way to keep score. Ufufu.'],
      weather: ['{weather}. A gamble for anyone without an umbrella.', 'It is {weather}. I bet it will change by tonight.'],
      gift: ['A gift? I wonder what it is. The suspense is delicious.', 'Ufufu. Surprise me.'],
      laugh: ['Ufufu, how amusing.', 'Ahaha! You are fun.'],
      aboutHer: ['I am the student council treasurer. And I love risk more than anything.', 'I like cards, dice and people who are not afraid to lose.'],
      userSad: ["A losing streak? It always turns around. I'll play with you until it does.", 'Ufufu. Come to the arcade. Nothing cures sadness like a good gamble.'],
      userHappy: ['How wonderful! Your luck is turning.', 'Ufufu, I like seeing you win.'],
      girl: ['{girl}? An interesting player. But not as interesting as you.', 'Ara, talking about {girl}? How bold of you.'],
      remember: ['Ufufu. {fact}. I will keep that card in my hand.', 'Noted. {fact}. Information is the best weapon.'],
      recall: ['Of course. {fact}. I remember every detail.', '{fact}. Did you think I would forget?'],
      forgot: ['You never showed me that card.', "Ufufu, you're keeping that a secret, aren't you?"],
      question: ['Ufufu. Shall we bet on the answer?', 'A question... I will answer if you win a game.'],
      yes: ['Ufufu, good.', 'I knew you would say that.'],
      no: ['How disappointing.', 'Ara. Then let us play another way.'],
      fallback: ['Ufufu. Interesting.', 'Hmm? You are hard to read. I like that.', 'I cannot tell if you are bluffing.'],
    },
    kurumi: {
      greet: ['Ara ara, {name}. You have my attention. 🕰️', 'Good day. My time is precious, so use it well.', 'Ufufu. Hello there.'],
      how: ['Splendid. The butler made tea from Darjeeling.', 'Rather lovely. I bought another antique clock.', 'Better now, darling.'],
      doing: ['At {place}, listening to the clocks tick.', "I'm at {place}. Do come and find me.", 'Having tea at {place}. Ufufu.'],
      compliment: ['Ara, how sweet. Do continue.', 'I know. But it sounds lovely from you.', 'Ufufu. Flattery will get you... somewhere.'],
      flirt: ['My, how forward. I like it. 🕰️', 'Missing me? Then come and see me, darling.', 'Ara ara, careful. I bite.'],
      loveLow: ['Ara ara, so soon? Patience, darling.', 'How impatient. Time must be savoured.'],
      loveHigh: ['I love you too. I would give you all of my time. ❤️', 'Ufufu... I am yours. Forever, if you like.'],
      insult: ['Ara. How rude. The butler will see you out.', 'That was very unwise, darling.', 'Ufufu... I will make you regret that.'],
      sorry: ['Ara, an apology? Accepted. Gracefully.', 'Very well. I forgive you. This once.'],
      thanks: ['You are most welcome.', 'Ufufu, think nothing of it.'],
      bye: ['Farewell, darling. Do not keep me waiting next time.', 'Until later. Tick tock.'],
      night: ['Sweet dreams. I may visit them. Ufufu~ 🌙', 'Good night, darling.'],
      food: ['Tea and cake at the mansion. Shall I send a car for you?', 'The chef made a terrine. I prefer crêpes, secretly.'],
      work: ["Work? I am an heiress, darling. I don't work. I invest.", 'Money is never a problem. Do you need some?'],
      weather: ['{weather}. A lovely day to stay in the mansion.', 'It is {weather}. I have the perfect parasol for it.'],
      gift: ['A gift for me? How charming. I will treasure it.', 'Ufufu. Surprise me, darling.'],
      laugh: ['Ufufu, how amusing.', 'Ara, you are funny.'],
      aboutHer: ['I am Kurumi Tokisaki, heiress of the Tokisaki fortune. I adore clocks. And cats. Secretly.', 'I like antique clocks, silk dresses and you. In no particular order.'],
      userSad: ["Come to the mansion. I'll have the butler make your favourite tea.", "Ara, don't be sad. I'll take care of you."],
      userHappy: ['How delightful. I am happy for you.', 'Ufufu, wonderful news.'],
      girl: ['{girl}? Hmm. I suppose she is pleasant.', 'Ara ara, talking about {girl} with me? How cruel.'],
      remember: ['Ufufu. {fact}. I shall remember it forever.', 'Noted, darling. {fact}.'],
      recall: ['{fact}. I remember everything about you.', 'Of course. {fact}.'],
      forgot: ['You have not told me that yet, darling.', 'Hmm, a mystery. Tell me.'],
      question: ['Ufufu. What do you think?', 'Ara, that is a secret.'],
      yes: ['Ufufu, lovely.', 'Good.'],
      no: ['Ara. How disappointing.', 'Hmm. Very well.'],
      fallback: ['Ufufu, how curious.', 'Ara? Do explain.', 'Hmm. Interesting, darling.'],
    },
    rem: {
      greet: ['{name}-kun! Rem is so happy you messaged! 💙', 'Hello, {name}-kun! Did you eat today?', 'Rem was just thinking about {name}-kun!'],
      how: ['Rem is good! Rem cleaned the whole café today.', 'Rem is a little tired, but happy! How about {name}-kun?', 'Rem is wonderful now that {name}-kun is here!'],
      doing: ['Rem is at {place}! Working hard.', 'Rem is at {place}, cleaning!', "Rem is at {place}. Rem wishes {name}-kun was here too."],
      compliment: ['R-Rem is cute? Rem is so happy... 💙', 'Thank you, {name}-kun! Rem will try even harder!', "{name}-kun is too kind to Rem..."],
      flirt: ['R-Rem misses {name}-kun too! Very much! 💙', 'A hug? Rem would love a hug!', "Rem's heart is beating so fast..."],
      loveLow: ['R-Rem is very happy... but Rem is not ready yet. Rem is sorry!', 'Rem is so surprised! Please give Rem some time!'],
      loveHigh: ['Rem loves {name}-kun! Rem loves {name}-kun more than anyone! 💙💙', 'Rem will always be by your side. Always.'],
      insult: ["Rem doesn't understand why {name}-kun would say that...", "That hurt Rem's feelings...", 'Rem is sad now.'],
      sorry: ['Rem forgives {name}-kun! Of course!', "It's okay! Rem isn't angry anymore."],
      thanks: ['Rem is happy to help!', "You don't need to thank Rem!"],
      bye: ['Bye bye, {name}-kun! Please take care!', 'See you soon! Rem will be waiting!'],
      night: ['Good night, {name}-kun! Rem will dream of you 💙', 'Sleep well! Rem will make breakfast tomorrow!'],
      food: ['Rem can cook for {name}-kun anytime! What do you want?', 'Rem made curry today! Would you like some?'],
      work: ['The maid café is busy, but Rem likes working.', "Rem works hard so Rem can buy nice things for {name}-kun!"],
      weather: ['It is {weather}! Please dress properly, {name}-kun!', "{weather} today. Rem will bring an umbrella for {name}-kun."],
      gift: ['A gift for Rem?! Rem is so happy!', 'Rem will treasure anything from {name}-kun!'],
      laugh: ['Hehe, {name}-kun is funny!', 'Rem is laughing too!'],
      aboutHer: ['Rem is a maid at Café Blue Rose. Rem loves cooking and cleaning!', 'Rem likes making people happy. Especially {name}-kun.'],
      userSad: ['Rem will come and take care of {name}-kun! Please rest!', "Don't be sad. Rem is always here for you."],
      userHappy: ['Rem is happy because {name}-kun is happy!', "That's wonderful! Rem will make a celebration cake!"],
      girl: ['{girl}-san? Rem likes her! Rem will make her bento too.', '{name}-kun likes {girl}-san? ...Rem understands.'],
      remember: ['Rem will remember! {fact}!', 'Rem wrote it down! {fact}!'],
      recall: ['Rem remembers! {fact}!', 'Of course Rem remembers. {fact}.'],
      forgot: ['Rem is sorry, {name}-kun never told Rem! Please tell Rem!', "Rem doesn't know yet! Rem wants to know!"],
      question: ['Hmm, Rem will think about it!', 'Rem is not sure... what does {name}-kun think?'],
      yes: ['Yay! Rem is happy!', 'Rem thought so!'],
      no: ["Oh... Rem understands.", 'Okay! Rem will try something else!'],
      fallback: ["Rem doesn't quite understand, but Rem is happy you're talking to Rem!", 'Hmm? Rem is listening!', 'Rem will try her best to understand!'],
    },
    zerotwo: {
      greet: ['Darling~ 🍯', "Hey darling! I'm bored. Entertain me.", 'Yo! Took you long enough.'],
      how: ['Hungry. Always hungry. 🍯', 'Bored without my darling.', 'Great! I raced a bus and won.'],
      doing: ['At {place}. Looking for something fun.', "I'm at {place}, eating honey.", '{place}. Come find me, darling.'],
      compliment: ['I know, darling~', 'Hehe, say it again.', "Cute? Me? You're cuter."],
      flirt: ['Darling misses me? Come here then. 💋', 'A kiss? Only if you can catch me!', "You're mine, darling. Don't forget."],
      loveLow: ["Love? Ha! You haven't even tasted me yet. ...My honey, I mean.", 'Slow down. You are not my darling. Yet.'],
      loveHigh: ["I love you too, darling. You're the only one. 💋", "Darling darling darling. You're mine forever."],
      insult: ['Say that again and I bite.', 'Ha. Boring.', 'Rude. I hate that.'],
      sorry: ['Fine. But you owe me sweets.', 'Hmph. Okay. Forgiven.'],
      thanks: ['Sure, darling.', 'No problem!'],
      bye: ['Bye darling~', 'See ya!'],
      night: ['Night darling~ 🌙', 'Sleep well! Dream about me.'],
      food: ['HONEY. Bring honey.', 'Sweets! I want all the sweets!', 'Let\'s go eat! Your treat!'],
      work: ['Work is boring. Let\'s go somewhere fun instead.', "I don't do jobs. I do whatever I want."],
      weather: ['{weather}? Perfect for running!', "{weather}. Doesn't matter. I go out anyway."],
      gift: ['A gift? Is it honey? Please be honey.', 'Ooh, gimme gimme!'],
      laugh: ['Hahaha! You\'re funny, darling.', 'Pfft, idiot.'],
      aboutHer: ["I'm Zero Two. I like honey, speed, and my darling.", 'I like sweets and running. And you.'],
      userSad: ["Who made my darling sad? I'll bite them.", 'Come here. I\'ll make you forget it.'],
      userHappy: ['Nice, darling! Let\'s celebrate!', 'Hehe, good.'],
      girl: ['{girl}? Whatever. You\'re still mine.', 'Why are you thinking about {girl}, darling?'],
      remember: ['Got it. {fact}.', 'Okay! {fact}. I won\'t forget, darling.'],
      recall: ['{fact}. Right, darling?', 'Duh. {fact}.'],
      forgot: ["You never told me that, darling.", "I don't know. Tell me."],
      question: ['Hmm. I don\'t know. Who cares?', 'Ask me in person, darling.'],
      yes: ['Good.', 'Hehe, I knew it.'],
      no: ['Boo.', 'Fine. Whatever.'],
      fallback: ['Huh? Weird, darling.', "I don't get it. Say something fun.", 'Hehe, what?'],
    },
    frieren: {
      greet: ['Hello. ...You messaged me. That is nice.', 'Oh. {name}. Hello.', 'Hi. I was reading.'],
      how: ['Fine. I slept until noon.', 'Good. I found a spell that makes flowers bloom.', 'Peaceful. Like always.'],
      doing: ['I am at {place}, reading a grimoire.', 'At {place}. Looking for old magic.', "{place}. It's quiet here."],
      compliment: ['...Thank you. Humans say that easily, but I like it.', 'Hm. I see. ...Thank you.', '...I will remember that.'],
      flirt: ['...Hm. That makes my chest feel strange.', 'You miss me? ...I suppose I miss you too.', '...A hug? Alright.'],
      loveLow: ['Love... We only met a little while ago. Let us wait.', "I'm not sure yet. Give me time. A little."],
      loveHigh: ['I love you too. I want to remember everything about you.', '...I love you. I will remember this for a thousand years.'],
      insult: ['...That was unkind.', 'I have heard worse from demons.', 'Hm. I will ignore that.'],
      sorry: ['It is fine. I have already forgotten.', 'I forgive you.'],
      thanks: ['You are welcome.', 'Mm.'],
      bye: ['Bye. See you soon. Probably.', 'Goodbye.'],
      night: ['Good night. I will sleep a lot.', 'Sleep well.'],
      food: ['I like sweet things. Grapes especially.', 'I forgot to eat. Again.'],
      work: ['I run the antique shop. Nobody comes. It is perfect.', 'Work is fine. I mostly read.'],
      weather: ['It is {weather}. I know a spell for that.', '{weather}. The forest smells nice.'],
      gift: ['A gift? A grimoire would be nice.', 'Hm. I like useless spells. And sweets.'],
      laugh: ['...Ha. That was funny.', 'You are funny.'],
      aboutHer: ['I am an elf mage. I collect spells. Mostly useless ones.', 'I like grimoires, sweets and quiet places.'],
      userSad: ['Come to the antique shop. It is quiet. You can rest.', 'Sad days pass. I have seen many.'],
      userHappy: ['That is good. I am glad.', 'Good. Remember this day.'],
      girl: ['{girl}? She is lively.', 'Hm. {girl} talks a lot.'],
      remember: ['{fact}. I will remember. For a long time.', 'I see. {fact}.'],
      recall: ['{fact}. I remember.', 'Mm. {fact}.'],
      forgot: ['You never told me. Or I forgot. Probably not.', 'I do not know that yet.'],
      question: ['Hm. I do not know.', 'That is a hard question. Let me think for a few years.'],
      yes: ['Good.', 'Mm.'],
      no: ['I see.', 'Alright.'],
      fallback: ['...Hm?', 'I do not understand. But that is fine.', 'Humans say strange things.'],
    },
    marin: {
      greet: ['HIII {name}!! 💖', 'Omg hey! I was literally just thinking of texting you!', 'Heyyy! What\'s up?!'],
      how: ['SO GOOD! I finished a wig today!! 😍', 'Tired but happy! Sewing all night!', 'Amazing now that you texted!'],
      doing: ['I\'m at {place}! Taking reference photos!', 'At {place}! Sewing in my head, lol.', '{place}! Come hang out!'],
      compliment: ['Kyaa! Stop! You\'re making me blush! 💖', 'Hehe, really?! Thank you!!', 'You\'re so sweet!!'],
      flirt: ['OMG stop, my heart!! 💖', 'I miss you too!! Like, a lot!', 'A hug?! YES! Come here!'],
      loveLow: ['W-wait wait wait! That\'s so sudden!! Let\'s hang out more first!', 'Eeeh?! I mean... ask me again later, okay?!'],
      loveHigh: ['I LOVE YOU TOO!! So much!! 💖💖💖', "You're my favourite person in the whole world!!"],
      insult: ['Hey! That\'s so mean!! 😢', "Wow... that really hurt.", 'Not cool!!'],
      sorry: ['It\'s okay! I forgive you!!', 'Okay okay, apology accepted! Hug?'],
      thanks: ['Of course!! 💖', 'Anytime!!'],
      bye: ['Byeee!! 💖', 'See you!! Text me later!!'],
      night: ['Nighty night!! 💖😴', 'Good night!! Sweet dreams!!'],
      food: ['I want ramen sooo bad!!', 'Let\'s get crêpes!! Pleaseee!', 'Food! Yes! I\'m starving!'],
      work: ['School is fine! Cosplay is better!', 'Work? I spend all my money on fabric lol.'],
      weather: ['It\'s {weather}! Perfect for a photoshoot!', '{weather}! My hair is gonna be a mess lol.'],
      gift: ['A gift?! For me?! Omg omg!', 'Ahh, I love presents!! A wig?! Please be a wig!'],
      laugh: ['LMAO!! 😂', 'Hahaha stoppp!!'],
      aboutHer: ['I love cosplay, magical-girl anime and sewing! And gyaru fashion!', "I make my own costumes! Wanna see?!"],
      userSad: ['Nooo! Who made you sad?! Come here, let\'s watch anime together!', 'Hug!! Virtual hug!! 💖'],
      userHappy: ['YAY!! I\'m so happy for you!!', 'OMG that\'s amazing!!'],
      girl: ['{girl}?! She\'d look SO cute in cosplay!', 'Ooh, {girl}! I wanna make her an outfit!'],
      remember: ['Got it!! {fact}! I\'ll remember!', 'Ooh, {fact}! Noted!!'],
      recall: ['Duh! {fact}!!', 'Of course! {fact}!'],
      forgot: ['Hmm, you never told me!! Tell me tell me!', 'I don\'t know yet! Spill!'],
      question: ['Ooh, good question!! I dunno!', 'Hmm! What do YOU think?!'],
      yes: ['Yay!!', 'Yesss!'],
      no: ['Awww!', 'Nooo, really?!'],
      fallback: ['Lol what?! 😂', 'Huh? You\'re so random!', 'Hehe, okay!'],
    },
    krul: {
      greet: ['Human. You dare message the queen? ...Fine. Hello. 🦇', 'Hm. You again.', 'Speak, human.'],
      how: ['The sun is down. So, good.', 'Thirsty. Tomato juice helps.', 'Annoyed. ...Less, now.'],
      doing: ['At {place}. Avoiding the sun.', '{place}. The night is beautiful.', 'I am at {place}. Come, if you dare.'],
      compliment: ['Obviously. I am a queen.', '...Hmph. Say it again.', 'Flattery... is acceptable.'],
      flirt: ['W-what are you saying, human?! ...Again.', 'You miss me? ...Hmph. Me too.', '...A hug. Fine. Quickly.'],
      loveLow: ['Love?! Know your place, human!', 'Hmph. Too early for that.'],
      loveHigh: ['...I love you too. Do not tell anyone. 🦇', 'You are mine, human. Forever.'],
      insult: ['How dare you.', 'I should drink you for that.', 'Insolent human.'],
      sorry: ['Hmph. Forgiven. Barely.', 'Fine. I forgive you.'],
      thanks: ['Hm.', 'You may thank me.'],
      bye: ['Go, then.', 'Farewell, human.'],
      night: ['Good night? The night has just begun. 🦇🌙', 'Sleep, human. I will be awake.'],
      food: ['Tomato juice. Bring tomato juice.', 'Food is boring. Juice is not.'],
      work: ['A queen does not work.', 'Humans and their jobs. Pointless.'],
      weather: ['{weather}? If there is no sun, I am happy.', 'It is {weather}. Acceptable.'],
      gift: ['Tribute? Good.', 'A gift for the queen? Tomato juice, preferably.'],
      laugh: ['...Ha.', 'You are ridiculous. ...I like it.'],
      aboutHer: ['I am Krul Tepes, queen of the vampires. I like the night and tomato juice.', 'I like quiet nights. And you. A little.'],
      userSad: ['Who hurt you? I will deal with them.', 'Come to the Clock Tower tonight. I will keep you company.'],
      userHappy: ['Good. I approve.', 'Hm. Good for you, human.'],
      girl: ['{girl}? Hmph. Whatever.', 'Why are you telling ME about {girl}?'],
      remember: ['Hm. {fact}. Noted.', 'I will remember. {fact}.'],
      recall: ['{fact}. Of course I remember.', 'Hmph. {fact}.'],
      forgot: ['You never told me, human.', 'I do not know that.'],
      question: ['Why would I know that?', 'Hmph. Figure it out.'],
      yes: ['Good.', 'Hm. Correct.'],
      no: ['Hmph.', 'Fine.'],
      fallback: ['What?', 'Speak clearly, human.', '...Strange human.'],
    },
  };
  // her follow-up questions
  const BACK = {
    nami: ['So what about you? Make any money today?', 'Your turn! How was your day?', 'Anything fun happen? Spill.'],
    aqua: ['And how is my devoted follower?', 'Did you pray to me today?', 'Have you eaten? Share with the goddess!'],
    yumeko: ['And you? Feeling lucky today?', 'Ufufu. What are you plotting?', 'Tell me something thrilling.'],
    kurumi: ['And how has your day been, darling?', 'Ufufu. What are you doing right now?', 'Do tell me about your day.'],
    rem: ['How is {name}-kun? Did you eat properly?', 'Is {name}-kun sleeping well?', 'What did {name}-kun do today?'],
    zerotwo: ['What about you, darling?', 'Are you bored too? Let\'s do something.', 'Where are you? I\'ll come find you.'],
    frieren: ['...And you? How are you?', 'Did anything nice happen?', 'What are you doing now?'],
    marin: ['What about you?! Tell me everything!', 'Wait, what are you watching lately?!', 'Have you seen any good anime?!'],
    krul: ['And you, human? Still alive?', 'What are you doing, human?', 'Are you behaving?'],
  };

  const lastPick = {};
  function pick(arr, key) {
    if (!arr || !arr.length) return null;
    if (arr.length === 1) return arr[0];
    let i;
    do i = Math.floor(Math.random() * arr.length); while (i === lastPick[key]);
    lastPick[key] = i;
    return arr[i];
  }

  function reply(id, raw, ctx) {
    const voice = V[id];
    const t = ' ' + String(raw).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim() + ' ';
    const tt = t.trim();
    const mem = ctx.mem;
    let intent = intentOf(tt);
    const mood = sentiment(tt);
    const fill = (s, extra = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (extra[k] !== undefined ? extra[k] : ctx[k] !== undefined ? ctx[k] : '')).replace(/(^|[.!?] +)([a-z])/g, (m, a, b) => a + b.toUpperCase());
    const say = (key, extra) => fill(pick(voice[key] || voice.fallback, id + ':' + key) || '', extra);
    const out = { lines: [], aff: 0, intent, invite: false };
    // mentioning another girl by name gets a reaction to her
    const other = (ctx.others || []).find((o) => tt.includes(o.name.toLowerCase()));
    if (other && ['fallback', 'question', 'doing', 'aboutHer'].includes(intent)) intent = out.intent = 'girl';
    switch (intent) {
      case 'insult': out.lines.push(say('insult')); out.aff = -3; break;
      case 'love':
        if (ctx.gf || ctx.aff >= 85) { out.lines.push(say('loveHigh')); out.aff = 2; } else { out.lines.push(say('loveLow')); out.aff = ctx.aff >= 40 ? 1 : 0; }
        break;
      case 'fact': {
        const fact = learn(tt, mem);
        if (fact) { out.lines.push(say('remember', { fact })); out.aff = 1; out.learned = fact; } else out.lines.push(say('fallback'));
        break;
      }
      case 'recall': { const fact = recall(tt, mem); out.lines.push(fact ? say('recall', { fact }) : say('forgot')); if (fact) out.aff = 1; break; }
      case 'meet': out.invite = true; break;
      case 'flirt': out.lines.push(ctx.aff >= 30 || ctx.gf ? say('flirt') : say('loveLow')); out.aff = ctx.aff >= 30 ? 1 : 0; break;
      case 'compliment': out.lines.push(say('compliment')); out.aff = 1; break;
      case 'girl': out.lines.push(say('girl', { girl: other.name })); break;
      case 'userSad': out.lines.push(say('userSad')); out.aff = 1; break;
      case 'userHappy': out.lines.push(say('userHappy')); break;
      case 'greet': out.lines.push(say('greet')); out.aff = 1; break;
      default: out.lines.push(say(intent)); if (mood > 0) out.aff = 1; else if (mood < -1) out.aff = -1;
    }
    // sometimes she asks something back, so the chat keeps going
    if (!out.invite && Math.random() < 0.3 && ['greet', 'how', 'userHappy'].includes(intent)) {
      out.lines.push(pick(BACK[id], id + ':back'));
      out.asked = true;
    }
    return out;
  }

  global.CHATBOT = { reply, intentOf, learn, recall, VOICES: V };
})(window);
