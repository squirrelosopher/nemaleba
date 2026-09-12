// Announcements and the Address Register write the same street two different ways, and
// nearly all of the difference is noise rather than disagreement. Folding both sides the
// same way is what turns a comparison that fails into one that holds.
//
// Shared rather than pipeline-only, because a street page asks the same question of the
// same text in the browser: does this announcement name the street a reader came for.
//
// Everything here was found by measuring: matching the committed dataset against the
// register raised the share of announcements naming a street the register knows from 14%
// to 55% once the words below stopped being treated as part of the name.

// A plot with no number is written "бб"; one identified by a neighbour's is "код броја
// 14"; and a street is introduced as "ул." or, in the locative, "улици". None of it is
// part of the name.
//
// Bounded by letters rather than by \b, which is defined on ASCII word characters and so
// matched no Cyrillic word at all: every "бб" and "код броја" stayed in the name.
const NOISE =
  /(?<!\p{L})(?:бб|б\.\s*б\.?|код\s+броја|броја|број|бр\.?|улици|улица|улице|ул\.?|насељу|насеље|нас\.?|делови|дела|део|села|селу|село|засеок)(?!\p{L})/giu;

// A house number, and everything after it: the register's names carry none, and what
// follows a number in an announcement is another address or a note about it.
const FROM_FIRST_NUMBER = /\d.*$/u;

// What separates one address from the next, including the words that join the ends of a
// stretch of one street -- "Светосавска од Косовске до Партизанске" is one street named
// once and two more named as landmarks.
const SEPARATORS = /[•;,:.()–—]|\s+од\s+|\s+до\s+|\s+и\s+|\s+преко\s+/u;

const MIN_NAME_LENGTH = 4;

export function foldForMatching(text: string): string {
  return text
    .toLocaleLowerCase('sr')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Every phrase in an announcement that could be an address. Deliberately generous: a
// phrase that is not a street simply matches nothing, while one thrown away here can
// never be matched at all.
export function addressCandidates(text: string): string[] {
  return text
    .split(SEPARATORS)
    .map((part) => foldForMatching(part.replace(FROM_FIRST_NUMBER, '').replace(NOISE, ' ')))
    .filter((part) => part.length >= MIN_NAME_LENGTH);
}
