/*
 * Vocabulary for the Imposter game.
 * Each entry: { gu: Gujarati word, en: English meaning, cat: category key }
 * Categories are defined in CATEGORIES below (Gujarati label + English label).
 *
 * The word shown to civilian players is the Gujarati word, with the English
 * meaning in brackets underneath.
 */

const CATEGORIES = {
  animals:     { gu: 'પ્રાણી',     en: 'Animals' },
  birds:       { gu: 'પક્ષી',      en: 'Birds' },
  fruits:      { gu: 'ફળ',         en: 'Fruits' },
  vegetables:  { gu: 'શાકભાજી',    en: 'Vegetables' },
  food:        { gu: 'વાનગી',      en: 'Food & Dishes' },
  body:        { gu: 'શરીર',       en: 'Body Parts' },
  objects:     { gu: 'વસ્તુ',      en: 'Household & Objects' },
  nature:      { gu: 'કુદરત',      en: 'Nature' },
  jobs:        { gu: 'વ્યવસાય',    en: 'Professions' },
  places:      { gu: 'સ્થળ',       en: 'Places' },
  vehicles:    { gu: 'વાહન',       en: 'Vehicles' },
  sports:      { gu: 'રમત',        en: 'Sports & Games' },
  colors:      { gu: 'રંગ',        en: 'Colors' },
  clothes:     { gu: 'કપડાં',      en: 'Clothes' },
  festivals:   { gu: 'તહેવાર',     en: 'Festivals' },
  music:       { gu: 'વાદ્ય',      en: 'Instruments' },
};

