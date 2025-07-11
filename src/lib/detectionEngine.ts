import { BrowserFingerprinting } from './fingerprinting';
import { WebRTCLeak, WebRTCLeakResult } from './webrtcLeak';
import { LocationMismatch } from './locationMismatch';
import { apiClient } from './apiClient';
import { DetectionResult, DetectionResults } from '../types/detection';

export class DetectionEngine {
  private fingerprinting: BrowserFingerprinting;
  private webrtcLeak: WebRTCLeak;
  private locationMismatch: LocationMismatch;

  constructor() {
    this.fingerprinting = new BrowserFingerprinting();
    this.webrtcLeak = new WebRTCLeak();
    this.locationMismatch = new LocationMismatch();
  }

  async runFullDetection(): Promise<DetectionResult> {
    const startTime = Date.now();
    try {
      const [
        ipAnalysis,
        webrtcResult,
        fingerprintResult,
        locationResult,
        botDetection
      ] = await Promise.all([
        this.runIpAnalysis(),
        this.webrtcLeak.detectLeak(),
        this.fingerprinting.generateFingerprint(),
        this.locationMismatch.checkLocationMismatch(),
        this.runBotDetection()
      ]);

      const results: DetectionResults = {
        ipAnalysis,
        webrtcLeak: webrtcResult as any,
        fingerprint: {
          ...fingerprintResult,
          languages: Array.from(fingerprintResult.languages),
          connection: fingerprintResult.connection === null ? undefined : fingerprintResult.connection
        },
        locationMismatch: locationResult,
        botDetection
      };

      const detectionResult = this.calculateOverallResult(results);
      await this.logDetection(detectionResult, Date.now() - startTime);
      return detectionResult;
    } catch (error) {
      console.error('Detection engine error:', error);
      throw new Error('Detection failed');
    }
  }

  // --- Helper functions for continent/timezone mapping ---
  private timezoneToContinent(timezone: string): string | null {
    if (!timezone) return null;
    if (timezone.startsWith('Africa')) return 'Africa';
    if (timezone.startsWith('America')) return 'North America';
    if (timezone.startsWith('Europe')) return 'Europe';
    if (timezone.startsWith('Asia')) return 'Asia';
    if (timezone.startsWith('Australia') || timezone.startsWith('Pacific')) return 'Oceania';
    if (timezone.startsWith('Antarctica')) return 'Antarctica';
    return null;
  }

