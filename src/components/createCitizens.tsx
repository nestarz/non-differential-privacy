import faker from "faker";
import eindhovenLogoString from "../assets/eindhoven-logo.txt";

faker.locale = "nl";
const pick = (array) => array[Math.floor(Math.random() * array.length)];

const origins = [
  "Nederland",
  "Indonesië/Nederlands-Indië",
  "België",
  "Turkije",
  "Marokko",
  "Angelsaksische landen",
  "Duitstalige landen",
  "Scandinavische landen",
  "Mediterrane landen",
  "Midden- en oost Europa",
  "Arabische landen",
  "Latijns Amerika",
  "Sub-Sahara-Afrika",
  "Zuid-Azië",
  "Centraal-Azië",
  "Zuidoost-Azië en de Pacific",
  "Oost-Azië",
  "Voormalige West-Indische koloniën",
];

const dataDrivenApproach = [
  "Employee, rental property, relatively short stay",
  "Young, short stay, no kids",
  "Temp or on-call worker, corporate services",
  "Female, spouse, often under-aged child(ren)",
  "Long stay and thoroughly settled",
  'On welfare payment ("bijstand"), rental property, low skilled',
  "Pupils/students, self-employed",
];

export default {
  nl: eindhovenLogoString
    .split("")
    .map((_, index) => {
      const _fakerLocale = pick(Object.keys(faker.locales));
      faker.locale = _fakerLocale;
      return {
        _fakerLocale,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      };
    })
    .map(({ _fakerLocale, firstName, lastName }) => {
      faker.locale = _fakerLocale;
      return {
        _fakerLocale,
        id: faker.helpers.slugify(`${firstName}-${lastName}`).toLowerCase(),
        uuid: faker.random.uuid(),
        personal: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          email: faker.internet.email(firstName, lastName),
          iban: faker.finance.iban(),
          ip: faker.internet.ip(),

          zipCode: faker.address.zipCode(),
          city: faker.address.city(),
          streetName: faker.address.streetName(),
          streetAddress: faker.address.streetAddress(),
          state: "Noord-Brabant",
          latitude: faker.address.latitude(),
          longitude: faker.address.longitude(),
        },
        avatar: `src/assets/images/image${
          1 + Math.floor(Math.random() * 242)
        }.jpg`,
        finger: `src/assets/fingers/finger${
          1 + Math.floor(Math.random() * 14)
        }.png`,
        clusters: {
          origin: pick(origins),
          dataDriven: pick(dataDrivenApproach),
          economicActive: pick([
            "Knwoledge Worker",
            "Labour Migrants",
            "International Student with income",
          ]),
        },
      };
    })
    .map(({ clusters, ...citizen }) => ({
      ...citizen,
      clusters,
      ratios: {
        ...Object.entries(clusters).reduce(
          (ratios, [key1, value1]) => ({
            ...ratios,
            ...Object.entries(clusters)
              .filter(([key2]) => key1 !== key2)
              .reduce(
                (clusters, [key2, value2]) => ({
                  ...clusters,
                  [`${key1}/${key2}`]: `${
                    Math.floor(Math.random() * 1000) / 10
                  }%`,
                }),
                {}
              ),
          }),
          {}
        ),
      },
    }))
    .reduce(
      (citizens, citizen) => ({
        ...citizens,
        [citizen.id]: citizen,
      }),
      {}
    ),
};
