/* YORAI — site content.
 * Everything a visitor reads lives here, not in the markup.
 * Brand facts marked PLACEHOLDER are invented for the demo and must be
 * replaced with the real farm's details before launch.
 */

export const BRAND = {
  name: 'YORAI',
  tagline: 'Café de altura · Costa Rica',
  email: 'hello@yorai.cr',            // PLACEHOLDER
  phone: '+506 2000 0000',             // PLACEHOLDER
  address: 'San Marcos de Tarrazú, San José, Costa Rica', // PLACEHOLDER
  hours: 'Tasting room · Thursday to Sunday, 9:00 to 16:00', // PLACEHOLDER
  instagram: 'https://instagram.com/', // PLACEHOLDER
};

/* The six chapters of the scroll journey. `length` is scroll length in vh. */
export const CHAPTERS = [
  {
    key: 'plantation',
    kicker: 'I · The plantation',
    title: 'Where the mist meets the mountain',
    text: 'Our trees grow between 1,600 and 1,900 metres on the slopes of the Talamanca range, where cool nights slow the ripening and sharpen the acidity. Every morning the cloud sits in the valley before the sun burns it away.',
    note: 'Tarrazú · 1,600–1,900 m',
    length: 230,
  },
  {
    key: 'harvest',
    kicker: 'II · The harvest',
    title: 'Picked by hand, only when red',
    text: 'From November to March the cherries ripen a branch at a time. Pickers pass through each row four or five times, taking only the fruit that has turned deep red. A single tree yields about two kilos of green coffee a year.',
    note: 'November – March',
    length: 210,
  },
  {
    key: 'processing',
    kicker: 'III · The mill',
    title: 'Honey, washed, natural',
    text: 'At our micro-mill the cherries are sorted by density and the fruit is removed the same day. Beans dry slowly on raised African beds, turned every few hours for up to three weeks, until the moisture settles near eleven per cent.',
    note: 'Raised beds · 14–21 days',
    length: 210,
  },
  {
    key: 'roasting',
    kicker: 'IV · The roast',
    title: 'Eleven minutes to first crack',
    text: 'We roast in small batches of twelve kilos, charging the drum at 190 °C and listening for the first crack around minute nine. Light enough to keep the citrus and honey, developed enough to carry a body of caramel.',
    note: 'Batch · 12 kg',
    length: 210,
  },
  {
    key: 'brewing',
    kicker: 'V · The pour',
    title: 'Ninety-four degrees, sixteen to one',
    text: 'Water just off the boil, a thirty-second bloom, and a slow spiral. The grounds expand and release their gas; the bed settles; the cup draws in about three minutes.',
    note: '94 °C · 1:16',
    length: 210,
  },
  {
    key: 'cup',
    kicker: 'VI · The cup',
    title: 'Mist to cup',
    text: 'What remains is the whole mountain in a few centilitres: bright at first, then honey, then a long, soft finish of cacao. Welcome to YORAI.',
    note: 'Pura vida',
    length: 180,
  },
];

export const PROCESSES = ['All', 'Washed', 'Honey', 'Natural', 'Anaerobic'];

export const METHODS = ['All', 'Pour-over', 'Espresso', 'Cold'];

/* The cupping table (menu). Prices in USD for the demo; PLACEHOLDER.
 * `img` is the picture's path without its ending (js/ui.js adds the size and `.webp`); `bag` names the
 * bag in the collection that the same lot is sold in, where there is one. */
export const MENU = [
  { id: 'finca-la-neblina', name: 'Finca La Neblina', process: 'Washed', variety: 'Caturra', altitude: 1750, notes: 'Lime, white honey, jasmine', price: 6.5, method: 'Pour-over', img: 'assets/menu/neblina', bag: 'neblina' },
  { id: 'lote-cerro-alto', name: 'Lote Cerro Alto', process: 'Honey', variety: 'Catuaí', altitude: 1850, notes: 'Red apple, panela, orange blossom', price: 7, method: 'Pour-over', img: 'assets/menu/cerro-alto', bag: 'cerro-alto' },
  { id: 'los-cedros', name: 'Los Cedros', process: 'Natural', variety: 'Villa Sarchí', altitude: 1700, notes: 'Strawberry, cacao nib, rum', price: 7.5, method: 'Pour-over', img: 'assets/menu/cedros', bag: 'cedros' },
  { id: 'geisha-de-altura', name: 'Geisha de Altura', process: 'Washed', variety: 'Geisha', altitude: 1900, notes: 'Bergamot, peach, black tea', price: 12, method: 'Pour-over', img: 'assets/menu/geisha', bag: 'geisha' },
  { id: 'aurora', name: 'Aurora', process: 'Anaerobic', variety: 'Catuaí', altitude: 1800, notes: 'Cinnamon, dark cherry, cream', price: 8.5, method: 'Pour-over', img: 'assets/menu/aurora' },
  { id: 'espresso-de-la-casa', name: 'Espresso de la casa', process: 'Honey', variety: 'Caturra · Catuaí', altitude: 1750, notes: 'Toffee, hazelnut, red fruit', price: 4, method: 'Espresso', img: 'assets/menu/espresso' },
  { id: 'cortado', name: 'Cortado', process: 'Honey', variety: 'Caturra · Catuaí', altitude: 1750, notes: 'Milk chocolate, brown sugar', price: 4.5, method: 'Espresso', img: 'assets/menu/cortado' },
  { id: 'cold-brew', name: 'Cold brew de montaña', process: 'Natural', variety: 'Villa Sarchí', altitude: 1700, notes: 'Cherry cola, cacao, long finish', price: 6, method: 'Cold', img: 'assets/menu/cold-brew' },
];