  private countryToContinent(countryCode: string): string | null {
    // Comprehensive country code to continent mapping
    const mapping: Record<string, string> = {
      'AF': 'Asia',
      'AX': 'Europe',
      'AL': 'Europe',
      'DZ': 'Africa',
      'AS': 'Oceania',
      'AD': 'Europe',
      'AO': 'Africa',
      'AI': 'North America',
      'AQ': 'Antarctica',
      'AG': 'North America',
      'AR': 'South America',
      'AM': 'Asia',
      'AW': 'North America',
      'AU': 'Oceania',
      'AT': 'Europe',
      'AZ': 'Asia',
      'BS': 'North America',
      'BH': 'Asia',
      'BD': 'Asia',
      'BB': 'North America',
      'BY': 'Europe',
      'BE': 'Europe',
      'BZ': 'North America',
      'BJ': 'Africa',
      'BM': 'North America',
      'BT': 'Asia',
      'BO': 'South America',
      'BQ': 'North America',
      'BA': 'Europe',
      'BW': 'Africa',
      'BV': 'Antarctica',
      'BR': 'South America',
      'IO': 'Asia',
      'BN': 'Asia',
      'BG': 'Europe',
      'BF': 'Africa',
      'BI': 'Africa',
      'CV': 'Africa',
      'KH': 'Asia',
      'CM': 'Africa',
      'CA': 'North America',
      'KY': 'North America',
      'CF': 'Africa',
      'TD': 'Africa',
      'CL': 'South America',
      'CN': 'Asia',
      'CX': 'Asia',
      'CC': 'Asia',
      'CO': 'South America',
      'KM': 'Africa',
      'CG': 'Africa',
      'CD': 'Africa',
      'CK': 'Oceania',
      'CR': 'North America',
      'CI': 'Africa',
      'HR': 'Europe',
      'CU': 'North America',
      'CW': 'North America',
      'CY': 'Asia',
      'CZ': 'Europe',
      'DK': 'Europe',
      'DJ': 'Africa',
      'DM': 'North America',
      'DO': 'North America',
      'EC': 'South America',
      'EG': 'Africa',
      'SV': 'North America',
      'GQ': 'Africa',
      'ER': 'Africa',
      'EE': 'Europe',
      'SZ': 'Africa',
      'ET': 'Africa',
      'FK': 'South America',
      'FO': 'Europe',
      'FJ': 'Oceania',
      'FI': 'Europe',
      'FR': 'Europe',
      'GF': 'South America',
      'PF': 'Oceania',
      'TF': 'Antarctica',
      'GA': 'Africa',
      'GM': 'Africa',
      'GE': 'Asia',
      'DE': 'Europe',
      'GH': 'Africa',
      'GI': 'Europe',
      'GR': 'Europe',
      'GL': 'North America',
      'GD': 'North America',
      'GP': 'North America',
      'GU': 'Oceania',
      'GT': 'North America',
      'GG': 'Europe',
      'GN': 'Africa',
      'GW': 'Africa',
      'GY': 'South America',
      'HT': 'North America',
      'HM': 'Antarctica',
      'VA': 'Europe',
      'HN': 'North America',
      'HK': 'Asia',
      'HU': 'Europe',
      'IS': 'Europe',
      'IN': 'Asia',
      'ID': 'Asia',
      'IR': 'Asia',
      'IQ': 'Asia',
      'IE': 'Europe',
      'IM': 'Europe',
      'IL': 'Asia',
      'IT': 'Europe',
      'JM': 'North America',
      'JP': 'Asia',
      'JE': 'Europe',
      'JO': 'Asia',
      'KZ': 'Asia',
      'KE': 'Africa',
      'KI': 'Oceania',
      'KP': 'Asia',
      'KR': 'Asia',
      'KW': 'Asia',
      'KG': 'Asia',
      'LA': 'Asia',
      'LV': 'Europe',
      'LB': 'Asia',
      'LS': 'Africa',
      'LR': 'Africa',
      'LY': 'Africa',
      'LI': 'Europe',
      'LT': 'Europe',
      'LU': 'Europe',
      'MO': 'Asia',
      'MG': 'Africa',
      'MW': 'Africa',
      'MY': 'Asia',
      'MV': 'Asia',
      'ML': 'Africa',
      'MT': 'Europe',
      'MH': 'Oceania',
      'MQ': 'North America',
      'MR': 'Africa',
      'MU': 'Africa',
      'YT': 'Africa',
      'MX': 'North America',
      'FM': 'Oceania',
      'MD': 'Europe',
      'MC': 'Europe',
      'MN': 'Asia',
      'ME': 'Europe',
      'MS': 'North America',
      'MA': 'Africa',
      'MZ': 'Africa',
      'MM': 'Asia',
      'NA': 'Africa',
      'NR': 'Oceania',
      'NP': 'Asia',
      'NL': 'Europe',
      'NC': 'Oceania',
      'NZ': 'Oceania',
      'NI': 'North America',
      'NE': 'Africa',
      'NG': 'Africa',
      'NU': 'Oceania',
      'NF': 'Oceania',
      'MK': 'Europe',
      'MP': 'Oceania',
      'NO': 'Europe',
      'OM': 'Asia',
      'PK': 'Asia',
      'PW': 'Oceania',
      'PS': 'Asia',
      'PA': 'North America',
      'PG': 'Oceania',
      'PY': 'South America',
      'PE': 'South America',
      'PH': 'Asia',
      'PN': 'Oceania',
      'PL': 'Europe',
      'PT': 'Europe',
      'PR': 'North America',
      'QA': 'Asia',
      'RE': 'Africa',
      'RO': 'Europe',
      'RU': 'Europe',
      'RW': 'Africa',
      'BL': 'North America',
      'SH': 'Africa',
      'KN': 'North America',
      'LC': 'North America',
      'MF': 'North America',
      'PM': 'North America',
      'VC': 'North America',
      'WS': 'Oceania',
      'SM': 'Europe',
      'ST': 'Africa',
      'SA': 'Asia',
      'SN': 'Africa',
      'RS': 'Europe',
      'SC': 'Africa',
      'SL': 'Africa',
      'SG': 'Asia',
      'SX': 'North America',
      'SK': 'Europe',
      'SI': 'Europe',
      'SB': 'Oceania',
      'SO': 'Africa',
      'ZA': 'Africa',
      'GS': 'Antarctica',
      'SS': 'Africa',
      'ES': 'Europe',
      'LK': 'Asia',
      'SD': 'Africa',
      'SR': 'South America',
      'SJ': 'Europe',
      'SE': 'Europe',
      'CH': 'Europe',
      'SY': 'Asia',
      'TW': 'Asia',
      'TJ': 'Asia',
      'TZ': 'Africa',
      'TH': 'Asia',
      'TL': 'Asia',
      'TG': 'Africa',
      'TK': 'Oceania',
      'TO': 'Oceania',
      'TT': 'North America',
      'TN': 'Africa',
      'TR': 'Europe',
      'TM': 'Asia',
      'TC': 'North America',
      'TV': 'Oceania',
      'UG': 'Africa',
      'UA': 'Europe',
      'AE': 'Asia',
      'GB': 'Europe',
      'US': 'North America',
      'UM': 'Oceania',
      'UY': 'South America',
      'UZ': 'Asia',
      'VU': 'Oceania',
      'VE': 'South America',
      'VN': 'Asia',
      'VG': 'North America',
      'VI': 'North America',
      'WF': 'Oceania',
      'EH': 'Africa',
      'YE': 'Asia',
      'ZM': 'Africa',
      'ZW': 'Africa'
    };
    return mapping[countryCode.toUpperCase()] || null;
  }

