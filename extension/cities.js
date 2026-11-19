// City guides for the Local tab. Pittsburgh's slang and customs live in app.js (they are also used by the Lens);
// the other cities are written here. Add a city by copying one entry.
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
  sd: {
    name: 'San Diego', state: 'CA', nick: 'America’s Finest City', lat: 32.7157, lon: -117.1611, emoji: '🌊',
    transit: 'PRONTO card or app · MTS Trolley and buses, and the COASTER train',
    talk: 'Ask about the Padres, a favorite beach, or where to get the best tacos.',
    slang: [
      { k: 'stoked', word: 'stoked', say: 'stohkt', meaning: 'Very happy or excited about something.', sentence: 'I’m so stoked for the beach this weekend.', local: 'Surfer slang you hear all over Southern California. Casual and friendly.' },
      { k: 'gnarly', word: 'gnarly', say: 'NAR-lee', meaning: 'Extreme. It can mean very good or very bad.', sentence: 'The waves were gnarly this morning.', local: 'Also from surf culture. The tone tells you if it’s good or bad.' },
      { k: 'pb', word: 'PB', say: 'pee-bee', meaning: 'Pacific Beach, a busy beach neighborhood with bars and a boardwalk.', sentence: 'We’re meeting at PB for sunset.', local: 'Locals shorten neighborhood names: PB, OB (Ocean Beach) and North Park.' },
      { k: 'caliburrito', word: 'California burrito', say: 'kal-ih-FOR-nyuh buh-REE-toh', meaning: 'A big burrito with carne asada (grilled beef) and French fries inside.', sentence: 'Let’s get California burritos after the game.', local: 'A San Diego favorite, sold at taco shops that are often open late.' },
      { k: 'tj', word: 'TJ', say: 'tee-jay', meaning: 'Tijuana, the city in Mexico just south of San Diego.', sentence: 'My cousins live in TJ, so we visit often.', local: 'Many people live on one side of the border and work or have family on the other.' }
    ],
    customs: [
      { ic: '🏖️', tag: 'Beaches', title: 'Swim near a lifeguard', body: 'Rip currents are common. Swim in front of a lifeguard tower. Alcohol isn’t allowed on most city beaches.' },
      { ic: '🩴', tag: 'Dress', title: 'Very casual', body: 'Shorts and sandals are normal almost everywhere, even at many offices and restaurants.' },
      { ic: '🛂', tag: 'Border', title: 'Crossing into Mexico', body: 'You need a passport or other approved document to come back into the U.S. If you aren’t a citizen, check how your visa or status affects travel before you go.' },
      { ic: '🌮', tag: 'Food', title: 'Taco shops', body: 'Small taco shops are everywhere. Order at the counter and wait for your name or number. Tipping is optional there.' }
    ],
    around: [
      { ic: '🚋', title: 'The Trolley', body: 'The MTS Trolley has color lines. The Blue Line runs from the Mexico border at San Ysidro up to UC San Diego.' },
      { ic: '💳', title: 'PRONTO', body: 'Pay with a PRONTO card or the PRONTO app. Tap the card reader on the platform before you get on the Trolley.' },
      { ic: '🛣️', title: 'Freeways', body: 'People say “the 5”, “the 8” and “the 15” for freeways. Traffic is heavy at rush hour.' },
      { ic: '🚆', title: 'The COASTER', body: 'A commuter train that runs along the coast from Downtown north to Oceanside, with ocean views.' }
    ]
  },
  mia: {
    name: 'Miami', state: 'FL', nick: 'The Magic City', lat: 25.7617, lon: -80.1918, emoji: '🌊',
    transit: 'EASY Card or EASY Pay app · Metrorail, Metrobus and the free Metromover',
    talk: 'Ask about the Heat or the Dolphins, or where to get the best cafecito.',
    slang: [
      { k: 'dale', word: 'dale', say: 'DAH-leh', meaning: 'OK, let’s go, or sounds good.', sentence: 'Dale, I’ll see you at six.', local: 'Spanish, but people use it in English sentences too. Very common and friendly.' },
      { k: 'quebola', word: 'qué bola', say: 'keh BOH-lah', meaning: 'What’s up? How’s it going?', sentence: 'Qué bola, man! How was your trip?', local: 'A Cuban greeting. Casual, for friends.' },
      { k: 'cafecito', word: 'cafecito', say: 'kah-feh-SEE-toh', meaning: 'A small cup of strong, sweet Cuban coffee.', sentence: 'Let’s take a cafecito break.', local: 'Part of daily life in Miami, at home and at work.' },
      { k: 'ventanita', word: 'ventanita', say: 'ven-tah-NEE-tah', meaning: 'A walk-up window where you order coffee and snacks.', sentence: 'Meet me at the ventanita on the corner.', local: 'Spanish for “little window”. People stand and chat there.' },
      { k: 'pastelito', word: 'pastelito', say: 'pahs-teh-LEE-toh', meaning: 'A flaky Cuban pastry, filled with guava, cheese or meat.', sentence: 'I brought pastelitos for the office.', local: 'Bringing a box of pastelitos to work is a kind gesture.' },
      { k: 'calleocho', word: 'Calle Ocho', say: 'KAH-yeh OH-choh', meaning: 'SW 8th Street, the main street of Little Havana.', sentence: 'We had dinner on Calle Ocho.', local: 'Known for Cuban food, music and domino games in the park.' }
    ],
    customs: [
      { ic: '🗣️', tag: 'Language', title: 'Spanish is everywhere', body: 'Many people speak Spanish first. It’s fine to start in English; people will switch if they can.' },
      { ic: '☕', tag: 'Work', title: 'The 3:05 coffee break', body: 'Many people take a cafecito break around 3:05 p.m. The time is a nod to Miami’s 305 area code.' },
      { ic: '🌀', tag: 'Weather', title: 'Hurricane season', body: 'From June to November, keep water, food and flashlights ready. Follow county alerts when a storm is coming.' },
      { ic: '😘', tag: 'Greetings', title: 'A kiss on the cheek', body: 'Friends and family often greet with one kiss on the cheek. At work, a handshake is fine.' }
    ],
    around: [
      { ic: '💳', title: 'EASY Card', body: 'Pay for Metrorail and Metrobus with an EASY Card or the EASY Pay app.' },
      { ic: '🚝', title: 'Metromover', body: 'A free, small automated train that loops around downtown and Brickell.' },
      { ic: '🚆', title: 'Tri-Rail and Brightline', body: 'Tri-Rail trains go north to Fort Lauderdale and West Palm Beach. Brightline is a faster train that also goes to Orlando.' },
      { ic: '🧭', title: 'The address grid', body: 'Streets run east to west and avenues run north to south. Addresses start with NW, NE, SW or SE, so always check which one.' }
    ]
  },
  atl: {
    name: 'Atlanta', state: 'GA', nick: 'The A', lat: 33.749, lon: -84.388, emoji: '🍑',
    transit: 'Breeze card or Breeze Mobile app · MARTA trains and buses',
    talk: 'Ask about the Braves or the Falcons, or whether someone lives inside or outside the Perimeter.',
    slang: [
      { k: 'thea', word: 'the A', say: 'the ay', meaning: 'Atlanta.', sentence: 'I’ve lived in the A for ten years.', local: 'Also “ATL”. Casual and proud.' },
      { k: 'itp', word: 'ITP', say: 'eye-tee-pee', meaning: 'Inside the Perimeter: the area inside the I-285 freeway loop.', sentence: 'They moved ITP to be closer to work.', local: '“OTP” means outside the Perimeter, in the suburbs.' },
      { k: 'spaghettijunction', word: 'Spaghetti Junction', say: 'spuh-GET-ee JUNK-shun', meaning: 'The huge, twisting interchange where I-85 meets I-285.', sentence: 'Traffic was stuck at Spaghetti Junction again.', local: 'You’ll hear it on traffic reports.' },
      { k: 'blessyourheart', word: 'bless your heart', say: 'bless your heart', meaning: 'A kind phrase of sympathy, but sometimes a polite way to say someone is foolish.', sentence: 'You drove all that way for nothing? Bless your heart.', local: 'Southern. Listen to the tone: it can be sweet or a little rude.' },
      { k: 'mightcould', word: 'might could', say: 'mite kood', meaning: 'Might be able to.', sentence: 'I might could help you move on Saturday.', local: 'Southern grammar. Casual and common.' }
    ],
    customs: [
      { ic: '🙏', tag: 'Manners', title: 'Southern politeness', body: 'People hold doors and say “yes ma’am” or “yes sir”. It’s polite, not formal.' },
      { ic: '🌼', tag: 'Spring', title: 'Pollen season', body: 'In spring, yellow pollen covers cars and sidewalks. If you have allergies, be ready.' },
      { ic: '❄️', tag: 'Winter', title: 'A little snow stops the city', body: 'Snow and ice are rare, so even a small storm can close schools and roads.' },
      { ic: '🍗', tag: 'Food', title: 'Lemon pepper wings', body: 'Chicken wings with lemon pepper are an Atlanta favorite. Many places sell them.' }
    ],
    around: [
      { ic: '💳', title: 'Breeze', body: 'Pay for MARTA trains and buses with a Breeze card or the Breeze Mobile app.' },
      { ic: '🚇', title: 'MARTA rail', body: 'There are four lines: Red, Gold, Blue and Green. The Red and Gold lines go to the airport.' },
      { ic: '🛣️', title: 'The Perimeter', body: 'I-285 circles the city and is called the Perimeter. Rush hour traffic is heavy.' },
      { ic: '🍑', title: 'So many Peachtrees', body: 'Dozens of streets have “Peachtree” in the name. Check the full street name before you go.' }
    ]
  },
  sea: {
    name: 'Seattle', state: 'WA', nick: 'The Emerald City', lat: 47.6062, lon: -122.3321, emoji: '🌲',
    transit: 'ORCA card or myORCA app · Link light rail, buses and ferries',
    talk: 'Ask about the Mariners or the Seahawks, a favorite hike, or a favorite coffee shop.',
    slang: [
      { k: 'mountainisout', word: 'the mountain is out', say: 'the MOUN-tin is out', meaning: 'The sky is clear and you can see Mount Rainier.', sentence: 'Look, the mountain is out today!', local: 'Clouds often hide it, so locals are happy when they can see it.' },
      { k: 'sunbreak', word: 'sunbreak', say: 'SUN-brake', meaning: 'A short time when the sun comes out between clouds.', sentence: 'Let’s walk during the next sunbreak.', local: 'Even weather reports use this word here.' },
      { k: 'spendy', word: 'spendy', say: 'SPEN-dee', meaning: 'Expensive.', sentence: 'That restaurant is a little spendy.', local: 'Common in the Pacific Northwest. Casual.' },
      { k: 'thesound', word: 'the Sound', say: 'the sound', meaning: 'Puget Sound, the big body of salt water next to Seattle.', sentence: 'We took the ferry across the Sound.', local: 'You’ll hear “South Sound” and “North Sound” for areas too.' },
      { k: 'theeastside', word: 'the Eastside', say: 'the EEST-side', meaning: 'The cities east of Lake Washington, like Bellevue, Redmond and Kirkland.', sentence: 'She works on the Eastside.', local: 'Many tech jobs are there.' },
      { k: 'seattlefreeze', word: 'Seattle Freeze', say: 'see-AT-ul freez', meaning: 'The idea that people here are polite but hard to make close friends with.', sentence: 'Joining a club helped me beat the Seattle Freeze.', local: 'Locals joke about it. Clubs and classes are good ways to meet people.' }
    ],
    customs: [
      { ic: '☔', tag: 'Weather', title: 'Rain jackets, not umbrellas', body: 'It rains often but lightly. Many locals wear a jacket with a hood instead of carrying an umbrella.' },
      { ic: '♻️', tag: 'Home', title: 'Sort your trash', body: 'Seattle has separate bins for garbage, recycling and compost. Food scraps go in the compost.' },
      { ic: '🛍️', tag: 'Shopping', title: 'Bring a bag', body: 'Stores don’t give thin plastic bags. Paper bags cost a small fee, so many people bring their own.' },
      { ic: '🌙', tag: 'Winter', title: 'Short, dark days', body: 'In winter it gets dark before 5 p.m. Many people plan indoor activities and get outside when it’s bright.' }
    ],
    around: [
      { ic: '💳', title: 'ORCA', body: 'One ORCA card or the myORCA app works on Link, buses, Sounder trains and water taxis. Riders 18 and under ride free.' },
      { ic: '🚈', title: 'Link light rail', body: 'The 1 Line runs from the airport (SeaTac) through downtown and north.' },
      { ic: '⛴️', title: 'Ferries', body: 'Washington State Ferries leave downtown for Bainbridge Island and Bremerton. Many people ride them to work.' },
      { ic: '🧭', title: 'Avenues and streets', body: 'Avenues usually run north to south and streets run east to west. Addresses often include a direction, like NE 45th St.' }
    ]
  },
  sf: {
    name: 'San Francisco', state: 'CA', nick: 'The City by the Bay', lat: 37.7749, lon: -122.4194, emoji: '🌁',
    transit: 'Clipper card or app · Muni, BART, cable cars and ferries',
    talk: 'Ask about the Giants or the Warriors, the fog, or a favorite burrito place in the Mission.',
    slang: [
      { k: 'hella', word: 'hella', say: 'HEL-uh', meaning: 'Very, or a lot of.', sentence: 'That line is hella long.', local: 'Northern California slang. Casual.' },
      { k: 'karl', word: 'Karl', say: 'karl', meaning: 'A nickname for San Francisco’s fog.', sentence: 'Karl is rolling in, bring a jacket.', local: 'A local joke. People talk about the fog like a person.' },
      { k: 'muni', word: 'Muni', say: 'MYOO-nee', meaning: 'The city’s buses, streetcars, light rail and cable cars.', sentence: 'I take Muni to work.', local: 'Short for San Francisco Municipal Railway.' },
      { k: 'bart', word: 'BART', say: 'bart', meaning: 'The train that connects San Francisco to the East Bay and the airport.', sentence: 'Take BART to Oakland.', local: 'Short for Bay Area Rapid Transit.' },
      { k: 'theeastbay', word: 'the East Bay', say: 'the eest bay', meaning: 'Oakland, Berkeley and nearby cities across the bay.', sentence: 'Rent is cheaper in the East Bay.', local: '“The Peninsula” and “the South Bay” name other parts of the Bay Area.' },
      { k: 'missionburrito', word: 'Mission burrito', say: 'MISH-un bur-EE-toh', meaning: 'A very big burrito with rice, beans and meat, wrapped in foil.', sentence: 'One Mission burrito can be lunch and dinner.', local: 'Named after the Mission District, where the style started.' }
    ],
    customs: [
      { ic: '🧥', tag: 'Weather', title: 'Always bring layers', body: 'Summer can be cold and foggy. The weather changes between neighborhoods, so carry a jacket.' },
      { ic: '🏷️', tag: 'Talk', title: 'Don’t say “Frisco”', body: 'Locals say “SF” or “the City”. “Frisco” and “San Fran” sound like a tourist.' },
      { ic: '🚗', tag: 'Safety', title: 'Empty your car', body: 'Car break-ins are common. Don’t leave bags or anything visible inside your parked car.' },
      { ic: '🧾', tag: 'Restaurants', title: 'Read the bill', body: 'Some restaurants add an extra service or health fee to the bill. Check it before you tip.' }
    ],
    around: [
      { ic: '💳', title: 'Clipper', body: 'One Clipper card or the Clipper app works on Muni, BART, Caltrain and many ferries.' },
      { ic: '🚇', title: 'BART and Muni', body: 'BART goes between cities and to SFO airport. Muni gets you around inside San Francisco.' },
      { ic: '🚋', title: 'Cable cars', body: 'The historic cable cars are a Muni ride, but most riders are visitors. Lines can be long.' },
      { ic: '⛰️', title: 'Curb your wheels', body: 'On a hill, turn your front wheels toward the curb facing downhill, and away from it facing uphill. It’s the law.' }
    ]
  },
  dc: {
    name: 'Washington, D.C.', state: 'DC', nick: 'The District', lat: 38.9072, lon: -77.0369, emoji: '🏛️',
    transit: 'SmarTrip card or phone wallet · Metrorail and Metrobus',
    talk: 'People often ask “What do you do?” early. You can also ask about the Commanders or the Nationals.',
    slang: [
      { k: 'thedistrict', word: 'the District', say: 'the DIS-trikt', meaning: 'Washington, D.C.', sentence: 'I moved to the District last year.', local: 'Locals rarely call it “Washington”. That can mean the state.' },
      { k: 'dmv', word: 'the DMV', say: 'dee-em-vee', meaning: 'D.C., Maryland and Virginia, as one area.', sentence: 'She grew up in the DMV.', local: 'Elsewhere it means the Department of Motor Vehicles. Here, it’s usually the region.' },
      { k: 'insidethebeltway', word: 'inside the Beltway', say: 'in-SIDE the BELT-way', meaning: 'Focused on politics and government, like D.C. insiders.', sentence: 'That story only matters inside the Beltway.', local: 'The Beltway is the I-495 freeway that circles the area.' },
      { k: 'mumbosauce', word: 'mumbo sauce', say: 'MUM-boh sauce', meaning: 'A sweet and tangy red sauce, often put on fried chicken wings.', sentence: 'Can I get extra mumbo sauce?', local: 'A D.C. carryout classic.' },
      { k: 'halfsmoke', word: 'half-smoke', say: 'HAF-smoke', meaning: 'A spicy sausage, often served with chili and onions.', sentence: 'I had a half-smoke on U Street.', local: 'D.C.’s own street food.' },
      { k: 'gogo', word: 'go-go', say: 'GOH-goh', meaning: 'A style of funk music with nonstop drums, born in D.C.', sentence: 'There’s a go-go band playing tonight.', local: 'It’s the official music of D.C.' }
    ],
    customs: [
      { ic: '🛗', tag: 'Metro', title: 'Stand right, walk left', body: 'On Metro escalators, stand on the right so people can walk up on the left.' },
      { ic: '💼', tag: 'Talk', title: '“What do you do?”', body: 'People often ask about your job soon after they meet you. It’s normal here, not rude.' },
      { ic: '🌸', tag: 'Spring', title: 'Cherry blossoms', body: 'In late March or early April, cherry trees bloom near the Tidal Basin. Go early to avoid crowds.' },
      { ic: '🏛️', tag: 'Free fun', title: 'Free museums', body: 'The Smithsonian museums and the National Zoo are free to enter.' }
    ],
    around: [
      { ic: '💳', title: 'SmarTrip', body: 'Pay for Metrorail and Metrobus with a SmarTrip card, or add SmarTrip to your phone’s wallet.' },
      { ic: '🚇', title: 'Metro lines', body: 'Six color lines: Red, Orange, Blue, Silver, Green and Yellow. The Silver Line goes to Dulles Airport.' },
      { ic: '🧭', title: 'Four quadrants', body: 'The city is split into NW, NE, SW and SE around the Capitol. The same address can exist in two quadrants, so always include it.' },
      { ic: '🔤', title: 'Letters and numbers', body: 'Numbered streets run north to south. Lettered streets run east to west. There is no J Street.' }
    ]
  },
  dal: {
    name: 'Dallas', state: 'TX', nick: 'Big D', lat: 32.7767, lon: -96.797, emoji: '⭐',
    transit: 'GoPass app or card · DART light rail, buses and the TRE train',
    talk: 'Ask about the Cowboys, high school football, or someone’s favorite Tex-Mex place.',
    slang: [
      { k: 'bigd', word: 'Big D', say: 'big dee', meaning: 'Dallas.', sentence: 'Welcome to Big D!', local: 'A proud, friendly nickname.' },
      { k: 'metroplex', word: 'the Metroplex', say: 'the MET-roh-plex', meaning: 'The whole Dallas–Fort Worth area and its many cities.', sentence: 'There are great jobs all over the Metroplex.', local: 'You’ll also hear “DFW” for the same area.' },
      { k: 'dfw', word: 'DFW', say: 'dee-eff-dub-yuh', meaning: 'The Dallas–Fort Worth area, or its big airport.', sentence: 'My flight leaves from DFW.', local: 'Dallas also has a smaller airport, Love Field.' },
      { k: 'allyall', word: 'all y’all', say: 'awl yawl', meaning: 'Every one of you; a bigger group than “y’all”.', sentence: 'Thanks, all y’all, for coming.', local: 'Texas grammar. Friendly and casual.' },
      { k: 'serviceroad', word: 'service road', say: 'SER-vis road', meaning: 'The road that runs beside a highway, where many stores are.', sentence: 'The bank is on the service road.', local: 'Houston calls it the “feeder road”.' },
      { k: 'howdy', word: 'howdy', say: 'HOW-dee', meaning: 'Hello.', sentence: 'Howdy, how are you doing?', local: 'A friendly Texas greeting. People of all ages use it.' }
    ],
    customs: [
      { ic: '🌪️', tag: 'Weather', title: 'Spring storms', body: 'Spring brings hail and tornadoes. When sirens sound, go to a room with no windows on the lowest floor.' },
      { ic: '🥵', tag: 'Weather', title: 'Summer heat', body: 'Summer days can pass 100°F. Drink water and park in the shade when you can.' },
      { ic: '🏈', tag: 'Sports', title: 'Football is big', body: 'Friday night high school games and Sunday Cowboys games bring people together.' },
      { ic: '🌮', tag: 'Food', title: 'Free chips and salsa', body: 'Many Tex-Mex restaurants bring chips and salsa to the table for free.' }
    ],
    around: [
      { ic: '💳', title: 'GoPass', body: 'Pay for DART trains and buses with the GoPass app or a GoPass card.' },
      { ic: '🚈', title: 'DART light rail', body: 'Color lines connect downtown with nearby cities. The Orange Line goes to DFW Airport.' },
      { ic: '🚆', title: 'The TRE', body: 'The Trinity Railway Express is a train between downtown Dallas and Fort Worth.' },
      { ic: '🛣️', title: 'Toll roads', body: 'Many highways charge tolls. A TollTag makes it cheaper; without one, the bill comes in the mail.' }
    ]
  },
  det: {
    name: 'Detroit', state: 'MI', nick: 'Motor City', lat: 42.3314, lon: -83.0458, emoji: '🚗',
    transit: 'Dart pass or app · DDOT and SMART buses, the QLine and the People Mover',
    talk: 'Ask about the Lions, or which Coney Island restaurant someone likes best.',
    slang: [
      { k: 'thed', word: 'the D', say: 'the dee', meaning: 'Detroit.', sentence: 'I was born and raised in the D.', local: 'Casual and proud.' },
      { k: 'coney', word: 'Coney', say: 'KOH-nee', meaning: 'A hot dog with chili, mustard and onions, or a diner that serves them.', sentence: 'Let’s get lunch at the Coney.', local: 'Lafayette and American Coney Island are next door to each other. People pick sides.' },
      { k: 'partystore', word: 'party store', say: 'PAR-tee store', meaning: 'A corner store that sells drinks, beer and snacks.', sentence: 'Stop at the party store for ice.', local: 'A Michigan word. There may be no party at all.' },
      { k: 'michiganleft', word: 'Michigan left', say: 'MISH-ih-gun left', meaning: 'Making a left turn by going past the street, making a U-turn, then turning right.', sentence: 'You can’t turn here, do a Michigan left.', local: 'Very common on big roads with a middle strip.' },
      { k: 'upnorth', word: 'up north', say: 'up north', meaning: 'Northern Michigan, where people go for lakes, cabins and vacations.', sentence: 'We’re going up north for the weekend.', local: 'A summer tradition for many families.' },
      { k: 'thelodge', word: 'the Lodge', say: 'the lodj', meaning: 'The John C. Lodge Freeway (M-10).', sentence: 'Take the Lodge downtown.', local: 'Detroit freeways have names that locals use more than numbers.' }
    ],
    customs: [
      { ic: '🖐️', tag: 'Talk', title: 'The hand map', body: 'Michigan is shaped like a mitten. People hold up a hand and point to show where they’re from.' },
      { ic: '🍩', tag: 'Food', title: 'Pączki Day', body: 'On Fat Tuesday, people line up for pączki (POONCH-kee), rich Polish doughnuts, especially in Hamtramck.' },
      { ic: '🦁', tag: 'Holidays', title: 'Lions on Thanksgiving', body: 'The Lions play every Thanksgiving Day. Many families watch together after the big meal.' },
      { ic: '❄️', tag: 'Winter', title: 'Snow and ice', body: 'Winters are cold and snowy. Keep an ice scraper and a warm blanket in your car.' }
    ],
    around: [
      { ic: '🚗', title: 'A car city', body: 'Most people drive. Freeways have names, like the Lodge (M-10) and the Edsel Ford (I-94).' },
      { ic: '🚋', title: 'QLine and People Mover', body: 'The QLine streetcar runs up Woodward Avenue. The People Mover is a small elevated train that loops around downtown.' },
      { ic: '🚌', title: 'Buses and Dart', body: 'DDOT buses serve the city and SMART buses serve the suburbs. One Dart pass works on both.' },
      { ic: '🛣️', title: 'Mile roads', body: 'North of downtown, roads are named by distance, like 8 Mile and 10 Mile. 8 Mile Road is the city’s north edge.' }
    ]
  },
  msp: {
    name: 'Minneapolis', state: 'MN', nick: 'The City of Lakes', lat: 44.9778, lon: -93.265, emoji: '❄️',
    transit: 'Go-To card or Metro Transit app · light rail and buses',
    talk: 'Ask about the weather, a favorite lake, or the Vikings. Minnesotans love to talk about winter.',
    slang: [
      { k: 'ope', word: 'ope', say: 'ohp', meaning: 'A small sound you make when you bump into someone or make a tiny mistake.', sentence: 'Ope, let me just squeeze past you.', local: 'Very Midwest. Polite and friendly.' },
      { k: 'uffda', word: 'uff da', say: 'OOF-dah', meaning: 'Wow, or oh no; said when surprised or tired.', sentence: 'Uff da, that was a lot of snow.', local: 'From Norwegian. Often said with a smile.' },
      { k: 'hotdish', word: 'hotdish', say: 'HOT-dish', meaning: 'A baked casserole, often with meat, vegetables and tater tots on top.', sentence: 'I’m bringing hotdish to the potluck.', local: 'A Minnesota comfort food at church and family meals.' },
      { k: 'minnesotanice', word: 'Minnesota nice', say: 'min-uh-SOH-tuh nice', meaning: 'Being very polite and avoiding conflict, sometimes without saying what you really think.', sentence: 'She said it was “interesting”. That’s Minnesota nice.', local: 'Listen carefully: “interesting” may mean they don’t like it.' },
      { k: 'twincities', word: 'the Twin Cities', say: 'the twin SIT-eez', meaning: 'Minneapolis and St. Paul together.', sentence: 'The Twin Cities have great parks.', local: 'Locals also just say “the Cities”.' },
      { k: 'duckduckgrayduck', word: 'Duck, Duck, Gray Duck', say: 'duk duk gray duk', meaning: 'The Minnesota version of the children’s game “Duck, Duck, Goose”.', sentence: 'The kids played Duck, Duck, Gray Duck at recess.', local: 'A fun local debate. Minnesotans defend it.' }
    ],
    customs: [
      { ic: '🥶', tag: 'Winter', title: 'Real cold', body: 'Winter can go below 0°F. Good boots, a hat, gloves and a warm coat matter.' },
      { ic: '👋', tag: 'Manners', title: 'The long goodbye', body: 'Leaving a visit can take a long time. People keep talking at the door. It’s normal.' },
      { ic: '🍲', tag: 'Food', title: 'Potlucks', body: 'At many gatherings, everyone brings a dish to share. Hotdish and bars (dessert squares) are popular.' },
      { ic: '🎡', tag: 'Events', title: 'The State Fair', body: 'In late August, the Minnesota State Fair draws huge crowds. Many foods come on a stick.' }
    ],
    around: [
      { ic: '💳', title: 'Go-To card', body: 'Pay for light rail and buses with a Go-To card or the Metro Transit app.' },
      { ic: '🚈', title: 'Blue and Green Lines', body: 'The Blue Line goes to the airport and the Mall of America. The Green Line connects downtown Minneapolis and St. Paul.' },
      { ic: '🌉', title: 'Skyways', body: 'Downtown buildings are linked by indoor bridges on the second floor. You can walk many blocks without going outside.' },
      { ic: '🚨', title: 'Snow emergencies', body: 'After big snow, the city declares a snow emergency. Follow the parking rules or your car may be towed.' }
    ]
  },
  den: {
    name: 'Denver', state: 'CO', nick: 'The Mile High City', lat: 39.7392, lon: -104.9903, emoji: '🏔️',
    transit: 'MyRide card or RTD app · light rail, commuter trains and buses',
    talk: 'Ask about hiking or skiing, or about the Broncos or the Nuggets.',
    slang: [
      { k: 'milehigh', word: 'Mile High', say: 'mile high', meaning: 'Denver, which sits about one mile (5,280 feet) above sea level.', sentence: 'The game is at Mile High tonight.', local: 'Also used for the Broncos’ stadium.' },
      { k: 'fourteener', word: 'fourteener', say: 'for-TEEN-er', meaning: 'A mountain over 14,000 feet tall.', sentence: 'We climbed our first fourteener this summer.', local: 'Colorado has more than fifty. Locals like to count how many they’ve done.' },
      { k: 'thefrontrange', word: 'the Front Range', say: 'the frunt raynj', meaning: 'The first mountains west of Denver, and the cities along them.', sentence: 'Snow is coming to the Front Range tonight.', local: 'Weather reports use this a lot.' },
      { k: 'bluebirdday', word: 'bluebird day', say: 'BLOO-burd day', meaning: 'A clear, sunny day with blue sky, often after a snowstorm.', sentence: 'Fresh snow and a bluebird day, let’s ski!', local: 'Skier talk, but everyone uses it.' },
      { k: 'gaper', word: 'gaper', say: 'GAY-per', meaning: 'A new or clueless skier, often a tourist.', sentence: 'That gaper stopped in the middle of the run.', local: 'A little rude. Use it as a joke with friends only.' },
      { k: 'greenchile', word: 'green chile', say: 'green CHIL-ee', meaning: 'A spicy stew made with green peppers, often poured over burritos.', sentence: 'I’ll have my burrito smothered in green chile.', local: '“Smothered” means covered in the sauce.' }
    ],
    customs: [
      { ic: '💧', tag: 'Health', title: 'Drink more water', body: 'The air is high and dry. Drink extra water, wear sunscreen, and know that alcohol feels stronger here.' },
      { ic: '🌦️', tag: 'Weather', title: 'Weather changes fast', body: 'It can snow one day and be warm the next. Dress in layers.' },
      { ic: '🥾', tag: 'Outdoors', title: 'Trail manners', body: 'On narrow trails, hikers going uphill have the right of way. Pack out all your trash.' },
      { ic: '🛍️', tag: 'Shopping', title: 'Bring a bag', body: 'Stores don’t give plastic bags. Paper bags cost a small fee, so many people bring their own.' }
    ],
    around: [
      { ic: '💳', title: 'MyRide', body: 'Pay for RTD trains and buses with a MyRide card or the RTD app.' },
      { ic: '✈️', title: 'The A Line', body: 'The A Line train runs between Union Station downtown and Denver International Airport.' },
      { ic: '🧭', title: 'The mountains are west', body: 'If you can see the Rocky Mountains, you’re facing west. Locals use them for directions.' },
      { ic: '🔢', title: 'Streets and avenues', body: 'Streets run north to south and avenues run east to west. Broadway and Ellsworth Avenue are the zero lines for addresses.' }
    ]
  },
  nola: {
    name: 'New Orleans', state: 'LA', nick: 'The Big Easy', lat: 29.9511, lon: -90.0715, emoji: '🎷',
    transit: 'Le Pass app · RTA streetcars, buses and ferries',
    talk: 'Ask about the Saints, Mardi Gras, or who makes the best po-boy or gumbo.',
    slang: [
      { k: 'whereyat', word: 'where y’at', say: 'WAIR yat', meaning: 'Hi, how are you?', sentence: 'Hey, where y’at? Long time no see.', local: 'A classic local greeting. Answer “all right” or “fine”, not your location.' },
      { k: 'makegroceries', word: 'make groceries', say: 'make GROH-sreez', meaning: 'To go grocery shopping.', sentence: 'I need to make groceries after work.', local: 'From French. Very New Orleans.' },
      { k: 'neutralground', word: 'neutral ground', say: 'NOO-trul ground', meaning: 'The grassy strip in the middle of a wide street (a median).', sentence: 'Park on the street, not on the neutral ground.', local: 'Streetcars often run on the neutral ground.' },
      { k: 'lagniappe', word: 'lagniappe', say: 'LAN-yap', meaning: 'A little something extra, for free.', sentence: 'The baker added a cookie as lagniappe.', local: 'A Louisiana word from French and Spanish.' },
      { k: 'krewe', word: 'krewe', say: 'kroo', meaning: 'A club that puts on a Mardi Gras parade or ball.', sentence: 'His krewe rides on Saturday night.', local: 'Each krewe has its own floats, costumes and throws.' },
      { k: 'poboy', word: 'po-boy', say: 'POH-boy', meaning: 'A sandwich on crispy French bread, often with fried shrimp or roast beef.', sentence: 'I’ll have a shrimp po-boy, dressed.', local: '“Dressed” means with lettuce, tomato, pickles and mayo.' }
    ],
    customs: [
      { ic: '🎭', tag: 'Mardi Gras', title: 'Parade season', body: 'Parades run for weeks before Fat Tuesday. Catching beads and other throws is part of the fun.' },
      { ic: '🥤', tag: 'Rules', title: 'Go-cups', body: 'You can walk outside with a drink in many areas, but it must be in a plastic cup, not glass.' },
      { ic: '🌧️', tag: 'Weather', title: 'Street flooding', body: 'Heavy rain can flood streets fast. Never drive through deep water. Hurricane season is June to November.' },
      { ic: '🦞', tag: 'Food', title: 'Crawfish boils', body: 'In spring, friends gather to eat boiled crawfish with their hands. Twist off the tail and peel it.' }
    ],
    around: [
      { ic: '🚋', title: 'Streetcars', body: 'The St. Charles line is one of the oldest streetcar lines in the world. Canal Street has streetcars too.' },
      { ic: '💳', title: 'Le Pass', body: 'Buy rides in the Le Pass app, or pay with exact cash when you get on.' },
      { ic: '🧭', title: 'River and lake', body: 'The river curves, so locals say uptown, downtown, riverside and lakeside instead of north or south.' },
      { ic: '⛴️', title: 'The ferry', body: 'A ferry crosses the Mississippi River from the foot of Canal Street to Algiers.' }
    ]
  }
};
