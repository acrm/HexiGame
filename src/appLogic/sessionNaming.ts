export type SessionNameLanguage = 'en' | 'ru';

type RuGender = 'м' | 'ж';

interface RuFlower {
  name: string;
  gender: RuGender;
}

// Only pure color / natural-phenomenon adjectives (masculine form); no mineral/gemstone names
const RU_COLOR_ADJECTIVES = [
  'Янтарный', 'Лазурный', 'Кобальтовый', 'Жемчужный', 'Лунный',
  'Туманный', 'Серебряный', 'Золотистый', 'Пепельный', 'Шафрановый',
  'Коралловый', 'Оливковый', 'Бордовый', 'Бирюзовый', 'Индиговый',
] as const;

// Color bases (masculine form); no mineral-derived names
const RU_COLOR_BASES = [
  'алый', 'пурпурный', 'лазурный', 'янтарный', 'коралловый',
  'графитовый', 'небесный', 'малиновый', 'вишнёвый', 'сиреневый',
] as const;

// Only pure colors; no mineral/gemstone names
const EN_COLOR_ADJECTIVES = [
  'Amber', 'Azure', 'Cobalt', 'Pearl', 'Lunar',
  'Misty', 'Silver', 'Golden', 'Ashen', 'Saffron',
  'Coral', 'Olive', 'Burgundy', 'Turquoise', 'Indigo',
] as const;

const EN_COLOR_BASES = [
  'Scarlet', 'Crimson', 'Blue', 'Green', 'Violet',
  'Amber', 'Coral', 'Graphite', 'Sky', 'Lilac',
] as const;

// Decorative flowers only; gender attribute used for Russian adjective agreement
const RU_FLOWERS: readonly RuFlower[] = [
  { name: 'роза', gender: 'ж' }, { name: 'лилия', gender: 'ж' }, { name: 'тюльпан', gender: 'м' }, { name: 'гиацинт', gender: 'м' }, { name: 'орхидея', gender: 'ж' },
  { name: 'ирис', gender: 'м' }, { name: 'пион', gender: 'м' }, { name: 'мак', gender: 'м' }, { name: 'лотос', gender: 'м' }, { name: 'фиалка', gender: 'ж' },
  { name: 'василек', gender: 'м' }, { name: 'нарцисс', gender: 'м' }, { name: 'жасмин', gender: 'м' }, { name: 'гортензия', gender: 'ж' }, { name: 'хризантема', gender: 'ж' },
  { name: 'лаванда', gender: 'ж' }, { name: 'георгин', gender: 'м' }, { name: 'камелия', gender: 'ж' }, { name: 'магнолия', gender: 'ж' }, { name: 'фрезия', gender: 'ж' },
  { name: 'анемона', gender: 'ж' }, { name: 'бегония', gender: 'ж' }, { name: 'вербена', gender: 'ж' }, { name: 'гвоздика', gender: 'ж' }, { name: 'дельфиниум', gender: 'м' },
  { name: 'эхинацея', gender: 'ж' }, { name: 'календула', gender: 'ж' }, { name: 'мимоза', gender: 'ж' }, { name: 'петуния', gender: 'ж' }, { name: 'примула', gender: 'ж' },
  { name: 'ранункулюс', gender: 'м' }, { name: 'сирень', gender: 'ж' }, { name: 'клевер', gender: 'м' }, { name: 'чертополох', gender: 'м' }, { name: 'цинния', gender: 'ж' },
  { name: 'люпин', gender: 'м' }, { name: 'маргаритка', gender: 'ж' }, { name: 'лютик', gender: 'м' }, { name: 'ромашка', gender: 'ж' }, { name: 'колокольчик', gender: 'м' },
  { name: 'незабудка', gender: 'ж' }, { name: 'адонис', gender: 'м' }, { name: 'астра', gender: 'ж' }, { name: 'барвинок', gender: 'м' }, { name: 'дрок', gender: 'м' },
  { name: 'эвкалипт', gender: 'м' }, { name: 'флокс', gender: 'м' }, { name: 'гелиотроп', gender: 'м' }, { name: 'ипомея', gender: 'ж' }, { name: 'купальница', gender: 'ж' },
  { name: 'левкой', gender: 'м' }, { name: 'мальва', gender: 'ж' }, { name: 'настурция', gender: 'ж' }, { name: 'олеандр', gender: 'м' }, { name: 'платикодон', gender: 'м' },
  { name: 'резеда', gender: 'ж' }, { name: 'сальвия', gender: 'ж' }, { name: 'урзиния', gender: 'ж' },
];

