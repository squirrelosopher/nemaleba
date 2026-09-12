// Who to call about water in a place this site reads no water source for. The providers
// in registry.json are the sources actually scraped; these are contacts only, so a number
// here never implies anybody publishes outages for the place -- most municipalities have a
// water company long before they have a feed worth reading.
//
// A city covered by a scraped source is deliberately absent: its number already travels
// with the provider, and recording it twice is how the two drift apart.
export interface WaterUtility {
  nameCyrillic: string;
  phone: string;
  cities: string[];
}

// The fault line where the utility publishes one, its dispatcher where it does not, and
// the central number where it publishes neither. A municipality missing from this list is
// one whose water company publishes no number we could verify.
const WATER_UTILITIES: WaterUtility[] = [
  { nameCyrillic: 'Водовод и канализација Суботица', phone: '024 557 711', cities: ['subotica'] },
  { nameCyrillic: 'Водоканал Сомбор', phone: '025 420 888', cities: ['sombor'] },
  { nameCyrillic: 'Наш дом Апатин', phone: '025 772 345', cities: ['apatin'] },
  { nameCyrillic: 'Услуга Оџаци', phone: '025 5742 163', cities: ['odzaci'] },
  {
    nameCyrillic: 'Комуналпројект Бачка Паланка',
    phone: '021 751 953',
    cities: ['backa-palanka']
  },
  { nameCyrillic: 'Комуналац Врбас', phone: '021 706 085', cities: ['vrbas'] },
  { nameCyrillic: 'Водоканал Бечеј', phone: '021 6912 588', cities: ['becej'] },
  { nameCyrillic: 'ЈКП Темерин', phone: '021 842 868', cities: ['temerin'] },
  { nameCyrillic: 'ЈКСП Сента', phone: '024 827 800', cities: ['senta'] },
  { nameCyrillic: 'Комуналац Кањижа', phone: '024 873 131', cities: ['kanjiza'] },
  { nameCyrillic: 'ЈП Кикинда', phone: '0230 422 760', cities: ['kikinda'] },
  { nameCyrillic: 'Други октобар Вршац', phone: '013 440 800', cities: ['vrsac'] },
  { nameCyrillic: 'Ковински комуналац', phone: '013 742 150', cities: ['kovin'] },
  { nameCyrillic: 'Универзал Алибунар', phone: '013 641 333', cities: ['alibunar'] },
  { nameCyrillic: 'Полет Пландиште', phone: '013 861 161', cities: ['plandiste'] },
  {
    nameCyrillic: 'Белоцрквански водовод и канализација',
    phone: '069 505 2560',
    cities: ['bela-crkva']
  },
  { nameCyrillic: 'Младост Опово', phone: '066 817 8820', cities: ['opovo'] },
  { nameCyrillic: 'Водовод Шид', phone: '022 710 445', cities: ['sid'] },
  { nameCyrillic: 'Комуналац Ириг', phone: '022 461 303', cities: ['irig'] },
  {
    nameCyrillic: 'Водовод и канализација Стара Пазова',
    phone: '022 310 330',
    cities: ['stara-pazova']
  },

  { nameCyrillic: 'Букуља Аранђеловац', phone: '0800 034 030', cities: ['arandjelovac'] },
  { nameCyrillic: 'ЈКСП Топола', phone: '0800 001 003', cities: ['topola'] },
  { nameCyrillic: '7. јули Баточина', phone: '034 6841 101', cities: ['batocina'] },
  { nameCyrillic: 'Стандард Јагодина', phone: '0800 350 353', cities: ['jagodina'] },
  { nameCyrillic: 'Водовод Параћин', phone: '035 563 465', cities: ['paracin'] },
  { nameCyrillic: 'Равно 2014 Ћуприја', phone: '035 8471 146', cities: ['cuprija'] },
  { nameCyrillic: 'Стан Деспотовац', phone: '035 611 665', cities: ['despotovac'] },
  { nameCyrillic: 'Морава Свилајнац', phone: '035 312 250', cities: ['svilajnac'] },
  { nameCyrillic: 'Водовод Смедерево', phone: '026 4623 743', cities: ['smederevo'] },
  {
    nameCyrillic: 'Водовод Смедеревска Паланка',
    phone: '026 313 160',
    cities: ['smederevska-palanka']
  },
  {
    nameCyrillic: 'Милош Митровић Велика Плана',
    phone: '026 521 009',
    cities: ['velika-plana']
  },
  { nameCyrillic: 'Дунав Велико Градиште', phone: '012 662 722', cities: ['veliko-gradiste'] },
  // Kostolac is served by Požarevac's utility from its own works there, on a number of
  // its own; the city page is separate, so the number a reader needs is too.
  {
    nameCyrillic: 'Водовод и канализација Пожаревац',
    phone: '012 241 676',
    cities: ['kostolac']
  },

  { nameCyrillic: 'Водовод Шабац', phone: '015 347 611', cities: ['sabac'] },
  {
    nameCyrillic: 'Водовод и канализација Лозница',
    phone: '015 7882 430',
    cities: ['loznica']
  },
  { nameCyrillic: 'Дрина Мали Зворник', phone: '015 471 577', cities: ['mali-zvornik'] },
  { nameCyrillic: 'Стандард Љубовија', phone: '0800 001 015', cities: ['ljubovija'] },
  { nameCyrillic: 'ЈКП Богатић', phone: '015 7786 416', cities: ['bogatic'] },
  { nameCyrillic: 'Извор Владимирци', phone: '015 513 460', cities: ['vladimirci'] },
  { nameCyrillic: 'ЈКП Осечина', phone: '014 3451 847', cities: ['osecina'] },
  { nameCyrillic: 'Градска чистоћа Лајковац', phone: '014 3431 194', cities: ['lajkovac'] },
  { nameCyrillic: 'Водовод Мионица', phone: '014 3422 259', cities: ['mionica'] },
  { nameCyrillic: 'Водовод Ужице', phone: '0800 313 100', cities: ['uzice'] },
  { nameCyrillic: 'Водовод Златибор', phone: '0800 333 113', cities: ['cajetina'] },
  { nameCyrillic: '12. септембар Бајина Башта', phone: '031 864 544', cities: ['bajina-basta'] },
  { nameCyrillic: 'Услуга Прибој', phone: '033 445 243', cities: ['priboj'] },
  { nameCyrillic: 'Лим Пријепоље', phone: '033 713 482', cities: ['prijepolje'] },
  { nameCyrillic: 'Комуналац Лучани', phone: '032 817 379', cities: ['lucani'] },
  { nameCyrillic: 'ЈКП Ивањица', phone: '032 662 549', cities: ['ivanjica'] },

  { nameCyrillic: 'Водовод Краљево', phone: '0800 353 708', cities: ['kraljevo'] },
  { nameCyrillic: 'Водовод Крушевац', phone: '037 415 334', cities: ['krusevac'] },
  { nameCyrillic: 'Расина Брус', phone: '037 825 486', cities: ['brus'] },
  { nameCyrillic: 'ЈКП Варварин', phone: '037 788 455', cities: ['varvarin'] },
  { nameCyrillic: 'ЈКСП Александровац', phone: '037 552 155', cities: ['aleksandrovac'] },
  { nameCyrillic: 'Комстан Трстеник', phone: '037 713 052', cities: ['trstenik'] },
  {
    nameCyrillic: 'Белимарковац Врњачка Бања',
    phone: '036 611 051',
    cities: ['vrnjacka-banja']
  },
  { nameCyrillic: 'ЈКП Рашка', phone: '036 735 430', cities: ['raska'] },
  {
    nameCyrillic: 'Водовод и канализација Нови Пазар',
    phone: '020 311 785',
    cities: ['novi-pazar']
  },
  { nameCyrillic: 'Врела Сјеница', phone: '020 744 077', cities: ['sjenica'] },
  { nameCyrillic: 'Градац Тутин', phone: '020 812 980', cities: ['tutin'] },

  { nameCyrillic: 'Водовод Зајечар', phone: '019 423 041', cities: ['zajecar'] },
  { nameCyrillic: 'Бадњево Неготин', phone: '019 542 012', cities: ['negotin'] },
  { nameCyrillic: 'Стандард Књажевац', phone: '019 731 112', cities: ['knjazevac'] },
  { nameCyrillic: 'Напредак Сокобања', phone: '0800 018 801', cities: ['sokobanja'] },
  { nameCyrillic: 'Водовод и канализација Пирот', phone: '0800 111 001', cities: ['pirot'] },
  { nameCyrillic: 'Комуналац Димитровград', phone: '010 362 764', cities: ['dimitrovgrad'] },
  { nameCyrillic: 'Комуналац Бабушница', phone: '010 385 364', cities: ['babusnica'] },
  { nameCyrillic: 'Комнис Бела Паланка', phone: '018 855 057', cities: ['bela-palanka'] },
  {
    nameCyrillic: 'Водовод и канализација Алексинац',
    phone: '018 804 816',
    cities: ['aleksinac']
  },
  { nameCyrillic: 'ЈКП Мерошина', phone: '018 891 400', cities: ['merosina'] },
  { nameCyrillic: 'ЈКП Дољевац', phone: '0800 111 203', cities: ['doljevac'] },
  { nameCyrillic: 'Градски водовод Прокупље', phone: '027 321 788', cities: ['prokuplje'] },
  { nameCyrillic: 'Топлица Куршумлија', phone: '027 381 427', cities: ['kursumlija'] },
  { nameCyrillic: 'ЈКП Житорађа', phone: '027 8362 834', cities: ['zitoradja'] },
  { nameCyrillic: 'Водовод Лебане', phone: '016 843 909', cities: ['lebane'] },
  { nameCyrillic: 'Водовод Власотинце', phone: '016 875 350', cities: ['vlasotince'] }
];

const BY_CITY = new Map(
  WATER_UTILITIES.flatMap((utility) => utility.cities.map((city) => [city, utility] as const))
);

export function waterUtilityFor(cityId: string): WaterUtility | undefined {
  return BY_CITY.get(cityId);
}
