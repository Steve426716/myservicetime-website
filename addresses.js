// MyServiceTime — finds addresses written in free text, in any language / country style.
//
// No list can know every address on Earth, so recognition works in layers:
//  1. A line that starts with 📍 / 🏠 or a label like "Address:" (in ~40 languages) is ALWAYS an address.
//     The "📍 Insert address" button writes notes this way, so anything found by search is always a link.
//  2. Street patterns used around the world:
//       number + name + street word     "25 Main St"             (US, UK, Canada, Australia, India, Africa…)
//       number + street word + name     "12 rue de la Paix"      (France, Haiti, Belgium, Spain, Latin America…)
//       street word + name + number     "Calle Mayor 5", "ul. Lenina, d. 5", "Jl. Sudirman No. 5"
//       name + street word + number     "Váci utca 5", "Atatürk Caddesi No:12"
//       glued street words + number     "Hauptstraße 5", "Kalverstraat 12", "Storgatan 3"
//  3. East-Asian addresses (Chinese, Japanese, Korean) by their place markers: 市 区 路 号 丁目 番地 로 길 …
//  4. Postal-code styles: "〒100-0005", "SW1A 1AA", "75001 Paris" are kept as part of the address.

const L = String.raw`[\p{L}\p{M}]`;                  // any letter, any script (with accents)
const WORDCH = String.raw`[\p{L}\p{M}\p{N}.'’\-]`;    // characters inside a name word
const NB = String.raw`(?<![\p{L}\p{M}\p{N}])`;        // start-of-word boundary that works for every script
const NA = String.raw`(?![\p{L}\p{M}\p{N}])`;         // end-of-word boundary
const NUM = String.raw`\p{Nd}{1,6}(?:[\-/]\p{Nd}{1,6})?(?:[A-Za-z]${NA})?`; // 12, 12B, 12-14, 12/3, ١٢, १२

// Words that end an address when they appear in a sentence ("…Boston THEN go home").
const STOP = [
  "then", "and", "to", "at", "for", "before", "after", "with", "by", "or", "on", "in", "from", "is", "was", "tomorrow", "today",
  "the", "a", "an", "my", "our", "your", "his", "her", "their", "this", "that", "down", "up", "along", "across", "about", "near", "past", "into",
  "en", "à", "em", "nan", "lè", "es", "est", "ist", "è", "é", "um", "am", "im", "bei", "alle", "às", "se",
  "puis", "et", "pour", "avant", "après", "avec", "demain", "ensuite",
  "y", "luego", "después", "con", "para", "mañana",
  "e", "depois", "com", "amanhã",
  "und", "dann", "mit", "nach", "vor", "morgen",
  "poi", "dopo", "domani",
  "epi", "apre", "ak", "pou", "demen",
  "и", "потом", "после", "завтра",
  "ثم", "بعد", "مع",
].join("|");
const W = String.raw`(?!(?:${STOP})${NA})${WORDCH}+`;  // one word, but not a stop word
const NAME = (max) => String.raw`${W}(?:[ \t]+${W}){0,${max}}`;
// ", Boston" · ", DC 20500" · ", 75001 Paris" · ", New York City"
const TAIL = String.raw`(?:[,،，、][ \t]*${NAME(3)})`; // also Arabic "،" and Chinese/Japanese "，、" commas
// After a house number the address ends: a comma, the end of the line, a city ("Delmas 33 Port-au-Prince")…
// but not an ordinary lower-case word ("Main St, 2 return visits", "came close 2 times").
// The rules mark where the number ends; findAddresses() then looks at the next word (there, upper/lower case counts).
const END = "(?<numEnd>)";
const LOWER_WORD_NEXT = new RegExp(String.raw`^[ \t]+(?!(?:${STOP})${NA})\p{Ll}`, "u");
const HOUSE_NO = String.raw`(?:(?:No|Nr|N°|Nº|nº|n°|n\.|#|д\.|дом|No:|Nu)\.?[ \t]*)?`;

// Street words that come AFTER the street name ("Main Street", "Váci utca", "MG Marg")
const AFTER = [
  "street", "st", "avenue", "ave", "av", "road", "rd", "boulevard", "blvd", "drive", "dr", "lane", "ln", "way", "court", "ct",
  "place", "pl", "highway", "hwy", "parkway", "pkwy", "terrace", "ter", "circle", "cir", "square", "sq", "close", "crescent",
  "cres", "row", "grove", "gardens", "mews", "hill", "walk", "expressway", "expy", "freeway", "fwy", "trail", "trl", "pike",
  "caddesi", "cad", "cd", "sokak", "sokağı", "sk", "sok", "bulvarı", "utca", "út", "tér", "körút",
  "marg", "nagar", "gali", "chowk", "salai", "mārg", "मार्ग", "रोड", "नगर", "गली", "சாலை",
  "ulica", "ulice", "iela", "gatvė", "tänav", "katu", "tie", "kuja",
  "đường", "phố",
].join("|");