// Decorative flowers only; tobacco and bindweed removed as non-decorative
const EN_FLOWERS = [
  'rose', 'lily', 'tulip', 'hyacinth', 'orchid', 'iris', 'peony', 'poppy', 'lotus', 'violet',
  'cornflower', 'daffodil', 'jasmine', 'hydrangea', 'chrysanthemum', 'lavender', 'dahlia', 'camellia', 'magnolia', 'freesia',
  'anemone', 'begonia', 'verbena', 'carnation', 'delphinium', 'echinacea', 'calendula', 'mimosa', 'petunia', 'primrose',
  'ranunculus', 'lilac', 'clover', 'thistle', 'zinnia', 'lupine', 'daisy', 'buttercup', 'bellflower', 'forget-me-not',
  'adonis', 'aster', 'periwinkle', 'gorse', 'eucalyptus', 'phlox', 'heliotrope', 'morning-glory', 'globe-flower', 'stock',
  'mallow', 'nasturtium', 'oleander', 'platycodon', 'mignonette', 'salvia', 'ursinia', 'snowdrop',
] as const;

function buildColorPool(language: SessionNameLanguage): string[] {
  const adjectives = language === 'ru' ? RU_COLOR_ADJECTIVES : EN_COLOR_ADJECTIVES;
  const bases = language === 'ru' ? RU_COLOR_BASES : EN_COLOR_BASES;
  const pool: string[] = [];
  for (const adjective of adjectives) {
    for (const base of bases) {
      pool.push(`${adjective} ${base}`);
    }
  }
  return pool;
}

// Inflect all adjective endings in a color phrase to match the Russian flower's grammatical gender.
// All adjectives in our pools end in -ый; feminine form uses -ая.
function inflectRuColorPhrase(phrase: string, gender: RuGender): string {
  if (gender === 'м') return phrase;
  return phrase
    .replace(/ый(?= |$)/g, 'ая')
    .replace(/ий(?= |$)/g, 'яя');
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function toTitleCase(word: string): string {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1);
}

function withSuffixIfNeeded(base: string, existingNames: string[]): string {
  const normalizedBase = normalizeName(base);
  const normalizedExisting = new Set(existingNames.map(normalizeName));
  if (!normalizedExisting.has(normalizedBase)) {
    return base;
  }

  let index = 2;
  while (normalizedExisting.has(normalizeName(`${base} #${index}`))) {
    index += 1;
  }
  return `${base} #${index}`;
}

export function generateSessionCodename(
  language: SessionNameLanguage,
  existingNames: string[],
  randomValue = Math.random(),
): string {
  const colorPool = buildColorPool(language);
  const colorIndex = Math.floor(Math.abs(randomValue) * colorPool.length) % colorPool.length;
  const color = colorPool[colorIndex] ?? colorPool[0];

  let base: string;
  if (language === 'ru') {
    const flowerIndex = Math.floor(Math.abs(randomValue * 9973) * RU_FLOWERS.length) % RU_FLOWERS.length;
    const flower = RU_FLOWERS[flowerIndex] ?? RU_FLOWERS[0];
    base = `${inflectRuColorPhrase(color, flower.gender)} ${flower.name}`;
  } else {
    const flowerIndex = Math.floor(Math.abs(randomValue * 9973) * EN_FLOWERS.length) % EN_FLOWERS.length;
    const flowerRaw = EN_FLOWERS[flowerIndex] ?? EN_FLOWERS[0];
    base = `${color} ${toTitleCase(flowerRaw)}`;
  }

  return withSuffixIfNeeded(base, existingNames);
}
