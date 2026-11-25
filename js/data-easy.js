/* Easy, open-ended prompts, plus a difficulty level for every prompt.
   The big prompts ("Name a person in the Bible") are built from the answer keys
   that already exist, so nearly any valid answer is accepted. */
(function () {
  const byId = Object.fromEntries(window.PROMPTS.map((p) => [p.id, p]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // famous first (with their own %), then everything else from the source prompts at a small %
  function union(famous, sourceIds, scale, cap) {
    const out = [], names = new Set();
    famous.forEach((a) => { out.push([a[0], a[1], a[2], a[3], a[4] || []]); names.add(norm(a[0])); });
    sourceIds.forEach((id) => (byId[id] ? byId[id].answers : []).forEach((a) => {
      const k = norm(a[0]);
      if (names.has(k)) {
        // same name already in: just borrow its aliases
        const hit = out.find((o) => norm(o[0]) === k);
        hit[4] = hit[4].concat(a[4] || []);
        return;
      }
      names.add(k);
      out.push([a[0], Math.min(cap, +(a[1] * scale).toFixed(2)), a[2], a[3], (a[4] || []).slice()]);
    }));
    // an alias may not be another answer's own name (e.g. "Saul" is a king, not just Paul's old name)
    const claimed = new Set();
    out.forEach((o) => {
      o[4] = o[4].filter((al) => {
        const k = norm(al);
        if (names.has(k) || claimed.has(k)) return false;
        claimed.add(k);
        return true;
      });
    });
    return out;
  }

  const TRADITION = [
    [['anne', 'ann', 'st anne', 'joachim'], "Mary's parents are named by tradition (the Protoevangelium of James), not by Scripture."],
    [['caspar', 'gaspar', 'melchior', 'balthasar'], 'The wise men are never named. Matthew 2:1 just says "wise men from the East."'],
    [['dismas'], 'The good thief has no name in Luke 23.'],
    [['longinus'], 'The centurion at the cross is never named (Mark 15:39).'],
    [['veronica'], 'Her veil comes from tradition. No Veronica appears in the Gospels.'],
  ];

  window.PROMPTS.push(
    {
      id: 'person',
      text: 'Name a person in the Bible',
      answers: union([
        ['Jesus', 22, 'Luke 2:11', '"A Saviour, who is Christ the Lord."', ['jesus christ', 'christ', 'jesus of nazareth']],
        ['Moses', 12, 'Exodus 3:10', 'Led Israel out of Egypt.', []],
        ['David', 9, '1 Samuel 17:49', 'Felled Goliath with one stone.', []],
        ['Noah', 8, 'Genesis 6:9', 'Built the ark.', ['noe']],
        ['Abraham', 6, 'Genesis 12:1', 'Called to leave his country for a land God would show him.', ['abram']],
        ['Mary', 6, 'Luke 1:38', '"Let it be to me according to your word."', ['virgin mary', 'blessed virgin mary', 'our lady']],
        ['Adam', 5, 'Genesis 2:7', 'Formed from the dust of the ground.', []],
        ['Peter', 4, 'Matthew 16:18', '"On this rock I will build my Church."', ['simon peter', 'cephas']],
        ['Paul', 3.5, 'Acts 9:4', '"Saul, Saul, why do you persecute me?"', []],
        ['Eve', 3, 'Genesis 3:20', '"The mother of all living."', []],
        ['Joseph', 3, 'Genesis 37:3', 'Jacob\'s son with the special robe, or Mary\'s husband. Either counts.', []],
        ['Jonah', 2.5, 'Jonah 1:17', 'Three days in the great fish.', ['jonas']],
        ['Daniel', 2.5, 'Daniel 6:16', 'Spared in the lions\' den.', []],
        ['Goliath', 2, '1 Samuel 17:4', 'The Philistine giant.', []],
        ['Samson', 2, 'Judges 16:30', 'Brought the house down.', []],
        ['Solomon', 2, '1 Kings 3:9', 'Asked for wisdom.', []],
        ['John the Baptist', 1.5, 'Matthew 3:1', 'Preached in the wilderness of Judea.', ['john baptist', 'baptist']],
        ['John', 1.5, 'John 21:20', 'The disciple whom Jesus loved.', []],
        ['Judas', 1.5, 'Matthew 26:14', 'Betrayed Jesus for thirty pieces of silver.', ['judas iscariot']],
        ['Elijah', 1.5, '2 Kings 2:11', 'Taken up in a whirlwind.', ['elias']],
        ['Cain', 1.2, 'Genesis 4:8', 'Killed his brother Abel.', []],
        ['Isaac', 1.2, 'Genesis 22:2', 'The son Abraham was asked to offer.', []],
        ['Jacob', 1.2, 'Genesis 28:12', 'Dreamed of a ladder to heaven.', []],
        ['Abel', 1, 'Genesis 4:2', 'A keeper of sheep.', []],
        ['Lazarus', 1, 'John 11:43', '"Lazarus, come out."', []],
        ['Pontius Pilate', 1, 'Matthew 27:24', 'Washed his hands before the crowd.', ['pilate']],
        ['Zacchaeus', 0.7, 'Luke 19:4', 'Climbed a sycamore tree to see Jesus.', ['zaccheus']],
        ['Lot', 0.6, 'Genesis 19:1', 'Abraham\'s nephew, rescued from Sodom.', []],
        ['Methuselah', 0.6, 'Genesis 5:27', 'Lived 969 years.', ['mathusala']],
        ['Nicodemus', 0.4, 'John 3:2', 'Came to Jesus by night.', []],
        ['Barabbas', 0.3, 'Mark 15:15', 'Released instead of Jesus.', []],
        ['Mephibosheth', 0.1, '2 Samuel 9:6', "Jonathan's son, who ate at David's table.", ['miphiboseth']],
      ], ['woman', 'apostle', 'prophet', 'judge', 'jacob', 'king', 'renamed', 'prisoner', 'foreign-king', 'priest'], 0.2, 0.9),
      rejected: TRADITION,
    },
    {
      id: 'place',
      text: 'Name a place in the Bible',
      answers: union([
        ['Jerusalem', 24, '2 Samuel 5:7', 'The city of David.', []],
        ['Bethlehem', 16, 'Luke 2:4', 'Where Jesus was born.', []],
        ['Egypt', 9, 'Exodus 13:3', '"Out of the house of bondage."', []],
        ['Nazareth', 9, 'Luke 2:51', 'Where Jesus grew up.', []],
        ['Eden', 6, 'Genesis 2:8', 'A garden in Eden, in the east.', ['garden of eden']],
        ['Galilee', 4, 'Matthew 4:23', 'Where Jesus taught and healed.', []],
        ['Jericho', 4, 'Joshua 6:20', 'The walls fell down flat.', []],
        ['Babylon', 3.5, 'Psalm 137:1', '"By the waters of Babylon, there we sat down and wept."', []],
        ['Israel', 3, 'Genesis 32:28', 'Named after Jacob.', []],
        ['Canaan', 2, 'Genesis 12:5', 'The land promised to Abraham.', []],
        ['Rome', 2, 'Acts 28:16', 'Where Paul ended his journey.', []],
        ['Sodom', 1.5, 'Genesis 19:24', 'Destroyed by fire and brimstone.', []],
        ['Gethsemane', 1.5, 'Matthew 26:36', 'Where Jesus prayed the night before he died.', ['garden of gethsemane']],
        ['Golgotha', 1.2, 'John 19:17', '"The place of a skull."', ['calvary']],
        ['Nineveh', 1, 'Jonah 3:3', 'The great city Jonah was sent to.', []],
        ['Bethany', 0.8, 'John 11:1', 'Home of Lazarus, Mary and Martha.', []],
        ['Cana', 0.8, 'John 2:1', 'The wedding where water became wine.', []],
        ['Capernaum', 0.7, 'Matthew 4:13', 'Jesus made his home there.', []],
        ['Judea', 0.6, 'Matthew 2:1', 'Bethlehem of Judea.', ['judaea']],
        ['Samaria', 0.6, 'John 4:4', '"He had to pass through Samaria."', []],
        ['Gomorrah', 0.6, 'Genesis 19:24', "Sodom's neighbour in destruction.", []],
        ['Emmaus', 0.5, 'Luke 24:13', 'Two disciples walked there with the risen Jesus.', []],
        ['Babel', 0.5, 'Genesis 11:9', 'Where the languages were confused.', ['tower of babel']],
        ['Ur', 0.4, 'Genesis 11:31', "Abraham's starting point.", ['ur of the chaldeans']],
        ['Patmos', 0.3, 'Revelation 1:9', 'Where John saw the Revelation.', []],
        ['Bethel', 0.3, 'Genesis 28:19', '"House of God", where Jacob dreamed.', []],
        ['Hebron', 0.3, 'Genesis 23:19', 'Where Sarah was buried.', []],
        ['Goshen', 0.3, 'Genesis 47:27', 'Where Israel settled in Egypt.', []],
        ['Shiloh', 0.2, '1 Samuel 1:3', 'Where Hannah prayed.', []],
        ['Beersheba', 0.2, 'Genesis 21:31', 'The well of the oath.', []],
        ['Gath', 0.2, '1 Samuel 17:4', "Goliath's home town.", []],
        ['Endor', 0.1, '1 Samuel 28:7', 'Where Saul consulted a medium.', []],
      ], ['mountain', 'water', 'paul-city'], 0.25, 0.9),
      rejected: [
        [['heaven', 'hell'], 'Real, but not a place on the map. Try somewhere you could walk to.'],
        [['narnia', 'atlantis', 'london', 'america'], 'Not in Scripture.'],
      ],
    },
    {
      id: 'food',
      text: 'Name a food or drink in the Bible',
      answers: [
        ['Bread', 30, 'John 6:35', '"I am the bread of life."', ['loaf', 'loaves', 'unleavened bread']],
        ['Fish', 14, 'John 6:9', 'Five barley loaves and two fish.', ['fishes']],
        ['Wine', 9, 'John 2:9', 'Water made wine at Cana.', []],
        ['Manna', 8, 'Exodus 16:31', '"Like wafers made with honey."', []],
        ['Honey', 6, 'Matthew 3:4', 'Locusts and wild honey.', []],
        ['Figs', 4, 'Mark 11:13', 'The fig tree with nothing but leaves.', ['fig']],
        ['Grapes', 3.5, 'Numbers 13:23', 'One cluster carried on a pole between two men.', ['grape']],
        ['Milk', 2.5, 'Exodus 3:8', '"A land flowing with milk and honey."', []],
        ['Water', 2.5, 'John 4:10', '"He would have given you living water."', []],
        ['Lamb', 2, 'Exodus 12:8', 'The Passover lamb, roasted.', []],
        ['Olives', 2, 'Deuteronomy 8:8', 'A land of olive trees.', ['olive']],
        ['Lentils', 1.6, 'Genesis 25:34', 'Esau sold his birthright for lentil stew.', ['lentil stew', 'stew', 'pottage', 'lentil']],
        ['Locusts', 1.5, 'Matthew 3:4', "John the Baptist's diet.", ['locust']],
        ['Quail', 1.4, 'Exodus 16:13', 'Covered the camp in the evening.', ['quails']],
        ['Pomegranates', 1, 'Deuteronomy 8:8', 'One of the fruits of the good land.', ['pomegranate']],
        ['Barley', 0.9, 'John 6:9', 'The boy\'s loaves were barley.', []],
        ['Oil', 0.8, '1 Kings 17:14', 'The widow\'s jar of oil did not fail.', ['olive oil']],
        ['Wheat', 0.8, 'John 12:24', '"Unless a grain of wheat falls into the earth and dies..."', []],
        ['Fatted calf', 0.6, 'Luke 15:23', 'Killed for the prodigal son.', ['calf', 'veal']],
        ['Apples', 0.6, 'Proverbs 25:11', '"Apples of gold." (Eden\'s fruit is never named.)', ['apple']],
        ['Salt', 0.5, 'Matthew 5:13', '"You are the salt of the earth."', []],
        ['Raisins', 0.5, '1 Samuel 25:18', 'Abigail brought a hundred clusters.', ['raisin']],
        ['Almonds', 0.4, 'Genesis 43:11', 'A present for the man in Egypt.', ['almond']],
        ['Cucumbers', 0.3, 'Numbers 11:5', 'Israel missed the cucumbers of Egypt.', ['cucumber']],
        ['Melons', 0.3, 'Numbers 11:5', 'Also missed.', ['melon']],
        ['Onions', 0.3, 'Numbers 11:5', 'Missed as well.', ['onion']],
        ['Garlic', 0.2, 'Numbers 11:5', 'Even the garlic.', []],
        ['Leeks', 0.2, 'Numbers 11:5', 'And the leeks.', ['leek']],
        ['Eggs', 0.2, 'Luke 11:12', '"If he asks for an egg, will give him a scorpion?"', ['egg']],
        ['Cheese', 0.2, '1 Samuel 17:18', 'David carried ten cheeses to the camp.', ['cheeses']],
        ['Curds', 0.2, 'Isaiah 7:15', '"He shall eat curds and honey."', ['butter']],
        ['Vinegar', 0.2, 'John 19:29', 'Offered to Jesus on a sponge.', ['sour wine']],
        ['Mandrakes', 0.1, 'Genesis 30:14', 'Reuben found them in the field.', ['mandrake']],
        ['Pistachio nuts', 0.1, 'Genesis 43:11', 'Also in the present for Egypt.', ['pistachios', 'pistachio']],
      ],
      rejected: [
        [['pizza', 'chocolate', 'potato', 'potatoes', 'banana', 'tea', 'coffee'], 'Not in Scripture.'],
      ],
    },
    {
      id: 'book',
      text: 'Name a book of the Bible',
      answers: union([
        ['Genesis', 20, 'Genesis 1:1', '"In the beginning..."', []],
        ['Matthew', 12, 'Matthew 1:1', 'The first Gospel.', ['gospel of matthew']],
        ['John', 10, 'John 1:1', '"In the beginning was the Word."', ['gospel of john']],
        ['Psalms', 9, 'Psalm 23:1', '"The Lord is my shepherd."', ['psalm']],
        ['Revelation', 7, 'Revelation 21:4', '"He will wipe away every tear."', ['revelations', 'apocalypse']],
        ['Exodus', 6, 'Exodus 14:21', 'Out of Egypt and through the sea.', []],
        ['Mark', 4, 'Mark 1:1', 'The shortest Gospel.', []],
        ['Luke', 4, 'Luke 15:4', 'Home of the Parable of the Lost Sheep.', []],
        ['Acts', 3, 'Acts 2:4', 'Pentecost and the early Church.', []],
        ['Romans', 3, 'Romans 8:28', '"In everything God works for good."', []],
      ], ['ot-book', 'nt-book'], 0.3, 2.4),
      rejected: [
        [['enoch', 'book of enoch'], 'Quoted in Jude 14, but not in the canon.'],
        [['gospel of thomas', 'thomas'], 'Not in the canon.'],
        [['mormon', 'book of mormon'], 'Not in the Bible.'],
      ],
    },
  );

  // difficulty: 1 easy, 2 medium, 3 hard. "family" keeps near-duplicate prompts out of the same game.
  const LEVEL = {
    person: 1, place: 1, food: 1, animal: 1, book: 1, woman: 1, apostle: 1,
    prophet: 2, king: 2, mountain: 2, water: 2, jacob: 2, 'ot-book': 2, 'nt-book': 2, instrument: 2,
    judge: 3, renamed: 3, 'paul-city': 3, prisoner: 3, 'foreign-king': 3, priest: 3,
  };
  const FAMILY = { book: 'books', 'ot-book': 'books', 'nt-book': 'books', person: 'people', woman: 'people' };
  window.PROMPTS.forEach((p) => { p.level = LEVEL[p.id] || 2; p.family = FAMILY[p.id] || p.id; });
  window.DEAL = [1, 1, 1, 1, 2, 2, 3]; // easy start, one hard one to finish
})();
