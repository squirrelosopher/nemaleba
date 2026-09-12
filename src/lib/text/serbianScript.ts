const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z',
  и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'č', џ: 'dž', ш: 'š'
};

const LATIN_DIGRAPHS: Record<string, string> = {
  lj: 'љ', nj: 'њ', dž: 'џ', dj: 'ђ'
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', đ: 'ђ', e: 'е', ž: 'ж', z: 'з',
  i: 'и', j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', ć: 'ћ', u: 'у', f: 'ф', h: 'х', c: 'ц', č: 'ч', š: 'ш'
};

const DIACRITIC_FOLD: Record<string, string> = {
  đ: 'dj', ž: 'z', š: 's', č: 'c', ć: 'c'
};

function isUpper(character: string): boolean {
  return character !== character.toLowerCase();
}

export function toLatin(text: string): string {
  let result = '';

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const mapped = CYRILLIC_TO_LATIN[character.toLowerCase()];

    if (!mapped) {
      result += character;
      continue;
    }

    if (!isUpper(character)) {
      result += mapped;
      continue;
    }

    const nextIsUpper = isUpper(text[index + 1] ?? '');
    result += mapped.length > 1 && !nextIsUpper
      ? mapped[0].toUpperCase() + mapped.slice(1)
      : mapped.toUpperCase();
  }

  return result;
}

export function toCyrillic(text: string): string {
  let result = '';
  let index = 0;

  while (index < text.length) {
    const pair = text.slice(index, index + 2).toLowerCase();
    const digraph = LATIN_DIGRAPHS[pair];

    if (digraph) {
      const upper = isUpper(text[index]);
      result += upper ? digraph.toUpperCase() : digraph;
      index += 2;
      continue;
    }

    const character = text[index];
    const mapped = LATIN_TO_CYRILLIC[character.toLowerCase()];

    if (!mapped) {
      result += character;
      index += 1;
      continue;
    }

    result += isUpper(character) ? mapped.toUpperCase() : mapped;
    index += 1;
  }

  return result;
}

export function foldDiacritics(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((character) => DIACRITIC_FOLD[character] ?? character)
    .join('');
}

export function toSearchKey(text: string): string {
  return foldDiacritics(toLatin(text)).replace(/[^a-z0-9]+/g, '');
}

export function toSlug(text: string): string {
  return foldDiacritics(toLatin(text))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