  private getTimezoneFromCountryCode(countryCode: string): string {
    const countryTimezoneMap: Record<string, string> = {
      "AF": "Asia/Kabul",
      "AL": "Europe/Tirane",
      "DZ": "Africa/Algiers",
      "AS": "Pacific/Pago_Pago",
      "AD": "Europe/Andorra",
      "AO": "Africa/Luanda",
      "AI": "America/Anguilla",
      "AQ": "Antarctica/Palmer",
      "AG": "America/Antigua",
      "AR": "America/Argentina/Buenos_Aires",
      "AM": "Asia/Yerevan",
      "AW": "America/Aruba",
      "AU": "Australia/Sydney",
      "AT": "Europe/Vienna",
      "AZ": "Asia/Baku",
      "BS": "America/Nassau",
      "BH": "Asia/Bahrain",
      "BD": "Asia/Dhaka",
      "BB": "America/Barbados",
      "BY": "Europe/Minsk",
      "BE": "Europe/Brussels",
      "BZ": "America/Belize",
      "BJ": "Africa/Porto-Novo",
      "BM": "Atlantic/Bermuda",
      "BT": "Asia/Thimphu",
      "BO": "America/La_Paz",
      "BQ": "America/Kralendijk",
      "BA": "Europe/Sarajevo",
      "BW": "Africa/Gaborone",
      "BV": "Antarctica/Bouvet",
      "BR": "America/Sao_Paulo",
      "IO": "Indian/Chagos",
      "BN": "Asia/Brunei",
      "BG": "Europe/Sofia",
      "BF": "Africa/Ouagadougou",
      "BI": "Africa/Bujumbura",
      "KH": "Asia/Phnom_Penh",
      "CM": "Africa/Douala",
      "CA": "America/Toronto",
      "CV": "Atlantic/Cape_Verde",
      "KY": "America/Cayman",
      "CF": "Africa/Bangui",
      "TD": "Africa/Ndjamena",
      "CL": "America/Santiago",
      "CN": "Asia/Shanghai",
      "CX": "Indian/Christmas",
      "CC": "Indian/Cocos",
      "CO": "America/Bogota",
      "KM": "Indian/Comoro",
      "CG": "Africa/Brazzaville",
      "CD": "Africa/Kinshasa",
      "CK": "Pacific/Rarotonga",
      "CR": "America/Costa_Rica",
      "CI": "Africa/Abidjan",
      "HR": "Europe/Zagreb",
      "CU": "America/Havana",
      "CW": "America/Curacao",
      "CY": "Asia/Nicosia",
      "CZ": "Europe/Prague",
      "DK": "Europe/Copenhagen",
      "DJ": "Africa/Djibouti",
      "DM": "America/Dominica",
      "DO": "America/Santo_Domingo",
      "EC": "America/Guayaquil",
      "EG": "Africa/Cairo",
      "SV": "America/El_Salvador",
      "GQ": "Africa/Malabo",
      "ER": "Africa/Asmara",
      "EE": "Europe/Tallinn",
      "SZ": "Africa/Mbabane",
      "ET": "Africa/Addis_Ababa",
      "FK": "Atlantic/Stanley",
      "FO": "Atlantic/Faroe",
      "FJ": "Pacific/Fiji",
      "FI": "Europe/Helsinki",
      "FR": "Europe/Paris",
      "GF": "America/Cayenne",
      "PF": "Pacific/Tahiti",
      "TF": "Indian/Kerguelen",
      "GA": "Africa/Libreville",
      "GM": "Africa/Banjul",
      "GE": "Asia/Tbilisi",
      "DE": "Europe/Berlin",
      "GH": "Africa/Accra",
      "GI": "Europe/Gibraltar",
      "GR": "Europe/Athens",
      "GL": "America/Godthab",
      "GD": "America/Grenada",
      "GP": "America/Guadeloupe",
      "GU": "Pacific/Guam",
      "GT": "America/Guatemala",
      "GG": "Europe/Guernsey",
      "GN": "Africa/Conakry",
      "GW": "Africa/Bissau",
      "GY": "America/Guyana",
      "HT": "America/Port-au-Prince",
      "HM": "Antarctica/McMurdo",
      "VA": "Europe/Vatican",
      "HN": "America/Tegucigalpa",
      "HK": "Asia/Hong_Kong",
      "HU": "Europe/Budapest",
      "IS": "Atlantic/Reykjavik",
      "IN": "Asia/Kolkata",
      "ID": "Asia/Jakarta",
      "IR": "Asia/Tehran",
      "IQ": "Asia/Baghdad",
      "IE": "Europe/Dublin",
      "IM": "Europe/Isle_of_Man",
      "IL": "Asia/Jerusalem",
      "IT": "Europe/Rome",
      "JM": "America/Jamaica",
      "JP": "Asia/Tokyo",
      "JE": "Europe/Jersey",
      "JO": "Asia/Amman",
      "KZ": "Asia/Almaty",
      "KE": "Africa/Nairobi",
      "KI": "Pacific/Tarawa",
      "KP": "Asia/Pyongyang",
      "KR": "Asia/Seoul",
      "KW": "Asia/Kuwait",
      "KG": "Asia/Bishkek",
      "LA": "Asia/Vientiane",
      "LV": "Europe/Riga",
      "LB": "Asia/Beirut",
      "LS": "Africa/Maseru",
      "LR": "Africa/Monrovia",
      "LY": "Africa/Tripoli",
      "LI": "Europe/Vaduz",
      "LT": "Europe/Vilnius",
      "LU": "Europe/Luxembourg",
      "MO": "Asia/Macau",
      "MG": "Indian/Antananarivo",
      "MW": "Africa/Blantyre",
      "MY": "Asia/Kuala_Lumpur",
      "MV": "Indian/Maldives",
      "ML": "Africa/Bamako",
      "MT": "Europe/Malta",
      "MH": "Pacific/Majuro",
      "MQ": "America/Martinique",
      "MR": "Africa/Nouakchott",
      "MU": "Indian/Mauritius",
      "YT": "Indian/Mayotte",
      "MX": "America/Mexico_City",
      "FM": "Pacific/Chuuk",
      "MD": "Europe/Chisinau",
      "MC": "Europe/Monaco",
      "MN": "Asia/Ulaanbaatar",
      "ME": "Europe/Podgorica",
      "MS": "America/Montserrat",
      "MA": "Africa/Casablanca",
      "MZ": "Africa/Maputo",
      "MM": "Asia/Yangon",
      "NA": "Africa/Windhoek",
      "NR": "Pacific/Nauru",
      "NP": "Asia/Kathmandu",
      "NL": "Europe/Amsterdam",
      "NC": "Pacific/Noumea",
      "NZ": "Pacific/Auckland",
      "NI": "America/Managua",
      "NE": "Africa/Niamey",
      "NG": "Africa/Lagos",
      "NU": "Pacific/Niue",
      "NF": "Pacific/Norfolk",
      "MK": "Europe/Skopje",
      "MP": "Pacific/Saipan",
      "NO": "Europe/Oslo",
      "OM": "Asia/Muscat",
      "PK": "Asia/Karachi",
      "PW": "Pacific/Palau",
      "PS": "Asia/Gaza",
      "PA": "America/Panama",
      "PG": "Pacific/Port_Moresby",
      "PY": "America/Asuncion",
      "PE": "America/Lima",
      "PH": "Asia/Manila",
      "PN": "Pacific/Pitcairn",
      "PL": "Europe/Warsaw",
      "PT": "Europe/Lisbon",
      "PR": "America/Puerto_Rico",
      "QA": "Asia/Qatar",
      "RE": "Indian/Reunion",
      "RO": "Europe/Bucharest",
      "RU": "Europe/Moscow",
      "RW": "Africa/Kigali",
      "BL": "America/St_Barthelemy",
      "SH": "Atlantic/St_Helena",
      "KN": "America/St_Kitts",
      "LC": "America/St_Lucia",
      "MF": "America/Marigot",
      "PM": "America/Miquelon",
      "VC": "America/St_Vincent",
      "WS": "Pacific/Apia",
      "SM": "Europe/San_Marino",
      "ST": "Africa/Sao_Tome",
      "SA": "Asia/Riyadh",
      "SN": "Africa/Dakar",
      "RS": "Europe/Belgrade",
      "SC": "Indian/Mahe",
      "SL": "Africa/Freetown",
      "SG": "Asia/Singapore",
      "SX": "America/Lower_Princes",
      "SK": "Europe/Bratislava",
      "SI": "Europe/Ljubljana",
      "SB": "Pacific/Guadalcanal",
      "SO": "Africa/Mogadishu",
      "ZA": "Africa/Johannesburg",
      "GS": "Atlantic/South_Georgia",
      "SS": "Africa/Juba",
      "ES": "Europe/Madrid",
      "LK": "Asia/Colombo",
      "SD": "Africa/Khartoum",
      "SR": "America/Paramaribo",
      "SJ": "Arctic/Longyearbyen",
      "SE": "Europe/Stockholm",
      "CH": "Europe/Zurich",
      "SY": "Asia/Damascus",
      "TW": "Asia/Taipei",
      "TJ": "Asia/Dushanbe",
      "TZ": "Africa/Dar_es_Salaam",
      "TH": "Asia/Bangkok",
      "TL": "Asia/Dili",
      "TG": "Africa/Lome",
      "TK": "Pacific/Fakaofo",
      "TO": "Pacific/Tongatapu",
      "TT": "America/Port_of_Spain",
      "TN": "Africa/Tunis",
      "TR": "Europe/Istanbul",
      "TM": "Asia/Ashgabat",
      "TC": "America/Grand_Turk",
      "TV": "Pacific/Funafuti",
      "UG": "Africa/Kampala",
      "UA": "Europe/Kiev",
      "AE": "Asia/Dubai",
      "GB": "Europe/London",
      "US": "America/New_York",
      "UM": "Pacific/Johnston",
      "UY": "America/Montevideo",
      "UZ": "Asia/Tashkent",
      "VU": "Pacific/Efate",
      "VE": "America/Caracas",
      "VN": "Asia/Ho_Chi_Minh",
      "VG": "America/Tortola",
      "VI": "America/St_Thomas",
      "WF": "Pacific/Wallis",
      "EH": "Africa/El_Aaiun",
      "YE": "Asia/Aden",
      "ZM": "Africa/Lusaka",
      "ZW": "Africa/Harare"
    };
    return countryTimezoneMap[countryCode.toUpperCase()] || 'Unknown';
  }