/* What the menu's own introduction says about each way of brewing, shown in a coffee's detail panel. */
export const METHOD_NOTES = {
  'Pour-over': 'Brewed to order at 94 °C.',
  Espresso: 'A honey-process blend of two lots.',
};

/* Families for the tasting notes above, used when coffees are compared side by side. Every note on the
 * menu belongs to exactly one family; add a new note here when one is added there. */
export const FLAVOURS = {
  Citrus: ['lime', 'bergamot'],
  Floral: ['jasmine', 'orange blossom'],
  Fruit: ['red apple', 'strawberry', 'peach', 'dark cherry', 'red fruit', 'cherry cola'],
  Sweet: ['white honey', 'panela', 'toffee', 'brown sugar'],
  Cocoa: ['cacao nib', 'milk chocolate', 'cacao'],
  'Spice and nut': ['cinnamon', 'hazelnut'],
  'Tea and spirit': ['black tea', 'rum'],
  Texture: ['cream', 'long finish'],
};

/* The collection (bags). Sizes in grams; prices USD; PLACEHOLDER. `img` as in MENU. */
export const COLLECTION = [
  {
    id: 'neblina', img: 'assets/products/bag-neblina', name: 'La Neblina', process: 'Washed', region: 'Tarrazú', variety: 'Caturra', altitude: '1,750 m',
    notes: 'Lime, white honey, jasmine', roast: 'Light', hue: '#9fb7b1', ink: '#143229',
    story: 'The estate lot. Picked from the north-facing rows that keep the cloud longest.',
    sizes: [{ g: 250, price: 22 }, { g: 500, price: 40 }, { g: 1000, price: 74 }],
  },
  {
    id: 'cerro-alto', img: 'assets/products/bag-cerro-alto', name: 'Cerro Alto', process: 'Honey', region: 'Tarrazú', variety: 'Catuaí', altitude: '1,850 m',
    notes: 'Red apple, panela, orange blossom', roast: 'Light–medium', hue: '#e0b35b', ink: '#3b2508',
    story: 'Yellow-honey process: half the mucilage stays on the bean through drying, which gives the sweetness its depth.',
    sizes: [{ g: 250, price: 24 }, { g: 500, price: 44 }, { g: 1000, price: 82 }],
  },
  {
    id: 'cedros', img: 'assets/products/bag-cedros', name: 'Los Cedros', process: 'Natural', region: 'Tarrazú', variety: 'Villa Sarchí', altitude: '1,700 m',
    notes: 'Strawberry, cacao nib, rum', roast: 'Medium', hue: '#c04a4a', ink: '#2c0b0b',
    story: 'Dried whole in the cherry for three weeks. The fruit comes through the cup like a preserve.',
    sizes: [{ g: 250, price: 26 }, { g: 500, price: 48 }],
  },
  {
    id: 'geisha', img: 'assets/products/bag-geisha', name: 'Geisha de Altura', process: 'Washed', region: 'Tarrazú', variety: 'Geisha', altitude: '1,900 m',
    notes: 'Bergamot, peach, black tea', roast: 'Light', hue: '#e8dcc8', ink: '#2a2118',
    story: 'Our highest parcel, 300 trees, one harvest a year. Released in numbered 150 g boxes.',
    sizes: [{ g: 150, price: 48 }],
  },
];

/* The gift box: the four bags of the collection in one box. It has no price of its own in this data, so
 * the page offers the four bags at their smallest size and an enquiry about the box itself. */
export const GIFT = {
  name: 'Colección de Origen',
  empty: 'assets/products/box-empty',
  full: 'assets/products/box-full',
  includes: ['neblina', 'cerro-alto', 'cedros', 'geisha'],
};