// Street words that come BEFORE the street name ("rue de la Paix", "Calle Mayor", "улица Ленина")
const BEFORE = [
  "rue", "ri", "avenue", "av", "avni", "boulevard", "bd", "bld", "chemin", "chemen", "allée", "impasse", "place", "plas",
  "route", "wout", "quai", "cours", "ruelle", "rèl", "lakou", "cité",
  "calle", "c/", "avenida", "avda", "carrera", "cra", "calzada", "paseo", "camino", "carretera", "plaza",
  "jirón", "pasaje", "diagonal", "transversal", "callejón", "colonia",
  "rua", "travessa", "estrada", "praça", "alameda", "largo", "rodovia", "beco",
  "via", "viale", "piazza", "corso", "vicolo", "piazzale", "lungomare", "contrada",
  "ulica", "ul", "aleja", "plac", "osiedle",
  "улица", "ул", "проспект", "пр-т", "просп", "переулок", "пер", "шоссе", "бульвар", "б-р", "площадь",
  "набережная", "наб", "проезд", "микрорайон", "мкр", "вулиця", "вул",
  "strada", "str", "calea", "bulevardul", "bd-ul", "aleea", "șoseaua",
  "odos", "οδός", "οδ", "λεωφόρος", "λεωφ", "πλατεία",
  "jalan", "jl", "jln", "lorong", "soi", "ซอย", "ถนน",
  "đường", "phố", "ngõ", "hẻm", "kiệt",
  "mtaa", "barabara", "njia",
  "شارع", "طريق", "حي", "جادة", "زقاق", "ميدان", "خيابان", "کوچه", "بلوار",
  "רחוב", "רח", "שדרות", "שד", "דרך",
  "sokak", "cadde", "mahallesi", "mah",
].join("|");

// Street words so specific they mark an address even without a house number ("rue de la Paix, Paris").
const STRONG = [
  "rue", "ri", "calle", "avenida", "rua", "travessa", "viale", "piazza", "ulica", "улица", "ул", "проспект", "вулиця",
  "οδός", "λεωφόρος", "jalan", "jl", "đường", "ถนน", "ซอย", "شارع", "خيابان", "רחוב", "שדרות", "caddesi", "sokak",
].join("|");

// Streets named by a number: "Calle 8 # 5-20", "Delmas 33", "Route 66", "Soi 11", "Carrera 7"
const NUMBERED = [
  "calle", "carrera", "cra", "kra", "avenida", "av", "transversal", "diagonal", "delmas", "route", "rout", "wout", "ruta",
  "highway", "hwy", "interstate", "autopista", "soi", "ซอย", "jalan", "jl", "rue", "ri", "street", "st", "avenue",
].join("|");

// Street words glued to the end of the name, followed by the number ("Hauptstraße 5", "Kalverstraat 12")
const GLUED = [
  "straße", "strasse", "str", "weg", "gasse", "platz", "allee", "damm", "ufer", "chaussee", "steig", "pfad",
  "straat", "laan", "plein", "gracht", "singel", "dreef", "steeg",
  "gade", "vej", "gatan", "gata", "vägen", "väg", "veien", "vei", "veg", "plads", "torget",
  "katu", "tie", "kuja", "polku", "tori", "rinne",
  "utca", "útja", "iela", "gatvė", "tänav",
].join("|");

const LABELS = [
  "address", "addr", "location", "venue", "place", "where",
  "adresse", "lieu", "adrès", "kote", "lokasyon",
  "dirección", "direccion", "dir", "ubicación", "ubicacion", "lugar", "domicilio",
  "endereço", "endereco", "morada", "local", "localização",
  "anschrift", "ort", "indirizzo", "luogo", "adres", "adresa", "adresă", "cím", "osoite", "adressi",
  "адрес", "місце", "адреса", "διεύθυνση",
  "عنوان", "العنوان", "المكان", "כתובת",
  "पता", "स्थान", "ঠিকানা", "முகவரி",
  "地址", "住址", "地點", "地点", "住所", "所在地", "주소", "위치",
  "địa chỉ", "ที่อยู่", "alamat", "lokasi", "anwani", "mahali", "adirẹsi", "adireshi", "adiresi",
].join("|");