  // --- Main detection scoring logic ---
  private calculateOverallResult(results: DetectionResults): DetectionResult {
    let confidenceScore = 0;
    const detectedTypes: string[] = [];
    const riskFactors: string[] = [];

    const scoringConfig: { [key: string]: { weight: number; label: string; risk: string } } = {
      isDatacenter: { weight: 40, label: 'Datacenter IP', risk: 'IP hosted in datacenter' },
      isHosting: { weight: 35, label: 'Hosting Provider', risk: 'Hosting provider IP' },
      isTor: { weight: 50, label: 'Tor Exit Node', risk: 'Tor network detected' },
      vpnDetected: { weight: 60, label: 'VPN Server Detected', risk: 'IP identified as VPN server by WhatIsMyIpAddress' },
      blacklisted: { weight: 40, label: 'Blacklisted IP', risk: 'IP listed on blacklist by WhatIsMyIpAddress' },
      webrtcLeak: { weight: 10, label: 'WebRTC Leak', risk: 'Local IP leak detected' },
      fingerprintTimezoneMismatch: { weight: 50, label: 'Fingerprint Timezone Mismatch', risk: 'Mismatch between browser fingerprint timezone and IP location timezone' },
      fingerprintContinentMismatch: { weight: 50, label: 'Fingerprint Continent Mismatch', risk: 'Mismatch between browser fingerprint continent and IP location continent' },
      suspiciousFingerprint: { weight: 0, label: 'Suspicious Fingerprint', risk: 'Abnormal browser fingerprint' }, // weight added below conditionally
      locationMismatch: { weight: 50, label: 'Location Mismatch', risk: 'Location mismatch detected' },
      botDetection: { weight: 45, label: 'Bot/Automation', risk: 'Automated browser detected' }
    };

    // Helper function to check if IP is private
    const isPrivateIp = (ip: string): boolean => {
      return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
    };

    // IP Analysis scoring
    if (results.ipAnalysis) {
      for (const key of ['isDatacenter', 'isHosting', 'isTor', 'vpnDetected', 'blacklisted']) {
        if (results.ipAnalysis[key as keyof typeof results.ipAnalysis]) {
          const config = scoringConfig[key];
          confidenceScore += config.weight;
          detectedTypes.push(config.label);
          riskFactors.push(config.risk);
        }
      }
      confidenceScore += (typeof results.ipAnalysis.riskScore === 'number' ? results.ipAnalysis.riskScore : 0) * 0.5;
    }

    // WebRTC Leak scoring
    if (results.webrtcLeak?.hasLeak) {
      const config = scoringConfig.webrtcLeak;
      confidenceScore += config.weight;
      detectedTypes.push(config.label);
      riskFactors.push(config.risk);

      // Additional scoring based on detailed WebRTC data
      if (results.webrtcLeak.candidateTypes) {
        const candidateTypes = Array.from(results.webrtcLeak.candidateTypes);
        if (candidateTypes.includes('relay')) {
          confidenceScore += 10; // Relay candidates indicate use of TURN servers, possibly VPN or proxy
          detectedTypes.push('WebRTC Relay Candidate Detected');
          riskFactors.push('Presence of relay ICE candidates indicates possible VPN or proxy usage');
        }
        if (candidateTypes.includes('srflx')) {
          confidenceScore += 5; // Server reflexive candidates indicate NAT traversal
          detectedTypes.push('WebRTC Server Reflexive Candidate Detected');
          riskFactors.push('Presence of server reflexive ICE candidates indicates NAT traversal');
        }
      }
    }

    // Browser Fingerprint scoring
    if (results.fingerprint) {
      const fingerprintTimezone = results.fingerprint.timezone;
      let ipTimezone = results.ipAnalysis?.timezone;

      if ((!ipTimezone || ipTimezone === 'Unknown') && results.ipAnalysis?.country) {
        // Try to extract country code more robustly
        const countryString = results.ipAnalysis.country.trim();
        let countryCode = '';
        const countryCodeMatch = countryString.match(/\b([A-Z]{2})\b/);
        if (countryCodeMatch) {
          countryCode = countryCodeMatch[1];
        } else if (countryString.length === 2) {
          countryCode = countryString;
        }
        if (countryCode) {
          ipTimezone = this.getTimezoneFromCountryCode(countryCode);
        }
      }

      let fingerprintSpoofed = false;

      if (
        fingerprintTimezone !== ipTimezone &&
        ipTimezone !== 'Unknown' &&
        fingerprintTimezone !== 'Unknown'
      ) {
        console.log('Fingerprint timezone mismatch detected:', {
          fingerprintTimezone,
          ipTimezone,
          ipCountry: results.ipAnalysis?.country,
          extractedCountryCode: (() => {
            if (!results.ipAnalysis?.country) return '';
            const countryString = results.ipAnalysis.country.trim();
            const countryCodeMatch = countryString.match(/\b([A-Z]{2})\b/);
            if (countryCodeMatch) {
              return countryCodeMatch[1];
            } else if (countryString.length === 2) {
              return countryString;
            }
            return '';
          })()
        });
        fingerprintSpoofed = true;
        const config = {
          weight: 50,
          label: 'Fingerprint Timezone Mismatch',
          risk: 'Mismatch between browser fingerprint timezone and IP location timezone'
        };
        confidenceScore += config.weight;
        detectedTypes.push(config.label);
        riskFactors.push(config.risk);
      }

      const fingerprintContinent = this.timezoneToContinent(fingerprintTimezone);
      const ipCountryCode = (() => {
        if (!results.ipAnalysis?.country) return '';
        const countryString = results.ipAnalysis.country.trim();
        const countryCodeMatch = countryString.match(/\b([A-Z]{2})\b/);
        if (countryCodeMatch) {
          return countryCodeMatch[1];
        } else if (countryString.length === 2) {
          return countryString;
        }
        return '';
      })();
      const ipContinent = this.countryToContinent(ipCountryCode);

      if (
        fingerprintContinent &&
        ipContinent &&
        fingerprintContinent !== ipContinent
      ) {
        fingerprintSpoofed = true;
        const config = {
          weight: 50,
          label: 'Fingerprint Continent Mismatch',
          risk: 'Mismatch between browser fingerprint continent and IP location continent'
        };
        confidenceScore += config.weight;
        detectedTypes.push(config.label);
        riskFactors.push(config.risk);
      }

      confidenceScore += (typeof results.fingerprint.suspicionScore === 'number' ? results.fingerprint.suspicionScore : 0) * 0.5;
      if ((typeof results.fingerprint.suspicionScore === 'number' ? results.fingerprint.suspicionScore : 0) > 60) {
        fingerprintSpoofed = true;
      }

      if (fingerprintSpoofed) {
        const config = {
          weight: 10,
          label: 'Fingerprint Spoofed',
          risk: 'Browser fingerprint data appears spoofed or inconsistent'
        };
        confidenceScore += config.weight;
        detectedTypes.push(config.label);
        riskFactors.push(config.risk);
      }
    }

    // Location Mismatch scoring
    if (
      results.locationMismatch &&
      results.locationMismatch.hasMismatch === true
    ) {
      const config = scoringConfig.locationMismatch;
      confidenceScore += config.weight;
      detectedTypes.push(config.label);
      riskFactors.push((results.locationMismatch as any).message || config.risk);
    }

    // Bot Detection scoring
    if (results.botDetection?.isBot) {
      const config = scoringConfig.botDetection;
      confidenceScore += config.weight;
      detectedTypes.push(config.label);
      riskFactors.push(config.risk);
    }

    // Cap confidence score at 100
    confidenceScore = Math.min(100, Math.round(confidenceScore));

    // Force VPN detection if critical flags are true
    const fingerprintMismatch = (() => {
      if (!results.fingerprint || !results.ipAnalysis) return false;
      const fingerprintTimezone = results.fingerprint.timezone;
      const ipTimezone = results.ipAnalysis.timezone;
      const fingerprintContinent = this.timezoneToContinent(fingerprintTimezone);
      const ipCountryCode = (results.ipAnalysis.country?.split(' ').pop() || '');
      const ipContinent = this.countryToContinent(ipCountryCode);
      if (fingerprintTimezone && ipTimezone && fingerprintTimezone !== ipTimezone) {
        return true;
      }
      if (fingerprintContinent && ipContinent && fingerprintContinent !== ipContinent) {
        return true;
      }
      return false;
    })();

    const isVpnDetected = confidenceScore >= 50;

    console.log('Critical Flags:', {
      webrtcLeak: results.webrtcLeak?.hasLeak,
      locationMismatch: results.locationMismatch?.hasMismatch,
      botDetection: results.botDetection?.isBot,
      fingerprintMismatch
    });

    return {
      isVpnDetected,
      confidenceScore,
      detectedTypes,
      riskFactors,
      results,
      timestamp: new Date().toISOString()
    };
  }

