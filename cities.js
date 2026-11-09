// City guides for the Local tab. Pittsburgh's slang and customs live in app.js (they are also used by the Lens);
// the other cities are written here. Add a city by copying one entry. Pause-map numbers are sample data.
window.LINGER_CITIES = {
  pgh: {
    name: 'Pittsburgh', state: 'PA', nick: 'The Steel City', lat: 40.4406, lon: -79.9959, emoji: '🌉',
    transit: 'ConnectCard · buses and the T (Pittsburgh Regional Transit)',
    talk: 'Ask about the Steelers, or which bridge or neighborhood someone likes best. There are over 400 bridges.',
    around: [
      { ic: '🧭', title: 'Inbound and outbound', body: 'Bus and T signs say Inbound (toward Downtown) or Outbound (away from it), not north or south.' },
      { ic: '🚋', title: 'The T and the buses', body: 'Pittsburgh Regional Transit runs the T (light rail) and buses. Pay with a ConnectCard or the app.' },
      { ic: '🚠', title: 'The inclines', body: 'Two old cable cars, the Monongahela and Duquesne Inclines, climb Mount Washington. Locals use them too.' },
      { ic: '🌁', title: 'Tunnels and bridges', body: 'Directions often mention tunnels and bridges, like “take the Fort Pitt Tunnel”. Traffic slows down before them.' }
    ]
  },
  nyc: {
    name: 'New York', state: 'NY', nick: 'The Big Apple', lat: 40.7128, lon: -74.006, emoji: '🗽',
    transit: 'OMNY · tap your card or phone on the subway and buses',
    talk: 'Ask which borough someone lives in, or whether they root for the Yankees or the Mets.',
    slang: [
      { k: 'bodega', word: 'bodega', say: 'boh-DAY-guh', meaning: 'A small corner store with snacks, drinks and basics, often open late.', sentence: 'I’ll grab a coffee at the bodega.', local: 'Many bodegas have a shop cat. Ordering a breakfast sandwich there is a New York routine.' },
      { k: 'deadass', word: 'deadass', say: 'DED-ass', meaning: 'Seriously; for real.', sentence: 'Deadass, the train was 40 minutes late.', local: 'Very casual and a little rude. Fine with friends, not at work.' },
      { k: 'mad', word: 'mad', say: 'mad', meaning: 'Very, or a lot of.', sentence: 'It’s mad cold today.', local: 'Here it usually doesn’t mean angry.' },
      { k: 'schlep', word: 'schlep', say: 'shlep', meaning: 'To carry something heavy, or to make a long, annoying trip.', sentence: 'I had to schlep my groceries up five floors.', local: 'Comes from Yiddish. You’ll hear lots of Yiddish words in New York.' },
      { k: 'online', word: 'on line', say: 'on line', meaning: 'Waiting in line.', sentence: 'We stood on line for an hour.', local: 'New Yorkers say “on line” where most Americans say “in line”.' },
      { k: 'thecity', word: 'the city', say: 'the city', meaning: 'Manhattan, when people in the other boroughs talk about it.', sentence: 'I’m going into the city tonight.', local: 'Even though Brooklyn and Queens are part of New York City too.' }
    ],
    customs: [
      { ic: '🚶', tag: 'Sidewalks', title: 'Keep moving', body: 'Walk fast, stay to the right, and step to the side if you need to stop and check your phone.' },
      { ic: '🚇', tag: 'Subway', title: 'Let people off first', body: 'Stand beside the train doors until everyone getting off is out, then get on.' },
      { ic: '💵', tag: 'Tipping', title: 'Tip 18–20%', body: 'At sit-down restaurants, tip about 18–20% of the bill. Delivery workers expect a tip too.' },
      { ic: '🏢', tag: 'Apartments', title: 'A “walk-up” has no elevator', body: 'Listings say walk-up when you take the stairs. A 5th-floor walk-up means five flights.' }
    ],
    around: [
      { ic: '🧭', title: 'Uptown and downtown', body: 'In Manhattan, uptown means north and downtown means south. Subway entrances are often marked with one or the other.' },
      { ic: '🚄', title: 'Local and express trains', body: 'Express trains skip stops. Check the sign on the train or the map before you get on.' },
      { ic: '💳', title: 'OMNY', body: 'Tap your bank card or phone at the turnstile to pay. The old MetroCard is being phased out.' },
      { ic: '🅿️', title: 'Alternate side parking', body: 'Street signs say which days you must move your car for street cleaning. Tickets are common.' }
    ]
  },
  phl: {
    name: 'Philadelphia', state: 'PA', nick: 'The City of Brotherly Love', lat: 39.9526, lon: -75.1652, emoji: '🔔',
    transit: 'SEPTA Key card · buses, trolleys, subway and Regional Rail',
    talk: 'Ask about the Eagles, or where someone gets the best cheesesteak. Everyone has an opinion.',
    slang: [
      { k: 'jawn', word: 'jawn', say: 'jawn', meaning: 'Almost anything: a thing, a place, an event or a person.', sentence: 'Pass me that jawn.', local: 'The most Philly word there is. People use it everywhere.' },
      { k: 'wooder', word: 'wooder', say: 'WOOD-er', meaning: 'How many Philadelphians say “water”.', sentence: 'Let’s get some wooder ice.', local: '“Water ice” is a frozen treat like Italian ice, popular in summer.' },
      { k: 'hoagie', word: 'hoagie', say: 'HOH-gee', meaning: 'A long sandwich on a roll (a sub).', sentence: 'I’ll get an Italian hoagie for lunch.', local: 'Called a “sub” or “hero” in other cities.' },
      { k: 'downtheshore', word: 'down the shore', say: 'down the shore', meaning: 'Going to the New Jersey beaches.', sentence: 'We’re going down the shore this weekend.', local: 'Summer weekends, many families head to the Jersey Shore.' },
      { k: 'youse', word: 'youse', say: 'yooz', meaning: 'You all.', sentence: 'Are youse coming tonight?', local: 'Philly’s version of “y’all” or Pittsburgh’s “yinz”.' },
      { k: 'wit', word: 'wit', say: 'wit', meaning: 'Short for “with”, used when ordering a cheesesteak with fried onions.', sentence: 'One provolone, wit.', local: '“Witout” means without onions.' }
    ],
    customs: [
      { ic: '🥩', tag: 'Food', title: 'Ordering a cheesesteak', body: 'Say the cheese first, then “wit” or “witout” onions. Have your money ready at busy stands.' },
      { ic: '🦅', tag: 'Sports', title: 'Eagles game days', body: 'Lots of people wear green. Fans are loud and proud; the game is easy small talk.' },
      { ic: '🏘️', tag: 'Neighbors', title: 'Rowhomes and stoops', body: 'Neighbors often sit on their front steps and chat. Saying hi is normal and friendly.' },
      { ic: '🎉', tag: 'Holidays', title: 'The Mummers Parade', body: 'On New Year’s Day, clubs in big costumes parade down Broad Street. It’s a long local tradition.' }
    ],
    around: [
      { ic: '🚇', title: 'SEPTA', body: 'SEPTA runs buses, trolleys, two subway lines (Market–Frankford and Broad Street) and Regional Rail. Pay with a SEPTA Key card.' },
      { ic: '🏙️', title: 'Center City', body: 'Center City means downtown. City Hall sits right in the middle.' },
      { ic: '🧭', title: 'Broad and Market', body: 'Broad Street runs north–south and Market Street runs east–west. They cross at City Hall, which helps you find your way.' }
    ]
  },
  chi: {
    name: 'Chicago', state: 'IL', nick: 'The Windy City', lat: 41.8781, lon: -87.6298, emoji: '🏙️',
    transit: 'Ventra card or app · the L trains and CTA buses',
    talk: 'Ask whether someone is a Cubs or White Sox fan, or about deep-dish versus thin-crust pizza.',
    slang: [
      { k: 'thel', word: 'the L', say: 'the el', meaning: 'Chicago’s train system, much of it elevated above the street.', sentence: 'Take the L to the Loop.', local: 'Lines are named by color: Red, Blue, Brown, Green, Orange, Pink, Purple and Yellow.' },
      { k: 'pop', word: 'pop', say: 'pop', meaning: 'Soda, a soft drink.', sentence: 'Do you want a pop with that?', local: 'Most of the Midwest says “pop”, not “soda”.' },
      { k: 'gymshoes', word: 'gym shoes', say: 'jim shoes', meaning: 'Sneakers, for any use.', sentence: 'Wear your gym shoes, we’re walking a lot.', local: 'You’ll hear it in Chicago even when nobody is going to the gym.' },
      { k: 'dibs', word: 'dibs', say: 'dibs', meaning: 'Saving a shoveled parking spot with chairs or other objects after snow.', sentence: 'My neighbor put dibs on that spot.', local: 'Not an official rule, but moving someone’s dibs chair can upset people.' },
      { k: 'thebean', word: 'the Bean', say: 'the bean', meaning: 'The giant mirror sculpture (Cloud Gate) in Millennium Park.', sentence: 'Let’s meet at the Bean.', local: 'A popular meeting point and photo spot.' },
      { k: 'jewels', word: 'Jewels', say: 'JOO-uls', meaning: 'The Jewel-Osco grocery store.', sentence: 'I’m going to the Jewels.', local: 'Locals often add an “s” to store names.' }
    ],
    customs: [
      { ic: '🪑', tag: 'Winter', title: 'Dibs', body: 'After a big snow, people save the spot they shoveled with a chair. Leave it alone.' },
      { ic: '🌬️', tag: 'Weather', title: 'Dress for the wind', body: 'Winter wind chill can feel much colder than the temperature. A warm hat and gloves matter.' },
      { ic: '🌭', tag: 'Food', title: 'Chicago-style hot dogs', body: 'They come with many toppings, but locals famously skip ketchup.' },
      { ic: '⚾', tag: 'Sports', title: 'North Side, South Side', body: 'Cubs fans are often North Siders, White Sox fans often South Siders. It’s a friendly rivalry.' }
    ],
    around: [
      { ic: '💳', title: 'Ventra', body: 'Pay for the L and CTA buses with a Ventra card, the Ventra app, or by tapping your bank card.' },
      { ic: '🧭', title: 'The lake is east', body: 'Lake Michigan is always east. Locals give directions using it.' },
      { ic: '🔢', title: 'The address grid', body: 'State and Madison streets are the zero point. Address numbers count out from there; 800 is about one mile.' },
      { ic: '🏙️', title: 'The Loop', body: 'Downtown, named for the loop of L tracks around it.' }
    ]
  },
  bos: {
    name: 'Boston', state: 'MA', nick: 'Beantown', lat: 42.3601, lon: -71.0589, emoji: '⚓',
    transit: 'CharlieCard · the T (MBTA) subway, buses and ferries',
    talk: 'Ask about the Red Sox, or someone’s Dunkin’ order. Both are favorite topics.',
    slang: [
      { k: 'wicked', word: 'wicked', say: 'WICK-id', meaning: 'Very.', sentence: 'It’s wicked cold out there.', local: 'Positive or negative: “wicked good”, “wicked hard”.' },
      { k: 'packie', word: 'packie', say: 'PACK-ee', meaning: 'A liquor store (from “package store”).', sentence: 'Stop at the packie on the way.', local: 'Liquor is sold in separate stores in much of Massachusetts.' },
      { k: 'bubbler', word: 'bubbler', say: 'BUB-ler', meaning: 'A drinking fountain.', sentence: 'There’s a bubbler by the gym.', local: 'Most Americans say “water fountain”.' },
      { k: 'frappe', word: 'frappe', say: 'frap', meaning: 'A milkshake made with ice cream.', sentence: 'I’ll have a coffee frappe.', local: 'In Boston, a “milkshake” may come without ice cream.' },
      { k: 'thet', word: 'the T', say: 'the tee', meaning: 'Boston’s subway system (the MBTA).', sentence: 'Take the T to Park Street.', local: 'Lines are named by color: Red, Orange, Blue and Green.' },
      { k: 'rotary', word: 'rotary', say: 'ROH-tuh-ree', meaning: 'A traffic circle (roundabout).', sentence: 'Go around the rotary and take the second exit.', local: 'Cars already in the circle usually have the right of way.' }
    ],
    customs: [
      { ic: '📦', tag: 'Housing', title: 'September 1st moving day', body: 'Many leases start September 1, so thousands of people move the same day. Book movers early.' },
      { ic: '🪑', tag: 'Winter', title: 'Space savers', body: 'After big snowstorms, people save shoveled parking spots with chairs or cones for a few days.' },
      { ic: '☕', tag: 'Daily life', title: 'Dunkin’ culture', body: 'Dunkin’ (“Dunks”) is everywhere. Iced coffee all year, even in winter, is very normal.' },
      { ic: '🎓', tag: 'People', title: 'A student city', body: 'With so many universities, neighborhoods change a lot in September and May.' }
    ],
    around: [
      { ic: '💳', title: 'CharlieCard', body: 'Use a CharlieCard or tap your bank card to ride the T and buses.' },
      { ic: '🧭', title: 'Inbound and outbound', body: 'Inbound trains go toward downtown (Park Street and Downtown Crossing). Outbound trains go away from it.' },
      { ic: '🔄', title: 'Rotaries', body: 'Slow down and give way to cars already in the rotary.' }
    ]
  },
  hou: {
    name: 'Houston', state: 'TX', nick: 'Space City', lat: 29.7604, lon: -95.3698, emoji: '🚀',
    transit: 'METRO Q Card or app · buses and METRORail',
    talk: 'Ask about the Astros, the heat, or someone’s favorite Tex-Mex or barbecue spot.',
    slang: [
      { k: 'yall', word: 'y’all', say: 'yawl', meaning: 'You all.', sentence: 'Are y’all coming to the cookout?', local: 'Used by almost everyone, in casual and polite talk.' },
      { k: 'fixinto', word: 'fixin’ to', say: 'FIX-in tuh', meaning: 'About to.', sentence: 'I’m fixin’ to leave.', local: 'Nothing is being repaired. It means you’re going to do something soon.' },
      { k: 'feederroad', word: 'feeder road', say: 'FEE-der road', meaning: 'The frontage road that runs beside a freeway.', sentence: 'Take the feeder road to the exit.', local: 'Many stores are on feeder roads. Directions mention them a lot.' },
      { k: 'theloop', word: 'the Loop', say: 'the loop', meaning: 'The area inside the I-610 freeway, around central Houston.', sentence: 'They live inside the Loop.', local: '“Inside the Loop” and “outside the Loop” describe neighborhoods.' },
      { k: 'kolache', word: 'kolache', say: 'koh-LAH-chee', meaning: 'A soft pastry, often filled with fruit or sausage, eaten for breakfast.', sentence: 'Let’s grab kolaches before work.', local: 'Brought by Czech immigrants; now a Texas breakfast favorite.' }
    ],
    customs: [
      { ic: '🌀', tag: 'Weather', title: 'Hurricane season', body: 'From June to November, keep water, flashlights and a plan. Follow city alerts when a storm is coming.' },
      { ic: '🥵', tag: 'Weather', title: 'The heat is serious', body: 'Summers are hot and humid. Drink water and avoid long walks in the afternoon.' },
      { ic: '🤠', tag: 'Events', title: 'Rodeo season', body: 'The Houston Livestock Show and Rodeo runs each spring. Boots and cowboy hats are everywhere.' },
      { ic: '👋', tag: 'People', title: 'Friendly and polite', body: 'Strangers often say hi. “Yes ma’am” and “yes sir” are polite, not formal.' }
    ],
    around: [
      { ic: '🚗', title: 'A driving city', body: 'Most people drive. METRO buses and METRORail cover the center; pay with a Q Card or the app.' },
      { ic: '🛣️', title: 'Freeway names', body: 'Freeways have names and numbers, like I-10, also called the Katy Freeway. Both are used in directions.' },
      { ic: '↪️', title: 'Feeder roads', body: 'To reach most stores, exit the freeway onto the feeder road beside it.' }
    ]
  },
  la: {
    name: 'Los Angeles', state: 'CA', nick: 'The City of Angels', lat: 34.0522, lon: -118.2437, emoji: '🌴',
    transit: 'TAP card or app · Metro trains and buses',
    talk: 'Ask about traffic (everyone has a story), the Dodgers or the Lakers, or a favorite taco spot.',
    slang: [
      { k: 'the405', word: 'the 405', say: 'the four-oh-five', meaning: 'A freeway. Angelenos put “the” before freeway numbers.', sentence: 'Avoid the 405 at rush hour.', local: 'You’ll hear “the 10”, “the 101” and “the 5” all the time.' },
      { k: 'sigalert', word: 'Sigalert', say: 'SIG-uh-lert', meaning: 'A traffic alert for a major road blockage.', sentence: 'There’s a Sigalert on the 101.', local: 'Named after Loyd Sigmon, who created the alerts.' },
      { k: 'junegloom', word: 'June gloom', say: 'june gloom', meaning: 'Gray, cloudy mornings in late spring and early summer.', sentence: 'It’s just June gloom; it’ll clear up by noon.', local: 'Bring a light jacket for the morning.' },
      { k: 'thevalley', word: 'the Valley', say: 'the valley', meaning: 'The San Fernando Valley, north of central LA.', sentence: 'She lives in the Valley.', local: 'Often a few degrees hotter than the rest of LA.' },
      { k: 'angeleno', word: 'Angeleno', say: 'an-juh-LEE-noh', meaning: 'Someone who lives in Los Angeles.', sentence: 'He’s a lifelong Angeleno.', local: 'From the Spanish name of the city.' }
    ],
    customs: [
      { ic: '🌎', tag: 'Safety', title: 'Earthquake ready', body: 'If it shakes: drop, cover and hold on. Keep water and a small emergency kit at home.' },
      { ic: '⏱️', tag: 'Talk', title: 'Distance is time', body: 'People say “it’s 20 minutes away”, not miles, because traffic changes everything.' },
      { ic: '🌮', tag: 'Food', title: 'Taco trucks', body: 'Some of the best food comes from trucks and stands. Many take cash only.' },
      { ic: '🪧', tag: 'Parking', title: 'Read every parking sign', body: 'Signs list street cleaning days, time limits and permits. Check them all before you leave your car.' }
    ],
    around: [
      { ic: '💳', title: 'TAP', body: 'Pay for Metro trains and buses with a TAP card or the TAP app.' },
      { ic: '🛣️', title: 'Freeways', body: '“The 10”, “the 101”: freeways are the main way around. Rush hour is roughly 7–10 a.m. and 3–7 p.m.' },
      { ic: '🚇', title: 'Metro lines', body: 'Metro Rail lines have letters and colors (like the B Line, red). They connect downtown, Hollywood, the beach and more.' }
    ]
  },

  // ---------- outside the US: these have their own emergency numbers and essentials (ess) ----------
  london: {
    name: 'London', state: 'UK', nick: 'The Big Smoke', lat: 51.5074, lon: -0.1278, emoji: '🎡',
    transit: 'Contactless card or Oyster · the Tube, buses and Overground',
    talk: 'Talk about the weather (really), or ask which part of London someone lives in. Football teams start long conversations.',
    ess: [['🚨', '999', 'Emergencies: police, fire, ambulance'], ['☎️', '111', 'NHS help when it’s urgent but not an emergency'], ['🚇', 'Transit', 'Tap the same card in and out on the Tube'], ['💷', 'Tipping', 'Restaurants often add a 12.5% service charge']],
    slang: [
      { k: 'cheers', word: 'cheers', say: 'cheerz', meaning: 'Thanks. Also a friendly “bye”.', sentence: 'Cheers, see you tomorrow!', local: 'You’ll hear it many times a day, to bus drivers and in shops.' },
      { k: 'quid', word: 'quid', say: 'kwid', meaning: 'A pound (£1). The plural is also “quid”.', sentence: 'The sandwich was five quid.', local: 'Casual. Prices on signs still say £.' },
      { k: 'knackered', word: 'knackered', say: 'NAK-erd', meaning: 'Very tired.', sentence: 'I’m knackered after that commute.', local: 'Casual, fine with coworkers.' },
      { k: 'innit', word: 'innit', say: 'IN-it', meaning: '“Isn’t it?” added to the end of a sentence to ask someone to agree.', sentence: 'It’s cold today, innit?', local: 'Very casual, mostly younger Londoners.' },
      { k: 'loo', word: 'loo', say: 'loo', meaning: 'Toilet, bathroom.', sentence: 'Where’s the loo?', local: 'Polite and common. “Restroom” sounds American here.' },
      { k: 'fancy', word: 'fancy', say: 'FAN-see', meaning: 'To want or like something.', sentence: 'Do you fancy a cup of tea?', local: 'An invitation, not about expensive things.' }
    ],
    customs: [
      { ic: '🧍', tag: 'Queues', title: 'Always queue', body: 'People line up (“queue”) for buses, shops and bars. Cutting in line is very rude.' },
      { ic: '🚇', tag: 'Tube', title: 'Stand on the right', body: 'On escalators, stand on the right and walk on the left. Keep your voice low on trains.' },
      { ic: '🍺', tag: 'Pubs', title: 'Order at the bar', body: 'In most pubs you order and pay at the bar. Friends often take turns buying a “round” for the group.' },
      { ic: '🙂', tag: 'Talk', title: 'Polite and indirect', body: '“That’s interesting” or “not bad” can mean the opposite. People say “sorry” a lot, even when it isn’t their fault.' }
    ],
    around: [
      { ic: '💳', title: 'Tap in and out', body: 'Use one contactless card or phone for the Tube, buses and trains. Buses don’t take cash.' },
      { ic: '⚠️', title: 'Mind the gap', body: 'Tube lines have names and colors (like the Central line, red), not numbers. Watch the gap between train and platform.' },
      { ic: '👀', title: 'Look right', body: 'Cars drive on the left. Crossings are painted “LOOK RIGHT” to remind you.' }
    ]
  },
  toronto: {
    name: 'Toronto', state: 'Canada', nick: 'The 6ix', lat: 43.6532, lon: -79.3832, emoji: '🍁',
    transit: 'PRESTO card or contactless · TTC subway, streetcars and buses',
    talk: 'Ask about the Leafs or the Raptors, the best neighborhood for food, or how someone survives the winter.',
    ess: [['🚨', '911', 'Emergencies: police, fire, ambulance'], ['☎️', '311', 'City help: garbage, roads, noise'], ['🚋', 'Transit', 'Tap PRESTO or a contactless card'], ['💵', 'Tipping', '15–20% at sit-down restaurants']],
    slang: [
      { k: 'doubledouble', word: 'double-double', say: 'DUH-bul DUH-bul', meaning: 'A coffee with two creams and two sugars.', sentence: 'Can I get a large double-double?', local: 'Made famous by Tim Hortons, a coffee chain everywhere in Canada.' },
      { k: 'toque', word: 'toque', say: 'took', meaning: 'A warm knitted winter hat.', sentence: 'Wear a toque, it’s minus ten out.', local: 'Americans call it a beanie.' },
      { k: 'loonie', word: 'loonie', say: 'LOO-nee', meaning: 'The one-dollar coin. The two-dollar coin is a “toonie”.', sentence: 'The locker takes a loonie.', local: 'Named after the loon, a bird on the coin.' },
      { k: 'washroom', word: 'washroom', say: 'WASH-room', meaning: 'Bathroom, toilet.', sentence: 'The washroom is at the back.', local: 'The usual polite word in Canada.' },
      { k: 'eh', word: 'eh', say: 'ay', meaning: 'Added to the end of a sentence to mean “right?” or “don’t you agree?”.', sentence: 'Nice day, eh?', local: 'Friendly and casual.' }
    ],
    customs: [
      { ic: '🙏', tag: 'Manners', title: 'Say sorry', body: 'Canadians say “sorry” to be polite, even when bumping into someone was not their fault.' },
      { ic: '🥾', tag: 'Homes', title: 'Shoes off inside', body: 'Take your shoes off when you enter someone’s home, especially in winter.' },
      { ic: '🚪', tag: 'Manners', title: 'Hold the door', body: 'Hold the door for the person behind you. They will usually say thank you.' },
      { ic: '❄️', tag: 'Winter', title: 'Dress in layers', body: 'Winters are long and cold. Locals wear boots, a toque and a warm coat from about November to March.' }
    ],
    around: [
      { ic: '🚋', title: 'Streetcars', body: 'Red streetcars run on tracks in the street. When the doors open, cars must stop behind them.' },
      { ic: '🏙️', title: 'The PATH', body: 'Downtown has an underground walkway (the PATH) linking offices and shops, useful in winter.' },
      { ic: '🚆', title: 'GO Transit', body: 'Green-and-white GO trains and buses go to the suburbs. PRESTO works on them too.' }
    ]
  },
  sydney: {
    name: 'Sydney', state: 'Australia', nick: 'The Harbour City', lat: -33.8688, lon: 151.2093, emoji: '🏖️',
    transit: 'Opal card or contactless · trains, buses, ferries and light rail',
    talk: 'Ask about the beach someone likes best, their footy team, or weekend plans.',
    ess: [['🚨', '000', 'Emergencies: police, fire, ambulance'], ['🗣️', '131 450', 'Free phone interpreter (TIS National)'], ['🚆', 'Transit', 'Tap on and off with Opal or a contactless card'], ['💵', 'Tipping', 'Not expected; about 10% for great service']],
    slang: [
      { k: 'arvo', word: 'arvo', say: 'AH-voh', meaning: 'Afternoon.', sentence: 'See you this arvo.', local: 'Australians shorten many words: brekkie (breakfast), barbie (barbecue).' },
      { k: 'servo', word: 'servo', say: 'SER-voh', meaning: 'A gas station.', sentence: 'Let’s stop at the servo for petrol.', local: 'Gas is called petrol.' },
      { k: 'heaps', word: 'heaps', say: 'heeps', meaning: 'A lot, or very.', sentence: 'Thanks heaps!', local: 'Very common and friendly.' },
      { k: 'noworries', word: 'no worries', say: 'noh WUH-reez', meaning: 'You’re welcome, or it’s okay.', sentence: '“Thanks for the help.” “No worries!”', local: 'You’ll hear it all day.' },
      { k: 'thongs', word: 'thongs', say: 'thongz', meaning: 'Flip-flops (sandals).', sentence: 'You can wear thongs to the beach.', local: 'Not underwear, as it means in the US.' }
    ],
    customs: [
      { ic: '🍻', tag: 'Friends', title: 'Shouting', body: '“It’s my shout” means “I’ll pay”. Friends take turns buying drinks for the group.' },
      { ic: '🍷', tag: 'Food', title: 'BYO', body: 'Many restaurants are BYO: bring your own wine. There may be a small “corkage” fee.' },
      { ic: '☀️', tag: 'Health', title: 'Sun safety', body: 'The sun is very strong. Wear sunscreen, a hat and sunglasses, and swim between the red and yellow flags.' },
      { ic: '👋', tag: 'Talk', title: 'First names', body: 'People use first names with almost everyone, including bosses and doctors.' }
    ],
    around: [
      { ic: '💳', title: 'Tap on, tap off', body: 'Tap your Opal card or phone when you get on and off trains, buses, ferries and light rail.' },
      { ic: '⛴️', title: 'Ferries', body: 'Ferries are normal public transport here, from Circular Quay to Manly and around the harbour.' },
      { ic: '👀', title: 'Look right', body: 'Cars drive on the left. Look right first when you cross the road.' }
    ]
  },
  singapore: {
    name: 'Singapore', state: 'Singapore', nick: 'The Lion City', lat: 1.3521, lon: 103.8198, emoji: '🦁',
    transit: 'EZ-Link card or contactless · MRT trains and buses',
    talk: 'Ask about the best hawker stall for chicken rice or laksa. Food is the favorite topic.',
    ess: [['🚨', '999', 'Police'], ['🚑', '995', 'Ambulance and fire'], ['🚇', 'Transit', 'Tap in and out on MRT and buses'], ['💵', 'Tipping', 'Not expected; bills include a 10% service charge']],
    slang: [
      { k: 'lah', word: 'lah', say: 'lah', meaning: 'Added to the end of a sentence to make it softer or stronger.', sentence: 'Don’t worry lah, we’ll make it.', local: 'Part of Singlish, the casual English of Singapore.' },
      { k: 'chope', word: 'chope', say: 'chohp', meaning: 'To save a seat, often by leaving a tissue packet on the table.', sentence: 'I’ll chope the table, you order.', local: 'If you see tissues on a table, that seat is taken.' },
      { k: 'shiok', word: 'shiok', say: 'shee-OHK', meaning: 'Great, very satisfying, often about food.', sentence: 'This laksa is so shiok!', local: 'Happy, casual word.' },
      { k: 'makan', word: 'makan', say: 'MAH-kahn', meaning: 'To eat, or food. From Malay.', sentence: 'Want to go makan?', local: 'People of every background use it.' },
      { k: 'kiasu', word: 'kiasu', say: 'kee-AH-soo', meaning: 'Afraid of missing out, so you rush or queue early.', sentence: 'So kiasu, he queued two hours early.', local: 'From Hokkien. Often said as a joke.' }
    ],
    customs: [
      { ic: '🍜', tag: 'Hawker centres', title: 'Return your tray', body: 'At hawker centres and food courts, take your tray and dishes back to the return point. You can be fined if you don’t.' },
      { ic: '🚫', tag: 'Rules', title: 'Fines are real', body: 'No eating or drinking on the MRT, no littering and no jaywalking. Durians are not allowed on trains.' },
      { ic: '🥿', tag: 'Homes', title: 'Shoes off', body: 'Take your shoes off before entering someone’s home.' },
      { ic: '🤝', tag: 'Respect', title: 'Many cultures', body: 'Chinese, Malay, Indian and other communities live side by side. Learn the main holidays, like Chinese New Year, Hari Raya and Deepavali.' }
    ],
    around: [
      { ic: '🚇', title: 'MRT', body: 'Trains are fast, clean and air-conditioned. Lines have colors and codes, like NS (North–South, red).' },
      { ic: '🚌', title: 'Buses', body: 'Tap your card when you get on and when you get off, so you pay the right fare.' },
      { ic: '📱', title: 'Ride apps', body: 'Grab is the main app for taxis and rides, and also for food delivery.' }
    ]
  }
};
