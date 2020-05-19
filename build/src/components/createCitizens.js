import faker2 from "faker";
import eindhovenLogoString from "./../../../src/assets/eindhoven-logo.txt";
faker2.locale = "nl";
const pick = (array) => array[Math.floor(Math.random() * array.length)];
const origins = ["Nederland", "Indonesië/Nederlands-Indië", "België", "Turkije", "Marokko", "Angelsaksische landen", "Duitstalige landen", "Scandinavische landen", "Mediterrane landen", "Midden- en oost Europa", "Arabische landen", "Latijns Amerika", "Sub-Sahara-Afrika", "Zuid-Azië", "Centraal-Azië", "Zuidoost-Azië en de Pacific", "Oost-Azië", "Voormalige West-Indische koloniën"];
const dataDrivenApproach = ["Employee, rental property, relatively short stay", "Young, short stay, no kids", "Temp or on-call worker, corporate services", "Female, spouse, often under-aged child(ren)", "Long stay and thoroughly settled", 'On welfare payment ("bijstand"), rental property, low skilled', "Pupils/students, self-employed"];
export default {
  nl: eindhovenLogoString.split("").map((_, index) => {
    const _fakerLocale = pick(Object.keys(faker2.locales));
    faker2.locale = _fakerLocale;
    return {
      _fakerLocale,
      firstName: faker2.name.firstName(),
      lastName: faker2.name.lastName()
    };
  }).map(({_fakerLocale, firstName, lastName}) => {
    faker2.locale = _fakerLocale;
    return {
      _fakerLocale,
      id: faker2.helpers.slugify(`${firstName}-${lastName}`).toLowerCase(),
      uuid: faker2.random.uuid(),
      personal: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: faker2.internet.email(firstName, lastName),
        iban: faker2.finance.iban(),
        ip: faker2.internet.ip(),
        zipCode: faker2.address.zipCode(),
        city: faker2.address.city(),
        streetName: faker2.address.streetName(),
        streetAddress: faker2.address.streetAddress(),
        state: "Noord-Brabant",
        latitude: faker2.address.latitude(),
        longitude: faker2.address.longitude()
      },
      avatar: `src/assets/images/image${1 + Math.floor(Math.random() * 242)}.jpg`,
      finger: `src/assets/fingers/finger${1 + Math.floor(Math.random() * 14)}.png`,
      clusters: {
        origin: pick(origins),
        dataDriven: pick(dataDrivenApproach),
        economicActive: pick(["Knwoledge Worker", "Labour Migrants", "International Student with income"])
      }
    };
  }).map(({clusters, ...citizen}) => ({
    ...citizen,
    clusters,
    ratios: {
      ...Object.entries(clusters).reduce((ratios, [key1, value1]) => ({
        ...ratios,
        ...Object.entries(clusters).filter(([key2]) => key1 !== key2).reduce((clusters2, [key2, value2]) => ({
          ...clusters2,
          [`${key1}/${key2}`]: `${Math.floor(Math.random() * 1000) / 10}%`
        }), {})
      }), {})
    }
  })).reduce((citizens, citizen) => ({
    ...citizens,
    [citizen.id]: citizen
  }), {})
};
