export type SessionNameLanguage = 'en' | 'ru';

type RuGender = 'м' | 'ж';

interface RuFlower {
  name: string;
  gender: RuGender;
}

// Color-only names in masculine form for grammatical agreement with RU flower gender.
const RU_COLORS = [
  'Алый', 'Красный', 'Розовый', 'Малиновый', 'Вишнёвый',
  'Оранжевый', 'Жёлтый', 'Лимонный', 'Зелёный', 'Салатовый',
  'Голубой', 'Синий', 'Лазурный', 'Фиолетовый', 'Лиловый',
  'Сиреневый', 'Белый', 'Чёрный', 'Серый', 'Пепельный',
] as const;

const EN_COLORS = [
  'Scarlet', 'Red', 'Pink', 'Raspberry', 'Cherry',
  'Orange', 'Yellow', 'Lemon', 'Green', 'Lime',
  'Sky Blue', 'Blue', 'Azure', 'Violet', 'Lilac',
  'Purple', 'White', 'Black', 'Gray', 'Ash',
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

// Decorative flowers only; tobacco and bindweed removed as non-decorative.
const EN_FLOWERS = [
  'rose', 'lily', 'tulip', 'hyacinth', 'orchid', 'iris', 'peony', 'poppy', 'lotus', 'violet',
  'cornflower', 'daffodil', 'jasmine', 'hydrangea', 'chrysanthemum', 'lavender', 'dahlia', 'camellia', 'magnolia', 'freesia',
  'anemone', 'begonia', 'verbena', 'carnation', 'delphinium', 'echinacea', 'calendula', 'mimosa', 'petunia', 'primrose',
  'ranunculus', 'lilac', 'clover', 'thistle', 'zinnia', 'lupine', 'daisy', 'buttercup', 'bellflower', 'forget-me-not',
  'adonis', 'aster', 'periwinkle', 'gorse', 'eucalyptus', 'phlox', 'heliotrope', 'morning-glory', 'globe-flower', 'stock',
  'mallow', 'nasturtium', 'oleander', 'platycodon', 'mignonette', 'salvia', 'ursinia', 'snowdrop',
] as const;

function getColorPool(language: SessionNameLanguage): readonly string[] {
  return language === 'ru' ? RU_COLORS : EN_COLORS;
}

// Convert a masculine Russian color adjective into feminine form for feminine flower names.
function inflectRuColor(color: string, gender: RuGender): string {
  if (gender === 'м') return color;
  return color
    .replace(/ый$/i, 'ая')
    .replace(/ий$/i, 'яя')
    .replace(/ой$/i, 'ая');
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
  const colorPool = getColorPool(language);
  const colorIndex = Math.floor(Math.abs(randomValue) * colorPool.length) % colorPool.length;
  const color = colorPool[colorIndex] ?? colorPool[0];

  let base: string;
  if (language === 'ru') {
    const flowerIndex = Math.floor(Math.abs(randomValue * 9973) * RU_FLOWERS.length) % RU_FLOWERS.length;
    const flower = RU_FLOWERS[flowerIndex] ?? RU_FLOWERS[0];
    base = `${inflectRuColor(color, flower.gender)} ${flower.name}`;
  } else {
    const flowerIndex = Math.floor(Math.abs(randomValue * 9973) * EN_FLOWERS.length) % EN_FLOWERS.length;
    const flowerRaw = EN_FLOWERS[flowerIndex] ?? EN_FLOWERS[0];
    base = `${color} ${toTitleCase(flowerRaw)}`;
  }

  return withSuffixIfNeeded(base, existingNames);
}