  private async analyzeWithWhatIsMyIpAddress(ip: string) {
    try {
      const ipInfoUrl = `https://whatismyipaddress.com/ip/${ip}`;
      const blacklistUrl = `https://whatismyipaddress.com/blacklist-check`;

      // Fetch IP info page
      const ipInfoResponse = await fetch(ipInfoUrl, { method: 'GET' });
      if (!ipInfoResponse.ok) throw new Error('Failed to fetch IP info page');
      const ipInfoHtml = await ipInfoResponse.text();

      // Fetch blacklist check page to get form and cookies
      const blacklistPageResponse = await fetch(blacklistUrl, { method: 'GET' });
      if (!blacklistPageResponse.ok) throw new Error('Failed to fetch blacklist check page');
      const blacklistPageHtml = await blacklistPageResponse.text();

      // Extract any necessary cookies or tokens from blacklistPageHtml if needed (not implemented here)

      // Submit IP via POST or GET form simulation (assuming POST with form data 'ip')
      const formData = new URLSearchParams();
      formData.append('ip', ip);

      const blacklistResponse = await fetch(blacklistUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Include cookies or tokens if required
        },
        body: formData.toString()
      });

      if (!blacklistResponse.ok) throw new Error('Failed to submit IP for blacklist check');
      const blacklistHtml = await blacklistResponse.text();