const ADDRESS_RULES = [
  // 1. Marked lines: "📍 anything", "Address: anything", "地址：…"
  { re: String.raw`^[ \t]*(?:📍|🏠|🏢|(?:${LABELS})[ \t]*[:：])[ \t]*([^\n]{3,})$`, flags: "gimu", group: 1 },

  // 2a. number + name + street word (+ N/S/E/W) + tail          "25 Main St, Boston"
  { re: String.raw`${NB}${NUM}[ \t,]+${NAME(4)}[ \t]+(?:${AFTER})\.?${NA}(?:[ \t]+(?:N|S|E|W|NE|NW|SE|SW|North|South|East|West)\.?${NA})?${TAIL}{0,3}` },

  // 2b. number + street word + name + tail                       "12 rue de la Paix, Paris" / "45, Calle 8"
  { re: String.raw`${NB}${NUM}[ \t]*,?[ \t]+(?:${BEFORE})\.?${NA}[ \t]*${NAME(5)}${TAIL}{0,3}` },

  // 2c. street word + name + number + tail                        "Calle Mayor 5, Madrid" / "ул. Ленина, д. 5"
  { re: String.raw`${NB}(?:${BEFORE})\.?${NA}[ \t]*${NAME(5)}[ \t]*,?[ \t]*${HOUSE_NO}${NUM}${NA}${END}${TAIL}{0,3}` },

  // 2d. name + street word + number + tail                        "Váci utca 5" / "Atatürk Caddesi No:12"
  { re: String.raw`${NB}${NAME(1)}[ \t]+(?:${AFTER})\.?${NA}[ \t]*,?[ \t]*${HOUSE_NO}${NUM}${NA}${END}${TAIL}{0,3}` },

  // 2e. glued street word + number + tail                         "Hauptstraße 5, 10115 Berlin"
  // (the name part must be 3+ letters, so English words like "during" or "string" don't count)
  { re: String.raw`${NB}${L}[\p{L}\p{M}\-]{2,}(?:${GLUED})\.?[ \t]+${NUM}${NA}${END}${TAIL}{0,3}` },

  // 2f. street named by a number (+ house number) + tail          "Calle 8 # 5-20, Bogotá" / "Delmas 33, Port-au-Prince"
  { re: String.raw`${NB}(?:${NUMBERED})\.?[ \t]+${NUM}${NA}(?:[ \t]*(?:#|No\.?|N°|Nº)[ \t]*${NUM})?${END}${TAIL}{0,3}` },

  // 2g. strong street word + name, no number needed               "rue de la Paix, Paris" / "شارع الملك فهد"
  // (a street name is a proper name: in alphabets with capitals it needs one — so "mwen ri anpil" isn't a street)
  {
    re: String.raw`${NB}(?:${STRONG})\.?${NA}[ \t]*${NAME(4)}${TAIL}{0,3}`,
    test: (s) => {
      const name = s.replace(new RegExp(String.raw`^(?:${STRONG})\.?`, "iu"), "");
      return /\p{Lu}/u.test(name) || !/[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u.test(name);
    },
  },

  // Postcodes after a street ("SW1A 1AA", "75001 Paris", "DC 20500") are picked up by TAIL.

  // 3. East-Asian addresses: a run of CJK / Hangul with a place marker and a number
  {
    re: String.raw`(?:〒[ \t]?\d{3}-?\d{4}[ \t　]*)?[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}0-9０-９\-－ー‐]+(?:[ 　][\p{sc=Han}\p{sc=Hangul}0-9０-９\-－]+){0,5}`,
    test: (s) => /[0-9０-９]/.test(s) && /[省市区區县縣郡镇鎮乡鄉村路街道巷弄号號都府県町丁番地로길동구군읍면리시]/u.test(s) && s.length >= 5,
    trim: (s) => {
      // stop after the last number (+ its unit), so a sentence after the address isn't linked
      const m = s.match(/^(.*[0-9０-９]+(?:号|號|番地?|丁目|번지|호|층|楼|樓|室|F)?)/u);
      if (m) s = m[1];
      // drop leading words like "我们在" (we're at) / "去" (go to)
      s = s.replace(/^(?:我们|我們|我|你|他|她|大家)?(?:明天|今天|后天|後天)?(?:在|去|到|住在|位于|位於|来|來)/u, "");
      // drop leading Korean/Japanese words that hold no place marker ("내일 서울특별시 …")
      const parts = s.split(/[ 　]+/);
      while (parts.length > 1 && !/[0-9０-９]|[省市区區县縣都府県町丁番로길동구군읍면리시]/u.test(parts[0])) parts.shift();
      return parts.join(" ");
    },
  },
].map((r) => ({ ...r, regex: new RegExp(r.re, (r.flags || "giu") + "d") }));

/** Returns [{start, end, value}] for every address found in text. */
function findAddresses(text) {
  const found = [];
  for (const rule of ADDRESS_RULES) {
    rule.regex.lastIndex = 0;
    for (const m of text.matchAll(rule.regex)) {
      const numEnd = m.indices?.groups?.numEnd;
      if (numEnd && LOWER_WORD_NEXT.test(text.slice(numEnd[0]))) continue; // "Main St, 2 return visits"
      let value = (rule.group ? m[rule.group] : m[0]).trim().replace(/[.;:,]+$/u, "");
      if (rule.trim) value = rule.trim(value);
      if (rule.test && !rule.test(value)) continue;
      if (value.length < 4) continue;
      const offset = m[0].indexOf(value);
      if (offset < 0) continue;
      const valueAt = m.index + offset;
      // The link draws its own 📍, so a typed 📍 marker is swallowed instead of shown twice.
      const pin = m[0].search(/📍|🏠|🏢/u);
      let start = rule.group && pin >= 0 && m.index + pin < valueAt ? m.index + pin : valueAt;
      const before = text.slice(Math.max(0, start - 4), start).match(/(?:📍|🏠|🏢)[ \t]?$/u); // "Next: 📍 25 Main St"
      if (before) start -= before[0].length;
      const end = valueAt + value.length;
      if (!found.some((f) => start < f.end && end > f.start)) found.push({ start, end, value });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