const VOCAB = [
  // ---- Animals (પ્રાણી) ----
  { gu: 'સિંહ',       en: 'Lion',          cat: 'animals' },
  { gu: 'વાઘ',        en: 'Tiger',         cat: 'animals' },
  { gu: 'હાથી',       en: 'Elephant',      cat: 'animals' },
  { gu: 'વાંદરો',     en: 'Monkey',        cat: 'animals' },
  { gu: 'કૂતરો',      en: 'Dog',           cat: 'animals' },
  { gu: 'બિલાડી',     en: 'Cat',           cat: 'animals' },
  { gu: 'ગાય',        en: 'Cow',           cat: 'animals' },
  { gu: 'ભેંસ',       en: 'Buffalo',       cat: 'animals' },
  { gu: 'બકરી',       en: 'Goat',          cat: 'animals' },
  { gu: 'ઘોડો',       en: 'Horse',         cat: 'animals' },
  { gu: 'ઊંટ',        en: 'Camel',         cat: 'animals' },
  { gu: 'સસલું',      en: 'Rabbit',        cat: 'animals' },
  { gu: 'ઉંદર',       en: 'Mouse',         cat: 'animals' },
  { gu: 'શિયાળ',      en: 'Fox',           cat: 'animals' },
  { gu: 'રીંછ',       en: 'Bear',          cat: 'animals' },
  { gu: 'હરણ',        en: 'Deer',          cat: 'animals' },
  { gu: 'ગેંડો',      en: 'Rhino',         cat: 'animals' },
  { gu: 'જિરાફ',      en: 'Giraffe',       cat: 'animals' },
  { gu: 'ઝેબ્રા',     en: 'Zebra',         cat: 'animals' },
  { gu: 'મગર',        en: 'Crocodile',     cat: 'animals' },
  { gu: 'સાપ',        en: 'Snake',         cat: 'animals' },
  { gu: 'દેડકો',      en: 'Frog',          cat: 'animals' },
  { gu: 'કાચબો',      en: 'Tortoise',      cat: 'animals' },
  { gu: 'ખિસકોલી',    en: 'Squirrel',      cat: 'animals' },
  { gu: 'ડુક્કર',     en: 'Pig',           cat: 'animals' },
  { gu: 'ગધેડો',      en: 'Donkey',        cat: 'animals' },

  // ---- Birds (પક્ષી) ----
  { gu: 'કાગડો',      en: 'Crow',          cat: 'birds' },
  { gu: 'કબૂતર',      en: 'Pigeon',        cat: 'birds' },
  { gu: 'પોપટ',       en: 'Parrot',        cat: 'birds' },
  { gu: 'મોર',        en: 'Peacock',       cat: 'birds' },
  { gu: 'ચકલી',       en: 'Sparrow',       cat: 'birds' },
  { gu: 'કોયલ',       en: 'Cuckoo',        cat: 'birds' },
  { gu: 'બતક',        en: 'Duck',          cat: 'birds' },
  { gu: 'મરઘી',       en: 'Hen',           cat: 'birds' },
  { gu: 'ગરુડ',       en: 'Eagle',         cat: 'birds' },
  { gu: 'ઘુવડ',       en: 'Owl',           cat: 'birds' },
  { gu: 'હંસ',        en: 'Swan',          cat: 'birds' },
  { gu: 'બગલો',       en: 'Crane',         cat: 'birds' },
  { gu: 'શાહમૃગ',     en: 'Ostrich',       cat: 'birds' },

  // ---- Fruits (ફળ) ----
  { gu: 'કેરી',       en: 'Mango',         cat: 'fruits' },
  { gu: 'કેળું',      en: 'Banana',        cat: 'fruits' },
  { gu: 'સફરજન',      en: 'Apple',         cat: 'fruits' },
  { gu: 'દ્રાક્ષ',    en: 'Grapes',        cat: 'fruits' },
  { gu: 'સંતરું',     en: 'Orange',        cat: 'fruits' },
  { gu: 'તરબૂચ',      en: 'Watermelon',    cat: 'fruits' },
  { gu: 'પપૈયું',     en: 'Papaya',        cat: 'fruits' },
  { gu: 'જામફળ',      en: 'Guava',         cat: 'fruits' },
  { gu: 'દાડમ',       en: 'Pomegranate',   cat: 'fruits' },
  { gu: 'અનાનસ',      en: 'Pineapple',     cat: 'fruits' },
  { gu: 'ચીકુ',       en: 'Sapota',        cat: 'fruits' },
  { gu: 'સીતાફળ',     en: 'Custard apple', cat: 'fruits' },
  { gu: 'જાંબુ',      en: 'Jamun',         cat: 'fruits' },
  { gu: 'નાળિયેર',    en: 'Coconut',       cat: 'fruits' },
  { gu: 'લીંબુ',      en: 'Lemon',         cat: 'fruits' },
  { gu: 'સ્ટ્રોબેરી', en: 'Strawberry',    cat: 'fruits' },

  // ---- Vegetables (શાકભાજી) ----
  { gu: 'બટાકા',      en: 'Potato',        cat: 'vegetables' },
  { gu: 'ટામેટા',     en: 'Tomato',        cat: 'vegetables' },
  { gu: 'ડુંગળી',     en: 'Onion',         cat: 'vegetables' },
  { gu: 'રીંગણ',      en: 'Brinjal',       cat: 'vegetables' },
  { gu: 'ભીંડા',      en: 'Okra',          cat: 'vegetables' },
  { gu: 'કોબીજ',      en: 'Cabbage',       cat: 'vegetables' },
  { gu: 'ફ્લાવર',     en: 'Cauliflower',   cat: 'vegetables' },
  { gu: 'ગાજર',       en: 'Carrot',        cat: 'vegetables' },
  { gu: 'કાકડી',      en: 'Cucumber',      cat: 'vegetables' },
  { gu: 'મરચું',      en: 'Chilli',        cat: 'vegetables' },
  { gu: 'લસણ',        en: 'Garlic',        cat: 'vegetables' },
  { gu: 'આદુ',        en: 'Ginger',        cat: 'vegetables' },
  { gu: 'પાલક',       en: 'Spinach',       cat: 'vegetables' },
  { gu: 'વટાણા',      en: 'Peas',          cat: 'vegetables' },
  { gu: 'મૂળા',       en: 'Radish',        cat: 'vegetables' },
  { gu: 'કારેલા',     en: 'Bitter gourd',  cat: 'vegetables' },
  { gu: 'દૂધી',       en: 'Bottle gourd',  cat: 'vegetables' },

  // ---- Food & Dishes (વાનગી) ----
  { gu: 'રોટલી',      en: 'Chapati',       cat: 'food' },
  { gu: 'ભાત',        en: 'Rice',          cat: 'food' },
  { gu: 'દાળ',        en: 'Lentils',       cat: 'food' },
  { gu: 'ખીચડી',      en: 'Khichdi',       cat: 'food' },
  { gu: 'ઢોકળા',      en: 'Dhokla',        cat: 'food' },
  { gu: 'થેપલા',      en: 'Thepla',        cat: 'food' },
  { gu: 'ખાખરા',      en: 'Khakhra',       cat: 'food' },
  { gu: 'ફાફડા',      en: 'Fafda',         cat: 'food' },
  { gu: 'જલેબી',      en: 'Jalebi',        cat: 'food' },
  { gu: 'સમોસા',      en: 'Samosa',        cat: 'food' },
  { gu: 'પાણીપુરી',   en: 'Pani puri',     cat: 'food' },
  { gu: 'ખમણ',        en: 'Khaman',        cat: 'food' },
  { gu: 'ઉંધિયું',    en: 'Undhiyu',       cat: 'food' },
  { gu: 'હાંડવો',     en: 'Handvo',        cat: 'food' },
  { gu: 'મુઠિયા',     en: 'Muthiya',       cat: 'food' },
  { gu: 'શ્રીખંડ',    en: 'Shrikhand',     cat: 'food' },
  { gu: 'લાડુ',       en: 'Ladoo',         cat: 'food' },
  { gu: 'પૂરી',       en: 'Puri',          cat: 'food' },
  { gu: 'પરોઠા',      en: 'Paratha',       cat: 'food' },
  { gu: 'દહીં',       en: 'Yogurt',        cat: 'food' },

  // ---- Body Parts (શરીર) ----
  { gu: 'માથું',      en: 'Head',          cat: 'body' },
  { gu: 'આંખ',        en: 'Eye',           cat: 'body' },
  { gu: 'કાન',        en: 'Ear',           cat: 'body' },
  { gu: 'નાક',        en: 'Nose',          cat: 'body' },
  { gu: 'મોઢું',      en: 'Mouth',         cat: 'body' },
  { gu: 'દાંત',       en: 'Teeth',         cat: 'body' },
  { gu: 'જીભ',        en: 'Tongue',        cat: 'body' },
  { gu: 'હાથ',        en: 'Hand',          cat: 'body' },
  { gu: 'પગ',         en: 'Leg',           cat: 'body' },
  { gu: 'આંગળી',      en: 'Finger',        cat: 'body' },
  { gu: 'વાળ',        en: 'Hair',          cat: 'body' },
  { gu: 'હૃદય',       en: 'Heart',         cat: 'body' },
  { gu: 'પેટ',        en: 'Stomach',       cat: 'body' },
  { gu: 'ખભો',        en: 'Shoulder',      cat: 'body' },
  { gu: 'ઘૂંટણ',      en: 'Knee',          cat: 'body' },

  // ---- Household & Objects (વસ્તુ) ----
  { gu: 'ખુરશી',      en: 'Chair',         cat: 'objects' },
  { gu: 'ટેબલ',       en: 'Table',         cat: 'objects' },
  { gu: 'પલંગ',       en: 'Bed',           cat: 'objects' },
  { gu: 'દરવાજો',     en: 'Door',          cat: 'objects' },
  { gu: 'બારી',       en: 'Window',        cat: 'objects' },
  { gu: 'પંખો',       en: 'Fan',           cat: 'objects' },
  { gu: 'દીવો',       en: 'Lamp',          cat: 'objects' },
  { gu: 'ઘડિયાળ',     en: 'Clock',         cat: 'objects' },
  { gu: 'અરીસો',      en: 'Mirror',        cat: 'objects' },
  { gu: 'છત્રી',      en: 'Umbrella',      cat: 'objects' },
  { gu: 'ચાવી',       en: 'Key',           cat: 'objects' },
  { gu: 'તાળું',      en: 'Lock',          cat: 'objects' },
  { gu: 'સાવરણી',     en: 'Broom',         cat: 'objects' },
  { gu: 'ડોલ',        en: 'Bucket',        cat: 'objects' },
  { gu: 'થાળી',       en: 'Plate',         cat: 'objects' },
  { gu: 'ચમચી',       en: 'Spoon',         cat: 'objects' },
  { gu: 'ગ્લાસ',      en: 'Glass',         cat: 'objects' },
  { gu: 'વાટકી',      en: 'Bowl',          cat: 'objects' },
  { gu: 'કઢાઈ',       en: 'Wok',           cat: 'objects' },
  { gu: 'છરી',        en: 'Knife',         cat: 'objects' },

  // ---- Nature (કુદરત) ----
  { gu: 'સૂરજ',       en: 'Sun',           cat: 'nature' },
  { gu: 'ચંદ્ર',      en: 'Moon',          cat: 'nature' },
  { gu: 'તારો',       en: 'Star',          cat: 'nature' },
  { gu: 'આકાશ',       en: 'Sky',           cat: 'nature' },
  { gu: 'વાદળ',       en: 'Cloud',         cat: 'nature' },
  { gu: 'વરસાદ',      en: 'Rain',          cat: 'nature' },
  { gu: 'પવન',        en: 'Wind',          cat: 'nature' },
  { gu: 'નદી',        en: 'River',         cat: 'nature' },
  { gu: 'સમુદ્ર',     en: 'Sea',           cat: 'nature' },
  { gu: 'પર્વત',      en: 'Mountain',      cat: 'nature' },
  { gu: 'ઝાડ',        en: 'Tree',          cat: 'nature' },
  { gu: 'ફૂલ',        en: 'Flower',        cat: 'nature' },
  { gu: 'પાંદડું',    en: 'Leaf',          cat: 'nature' },
  { gu: 'ઘાસ',        en: 'Grass',         cat: 'nature' },
  { gu: 'આગ',         en: 'Fire',          cat: 'nature' },
  { gu: 'બરફ',        en: 'Ice',           cat: 'nature' },
  { gu: 'વીજળી',      en: 'Lightning',     cat: 'nature' },
  { gu: 'મેઘધનુષ',    en: 'Rainbow',       cat: 'nature' },
  { gu: 'રણ',         en: 'Desert',        cat: 'nature' },
  { gu: 'જંગલ',       en: 'Forest',        cat: 'nature' },

  // ---- Professions (વ્યવસાય) ----
  { gu: 'શિક્ષક',     en: 'Teacher',       cat: 'jobs' },
  { gu: 'ડૉક્ટર',     en: 'Doctor',        cat: 'jobs' },
  { gu: 'એન્જિનિયર',  en: 'Engineer',      cat: 'jobs' },
  { gu: 'ખેડૂત',      en: 'Farmer',        cat: 'jobs' },
  { gu: 'પોલીસ',      en: 'Police',        cat: 'jobs' },
  { gu: 'વકીલ',       en: 'Lawyer',        cat: 'jobs' },
  { gu: 'સૈનિક',      en: 'Soldier',       cat: 'jobs' },
  { gu: 'રસોઈયો',     en: 'Cook',          cat: 'jobs' },
  { gu: 'દરજી',       en: 'Tailor',        cat: 'jobs' },
  { gu: 'સુથાર',      en: 'Carpenter',     cat: 'jobs' },
  { gu: 'લુહાર',      en: 'Blacksmith',    cat: 'jobs' },
  { gu: 'વેપારી',     en: 'Merchant',      cat: 'jobs' },
  { gu: 'પાઇલટ',      en: 'Pilot',         cat: 'jobs' },
  { gu: 'નર્સ',       en: 'Nurse',         cat: 'jobs' },
  { gu: 'ડ્રાઈવર',    en: 'Driver',        cat: 'jobs' },
  { gu: 'માછીમાર',    en: 'Fisherman',     cat: 'jobs' },
  { gu: 'ચિત્રકાર',   en: 'Painter',       cat: 'jobs' },
  { gu: 'ગાયક',       en: 'Singer',        cat: 'jobs' },

  // ---- Places (સ્થળ) ----
  { gu: 'શાળા',       en: 'School',        cat: 'places' },
  { gu: 'હોસ્પિટલ',   en: 'Hospital',      cat: 'places' },
  { gu: 'મંદિર',      en: 'Temple',        cat: 'places' },
  { gu: 'બજાર',       en: 'Market',        cat: 'places' },
  { gu: 'બગીચો',      en: 'Garden',        cat: 'places' },
  { gu: 'સ્ટેશન',     en: 'Station',       cat: 'places' },
  { gu: 'એરપોર્ટ',    en: 'Airport',       cat: 'places' },
  { gu: 'બેંક',       en: 'Bank',          cat: 'places' },
  { gu: 'પુસ્તકાલય',  en: 'Library',       cat: 'places' },
  { gu: 'રેસ્ટોરન્ટ', en: 'Restaurant',    cat: 'places' },
  { gu: 'સિનેમા',     en: 'Cinema',        cat: 'places' },
  { gu: 'ઘર',         en: 'House',         cat: 'places' },
  { gu: 'ખેતર',       en: 'Farm',          cat: 'places' },
  { gu: 'દરિયાકિનારો', en: 'Beach',        cat: 'places' },
  { gu: 'કિલ્લો',     en: 'Fort',          cat: 'places' },

  // ---- Vehicles (વાહન) ----
  { gu: 'કાર',        en: 'Car',           cat: 'vehicles' },
  { gu: 'બસ',         en: 'Bus',           cat: 'vehicles' },
  { gu: 'ટ્રેન',      en: 'Train',         cat: 'vehicles' },
  { gu: 'વિમાન',      en: 'Aeroplane',     cat: 'vehicles' },
  { gu: 'સાયકલ',      en: 'Bicycle',       cat: 'vehicles' },
  { gu: 'મોટરસાયકલ',  en: 'Motorcycle',    cat: 'vehicles' },
  { gu: 'રિક્ષા',     en: 'Rickshaw',      cat: 'vehicles' },
  { gu: 'હોડી',       en: 'Boat',          cat: 'vehicles' },
  { gu: 'જહાજ',       en: 'Ship',          cat: 'vehicles' },
  { gu: 'ટ્રક',       en: 'Truck',         cat: 'vehicles' },
  { gu: 'ટ્રેક્ટર',   en: 'Tractor',       cat: 'vehicles' },
  { gu: 'હેલિકોપ્ટર', en: 'Helicopter',    cat: 'vehicles' },

  // ---- Sports & Games (રમત) ----
  { gu: 'ક્રિકેટ',    en: 'Cricket',       cat: 'sports' },
  { gu: 'ફૂટબોલ',     en: 'Football',      cat: 'sports' },
  { gu: 'હોકી',       en: 'Hockey',        cat: 'sports' },
  { gu: 'ટેનિસ',      en: 'Tennis',        cat: 'sports' },
  { gu: 'કબડ્ડી',     en: 'Kabaddi',       cat: 'sports' },
  { gu: 'ખોખો',       en: 'Kho-Kho',       cat: 'sports' },
  { gu: 'ચેસ',        en: 'Chess',         cat: 'sports' },
  { gu: 'બેડમિન્ટન',  en: 'Badminton',     cat: 'sports' },
  { gu: 'વોલીબોલ',    en: 'Volleyball',    cat: 'sports' },
  { gu: 'તરણ',        en: 'Swimming',      cat: 'sports' },

  // ---- Colors (રંગ) ----
  { gu: 'લાલ',        en: 'Red',           cat: 'colors' },
  { gu: 'લીલો',       en: 'Green',         cat: 'colors' },
  { gu: 'વાદળી',      en: 'Blue',          cat: 'colors' },
  { gu: 'પીળો',       en: 'Yellow',        cat: 'colors' },
  { gu: 'કાળો',       en: 'Black',         cat: 'colors' },
  { gu: 'સફેદ',       en: 'White',         cat: 'colors' },
  { gu: 'કેસરી',      en: 'Saffron',       cat: 'colors' },
  { gu: 'ગુલાબી',     en: 'Pink',          cat: 'colors' },
  { gu: 'જાંબલી',     en: 'Purple',        cat: 'colors' },
  { gu: 'કથ્થઈ',      en: 'Brown',         cat: 'colors' },

  // ---- Clothes (કપડાં) ----
  { gu: 'સાડી',       en: 'Saree',         cat: 'clothes' },
  { gu: 'ધોતી',       en: 'Dhoti',         cat: 'clothes' },
  { gu: 'કુર્તા',     en: 'Kurta',         cat: 'clothes' },
  { gu: 'પાઘડી',      en: 'Turban',        cat: 'clothes' },
  { gu: 'ટોપી',       en: 'Cap',           cat: 'clothes' },
  { gu: 'શર્ટ',       en: 'Shirt',         cat: 'clothes' },
  { gu: 'પેન્ટ',      en: 'Pant',          cat: 'clothes' },
  { gu: 'ચણિયાચોળી',  en: 'Chaniya choli', cat: 'clothes' },
  { gu: 'સ્વેટર',     en: 'Sweater',       cat: 'clothes' },
  { gu: 'મોજાં',      en: 'Socks',         cat: 'clothes' },

  // ---- Festivals (તહેવાર) ----
  { gu: 'દિવાળી',     en: 'Diwali',        cat: 'festivals' },
  { gu: 'હોળી',       en: 'Holi',          cat: 'festivals' },
  { gu: 'નવરાત્રી',   en: 'Navratri',      cat: 'festivals' },
  { gu: 'ઉત્તરાયણ',   en: 'Uttarayan',     cat: 'festivals' },
  { gu: 'રક્ષાબંધન',  en: 'Rakshabandhan', cat: 'festivals' },
  { gu: 'જન્માષ્ટમી', en: 'Janmashtami',   cat: 'festivals' },
  { gu: 'ઈદ',         en: 'Eid',           cat: 'festivals' },
  { gu: 'નાતાલ',      en: 'Christmas',     cat: 'festivals' },

  // ---- Instruments (વાદ્ય) ----
  { gu: 'તબલા',       en: 'Tabla',         cat: 'music' },
  { gu: 'ઢોલ',        en: 'Dhol',          cat: 'music' },
  { gu: 'વાંસળી',     en: 'Flute',         cat: 'music' },
  { gu: 'સિતાર',      en: 'Sitar',         cat: 'music' },
  { gu: 'હાર્મોનિયમ', en: 'Harmonium',     cat: 'music' },
  { gu: 'ગિટાર',      en: 'Guitar',        cat: 'music' },
  { gu: 'ડ્રમ',       en: 'Drums',         cat: 'music' },
];