/* Pictures used as accents: a roasted bean, the house cup, the paper cup. */
export const ART = { bean: 'assets/products/bean', cup: 'assets/products/cup-house', togo: 'assets/products/cup-togo' };

/* Coffee regions of Costa Rica, as pins on the map (lon, lat). `nudge` is a small display offset in map
 * units so that clustered pins keep a clear 24 px target; it does not change the region's position in the text. Elevations and harvest windows
 * are typical ranges published by the national coffee institute; treat as approximate. */
export const REGIONS = [
  { id: 'tarrazu', name: 'Tarrazú', lon: -84.03, lat: 9.65, elevation: '1,200–1,900 m', harvest: 'Dec – Mar', profile: 'Bright citrus acidity, honey, full body', home: true,
    text: 'The Los Santos zone south of San José. Steep slopes, volcanic soils and a sharp dry season make it the country’s best-known origin. YORAI’s farm and mill are here.' },
  { id: 'central', name: 'Valle Central', lon: -84.15, lat: 9.98, elevation: '1,000–1,600 m', harvest: 'Nov – Feb', profile: 'Balanced, chocolate, mild fruit',
    text: 'The historic heart of Costa Rican coffee, planted since the 1700s around the capital. The volcanoes Poás, Barva and Irazú feed the soils.' },
  { id: 'tres-rios', name: 'Tres Ríos', lon: -83.98, lat: 9.90, nudge: [2.5, 0], elevation: '1,200–1,650 m', harvest: 'Nov – Feb', profile: 'Clean, round, gentle acidity',
    text: 'A small, old-established zone east of San José on the slopes of Irazú, increasingly surrounded by the city.' },
  { id: 'occidental', name: 'Valle Occidental', lon: -84.45, lat: 10.08, elevation: '1,000–1,500 m', harvest: 'Nov – Feb', profile: 'Peach, apricot, sweet',
    text: 'The western valley around Naranjo, Grecia and San Ramón, home to many of the micro-mills that transformed the country’s coffee in the 2000s.' },
  { id: 'orosi', name: 'Orosi', lon: -83.85, lat: 9.80, nudge: [1, 2.5], elevation: '1,000–1,400 m', harvest: 'Aug – Jan', profile: 'Soft, sweet, floral',
    text: 'A narrow, humid valley in Cartago with an earlier harvest than the rest of the country.' },
  { id: 'turrialba', name: 'Turrialba', lon: -83.68, lat: 9.90, elevation: '600–1,300 m', harvest: 'Jul – Jan', profile: 'Light body, mild, nutty',
    text: 'Lower and wetter, on the Caribbean side of the central mountains; the harvest begins in the middle of the year.' },
  { id: 'brunca', name: 'Brunca', lon: -83.35, lat: 9.10, elevation: '600–1,700 m', harvest: 'Aug – Jan', profile: 'Round, chocolate, herbal',
    text: 'The southern zone of Pérez Zeledón and Coto Brus, a large and varied region with growing specialty production.' },
  { id: 'guanacaste', name: 'Guanacaste', lon: -85.35, lat: 10.45, elevation: '600–1,300 m', harvest: 'Jul – Jan', profile: 'Mild, light, nutty',
    text: 'The dry north-west; a smaller volume, grown mostly on the slopes of the Guanacaste range.' },
];

/* Brand story. PLACEHOLDER narrative. */
export const STORY = {
  lede: 'YORAI is a family farm, a micro-mill and a tasting room on one hillside in Tarrazú.',
  paragraphs: [
    'Three generations have picked these rows. The first planted Caturra in the 1960s and sold cherry to the cooperative; the second built the mill so the family could keep its own lots apart; the third opened the tasting room and began exporting under the farm’s own name.',
    'We keep every lot separate from the tree to the bag. Each one is picked, milled, dried and roasted on the farm, so what you drink is traceable to a single slope and a single week of harvest.',
  ],
  facts: [
    { value: '1964', label: 'first trees planted' },
    { value: '42 ha', label: 'under coffee, shade-grown' },
    { value: '11', label: 'separate lots each harvest' },
  ],
  quote: { text: 'The mountain does most of the work. Our job is not to get in its way.', who: 'Family motto, carved above the mill door' },
  calendar: [
    { m: 'Jan', phase: 'harvest' }, { m: 'Feb', phase: 'harvest' }, { m: 'Mar', phase: 'harvest' },
    { m: 'Apr', phase: 'drying' }, { m: 'May', phase: 'flowering' }, { m: 'Jun', phase: 'growth' },
    { m: 'Jul', phase: 'growth' }, { m: 'Aug', phase: 'growth' }, { m: 'Sep', phase: 'growth' },
    { m: 'Oct', phase: 'ripening' }, { m: 'Nov', phase: 'harvest' }, { m: 'Dec', phase: 'harvest' },
  ],
};
