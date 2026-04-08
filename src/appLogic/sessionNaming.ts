export type SessionNameLanguage = 'en' | 'ru';

const RU_COLOR_ADJECTIVES = [
  'Ониксовый', 'Янтарный', 'Сапфировый', 'Изумрудный', 'Рубиновый', 'Топазовый', 'Аметистовый',
  'Лазурный', 'Малахитовый', 'Кобальтовый', 'Гранатовый', 'Жемчужный', 'Лунный', 'Нефритовый',
  'Туманный', 'Серебряный', 'Золотистый', 'Пепельный', 'Шафрановый', 'Коралловый', 'Аквамариновый',
  'Оливковый', 'Бордовый', 'Бирюзовый', 'Индиговый',
] as const;

const RU_COLOR_BASES = [
  'алый', 'пурпурный', 'лазурный', 'изумрудный', 'сапфирный',
  'янтарный', 'нефритовый', 'коралловый', 'графитовый', 'небесный',
] as const;

const EN_COLOR_ADJECTIVES = [
  'Onyx', 'Amber', 'Sapphire', 'Emerald', 'Ruby', 'Topaz', 'Amethyst',
  'Azure', 'Malachite', 'Cobalt', 'Garnet', 'Pearl', 'Lunar', 'Jade',
  'Misty', 'Silver', 'Golden', 'Ashen', 'Saffron', 'Coral', 'Aquamarine',
  'Olive', 'Burgundy', 'Turquoise', 'Indigo',
] as const;

const EN_COLOR_BASES = [
  'Scarlet', 'Crimson', 'Blue', 'Green', 'Violet',
  'Amber', 'Jade', 'Coral', 'Graphite', 'Sky',
] as const;

const RU_FLOWERS = [
  'роза', 'лилия', 'тюльпан', 'гиацинт', 'орхидея', 'ирис', 'пион', 'мак', 'лотос', 'фиалка',
  'василек', 'нарцисс', 'жасмин', 'гортензия', 'хризантема', 'лаванда', 'георгин', 'камелия', 'магнолия', 'фрезия',
  'анемона', 'бегония', 'вербена', 'гвоздика', 'дельфиниум', 'эхинацея', 'календула', 'мимоза', 'петуния', 'примула',
  'ранункулюс', 'сирень', 'клевер', 'чертополох', 'цинния', 'люпин', 'маргаритка', 'лютик', 'ромашка', 'колокольчик',
  'незабудка', 'адонис', 'астра', 'барвинок', 'дрок', 'эвкалипт', 'флокс', 'гелиотроп', 'ипомея', 'купальница',
  'левкой', 'мальва', 'настурция', 'олеандр', 'платикодон', 'резеда', 'сальвия', 'табак', 'урзиния', 'вьюнок',
] as const;

const EN_FLOWERS = [
  'rose', 'lily', 'tulip', 'hyacinth', 'orchid', 'iris', 'peony', 'poppy', 'lotus', 'violet',
  'cornflower', 'daffodil', 'jasmine', 'hydrangea', 'chrysanthemum', 'lavender', 'dahlia', 'camellia', 'magnolia', 'freesia',
  'anemone', 'begonia', 'verbena', 'carnation', 'delphinium', 'echinacea', 'calendula', 'mimosa', 'petunia', 'primrose',
  'ranunculus', 'lilac', 'clover', 'thistle', 'zinnia', 'lupine', 'daisy', 'buttercup', 'bellflower', 'forget-me-not',
  'adonis', 'aster', 'periwinkle', 'gorse', 'eucalyptus', 'phlox', 'heliotrope', 'morning-glory', 'globe-flower', 'stock',
  'mallow', 'nasturtium', 'oleander', 'platycodon', 'mignonette', 'salvia', 'tobacco-flower', 'ursinia', 'bindweed', 'snowdrop',
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

function getFlowerPool(language: SessionNameLanguage): readonly string[] {
  return language === 'ru' ? RU_FLOWERS : EN_FLOWERS;
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
  const flowerPool = getFlowerPool(language);
  const colorIndex = Math.floor(Math.abs(randomValue) * colorPool.length) % colorPool.length;
  const flowerIndex = Math.floor(Math.abs(randomValue * 9973) * flowerPool.length) % flowerPool.length;
  const color = colorPool[colorIndex] ?? colorPool[0];
  const flowerRaw = flowerPool[flowerIndex] ?? flowerPool[0];
  const flower = language === 'ru' ? flowerRaw : toTitleCase(flowerRaw);
  const base = `${color} ${flower}`;
  return withSuffixIfNeeded(base, existingNames);
}