// Curated "confusable" clusters for the imposter's decoy word. Each inner array
// groups EXISTING VOCAB words (by their unique `gu` string) that live in the same
// neighbourhood but each carry at least one distinguishing clue — so the imposter
// gets a genuinely tricky look-alike instead of a random same-category word (which
// can be a giveaway like Boat↔Ship or useless like Lion↔Frog).
//
// Curation rules: prefer *adjacency*, never *antonyms* (Fire/Ice, Black/White are
// deliberately NOT paired — opposites are trivially separable and produce diverging
// clues that expose the imposter at once); avoid near-identical pairs (Dhokla/Khaman);
// every word sits in at most one cluster. A `gu` not present in VOCAB is ignored at
// lookup time (see pickDecoy), so the table degrades gracefully.
const CLUSTERS = [
  // animals
  ['સિંહ', 'વાઘ'], ['ગાય', 'ભેંસ'], ['ઘોડો', 'ગધેડો', 'ઝેબ્રા'], ['કૂતરો', 'બિલાડી'],
  ['સસલું', 'ખિસકોલી', 'ઉંદર'], ['મગર', 'સાપ'], ['દેડકો', 'કાચબો'], ['હાથી', 'ગેંડો'],
  ['હરણ', 'જિરાફ'], ['શિયાળ', 'રીંછ'],
  // birds
  ['કાગડો', 'કબૂતર', 'ચકલી'], ['પોપટ', 'મોર', 'કોયલ'], ['ગરુડ', 'ઘુવડ'], ['બતક', 'હંસ'],
  ['મરઘી', 'શાહમૃગ'],
  // fruits
  ['સંતરું', 'લીંબુ'], ['સફરજન', 'જામફળ'], ['દ્રાક્ષ', 'જાંબુ'], ['તરબૂચ', 'પપૈયું'],
  ['ચીકુ', 'સીતાફળ'],
  // vegetables
  ['ડુંગળી', 'લસણ'], ['કોબીજ', 'ફ્લાવર'], ['કારેલા', 'દૂધી'], ['ગાજર', 'મૂળા'],
  // food
  ['રોટલી', 'પૂરી', 'પરોઠા'], ['થેપલા', 'ખાખરા'], ['જલેબી', 'લાડુ'], ['સમોસા', 'ફાફડા'],
  ['ઢોકળા', 'હાંડવો'], ['ભાત', 'ખીચડી'], ['શ્રીખંડ', 'દહીં'],
  // body
  ['આંખ', 'કાન', 'નાક'], ['દાંત', 'જીભ'], ['હાથ', 'પગ'], ['ખભો', 'ઘૂંટણ'], ['હૃદય', 'પેટ'],
  // objects
  ['ખુરશી', 'ટેબલ', 'પલંગ'], ['દરવાજો', 'બારી'], ['ચાવી', 'તાળું'], ['થાળી', 'વાટકી'],
  ['ચમચી', 'છરી'], ['પંખો', 'દીવો'], ['ઘડિયાળ', 'અરીસો'], ['સાવરણી', 'ડોલ'],
  // nature
  ['સૂરજ', 'ચંદ્ર', 'તારો'], ['વરસાદ', 'વાદળ', 'વીજળી'], ['નદી', 'સમુદ્ર'],
  ['રણ', 'જંગલ', 'પર્વત'], ['ઝાડ', 'ફૂલ', 'પાંદડું', 'ઘાસ'],
  // jobs
  ['ડૉક્ટર', 'નર્સ'], ['પોલીસ', 'સૈનિક'], ['સુથાર', 'લુહાર'], ['વકીલ', 'એન્જિનિયર'],
  ['ચિત્રકાર', 'ગાયક'], ['પાઇલટ', 'ડ્રાઈવર'], ['ખેડૂત', 'માછીમાર'],
  // places
  ['સ્ટેશન', 'એરપોર્ટ'], ['શાળા', 'પુસ્તકાલય'], ['રેસ્ટોરન્ટ', 'સિનેમા'],
  ['હોસ્પિટલ', 'બેંક'], ['બગીચો', 'ખેતર'], ['મંદિર', 'કિલ્લો'],
  // vehicles
  ['કાર', 'બસ', 'ટ્રક'], ['સાયકલ', 'મોટરસાયકલ'], ['વિમાન', 'હેલિકોપ્ટર'], ['હોડી', 'જહાજ'],
  // sports
  ['ટેનિસ', 'બેડમિન્ટન'], ['કબડ્ડી', 'ખોખો'], ['ફૂટબોલ', 'હોકી'],
  // colors
  ['વાદળી', 'જાંબલી'], ['લાલ', 'ગુલાબી'], ['કેસરી', 'પીળો'], ['કાળો', 'કથ્થઈ'],
  // clothes
  ['ટોપી', 'પાઘડી'], ['શર્ટ', 'સ્વેટર'], ['સાડી', 'ચણિયાચોળી'], ['ધોતી', 'કુર્તા'],
  // festivals
  ['દિવાળી', 'હોળી'], ['નવરાત્રી', 'જન્માષ્ટમી'], ['ઈદ', 'નાતાલ'],
  // music
  ['તબલા', 'ઢોલ'], ['સિતાર', 'ગિટાર'],
];

// Expose globally for non-module scripts.
window.CATEGORIES = CATEGORIES;
window.VOCAB = VOCAB;
window.CLUSTERS = CLUSTERS;