      // Parse IP info HTML to extract VPN server detection info
      const vpnDetected = /VPN Server: Yes/i.test(ipInfoHtml) || /VPN: Yes/i.test(ipInfoHtml);

      // Parse blacklist HTML to extract blacklist status by checking for cancel marks or "IP Listed"
      const blacklisted = /IP Listed: Bad IP Listed/i.test(blacklistHtml) || /cancel/i.test(blacklistHtml);

      return {
        publicIp: ip,
        vpnDetected,
        blacklisted
      };
    } catch (error) {
      console.error('WhatIsMyIpAddress analysis failed:', error);
      return {
        publicIp: ip,
        vpnDetected: false,
        blacklisted: false
      };
    }
  }

  private async runIpAnalysis() {
    try {
      // Try multiple free IP analysis services
      const services = [
        this.analyzeWithIpApi(),
        this.analyzeWithIpify(),
        this.analyzeWithIpGeolocation(),
        this.analyzeWithIpInfo()
      ];

      // Use Promise.allSettled to try all services
      const results = await Promise.allSettled(services);

      // Collect all fulfilled results
      const fulfilled = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);

      // Merge results: prefer first non-Unknown value for each field
      const merged: any = {};
      const fields = [
        'publicIp', 'country', 'city', 'region', 'hostname', 'isp', 'organization',
        'asn', 'asnOrg', 'isDatacenter', 'isHosting', 'isTor', 'isProxy', 'riskScore',
        'latitude', 'longitude', 'timezone', 'connectionType', 'sharedConnection',
        'dynamicConnection', 'securityScanner', 'trustedNetwork', 'frequentAbuser',
        'highRiskAttacks', 'vpnDetected', 'blacklisted'
      ];
      for (const field of fields) {
        merged[field] = fulfilled.map(r => r[field]).find(v => v !== undefined && v !== null && v !== 'Unknown');
      }

      // If still missing publicIp, fallback to ipify
      if (!merged.publicIp) {
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            if (ipData.ip) merged.publicIp = ipData.ip;
          }
        } catch {}
      }

      // If still missing, fill with 'Unknown'
      for (const field of fields) {
        if (merged[field] === undefined) merged[field] = 'Unknown';
      }

      // Enrich with WhatIsMyIpAddress data if possible
      if (merged.publicIp && merged.publicIp !== 'Unknown') {
        const whatIsMyIpData = await this.analyzeWithWhatIsMyIpAddress(merged.publicIp);
        merged.vpnDetected = whatIsMyIpData.vpnDetected;
        merged.blacklisted = whatIsMyIpData.blacklisted;
      }

      return merged;
    } catch (error) {
      console.error('IP analysis failed:', error);
      return {
        publicIp: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        hostname: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown',
        asn: null,
        asnOrg: 'Unknown',
        isDatacenter: false,
        isHosting: false,
        isTor: false,
        isProxy: false,
        riskScore: 0,
        latitude: null,
        longitude: null,
        timezone: 'Unknown',
        connectionType: 'Unknown',
        sharedConnection: 'Unknown',
        dynamicConnection: 'Unknown',
        securityScanner: 'No',
        trustedNetwork: 'Unknown',
        frequentAbuser: 'Unknown',
        highRiskAttacks: 'Unknown',
        vpnDetected: false,
        blacklisted: false
      };
    }
  }

  private async analyzeWithIpInfo() {
    try {
      const token = ''; // Add your ipinfo.io token here if available
      const url = token ? `https://ipinfo.io/json?token=${token}` : 'https://ipinfo.io/json';
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const [lat, lon] = data.loc ? data.loc.split(',').map(Number) : [null, null];
      const isDatacenter = this.isDatacenterProvider(data.org || '', data.org || '');
      const isHosting = this.isHostingProvider(data.org || '', data.org || '');
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      // Additional fallback for timezone if missing or unknown
      let timezone = data.timezone || 'Unknown';
      if (timezone === 'Unknown' && data.countryCode) {
        timezone = this.getTimezoneFromCountryCode(data.countryCode);
      }

      return {
        publicIp: data.ip || 'Unknown',
        country: data.country_name || data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        hostname: data.hostname || 'Unknown',
        isp: data.org || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.asn ? parseInt(data.asn.replace('AS', '')) : null,
        asnOrg: data.org || 'Unknown',
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: lat,
        longitude: lon,
        timezone,
        connectionType: 'Unknown',
        sharedConnection: 'Unknown',
        dynamicConnection: 'Unknown',
        securityScanner: 'No',
        trustedNetwork: 'Unknown',
        frequentAbuser: 'Unknown',
        highRiskAttacks: 'Unknown',
        vpnDetected: false,
        blacklisted: false
      };
    } catch (error) {
      console.error('IpInfo service failed:', error);
      throw error;
    }
  }

    private async analyzeWithIpApi() {
    try {
      const response = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'fail') {
        throw new Error(data.message || 'API request failed');
      }

      const isDatacenter = this.isDatacenterProvider(data.isp, data.org) || data.hosting;
      const isHosting = this.isHostingProvider(data.isp, data.org) || data.hosting;
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      return {
        publicIp: data.query || 'Unknown',
        country: data.country && data.countryCode ? `${data.country} ${data.countryCode}` : 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        hostname: data.query || 'Unknown',
        isp: data.isp || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.as ? parseInt(data.as.split(' ')[0].replace('AS', '')) : null,
        asnOrg: data.org || 'Unknown',
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: data.proxy || riskScore > 70,
        riskScore,
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || 'Unknown',
        connectionType: this.getConnectionType(data),
        sharedConnection: this.getSharedConnection(data),
        dynamicConnection: this.getDynamicConnection(data),
        securityScanner: this.getSecurityScanner(data),
        trustedNetwork: this.getTrustedNetwork(data),
        frequentAbuser: 'Upgrade your plan for better data and blocklists.',
        highRiskAttacks: 'Upgrade your plan for better data and blocklists.'
      };
    } catch (error) {
      console.error('IP-API service failed:', error);
      throw error;
    }
  }

  private async analyzeWithIpify() {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000)
      });
      
      if (!ipResponse.ok) {
        throw new Error('Failed to get IP');
      }
      
      const ipData = await ipResponse.json();
      
      // Get additional info from ipapi.co
      const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!geoResponse.ok) {
        throw new Error('Failed to get geo data');
      }
      
      const geoData = await geoResponse.json();
      
      const isDatacenter = this.isDatacenterProvider(geoData.org, geoData.org);
      const isHosting = this.isHostingProvider(geoData.org, geoData.org);
      const riskScore = this.calculateRiskScore(geoData, isDatacenter, isHosting);

      // Additional fallback for timezone if missing or unknown
      let timezone = geoData.time_zone?.name || geoData.time_zone || 'Unknown';
      if (timezone === 'Unknown' && geoData.country_code2) {
        timezone = this.getTimezoneFromCountryCode(geoData.country_code2);
      }

      return {
        publicIp: ipData.ip,
        country: geoData.country_name,
        city: geoData.city,
        isp: geoData.org,
        asn: geoData.asn ? parseInt(geoData.asn.replace('AS', '')) : null,
        asnOrg: geoData.org,
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        timezone
      };
    } catch (error) {
      console.error('Ipify service failed:', error);
      throw error;
    }
  }

  private async analyzeWithIpGeolocation() {
    try {
      // Removed invalid API key "free" to test if service works without key
      const response = await fetch('https://api.ipgeolocation.io/ipgeo', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const isDatacenter = this.isDatacenterProvider(data.isp, data.organization);
      const isHosting = this.isHostingProvider(data.isp, data.organization);
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      let timezone = data.time_zone?.name || data.time_zone || 'Unknown';
      if (timezone === 'Unknown' && data.country_code2) {
        timezone = this.getTimezoneFromCountryCode(data.country_code2);
      }

      return {
        publicIp: data.ip,
        country: data.country_name,
        city: data.city,
        isp: data.isp,
        asn: data.asn ? parseInt(data.asn.replace('AS', '')) : null,
        asnOrg: data.organization,
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timezone
      };
    } catch (error) {
      console.error('IPGeolocation service failed:', error);
      throw error;
    }
  }

  private isDatacenterProvider(isp: string, org: string): boolean {
    const datacenterKeywords = [
      'amazon', 'aws', 'google', 'microsoft', 'azure', 'digitalocean', 'linode',
      'vultr', 'ovh', 'hetzner', 'cloudflare', 'fastly', 'rackspace', 'softlayer',
      'datacenter', 'hosting', 'server', 'cloud', 'vps', 'dedicated'
    ];
    
    const combined = `${isp} ${org}`.toLowerCase();
    return datacenterKeywords.some(keyword => combined.includes(keyword));
  }

  private isHostingProvider(isp: string, org: string): boolean {
    const hostingKeywords = [
      'hosting', 'host', 'server', 'datacenter', 'data center', 'colocation',
      'colo', 'dedicated', 'vps', 'virtual private', 'managed'
    ];
    
    const combined = `${isp} ${org}`.toLowerCase();
    return hostingKeywords.some(keyword => combined.includes(keyword));
  }

  private calculateRiskScore(data: unknown, isDatacenter: boolean, isHosting: boolean): number {
    let score = 0;
    
    if (isDatacenter) score += 40;
    if (isHosting) score += 30;
    
    // Add more risk factors based on available data
    const dataObj = data as Record<string, unknown>;
    
    // Check for suspicious ASN patterns
    if (dataObj.asn && typeof dataObj.asn === 'string') {
      const asnNumber = parseInt(dataObj.asn.replace('AS', ''));
      // Some ASNs are commonly associated with VPS/hosting
      const suspiciousAsns = [16509, 14061, 16276, 13335]; // AWS, DigitalOcean, OVH, Cloudflare
      if (suspiciousAsns.includes(asnNumber)) {
        score += 20;
      }
    }
    
    return Math.min(100, score);
  }

  private getConnectionType(data: Record<string, unknown>): string {
    // Analyze connection type based on ISP and organization
    const isp = (data.isp as string)?.toLowerCase() || '';
    const org = (data.org as string)?.toLowerCase() || '';
    
    if (isp.includes('mobile') || org.includes('mobile')) return 'Mobile';
    if (isp.includes('fiber') || org.includes('fiber')) return 'Fiber';
    if (isp.includes('cable') || org.includes('cable')) return 'Cable';
    if (isp.includes('dsl') || org.includes('dsl')) return 'DSL';
    if (isp.includes('satellite') || org.includes('satellite')) return 'Satellite';
    
    return 'Unknown';
  }

  private getSharedConnection(data: Record<string, unknown>): string {
    // Determine if connection is shared based on ISP type
    const isp = (data.isp as string)?.toLowerCase() || '';
    const org = (data.org as string)?.toLowerCase() || '';
    
    if (isp.includes('university') || isp.includes('school') || org.includes('university')) return 'Yes';
    if (isp.includes('corporate') || isp.includes('business') || org.includes('corporate')) return 'Likely';
    if (isp.includes('residential') || isp.includes('home')) return 'No';
    
    return 'Unknown';
  }

  private getDynamicConnection(data: Record<string, unknown>): string {
    // Most residential connections are dynamic
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (isp.includes('residential') || isp.includes('home') || isp.includes('broadband')) return 'Yes';
    if (isp.includes('business') || isp.includes('corporate') || isp.includes('dedicated')) return 'No';
    
    return 'Likely';
  }

  private getSecurityScanner(data: Record<string, unknown>): string {
    // Check for security scanning indicators
    const org = (data.org as string)?.toLowerCase() || '';
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (org.includes('security') || org.includes('scanner') || isp.includes('security')) return 'Detected';
    if (org.includes('research') || org.includes('university')) return 'Possible';
    
    return 'No';
  }

  private getTrustedNetwork(data: Record<string, unknown>): string {
    // Determine if network is trusted
    const org = (data.org as string)?.toLowerCase() || '';
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (org.includes('government') || org.includes('military') || org.includes('bank')) return 'Yes';
    if (org.includes('university') || org.includes('hospital') || org.includes('school')) return 'Yes';
    if (isp.includes('government') || isp.includes('military')) return 'Yes';
    
    return 'Unknown';
  }

  private async runBotDetection() {
    const checks = await Promise.all([
      this.checkHeadlessBrowser(),
      this.checkAutomationFramework(),
      this.checkWebDriverPresence(),
      this.checkPhantomJS(),
      this.checkSelenium()
    ]);

    const botScore = checks.filter(Boolean).length * 20;
    
    return {
      isBot: botScore >= 60,
      headlessDetected: checks[0],
      automationDetected: checks[1] || checks[2] || checks[3] || checks[4],
      botScore,
      detectedFrameworks: this.getDetectedFrameworks(checks)
    };
  }

  private async checkHeadlessBrowser(): Promise<boolean> {
    // Check for headless browser indicators
    const checks = [
      () => navigator.webdriver === true,
      () => !navigator.plugins || navigator.plugins.length === 0,
      () => !navigator.languages || navigator.languages.length === 0,
      () => navigator.userAgent.includes('HeadlessChrome'),
      () => window.outerHeight === 0,
      () => window.outerWidth === 0,
      () => !(window as any).chrome?.runtime,
      () => typeof navigator.permissions?.query !== 'function'
    ];

    return checks.filter(check => {
      try {
        return check();
      } catch {
        return false;
      }
    }).length >= 3;
  }

  private async checkAutomationFramework(): Promise<boolean> {
    const windowChecks = [
      'phantom',
      'callPhantom',
      '__nightmare',
      '_selenium',
      'webdriver',
      '__webdriver_script_fn',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped'
    ];

    return windowChecks.some(prop => (window as unknown as Record<string, unknown>)[prop] !== undefined);
  }

  private async checkWebDriverPresence(): Promise<boolean> {
    return navigator.webdriver === true || 
           (window as unknown as Record<string, unknown>).webdriver === true ||
           (window as unknown as Record<string, unknown>).__webdriver_script_fn !== undefined;
  }

  private async checkPhantomJS(): Promise<boolean> {
    return (window as unknown as Record<string, unknown>).callPhantom !== undefined ||
           (window as unknown as Record<string, unknown>)._phantom !== undefined ||
           navigator.userAgent.includes('PhantomJS');
  }

  private async checkSelenium(): Promise<boolean> {
    return (window as unknown as Record<string, unknown>).__selenium_evaluate !== undefined ||
           document.documentElement.getAttribute('selenium') !== null ||
           document.documentElement.getAttribute('webdriver') !== null;
  }

  private getDetectedFrameworks(checks: boolean[]): string[] {
    const frameworks = ['Headless', 'Automation', 'WebDriver', 'PhantomJS', 'Selenium'];
    return frameworks.filter((_, index) => checks[index]);
  }


  private async logDetection(result: DetectionResult, duration: number): Promise<void> {
    try {
      await apiClient.logDetection({
        ...result,
        duration,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log detection:', error);
    }
  }
}
