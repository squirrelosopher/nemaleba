export interface Message {
  sr: string;
  en: string;
}

export const MESSAGES = {
  tagline: { sr: 'струја и вода · србија', en: 'power and water · serbia' },

  metaHomeTitle: {
    sr: 'nemaleba.rs — искључења струје и воде у Србији',
    en: 'nemaleba.rs — power and water outages in Serbia'
  },
  metaHomeDescription: {
    sr: 'Планирана и хаваријска искључења струје и воде у Србији, по градовима и општинама.',
    en: 'Planned and emergency power and water outages across Serbia, by city and municipality.'
  },
  metaCityTitle: {
    sr: '{city} — струја и вода | nemaleba.rs',
    en: '{city} — power and water | nemaleba.rs'
  },
  // Written from the day's own data at build time, so the snippet a search result or a
  // link preview shows says what this municipality is facing rather than repeating one
  // sentence across all of them.
  metaCityBoth: {
    sr: '{city}: {electricity} и {water} у наредним данима. Планирана и хаваријска искључења по данима.',
    en: '{city}: {electricity} and {water} in the days ahead. Planned and emergency outages day by day.'
  },
  metaCityOne: {
    sr: '{city}: {outages} у наредним данима. Планирана и хаваријска искључења по данима.',
    en: '{city}: {outages} in the days ahead. Planned and emergency outages day by day.'
  },
  metaCityQuiet: {
    sr: '{city}: нема најављених искључења струје ни воде. Планирана и хаваријска искључења по данима.',
    en: '{city}: no announced power or water outages. Planned and emergency outages day by day.'
  },
  metaCountElectricity: { sr: '{count} {outages} струје', en: '{count} power {outages}' },
  metaCountWater: { sr: '{count} {outages} воде', en: '{count} water {outages}' },
  heroLead: { sr: 'Има ли', en: 'Is there' },
  heroWordPower: { sr: 'струје', en: 'power' },
  heroConjunction: { sr: 'и', en: 'and' },
  heroWordWater: { sr: 'воде', en: 'water' },
  heroLedePrimary: {
    sr: 'Планирана и хаваријска искључења по градовима и општинама.',
    en: 'Planned and emergency outages by city and municipality.'
  },
  heroLedeSecondary: {
    sr: 'Актуелна обавештења и најаве за наредне дане.',
    en: 'Current announcements and forecasts for the days ahead.'
  },

  searchPlaceholder: { sr: 'Унесите град или општину…', en: 'Enter a city or municipality…' },
  searchPlaceholderShort: { sr: 'Претражи…', en: 'Search…' },
  searchLabel: { sr: 'Претрага градова и општина', en: 'City and municipality search' },
  citiesLabel: { sr: 'Подржани градови и општине', en: 'Supported cities and municipalities' },

  todayHeading: { sr: 'у Србији · наредних дана', en: 'serbia · days ahead' },
  historyHeading: { sr: 'у Србији · претходних дана', en: 'serbia · days past' },
  historyHeadingCity: { sr: 'претходних дана', en: 'days past' },
  historyChartLabel: {
    sr: 'Број искључења струје и воде по данима',
    en: 'Daily count of power and water outages'
  },
  comments: { sr: 'Коментари', en: 'Comments' },
  commentsFor: { sr: 'Коментари за {city}', en: 'Comments for {city}' },
  commentsUnavailableTitle: { sr: 'Коментари нису доступни', en: 'Comments are unavailable' },
  commentsUnavailableDetail: {
    sr: 'Не можемо да дођемо до сервера. Покушајте поново за који тренутак.',
    en: 'We cannot reach the server. Please try again in a moment.'
  },
  commentsEmptyTitle: { sr: 'Још нема коментара', en: 'No comments yet' },
  commentsEmptyDetail: {
    sr: 'Поделите искуство, примедбу или мишљење.',
    en: 'Share an experience, a remark or an opinion.'
  },
  commentNew: { sr: 'Нови коментар', en: 'New comment' },
  commentPlaceholder: { sr: 'Напишите коментар…', en: 'Write a comment…' },
  commentSubmit: { sr: 'Пошаљи', en: 'Send' },
  commentRemaining: { sr: '{count} преостало', en: '{count} left' },
  commentDisclaimer: {
    sr: 'Коментаре пишу читаоци, информативног су карактера и нестају после 24 сата.',
    en: 'Comments are written by readers, are informational only, and disappear after 24 hours.'
  },
  commentTooManyTitle: { sr: 'Сачекајте мало', en: 'Hold on a moment' },
  commentTooManyDetail: {
    sr: 'Причекајте пре следећег коментара.',
    en: 'Wait before your next comment.'
  },
  commentNoLinksTitle: { sr: 'Линкови нису дозвољени', en: 'Links are not allowed' },
  commentNoLinksDetail: {
    sr: 'Уклоните адресу из коментара.',
    en: 'Remove the address from the comment.'
  },
  commentFailedTitle: { sr: 'Слање није успело', en: 'Could not send' },
  commentFailedDetail: {
    sr: 'Проверите везу и покушајте поново.',
    en: 'Check your connection and try again.'
  },
  metaCommentsTitle: {
    sr: 'Коментари · {city} | nemaleba.rs',
    en: 'Comments · {city} | nemaleba.rs'
  },
  historyPointPower: { sr: '{date} · струја: {count}', en: '{date} · power: {count}' },
  historyPointWater: { sr: '{date} · вода: {count}', en: '{date} · water: {count}' },
  historyEmpty: {
    sr: 'Још нема довољно података. Статистика се прикупља сваког дана.',
    en: 'Not enough data yet. Statistics are gathered each day.'
  },
  columnMunicipality: { sr: 'Град', en: 'City' },
  columnOutages: { sr: 'Искључења', en: 'Outages' },
  noneToday: { sr: 'Нема пријављених искључења данас.', en: 'No outages reported today.' },

  electricity: { sr: 'Струја', en: 'Power' },
  water: { sr: 'Вода', en: 'Water' },
  noOutages: { sr: 'Нема искључења', en: 'No outages' },
  panelEmptyTitle: { sr: 'Нема искључења', en: 'No outages' },
  panelEmptyDetail: {
    sr: 'Нема најављених искључења за ову општину.',
    en: 'No announced outages for this municipality.'
  },
  // Said instead of "nothing announced" where nothing could be announced in the first
  // place: most water utilities in Serbia publish nothing a machine can read, and a
  // reader is owed the difference between a quiet day and no source at all.
  panelUnwatchedTitle: { sr: 'Нема извора за воду', en: 'No water source' },
  panelUnwatchedDetail: {
    sr: 'Водовод у овом граду не објављује најаве искључења.',
    en: 'The water utility here publishes no outage announcements.'
  },

  recentShow: { sr: 'недавна искључења', en: 'recent outages' },
  recentHide: { sr: 'сакриј недавна', en: 'hide recent' },

  allDay: { sr: 'цео дан', en: 'all day' },
  timeFrom: { sr: 'од {time}', en: 'from {time}' },
  timeUntil: { sr: 'до {time}', en: 'until {time}' },
  plannedWorks: { sr: 'Планирани радови', en: 'Planned works' },
  showMore: { sr: 'детаљније', en: 'more' },
  showLess: { sr: 'мање', en: 'less' },
  source: { sr: 'извор', en: 'source' },
  openSource: { sr: 'Отвори извор', en: 'Open source' },
  shareOutage: { sr: 'Подели', en: 'Share' },
  shareTitleElectricity: { sr: 'Искључење струје — {city}', en: 'Power outage — {city}' },
  shareTitleWater: { sr: 'Искључење воде — {city}', en: 'Water outage — {city}' },

  allMunicipalities: { sr: 'сви градови и општине', en: 'all cities and municipalities' },
  otherMunicipality: { sr: 'друга општина или град', en: 'another city or municipality' },
  branch: { sr: 'ЕД {branch}', en: 'ED {branch}' },

  notifyIdle: { sr: 'Обавести ме за {city}', en: 'Notify me about {city}' },
  notifyWorking: { sr: 'Пријављивање…', en: 'Subscribing…' },
  notifySubscribed: { sr: 'Искључи обавештења', en: 'Stop receiving notifications' },
  notifyBlocked: {
    sr: 'Обавештења су блокирана у прегледачу',
    en: 'Notifications are blocked in your browser'
  },
  notifyFailed: {
    sr: 'Пријава није успела, покушајте поново',
    en: 'Subscription failed, please try again'
  },
  notifyUnsupported: {
    sr: 'Прегледач не подржава обавештења',
    en: 'Your browser does not support notifications'
  },
  notifyNeedsHomeScreen: {
    sr: 'Додајте на почетни екран да бисте примали обавештења',
    en: 'Add to the Home Screen to receive notifications'
  },
  notifyNotConfigured: { sr: 'Обавештења ускоро', en: 'Notifications coming soon' },

  footerNote: {
    sr: 'Незванични приказ јавно објављених података. Подаци се преузимају са:',
    en: 'Unofficial view of publicly available data. Sourced from:'
  },
  footerReport: { sr: 'За пријаву квара:', en: 'To report a fault:' },
  streetHeading: { sr: 'Улица', en: 'Street' },
  streetNamed: {
    sr: 'Искључења која помињу ову улицу.',
    en: 'Outages that name this street.'
  },
  streetQuiet: {
    sr: 'Ниједна најава не помиње ову улицу.',
    en: 'No announcement names this street.'
  },
  streetQuietWhy: {
    sr: 'То не значи да све ради: најаве понекад описују подручје без имена улице.',
    en: 'That does not mean everything is on: announcements sometimes describe an area without naming a street.'
  },
  streetSeeCity: { sr: 'Сва искључења у {city}', en: 'All outages in {city}' },
  footerUpdated: { sr: 'Ажурирано', en: 'Updated' },
  footerSupport: { sr: 'Подржи рад', en: 'Support this work' },

  errorNotFoundTitle: { sr: 'Немамо то место', en: 'We do not cover that place' },
  errorNotFoundDetail: {
    sr: 'Проверите назив или изаберите из листе. Покривамо градове и општине које ЕПС Дистрибуција објављује.',
    en: 'Check the spelling or pick from the list. We cover the cities and municipalities EPS Distribution publishes.'
  },
  errorGenericTitle: { sr: 'Нешто није у реду', en: 'Something went wrong' },
  errorGenericDetail: {
    sr: 'Молимо Вас покушајте поново касније. Хвала на разумевању.',
    en: 'Please try again later. Thank you for your patience.'
  },

  today: { sr: 'данас', en: 'today' },
  tomorrow: { sr: 'сутра', en: 'tomorrow' },

  toastClose: { sr: 'Затвори', en: 'Close' },

  pushElectricity: { sr: 'Искључење струје', en: 'Power outage' },
  pushDigestTitle: { sr: 'Нова обавештења', en: 'New notifications' },
  pushDigestBody: {
    sr: '{locations} — отворите за детаље.',
    en: '{locations} — open for details.'
  },
  pushWater: { sr: 'Искључење воде', en: 'Water outage' },

  notificationsTitle: { sr: 'Обавештења', en: 'Notifications' },
  notificationsEmptyTitle: { sr: 'Нема обавештења', en: 'No notifications' },
  notificationsEmptyDetail: {
    sr: 'Овде стижу обавештења за локације на које сте пријављени. Чувају се само на овом уређају.',
    en: 'Notifications for the locations you subscribed to land here. They are kept on this device only.'
  },
  installApp: { sr: 'Инсталирај апликацију', en: 'Install the app' },
  installFromMenuOnHandheld: {
    sr: 'Препоручујемо инсталацију засебне апликације — инсталирајте је из менија прегледача.',
    en: 'Installing it as its own app is worth it — install it from the browser menu.'
  },
  deliveryTryPhone: {
    sr: 'Препоручујемо коришћење странице на мобилном — обавештења ће стизати и када је прегледач затворен.',
    en: 'We recommend using the site on a phone — notifications then arrive even when the browser is closed.'
  },
  installOnHandheld: {
    sr: 'Препоручујемо инсталацију засебне апликације — добија своју икону и отвара се без прегледача.',
    en: 'Installing it as its own app is worth it — it gets its own icon and opens without the browser.'
  },
  installIos: {
    sr: 'На iPhone-у обавештења стижу само из апликације на почетном екрану. У Safari-ју отворите мени за дељење и изаберите „Додај на почетни екран“ (Add to Home Screen).',
    en: 'On iPhone, notifications arrive only from an app on the Home Screen. In Safari, open Share and choose “Add to Home Screen”.'
  },
  deliveryInstalled: {
    sr: 'Овде можете прегледати обавештења и подесити шта примате.',
    en: 'Here you can review your notifications and choose what you receive.'
  },
  deliveryOnDesktop: {
    sr: 'Обавештења стижу само док је прегледач покренут.',
    en: 'Notifications arrive only while the browser is running.'
  },
  deliveryOnHandheld: {
    sr: 'Обавештења ће стизати и ако затворите ову картицу.',
    en: 'Notifications will arrive even if you close this tab.'
  },
  notificationsClearAll: { sr: 'Обриши све', en: 'Delete all' },
  notifyForElectricity: { sr: 'Обавести за струју', en: 'Notify about power' },
  notifyForElectricityDetail: {
    sr: 'Обавести ме о искључењима струје',
    en: 'Notify me about power outages'
  },
  notifyForWater: { sr: 'Обавести за воду', en: 'Notify about water' },
  notifyForWaterDetail: {
    sr: 'Обавести ме о искључењима воде',
    en: 'Notify me about water outages'
  },
  notifyGrouped: { sr: 'Групиши обавештења', en: 'Group notifications' },
  notifyGroupedDetail: {
    sr: 'Обавести ме једном за више градова',
    en: 'Notify me once for several cities'
  },
  subscribedCities: { sr: 'Претплаћене локације', en: 'Subscribed locations' },
  notificationPreferences: { sr: 'Подешавања обавештења', en: 'Notification preferences' },
  subscribedCitiesEmptyTitle: { sr: 'Нема пријава', en: 'No subscriptions' },
  subscribedCitiesEmptyDetail: {
    sr: 'Пријављене локације можете пронаћи овде.',
    en: 'Locations you subscribe to are listed here.'
  },
  removeCity: { sr: 'Уклони {city}', en: 'Remove {city}' },
  notificationDelete: { sr: 'Обриши обавештење', en: 'Delete notification' },
  notificationMute: { sr: 'Искључи обавештења за {city}', en: 'Turn off notifications for {city}' },

  outageArchivedTitle: { sr: 'Искључење архивирано', en: 'Outage archived' },
  outageArchived: {
    sr: 'Искључење је у међувремену архивирано.',
    en: 'This outage has since been archived.'
  },
  toastOnTitle: { sr: 'Обавештења укључена', en: 'Notifications on' },
  toastOnMessage: {
    sr: 'Пратите искључења за {city}.',
    en: 'Following outages in {city}.'
  },
  toastOffTitle: { sr: 'Обавештења искључена', en: 'Notifications off' },
  toastOffMessage: {
    sr: 'Више не пратите {city}.',
    en: 'No longer following {city}.'
  },
  toastFailedTitle: { sr: 'Није успело', en: 'Something went wrong' },

  languageLabel: { sr: 'Језик', en: 'Language' },
  themeLabel: { sr: 'Тема', en: 'Theme' },
  themeLight: { sr: 'Светла тема', en: 'Light theme' },
  themeDark: { sr: 'Тамна тема', en: 'Dark theme' }
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof MESSAGES;
