// Game content: locations, items, and every girl's schedule, dialogue and route.
// Dialogue lines are [expression, text]. Expression 'n' = narration, 'p' = player.
// {name} is replaced with the player's name.
(function (global) {
  'use strict';

  const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const STAGES = [
    { min: 0, label: 'Acquaintance' },
    { min: 20, label: 'Friend' },
    { min: 45, label: 'Good Friend' },
    { min: 65, label: 'Close Friend' },
    { min: 90, label: 'In Love' },
  ];

  // Affection can't grow past these caps until you've been on enough dates.
  const CAPS = [
    { dates: 0, cap: 45 },
    { dates: 1, cap: 75 },
    { dates: 3, cap: 100 },
  ];

  // Places. open/close are minutes after midnight (26:00 = 2am).
  const LOCATIONS = {
    home: { name: 'Your House', icon: '🏠', desc: 'Small, cozy, and all yours.', open: 0, close: 1560 },
    cafe: { name: 'Café Lumière', icon: '☕', desc: 'The smell of fresh coffee and cake.', open: 420, close: 1260 },
    school: { name: 'Academy Library', icon: '📚', desc: 'Quiet shelves full of old books.', open: 420, close: 1080, weekdaysOnly: true },
    mall: { name: 'Gift Shop', icon: '🛍️', desc: 'Gifts, clothes and a little boutique.', open: 540, close: 1260 },
    arcade: { name: 'Star Arcade', icon: '🕹️', desc: 'Blinking lights and electronic jingles.', open: 600, close: 1560 },
    dojo: { name: 'Shirogane Dojo', icon: '🥋', desc: 'The air smells of polished wood.', open: 360, close: 1260 },
    park: { name: 'Sakura Park', icon: '🌸', desc: 'Cherry blossoms drift on the breeze.', outdoor: true },
    beach: { name: 'Seaside Beach', icon: '🏖️', desc: 'Waves, sand and seagulls.', outdoor: true },
    shrine: { name: 'Mizu Shrine', icon: '⛩️', desc: 'A peaceful shrine on the hill.', outdoor: true },
    plaza: { name: 'Town Plaza', icon: '⛲', desc: 'The fountain at the heart of town.', outdoor: true },
    maidcafe: { name: 'Café Blue Rose', icon: '🎀', desc: 'A maid café with the best omurice in town.', open: 480, close: 1260 },
    bakery: { name: 'Honey Bakery', icon: '🍯', desc: 'Warm bread, honey toast and a cooking class.', open: 420, close: 1140 },
    antiques: { name: 'Grimoire Antiques', icon: '📗', desc: 'Old books, odd trinkets and the occasional spell.', open: 600, close: 1200 },
    clocktower: { name: 'Clock Tower', icon: '🕰️', desc: 'Huge brass gears tick slowly overhead.', open: 540, close: 1380 },
    onsen: { name: 'Sakura Onsen', icon: '♨️', desc: 'A steaming hot spring bathhouse.', open: 600, close: 1500 },
    flowers: { name: 'Flower Field', icon: '🌼', desc: 'A rolling meadow of wildflowers and a windmill.', outdoor: true },
    cape: { name: 'Lighthouse Cape', icon: '🗼', desc: 'A windy cape with an old lighthouse.', outdoor: true },
    lake: { name: 'Forest Lake', icon: '🌲', desc: 'A quiet lake hidden among the pines.', outdoor: true },
    station: { name: 'Sakuragaoka Station', icon: '🚉', desc: 'Trains to Hoshimachi City until 1am.', open: 360, close: 1500 },
    city: { name: 'Hoshimachi City', icon: '🏙️', desc: 'The big city, one train ride away.', outdoor: true },
    mcronalds: { name: "McRonald's", icon: '🍔', desc: 'Burgers, fries and shakes. Open late.', open: 360, close: 1560 },
    kitsune: { name: 'Kentucky Fried Kitsune', icon: '🍗', desc: "The Colonel Fox's secret recipe.", open: 600, close: 1380 },
    sushi: { name: 'Kura-Kura Sushi', icon: '🍣', desc: 'Conveyor-belt sushi, ¥ per plate.', open: 660, close: 1320 },
    megamall: { name: 'Hoshimachi Megamall', icon: '🛍️', desc: 'Fashion, gifts and a purikura booth.', open: 600, close: 1260 },
    casino: { name: 'Lucky Seven Casino', icon: '🎰', desc: 'Slots, blackjack and a very lucky regular. Open 4pm to 2am.', open: 960, close: 1560 },
    fancy: { name: 'Le Ciel Étoilé', icon: '🕯️', desc: 'Candlelit French dining. Dinner from 5pm.', open: 1020, close: 1440 },
  };

  // Activities. energy = cost, money = yen cost (negative = earned),
  // mins = how long it takes, gain = stat changes.
  const ACTIVITIES = {
    home: [
      { id: 'sleep', label: 'Go to bed', icon: '😴' },
      { id: 'rest', label: 'Take a nap', icon: '🛋️', energy: -35, mins: 120, note: '+35 energy' },
      { id: 'homestudy', label: 'Study at your desk', icon: '✏️', energy: 15, mins: 120, gain: { smarts: 2 } },
      { id: 'cook', label: 'Cook a meal', icon: '🍳', energy: -25, mins: 45, note: '+25 energy' },
      { id: 'shower', label: 'Take a shower', icon: '🚿', energy: -10, mins: 20, daily: true, gain: { charm: 1 }, note: '+10 energy' },
      { id: 'homebath', label: 'Have a hot bath', icon: '🛁', energy: -30, mins: 60, daily: true, note: '+30 energy' },
      { id: 'wfh', label: 'Work from home (freelance)', icon: '💻', energy: 20, mins: 180, note: '+¥40 + Smarts bonus' },
    ],
    cafe: [
      { id: 'work', label: 'Work a shift', icon: '🧾', energy: 25, money: -60, mins: 180, note: '+¥60' },
      { id: 'coffee', label: 'Buy a coffee', icon: '☕', energy: -15, money: 8, note: '+15 energy' },
    ],
    school: [
      { id: 'study', label: 'Study in the library', icon: '📖', energy: 20, mins: 120, gain: { smarts: 3 } },
    ],
    mall: [
      { id: 'shop', label: 'Browse gifts', icon: '🎁' },
      { id: 'boutique', label: 'Boutique makeover', icon: '👗', energy: 10, money: 50, mins: 60, gain: { charm: 4 } },
    ],
    arcade: [
      { id: 'claw', label: 'Claw machine', icon: '🧸', money: 15 },
      { id: 'rhythm', label: 'Play rhythm games', icon: '🎵', energy: 15, money: 10, mins: 60, gain: { charm: 2, fitness: 1 } },
      { id: 'puzzle', label: 'Play puzzle games', icon: '🧩', energy: 10, money: 10, mins: 60, gain: { smarts: 2 } },
    ],
    dojo: [
      { id: 'train', label: 'Train with a bokken', icon: '🗡️', energy: 30, mins: 120, gain: { fitness: 4 } },
    ],
    maidcafe: [
      { id: 'omurice', label: 'Order omurice', icon: '🍳', money: 15, energy: -25, mins: 30, note: '+25 energy' },
      { id: 'serve', label: 'Help out as a waiter', icon: '🧾', energy: 25, money: -70, mins: 180, note: '+¥70' },
    ],
    bakery: [
      { id: 'honeytoast', label: 'Eat honey toast', icon: '🍞', money: 12, energy: -20, mins: 20, note: '+20 energy' },
      { id: 'bakeclass', label: 'Join the baking class', icon: '🧁', money: 20, energy: 15, mins: 60, gain: { charm: 2, smarts: 1 } },
      { id: 'bakeryshop', label: 'Buy sweets to gift', icon: '🍯' },
    ],
    antiques: [
      { id: 'readmagic', label: 'Read an old grimoire', icon: '📖', energy: 15, mins: 120, gain: { smarts: 3 } },
      { id: 'antiqueshop', label: 'Browse the antiques', icon: '⌚' },
    ],
    clocktower: [
      { id: 'tinker', label: 'Tinker with the gears', icon: '⚙️', energy: 15, mins: 60, gain: { smarts: 2 } },
      { id: 'clockview', label: 'Look out of the clock face', icon: '🌆', energy: -5, mins: 30, gain: { charm: 1 } },
    ],
    onsen: [
      { id: 'soak', label: 'Soak in the hot spring', icon: '♨️', money: 10, energy: -40, mins: 60, note: '+40 energy' },
      { id: 'milk', label: 'Drink a coffee milk', icon: '🥛', money: 5, energy: -10, note: '+10 energy' },
      { id: 'massage', label: 'Use the massage chair', icon: '💺', money: 8, energy: -15, mins: 30, gain: { fitness: 1 }, note: '+15 energy' },
    ],
    // outdoor activities, triggered by props in the world
    outdoor: {
      jog: { id: 'jog', label: 'Jog the park course', energy: 20, mins: 60, gain: { fitness: 2, charm: 1 } },
      bench: { id: 'bench', label: 'Sit on the bench', energy: -10, mins: 30, note: '+10 energy' },
      stars: { id: 'stars', label: 'Stargaze', energy: 5, mins: 60, gain: { charm: 2 } },
      swim: { id: 'swim', label: 'Swim in the sea', energy: 25, mins: 60, gain: { fitness: 3 } },
      sunbathe: { id: 'sunbathe', label: 'Relax in the sun', energy: -10, mins: 60, gain: { charm: 1 } },
      offer: { id: 'offer', label: 'Make an offering', money: 10, daily: true, note: '+1 Charm' },
      fortune: { id: 'fortune', label: 'Draw a fortune', money: 5, daily: true },
      vending: { id: 'vending', label: 'Buy a Fancy Soda', money: 10 },
      flowerpick: { id: 'flowerpick', label: 'Pick wildflowers', energy: 5, mins: 30, daily: true, note: 'free bouquet' },
      fish: { id: 'fish', label: 'Sit by the lake', energy: -10, mins: 60, gain: { smarts: 1 }, note: '+10 energy' },
      lighthouse: { id: 'lighthouse', label: 'Watch the sea from the cape', energy: 5, mins: 60, gain: { charm: 2 } },
    },
  };

  const ITEMS = {
    flowers: { name: 'Flower Bouquet', icon: '💐', price: 30 },
    chocolate: { name: 'Box of Chocolates', icon: '🍫', price: 20 },
    tangerines: { name: 'Bag of Tangerines', icon: '🍊', price: 15 },
    soda: { name: 'Fancy Soda', icon: '🥤', price: 10 },
    book: { name: 'Mystery Novel', icon: '📕', price: 25 },
    dice: { name: 'Lucky Dice Set', icon: '🎲', price: 25 },
    ribbon: { name: 'Silk Hair Ribbon', icon: '🎀', price: 20 },
    crepe: { name: 'Strawberry Crepe', icon: '🍓', price: 18 },
    charm: { name: 'Kendo Charm', icon: '⚔️', price: 35 },
    plushie: { name: 'Cat Plushie', icon: '🐱', price: 0, special: 'Win it at the arcade!' },
    flowerpin: { name: 'Flower Hairpin', icon: '🌼', price: 22 },
    honey: { name: 'Jar of Honey', icon: '🍯', price: 15, shop: 'bakery' },
    clock: { name: 'Antique Pocket Watch', icon: '⌚', price: 45, shop: 'antiques' },
    grimoire: { name: 'Old Grimoire', icon: '📗', price: 40, shop: 'antiques' },
    perfume: { name: 'Designer Perfume', icon: '🌹', price: 80, shop: 'city' },
    bigplush: { name: 'Giant Teddy Bear', icon: '🧸', price: 90, shop: 'city' },
    handbag: { name: 'Designer Handbag', icon: '👜', price: 150, shop: 'city' },
    shades: { name: 'Cool Sunglasses', icon: '🕶️', price: 45, shop: 'city' },
    wig: { name: 'Cosplay Wig', icon: '💇', price: 35 },
    tomatojuice: { name: 'Tomato Juice', icon: '🍅', price: 12, shop: 'bakery' },
    toy: { name: "McRonald's Toy", icon: '🪀', price: 0, special: 'Comes with a kids\' meal in the city!' },
    lovepotion: { name: 'Love Potion', icon: '🧪', price: 120, shop: 'frieren', desc: 'Brewed by Frieren — buy it from her. Hearts leap past the usual date limits. Side effects: probably none.' },
  };

  const FORTUNES = [
    ['Great Blessing! Love is closer than you think.', { charm: 2 }],
    ['Blessing. Hard study will be rewarded.', { smarts: 2 }],
    ['Small Blessing. A brisk walk clears the mind.', { fitness: 1 }],
    ['Future Blessing. Patience, patience...', {}],
    ['Curse?! ...Tie it to the tree and try again tomorrow.', {}],
  ];

  const GIRLS = {
    // ------------------------------------------------------------------ NAMI
    nami: {
      name: 'Nami',
      full: 'Nami',
      color: '#f2913d',
      bio: 'Cheerful waitress at Café Lumière. Saving every yen to sail the world and draw her own maps.',
      stranger: 'the orange-haired waitress',
      schedule: {
        weekday: [[360, 'apartments'], [450, 'cafe'], [900, 'park'], [1080, 'mall'], [1260, 'apartments']],
        weekend: [[360, 'apartments'], [480, 'park'], [660, 'beach'], [1020, 'mall'], [1200, 'plaza'], [1320, 'apartments']],
      },
      req: { charm: 35 },
      reqText: 'Charm 35',
      gifts: { tangerines: 'loved', ribbon: 'loved', flowers: 'liked', crepe: 'liked', dice: 'disliked', handbag: 'loved', perfume: 'liked', shades: 'liked', toy: 'disliked' },
      dates: { beach: 'loved', mall: 'loved', cafe: 'ok', park: 'ok', shrine: 'ok', arcade: 'meh' },
      intro: [
        ['n', 'An orange-haired girl bounces over, notepad in hand.'],
        ['happy', "Hi hi! You're new around here, aren't you? I know every face in this town."],
        ['smile', "I'm Nami! I work at Café Lumière. Come by and spend lots of money, okay?"],
        ['p', "I'm {name}. Nice to meet you."],
        ['happy', '{name}, huh? Cute name! See you around~'],
      ],
      topics: [
        { min: 0, q: [['smile', 'So, new face! What brings you to Sakuragaoka?']], opts: [
          { t: 'Honestly? The cheap rent.', v: 6, r: [['happy', "Ha! A person after my own heart. Cheap is beautiful."]] },
          { t: 'I wanted a fresh start.', v: 4, r: [['smile', "A fresh start, huh? This town's good for those."]] },
          { t: 'My family made me move.', v: 1, r: [['sad', "Aww, that's rough. Well, make the best of it!"]] },
        ] },
        { min: 0, q: [['neutral', 'If you could go anywhere in the world, where would you go?']], opts: [
          { t: 'Somewhere with an endless ocean.', v: 6, r: [['happy', "Right?! I want to sail along every coast and draw the maps myself!"]] },
          { t: 'Wherever the food is cheapest.', v: 3, r: [['smile', 'Practical! I respect that.']] },
          { t: "Nowhere. I like staying home.", v: -3, r: [['sad', "Eh... that's kinda boring, don't you think?"]] },
        ] },
        { min: 0, q: [['sad', "Ugh, a customer just tried to pay me in 'exposure'. Can you believe it?"]], opts: [
          { t: 'Charge them double next time.', v: 6, r: [['happy', 'Ha! Now you\'re speaking my language.']] },
          { t: "That sounds awful. You okay?", v: 4, r: [['blush', "I'm fine! ...But thanks for asking."]] },
          { t: 'Exposure is valuable, though.', v: -4, r: [['sad', "...Exposure doesn't pay rent, {name}."]] },
        ] },
        { min: 20, q: [['blush', "Can I tell you a secret? I'm saving up to travel the world. My jar at home is almost full!"]], opts: [
          { t: "That's amazing. You'll make it.", v: 6, r: [['love', '...You really think so? Most people just laugh.']] },
          { t: 'How much is in there?', v: 2, r: [['smug', 'Nice try! A lady never reveals her savings.']] },
          { t: "Wouldn't it be easier to stay here?", v: -4, r: [['sad', "...Easier, sure. That's not the point."]] },
        ] },
        { min: 20, q: [['smile', 'My grandma has a tangerine orchard by the sea. Tangerines are basically my soul food.']], opts: [
          { t: "I'd love to visit it someday.", v: 6, r: [['blush', "M-maybe I'll take you. If you behave!"]] },
          { t: 'Is that why your hair is orange?', v: 3, r: [['happy', "Hahaha! Maybe! You're so weird, {name}."]] },
          { t: 'I prefer apples.', v: -2, r: [['sad', 'Traitor.']] },
        ] },
        { min: 45, q: [['sad', "There's a storm coming tonight... I hate thunder. Don't laugh!"]], opts: [
          { t: "I won't. Want me to text you through it?", v: 7, r: [['blush', "...You'd do that? Okay. Don't fall asleep first."]] },
          { t: "I'll protect you from the sky.", v: 4, r: [['happy', 'Pfft, my hero. ...Thanks, though.']] },
          { t: "Thunder's just noise.", v: -2, r: [['sad', 'Easy for you to say...']] },
        ] },
        { min: 45, q: [['neutral', 'Be honest. Do I talk about money too much?']], opts: [
          { t: "A little. But it's part of your charm.", v: 6, r: [['love', "Part of my charm, huh? I'll take it!"]] },
          { t: "Money matters. You're smart about it.", v: 4, r: [['smile', "See? Someone gets it."]] },
          { t: 'Way too much.', v: -3, r: [['sad', 'Wow. Okay. ...Rude.']] },
        ] },
        { min: 65, q: [['blush', 'When I finally leave on my big trip... would you miss me?']], opts: [
          { t: "Every day. Maybe I'd come with you.", v: 8, r: [['blush', "...D-don't say things like that so easily. I might believe you."]] },
          { t: "I'd wait for your postcards.", v: 4, r: [['happy', "I'll send you a hundred! Postage is expensive, though..."]] },
          { t: 'Sure, I guess.', v: -2, r: [['sad', '"Sure, I guess"? That\'s all I get?']] },
        ] },
      ],
      small: [
        ['happy', "Today's special is tangerine tart! ...I may have suggested it."],
        ['smile', 'A regular left a huge tip today. Best. Day. Ever.'],
        ['smile', 'You look tired. Want me to sneak you an extra cookie? Just this once!'],
        ['neutral', "I found a shortcut behind the shopping street. It's going on my map."],
        ['happy', "Did you know the sea here glows blue at night sometimes? I'll show you someday!"],
      ],
      giftLines: {
        loved: [['love', 'No way! For me?! You totally get me, {name}!']],
        liked: [['happy', "Aww, thank you! That's really sweet."]],
        neutral: [['smile', 'Oh, thanks! I can probably resell— I mean, use this!']],
        disliked: [['sad', "Uh... thanks? I'm not really sure what to do with this."]],
      },
      dateLines: {
        beach: ['love', "The ocean! Look how far it goes... someday I'll sail past that horizon."],
        mall: ['happy', "Window shopping is free! Ooh, look at that map shop!"],
        cafe: ['smile', "Being a customer at my own café is weird. Fun weird, though!"],
        park: ['smile', 'The blossoms are pretty this time of year. Good choice.'],
        shrine: ['neutral', "I'll pray for good sailing weather. And maybe for... never mind!"],
        arcade: ['sad', "These machines eat money so fast... my wallet is crying."],
      },
      moments: [
        { q: [['blush', 'Hey, {name}... why did you ask me out today?']], opts: [
          { t: 'I wanted to see you smile.', v: 6, r: [['love', "...Well, mission accomplished. Jerk."]] },
          { t: 'You looked like you needed a break.', v: 4, r: [['smile', "You noticed? ...Thanks."]] },
          { t: 'I was bored.', v: -3, r: [['sad', "Wow. Glad I could help with that."]] },
        ] },
        { q: [['smile', "Quick! If we got lost right now, which way would you go?"]], opts: [
          { t: "I'd follow you. You're the navigator.", v: 6, r: [['happy', "Correct answer! Navigator Nami will never steer you wrong!"]] },
          { t: "Toward the sea. It's always south here.", v: 5, r: [['surprised', "Ooh, you've been paying attention!"]] },
          { t: "I'd check my phone.", v: 0, r: [['neutral', "Boo. Where's your sense of adventure?"]] },
        ] },
        { q: [['neutral', "Do you think it's silly? Wanting to leave a place you love?"]], opts: [
          { t: 'Loving somewhere is why you can leave it.', v: 7, r: [['blush', "...Because you know you can come back. Yeah."]] },
          { t: 'A little silly. But brave.', v: 4, r: [['smile', "Silly and brave. That's me!"]] },
          { t: 'Then just stay.', v: -2, r: [['sad', "...You don't get it."]] },
        ] },
      ],
      events: [
        { title: "Nami's Map", lines: [
          ['n', 'Nami pulls a folded, well-worn sheet of paper from her apron.'],
          ['blush', "Don't laugh, okay? This is my map of Sakuragaoka. I add something every time I find a place I love."],
          ['smile', 'The café, the bakery with the grumpy cat, the hill where you can see the whole sea...'],
          ['blush', "...And this little star? That's where we first talked."],
        ], opts: [
          { t: "You marked it? That makes me really happy.", v: 6, r: [['love', "Well, it's an important landmark! Don't let it go to your head."]] },
          { t: "You're really talented, Nami.", v: 5, r: [['happy', "Ehehe... nobody's ever said that before."]] },
          { t: 'Can I draw something on it?', v: 3, r: [['surprised', "Sure, draw a— hey! That's the worst cat I've ever seen!"], ['happy', 'Pfft... ahaha! Okay, it stays. Forever.']] },
        ] },
        { title: 'The Storm', lines: [
          ['n', 'Rain hammers the windows. Thunder rolls somewhere over the sea. Nami sits very still.'],
          ['sad', "My mom was a sailor. She used to send me postcards from everywhere... Then one day, they just stopped."],
          ['sad', "I want to see all those places. But I'm scared. What if I become someone who leaves and never comes back?"],
        ], opts: [
          { t: "I'll be the place you come back to.", v: 8, r: [['blush', "...You can't just SAY things like that, {name}."], ['love', "...But okay. I'll hold you to it."]] },
          { t: 'You can travel and still have a home.', v: 7, r: [['smile', "A home to come back to... I think I'd like that."]] },
          { t: "Maybe you shouldn't go, then.", v: 0, r: [['sad', "...Maybe. I don't know."]] },
        ] },
      ],
      confess: {
        ask: [['p', "Nami... there's something I've been wanting to tell you. I like you. A lot."]],
        yes: [
          ['surprised', '...!'],
          ['blush', "Finally! I was starting to think I'd have to charge you for all this time."],
          ['love', "I like you too, {name}. More than tangerines. ...Okay, the same as tangerines. That's a LOT, okay?!"],
          ['happy', "So... wanna be my co-navigator? For real this time?"],
        ],
        no: [
          ['blush', "I... you're really sweet, {name}."],
          ['sad', "But I don't think you're quite ready yet. Shine a little brighter for me, okay? Then ask again."],
        ],
      },
      gfLines: [
        ['love', "My co-navigator! I drew you on my map again today. You're a little heart now."],
        ['happy', "I calculated it. Dating you is worth more than my whole savings jar. Don't tell anyone."],
        ['blush', "Grandma wants to meet you. She says anyone I talk about this much must be special."],
        ['love', "Next summer, let's take a boat to the islands. Just the two of us. I'll plan the route!"],
      ],
      ending: 'Nami marks a brand new heart on her map — right where you first said "I like you." One summer later, you two set sail together for the islands, her map in hand and your hand in hers.',
    },

    // --------------------------------------------------------------- AQUA
    aqua: {
      name: 'Aqua',
      full: 'Aqua',
      color: '#5ab4f0',
      bio: 'Shrine maiden of the Mizu Shrine who insists she is the water goddess herself. Dramatic, prideful, and secretly very kind.',
      stranger: 'the blue-haired shrine maiden',
      schedule: {
        weekday: [[360, 'shrine'], [960, 'plaza'], [1050, 'cafe'], [1260, 'shrinehall']],
        weekend: [[360, 'shrinehall'], [420, 'shrine'], [660, 'beach'], [960, 'plaza'], [1080, 'arcade'], [1320, 'shrinehall']],
      },
      req: { charm: 25, offerings: 5 },
      reqText: 'Charm 25 and 5 shrine offerings',
      gifts: { soda: 'loved', plushie: 'loved', flowers: 'liked', chocolate: 'liked', crepe: 'liked', book: 'disliked', toy: 'loved', bigplush: 'loved', shades: 'liked' },
      dates: { cafe: 'loved', beach: 'loved', arcade: 'ok', park: 'ok', mall: 'ok', shrine: 'meh' },
      intro: [
        ['n', 'A girl with impossibly long blue hair strikes a dramatic pose in front of you.'],
        ['smug', 'Halt, mortal! You stand before Aqua, goddess of water and divine guardian of this shrine!'],
        ['p', '...Goddess?'],
        ['sad', 'Yes! Goddess! Why does everyone make that face?!'],
        ['smile', 'Hmph. You may worship me. Offerings are appreciated. Fizzy drinks especially.'],
      ],
      topics: [
        { min: 0, q: [['smug', 'Mortal! Tell me truly: do you believe I am a real goddess?']], opts: [
          { t: 'Of course, Lady Aqua.', v: 6, r: [['happy', 'Finally! Someone with taste!']] },
          { t: "You're divine to me, at least.", v: 4, r: [['blush', 'O-of course I am! ...Ehehe.']] },
          { t: "You're a shrine maiden in a costume.", v: -3, r: [['sad', "Waaah! It's NOT a costume!"]] },
        ] },
        { min: 0, q: [['neutral', 'Riddle of the heavens: what is the most sacred beverage in the world?']], opts: [
          { t: 'Soda. Ice cold.', v: 6, r: [['happy', 'CORRECT! The fizz is a sign from the heavens!']] },
          { t: 'Water, obviously.', v: 3, r: [['smug', 'Flattering my element? Hmph, I\'ll allow it.']] },
          { t: 'Green tea.', v: 1, r: [['neutral', 'Respectable. Boring, but respectable.']] },
        ] },
        { min: 0, q: [['sad', "The shrine's goldfish ran away again! ...Okay, it can't run. But it's GONE."]], opts: [
          { t: "Let's look for it together.", v: 6, r: [['happy', "You'd help a goddess? You'll be SO blessed!"]] },
          { t: 'It probably ascended to fish heaven.', v: 2, r: [['surprised', "...Is that a thing? Is that a thing?!"]] },
          { t: 'Maybe a cat ate it.', v: -4, r: [['sad', 'WAAAAAH!']] },
        ] },
        { min: 20, q: [['blush', "I spent this month's whole shrine budget on fizzy drinks. Is that... bad?"]], opts: [
          { t: "Very bad. But I'll help you budget.", v: 6, r: [['blush', "...You're a strangely kind mortal, you know that?"]] },
          { t: 'No regrets! Live free!', v: 3, r: [['happy', "Yes! That's the spirit!"]] },
          { t: 'The head priest is going to be furious.', v: -2, r: [['sad', "Don't remind me!"]] },
        ] },
        { min: 20, q: [['sad', "Everyone in town calls me 'Silly Aqua'. Do you think I'm silly?"]], opts: [
          { t: "You're silly in the best way.", v: 6, r: [['love', "...That's the nicest insult anyone's ever given me."]] },
          { t: "No! You're dignified and serious.", v: 2, r: [['smug', 'Exactly! ...Wait. You\'re lying, aren\'t you?']] },
          { t: 'Kind of, yeah.', v: -3, r: [['sad', 'Why are mortals so cruel...']] },
        ] },
        { min: 45, q: [['neutral', "Why do you keep coming to see me? There are no miracles here, you know."]], opts: [
          { t: 'I come for you, not miracles.', v: 7, r: [['blush', "...! Th-that's... a very appropriate answer for a worshipper!"]] },
          { t: 'You ARE the miracle.', v: 5, r: [['happy', "D-don't overdo it! ...Say it again, though."]] },
          { t: 'The free fortunes.', v: -2, r: [['sad', "They're not free! There's a box! Use the box!"]] },
        ] },
        { min: 45, q: [['sad', "When I 'bless' people, I'm really just praying super hard for them. Is that cheating?"]], opts: [
          { t: "That's what a real goddess would do.", v: 6, r: [['love', "...You think so? Then I'll keep praying for everyone. Even you."]] },
          { t: 'Everyone needs someone praying for them.', v: 5, r: [['smile', 'Mm. That\'s true, isn\'t it?']] },
          { t: "Yeah, it's kind of a scam.", v: -4, r: [['sad', "I KNEW you'd say that!"]] },
        ] },
        { min: 65, q: [['blush', "If... if I wasn't a goddess. If I was just Aqua. Would you still visit me?"]], opts: [
          { t: "Just Aqua is who I like.", v: 8, r: [['blush', "...You can't say that to a goddess. My divine heart can't take it."]] },
          { t: "You'll always be a goddess to me.", v: 4, r: [['happy', "Hehe. Good answer, worshipper."]] },
          { t: 'Depends on the snacks.', v: -2, r: [['sad', 'Unbelievable!']] },
        ] },
      ],
      small: [
        ['smug', 'Today I blessed three tourists and a very confused pigeon. Divine work is exhausting.'],
        ['happy', 'The vending machine gave me TWO sodas today! A clear sign of my power!'],
        ['sad', 'I tried to make it rain for the farmers. It did not rain. I may need a nap.'],
        ['neutral', 'The head priest says I should "stop telling children I am a deity." Rude.'],
        ['smile', 'You may sit with me. I permit it. ...Please sit with me.'],
      ],
      giftLines: {
        loved: [['love', 'An offering worthy of the heavens! You are my favorite worshipper! ...Don\'t tell the others.']],
        liked: [['happy', 'Oho! A fine offering. You may receive a small blessing.']],
        neutral: [['neutral', 'Hmm. The goddess accepts this... humble offering.']],
        disliked: [['sad', "A BOOK? For a goddess? Do you want me to fall asleep?!"]],
      },
      dateLines: {
        cafe: ['love', 'Unlimited soda refills! This is paradise! Is this... is this heaven?!'],
        beach: ['happy', 'My element! Behold, the sea bows before me! ...A wave just hit my face.'],
        arcade: ['smile', 'Watch me win this rhythm game with divine reflexes! ...Okay, divine-ish.'],
        park: ['smile', "The sakura petals are dancing for me. Obviously."],
        mall: ['neutral', "So many shops... so many things I can't afford..."],
        shrine: ['sad', "This is where I WORK, {name}. You took me on a date to my job?"],
      },
      moments: [
        { q: [['blush', "Mortal... do you think a goddess is allowed to hold hands?"]], opts: [
          { t: 'Only with a very devoted worshipper.', v: 7, r: [['love', "...Then I suppose I have no choice. Give it here."]] },
          { t: "Goddesses can do whatever they want.", v: 5, r: [['happy', 'Right! Divine privilege!']] },
          { t: "Probably against the rules.", v: -2, r: [['sad', "...Rules are dumb."]] },
        ] },
        { q: [['smug', "If you could ask the goddess for one wish, what would it be?"]], opts: [
          { t: 'More days like today.', v: 7, r: [['blush', "...Wish granted. I'll make sure of it."]] },
          { t: 'A lifetime supply of soda for you.', v: 5, r: [['happy', "Selfless AND correct! Ascend, mortal!"]] },
          { t: 'Money.', v: -2, r: [['neutral', "...Wow. Okay. Denied."]] },
        ] },
        { q: [['neutral', "Are you having fun? Be honest. Goddesses can tell when you lie."]], opts: [
          { t: "The most fun I've had in ages.", v: 6, r: [['love', "Hehe... me too. Don't tell anyone a goddess said that."]] },
          { t: "Yes, but you're very loud.", v: 3, r: [['smug', "Divinity is loud! Get used to it!"]] },
          { t: "...Mostly?", v: -1, r: [['sad', "'Mostly'?!"]] },
        ] },
      ],
      events: [
        { title: 'The Water Dance', lines: [
          ['n', 'You find Aqua sitting on the shrine steps, sniffling. A ribbon-wand lies abandoned beside her.'],
          ['sad', "The kids laughed at my sacred water dance. They said it looked like a 'drowning noodle'."],
          ['sad', "I practiced for weeks... A goddess shouldn't cry, right? So I'm not crying. This is holy water."],
        ], opts: [
          { t: "Teach me the dance. We'll do it together.", v: 7, r: [['surprised', '...Together?'], ['love', "...Okay! Left foot first! No, YOUR left!"], ['n', 'You both dance badly until she is laughing too hard to stand.']] },
          { t: 'I thought it looked beautiful.', v: 5, r: [['blush', "...Really? Then the kids just have no taste."]] },
          { t: 'It did look a bit like a noodle.', v: -2, r: [['sad', 'Et tu, worshipper?!']] },
        ] },
        { title: 'Under the Lanterns', lines: [
          ['n', 'The shrine lanterns flicker in the evening breeze. Aqua is quieter than usual.'],
          ['neutral', "...I was left at this shrine when I was a baby. The old priest found me by the water basin."],
          ['sad', "He said the water goddess must have sent me. So I decided... if I was the goddess, then I wasn't just someone nobody wanted."],
        ], opts: [
          { t: "You were never unwanted. I want you here.", v: 8, r: [['blush', '...'], ['love', "...That's the best prayer anyone's ever said to me."]] },
          { t: "Goddess or not, you're amazing.", v: 7, r: [['smile', "...Thank you. Really. Thank you."]] },
          { t: "So you're not really a goddess?", v: 0, r: [['sad', "...You missed the point, mortal."]] },
        ] },
      ],
      confess: {
        ask: [['p', "Aqua. I don't want to be just a worshipper. I like you. The real you."]],
        yes: [
          ['surprised', '...Huh? Huh?!'],
          ['blush', 'A m-mortal confessing to a goddess?! The audacity! The scandal!'],
          ['love', "...I accept. I accept, okay?! I like you too, {name}. Not as a goddess. As me."],
          ['happy', 'Now buy me a soda to celebrate! Our first offering as a couple!'],
        ],
        no: [
          ['blush', "W-wait! A goddess's heart is protected by sacred rules!"],
          ['neutral', "Show your devotion at the shrine, and become a little more radiant. Then... ask me again. Please."],
        ],
      },
      gfLines: [
        ['love', 'My official partner! I have upgraded you from "worshipper" to "beloved". It\'s a big promotion!'],
        ['happy', "I told the head priest we're dating. He sighed for a really long time. I think he's happy!"],
        ['blush', "I prayed for you today. And yesterday. And... okay, every day. Don't make it weird."],
        ['love', 'When we hold hands, my hands feel like the sea on a warm day. Is that a miracle? I think it is.'],
      ],
      ending: "Aqua performs the summer water dance in front of the whole town — and this time, no one laughs. Afterwards she runs straight into your arms. \"Was I divine?\" she asks. You tell her she always was.",
    },

    // ---------------------------------------------------------------- YUMEKO
    yumeko: {
      name: 'Yumeko',
      full: 'Yumeko',
      color: '#d8404c',
      bio: 'Student council treasurer at Sakuragaoka Academy. Graceful, polite, and utterly addicted to risk.',
      stranger: 'the girl in the red blazer',
      schedule: {
        weekday: [[360, 'apartments'], [480, 'school'], [960, 'plaza'], [1020, 'arcade'], [1200, 'casino'], [1440, 'apartments']],
        weekend: [[360, 'apartments'], [660, 'mall'], [840, 'park'], [1020, 'arcade'], [1140, 'casino'], [1500, 'apartments']],
      },
      req: { smarts: 40 },
      reqText: 'Smarts 40',
      gifts: { dice: 'loved', book: 'loved', chocolate: 'liked', flowers: 'liked', tangerines: 'disliked', perfume: 'loved', handbag: 'liked', shades: 'liked' },
      dates: { arcade: 'loved', shrine: 'loved', cafe: 'ok', mall: 'ok', park: 'meh', beach: 'meh' },
      intro: [
        ['n', 'A girl in a red blazer sits alone, shuffling a deck of cards with unsettling grace.'],
        ['smile', "Oh? You're not afraid to approach me. How refreshing."],
        ['smug', "I'm Yumeko, student council treasurer. Shall we make a little wager on our first meeting?"],
        ['p', 'What kind of wager?'],
        ['happy', "Ufufu~ I bet that you'll come back to talk to me again. And I never lose."],
      ],
      topics: [
        { min: 0, q: [['smug', "Heads or tails? Call it right and I'll tell you a secret."]], opts: [
          { t: 'Heads.', v: 5, r: [['happy', "Tails~ You lose. But I'll tell you anyway: I've never lost a coin toss in my life."]] },
          { t: 'Tails.', v: 5, r: [['surprised', 'Oh! ...Tails. Interesting. Then my secret: you\'re the first person to beat me.']] },
          { t: "I don't bet on things I can't control.", v: -3, r: [['neutral', 'How dull. Everything worth doing is out of your control.']] },
        ] },
        { min: 0, q: [['neutral', 'Tell me, {name}. Which is more thrilling: winning, or losing?']], opts: [
          { t: 'Not knowing which it will be.', v: 7, r: [['love', '...Oh my. You understand perfectly.']] },
          { t: 'Winning, obviously.', v: 2, r: [['smile', 'Obviously. And a little boring.']] },
          { t: 'Losing is just sad.', v: -2, r: [['neutral', "Then you've never lost properly."]] },
        ] },
        { min: 0, q: [['smile', 'Everyone at school avoids my eyes. Do I frighten you?']], opts: [
          { t: "A little. That's what makes it fun.", v: 6, r: [['smug', 'Honest. I like that very much.']] },
          { t: 'Not at all.', v: 3, r: [['smile', 'Hmm. Either brave or foolish. We\'ll see which.']] },
          { t: "Yes. Please don't hurt me.", v: 1, r: [['happy', "Ufufu~ I won't. ...Probably."]] },
        ] },
        { min: 20, q: [['smug', "I hid a puzzle in the library two years ago. No one has solved it. Want to try?"]], opts: [
          { t: "I'll solve it. Just watch.", v: 6, r: [['happy', "Such confidence! I'll be watching closely."]] },
          { t: 'What do I get if I do?', v: 4, r: [['smug', "A good gambler always asks. ...A date, perhaps?"]] },
          { t: 'Sounds like homework.', v: -2, r: [['neutral', 'Mm. I suppose not everyone enjoys thinking.']] },
        ] },
        { min: 20, q: [['neutral', 'Why do you think people gamble?']], opts: [
          { t: 'Because they feel lonely.', v: 6, r: [['surprised', "...That's a sharper answer than I expected."]] },
          { t: 'To feel alive.', v: 5, r: [['smile', 'Mm. That too.']] },
          { t: 'Greed.', v: 1, r: [['neutral', 'The boring answer. Not wrong, though.']] },
        ] },
        { min: 45, q: [['happy', "I once bet my whole allowance on a single card. I lost. I laughed for an hour."]], opts: [
          { t: 'That sounds insane. And amazing.', v: 6, r: [['love', "Doesn't it? Nobody else ever understands that part."]] },
          { t: 'What card was it?', v: 4, r: [['smug', 'The queen of hearts. Fitting, no?']] },
          { t: "That's really irresponsible.", v: -2, r: [['neutral', "...You sound like my father."]] },
        ] },
        { min: 45, q: [['smile', 'If you could bet on one thing with absolute certainty, what would it be?']], opts: [
          { t: "That I'll see you again tomorrow.", v: 7, r: [['blush', '...That was not fair.']] },
          { t: 'Nothing is ever certain.', v: 3, r: [['smile', "Correct. That's what makes it beautiful."]] },
          { t: 'The lottery.', v: 0, r: [['neutral', 'How very... ordinary.']] },
        ] },
        { min: 65, q: [['blush', "You're the one gamble I can't predict, {name}. Does that make you nervous?"]], opts: [
          { t: "I'd go all in on you.", v: 8, r: [['blush', "...My poker face is broken. Look what you've done."]] },
          { t: "Just don't fold on me.", v: 6, r: [['smile', 'Never. I always play my hand to the end.']] },
          { t: 'Very nervous.', v: 1, r: [['neutral', 'Hmm. Nervous is fine. Running is not.']] },
        ] },
      ],
      small: [
        ['smug', 'The vice president bet me a month of paperwork. He is now doing a month of paperwork.'],
        ['smile', "I read three mystery novels this week. I guessed every culprit by chapter two."],
        ['happy', 'I won a stuffed toy at the arcade and gave it to a crying child. Don\'t tell anyone.'],
        ['neutral', 'The council budget is balanced to the last yen. It is deeply satisfying.'],
        ['smile', 'Shall we play a round of rock-paper-scissors? ...I chose rock. You knew that, didn\'t you?'],
      ],
      giftLines: {
        loved: [['love', 'Oh my... you read me perfectly. I may have to start being careful around you.']],
        liked: [['smile', "How thoughtful. I'll treasure it."]],
        neutral: [['neutral', 'A safe choice. Thank you, {name}.']],
        disliked: [['sad', 'Tangerines... sticky fingers ruin a good deck. But thank you, I suppose.']],
      },
      dateLines: {
        arcade: ['love', 'Tokens, odds, flashing lights... You really know how to court a gambler.'],
        shrine: ['happy', "Fortune slips! Pure, beautiful chance. Let's both draw one."],
        cafe: ['smile', 'A quiet café. Good for reading people. And you, especially.'],
        mall: ['smile', 'Oh, a game shop. Let\'s see if they carry any interesting card sets.'],
        park: ['neutral', 'Fresh air... trees... Mm. Very nice. Very predictable.'],
        beach: ['sad', 'The sun and I are not friends, {name}. My cards will warp.'],
      },
      moments: [
        { q: [['smug', "Let's play a game. I'm thinking of a number from one to three."]], opts: [
          { t: 'Two.', v: 5, r: [['surprised', "...Correct. How did you— Ufufu. Maybe you're dangerous too."]] },
          { t: 'Three.', v: 3, r: [['smile', "Wrong. It was two. But I like your nerve."]] },
          { t: 'Your number is me.', v: 6, r: [['blush', "That's... not a number. ...You win anyway."]] },
        ] },
        { q: [['neutral', "Honestly, {name}... why do you keep choosing me? Most people run."]], opts: [
          { t: "Because life is more exciting with you.", v: 7, r: [['love', "...You really are the worst kind of gambler. I love it."]] },
          { t: "I see who you are behind the smile.", v: 6, r: [['blush', "...Then you've seen more than anyone else ever has."]] },
          { t: "I'm still deciding.", v: -2, r: [['neutral', 'I see. Then I\'ll keep raising the stakes.']] },
        ] },
        { q: [['smile', "If you had to describe me as a playing card, which would I be?"]], opts: [
          { t: 'The queen of hearts.', v: 6, r: [['love', "Mine already, you mean? Ufufu~"]] },
          { t: 'The joker.', v: 4, r: [['happy', "The wild card! I approve."]] },
          { t: 'A two of clubs.', v: -3, r: [['sad', '...A TWO?']] },
        ] },
      ],
      events: [
        { title: 'High or Low', lines: [
          ['n', 'Yumeko slides two arcade tokens across the table and fans out a deck of cards.'],
          ['smug', 'High or low. The loser buys parfaits. Simple, yes?'],
          ['n', 'You play five rounds. You lose four. She laughs — a real, surprised laugh.'],
          ['blush', "...Sorry. It's just been a long time since someone played with me for fun. Not to beat me. Just... with me."],
        ], opts: [
          { t: "Then let's play again tomorrow.", v: 7, r: [['love', "...Ufufu. You're on. I'll even let you shuffle."]] },
          { t: "I'll beat you someday, you know.", v: 5, r: [['smug', "I'm counting on it."]] },
          { t: 'I think I lost my parfait money...', v: 2, r: [['happy', "Oh dear. I'll cover it. This once."]] },
        ] },
        { title: 'The Heiress', lines: [
          ['n', 'The student council room is empty except for Yumeko, staring out the window.'],
          ['neutral', "My family runs one of the biggest companies in the country. Since I was born, every step of my life has been decided for me."],
          ['sad', "Schools. Friends. Someday, a husband. The only time I choose my own fate... is when I gamble."],
        ], opts: [
          { t: 'Then choose me. That one\'s all yours.', v: 8, r: [['surprised', '...!'], ['blush', 'That is the most reckless thing anyone has ever said to me. ...I adore it.']] },
          { t: "You deserve to choose your own life.", v: 7, r: [['smile', '...Mm. Maybe I will. Starting now.']] },
          { t: 'At least you\'re rich.', v: -3, r: [['neutral', "...Yes. At least I'm rich."]] },
        ] },
      ],
      confess: {
        ask: [['p', "Yumeko. I'm putting everything on the table. I like you."]],
        yes: [
          ['surprised', '...'],
          ['blush', "All in, with no tricks? You really are a terrible gambler, {name}."],
          ['love', "...Fortunately for you, I was holding the same hand. I like you too. Very, very much."],
          ['smug', "Now, shall we raise the stakes? Be mine. No take-backs."],
        ],
        no: [
          ['smile', "Ufufu... a tempting bet."],
          ['neutral', 'But I only play with partners who can read the table. Sharpen that mind of yours — then ask me again.'],
        ],
      },
      gfLines: [
        ['love', "My partner in crime. I told the council I'm 'otherwise engaged' on weekends now."],
        ['smug', "I calculated the odds of meeting someone like you. They were terrible. Lucky me."],
        ['blush', "When you hold my hand, I forget to count cards. It's very inconvenient. Don't stop."],
        ['happy', "I told my father I chose someone for myself. He was furious. It was the best day of my life."],
      ],
      ending: 'Yumeko turns down the arranged future her family prepared and chooses her own path — with you beside her. "The biggest bet of my life," she says, lacing her fingers through yours. "And I\'ve already won."',
    },

    // ------------------------------------------------------------------- REI
  };

  // =============================================================== NEW GIRLS
  Object.assign(GIRLS, {
    // ---------------------------------------------------------------- KURUMI
    kurumi: {
      name: 'Kurumi',
      full: 'Kurumi Tokisaki',
      color: '#c8283a',
      bio: 'A mysterious transfer student and heiress to the Tokisaki fortune. She lives in a mansion full of clocks, spends her afternoons in the old clock tower, and is far softer than she lets on, especially around cats.',
      stranger: 'the girl with one red eye',
      schedule: {
        weekday: [[360, 'mansion'], [480, 'school'], [960, 'clocktower'], [1140, 'shrine'], [1320, 'mansion']],
        weekend: [[360, 'mansion'], [600, 'clocktower'], [840, 'antiques'], [1020, 'casino'], [1140, 'cape'], [1260, 'mansion']],
      },
      req: { charm: 45 },
      reqText: 'Charm 45',
      gifts: { clock: 'loved', plushie: 'loved', ribbon: 'liked', flowers: 'liked', chocolate: 'liked', soda: 'disliked', perfume: 'loved', bigplush: 'liked', handbag: 'liked' },
      dates: { cape: 'loved', shrine: 'loved', cafe: 'ok', mall: 'ok', park: 'ok', flowers: 'ok', beach: 'meh', arcade: 'meh' },
      intro: [
        ['n', 'A girl in a black blazer is watching you from the shade, one red eye shining beneath her bangs.'],
        ['smug', 'Ara ara~ You walked right up to me. Most people cross the street.'],
        ['smile', "I'm Kurumi Tokisaki. A transfer student, like you. ...Or are you something else?"],
        ['p', "I'm {name}. Just a normal person, I promise."],
        ['happy', 'Ufufu, "normal". How delicious. Let\'s spend some time together, {name}~'],
      ],
      topics: [
        { min: 0, q: [['smug', 'Tell me, {name}. If you could stop time for one minute, what would you do?']], opts: [
          { t: 'Spend it looking at you, obviously.', v: 6, r: [['blush', "...Ara. That's a rather bold answer."]] },
          { t: 'Take a nap. A long one.', v: 3, r: [['happy', 'Ufufu, how wonderfully lazy.']] },
          { t: 'Rob a bank.', v: -2, r: [['neutral', "...How boring. I expected more from you."]] },
        ] },
        { min: 0, q: [['smile', 'Do you like clocks? The old tower here is my favorite place in town.']], opts: [
          { t: 'I love the sound of old gears ticking.', v: 6, r: [['happy', "Then you understand. Each tick is a tiny heartbeat."]] },
          { t: 'I just use my phone.', v: 0, r: [['sad', '...A phone has no soul, you know.']] },
          { t: "Can you show me inside?", v: 4, r: [['smug', "Perhaps. If you're good."]] },
        ] },
        { min: 0, q: [['neutral', 'A black cat crossed my path this morning. Do you think that\'s bad luck?']], opts: [
          { t: 'Cats are always good luck.', v: 6, r: [['love', "Exactly! Cats are perfect creatures. ...Ahem. I mean, yes."]] },
          { t: "Only if you believe in it.", v: 3, r: [['smile', 'A sensible answer.']] },
          { t: 'Definitely bad luck. Avoid cats.', v: -4, r: [['sad', '...We can no longer be friends.']] },
        ] },
        { min: 20, q: [['smug', "Everyone whispers that I'm dangerous. Aren't you afraid of me?"]], opts: [
          { t: "I think you're lonely, not dangerous.", v: 7, r: [['surprised', '...'], ['blush', 'You see far too much, {name}.']] },
          { t: 'A little. It makes you interesting.', v: 4, r: [['happy', 'Ufufu~ Good answer.']] },
          { t: 'Terrified. Please spare me.', v: 0, r: [['neutral', 'How disappointing.']] },
        ] },
        { min: 20, q: [['smile', "I've been making a cat café list. Every café in the region with a cat. Want to see?"]], opts: [
          { t: "Let's visit every single one together.", v: 7, r: [['love', "...Every single one? That's a promise, then."]] },
          { t: "You're a secret cat lover!", v: 4, r: [['blush', "It's not a secret if you shout it!"]] },
          { t: "I'm allergic to cats.", v: -2, r: [['sad', '...The universe is cruel.']] },
        ] },
        { min: 45, q: [['neutral', 'Do you ever wish you could go back and redo something?']], opts: [
          { t: "I'd rather make today count.", v: 6, r: [['smile', '...Today. Yes. That might be the wiser path.']] },
          { t: 'Meeting you sooner, maybe.', v: 7, r: [['blush', 'Ara... You\'re getting good at this.']] },
          { t: 'Every embarrassing thing I ever said.', v: 3, r: [['happy', 'Ufufu, that would take a lot of time.']] },
        ] },
        { min: 45, q: [['smug', "My hair covers my left eye. Aren't you curious what's under there?"]], opts: [
          { t: "When you're ready, you'll show me.", v: 7, r: [['blush', '...Patience. How rare.']] },
          { t: 'A golden clock, I bet.', v: 4, r: [['surprised', "...! How did you— Ufufu. A lucky guess."]] },
          { t: 'Let me see!', v: -2, r: [['neutral', 'Rude. Not today.']] },
        ] },
        { min: 65, q: [['blush', '{name}... if all of my time were yours, what would you do with it?']], opts: [
          { t: 'Give you mine in return. Every second.', v: 8, r: [['love', '...That is the most romantic thing anyone has ever said to me.']] },
          { t: 'Spend it at cat cafés.', v: 5, r: [['happy', 'Ufufu, an excellent plan.']] },
          { t: "I'd waste it, probably.", v: -2, r: [['sad', '...I see.']] },
        ] },
      ],
      small: [
        ['smug', 'My butler polished every clock in the mansion today. All four hundred and twelve of them.'],
        ['smile', 'Money? Ufufu. I have more than I could spend in a hundred lifetimes. Time is the thing I collect.'],
        ['smile', 'The tower clock runs two minutes fast. I fix it every afternoon. It always runs fast again.'],
        ['smug', 'I saw you yawning in class today. Ufufu, I see everything.'],
        ['happy', 'A kitten followed me home yesterday. I named it Chronos. It is very fluffy.'],
        ['neutral', 'Black tea, two sugars. That is the correct way. Do not argue.'],
        ['smile', "The sunset at the lighthouse is perfect. Time slows down there."],
      ],
      giftLines: {
        loved: [['love', "For me? Oh my... I'll treasure this until the end of time. Literally."]],
        liked: [['smile', 'Ara, how thoughtful. Thank you, {name}.']],
        neutral: [['neutral', 'A gift... Thank you.']],
        disliked: [['sad', 'Soda? It\'s so... fizzy. Undignified. But thank you.']],
      },
      dateLines: {
        cape: ['love', 'The sun is melting into the sea... Time feels so slow here. Stay a while.'],
        shrine: ['smile', 'Old shrines remember everything. I like that.'],
        cafe: ['smile', 'A quiet table, black tea... and you. Acceptable.'],
        mall: ['happy', "Ooh, a lace shop! You'll carry my bags, won't you?"],
        park: ['smile', 'Blossoms only last a week. That makes them precious.'],
        flowers: ['smile', "So many flowers... I'll pick one for you. Hold still."],
        beach: ['sad', 'The sun... my uniform is black, {name}. I am melting.'],
        arcade: ['neutral', 'Noisy. Flashing. ...The claw machine has a black cat plushie. Win it.'],
      },
      moments: [
        { q: [['smug', 'Close your eyes. ...I said close them.']], opts: [
          { t: '(Close your eyes.)', v: 7, r: [['n', 'Something soft touches your cheek. When you open your eyes, Kurumi is looking away.'], ['blush', 'Nothing happened. Nothing at all.']] },
          { t: 'Is this a trap?', v: 3, r: [['happy', 'Ufufu, you\'ll never know now.']] },
          { t: "No thanks.", v: -2, r: [['sad', '...Coward.']] },
        ] },
        { q: [['neutral', 'Do you think people can change, {name}? Truly change?']], opts: [
          { t: "You already have. You smile more now.", v: 7, r: [['blush', '...Do I? ...Then it\'s your fault.']] },
          { t: 'Slowly, yes.', v: 4, r: [['smile', 'Slowly. I have time.']] },
          { t: 'Not really.', v: -2, r: [['sad', '...What a sad thought.']] },
        ] },
        { q: [['smile', 'If I were a clock, what time would I be?']], opts: [
          { t: 'Midnight. Mysterious and beautiful.', v: 6, r: [['love', 'Ufufu~ Midnight. I adore that.']] },
          { t: 'Teatime.', v: 4, r: [['happy', 'Practical. And correct.']] },
          { t: 'Late. Always late.', v: -1, r: [['neutral', 'I am NEVER late.']] },
        ] },
      ],
      events: [
        { title: 'Inside the Clock Tower', lines: [
          ['n', 'Kurumi leads you up a spiral staircase into the heart of the clock tower. Huge gears turn slowly around you.'],
          ['smile', "This is my secret place. I come here when the world is too loud."],
          ['blush', "...You're the first person I've ever brought here."],
        ], opts: [
          { t: "Thank you for trusting me with this.", v: 7, r: [['love', '...Then you\'ll come back? To listen to the gears with me?']] },
          { t: 'It\'s beautiful. Like you.', v: 6, r: [['blush', 'Ara... Flattery inside my sanctuary. Bold.']] },
          { t: 'Is this even legal?', v: 1, r: [['smug', 'Ufufu. Probably not.']] },
        ] },
        { title: 'The Hidden Eye', lines: [
          ['n', 'At dusk, Kurumi slowly brushes her bangs aside. Her left eye shines gold, shaped like a tiny clock face.'],
          ['sad', 'People call it cursed. I hid it for so long, I forgot what it\'s like to be looked at without fear.'],
          ['neutral', '...Well? Say something.'],
        ], opts: [
          { t: "It's beautiful. All of you is.", v: 8, r: [['love', '...You\'re not afraid. Not even a little.'], ['blush', '...Then I won\'t hide from you anymore.']] },
          { t: "I'd never fear you, Kurumi.", v: 7, r: [['smile', '...I believe you. Somehow.']] },
          { t: 'Does it tell the time?', v: 2, r: [['happy', 'Ufufu... Only the important times.']] },
        ] },
      ],
      confess: {
        ask: [['p', 'Kurumi. I want to spend my time with you. All of it. I like you.']],
        yes: [
          ['surprised', '...'],
          ['blush', 'Ara... Ara ara... You really said it.'],
          ['love', "I like you too, {name}. I have for a long time. Every second with you is worth a thousand without."],
          ['happy', 'From now on, your time belongs to me. ...And mine to you. Ufufu~'],
        ],
        no: [
          ['smile', 'Ufufu... How sweet of you.'],
          ['neutral', "But my heart is a lady's, {name}. Polish yourself a little more — become someone who shines. Then ask me again."],
        ],
      },
      gfLines: [
        ['love', 'I fixed the tower clock today. Then I unfixed it, so I\'d have an excuse to come see you.'],
        ['happy', "Chronos the kitten likes you. That means you're officially family."],
        ['blush', "I don't hide my eye around you anymore. ...Don't make a big deal of it."],
        ['love', 'Ufufu~ You are my most precious time.'],
      ],
      ending: 'The clock tower chimes midnight as Kurumi takes your hand at the very top, the whole town glittering below. "Time has never moved so fast," she whispers, her golden eye shining. "Let\'s make every second count."',
    },

    // ------------------------------------------------------------------- REM
    rem: {
      name: 'Rem',
      full: 'Rem',
      color: '#4a84cc',
      bio: 'The hardworking maid of Café Blue Rose. Polite, devoted, and an incredible cook — she works harder than anyone and rarely thinks of herself.',
      stranger: 'the blue-haired maid',
      schedule: {
        weekday: [[360, 'maidcafe'], [1200, 'mall'], [1290, 'maidcafe']],
        weekend: [[360, 'maidcafe'], [600, 'flowers'], [780, 'maidcafe'], [1140, 'plaza'], [1260, 'maidcafe']],
      },
      req: { charm: 30, fitness: 30 },
      reqText: 'Charm 30 and Fitness 30',
      gifts: { flowerpin: 'loved', ribbon: 'loved', flowers: 'liked', chocolate: 'liked', crepe: 'liked', tangerines: 'liked', dice: 'disliked', bigplush: 'loved', perfume: 'liked', handbag: 'liked' },
      dates: { flowers: 'loved', cafe: 'loved', mall: 'loved', park: 'ok', shrine: 'ok', cape: 'ok', beach: 'meh', arcade: 'meh' },
      intro: [
        ['n', 'A maid with short blue hair bows politely, a tray balanced perfectly in one hand.'],
        ['smile', 'Welcome to Café Blue Rose. My name is Rem. Please, make yourself at home.'],
        ['p', "I'm {name}. I just moved here."],
        ['happy', '{name}-kun. Rem will remember. Please come again, and Rem will make you something delicious.'],
      ],
      topics: [
        { min: 0, q: [['smile', 'Is there a dish you like, {name}-kun? Rem would like to learn it.']], opts: [
          { t: "Anything you make, honestly.", v: 6, r: [['blush', 'A-anything...? Rem will do her best, then!']] },
          { t: 'Omurice with a heart on top.', v: 5, r: [['happy', 'Rem is very good at hearts.']] },
          { t: 'Instant noodles.', v: -2, r: [['sad', '...Rem will pretend she did not hear that.']] },
        ] },
        { min: 0, q: [['neutral', 'Rem has an older sister. She is much better than Rem at everything.']], opts: [
          { t: "I bet you're amazing in your own way.", v: 7, r: [['surprised', '...Rem? Amazing?'], ['blush', 'No one has ever said that before.']] },
          { t: 'Tell me about her!', v: 3, r: [['smile', 'Ram-neesama is strong and clever. ...And lazy. Very lazy.']] },
          { t: 'Sounds tough to compete with.', v: 0, r: [['sad', '...Yes. It is.']] },
        ] },
        { min: 0, q: [['smile', 'Rem gets up at four every morning to clean the café. Is that strange?']], opts: [
          { t: "That's dedication. Don't overwork yourself.", v: 6, r: [['blush', '{name}-kun is worried about Rem...?']] },
          { t: 'Four?! I could never.', v: 3, r: [['happy', 'Hehe. Rem is used to it.']] },
          { t: 'Seems a bit obsessive.', v: -3, r: [['sad', '...Rem will try to be less strange.']] },
        ] },
        { min: 20, q: [['blush', 'Rem tried a new recipe. Would {name}-kun taste it?']], opts: [
          { t: "Absolutely. It's delicious!", v: 6, r: [['love', 'Really? Rem is so happy!']] },
          { t: "It needs a bit more salt.", v: 4, r: [['smile', 'Honest feedback... Thank you. Rem will fix it.']] },
          { t: "I'm not hungry.", v: -3, r: [['sad', 'Oh... Of course.']] },
        ] },
        { min: 20, q: [['neutral', 'When Rem was little, she thought she was useless. Do you ever feel that way?']], opts: [
          { t: 'Sometimes. But you make this place shine.', v: 7, r: [['blush', '...Rem makes it shine?']] },
          { t: 'Everyone does sometimes.', v: 4, r: [['smile', 'Then Rem is not alone.']] },
          { t: 'Never. I\'m great.', v: -1, r: [['neutral', '...That is very confident.']] },
        ] },
        { min: 45, q: [['smile', 'Rem bought a new hairpin. Does it... suit Rem?']], opts: [
          { t: "It's adorable. You're adorable.", v: 7, r: [['blush', '{name}-kun...! Rem\'s face is burning.']] },
          { t: 'Very cute.', v: 4, r: [['happy', 'Hehe. Rem chose well, then.']] },
          { t: "I didn't notice.", v: -3, r: [['sad', '...Oh.']] },
        ] },
        { min: 45, q: [['neutral', 'If {name}-kun were in trouble, Rem would protect you. Even if it hurt.']], opts: [
          { t: "Then I'll protect you too. We'll look out for each other.", v: 7, r: [['love', '...Each other. Rem likes that very much.']] },
          { t: "Don't get hurt for me.", v: 5, r: [['blush', '...Rem cannot promise that.']] },
          { t: 'Cool, a bodyguard.', v: -1, r: [['neutral', '...That is not what Rem meant.']] },
        ] },
        { min: 65, q: [['blush', "Rem... Rem has been thinking about you a lot. Is that alright?"]], opts: [
          { t: "I've been thinking about you too, Rem.", v: 8, r: [['love', '...Really? Then Rem is the happiest maid in the world.']] },
          { t: 'Only good thoughts, I hope.', v: 4, r: [['happy', 'Only the very best ones.']] },
          { t: 'That\'s a bit much.', v: -3, r: [['sad', '...Rem understands. Sorry.']] },
        ] },
      ],
      small: [
        ['smile', 'Rem polished every spoon in the café today. They shine like mirrors.'],
        ['happy', 'A customer said Rem\'s omurice was the best in town. Rem drew them an extra heart.'],
        ['neutral', 'Rem\'s sister sent a letter. It was one sentence long. That is very like her.'],
        ['smile', '{name}-kun, your collar is crooked. ...There. Perfect.'],
        ['blush', 'Rem saved you the last slice of cake. Please do not tell the other customers.'],
      ],
      giftLines: {
        loved: [['love', 'For Rem? Rem will wear it every single day! Thank you, {name}-kun!']],
        liked: [['happy', "Rem is very grateful. Thank you."]],
        neutral: [['smile', 'Thank you, {name}-kun. Rem will put it somewhere special.']],
        disliked: [['sad', 'Dice...? Rem does not gamble. But thank you for thinking of her.']],
      },
      dateLines: {
        flowers: ['love', 'So many flowers... Rem wants to remember this forever.'],
        cafe: ['happy', 'Someone else serving Rem? This is... strange. And wonderful.'],
        mall: ['happy', 'A cooking shop! Rem could stay here for hours.'],
        park: ['smile', 'The cherry blossoms are beautiful. Rem will make sakura mochi tomorrow.'],
        shrine: ['smile', 'Rem will pray for {name}-kun\'s happiness.'],
        cape: ['smile', 'The sea wind is strong. ...Rem will hold your arm. For balance.'],
        beach: ['neutral', 'Rem did not bring a swimsuit. Rem will guard the towels.'],
        arcade: ['sad', 'So loud... Rem does not understand these machines.'],
      },
      moments: [
        { q: [['blush', 'Rem made a bento for our date. Would you like to share it?']], opts: [
          { t: 'You made this for me? Thank you, Rem.', v: 7, r: [['love', 'Rem would make a thousand for you.']] },
          { t: 'Wow, it looks amazing!', v: 5, r: [['happy', 'Hehe. Rem worked hard.']] },
          { t: 'I already ate.', v: -2, r: [['sad', '...Rem will eat it alone, then.']] },
        ] },
        { q: [['neutral', "Does {name}-kun think Rem is... only good at chores?"]], opts: [
          { t: "You're good at making me happy, too.", v: 7, r: [['blush', '...That is Rem\'s favorite job.']] },
          { t: "You're good at everything you try.", v: 5, r: [['smile', 'Rem will try more things, then.']] },
          { t: 'Pretty much, yeah.', v: -3, r: [['sad', '...I see.']] },
        ] },
        { q: [['smile', 'Rem is having a wonderful time. Is {name}-kun having fun?']], opts: [
          { t: 'The best time, because you\'re here.', v: 7, r: [['love', 'Rem is so happy she might cry.']] },
          { t: 'Lots of fun!', v: 4, r: [['happy', 'Then Rem is happy too!']] },
          { t: 'It\'s fine.', v: -1, r: [['neutral', '...Fine is fine.']] },
        ] },
      ],
      events: [
        { title: 'After Closing', lines: [
          ['n', 'The café is closed. Rem sits alone at a table, still in her apron, staring at her hands.'],
          ['sad', 'Rem broke a plate today. Her sister would never break a plate.'],
          ['sad', 'Rem always thinks... if only Rem were better, everyone would be happier.'],
        ], opts: [
          { t: "I don't want a better Rem. I like this one.", v: 8, r: [['surprised', '...'], ['love', '...{name}-kun. Rem will remember those words forever.']] },
          { t: 'It\'s just a plate. You\'re worth more than plates.', v: 6, r: [['smile', '...Hehe. More than plates.']] },
          { t: 'Try to be more careful.', v: -1, r: [['sad', '...Yes. Rem will.']] },
        ] },
        { title: 'Morning Star', lines: [
          ['n', 'At dawn, Rem shows you a small garden behind the café. Blue flowers are just opening.'],
          ['blush', "Rem planted these the day she met {name}-kun. Rem watered them every morning."],
          ['love', "Rem... Rem likes you. Rem knows she is only a maid. But Rem wanted you to know."],
        ], opts: [
          { t: "You're not 'only' anything. You're Rem, and I treasure you.", v: 8, r: [['love', '...Rem is so happy her heart might stop.']] },
          { t: 'These flowers are as beautiful as you.', v: 7, r: [['blush', 'Rem will water them every day, forever.']] },
          { t: "Oh. I didn't expect that.", v: 0, r: [['sad', '...Please forget it, then.']] },
        ] },
      ],
      confess: {
        ask: [['p', 'Rem. I love how you care about everyone. I want to be the one who cares for you. I like you.']],
        yes: [
          ['surprised', '...!'],
          ['blush', 'R-Rem is... Rem is...'],
          ['love', "Rem loves you, {name}-kun. From the bottom of her heart. Rem will stand beside you, always."],
          ['happy', 'Starting today, Rem will make you breakfast every morning! ...If that\'s alright.'],
        ],
        no: [
          ['blush', 'Rem is so happy you said that...'],
          ['neutral', 'But Rem wants to be with someone strong and kind, who can stand beside her when things are hard. Please, become that person. Rem will wait.'],
        ],
      },
      gfLines: [
        ['love', 'Rem drew two hearts on your omurice today. One for you, one for Rem.'],
        ['happy', 'Rem told her sister about you. She said, "Finally." Rem does not know what that means.'],
        ['blush', 'When Rem holds {name}-kun\'s hand, she forgets every chore. That is dangerous. Rem loves it.'],
        ['love', 'Rem\'s hero is {name}-kun. That will never change.'],
      ],
      ending: 'At dawn, the blue flowers behind Café Blue Rose are in full bloom. Rem ties a new ribbon in your hair, smiling brighter than the morning sun. "Rem will make you happy," she says. "Every day, for the rest of our lives."',
    },

    // -------------------------------------------------------------- ZERO TWO
    zerotwo: {
      name: 'Zero Two',
      full: 'Zero Two',
      color: '#f07aa0',
      bio: 'A reckless, honey-obsessed pilot who rents a room at the seaside dorm. Wild, flirty, and searching for her "darling" — someone who can keep up with her.',
      stranger: 'the girl with little red horns',
      schedule: {
        weekday: [[360, 'dorm'], [540, 'bakery'], [720, 'beach'], [960, 'cape'], [1140, 'onsen'], [1320, 'dorm']],
        weekend: [[360, 'dorm'], [600, 'bakery'], [780, 'flowers'], [1020, 'cape'], [1200, 'arcade'], [1380, 'dorm']],
      },
      req: { fitness: 45 },
      reqText: 'Fitness 45',
      gifts: { honey: 'loved', crepe: 'loved', chocolate: 'liked', soda: 'liked', tangerines: 'liked', book: 'disliked', shades: 'loved', toy: 'liked', handbag: 'liked' },
      dates: { beach: 'loved', cape: 'loved', arcade: 'ok', cafe: 'ok', mall: 'ok', flowers: 'ok', shrine: 'meh', park: 'meh' },
      intro: [
        ['n', 'A pink-haired girl in a red uniform leans in close, licking honey off a lollipop. Two little red horns peek through her hair.'],
        ['smug', 'Hmm? You smell different. New in town?'],
        ['happy', "I'm Zero Two. Want to be my darling? ...Kidding! Maybe."],
        ['p', "I'm {name}. Nice to meet you, I think?"],
        ['smile', '{name}, huh? Let\'s see if you can keep up with me~'],
      ],
      topics: [
        { min: 0, q: [['smug', 'Do my horns scare you, darling?']], opts: [
          { t: "They're cute. They suit you.", v: 6, r: [['blush', '...Cute? Nobody says cute. Say it again.']] },
          { t: 'Are they real?', v: 3, r: [['happy', 'Touch them and find out~ ...Just kidding. Maybe.']] },
          { t: 'A little, yeah.', v: -2, r: [['sad', '...Everyone says that.']] },
        ] },
        { min: 0, q: [['happy', 'What\'s the best food in the world? Wrong answers get bitten.']], opts: [
          { t: 'Honey. Obviously.', v: 7, r: [['love', 'CORRECT! You get to live, darling.']] },
          { t: 'Something sweet?', v: 4, r: [['smile', 'Close enough. You may keep your arm.']] },
          { t: 'Salad.', v: -3, r: [['sad', 'Salad?! Gross.']] },
        ] },
        { min: 0, q: [['smile', 'I want to fly somewhere nobody\'s ever been. Wanna come?']], opts: [
          { t: 'Anywhere, as long as it\'s with you.', v: 6, r: [['happy', "Ooh, smooth. I like you!"]] },
          { t: "I'm scared of heights.", v: 1, r: [['smug', 'I\'ll hold your hand the whole way~']] },
          { t: 'Sounds dangerous.', v: -1, r: [['neutral', 'Boring.']] },
        ] },
        { min: 20, q: [['neutral', 'People always leave me in the end. You\'ll get bored too, won\'t you?']], opts: [
          { t: "Not a chance. You're never boring.", v: 7, r: [['blush', '...Promise?']] },
          { t: "I'll try my best to stay.", v: 5, r: [['smile', 'Try harder than that, darling.']] },
          { t: 'Maybe.', v: -3, r: [['sad', '...Yeah. Figured.']] },
        ] },
        { min: 20, q: [['happy', "Let's race to the end of the pier! Loser buys honey toast!"]], opts: [
          { t: "You're on! (Run as fast as you can.)", v: 7, r: [['happy', 'Ahaha! You actually tried! I still won, though.']] },
          { t: "I'll just buy you the toast.", v: 3, r: [['smug', 'Coward. ...A generous coward.']] },
          { t: "I don't run.", v: -2, r: [['neutral', 'Then you\'ll never catch me.']] },
        ] },
        { min: 45, q: [['blush', 'I read a picture book once, about a monster and a prince. Do you think monsters can be loved?']], opts: [
          { t: "You're not a monster. And yes, you can.", v: 8, r: [['love', '...You really mean that, don\'t you?']] },
          { t: 'Every story needs a happy ending.', v: 5, r: [['smile', 'Then let\'s write one.']] },
          { t: 'Monsters are scary.', v: -3, r: [['sad', '...Yeah.']] },
        ] },
        { min: 45, q: [['smug', "I licked your ice cream when you weren't looking. Mad?"]], opts: [
          { t: "Then I get to steal your honey.", v: 6, r: [['happy', "Ahaha! You'd have to catch me first!"]] },
          { t: "You can have it.", v: 4, r: [['blush', '...You spoil me, darling.']] },
          { t: 'That\'s gross.', v: -2, r: [['sad', 'Hmph.']] },
        ] },
        { min: 65, q: [['blush', 'Hey... can I call you darling for real now?']], opts: [
          { t: "Only if I can call you mine.", v: 8, r: [['love', '...Darling. My darling.']] },
          { t: "I'd like that.", v: 6, r: [['happy', 'Darling darling darling~']] },
          { t: 'Please don\'t.', v: -4, r: [['sad', '...Oh.']] },
        ] },
      ],
      small: [
        ['happy', 'The bakery lady gives me extra honey now. I might have threatened her. Nicely.'],
        ['smug', 'I can hold my breath underwater for three minutes. Bet you can\'t.'],
        ['smile', 'The sea at the lighthouse looks like it goes on forever. I like things that go on forever.'],
        ['neutral', 'The onsen is the only place I can relax. Don\'t follow me in there. ...Unless?'],
        ['happy', 'Darling! I mean— hey, {name}!'],
      ],
      giftLines: {
        loved: [['love', 'HONEY! Darling, you\'re the best! I\'m keeping you forever!']],
        liked: [['happy', 'Ooh, sweet stuff! You know me well~']],
        neutral: [['smile', "Hm. Thanks, I guess."]],
        disliked: [['sad', 'A book? I fall asleep on page one. Boooring.']],
      },
      dateLines: {
        beach: ['love', 'The sea! Race you to the water, darling!'],
        cape: ['love', 'From the lighthouse you can see the whole sky. I want to fly up there with you.'],
        arcade: ['happy', 'Racing games! I\'ll crush you!'],
        cafe: ['smile', 'Do they have honey lattes? ...They do now. I asked very nicely.'],
        mall: ['smile', 'Let\'s find matching outfits! Red, obviously.'],
        flowers: ['smile', 'Flowers are nice. Bees are nicer. Bees make honey.'],
        shrine: ['neutral', 'Shrines are so quiet... I don\'t do quiet.'],
        park: ['neutral', 'A park. Trees. Wow. ...Wanna climb one?'],
      },
      moments: [
        { q: [['smug', 'Hold still, darling. You\'ve got honey on your cheek.']], opts: [
          { t: '(Hold still.)', v: 7, r: [['n', 'Zero Two leans in and wipes it away with her thumb — then licks it, grinning.'], ['love', 'Sweet.']] },
          { t: 'I can get it myself!', v: 3, r: [['happy', 'Spoilsport~']] },
          { t: 'Ew, no.', v: -2, r: [['sad', 'Hmph.']] },
        ] },
        { q: [['neutral', 'If I had to leave town forever, would you come find me?']], opts: [
          { t: "I'd follow you anywhere.", v: 8, r: [['love', '...That\'s what a darling says.']] },
          { t: "I'd write every day.", v: 4, r: [['smile', 'Letters are nice. You\'re nicer.']] },
          { t: "I'd miss you, I guess.", v: 0, r: [['neutral', '...You guess?']] },
        ] },
        { q: [['happy', 'Piggyback! Now!']], opts: [
          { t: '(Carry her on your back.)', v: 6, r: [['love', 'Faster, darling! Faster!']] },
          { t: 'You\'re heavier than you look.', v: -3, r: [['sad', '...I\'m biting you.']] },
          { t: 'Only to the corner.', v: 3, r: [['happy', 'Deal! ...To the next corner too.']] },
        ] },
      ],
      events: [
        { title: 'The Picture Book', lines: [
          ['n', 'Zero Two pulls a worn picture book from her jacket. The pages are soft from being read a thousand times.'],
          ['neutral', 'It\'s about a monster who falls in love with a prince. Everyone tells her she can\'t be with him.'],
          ['sad', "I used to read it every night. I always wondered if the monster got a happy ending."],
        ], opts: [
          { t: "She does. I'll make sure of it.", v: 8, r: [['love', '...You\'re weird, darling. I like weird.']] },
          { t: "Let's finish the story together.", v: 7, r: [['smile', '...Together. Okay.']] },
          { t: 'It\'s just a kids\' book.', v: -2, r: [['sad', '...Yeah. Just a book.']] },
        ] },
        { title: 'Lighthouse at Night', lines: [
          ['n', 'Night has fallen at the lighthouse. Zero Two sits on the railing, her hair whipping in the wind.'],
          ['sad', "Everyone I get close to... they start to look at me like I'm something scary."],
          ['blush', "But you never do. Why? Why aren't you scared of me, {name}?"],
        ], opts: [
          { t: "Because I see you. Just you. And I like what I see.", v: 8, r: [['love', '...Darling. My darling.'], ['n', 'She leans her head on your shoulder and stays there a long time.']] },
          { t: "Because you're my friend.", v: 6, r: [['smile', '...Friend. Okay. For now.']] },
          { t: "I'm a little scared sometimes.", v: 0, r: [['sad', '...I knew it.']] },
        ] },
      ],
      confess: {
        ask: [['p', "Zero Two. I want to be your darling. For real. I like you."]],
        yes: [
          ['surprised', '...!'],
          ['blush', 'You... you actually said it. Out loud.'],
          ['love', "You're my darling, {name}. From now until forever. And forever is a really long time."],
          ['happy', 'Now let\'s celebrate! Honey toast! Your treat, darling~'],
        ],
        no: [
          ['smug', 'Ooh, bold.'],
          ['neutral', "But my darling has to keep up with me. If you can't even catch me, how could you fly with me? Get stronger. Then ask again."],
        ],
      },
      gfLines: [
        ['love', 'Darling! I saved you half my honey toast. Half! That\'s love.'],
        ['happy', 'Let\'s fly away somewhere this weekend! ...Fine, we can take the train.'],
        ['blush', 'I re-read the picture book. I added a new page at the end. It has you in it.'],
        ['love', 'My darling. Mine. Say it back.'],
      ],
      ending: 'At the top of the lighthouse, Zero Two pulls you close as the stars come out over the endless sea. "The monster got her happy ending," she whispers, horns glowing faintly red. "Her prince was you all along, darling."',
    },

    // --------------------------------------------------------------- FRIEREN
    frieren: {
      name: 'Frieren',
      full: 'Frieren',
      color: '#9ad0b4',
      bio: 'An elf mage over a thousand years old who runs the antique shop. Calm, sleepy, and obsessed with collecting oddly specific spells. She is just starting to understand people.',
      stranger: 'the elf with the staff',
      schedule: {
        weekday: [[360, 'antiques'], [660, 'flowers'], [900, 'school'], [1080, 'antiques']],
        weekend: [[360, 'antiques'], [720, 'lake'], [960, 'flowers'], [1140, 'shrine'], [1260, 'antiques']],
      },
      req: { smarts: 50 },
      reqText: 'Smarts 50',
      gifts: { grimoire: 'loved', flowers: 'loved', book: 'liked', clock: 'liked', chocolate: 'liked', dice: 'disliked', toy: 'liked', bigplush: 'liked', perfume: 'disliked' },
      dates: { flowers: 'loved', shrine: 'loved', park: 'ok', cape: 'ok', mall: 'ok', cafe: 'meh', beach: 'meh', arcade: 'meh' },
      intro: [
        ['n', 'An elf with long silver twin tails is crouched over a flower bed, staring at a single blossom.'],
        ['neutral', "...Oh. A human. Sorry, I didn't notice you. I've been watching this flower for about three hours."],
        ['smile', "I'm Frieren. I run the antique shop. If you find any strange old spellbooks, bring them to me."],
        ['p', "I'm {name}. Three hours? Really?"],
        ['neutral', "That's not very long. ...For an elf, anyway."],
      ],
      topics: [
        { min: 0, q: [['neutral', 'I just learned a spell that turns grapes sour. Want to see it?']], opts: [
          { t: 'Yes! Show me every useless spell you know.', v: 7, r: [['happy', "...You're the first person who's ever asked that. This might take a few days."]] },
          { t: 'Why would anyone want that?', v: 2, r: [['neutral', "Some people like sour grapes. I think."]] },
          { t: "Sounds pointless.", v: -3, r: [['sad', '...It\'s not pointless. It\'s magic.']] },
        ] },
        { min: 0, q: [['neutral', 'How old do you think I am?']], opts: [
          { t: "Old enough to be wise, young enough to be cute.", v: 6, r: [['blush', '...That\'s a strange compliment. I\'ll keep it.']] },
          { t: 'A thousand years?', v: 4, r: [['smile', 'A bit more. Good guess.']] },
          { t: 'Like, twelve?', v: -2, r: [['neutral', '...I\'m older than this town. Much older.']] },
        ] },
        { min: 0, q: [['smile', 'I\'m looking for a spell that makes a field of flowers bloom. Someone I knew loved it.']], opts: [
          { t: "I'll help you search for it.", v: 7, r: [['smile', '...You\'d help? Thank you, {name}.']] },
          { t: 'That sounds beautiful.', v: 4, r: [['neutral', 'It is. ...It was.']] },
          { t: 'Why not just plant seeds?', v: 0, r: [['neutral', 'That\'s... not the same.']] },
        ] },
        { min: 20, q: [['neutral', "I overslept again. It's only been two days, though."]], opts: [
          { t: "I'll come wake you up every morning.", v: 6, r: [['blush', '...You would? You\'d have to be very persistent.']] },
          { t: 'Two DAYS?!', v: 3, r: [['smile', 'Is that a lot? Huh.']] },
          { t: "That's lazy.", v: -2, r: [['neutral', '...Rude. Accurate. But rude.']] },
        ] },
        { min: 20, q: [['sad', 'Humans live such short lives. I used to think there was no point getting close to them.']], opts: [
          { t: "That's why every moment together matters.", v: 8, r: [['surprised', '...'], ['smile', '...Someone told me that once. Long ago. I didn\'t understand then.']] },
          { t: "And now?", v: 5, r: [['blush', '...Now I\'m not so sure.']] },
          { t: 'Probably true.', v: -3, r: [['neutral', '...I see.']] },
        ] },
        { min: 45, q: [['smile', 'I found a mimic chest at the lake today. It tried to eat me. Twice.']], opts: [
          { t: 'Are you okay?! Next time, I\'m coming with you.', v: 7, r: [['blush', '...You\'d protect me from a chest? ...Okay.']] },
          { t: "Did you open it a third time?", v: 5, r: [['happy', 'Obviously. There might have been a grimoire.']] },
          { t: 'Serves you right.', v: -2, r: [['sad', '...Mean.']] },
        ] },
        { min: 45, q: [['neutral', "Do you think I'm... cold? People say I never show what I feel."]], opts: [
          { t: "You show it in small ways. I notice.", v: 7, r: [['blush', '...You notice? That\'s... nice.']] },
          { t: "You're just calm.", v: 4, r: [['smile', 'Calm. I like that word.']] },
          { t: 'Kind of, yeah.', v: -2, r: [['sad', '...I\'ll try harder.']] },
        ] },
        { min: 65, q: [['blush', "I want to remember you, {name}. Even a hundred years from now. Is that strange?"]], opts: [
          { t: "Then let's make memories worth a thousand years.", v: 8, r: [['love', '...Yes. Let\'s do that.']] },
          { t: "I'll never forget you either.", v: 6, r: [['smile', '...Promise.']] },
          { t: "You'll probably forget.", v: -4, r: [['sad', '...I won\'t.']] },
        ] },
      ],
      small: [
        ['neutral', 'I found a spell that cleans bronze statues perfectly. It\'s the best spell I\'ve learned this century.'],
        ['smile', 'The flower field is in bloom. I\'ve been lying in it since noon. I recommend it.'],
        ['neutral', 'A customer tried to sell me a "magic" sword. It was a stick. I bought it anyway.'],
        ['smile', 'I like the library here. It has a book about mushrooms I haven\'t read in 200 years.'],
        ['neutral', '...Zzz. Oh. Hello, {name}.'],
      ],
      giftLines: {
        loved: [['love', 'A grimoire...? Or flowers... You remembered what I like. ...Thank you. Truly.']],
        liked: [['smile', "Oh. That's nice. Thank you, {name}."]],
        neutral: [['neutral', 'A gift. I\'ll put it in the shop. ...Not to sell. Just to look at.']],
        disliked: [['neutral', 'Dice? I don\'t understand human games. Thank you, though.']],
      },
      dateLines: {
        flowers: ['love', "This field... It looks just like the one I've been searching for. Thank you for bringing me here."],
        shrine: ['smile', "This shrine is older than it looks. I remember when it was built. ...Don't do the math."],
        park: ['smile', 'Sakura... Every spring, they bloom. Every spring, someone new sees them with me.'],
        cape: ['neutral', 'The lighthouse keeper here used to be a boy. Then a man. Then gone. Humans move so fast.'],
        mall: ['neutral', 'Is there a magic shop? ...No? Then why are we here?'],
        cafe: ['neutral', "This cake is fine. I've had better. In 1406."],
        beach: ['sad', 'Sand. In my boots. Forever.'],
        arcade: ['neutral', "The claw machine is clearly cursed. I could break the curse. ...That's probably cheating."],
      },
      moments: [
        { q: [['smile', 'Would you like to see a spell? It makes flowers bloom in your hand.']], opts: [
          { t: 'Please!', v: 7, r: [['n', 'A tiny blue flower blooms in your palm, glowing softly.'], ['blush', '...It suits you.']] },
          { t: 'Is it dangerous?', v: 3, r: [['smile', 'Only to allergies.']] },
          { t: 'Magic\'s not my thing.', v: -3, r: [['sad', '...Oh.']] },
        ] },
        { q: [['neutral', 'I\'ve walked this path a hundred times. But it feels different with you. Why is that?']], opts: [
          { t: "Maybe it's because you're happy.", v: 7, r: [['blush', '...Happy. Huh. Maybe I am.']] },
          { t: 'New company, new path.', v: 4, r: [['smile', 'That\'s a wise thing to say. For a human.']] },
          { t: 'No idea.', v: -1, r: [['neutral', '...Hm.']] },
        ] },
        { q: [['neutral', 'Can you hold my staff for a second? I need to tie my boot.']], opts: [
          { t: '(Hold it carefully.)', v: 6, r: [['smile', 'Thank you. You held it like it was precious. It is.']] },
          { t: 'Whoa, it\'s heavy!', v: 3, r: [['happy', 'It\'s full of a thousand years of spells.']] },
          { t: '(Twirl it around.)', v: -2, r: [['surprised', 'Don\'t do that!']] },
        ] },
      ],
      events: [
        { title: 'The Flower Field Spell', lines: [
          ['n', 'Frieren kneels in the flower field at dusk, her staff glowing faintly.'],
          ['neutral', 'Long ago, I traveled with a hero. He loved this spell. I never told him... I learned it for him.'],
          ['sad', "He's been gone for a long time. I keep thinking I should have gotten to know him better."],
        ], opts: [
          { t: "Then get to know me. I'm right here.", v: 8, r: [['surprised', '...'], ['blush', '...Yes. I think I want to. Very much.']] },
          { t: "He must have been very happy with you.", v: 7, r: [['smile', '...I hope so.']] },
          { t: 'That was a long time ago.', v: 0, r: [['neutral', '...For you, maybe.']] },
        ] },
        { title: 'A Thousand Years', lines: [
          ['n', 'In the antique shop after closing, Frieren shows you a shelf of small, ordinary objects.'],
          ['neutral', 'Every one of these belonged to someone I cared about. A ring. A pipe. A wooden toy.'],
          ['blush', "...I left an empty space on the shelf. I don't want to fill it with something of yours for a very, very long time."],
        ], opts: [
          { t: "Then let's make sure that space stays empty for ages.", v: 8, r: [['love', '...You understand. You really do.']] },
          { t: "I'll stay by your side as long as I can.", v: 7, r: [['smile', '...As long as you can. That\'s all I ask.']] },
          { t: "That's a bit morbid.", v: -2, r: [['sad', '...Sorry.']] },
        ] },
      ],
      confess: {
        ask: [['p', "Frieren. I know my life is short to you. But I want to spend it with you. I like you."]],
        yes: [
          ['surprised', '...'],
          ['blush', "In a thousand years, nobody has ever said that to me."],
          ['love', "I like you too, {name}. I want to learn everything about you. Every little thing. Let's make every day count."],
          ['smile', '...I\'ll even try to wake up early. Sometimes.'],
        ],
        no: [
          ['neutral', "...That makes me happy. Really."],
          ['neutral', "But I want to share my thousand years of stories with someone who can follow them. Study a little more, {name}. Then ask again. I have time."],
        ],
      },
      gfLines: [
        ['love', 'I learned a new spell. It makes your tea stay warm forever. I learned it for you.'],
        ['smile', 'I woke up before noon today. Because I wanted to see you. Be impressed.'],
        ['blush', "I wrote your name in my grimoire. In the margin. Next to the good spells."],
        ['love', "...A thousand years were worth it, if they led to you."],
      ],
      ending: 'Frieren raises her staff over the flower field, and a sea of blue blossoms bursts open around you both, glowing under the stars. "I finally found it," she whispers, taking your hand. "The spell, and the person I wanted to show it to."',
    },
  });

  // Date-spot lines for the original four at the new places.
  Object.assign(GIRLS.nami.dates, { cape: 'loved', flowers: 'ok' });
  Object.assign(GIRLS.nami.dateLines, { cape: ['love', 'A lighthouse! Sailors used this to find their way home... I want to be someone\'s lighthouse.'], flowers: ['happy', 'So colorful! This is going on my map with a big star!'] });
  Object.assign(GIRLS.aqua.dates, { cape: 'ok', flowers: 'ok' });
  Object.assign(GIRLS.aqua.dateLines, { cape: ['smile', 'The sea bows before me from up here! ...It\'s very windy.'], flowers: ['happy', 'The flowers bloom for their goddess! ...And for you, I guess.'] });
  Object.assign(GIRLS.yumeko.dates, { cape: 'ok', flowers: 'meh' });
  Object.assign(GIRLS.yumeko.dateLines, { cape: ['smile', 'The lighthouse beam goes round and round. Like a roulette wheel.'], flowers: ['neutral', 'Flowers. Pretty. Predictable. ...You picked one for me? Ufufu.'] });


  // ---------------------------------------------------------------- MARIN
  GIRLS.marin = {
    name: 'Marin',
    full: 'Marin Kitagawa',
    color: '#e8a838',
    bio: 'A bubbly gyaru at the academy who sews her own cosplay costumes. Loud, honest and obsessed with magical-girl anime. She says exactly what she thinks.',
    stranger: 'the blonde girl with pink hair tips',
    schedule: {
      weekday: [[360, 'apartments'], [480, 'school'], [960, 'mall'], [1080, 'arcade'], [1260, 'apartments']],
      weekend: [[360, 'apartments'], [600, 'mall'], [780, 'park'], [960, 'beach'], [1140, 'arcade'], [1320, 'apartments']],
    },
    req: { charm: 35, smarts: 20 },
    reqText: 'Charm 35 & Smarts 20',
    gifts: { wig: 'loved', ribbon: 'loved', shades: 'loved', crepe: 'liked', perfume: 'liked', plushie: 'liked', chocolate: 'liked', handbag: 'liked', bigplush: 'liked', grimoire: 'disliked', clock: 'disliked' },
    dates: { mall: 'loved', arcade: 'loved', beach: 'loved', onsen: 'loved', cafe: 'ok', park: 'ok', flowers: 'ok', cape: 'ok', shrine: 'meh' },
    intro: [
      ['n', 'A blonde girl with pink-tipped hair spins around, phone in hand, and nearly crashes into you.'],
      ['happy', 'Whoa, sorry! I was totally zoned out watching a magical-girl rerun!'],
      ['smile', "I'm Marin! Marin Kitagawa. You're new, right? Your hair is SO pretty, is it natural?!"],
      ['p', "I'm {name}. ...Thanks?"],
      ['happy', "{name}! Okay, we're friends now. That's how it works!"],
    ],
    topics: [
      { min: 0, q: [['happy', 'Okay, real talk. Do you watch anime?']], opts: [
        { t: 'All the time. What are you watching?', v: 6, r: [['love', "AAH! Okay, you HAVE to watch Flying Witch Shizuku. I'll lend you the box set!"]] },
        { t: 'Sometimes.', v: 3, r: [['smile', "Sometimes is a start! I'll convert you."]] },
        { t: "Isn't that for kids?", v: -3, r: [['sad', '...Wow. Okay. Rude.']] },
      ] },
      { min: 0, q: [['smile', 'I sew my own cosplay costumes! Wanna see a photo?']], opts: [
        { t: "You made that yourself? That's amazing!", v: 7, r: [['love', 'Right?! I stayed up three nights on the frills!']] },
        { t: 'Cool outfit.', v: 3, r: [['happy', "Cool?! It's PERFECT! ...But thank you!"]] },
        { t: "Isn't that embarrassing?", v: -3, r: [['sad', 'No? Doing what you love is never embarrassing.']] },
      ] },
      { min: 0, q: [['happy', 'Pink tips or full pink? Which should I do next?']], opts: [
        { t: "Keep the tips. They're so you.", v: 5, r: [['blush', '...Hehe. Okay! The tips stay!']] },
        { t: 'Full pink, go wild!', v: 4, r: [['happy', 'Ooh, bold! I like it!']] },
        { t: 'Natural is better.', v: -1, r: [['neutral', 'Hmm... boring, but okay.']] },
      ] },
      { min: 20, q: [['neutral', "People see a gyaru and think I'm shallow. Do you think that?"]], opts: [
        { t: "You're one of the most genuine people I know.", v: 7, r: [['blush', "...Wow. Okay. You can't just say that so casually."]] },
        { t: "Looks don't tell the whole story.", v: 5, r: [['smile', 'Exactly! You get it.']] },
        { t: 'A little, at first.', v: -1, r: [['sad', "...At least you're honest."]] },
      ] },
      { min: 20, q: [['smile', 'I need a photographer for my next cosplay shoot. You in?']], opts: [
        { t: "I'd love to. I'll carry the props too.", v: 7, r: [['love', "You're the best! I'll buy you ramen!"]] },
        { t: "Sure, if I don't mess it up.", v: 4, r: [['happy', "You won't! I pose, you click. Easy."]] },
        { t: "I'm busy.", v: -2, r: [['sad', 'Oh... okay.']] },
      ] },
      { min: 45, q: [['blush', 'Hey... what kind of girl do you like? Just asking! For, um, character research!']], opts: [
        { t: 'Someone who loves what she does. Like you.', v: 8, r: [['blush', "...! I-I didn't ask for a specific example!"]] },
        { t: 'Someone honest and fun.', v: 5, r: [['smile', 'Honest and fun... I can do that.']] },
        { t: 'Quiet ones.', v: -2, r: [['sad', '...Quiet. Right.']] },
      ] },
      { min: 45, q: [['happy', "I finished the dress! But the zipper's in the back... can you help me?"]], opts: [
        { t: '(Zip it up carefully.)', v: 6, r: [['blush', "...Th-thanks. Your hands are shaking. Mine too, haha."]] },
        { t: 'Want me to call Nami?', v: 2, r: [['neutral', '...I asked YOU, dummy.']] },
        { t: 'Do it yourself.', v: -3, r: [['sad', 'Wow. Okay.']] },
      ] },
      { min: 65, q: [['blush', 'When I\'m with you, my heart goes doki-doki like in a shoujo manga. Is that weird?']], opts: [
        { t: 'Mine too. Every time.', v: 8, r: [['love', "...Okay. I'm gonna scream into a pillow later."]] },
        { t: "That's cute.", v: 5, r: [['blush', "Cute?! Ugh, you're making it worse!"]] },
        { t: 'Maybe see a doctor.', v: -3, r: [['sad', '...Not funny.']] },
      ] },
    ],
    small: [
      ['happy', 'I sewed until 4am again. My eyes are like a panda\'s, right?'],
      ['smile', "Nami wants to sell my cosplay photos. I said no. Probably."],
      ['happy', "The arcade got a new magical-girl crane game! I've spent ¥3000. Send help."],
      ['smile', 'Rem lent me her maid uniform pattern! It\'s so detailed! She\'s a genius.'],
      ['blush', 'I keep thinking about you when I sew. Is that... no, forget it!'],
    ],
    giftLines: {
      loved: [['love', "NO WAY! This is perfect for my next cosplay! I love you! ...I-I mean I love IT!"]],
      liked: [['happy', 'Aww, so cute! Thank you!']],
      neutral: [['smile', "Oh, thanks! ...What is it?"]],
      disliked: [['sad', "Um... I don't really get this one. Sorry!"]],
    },
    dateLines: {
      mall: ['love', 'Shopping date! Okay, hold my bags. And tell me which outfit is cuter. Be honest!'],
      arcade: ['happy', "The magical-girl crane game!! If you win me the Shizuku-tan figure I'll literally cry."],
      beach: ['happy', "Swimsuit season! ...Don't stare too hard, okay? Okay, maybe a little."],
      onsen: ['love', "Hot springs together?! This is like a full-on anime episode. I'm so into it."],
      cafe: ['smile', "This parfait is so cute it's illegal. Take a photo of me with it!"],
      park: ['smile', 'The sakura would be the perfect backdrop for a cosplay shoot... Wanna be my photographer?'],
      flowers: ['smile', "So many colors! I'm using these for a costume palette."],
      cape: ['smile', 'The lighthouse is so cinematic! Like the final episode of an anime.'],
      shrine: ['neutral', 'Shrines are kinda quiet... wait, a fox shrine-maiden costume would be SO cute.'],
    },
    moments: [
      { q: [['smile', 'Say cheese! ...Wait, you blinked. Again!']], opts: [
        { t: '(Pose with a peace sign.)', v: 7, r: [['love', 'PERFECT! This is my new lock screen.']] },
        { t: 'Just one more.', v: 4, r: [['happy', 'Okay, one more. ...And one more.']] },
        { t: 'I hate photos.', v: -2, r: [['sad', 'Boo.']] },
      ] },
      { q: [['blush', 'If I cosplayed your favorite character... who would it be?']], opts: [
        { t: "You. You're already my favorite.", v: 8, r: [['love', "...That doesn't even make sense. ...I love it."]] },
        { t: 'A magical girl.', v: 5, r: [['happy', 'Good choice! I already have the wand!']] },
        { t: 'Nobody.', v: -2, r: [['sad', '...Rude.']] },
      ] },
      { q: [['happy', "Let's share these fries! The ketchup ones are mine."]], opts: [
        { t: '(Feed her a fry.)', v: 6, r: [['blush', '...Mmm. Okay, that was kinda romantic.']] },
        { t: 'Take them all.', v: 3, r: [['happy', "You're spoiling me!"]] },
        { t: "I'll eat them first.", v: -2, r: [['sad', 'Hey!']] },
      ] },
    ],
    events: [
      { title: 'The Costume', lines: [
        ['n', 'You find Marin in an empty classroom, surrounded by fabric scraps. Her eyes are red.'],
        ['sad', "I ruined it. The costume for the convention. I measured wrong and now it doesn't fit."],
        ['sad', "Everyone thinks it's just dress-up... but I put my whole heart into these."],
      ], opts: [
        { t: "Let's fix it together. I'll hold the pins.", v: 8, r: [['love', "...You'd really stay up with me?"], ['n', 'You work until midnight. The costume fits perfectly.']] },
        { t: 'Your heart shows in every stitch.', v: 7, r: [['blush', '...Thank you. I needed to hear that.']] },
        { t: 'Just buy one.', v: -2, r: [['sad', "...You don't get it."]] },
      ] },
      { title: 'Convention Day', lines: [
        ['n', 'At the convention, Marin steps out in her finished costume. Cameras flash from every direction.'],
        ['happy', '{name}! Over here! Take one with me!'],
        ['blush', '...Hey. Out of everyone here, your photo is the one I wanted most.'],
      ], opts: [
        { t: "You look like a real magical girl. You're amazing.", v: 8, r: [['love', "...I'm gonna remember this day forever."]] },
        { t: "Let's take a hundred more.", v: 6, r: [['happy', 'A hundred? Make it a thousand!']] },
        { t: 'There are a lot of people...', v: 0, r: [['neutral', '...Yeah. I guess.']] },
      ] },
    ],
    confess: {
      ask: [['p', 'Marin. I really, really like you. Not as a friend.']],
      yes: [
        ['surprised', '...Wait. Wait wait wait.'],
        ['blush', 'You mean like... LIKE like? Like a shoujo-manga confession?'],
        ['love', "...Me too! I've liked you for SO long! I've been dying over here!"],
        ['happy', "Okay! We're dating! I'm making us matching cosplays!"],
      ],
      no: [
        ['blush', "W-whoa, wait! That's so sudden!"],
        ['neutral', 'I really like you, but... I want someone who can keep up with my weird hobby AND help me study for exams. Hang out with me more first, okay?'],
      ],
    },
    gfLines: [
      ['love', '{name}! I made us couple keychains! Yours is the magical boy!'],
      ['happy', 'Come over tonight? I need a model for measurements. ...And cuddles.'],
      ['blush', "I told everyone at school we're dating. Was that okay? It's too late anyway!"],
      ['love', "You're my favorite character. Forever."],
    ],
    ending: 'Under the convention lights, Marin pulls you into one last photo in your matching cosplays. "You know what the best part of today was?" she grins, cheeks bright pink. "Not the costumes. It was you looking at me like that. Let\'s make a thousand more memories, okay?"',
  };

  // ----------------------------------------------------------------- KRUL
  GIRLS.krul = {
    name: 'Krul',
    full: 'Krul Tepes',
    color: '#d8406a',
    bio: 'A centuries-old vampire queen who lives in the attic of the Clock Tower and only comes out after sunset. Haughty, calls everyone "human"... and secretly very lonely.',
    stranger: 'the pink-haired girl in the black cape',
    schedule: {
      weekday: [[360, 'clocktower'], [1080, 'shrine'], [1260, 'cape'], [1440, 'clocktower']],
      weekend: [[360, 'clocktower'], [960, 'antiques'], [1140, 'park'], [1320, 'cape'], [1500, 'clocktower']],
    },
    req: { fitness: 30, smarts: 30 },
    reqText: 'Fitness 30 & Smarts 30',
    gifts: { tomatojuice: 'loved', ribbon: 'loved', clock: 'loved', perfume: 'liked', chocolate: 'liked', bigplush: 'liked', shades: 'liked', flowers: 'disliked', tangerines: 'disliked' },
    dates: { cape: 'loved', shrine: 'loved', onsen: 'ok', cafe: 'ok', arcade: 'ok', mall: 'ok', park: 'ok', flowers: 'meh', beach: 'meh' },
    intro: [
      ['n', 'A small girl in a black cape stands in the shade, watching you with glowing red eyes. Something sharp glints when she smiles.'],
      ['smug', 'Hm. A human, wandering about without fear. How amusing.'],
      ['calm', "I am Krul Tepes, third progenitor and queen of the vampires. You may bow."],
      ['p', "I'm {name}. ...Should I actually bow?"],
      ['smile', "Ha! Bold. I'll remember your name, {name}. For now."],
    ],
    topics: [
      { min: 0, q: [['smug', 'Tell me, human. Are you not afraid of me?']], opts: [
        { t: "Not really. You seem kind of lonely.", v: 6, r: [['surprised', '...Lonely? Insolent. ...Perceptive, but insolent.']] },
        { t: 'A little. You have fangs.', v: 3, r: [['smug', 'Good. A little fear is healthy.']] },
        { t: "You're just a kid.", v: -4, r: [['sad', 'I am over eight hundred years old. Watch your tongue.']] },
      ] },
      { min: 0, q: [['calm', 'Humans love the sun. I find it rude. Do you prefer the day or the night?']], opts: [
        { t: "The night. It's quieter, and the stars are out.", v: 6, r: [['smile', "Finally, a human with taste."]] },
        { t: 'Both have their charm.', v: 3, r: [['neutral', 'A diplomatic answer. How boring.']] },
        { t: 'Day, obviously. Sunshine is great.', v: -2, r: [['sad', 'Ugh. Go away and tan, then.']] },
      ] },
      { min: 0, q: [['neutral', 'What do you humans drink when you are thirsty? Something red, I hope.']], opts: [
        { t: 'Tomato juice?', v: 6, r: [['happy', "...Tomato juice. Yes. It's acceptable. Barely. I'm not excited."]] },
        { t: 'Water, mostly.', v: 2, r: [['neutral', 'How plain.']] },
        { t: 'Garlic soup.', v: -4, r: [['sad', '...Are you trying to kill me?']] },
      ] },
      { min: 20, q: [['calm', 'I have ruled for centuries. Do you know how many people have stayed by my side?']], opts: [
        { t: "I'll stay. As long as you let me.", v: 7, r: [['blush', "...Don't make promises a human can't keep. ...But I'll hold you to it."]] },
        { t: 'Not many, I guess.', v: 3, r: [['neutral', 'None. Not one. ...Now you know.']] },
        { t: 'You should be nicer to people.', v: -2, r: [['sad', 'Hmph. Lecture someone else.']] },
      ] },
      { min: 20, q: [['smug', 'Carry my parasol, human. The moon is too bright tonight.']], opts: [
        { t: "(Hold the parasol for her.)", v: 6, r: [['smile', "Good. You make a fine servant. ...A fine companion."]] },
        { t: "The moon can't burn you.", v: 2, r: [['smug', "Details. Carry it anyway."]] },
        { t: 'Carry it yourself.', v: -3, r: [['sad', '...Rude.']] },
      ] },
      { min: 45, q: [['blush', "...Human. If I asked you for a little blood, would you give it?"]], opts: [
        { t: "If it's you... just a little.", v: 8, r: [['love', "...You idiot. I'd never take it. I only wanted to know your answer."]] },
        { t: 'Would tomato juice work instead?', v: 4, r: [['smile', "Heh. You're learning."]] },
        { t: 'Absolutely not.', v: -2, r: [['neutral', '...Reasonable. Disappointing, but reasonable.']] },
      ] },
      { min: 45, q: [['calm', "Mirrors don't show me. Tell me, human... what do I look like right now?"]], opts: [
        { t: 'Beautiful. And a little sad.', v: 8, r: [['blush', "...Nobody has told me that in a very long time."]] },
        { t: 'Like a queen.', v: 5, r: [['smug', 'Naturally.']] },
        { t: 'Small.', v: -3, r: [['sad', 'I will bite you.']] },
      ] },
      { min: 65, q: [['blush', "My heart doesn't beat, you know. ...So why does it ache when you leave?"]], opts: [
        { t: "Because you love me. And I love you too.", v: 8, r: [['love', '...Say that again. Slowly.']] },
        { t: 'Maybe it remembers how.', v: 5, r: [['blush', "...Poetic. Don't get used to it."]] },
        { t: 'Indigestion?', v: -3, r: [['sad', '...I hate you. A little.']] },
      ] },
    ],
    small: [
      ['smug', "The Clock Tower attic is mine now. The pigeons pay rent in tribute."],
      ['calm', "I tried the shrine at night. Aqua screamed and threw holy water at me. It was tap water."],
      ['neutral', "Kurumi has a lovely collection of clocks. I'm plotting to steal one."],
      ['smile', 'The lighthouse beam goes round and round. I like watching it more than I should.'],
      ['blush', "I waited for you at sunset. ...I wasn't waiting. I was standing there."],
    ],
    giftLines: {
      loved: [['love', "...This is for me? Ha. A tribute worthy of a queen. ...Thank you, {name}."]],
      liked: [['smile', 'Hm. Acceptable. I shall keep it.']],
      neutral: [['neutral', 'What is this? ...I suppose I will take it.']],
      disliked: [['sad', 'Flowers? They wilt and die. How depressing. Take them back.']],
    },
    dateLines: {
      cape: ['love', 'The sea at night, the lighthouse turning, and you. This is a fine kingdom.'],
      shrine: ['smile', 'A shrine at midnight. The spirits are restless. ...Hold my hand, in case they are rude.'],
      onsen: ['blush', '...Hot water. Vampires do not sweat. ...I am not blushing. It is the steam.'],
      cafe: ['neutral', "Coffee. Bitter, dark, keeps humans awake at night. I approve."],
      arcade: ['smug', 'These machines are rigged. I will win anyway.'],
      mall: ['smile', 'I need a new parasol. Black, with lace. You will choose it.'],
      park: ['calm', 'Sakura petals in moonlight... I suppose humans did one thing right.'],
      flowers: ['neutral', 'So many flowers. So much... sunlight. Can we leave?'],
      beach: ['sad', 'The beach. In the daytime. Are you trying to turn me to ash?'],
    },
    moments: [
      { q: [['smug', 'Kneel, human. I want to rest my hand on your head.']], opts: [
        { t: '(Kneel.)', v: 7, r: [['love', '...Good. ...Stay like this a while.']] },
        { t: "Only if I can pat yours too.", v: 4, r: [['blush', "...Insolent. ...Fine."]] },
        { t: "I'm not kneeling.", v: -2, r: [['sad', 'Hmph.']] },
      ] },
      { q: [['calm', 'The moon is full tonight. In the old days, I would have hunted.']], opts: [
        { t: "Tonight, you can just walk with me.", v: 8, r: [['love', '...Yes. I think I prefer that now.']] },
        { t: 'Want some tomato juice?', v: 5, r: [['smile', 'You always have tomato juice. ...I like that about you.']] },
        { t: "That's terrifying.", v: -1, r: [['smug', 'Good.']] },
      ] },
      { q: [['blush', 'Your hand is warm. ...Mine is cold. Does it bother you?']], opts: [
        { t: "I'll keep it warm for you.", v: 8, r: [['love', '...Then never let go.']] },
        { t: "It's refreshing in summer.", v: 4, r: [['smug', 'I am not an ice pack.']] },
        { t: 'A little.', v: -2, r: [['sad', '...I see.']] },
      ] },
    ],
    events: [
      { title: 'The Empty Throne', lines: [
        ['n', 'At the top of the Clock Tower, Krul sits on an old velvet chair she dragged up the stairs, looking out over the sleeping town.'],
        ['calm', 'I had a castle once. Servants. Armies. A whole city that bowed to me.'],
        ['sad', "...And not a single person who stayed because they wanted to."],
      ], opts: [
        { t: "I'm here because I want to be.", v: 8, r: [['blush', '...You are a very strange human.'], ['n', 'She shifts over on the chair, leaving just enough room for you.']] },
        { t: 'This town could be your new kingdom.', v: 6, r: [['smile', '...A kingdom of pigeons and one stubborn human. Not bad.']] },
        { t: "Sounds like you were a bad boss.", v: -2, r: [['sad', '...Perhaps.']] },
      ] },
      { title: 'Sunrise', lines: [
        ['n', 'You lose track of time talking at the cape. The sky in the east is turning pale.'],
        ['surprised', "The sun! I... I have to go. Now."],
        ['sad', "...But I don't want to. Isn't that ridiculous? Eight hundred years and I don't want the night to end."],
      ], opts: [
        { t: '(Wrap your coat around her and walk her home.)', v: 8, r: [['love', "...Fool. ...Thank you. I'll never forget this morning."]] },
        { t: "Then we'll meet again tonight. And every night.", v: 6, r: [['smile', 'Every night. ...I accept your oath.']] },
        { t: 'You should go, then.', v: 0, r: [['neutral', '...Yes. Goodbye.']] },
      ] },
    ],
    confess: {
      ask: [['p', 'Krul. I love you. Not as a servant. As the person who wants to stay by your side forever.']],
      yes: [
        ['surprised', '...'],
        ['blush', "Forever is a very long time for a vampire. And very short for a human."],
        ['love', "...But I'll take every single day you give me. You are mine now, {name}. And I am yours."],
        ['smug', 'Do not tell anyone the queen of vampires is blushing.'],
      ],
      no: [
        ['smug', 'Ha! A human, confessing to a queen.'],
        ['neutral', 'You will need a stronger body and a sharper mind to stand beside me. Train. Study. Then ask again... if you dare.'],
      ],
    },
    gfLines: [
      ['love', "There you are. I counted the minutes until sunset. ...I don't count. You saw nothing."],
      ['smug', 'Tonight you will walk me to the lighthouse. That is a royal decree.'],
      ['blush', "I bought two cups of tomato juice. One is for you. ...Drink it."],
      ['love', 'My cold heart is yours, {name}. Treat it well.'],
    ],
    ending: 'On the roof of the Clock Tower, under a sky full of stars, Krul rests her head on your shoulder and wraps you both in her cape. "Eight hundred years of nights," she whispers, "and this is the first one I never want to end. Stay with me, {name}. Every night, for as long as you live."',
  };

  // Hot spring dates (bathing together, in towels).
  GIRLS.nami.dates.onsen = 'ok'; GIRLS.nami.dateLines.onsen = ['blush', 'Th-the hot spring together?! ...Fine. But no peeking! ...Okay, it\'s actually really nice.'];
  GIRLS.aqua.dates.onsen = 'loved'; GIRLS.aqua.dateLines.onsen = ['love', 'Hot water is still water! My element! Ahhh... this is heaven...'];
  GIRLS.yumeko.dates.onsen = 'loved'; GIRLS.yumeko.dateLines.onsen = ['smug', 'Ufufu, sharing a bath... What a delightfully risky proposal. I accept.'];
  GIRLS.kurumi.dates.onsen = 'loved'; GIRLS.kurumi.dateLines.onsen = ['blush', 'Ara ara~ How bold of you, {name}. ...The water is lovely. Stay close.'];
  GIRLS.rem.dates.onsen = 'loved'; GIRLS.rem.dateLines.onsen = ['blush', 'Rem will wash {name}-kun\'s back! ...I-if that\'s alright!'];
  GIRLS.zerotwo.dates.onsen = 'loved'; GIRLS.zerotwo.dateLines.onsen = ['love', 'Darling came to the onsen with me! Let\'s stay until we turn into prunes~'];
  GIRLS.frieren.dates.onsen = 'loved'; GIRLS.frieren.dateLines.onsen = ['smile', 'Hot springs... I\'ve visited about four hundred. This one is the best. ...Because of the company.'];

  // ------------------------------------------------------------ weather
  // Rolled each morning (tomorrow's is on the TV at home).
  const WEATHER = {
    sunny: { name: 'Sunny', icon: '☀️', weight: 45 },
    cloudy: { name: 'Cloudy', icon: '☁️', weight: 20 },
    rain: { name: 'Rain', icon: '🌧️', weight: 20, wet: true },
    storm: { name: 'Thunderstorm', icon: '⛈️', weight: 8, wet: true },
    blossom: { name: 'Sakura blizzard', icon: '🌸', weight: 7 },
  };
  // Where girls shelter when it rains, instead of an outdoor spot.
  const RAIN_SHELTER = { park: 'cafe', beach: 'arcade', plaza: 'mall', shrine: 'cafe', flowers: 'bakery', cape: 'maidcafe', lake: 'antiques' };

  // ------------------------------------------------------- interactions
  // One per girl per day, from the "Interact" menu. `min` = affection
  // needed; `gf` = girlfriends only.
  const INTERACTIONS = [
    { id: 'compliment', label: 'Compliment her', icon: '🌷', min: 0 },
    { id: 'joke', label: 'Tell a joke', icon: '😆', min: 0 },
    { id: 'tease', label: 'Tease her', icon: '😏', min: 20 },
    { id: 'pat', label: 'Pat her head', icon: '🤚', min: 45 },
    { id: 'hands', label: 'Hold hands', icon: '🤝', min: 65 },
    { id: 'hug', label: 'Hug her', icon: '🤗', min: 90 },
    { id: 'kiss', label: 'Kiss her', icon: '💋', gf: true },
  ];

  const EXTRA = {
    nami: {
      birthday: 7,
      birthdayLines: [['love', "You remembered my birthday?! ...Okay, you're officially my favorite customer. Forever."]],
      react: {
        compliment: ['blush', "Flattery, huh? ...Keep going. It's free, so I'll allow it.", 3],
        joke: { ok: ['happy', "Pfft— ahaha! That's so dumb! Tell me another one!", 4], fail: ['neutral', "...That joke costs you ¥100. No refunds.", -1] },
        tease: ['smug', "Oh, you want to play THAT game? You're on, {name}!", 4],
        pat: ['blush', "H-hey! I'm not a cat! ...Okay, five more seconds.", 4],
        hands: ['blush', "Your hand's warm... Don't let go yet, okay?", 5],
        hug: ['love', "...Mm. You smell like the sea breeze. I like it.", 6],
        kiss: ['love', "...That one's free. The next one costs a date. ♥", 4],
      },
      weather: {
        rain: [['sad', 'Rain again... no customers, no tips. Wanna keep me company for a bit?']],
        storm: [['surprised', '*KRAKOOM* ...! Ah! Th-that was close!'], ['blush', "Can you... stay here until it stops? Just for a bit. Don't laugh."], ['n', 'You stay beside Nami until the thunder fades. She never lets go of your sleeve.']],
        blossom: [['happy', "A sakura blizzard! It's like the whole town is celebrating! I'm drawing this on my map!"]],
      },
      weatherBonus: { storm: 8 },
      encounters: [
        { lines: [['happy', 'Hey, {name}! Catch!'], ['n', 'Nami tosses you a tangerine.']], item: 'tangerines' },
        { lines: [['smug', 'Fancy meeting you here! Are you following me? That costs extra, you know.']] },
        { lines: [['happy', "I found a shortcut behind the shops! I'll show you sometime— ah, I'm late! Bye!"]] },
      ],
      invitePlaces: ['beach', 'park', 'plaza'],
      invite: '🍊 Nami: Hey! Meet me at {place} around {time}? I have something to show you!',
      inviteMeet: [['happy', 'You came! I knew you would.'], ['blush', "I wanted to show you this view... It's going on my map, next to you."]],
      inviteMissed: "🍊 Nami: You stood me up yesterday... I waited, you know. 😤",
    },
    aqua: {
      birthday: 14,
      birthdayLines: [['love', "An offering on the goddess's birthday?! You are the most devoted worshipper in history!"]],
      react: {
        compliment: ['smug', "Of course I'm beautiful! I'm a goddess! ...Say it again, though.", 4],
        joke: { ok: ['happy', 'Ahahaha! A mortal with a sense of humor! I shall allow it!', 3], fail: ['sad', "...I don't get it. Is it a holy joke? Explain it!", -1] },
        tease: ['sad', 'W-why would you say that to a goddess?! Waaah!', -2],
        pat: ['love', 'Hehe... more. More! The goddess demands more pats!', 6],
        hands: ['blush', 'H-holding hands with a goddess is a great honor, you know...', 5],
        hug: ['love', "Waaah, you're so warm! I'm never letting go! Never!", 6],
        kiss: ['love', 'A blessing from the goddess! ...And one for you too. ♥', 4],
      },
      weather: {
        rain: [['happy', 'Rain! My element blesses the land! Bow before the downpour, mortal!']],
        storm: [['surprised', 'Th-thunder is NOT my element! Hide me! Hide me!']],
        blossom: [['love', 'The petals dance for their goddess! Isn\'t it beautiful?']],
      },
      weatherBonus: { rain: 5 },
      encounters: [
        { lines: [['smug', 'Mortal! The goddess has blessed this soda for you!'], ['n', 'Aqua hands you a slightly warm soda.']], item: 'soda' },
        { lines: [['sad', "Have you seen a goldfish around here? ...Asking for a friend."]] },
        { lines: [['happy', '{name}! A goddess needs an escort! ...Oh, you\'re busy? Next time, then!']] },
      ],
      invitePlaces: ['park', 'plaza', 'beach'],
      invite: '💧 Aqua: Mortal! The goddess summons you to {place} at {time}. Bring snacks!',
      inviteMeet: [['happy', 'You answered the divine summons! Good, good.'], ['blush', "...I just wanted to see you. Is that so wrong for a goddess?"]],
      inviteMissed: '💧 Aqua: You IGNORED a divine summons?! I waited ALL afternoon! 😭',
    },
    yumeko: {
      birthday: 21,
      birthdayLines: [['love', "My birthday... I bet no one would remember. Ufufu, I've never been so happy to lose a bet."]],
      react: {
        compliment: ['smile', 'Ufufu, how sweet. Now tell me something I don\'t know.', 2],
        joke: { ok: ['happy', "Ufufu~ Unexpected. I didn't see that punchline coming.", 4], fail: ['smug', 'I gave that joke a 60% chance of being funny. It was not.', -1] },
        tease: ['smug', 'Oh my, are you challenging me? How delightfully reckless.', 5],
        pat: ['surprised', "...! I wasn't expecting that. ...You may continue.", 4],
        hands: ['blush', 'Your pulse is racing. ...So is mine. How interesting.', 5],
        hug: ['love', "Hold me a little longer. That's not a request — it's a bet you already won.", 6],
        kiss: ['love', 'Ufufu... the sweetest gamble I have ever won. ♥', 4],
      },
      weather: {
        rain: [['smile', 'Rainy days are perfect for cards. Fancy a game indoors?']],
        storm: [['smug', "Lightning... nature's own gamble. I adore storms. Don't you?"]],
        blossom: [['smile', 'Petals everywhere... The odds of one landing in your hair were one in three. And look.']],
      },
      weatherBonus: { storm: 5 },
      encounters: [
        { lines: [['smug', 'Pick a card, any card. ...The queen of hearts? Ufufu, of course it was.']] },
        { lines: [['smile', "I hoped I'd run into you. The odds were good."], ['n', 'Yumeko slips a mystery novel into your hands. "I finished it. Your turn."']], item: 'book' },
        { lines: [['smile', 'Out for a walk? So am I. What a coincidence~']] },
      ],
      invitePlaces: ['plaza', 'park', 'cafe'],
      invite: '🎲 Yumeko: I wager you\'ll come to {place} at {time}. Don\'t make me lose~',
      inviteMeet: [['smug', 'Ufufu. I win.'], ['blush', "...I'm glad you came. Truly. That part wasn't a game."]],
      inviteMissed: '🎲 Yumeko: I lost yesterday\'s bet. I don\'t enjoy losing to you like that.',
    },
    kurumi: {
      birthday: 3,
      birthdayLines: [['love', 'Ara... You remembered my birthday? ...You\'ll make me fall for you at this rate.']],
      react: {
        compliment: ['smug', 'Ara ara~ Flattery will get you everywhere, {name}.', 3],
        joke: { ok: ['happy', 'Ufufufu! Oh, that was terrible. I love it.', 4], fail: ['neutral', '...Time stopped. Not in a good way.', -1] },
        tease: ['blush', 'T-teasing ME? How dare you. ...Do it again.', 4],
        pat: ['blush', '...I am not a cat. ...Purr. I said nothing.', 5],
        hands: ['blush', 'Your hand is warm... I\'ll hold on to it. For a while.', 5],
        hug: ['love', "...Don't let go yet. Just a few more seconds. ...A few more.", 6],
        kiss: ['love', 'Ufufu~ That stopped my heart for a moment. ♥', 4],
      },
      weather: {
        rain: [['smile', 'Rain on the clock tower windows is my favorite sound. Join me sometime.']],
        storm: [['smug', 'Ara, lightning. How dramatic. I approve.']],
        blossom: [['love', 'Petals everywhere... Time feels frozen. Don\'t move. Let me remember this.']],
      },
      weatherBonus: { rain: 4 },
      encounters: [
        { lines: [['smug', 'Ara ara, fancy meeting you here~ ...I was not following you. Much.']] },
        { lines: [['happy', 'A stray cat let me pet it! Look, look! ...Ahem. Good afternoon.']] },
        { lines: [['smile', 'Here. Chocolate. I bought two by accident.'], ['n', 'Kurumi presses a box of chocolates into your hands.']], item: 'chocolate' },
      ],
      invitePlaces: ['cape', 'shrine', 'park'],
      invite: '🕰️ Kurumi: Meet me at {place} at {time}. Don\'t be late — I\'ll know.',
      inviteMeet: [['smug', 'Right on time. Ufufu, good.'], ['blush', 'I wanted to watch the sky change color with you. That\'s all.']],
      inviteMissed: '🕰️ Kurumi: I waited, you know. Time doesn\'t stop for anyone. Not even you.',
    },
    rem: {
      birthday: 10,
      birthdayLines: [['love', 'A gift on Rem\'s birthday...? Rem will cry. Rem is crying. Thank you!']],
      react: {
        compliment: ['blush', 'Rem...? Thank you, {name}-kun. Rem will work even harder!', 4],
        joke: { ok: ['happy', 'Hehe! {name}-kun is so funny!', 4], fail: ['neutral', '...Rem will laugh to be polite. Ha. Ha.', -1] },
        tease: ['sad', 'Rem... did something wrong?', -2],
        pat: ['love', 'Ehehe... Rem\'s sister used to do this. It feels so nice...', 6],
        hands: ['blush', "{name}-kun's hand... Rem won't let go.", 5],
        hug: ['love', 'Rem is so happy... Please stay like this a little longer.', 6],
        kiss: ['love', 'Rem... Rem loves you so much. ♥', 4],
      },
      weather: {
        rain: [['smile', 'Rem brought an extra umbrella, just in case {name}-kun forgot one.']],
        storm: [['neutral', 'Please stay inside, {name}-kun. Rem will make you warm tea.']],
        blossom: [['happy', 'Rem made sakura mochi for the hanami! Please have some!']],
      },
      weatherBonus: { storm: 5 },
      encounters: [
        { lines: [['smile', '{name}-kun! Rem made too many cookies. Please take some!'], ['n', 'Rem hands you a little bag. It smells like strawberries.']], item: 'crepe' },
        { lines: [['happy', 'Rem is shopping for the café. Do you want anything? ...Rem will buy it for you.']] },
        { lines: [['blush', 'Good day, {name}-kun. Rem was... just passing by. Not looking for you.']] },
      ],
      invitePlaces: ['flowers', 'park', 'plaza'],
      invite: '💙 Rem: {name}-kun, Rem has a short break. Could we meet at {place} at {time}?',
      inviteMeet: [['happy', '{name}-kun came! Rem is so happy!'], ['blush', 'Rem made a little lunch. Please eat it with Rem.']],
      inviteMissed: '💙 Rem: Rem waited... It\'s alright. Rem understands {name}-kun is busy.',
    },
    zerotwo: {
      birthday: 17,
      birthdayLines: [['love', "You knew it was my birthday? Darling! You're the best darling ever!"]],
      react: {
        compliment: ['smug', 'Obviously. But say it again, louder.', 3],
        joke: { ok: ['happy', "Ahahaha! That was so dumb! Again!", 4], fail: ['neutral', 'Darling... that was awful.', -1] },
        tease: ['smug', "Oh, you wanna play? I'll win. I always win.", 5],
        pat: ['blush', "H-hey! Don't touch the horns! ...Okay, between them is fine.", 4],
        hands: ['happy', 'Finally! I was waiting forever, darling.', 5],
        hug: ['love', 'Mmm. Warm. You smell like the sea. Stay.', 6],
        kiss: ['love', 'Sweeter than honey. Darling. ♥', 4],
      },
      weather: {
        rain: [['sad', 'Rain means no flying, no beach, no fun. Entertain me, darling.']],
        storm: [['happy', "Thunder! Isn't it exciting? Let's go stand on the cliff! ...Fine, we'll stay inside."]],
        blossom: [['smile', "It's raining flowers! Catch one for me, darling!"]],
      },
      weatherBonus: { blossom: 4 },
      encounters: [
        { lines: [['happy', 'Darling! I stole an extra jar of honey from the bakery. Share it with me!'], ['n', 'Zero Two shoves a jar of honey into your hands.']], item: 'honey' },
        { lines: [['smug', 'Caught you! ...You weren\'t even running. Boring!']] },
        { lines: [['smile', "Race you to the lighthouse! ...Later. I'm busy now. Bye, darling!"]] },
      ],
      invitePlaces: ['cape', 'beach', 'flowers'],
      invite: '🍯 Zero Two: Darling! {place}, {time}. Be there or I\'ll find you anyway~',
      inviteMeet: [['happy', 'Darling! You came!'], ['love', 'I wanted to show you the view. And see you. Mostly see you.']],
      inviteMissed: '🍯 Zero Two: You stood me up, darling. I\'m mad. Very mad. Buy me honey.',
    },
    frieren: {
      birthday: 24,
      birthdayLines: [['love', "My birthday? I'd forgotten. ...You remembered. That's... very human of you. Thank you."]],
      react: {
        compliment: ['blush', "...I don't know what to say. Thank you, I think.", 3],
        joke: { ok: ['smile', "...Heh. That was funny. I'll remember it for a hundred years.", 5], fail: ['neutral', '...I think I need another few centuries to understand that.', -1] },
        tease: ['neutral', '...Was that teasing? I\'ll pretend I didn\'t notice.', 2],
        pat: ['blush', "...I'm a thousand years old. ...You can keep going.", 5],
        hands: ['blush', "Your hand is small. Warm. ...I'll remember this.", 5],
        hug: ['love', '...This is nice. I didn\'t know it would feel this nice.', 6],
        kiss: ['love', "...I want to remember this forever. So do it again. ♥", 4],
      },
      weather: {
        rain: [['neutral', 'There\'s a spell to stop the rain. But I kind of like the sound.']],
        storm: [['neutral', "Lightning. I could catch it. ...Probably shouldn't."]],
        blossom: [['love', 'A sakura blizzard... I\'ve seen hundreds. This one is the best. Because you\'re here.']],
      },
      weatherBonus: { blossom: 6 },
      encounters: [
        { lines: [['neutral', "...Oh. {name}. I was looking at this rock. It's a very good rock."]] },
        { lines: [['smile', 'I found this in a ruin. I already read it. It\'s yours now.'], ['n', 'Frieren hands you a dusty old grimoire.']], item: 'grimoire' },
        { lines: [['neutral', 'I\'m going to the flower field. Want to... no, you\'re busy. Another time.']] },
      ],
      invitePlaces: ['flowers', 'lake', 'shrine'],
      invite: '🌿 Frieren: There\'s something at {place} I want to show you. {time}. If I\'m asleep, wake me.',
      inviteMeet: [['smile', 'You came. ...Good.'], ['blush', "I found a flower that only blooms for an hour. I wanted you to see it with me."]],
      inviteMissed: '🌿 Frieren: The flower closed. It\'s fine. It blooms again in about eighty years.',
    },
    marin: {
      birthday: 5,
      birthdayLines: [['love', "My birthday?! You remembered! Okay, I'm crying. This is canon now."]],
      react: {
        compliment: ['blush', "W-wait, seriously?! You can't just say that!", 4],
        joke: { ok: ['happy', 'PFFT! Ahaha! That was so dumb, I love it!', 4], fail: ['neutral', '...Was that a joke? Like, a real one?', -1] },
        tease: ['smug', "Oh yeah? Well you're a total otaku too, so!", 4],
        pat: ['blush', "Hey! You'll mess up my hair! ...Okay, a little more.", 4],
        hands: ['love', "Eek! Okay, okay, this is fine, I'm fine!", 5],
        hug: ['love', "Mmmh. You smell nice. Like fabric softener. I'm keeping you.", 6],
        kiss: ['love', "...! That's the best panel in the whole manga. ♥", 4],
      },
      weather: {
        rain: [['sad', "Rain ruins my hair! But it's perfect sewing weather."]],
        storm: [['surprised', "Thunder?! I'm NOT scared. I'm just... standing really close to you."]],
        blossom: [['love', 'Sakura blizzard! This is the most anime thing ever!!']],
      },
      weatherBonus: { blossom: 5 },
      encounters: [
        { lines: [['happy', '{name}! Look, I made these for practice! Take one!'], ['n', 'Marin hands you a little ribbon she sewed herself.']], item: 'ribbon' },
        { lines: [['smile', "Hey hey! I'm going to the arcade later. The crane game is calling me!"]] },
        { lines: [['blush', "Oh! {name}! I was literally just thinking about you! ...About asking you something! For cosplay!"]] },
      ],
      invitePlaces: ['mall', 'arcade', 'park'],
      invite: '💖 Marin: {name}!! Meet me at {place} at {time}? I have something SO cool to show you!!',
      inviteMeet: [['happy', 'You came!! Okay, look at this!'], ['love', "...I mostly just wanted to see you. Don't tell anyone."]],
      inviteMissed: "💖 Marin: Hey... I waited. It's fine! ...It's not fine. Make it up to me!",
    },
    krul: {
      birthday: 13,
      birthdayLines: [['blush', "My birthday? I stopped counting centuries ago. ...You counted for me. Fool. ...Thank you."]],
      react: {
        compliment: ['smug', 'Of course I am. But you may say it again.', 3],
        joke: { ok: ['smile', "...Heh. That was almost funny, human.", 4], fail: ['neutral', 'I have heard better jokes from bats.', -1] },
        tease: ['sad', 'Insolent! ...Do it again and I bite.', 2],
        pat: ['blush', "H-how dare you pat the queen! ...Do not stop.", 5],
        hands: ['blush', 'Your hand is so warm... Hold it longer. That is an order.', 5],
        hug: ['love', "...You're warm. I'd forgotten what warm felt like.", 6],
        kiss: ['love', "...No fangs. I promise. ♥", 4],
      },
      weather: {
        rain: [['smile', 'Rain! No sun at all. A perfect day for a vampire. Let us go out.']],
        storm: [['smug', 'Thunder and lightning. My kind of weather.']],
        blossom: [['calm', 'A sakura blizzard. Even I admit it is beautiful. ...From the shade.']],
      },
      weatherBonus: { rain: 4, storm: 4 },
      encounters: [
        { lines: [['smug', 'Human! You may carry this for me.'], ['n', 'Krul shoves a bottle of tomato juice into your hands, then walks off. She bought you one too.']], item: 'tomatojuice' },
        { lines: [['calm', "Ah, it's you. The night is young. Don't waste it."]] },
        { lines: [['blush', "I wasn't waiting at your door. I was... passing by. For an hour."]] },
      ],
      invitePlaces: ['cape', 'shrine', 'park'],
      invite: '🦇 Krul: Human. {place}, {time}. Do not keep the queen waiting.',
      inviteMeet: [['smug', 'You came. Good. I would have hunted you down otherwise.'], ['blush', "...I wanted to see you. That's all. Don't make that face."]],
      inviteMissed: '🦇 Krul: You stood up a queen. Unforgivable. ...Come tomorrow and I may forgive you.',
    },
  };
  for (const [id, extra] of Object.entries(EXTRA)) Object.assign(GIRLS[id], extra);

  // Lines for walking together around town.
  const WALK_LINES = {
    nami: { start: ['happy', "A walk? Sure! I'll lead — I know every shortcut."], fav: ['love', 'The sea breeze... This is the best walk ever.'], favArea: 'beach' },
    aqua: { start: ['smug', 'Very well! You may escort the goddess!'], fav: ['love', "Look at all the blossoms! They're celebrating us walking together!"], favArea: 'park' },
    yumeko: { start: ['smile', 'A stroll? How charming. Lead the way.'], fav: ['love', 'The shrine at dusk... I bet you planned this. Ufufu.'], favArea: 'shrine' },
    kurumi: { start: ['smug', 'A stroll? Ara, how gallant. Lead on~'], fav: ['love', 'The lighthouse at dusk... You remembered. Ufufu.'], favArea: 'cape' },
    rem: { start: ['happy', 'Rem would love to walk with {name}-kun!'], fav: ['love', 'The flower field... Rem\'s favorite place, with Rem\'s favorite person.'], favArea: 'flowers' },
    zerotwo: { start: ['happy', "A walk? Let's run instead! ...Fine, walk."], fav: ['love', 'The sea goes on forever... Just like us, darling.'], favArea: 'beach' },
    frieren: { start: ['smile', "A walk. Sure. Let's go slowly."], fav: ['love', '...The lake. It looks like the one from my first journey. Thank you.'], favArea: 'lake' },
    krul: { start: ['smug', 'A walk? Very well. You may escort me. Stay on the shady side.'], fav: ['love', 'The lighthouse at night... My new favourite kingdom. With my favourite human.'], favArea: 'cape' },
    marin: { start: ['happy', 'A walk? Yes! I need to find new photo spots anyway!'], fav: ['love', "The beach at sunset... this is literally a dating-sim CG. And it's us!"], favArea: 'beach' },
  };

  const GIRL_ORDER = ['nami', 'aqua', 'yumeko', 'kurumi', 'rem', 'zerotwo', 'frieren', 'marin', 'krul'];


  // Staying the night: at your place once she's a Close Friend, at hers once
  // she's your girlfriend. A late-night talk, lights out, breakfast lines.
  const SLEEPOVER = {
    nami: {
      mine: ['blush', "A sleepover at your place? ...Fine, but I'm raiding your fridge. No charge for my company tonight~"],
      hers: ['happy', "My place? Okay! Don't touch my maps, and don't open the closet. It's... organized chaos."],
      arrive: ['happy', "Ooh, so this is your room! Not bad. I'd charge rent for that sofa, though."],
      room: ['smile', 'Welcome to my room! Every map on that wall is somewhere I\'m going to sail one day.'],
      talk: { q: [['smile', 'Hey... if you could go anywhere in the world tomorrow, where would you go?']], opts: [
        { t: "Wherever you're sailing.", r: [['love', '...Smooth. Fine, you can be my navigator\'s assistant.']], v: 6 },
        { t: 'Somewhere with good food.', r: [['happy', 'Hah! A tangerine orchard, then. I know just the one.']], v: 3 },
        { t: 'Honestly? Back to bed.', r: [['sad', "Booo. Where's your sense of adventure?"]], v: -1 },
      ] },
      night: ['blush', 'Lights out... Hey, no snoring, okay? ...Good night, {name}.'],
      nightGf: ['love', "Scoot over. ...Your side's warmer. That's my side now. Good night~"],
      morning: ['happy', 'Morning! I already made coffee. That\'ll be ¥500. ...Kidding! Mostly.'],
    },
    aqua: {
      mine: ['happy', "A sleepover?! Yes! I'll bring snacks. You bring snacks too. ALL the snacks!"],
      hers: ['smug', "You may enter the goddess's sacred chamber! ...Just ignore the empty bottles, okay?"],
      arrive: ['happy', "Your place is tiny! But cozy. I hereby bless it. You're welcome!"],
      room: ['smug', 'Behold, my holy bedroom! The shrine keepers think I meditate in here. Ehehe.'],
      talk: { q: [['smile', "Hey, hey... do you think I'm a REAL goddess? Be honest!"]], opts: [
        { t: 'The realest one I know.', r: [['love', "I KNEW it! You're my favourite follower. My number one!"]], v: 6 },
        { t: 'A goddess of partying, maybe.', r: [['smug', "Partying is a sacred art! ...I'll allow it."]], v: 3 },
        { t: 'Not really, no.', r: [['sad', "Waaah! Heretic! I'm telling the fish!"]], v: -2 },
      ] },
      night: ['blush', "I'm taking the bed because I'm a goddess. ...Good night, {name}. Thanks for having me."],
      nightGf: ['love', 'Goddesses get cold too, you know. So... stay close. Good night~'],
      morning: ['happy', 'Good morning, my faithful! Breakfast offerings are accepted at any time!'],
    },
    yumeko: {
      mine: ['smug', 'Spending the night with you? Ufufu... what a delicious gamble. I accept.'],
      hers: ['smug', 'My room? Bold. I like bold. Come... but leave your poker face at the door.'],
      arrive: ['smile', 'So this is where you sleep. Hmm. A room says so much about a person.'],
      room: ['smug', "Welcome. The cards on the table are marked. I'm joking. ...Or am I?"],
      talk: { q: [['calm', "Let's play a game. Tell me a secret, and I'll tell you one."]], opts: [
        { t: 'I think about you a lot.', r: [['blush', "...That's cheating. You weren't supposed to win that easily."]], v: 6 },
        { t: 'I cheat at rock-paper-scissors.', r: [['happy', "Ahaha! Me too. We're perfect for each other."]], v: 3 },
        { t: "I don't have any secrets.", r: [['sad', 'How boring. Everyone has secrets, {name}.']], v: -1 },
      ] },
      night: ['blush', "Good night, {name}. ...Don't lie awake thinking about me. That's my job."],
      nightGf: ['love', "Hold my hand until I fall asleep. ...That's not a bet. Just a request."],
      morning: ['smile', "Good morning. You talk in your sleep, you know. ...I'll keep what you said to myself. Ufufu."],
    },
    kurumi: {
      mine: ['smug', 'Ara ara~ inviting a lady to spend the night? How very brave of you.'],
      hers: ['smug', "My room? Kihihi... Very well. Mind the clocks. They're all watching."],
      arrive: ['smile', 'Your room ticks so quietly. No clocks? How do you know how much time you have left?'],
      room: ['smug', "Welcome to my little tower of time. Every clock in here tells a different hour. Lovely, isn't it?"],
      talk: { q: [['calm', 'If you could stop time, {name}... which moment would you keep forever?']], opts: [
        { t: 'This one, right now.', r: [['blush', "...Oh my. That's an unfair answer. I can't even tease you for it."]], v: 6 },
        { t: 'The first time we met.', r: [['smile', 'Ufufu. You remember it too? How sweet.']], v: 3 },
        { t: "I'd skip ahead to breakfast.", r: [['sad', 'Hmph. Barbarian. Time is not for skipping.']], v: -2 },
      ] },
      night: ['blush', "Good night, {name}. Sleep well... and don't be frightened if you hear ticking."],
      nightGf: ['love', "Stay right here until morning. ...This is one moment I'd like to keep."],
      morning: ['smile', 'Good morning~ Seven hours, twelve minutes and three seconds. I counted. Every one of them was nice.'],
    },
    rem: {
      mine: ['blush', "A-an overnight stay? Rem... Rem would be happy to. She'll make breakfast!"],
      hers: ['smile', "Rem's room is above the café. It's small, but she keeps it very clean!"],
      arrive: ['smile', 'Rem will tidy up a little before bed. ...You missed a spot. Several spots.'],
      room: ['blush', "Welcome to Rem's room. Please excuse the teacups. There are... quite a lot of teacups."],
      talk: { q: [['calm', 'Is there anything Rem can do for you? Anything at all?']], opts: [
        { t: 'Just stay with me tonight.', r: [['love', '...Then Rem will. Tonight, and as many nights as you like.']], v: 6 },
        { t: 'Your cooking is more than enough.', r: [['happy', 'Then Rem will make you a feast tomorrow!']], v: 3 },
        { t: 'Clean my whole house?', r: [['sad', "...Rem is not a cleaning service when she's off duty."]], v: -1 },
      ] },
      night: ['blush', 'Good night, {name}. Rem will wake you with tea at seven.'],
      nightGf: ['love', 'Rem is the happiest girl in the world right now. ...Good night, my hero.'],
      morning: ['happy', 'Good morning! Tea, rice, miso soup and tamagoyaki. Rem has been up since five!'],
    },
    zerotwo: {
      mine: ['smug', "A sleepover at darling's place? You don't have to ask me twice~"],
      hers: ['smug', "Come up to my room, darling. I'll even share my honey. Maybe."],
      arrive: ['happy', 'So this is your nest, darling! It smells like you. I like it.'],
      room: ['smile', 'My room! Honey jars, a window full of sky, and now you. Perfect.'],
      talk: { q: [['calm', 'Hey, darling... would you still stay with me if I really were a monster?']], opts: [
        { t: 'Even then. Especially then.', r: [['love', '...Darling. You really are my darling.']], v: 6 },
        { t: 'Monsters like honey too, right?', r: [['happy', 'Ahaha! Right! You get it.']], v: 3 },
        { t: "I'd run away.", r: [['sad', "...Heh. Everyone says that. I hoped you'd be different."]], v: -2 },
      ] },
      night: ['smug', "I'm stealing the blanket. ...Kidding. Good night, darling."],
      nightGf: ['love', "Hold me, darling. If you let go, I'll bite. ...Gently."],
      morning: ['happy', "Morning, darling! I ate your breakfast. And mine. I'll make it up to you."],
    },
    frieren: {
      mine: ['calm', "An overnight stay. Hm. I'll bring my nightcap. I can't sleep twelve hours without it."],
      hers: ['calm', 'My room is above the shop. There are a lot of grimoires. Try not to wake them.'],
      arrive: ['neutral', "Your room. It's very human. Small, warm, temporary. ...I like it."],
      room: ['smile', "This is my room. I've read every book in here at least twice. Some of them were boring both times."],
      talk: { q: [['calm', 'Humans live such short lives. Do you ever think about what you\'ll leave behind?']], opts: [
        { t: 'Good memories. With you.', r: [['blush', "...That's a spell even I can't cast. Thank you, {name}."]], v: 6 },
        { t: 'A really big pile of laundry.', r: [['smile', "Pfft. ...That was funny. I'll remember it for a few centuries."]], v: 3 },
        { t: 'Not really.', r: [['calm', 'I see. ...You should. Time goes faster than you think.']], v: -1 },
      ] },
      night: ['calm', "Good night. If I'm not awake by noon, don't worry. That's normal."],
      nightGf: ['blush', '...Your hand is warm. A thousand years, and this is the nicest spell I\'ve found. Good night.'],
      morning: ['calm', "...Five more minutes. ...Fine. Good morning, {name}. You were still here. That's nice."],
    },
    marin: {
      mine: ['happy', "A sleepover?! I'm bringing face masks and the whole Shizuku-tan box set!"],
      hers: ['blush', "My place? It's kinda messy... there's fabric everywhere. Don't judge!"],
      arrive: ['happy', 'Your room is so clean! Is this what a normal room looks like?!'],
      room: ['smile', "Welcome to my studio! The mannequin doesn't bite. ...Probably."],
      talk: { q: [['calm', 'Hey... can I tell you something kinda embarrassing?']], opts: [
        { t: "Anything. I'd never laugh.", r: [['love', '...I used to think nobody would like the real me. The otaku me. But you do.']], v: 6 },
        { t: 'Is it about anime?', r: [['happy', "...It's always about anime. But this time it's about you!"]], v: 3 },
        { t: "Only if it's quick.", r: [['sad', '...Never mind then.']], v: -1 },
      ] },
      night: ['blush', "Night night, {name}! ...Don't look at me when I take my makeup off, okay?"],
      nightGf: ['love', "This is like the last page of a shoujo manga. Good night, {name}. ♥"],
      morning: ['happy', 'Morning! I already did my makeup. And yours. Kidding! ...Unless?'],
    },
    krul: {
      mine: ['smug', 'You want the queen to sleep at your house? ...Very well. Close the curtains. All of them.'],
      hers: ['calm', "My attic at the Clock Tower. It's dark, dusty and perfect. Come up, human."],
      arrive: ['neutral', 'Your room has a window facing east. That is a design flaw. I am taping it shut.'],
      room: ['smug', 'Welcome to my castle. Smaller than the last one. The company is better.'],
      talk: { q: [['calm', 'Humans dream every night. What do you dream about?']], opts: [
        { t: 'Lately? Mostly you.', r: [['blush', "...Idiot. ...Tell me more. In detail."]], v: 6 },
        { t: 'Flying, sometimes.', r: [['smile', 'I could carry you. Briefly. You are heavy.']], v: 3 },
        { t: 'I never remember.', r: [['neutral', 'How dull.']], v: -1 },
      ] },
      night: ['calm', "Good night, human. I'll be awake for hours. I'll keep watch over you."],
      nightGf: ['love', "Sleep, {name}. I'll stay right here until the sun forces me under the covers."],
      morning: ['sad', "The sun is up. Disgusting. ...Five more minutes under the blanket with you."],
    },
  };


  // ------------------------------------------------- Hoshimachi City
  // Food at the city restaurants: [id, label, price, energy].
  const FOODS = {
    mcronalds: [['megaburger', 'Mega Burger set', 15, 25], ['friesshake', 'Fries & milkshake', 8, 12], ['kidsmeal', "Kids' meal (with a toy!)", 10, 10]],
    kitsune: [['bucket', 'Bucket of fried chicken', 18, 30], ['chickenburger', 'Spicy chicken burger', 10, 15]],
    sushi: [['sushiplates', 'Six plates of sushi', 20, 25], ['salmon', 'Salmon nigiri', 8, 10]],
    crepe: [['crepesnack', 'Strawberry crêpe', 8, 8]],
  };
  // City dates: how much she likes each place, and what she says there.
  const CITY = {
    nami: {
      train: ['happy', 'The city! The shops there have the best sales. Stay close, okay?'],
      prefs: { mcronalds: 'loved', kitsune: 'ok', sushi: 'ok', fashion: 'loved', purikura: 'ok', fancy: 'ok' },
      lines: {
        fancy: ['blush', "A real restaurant with tablecloths?! Don't let me see the bill. ...Okay, let me see it. Oh no."],
        mcronalds: ['happy', "Burgers! Cheap, fast and delicious. That's my kind of value~"],
        kitsune: ['smile', 'Fried chicken? Sure! Save me the crispy bits.'],
        sushi: ['smile', "Conveyor sushi! I'll count the plates. You're paying, right?"],
        fashion: ['love', "Look at all these clothes! ...Don't look at the price tags. Just look at me."],
        purikura: ['happy', "Make a peace sign! ...I'm putting this one on my map wall."],
      },
      bye: ['blush', 'Today was worth every yen. ...Even the ones you spent.'],
    },
    aqua: {
      train: ['happy', "A train! To the city! I'm going to eat EVERYTHING."],
      prefs: { mcronalds: 'loved', kitsune: 'loved', sushi: 'meh', fashion: 'ok', purikura: 'loved', fancy: 'ok' },
      lines: {
        fancy: ['happy', 'Fancy food! Is there a dessert cart? Bring me the dessert cart!'],
        mcronalds: ['happy', 'A kids\' meal comes with a TOY! I want the toy! Give me the toy!'],
        kitsune: ['love', 'Crispy, salty, greasy... this is the food of the gods. I would know!'],
        sushi: ['sad', "Raw fish... I'm a goddess of water. These are my subjects!"],
        fashion: ['smile', 'Ooh, sparkly! Does this make me look divine? It does, doesn\'t it?'],
        purikura: ['love', "Make it sparkly! Add halos! Add MORE halos! ...Perfect. I'm gorgeous."],
      },
      bye: ['happy', "That was the best day ever! Let's go again tomorrow! And the day after!"],
    },
    yumeko: {
      train: ['smug', 'A trip to the city with you... Every station is a new bet. Ufufu.'],
      prefs: { mcronalds: 'meh', kitsune: 'ok', sushi: 'loved', fashion: 'loved', purikura: 'ok', fancy: 'loved' },
      lines: {
        fancy: ['love', 'Candlelight, silver and a dangerous price list. Ufufu... this is my kind of evening.'],
        mcronalds: ['neutral', 'How... ordinary. I suppose ordinary can be thrilling with the right partner.'],
        kitsune: ['smile', "Let's bet on who finishes their bucket first. Loser pays."],
        sushi: ['love', "Every plate that comes by is a gamble. Tuna or tamago? Ufufu... I love this."],
        fashion: ['smug', 'Red silk, I think. Do you like it? Your face says yes.'],
        purikura: ['blush', 'A photo of us... I never keep souvenirs. I\'ll keep this one.'],
      },
      bye: ['smug', "I won today. I got to spend it with you. ...What, you thought I'd let you win?"],
    },
    kurumi: {
      train: ['smug', 'Ara ara, a city date. Shall we see how much time we can steal today?'],
      prefs: { mcronalds: 'ok', kitsune: 'ok', sushi: 'ok', fashion: 'loved', purikura: 'loved', fancy: 'loved' },
      lines: {
        fancy: ['love', 'Ara ara, how elegant. A candlelit dinner with you... I shall savour every second.'],
        mcronalds: ['smile', 'Fast food. How fitting for someone who never has enough time. Kihihi.'],
        kitsune: ['smile', 'Mm, crispy. ...Wipe your mouth, darling. Here, let me.'],
        sushi: ['smug', 'The plates keep coming round and round, like the hands of a clock.'],
        fashion: ['love', 'Black lace, red ribbons... Do you think it suits me? Of course it does.'],
        purikura: ['love', 'A moment frozen forever. ...You know I adore those.'],
      },
      bye: ['blush', "I'll add today to my collection of favourite hours. It's a small collection."],
    },
    rem: {
      train: ['blush', 'A date in the city! Rem made a list of places. Is that okay?'],
      prefs: { mcronalds: 'ok', kitsune: 'ok', sushi: 'loved', fashion: 'loved', purikura: 'ok', fancy: 'loved' },
      lines: {
        fancy: ['love', 'Rem is being served for once... and by your side. Rem might cry.'],
        mcronalds: ['smile', 'Rem is studying the recipe. ...She could make it better at home.'],
        kitsune: ['happy', 'Rem will remember this seasoning. For your bento.'],
        sushi: ['love', 'Look, a salmon plate! Rem will grab it for you. Say "ahh"!'],
        fashion: ['blush', 'A dress that\'s not a maid uniform... Do you think Rem looks pretty?'],
        purikura: ['love', 'Rem will treasure this photo forever. She\'ll keep it in her apron.'],
      },
      bye: ['love', "Thank you for today, my hero. Rem's heart is full."],
    },
    zerotwo: {
      train: ['smug', "A train ride with my darling! Let's go somewhere loud and greasy~"],
      prefs: { mcronalds: 'loved', kitsune: 'loved', sushi: 'ok', fashion: 'ok', purikura: 'loved', fancy: 'ok' },
      lines: {
        fancy: ['smug', 'The portions are tiny, darling. Order everything. And a honey dessert.'],
        mcronalds: ['happy', "Do they have honey for the fries? No? I brought my own. Open wide, darling!"],
        kitsune: ['love', "Fried chicken! Darling, you're the best. Feed me the drumstick~"],
        sushi: ['smile', "I'll take every plate that comes past. All of them. That's how it works, right?"],
        fashion: ['smug', 'How about this one? Too much? Good. I like too much.'],
        purikura: ['love', 'Add horns to you too! Now we match, darling.'],
      },
      bye: ['love', "Let's never stop going on adventures, darling. Promise?"],
    },
    frieren: {
      train: ['calm', 'The city. It used to be a village with one well. Humans build fast.'],
      prefs: { mcronalds: 'loved', kitsune: 'ok', sushi: 'ok', fashion: 'meh', purikura: 'ok', fancy: 'ok' },
      lines: {
        fancy: ['calm', 'I ate at a place like this with the hero party, once. ...This time I am not paying.'],
        mcronalds: ['smile', 'In a thousand years, this is the greatest thing humans have made. The burger.'],
        kitsune: ['calm', 'Fried chicken. Himmel liked this. ...I like it too, now.'],
        sushi: ['calm', 'The plates move on their own. Is it magic? ...It is a belt. I see.'],
        fashion: ['neutral', 'I have worn this outfit for eighty years. It is fine. ...Maybe a new cape.'],
        purikura: ['blush', "...I'll look at this photo again in a hundred years. And remember today."],
      },
      bye: ['calm', 'That was a good day. I will remember it for a long time. Longer than you think.'],
    },
    marin: {
      train: ['happy', 'A city date?! The Megamall has the cutest clothes. We HAVE to go!'],
      prefs: { mcronalds: 'loved', kitsune: 'ok', sushi: 'ok', fashion: 'loved', purikura: 'loved', fancy: 'loved' },
      lines: {
        fancy: ['love', 'This is literally the restaurant from every romance anime! Take my photo with the candles!'],
        mcronalds: ['happy', 'Fries and a shake! The ultimate gyaru combo!'],
        kitsune: ['smile', "Spicy chicken! My lips are on fire but it's worth it!"],
        sushi: ['smile', 'The salmon looks so pretty! Wait, let me take a photo first!'],
        fashion: ['love', 'This top! With those shorts! ...Okay, I need you to tell me I look cute.'],
        purikura: ['love', 'Purikura!! Big-eyes filter, sparkles, hearts EVERYWHERE!'],
      },
      bye: ['blush', 'Today was so fun I could literally scream. ...Can we do it again?'],
    },
    krul: {
      train: ['smug', 'A human train. Noisy, crowded... and I get the window seat. Obviously.'],
      prefs: { mcronalds: 'meh', kitsune: 'ok', sushi: 'ok', fashion: 'loved', purikura: 'ok', fancy: 'loved' },
      lines: {
        mcronalds: ['neutral', "The ketchup is the only red thing here worth anything. ...Pass me more."],
        kitsune: ['smile', 'Fried chicken. Crunchy. I approve, quietly.'],
        sushi: ['calm', 'Raw fish. Humans eat raw things too, then. Interesting.'],
        fashion: ['love', 'Black lace, a new parasol, red ribbons... Yes. Buy all of it.'],
        purikura: ['blush', "This box takes pictures? ...I appear in them. ...I appear in them!"],
        fancy: ['love', 'Candlelight, velvet and a red wine sauce. Finally, a place fit for a queen.'],
      },
      bye: ['blush', "That was... a tolerable day. A wonderful day. Don't repeat that."],
    },
  };


  // ------------------------------------------------- girls with each other
  // One little exchange for every pair, played when two of them hang out
  // with you (or bump into each other while you're around).
  // [speaker, expression, text]
  const PAIRS = {
    'nami|aqua': [['aqua', 'happy', 'Nami! Lend me ¥500. I swear on my divinity I\'ll pay you back!'], ['nami', 'smug', "With interest? Ten percent a day, goddess."], ['aqua', 'sad', 'Waaah! Usury!']],
    'nami|yumeko': [['yumeko', 'smug', 'Nami, a little wager? Double or nothing on your tips today.'], ['nami', 'happy', 'Ooh! ...No. I only bet on sure things. Like {name} buying lunch.']],
    'nami|kurumi': [['kurumi', 'smug', 'Ara, Nami. Your map of the town is missing a clock tower.'], ['nami', 'happy', 'Because I charge extra for landmarks! ...You want one? ¥2000.']],
    'nami|rem': [['rem', 'smile', 'Nami-san, Rem brought cookies for the café!'], ['nami', 'love', "Rem, you're an angel. I'm selling these at ¥300 each."], ['rem', 'surprised', "Those were free!"]],
    'nami|zerotwo': [['zerotwo', 'smug', "Navigator! Find me the shortest way to the honey shop."], ['nami', 'happy', 'That\'ll be ¥100 per direction. ...Fine, it\'s left.']],
    'nami|frieren': [['nami', 'happy', 'Frieren! You\'ve travelled everywhere. Any treasure maps?'], ['frieren', 'calm', 'I have one. It leads to a spell that turns copper into slightly shinier copper.'], ['nami', 'love', 'I\'ll take it!']],
    'nami|marin': [['marin', 'happy', 'Nami! Help me pick fabric! Which is cuter?'], ['nami', 'smile', 'The cheaper one. ...Okay, the orange one. Orange is lucky.']],
    'aqua|yumeko': [['yumeko', 'smug', 'Aqua-san, would you like to play cards with me?'], ['aqua', 'happy', "Yes! A goddess never loses!"], ['n', '', 'Five minutes later, Aqua owes Yumeko her umbrella.']],
    'aqua|kurumi': [['kurumi', 'smug', 'Ara ara, the goddess of water. Would you like to see my clock collection?'], ['aqua', 'surprised', 'Why are they all ticking backwards?! Purify! PURIFY!']],
    'aqua|rem': [['aqua', 'happy', 'Rem! Make me omurice! Draw a goddess on it!'], ['rem', 'smile', 'Rem drew you, Aqua-san!'], ['aqua', 'sad', "...Why am I crying in the drawing?"]],
    'aqua|zerotwo': [['zerotwo', 'smug', 'Hey, goddess. Bet I can drink more soda than you.'], ['aqua', 'happy', "You're on! Loser does the winner's laundry!"], ['n', '', 'They both lose. Spectacularly.']],
    'aqua|frieren': [['aqua', 'smug', 'Frieren! Bow before the goddess!'], ['frieren', 'calm', "I've met four goddesses. You're the loudest."], ['aqua', 'happy', "Thank you!"]],
    'aqua|marin': [['marin', 'love', 'Aqua! Can I cosplay you? Your outfit is SO cute!'], ['aqua', 'smug', 'Finally, someone with taste! Make the halo bigger!']],
    'yumeko|kurumi': [['kurumi', 'smug', 'Ara ara, Yumeko. You have the eyes of someone who enjoys danger.'], ['yumeko', 'smug', 'And you have the smile of someone who IS danger. Tea sometime?']],
    'yumeko|rem': [['rem', 'smile', 'Yumeko-san, Rem made tea. Would you like some?'], ['yumeko', 'smug', 'Only if you bet the last cookie on a coin toss.'], ['rem', 'happy', 'Rem will just give you the cookie!']],
    'yumeko|zerotwo': [['zerotwo', 'smug', 'Gambler. Bet you can\'t beat me in a race.'], ['yumeko', 'smug', "I don't need to. I bet on you winning. Ufufu."]],
    'yumeko|frieren': [['yumeko', 'smile', 'Frieren-san, what was the biggest risk you ever took?'], ['frieren', 'calm', 'I opened a treasure chest without checking for a mimic. Eight hundred times.'], ['yumeko', 'love', '...I respect that.']],
    'yumeko|marin': [['marin', 'happy', 'Yumeko! Your uniform would make an amazing cosplay!'], ['yumeko', 'smug', 'Then let\'s bet. If I win at cards, you make me one too.']],
    'kurumi|rem': [['rem', 'surprised', 'Kurumi-san, your clock is going the wrong way!'], ['kurumi', 'smug', "Ufufu. Would you like to borrow some of my time, Rem?"], ['rem', 'smile', 'Rem would rather make you tea!']],
    'kurumi|zerotwo': [['zerotwo', 'smug', 'Nice red eye. Matches my horns.'], ['kurumi', 'smug', 'Ara ara, a fellow monster. We should have tea and frighten the townsfolk.']],
    'kurumi|frieren': [['kurumi', 'smug', 'A thousand years old, Frieren? I simply must know your secret.'], ['frieren', 'calm', 'Sleep twelve hours a day. Do not rush. Read slowly.'], ['kurumi', 'smile', "...How dreadfully patient."]],
    'kurumi|marin': [['marin', 'love', 'Kurumi! Your dress is SO gothic lolita! Where did you get it?!'], ['kurumi', 'smug', 'Ara, I made it myself. Shall we sew together sometime?'], ['marin', 'happy', 'YES!']],
    'rem|zerotwo': [['zerotwo', 'smug', 'Maid girl! I want honey omurice.'], ['rem', 'smile', 'Rem can make that! ...Rem has never made that.'], ['zerotwo', 'happy', 'Then you\'ll be the first!']],
    'rem|frieren': [['rem', 'smile', 'Frieren-san, you fell asleep in the café again.'], ['frieren', 'calm', '...How long?'], ['rem', 'neutral', 'Three days.']],
    'rem|marin': [['marin', 'love', 'Rem! Your maid outfit is literally perfect! Can I copy the pattern?'], ['rem', 'happy', 'Rem will teach you to sew the apron frills!']],
    'zerotwo|frieren': [['zerotwo', 'smug', 'Elf! Ever fought a giant monster?'], ['frieren', 'calm', 'Several. You\'d like them. They also eat a lot of honey.']],
    'zerotwo|marin': [['marin', 'happy', 'Zero Two! Can I cosplay you?! The horns! The red suit!'], ['zerotwo', 'smug', "Only if I get to call you darling too~"], ['marin', 'blush', 'W-wait, what?!']],
    'frieren|marin': [['marin', 'happy', 'Frieren! Your staff is so cool! Can I measure it for a prop?'], ['frieren', 'calm', "Sure. It's 140 years old. Don't bend it."], ['marin', 'surprised', '...140 years?!']],
    'nami|krul': [['nami', 'smug', 'Krul! Eight hundred years old means eight hundred years of savings, right? Invest with me!'], ['krul', 'smug', 'I left my treasure in a castle in Europe. ...Do not look at me like that.']],
    'aqua|krul': [['aqua', 'surprised', 'A VAMPIRE! Undead creature, begone! Purification!'], ['krul', 'neutral', '...You just splashed me with soda.'], ['aqua', 'sad', "...It's holy soda!"]],
    'yumeko|krul': [['yumeko', 'smug', 'A queen of vampires. What would you wager on a game of cards, Krul-san?'], ['krul', 'smug', 'My crown. ...If you win. You will not win.']],
    'kurumi|krul': [['kurumi', 'smug', 'Ara ara, the vampire queen. Shall we compare who is older?'], ['krul', 'smug', "I'm eight hundred. You're... seventeen?"], ['kurumi', 'smile', 'Kihihi. Officially.']],
    'rem|krul': [['rem', 'smile', 'Krul-sama, Rem made you tomato soup! It\'s very red!'], ['krul', 'blush', '...You are my favourite human servant. Do not tell the others.']],
    'zerotwo|krul': [['zerotwo', 'smug', 'Ooh, fangs! Mine are pretty sharp too. Wanna compare?'], ['krul', 'smug', 'A fellow monster. ...You may call me by my name.']],
    'frieren|krul': [['frieren', 'calm', 'I met one of your kind six hundred years ago. He was very rude.'], ['krul', 'neutral', '...That was probably my uncle. He was very rude.']],
    'marin|krul': [['marin', 'love', 'KRUL! Your outfit is literally a perfect cosplay! Can I measure your cape?!'], ['krul', 'surprised', "It's not a costume! ...Fine. Measure it. Carefully."]],
  };
  // What each girl says about sharing you with your other girlfriends.
  const HAREM = {
    nami: { confess: ['smug', "I know you're seeing other girls too. Fine. But I get the biggest share of your time. It's only fair."], pair: ['happy', "Sharing {name} is fine... as long as I get Tuesdays."] },
    aqua: { confess: ['happy', "You have other girlfriends? Of course! A hero deserves a whole party! But I'm the goddess of it!"], pair: ['smug', "All of us dating {name}? It's like a harem anime! I'm the main heroine, obviously."] },
    yumeko: { confess: ['smug', "Other girls? Ufufu. More players make the game more exciting. I'm not worried. I'll win."], pair: ['smug', "Sharing is a gamble too. And I love gambling."] },
    kurumi: { confess: ['smug', "Ara ara, a whole collection of lovers. How greedy. ...I suppose I'll simply have to be the favourite."], pair: ['smug', "Ufufu. Shall we share {name}? I'll take the evenings."] },
    rem: { confess: ['love', "Rem knows {name}-kun loves others too. Rem doesn't mind. Rem just wants to be one of the people you love."], pair: ['smile', "Rem will make bento for everyone! Even for the other girlfriends!"] },
    zerotwo: { confess: ['smug', "Other girls? Whatever. You're still my darling. And I'm still the one who bites."], pair: ['happy', "Darling has lots of girlfriends! That just means more people to race!"] },
    frieren: { confess: ['calm', "You love several people. Humans have short lives. It makes sense to love a lot. I don't mind."], pair: ['calm', "We'll all be together for a while. That's a nice thing to remember."] },
    marin: { confess: ['blush', "Other girlfriends? Honestly... it's like a group cosplay! As long as I get to be in the center of the photo!"], pair: ['love', "We should do a group cosplay! All of {name}'s girlfriends! It'd be SO cute!"] },
    krul: { confess: ['smug', "Other girlfriends? A queen has a court. I'll allow them... as long as I sit on the throne."], pair: ['smug', "We share {name}? Very well. I take the nights. You can have the boring sunny parts."] },
  };
  // ------------------------------------------------------------- variety
  // Per-girl versions of lines that used to be shared, so no two girls say
  // the same thing (and the game never repeats a line back-to-back).
  const VARIETY = {
    nami: {
      dateEarly: [['smug', "A date? With me? That'll cost you... a lot more than one chat, newbie."], ['sad', "Slow down! I don't even know your favourite food yet."], ['happy', "Ha! Bold. I like bold. But I don't date strangers. Buy something at the café first!"]],
      dateYes: [['happy', "A date? You're paying, right? ...Kidding! Mostly. Where to?"], ['blush', "Okay! But I pick the dessert. Where are we going?"], ['smile', "Finally! I was wondering when you'd ask. Lead the way!"]],
      dateRain: [['sad', "Ugh, my map's getting soaked! ...Hold the umbrella closer. Closer."], ['blush', "Rain means fewer people... so it's basically a private date, right?"]],
      dateBlossom: [['love', "Sakura everywhere! I'm drawing this day on my map. With you in it."], ['happy', "Petals in your hair! Hold still, I'm keeping one as a souvenir."]],
      walkEarly: [['neutral', "A walk? I've got tables to wait. Maybe once you're a regular."], ['smug', "Walking with me is a premium service. Earn it first!"]],
      nightEarly: [['surprised', "S-stay over?! We're not there yet, mister!"], ['smug', "Sleepover? That's a VIP perk. You're not VIP. Yet."]],
      anythingElse: ["So? Anything else?", "Time is money, you know~", "Hm? Spit it out!", "Still here? ...Not complaining."],
      chatAbout: ['You chat about the cheapest places to eat in town. Nami has a list.', 'Nami shows you a map she drew of the coast. It is surprisingly good.', 'You trade stories about weird café customers.'],
      potionDrink: ['surprised', "Free drink? I never say no to free. ...It's pink. Why is it pink?"],
      potionLove: ['love', "Wh-why is my heart racing?! ...You're worth more than all my savings right now."],
      crepe: ['happy', "Mmm! You get a bite... if you pay for the next one. Ahh~"],
      outfit: ['love', "You bought it for me? ...I'm keeping the receipt AND the memory."],
      vsStart: ["Loser buys lunch!", "Watch and learn, newbie!", "I don't lose. Not for free."],
      bday: ['happy', "Guess whose birthday it is? Mine! ...Gifts are accepted. Cash too."],
      oops: ['surprised', "...I didn't see that. That'll be ¥500 for my silence."],
    },
    aqua: {
      dateEarly: [['surprised', "A date with a GODDESS? You must offer at the shrine first! Many times!"], ['smug', "Mortals must earn the honor of the goddess's time! Come back with offerings!"], ['sad', "Eh? A date?! Waaah, I'm not ready! The goddess needs more worshipping first!"]],
      dateYes: [['happy', "A date with the goddess! You're so lucky! Where shall I bless today?"], ['love', "Finally! I've been waiting for an invitation! Where are we going? Somewhere with drinks?"], ['smug', "Very well! The goddess shall accompany you. Choose wisely!"]],
      dateRain: [['happy', "Rain is my element! See? Even the sky celebrates our date!"], ['smug', "Water falls from the heavens for me! ...Can I borrow your jacket though?"]],
      dateBlossom: [['love', "The petals fall for the goddess! And for you. A little."], ['happy', "Waaah, so pretty! Let's have a party under the trees! With drinks!"]],
      walkEarly: [['smug', "A walk? Only my faithful followers walk beside me!"], ['sad', "I'd come, but you haven't made enough offerings yet..."]],
      nightEarly: [['surprised', "S-sleep over?! A goddess doesn't just sleep anywhere! ...Is there food?"], ['smug', "Only my most devoted believers may host the goddess overnight!"]],
      anythingElse: ["Is that all, mortal?", "Hmm? More praise?", "The goddess is listening!", "Got any more offerings?"],
      chatAbout: ["Aqua explains, at length, why she is the most important goddess.", 'You chat about party tricks. Aqua shows you one. Water goes everywhere.', 'Aqua complains about her debts. You do not ask how much.'],
      potionDrink: ['happy', "A sparkly drink for the goddess? Don't mind if I do! Gulp gulp!"],
      potionLove: ['love', "Whoa... why are you glowing? Is THIS what worship feels like from the other side?!"],
      crepe: ['happy', "A divine offering of cream! Mmmh! More! The goddess demands seconds!"],
      outfit: ['love', "A new outfit for the goddess! Now I look even MORE divine!"],
      vsStart: ["A goddess never loses!", "Prepare for divine punishment!", "I'm gonna win! Probably!"],
      bday: ['happy', "It's the goddess's birthday! Offerings are mandatory today! Gifts! Cake!"],
      oops: ['surprised', "Eeeh?! The goddess's eyes are pure! Purify that memory! Now!"],
    },
    yumeko: {
      dateEarly: [['smug', "A date already? Ufufu. You're betting everything on a hand you haven't seen yet."], ['calm', "Bold... but I don't wager on strangers. Show me your cards first."], ['smile', "Ara, how reckless. Let's raise the stakes slowly, shall we?"]],
      dateYes: [['smug', "Ufufu. I accept your wager. Where are we playing?"], ['love', "How thrilling. I'll go all in. Where to?"], ['smile', "A date? The odds were in your favour. Lead on."]],
      dateRain: [['smug', "Rain on a date... the odds of that were low. How exciting."], ['blush', "Sharing an umbrella means our fates are tied. Ufufu."]],
      dateBlossom: [['love', "A sakura blizzard... a jackpot from the sky. I'm glad I bet on you."], ['smile', "Each petal is a coin toss. And they all landed on you."]],
      walkEarly: [['smug', "A walk? I only stroll with people I've gambled with."], ['calm', "Not yet. You haven't raised the stakes enough."]],
      nightEarly: [['smug', "Spend the night? Ufufu... that's an all-in bet. You can't afford it yet."], ['blush', "My, how bold... but the table isn't ready for that wager."]],
      anythingElse: ["Ufufu. Another round?", "Your move.", "Hm? Feeling lucky?", "Shall we raise the stakes?"],
      chatAbout: ['You talk about famous gamblers. Yumeko knows every story.', 'Yumeko teaches you a card trick. You still have no idea how it works.', 'You chat about student council secrets. Some of them are terrifying.'],
      potionDrink: ['smug', "A mystery potion? An unknown risk... I'll drink it in one go."],
      potionLove: ['love', "Ahh... my heart is gambling on its own. And it's betting everything on you."],
      crepe: ['smile', "Sweet. A safe bet for once. Want to bet on who finishes first?"],
      outfit: ['love', "You bought it? Ufufu... you just doubled your winnings with me."],
      vsStart: ["Let's make it interesting.", "Winner takes all, ufufu~", "I love a good gamble!"],
      bday: ['smug', "It's my birthday today. I wonder... will you win the bet and remember?"],
      oops: ['smug', "Ufufu... what a disastrous hand. I'll keep that card hidden. For a price."],
    },
    kurumi: {
      dateEarly: [['smug', "Ara ara, a date already? How impatient. Time must be savoured, darling."], ['calm', "Hmm. I don't give my time to strangers. ...Not for free, anyway."], ['smile', "Ufufu. You'll need more than charm to borrow my hours."]],
      dateYes: [['smug', "Ara, a date? I'll clear my schedule. Where shall we go?"], ['love', "How delightful. Shall I send for the car, or will we walk?"], ['smile', "Very well. I'll lend you my time... and I always collect."]],
      dateRain: [['smile', "Rain is lovely. The clocks sound different in it. ...Stay under my parasol."], ['smug', "Getting wet for a date? How romantic. How very foolish. I adore it."]],
      dateBlossom: [['love', "I'd stop time right here if I could. Just this moment."], ['blush', "Petals on your shoulder... I'll keep this memory forever."]],
      walkEarly: [['smug', "A stroll? My afternoons are rather valuable, you know."], ['calm', "Not yet. I don't walk beside people I haven't measured."]],
      nightEarly: [['smug', "Ara ara, the mansion has many guest rooms... but none for you. Yet."], ['blush', "Spend the night? Ufufu. Patience is a virtue, darling."]],
      anythingElse: ["Ara, anything else?", "Ufufu. Time is ticking.", "Hm? Do go on.", "Tick, tock~"],
      chatAbout: ['You chat about antique clocks. Kurumi owns several worth more than your house.', 'Kurumi describes the mansion tea room. It has a butler just for tea.', 'You talk about cats. Kurumi pretends not to care. She cares a lot.'],
      potionDrink: ['smug', "A potion from that elf? How daring. ...Very well. I'll humour you."],
      potionLove: ['love', "Ara... my heart is ticking far too fast. What have you done to me, darling?"],
      crepe: ['smile', "Street food? How quaint. ...It's delicious. Don't tell the butler."],
      outfit: ['love', "You chose this for me? I'll wear it to the next ball. ...With you."],
      vsStart: ["Ara ara, shall we play?", "I never lose, darling.", "Time to lose, ufufu~"],
      bday: ['smug', "Did you know? Today is my birthday. The mansion is throwing a party... but I'd rather see you."],
      oops: ['smug', "Ara ara... I'll pretend I didn't see. The butler, however, saw everything."],
    },
    rem: {
      dateEarly: [['surprised', "A d-date with Rem? Rem is very honoured... but Rem barely knows {name}-kun yet!"], ['sad', "Rem is sorry... Rem wants to know {name}-kun better first."], ['blush', "R-Rem isn't ready! Please talk with Rem more first!"]],
      dateYes: [['love', "Rem would love to! Rem will pack snacks! Where are we going?"], ['happy', "A date with {name}-kun! Rem is so happy! Where to?"], ['blush', "Rem will follow {name}-kun anywhere. Where shall we go?"]],
      dateRain: [['smile', "Rem brought an umbrella just in case! Rem is always prepared."], ['blush', "Rem doesn't mind the rain. As long as {name}-kun is here."]],
      dateBlossom: [['love', "It's so beautiful... Rem will remember this day forever."], ['happy', "Rem wishes this moment could last forever!"]],
      walkEarly: [['sad', "Rem has so much work at the café... Maybe another time?"], ['blush', "Rem would like that, but Rem is still shy around {name}-kun..."]],
      nightEarly: [['surprised', "S-stay the night?! Rem... Rem isn't that kind of girl! Not yet!"], ['blush', "Rem's face is so hot... Please ask Rem again when we're closer."]],
      anythingElse: ["Is there anything else Rem can do?", "Rem is listening!", "{name}-kun?", "Rem is happy to help!"],
      chatAbout: ['Rem tells you about her favourite recipes. She offers to cook them all.', 'You chat about the maid café. Rem knows every customer by name.', 'Rem asks if you are eating well. She asks three times.'],
      potionDrink: ['surprised', "A drink for Rem? Rem will drink it, if {name}-kun wants Rem to."],
      potionLove: ['love', "Rem's heart is beating so fast... Rem loves {name}-kun! Rem loves {name}-kun so much!"],
      crepe: ['happy', "Rem has never had a city crêpe! It's wonderful! {name}-kun, ahh~"],
      outfit: ['love', "For Rem? Rem will treasure it forever. Rem will wear it every special day."],
      vsStart: ["Rem will do her best!", "Rem won't go easy!", "Please be gentle with Rem!"],
      bday: ['blush', "Um... today is Rem's birthday. Rem just wanted {name}-kun to know."],
      oops: ['surprised', "Rem didn't see anything! Rem will clean it up! Rem is used to cleaning!"],
    },
    zerotwo: {
      dateEarly: [['smug', "A date? Cute. You haven't even tasted my honey yet."], ['happy', "Ha! You think you're my darling already? Catch me first!"], ['calm', "Mmm, no. You're still a stranger. Strangers get bitten."]],
      dateYes: [['happy', "A date, darling? Let's go fast! Where to?"], ['smug', "Finally! I was getting bored. Show me somewhere fun."], ['love', "Anywhere with you, darling. ...And with snacks."]],
      dateRain: [['happy', "Rain! Let's run through it! Last one dry loses!"], ['smug', "Getting soaked with my darling. Not bad at all."]],
      dateBlossom: [['love', "Pink like my hair! This whole world is ours today, darling."], ['happy', "Let's race the petals! ...Okay, okay, we can just sit."]],
      walkEarly: [['smug', "A walk? I run. You'd never keep up. Yet."], ['calm', "Not with you. Not yet. Earn it."]],
      nightEarly: [['smug', "Stay over? Ha! You're brave. Or stupid. Come back later, little lamb."], ['blush', "...You're asking ME? Hmph. Not yet, darling. Maybe soon."]],
      anythingElse: ["What else, darling?", "Bored now. Got anything fun?", "Hmm?", "Say it, darling~"],
      chatAbout: ['Zero Two tells you about the fastest thing she ever raced. It was a train.', 'You chat about sweets. Zero Two ranks every bakery item by honey content.', 'Zero Two asks what you would do if she bit you. You do not answer.'],
      potionDrink: ['smug', "A love potion? On me? Ha! As if I need it. ...Fine. Cheers, darling."],
      potionLove: ['love', "Darling... darling darling darling. You're the only one. You always were."],
      crepe: ['happy', "Is there honey in it? No? ...Still good! Gimme another!"],
      outfit: ['love', "For me? I'll ruin it running around. ...I'll be careful. For you."],
      vsStart: ["Try to keep up, darling!", "I'll crush you!", "Loser gets bitten!"],
      bday: ['smug', "It's my birthday, darling. Where's my honey cake?"],
      oops: ['smug', "Ha! Darling, that was hilarious. I'm never letting you forget it."],
    },
    frieren: {
      dateEarly: [['calm', "A date? We met very recently. Humans are so fast."], ['neutral', "Let's wait a while. Maybe ten years. ...Or a few weeks. I forget how long humans wait."], ['smile', "Not yet. I'd like to know you first. It takes me a little while."]],
      dateYes: [['smile', "Alright. I'll try not to be a decade late. Where?"], ['calm', "A date... Himmel used to say those were important. Where to?"], ['blush', "...I'd like that. Pick somewhere quiet."]],
      dateRain: [['calm', "I know a spell to stop rain. ...I'll leave it. This is nice."], ['smile', "Rain makes the forest smell good. I'm glad you're here for it."]],
      dateBlossom: [['love', "In a thousand years, I've seen this many times. It never looked like this."], ['smile', "Petals... I'll remember this one. I'll make sure to."]],
      walkEarly: [['calm', "A walk? I'm in the middle of a grimoire. It'll take about a month."], ['neutral', "Maybe later. I'm still getting used to you."]],
      nightEarly: [['calm', "A sleepover? I sleep a lot. It would be very boring for you."], ['neutral', "Not yet. I've only just learned your name."]],
      anythingElse: ["...Hm?", "Is there more?", "I'm still listening.", "Take your time."],
      chatAbout: ['Frieren tells you about a spell that makes flowers bloom. She seems proud.', 'You chat about old heroes. Frieren goes quiet for a while.', 'Frieren explains how to tell a mimic from a chest. She has been eaten many times.'],
      potionDrink: ['calm', "One of my potions? ...I should test my own work sometime."],
      potionLove: ['blush', "My heart is... loud. Is this how humans always feel?"],
      crepe: ['smile', "Sweet. It tastes like the cakes in the old capital. ...Better, actually."],
      outfit: ['blush', "You bought me clothes? ...I'll wear them for a long time. A very long time."],
      vsStart: ["I've had a few centuries of practice.", "Alright. Let's play.", "...I'll try."],
      bday: ['calm', "It's my birthday, I think. After a thousand of them, I lose count."],
      oops: ['calm', "...Humans. I've seen worse in a dungeon."],
    },
    marin: {
      dateEarly: [['surprised', "Eh?! A date?! We just met! ...You're kinda cute though. Ask me later!"], ['happy', "Hold on, hold on! I don't even know your favourite anime yet!"], ['blush', "Whoa, bold! I like it! But let's be friends first, okay?"]],
      dateYes: [['happy', "YES! A date! I'm gonna pick the cutest outfit! Where are we going?!"], ['love', "Kyaa! Okay okay okay! Where to?!"], ['blush', "A date with you? Duh, of course! Lead the way!"]],
      dateRain: [['happy', "Rain date! It's like an anime scene! Quick, look dramatic!"], ['blush', "My hair's getting ruined... but whatever, this is kinda romantic."]],
      dateBlossom: [['love', "This is SO pretty! Selfie! Selfie now! With you!"], ['happy', "Sakura everywhere! It's literally the opening of a romance anime!"]],
      walkEarly: [['happy', "A walk? Totally, once we're friends! You gotta earn it, okay?"], ['blush', "Hehe, slow down! Hang out with me a bit more first!"]],
      nightEarly: [['surprised', "A SLEEPOVER?! W-we're not that close yet! ...Ask me again later!"], ['blush', "My room is full of half-sewn costumes! Not ready for guests! Not yet!"]],
      anythingElse: ["What's up?", "Ooh, anything else?!", "Hehe, yeah?", "Tell me tell me!"],
      chatAbout: ['Marin shows you photos of her cosplays. Hundreds of them.', 'You chat about magical-girl anime. Marin knows every transformation by heart.', 'Marin explains how to sew a petticoat. You follow about half of it.'],
      potionDrink: ['happy', "Ooh, a pink drink! It's so aesthetic! Cheers!"],
      potionLove: ['love', "Wait wait wait, why is my heart going doki doki?! It's you! It's totally you!"],
      crepe: ['love', "Strawberry cream! Wait, photo first! Okay, NOW we eat!"],
      outfit: ['love', "OMG you bought it?! I'm gonna make a matching one for you!"],
      vsStart: ["Let's gooo!", "I'm not losing to you!", "Ready? Fight!"],
      bday: ['happy', "Guess what?! It's my birthday! I'm wearing my best cosplay today!"],
      oops: ['surprised', "Oh no oh no! I didn't see! ...Honestly, it happens to everyone, right?!"],
    },
    krul: {
      dateEarly: [['smug', "A date with the queen? You haven't even bowed yet."], ['calm', "Hmph. I don't waste my nights on strangers."], ['surprised', "D-date?! Know your place, human!"]],
      dateYes: [['smug', "Fine. A queen may grant one evening. Where?"], ['blush', "...A date. With me. ...Don't make it boring."], ['smile', "Very well, human. Lead. But I choose the drinks."]],
      dateRain: [['smug', "No sun, only rain. Perfect weather for a queen."], ['blush', "Hold the umbrella over me. ...You're getting wet. Come closer, idiot."]],
      dateBlossom: [['blush', "Pretty... I've watched these fall for centuries. Never with anyone."], ['love', "Don't look at me like that. ...Okay. Look a little longer."]],
      walkEarly: [['smug', "Walk with you? I don't walk with my food."], ['calm', "Not yet. The queen chooses her escort."]],
      nightEarly: [['smug', "Spend the night? I'm awake all night, human. You'd never survive."], ['blush', "W-what are you suggesting?! Not yet!"]],
      anythingElse: ["What is it?", "Speak, human.", "Hm?", "Is that all?"],
      chatAbout: ['Krul complains about the sun for twenty minutes straight.', 'You chat about the old kingdom. Krul gets nostalgic, then pretends she did not.', 'Krul ranks tomato juice brands. She has strong opinions.'],
      potionDrink: ['smug', "A potion? Vampires are immune to such things. ...Watch. Gulp."],
      potionLove: ['love', "...It wasn't immune. Shut up. Come here."],
      crepe: ['smile', "Sweet things are... acceptable. Hand me another. That's an order."],
      outfit: ['blush', "For me? ...It's fit for a queen. I suppose."],
      vsStart: ["Kneel before your defeat.", "Prepare to lose, human.", "I've played for centuries."],
      bday: ['smug', "It's the queen's birthday. You may bring tribute. Tomato juice, preferably."],
      oops: ['smug', "Disgraceful, human. ...I'll forget it. In a hundred years or so."],
    },
  };


  // ------------------------------------------------------------- chat app
  // Replies in the phone's chat app ("WhatsUp"). {name} = player.
  const CHAT = {
    nami: { hey: ['Busy day! Sold three maps and found a shortcut. 🗺️', "Counting my savings. Don't ask how much. 💰", 'Bored! Entertain me or pay me. 😏'], yes: 'Deal! See you there 🍊', no: "Can't today, I'm booked. Tomorrow? 😉", love: "...Idiot. You're thinking about me? Me too. 🧡", night: 'Night! Dream of tangerines 🍊😴' },
    aqua: { hey: ['TERRIBLE. I lost all my money betting on a frog race 😭', 'The goddess is radiant today, as always ✨💧', 'Buy me a drink and I will tell you 🍹'], yes: 'The goddess accepts your offering of time! 💧', no: 'Busy being worshipped today! Tomorrow!', love: 'Hehe~ of course you are! I am a goddess 💙💙💙', night: 'Good night, devoted follower! 💤✨' },
    yumeko: { hey: ['Ufufu. I just won a bet with the student council. 🎲', 'Thrilling. Wanna make it more thrilling? 🃏', 'I was waiting to see if you would text first. You did. I win.'], yes: "I'll bet you show up first. 🎲", no: 'The cards say not today. Tomorrow, maybe. 🃏', love: 'What a bold play... I like it. ❤️', night: 'Good night. Dream of high stakes ♠️' },
    kurumi: { hey: ['Ara ara, tea at the mansion with Earl Grey from London. ☕', 'I bought another antique clock. It ticks so sweetly. 🕰️', 'Lovely, now that you have texted. Ufufu.'], yes: "I'll send a car if you're late. Ufufu~ 🕰️", no: "Today my time is spoken for. Tomorrow, then.", love: 'My, how sweet. I may just keep you forever. ❤️🕰️', night: 'Sweet dreams. I may visit them. Ufufu~ 🌙' },
    rem: { hey: ['Rem cleaned the whole café and made curry! 💙', "Rem's day is good! Did {name}-kun eat properly?", 'Rem was just thinking about {name}-kun! 😊'], yes: 'Rem will be there! Rem is so happy! 💙', no: "Rem has work... Rem is sorry! Another day? 🙇‍♀️", love: 'R-Rem loves {name}-kun too! So much! 💙💙', night: 'Good night, {name}-kun. Rem will dream of you 💙' },
    zerotwo: { hey: ['Ate 14 sweets with honey. Am I sick? No. 🍯', 'Boring without my darling. Come play! 😈', 'Raced a bus. I won. 🏃‍♀️💨'], yes: "Darling~ I'll be there before you 😘", no: 'Busy hunting. Later, darling! 🦖', love: "You're thinking of me? Good. Don't stop, darling. 💋", night: 'Night darling~ 🌙 *bites pillow*' },
    frieren: { hey: ['Found a spell that makes grapes taste like melon. 🍇', 'Slept until noon. Very productive.', 'Read for six hours. It felt like five minutes.'], yes: "Alright. I'll try not to be a decade late.", no: "I'm in the middle of a grimoire. Another time.", love: '...Humans say things like that so easily. ...I like it.', night: 'Good night. See you tomorrow. Probably.' },
    marin: { hey: ["OMG I finished the wig for my next cosplay!! 😍😍", 'Sooo good! Marathoned 12 episodes 📺💖', 'Shopping! Look at THIS skirt!! (imagine a photo) 💖'], yes: "YAY!! It's a date!! 💖✨", no: 'Nooo I have a shoot today 😭 tomorrow ok??', love: 'Kyaaa!! Stop, my heart!! ❤️❤️❤️', night: 'Nighty night!! 💖😴' },
    krul: { hey: ['I woke up at sunset. Perfect day. 🦇', 'Tomato juice. Again. It is fine. 🍅', 'You text a queen so casually. Bold. I like bold.'], yes: 'Fine. Do not be late, human. 🦇', no: 'Not tonight. The queen is busy.', love: "...H-hmph. Say it again. That's an order. ❤️", night: 'Good night? The night is just starting. 🦇🌙' },
  };


  // ------------------------------------------------------------- life
  // Life mode (Sims-style needs). How activities change your needs:
  // positive fills a need, negative drains it.
  const LIFE_FX = {
    rest: { fun: 10 }, homestudy: { fun: -10 }, cook: { hunger: 50, fun: 5 }, shower: { hygiene: 100 }, homebath: { hygiene: 100, fun: 15 },
    work: { hunger: -10, fun: -15, hygiene: -10 }, serve: { hunger: -10, fun: -10, hygiene: -10 }, coffee: { hunger: 10, fun: 5, bladder: -15 },
    study: { fun: -10 }, jog: { fun: 5, hygiene: -15, hunger: -5 }, bench: { fun: 5 }, stars: { fun: 15 }, swim: { fun: 20, hygiene: 25 },
    sunbathe: { fun: 10 }, boutique: { fun: 10 }, rhythm: { fun: 25, hygiene: -5 }, puzzle: { fun: 20 }, claw: { fun: 15 },
    train: { fun: -5, hygiene: -20, hunger: -10 }, vending: { hunger: 5, bladder: -10 }, offer: { fun: 5 }, fortune: { fun: 5 },
    flowerpick: { fun: 10 }, fish: { fun: 15 }, lighthouse: { fun: 15 }, clockview: { fun: 15 }, omurice: { hunger: 45, fun: 10 },
    honeytoast: { hunger: 30, fun: 5 }, milk: { hunger: 10, bladder: -10 }, massage: { fun: 15 }, soak: { hygiene: 100, fun: 15 },
    readmagic: { fun: 5 }, tinker: { fun: 10 }, bakeclass: { hunger: 20, fun: 10 }, wfh: { fun: -10, hunger: -10 },
  };
  // Each girl's living: her job (where and what it pays per day), weekly
  // rent, what she spends on her hobby each day, her savings to start with,
  // and what she says when she's broke, hungry or stressed.
  const LIFE = {
    nami: { job: 'Waitress at Café Lumière', work: 'cafe', wage: 70, rent: 70, hobby: ['map supplies', 5], start: 400,
      broke: ['sad', "Rent day wiped me out... You'd lend me money? I'll pay you back! With interest! ...Without interest."],
      hungry: ['happy', "Food?! For me?! You're a saint!"], stressed: ['sad', "Sorry, I'm just tired. Extra shifts all week. My feet are killing me."] },
    aqua: { job: 'Shrine maiden at Mizu Shrine', work: 'shrine', wage: 30, rent: 0, hobby: ['soda and snacks', 35], start: 60,
      broke: ['sad', 'I spent my whole allowance on soda again... Lend the goddess some money! I will bless you!'],
      hungry: ['love', "A food offering?! You're my favourite worshipper!"], stressed: ['sad', "I'm broke and hungry and nobody worships me... Waaah!"] },
    yumeko: { job: 'Student council treasurer (and a little gambling)', work: 'school', wage: 50, rent: 70, hobby: ['card games', 10], start: 600, gamble: true,
      broke: ['smug', 'I lost a bet. A big one. ...Ufufu, a loan from you? How thrilling.'],
      hungry: ['smile', 'Treating me? Then I owe you. I hate owing people. ...I like owing you.'], stressed: ['neutral', 'My luck has been dreadful lately. It is... unsettling.'] },
    kurumi: { job: 'Heiress of the Tokisaki fortune', work: null, wage: 0, dividend: 2000, rent: 0, hobby: ['antique clocks and silk dresses', 400], start: 250000, rich: true,
      broke: ['smug', "Ara ara, lending money to a Tokisaki? How adorable. ...I'll keep it as a souvenir."],
      hungry: ['smile', 'Ufufu, a treat? How kind. My chef will be jealous.'], stressed: ['neutral', 'Even a fortune cannot buy back time. ...Stay with me a little.'] },
    rem: { job: 'Maid at Café Blue Rose', work: 'maidcafe', wage: 80, rent: 0, hobby: ['tea and recipe books', 6], start: 700,
      broke: ['sad', 'Rem sent her savings to help her sister. Rem will pay you back, she promises!'],
      hungry: ['happy', 'For Rem? Rem is always the one serving... Thank you, {name}-kun!'], stressed: ['sad', 'Rem is fine! Rem is just... a little tired. Double shifts.'] },
    zerotwo: { job: 'Part-timer at Honey Bakery', work: 'bakery', wage: 50, rent: 60, hobby: ['honey', 15], start: 250,
      broke: ['smug', "I ate my whole paycheck in honey. Lend me money, darling? I'll pay you back in kisses."],
      hungry: ['love', 'Food! Darling, you know the way to my heart!'], stressed: ['sad', 'No money, no honey. This is the worst, darling.'] },
    frieren: { job: 'Owner of Grimoire Antiques', work: 'antiques', wage: 45, rent: 40, hobby: ['useless grimoires', 18], start: 300,
      broke: ['calm', 'I bought a grimoire with a spell that makes grapes sour. It cost everything. ...It was worth it.'],
      hungry: ['smile', '...You noticed I forgot to eat. For three days. Thank you.'], stressed: ['neutral', 'The shop has had no customers for a week. I might have to sell the mimic.'] },
    marin: { job: 'Part-time model (and cosplay commissions)', work: 'mall', wage: 55, rent: 70, hobby: ['fabric and wigs', 15], start: 300,
      broke: ['sad', "I bought SO much fabric for the convention... Can I borrow some money? I'll make you a costume!"],
      hungry: ['love', "Ahh, you're the best! I skipped lunch to sew!"], stressed: ['sad', "The convention is in a week and I'm broke AND behind... I'm so stressed!"] },
    krul: { job: 'Night fortune-teller at the shrine', work: 'shrine', wage: 45, rent: 30, hobby: ['tomato juice', 10], start: 900,
      broke: ['blush', 'My fortune is in a castle across the sea. Lending to a queen is an honour, human.'],
      hungry: ['smile', 'Tribute! ...Is there tomato juice? There is. Good.'], stressed: ['neutral', 'Even a queen must pay rent here. How humiliating.'] },
  };


  // ------------------------------------------------- cosplay with Marin
  // best = the photo direction she loves most for that costume.
  const COSPLAYS = {
    shizuku: { name: 'Shizuku-tan', series: 'Slippery Sister Shizuku-tan', best: 'cute',
      intro: ['love', "Shizuku-tan! The gothic black-lily maid! I finally finished the petticoat. Look how poofy it is!"],
      done: ['blush', "...Your photos make me look like the real Shizuku-tan. I think I'm gonna cry. Happy tears!"] },
    rizu: { name: 'Rizu-kyun', series: 'Saint ♡ Slippery Academy', best: 'cool',
      intro: ['smug', "Rizu-kyun, the little devil! Wings, tail, horns... Rawr! Don't stare too much, okay?"],
      done: ['love', "The wings photographed SO well! You're officially my cosplay photographer now."] },
    magical: { name: 'Magical Girl', series: 'Flying Witch Shizuku', best: 'self',
      intro: ['happy', "Magical Girl Flying Witch! This is the one I watched every Sunday as a kid. Star wand, activate!"],
      done: ['love', "Being a magical girl with you watching... it's like my childhood dream came true."] },
  };
  const POSES = [['cute', '💕 "Give me a cute pose!"'], ['cool', '😎 "Strike a cool pose!"'], ['self', '😊 "Just be yourself."']];

  // Video games: how good each girl is (1 = average), and what she says
  // when she wins or loses against you.
  const VS = {
    nami: { skill: { kart: 1.0, stack: 1.0, rhythm: 0.9, mash: 0.9 }, win: ['smug', 'Ha! Pay up! ...Kidding. Mostly.'], lose: ['sad', 'No way! Rematch! Double or nothing!'] },
    aqua: { skill: { kart: 0.6, stack: 0.5, rhythm: 0.8, mash: 1.1 }, win: ['happy', 'The goddess is VICTORIOUS! Worship me!'], lose: ['sad', 'Waaah! The controller is broken! Cheater!'] },
    yumeko: { skill: { kart: 0.9, stack: 1.15, rhythm: 1.0, mash: 0.8 }, win: ['smug', 'Ufufu. Luck had nothing to do with it.'], lose: ['love', 'You beat me? How thrilling... Again!'] },
    kurumi: { skill: { kart: 1.0, stack: 1.2, rhythm: 1.1, mash: 0.8 }, win: ['smug', 'Ara ara, did you expect to win against me?'], lose: ['smile', 'Kihihi... I let you win. Probably.'] },
    rem: { skill: { kart: 0.8, stack: 1.1, rhythm: 1.0, mash: 1.1 }, win: ['happy', 'Rem won! ...Rem is sorry, {name}-kun!'], lose: ['smile', '{name}-kun is amazing! Rem is so proud!'] },
    zerotwo: { skill: { kart: 1.35, stack: 0.8, rhythm: 1.0, mash: 1.2 }, win: ['smug', 'Too slow, darling~'], lose: ['surprised', 'You actually beat me?! ...Again. Now.'] },
    frieren: { skill: { kart: 0.6, stack: 1.0, rhythm: 0.7, mash: 0.5 }, win: ['calm', '...Oh. I won? I was not paying attention.'], lose: ['calm', 'I will practise for a hundred years and win next time.'] },
    marin: { skill: { kart: 1.0, stack: 0.9, rhythm: 1.25, mash: 1.0 }, win: ['happy', 'YESSS! Gamer girl supremacy!'], lose: ['happy', "Okay, you're actually good! One more!"] },
    krul: { skill: { kart: 1.1, stack: 1.0, rhythm: 0.8, mash: 1.15 }, win: ['smug', 'Kneel before your queen, human.'], lose: ['sad', '...The sun was in my eyes. Indoors. Shut up.'] },
  };
  // Cards with Yumeko: what she plays depends on where she is.
  const YUMEKO_CARDS = {
    casino: { game: 'blackjack', title: "Yumeko's table", bets: [20, 50, 100], intro: ['smug', "Ufufu, you came to MY table. I'll deal. Let's make this thrilling, shall we?"], win: ['love', "You beat me at my own table... I'm shivering. Again!"], lose: ['smug', 'The house always wins. And tonight, I am the house.'] },
    arcade: { game: 'blackjack', title: 'Blackjack at the arcade', bets: [10], intro: ['smile', 'Cards between the claw machines? How charming. ¥10 a hand, just for fun.'], win: ['happy', "Ahaha! You're lucky today. I love that."], lose: ['smug', 'Ufufu. Better luck next hand.'] },
    school: { game: 'highlow', title: 'High or Low in the library', intro: ['smug', "Shh, it's the library. Let's play quietly. Higher or lower... and if you get five in a row, I'll owe you a favour."], win: ['love', "Five in a row?! Ufufu... I owe you a favour. Collect it whenever you like."], lose: ['smile', 'The cards were not on your side. That is the fun of it.'] },
    any: { game: 'highlow', title: 'High or Low with Yumeko', intro: ['smile', 'A quick game? Higher or lower. Get five in a row and you win.'], win: ['love', "You won! Your luck is almost as good as mine."], lose: ['smug', 'Ufufu. So close.'] },
  };

  global.DATA = { SLOTS, DAYS, STAGES, CAPS, LOCATIONS, ACTIVITIES, ITEMS, FORTUNES, GIRLS, GIRL_ORDER, WEATHER, RAIN_SHELTER, INTERACTIONS, WALK_LINES, SLEEPOVER, FOODS, CITY, PAIRS, HAREM, LIFE, LIFE_FX, COSPLAYS, POSES, VS, YUMEKO_CARDS, CHAT, VARIETY };
})(window);
