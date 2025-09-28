// Kalundborg Kommune - Comprehensive data for voice assistant
// Based on web research from kalundborg.dk and official sources

export const kalundborgData = {
  contact: {
    main_phone: "59 53 44 00",
    address: "Holbækvej 141B, 4400 Kalundborg",
    postal_code: "4400",
    email: "borgerservice@kalundborg.dk",
    website: "kalundborg.dk",
    cvr: "29189374"
  },

  opening_hours: {
    borgerservice: {
      weekdays: "Mandag til fredag: 08:30-14:30",
      address: "Klostertorvet 2, 4400 Kalundborg",
      note: "Du skal bestille tid gennem kommunens hjemmeside"
    },
    phone_hours: {
      monday: "08:30-15:00",
      tuesday: "08:30-15:00",
      wednesday: "08:30-15:00",
      thursday: "08:30-17:00",
      friday: "08:30-13:00"
    }
  },

  departments: {
    borgerservice: {
      phone: "59 53 44 00",
      email: "borgerservice@kalundborg.dk",
      address: "Klostertorvet 2, 4400 Kalundborg",
      services: ["Pas og ID-kort", "Borgeropslag", "Flytning", "Vielser", "Begravelser", "Tidsbestilling"]
    },
    building_permits: {
      description: "Byggesager og planlægning",
      application_portal: "Byg og Miljø",
      requirement: "Alle byggeansøgninger skal indsendes digitalt",
      consultation: "Telefonvejledning fra byggesagsbehandlere tilgængelig"
    },
    jobcenter: {
      address: "Torvet 3, 4400 Kalundborg",
      email: "godlosladelse@kalundborg.dk",
      contact_person: "Mette Hansen 4026 9963"
    }
  },

  waste_management: {
    operator: "ARGO",
    recycling_station: {
      name: "Kalundborg Genbrugsplads",
      address: "Genvejen 5, 4400 Kalundborg",
      phone: "46 34 75 00",
      features: [
        "24/7 adgang tilgængelig",
        "Lukket 24., 25., 26., 31. december og 1. januar",
        "Gratis genbrugsområde åbnet juni 2024",
        "Direkte genbrug af møbler, elektronik, legetøj"
      ],
      rating: "4.4/5 baseret på 73 anmeldelser"
    }
  },

  schools_education: {
    statistics: {
      folkeskoler: 16,
      specialskoler: 2,
      smallest_school: "Sejerø Skole og Børnehus (16 elever)",
      schools_under_100_students: 4
    },
    daycare: {
      vuggestuer: 17,
      børnehaver: 33,
      integrated_institutions: 14,
      age_range: "0-6 år"
    },
    higher_education: [
      "Professionshøjskolen Absalon, Campus Kalundborg",
      "Teknika - Copenhagen College of Technology Management and Marine Engineering",
      "Processkolen - Danmarks største processindustri uddannelse"
    ],
    programs: [
      "Bioanalytiker",
      "Diplomingeniør i bioteknologi",
      "Maskinteknologi",
      "Maskinmesteruddannelse"
    ]
  },

  healthcare: {
    naerklinik: {
      name: "Nærklinik Kalundborg",
      operator: "Region Sjælland",
      phone: "59 48 15 70",
      address: "Vestre Havneplads 10, 1. sal",
      hours: "Mandag til fredag: 8:00-16:00",
      acute_calls: "Ring mellem 8:00 og 9:00",
      appointments: "Ring helst mellem 9:00 og 12:00",
      status: "Åben for tilgang"
    },
    dentists: [
      {
        name: "ORIS Tandlægerne Kalundborg",
        email: "kalundborg@oris.dk",
        phone: "59 51 03 90",
        address: "Kordilgade",
        staff: "5 tandlæger, 3 tandplejere, 6 klinikassistenter"
      },
      {
        name: "Kalundborg Tandlægecenter",
        experience: "Over 30 år",
        facilities: "7 behandlerrum"
      }
    ],
    municipal_dental: {
      private_option: true,
      subsidy: "65% tilskud til privatpraktiserende tandlæge"
    },
    digital_health: {
      portal: "Sundhed.dk",
      services: ["Prøvesvar", "Journaler", "Sundhedsinformation"]
    }
  },

  culture_events: {
    library_system: {
      main_library: "Kalundborg Bibliotek og Borgerservice",
      address: "Klostertorvet 2, 4400 Kalundborg",
      branches: ["Høng", "Gørlev", "Ubby"],
      opening_hours_note: "Justeret fra september 2025 for flere aktiviteter og længere aftentimer"
    },
    cultural_calendar: {
      website: "kalundborg.dk/kulturkalender",
      monthly_events: {
        concerts: 25,
        performances: 24,
        lectures: 36,
        exercise_offerings: 32,
        total_march_2023: 439
      }
    },
    children_activities: [
      "Bogklubber i Kalundborg og Høng",
      "Orla prisen (børnebogspris)",
      "7 teaterforestillinger årligt",
      "Børnebiffen - gratis film for 3-6 årige"
    ],
    community_halls: {
      events_annually: 33,
      focus: "Primært musikarrangementer",
      examples: ["Tamra Rosanes Trio", "Nordic Singers"]
    },
    future_development: "Nyt kulturhus ved havnen i 2026"
  },

  transportation: {
    railway: {
      line: "Nordvestbanen",
      terminus: "Kalundborg Station",
      connections: ["RE linje"]
    },
    buses: {
      lines: ["430R", "520", "543", "551", "552", "553", "554", "577", "545", "RE", "RØD", "576"],
      purpose: ["Social transport", "Trafikal", "Erhvervsudvikling"]
    },
    cycling: {
      plan_adopted: 2017,
      goal: "Sikker, tryg og sammenhængende stinet",
      planned_routes: ["Ubby til Ugerløse (4 km)", "Forbindelse til hovedvej 22"]
    },
    infrastructure_planning: {
      new_plan_period: "2021-22",
      focus_areas: [
        "Bil-tilgængelighed",
        "Byudvikling",
        "Trafiksikkerhed",
        "Klimavenlig transport"
      ],
      traffic_safety_goal: "Halvering af dræbte og alvorligt tilskadekomne 2021-2030"
    }
  },

  business_services: {
    kalundborg_business_council: {
      name: "Kalundborgegnens Erhvervsråd",
      website: "kalundborgerhverv.dk",
      services: [
        "Netværk af offentlige og private rådgivere",
        "Hjælp til samarbejdspartnere",
        "Finansiering",
        "Vækstplaner"
      ]
    },
    erhvervshus_sjaelland: {
      service: "Hjælper virksomheder skabe vækstplaner"
    },
    industrial_strengths: [
      "Biotek og farmaceutisk industri",
      "Verdens største insulinfabrik",
      "Enzymproduktion",
      "Ledende industriel symbiose"
    ],
    job_creation: "Over 1200 nye job sidste år",
    commercial_properties: "Velbeliggende erhvervsejendomme og grunde til salg"
  },

  population_stats: {
    total_population: 48103,
    area_km2: 604,
    density: "80 indbyggere per km²"
  }
};

// Comprehensive Q&A database for voice assistant
export const questionAnswerPairs = [
  // Contact and Opening Hours
  {
    question: "Hvad er telefonnummeret til Kalundborg Kommune?",
    answer: "Telefonnummeret til Kalundborg Kommune er 59 53 44 00. Telefontiden er mandag til onsdag 8:30-15:00, torsdag 8:30-17:00, og fredag 8:30-13:00.",
    keywords: ["telefon", "telefonnummer", "kontakt", "ring"]
  },
  {
    question: "Hvornår har borgerservice åbent?",
    answer: "Borgerservice har åbent mandag til fredag fra 8:30 til 14:30. Du skal bestille tid gennem kommunens hjemmeside. Borgerservice ligger på Klostertorvet 2 i Kalundborg.",
    keywords: ["åbningstider", "borgerservice", "tid", "åben"]
  },
  {
    question: "Hvad er adressen på Kalundborg Kommune?",
    answer: "Kalundborg Kommune ligger på Holbækvej 141B, 4400 Kalundborg. Borgerservice findes på Klostertorvet 2, 4400 Kalundborg.",
    keywords: ["adresse", "hvor", "ligger", "placering"]
  },

  // Waste Management
  {
    question: "Hvornår har genbrugspladsen åbent?",
    answer: "Kalundborg Genbrugsplads på Genvejen 5 har 24/7 adgang tilgængelig. De er kun lukket 24., 25., 26., 31. december og 1. januar. Telefon 46 34 75 00.",
    keywords: ["genbrugsplads", "åbningstider", "affald", "genbrug", "ARGO"]
  },
  {
    question: "Hvor skal jeg smide mit affald?",
    answer: "Du kan tage dit affald til Kalundborg Genbrugsplads på Genvejen 5. De har 24/7 adgang og et nyt gratis genbrugsområde hvor du kan aflevere møbler, elektronik og legetøj.",
    keywords: ["affald", "smide", "genbrugsplads", "sortering"]
  },

  // Schools and Education
  {
    question: "Hvor mange skoler er der i Kalundborg Kommune?",
    answer: "Kalundborg Kommune har 16 folkeskoler og 2 specialskoler. Den mindste skole er Sejerø Skole og Børnehus med 16 elever.",
    keywords: ["skoler", "folkeskole", "uddannelse", "antal"]
  },
  {
    question: "Hvor mange børnehaver er der?",
    answer: "Der er 17 vuggestuer og 33 børnehaver i Kalundborg Kommune. 14 af dem er integrerede institutioner der både er vuggestue og børnehave.",
    keywords: ["børnehave", "vuggestue", "dagtilbud", "børn"]
  },
  {
    question: "Hvilke uddannelser kan man tage i Kalundborg?",
    answer: "Du kan tage uddannelser som bioanalytiker, diplomingeniør i bioteknologi og maskinteknologi på Professionshøjskolen Absalon. Der er også Processkolen og maskinmesteruddannelse.",
    keywords: ["uddannelse", "universitet", "højskole", "studie"]
  },

  // Healthcare
  {
    question: "Hvor kan jeg finde en læge i Kalundborg?",
    answer: "Nærklinik Kalundborg på Vestre Havneplads 10 har åben for tilgang. Telefon 59 48 15 70. Åben mandag til fredag 8:00-16:00. Ring mellem 8:00-9:00 ved akut sygdom.",
    keywords: ["læge", "lægehus", "sundhed", "syg", "nærklinik"]
  },
  {
    question: "Hvor kan jeg finde en tandlæge?",
    answer: "Du kan kontakte ORIS Tandlægerne på telefon 59 51 03 90 eller Kalundborg Tandlægecenter. Der er også kommunal tandpleje med 65% tilskud til privatpraktiserende tandlæge.",
    keywords: ["tandlæge", "tænder", "tandpleje"]
  },

  // Building Permits
  {
    question: "Hvordan ansøger jeg om byggetilladelse?",
    answer: "Alle byggeansøgninger skal indsendes digitalt gennem portalen 'Byg og Miljø'. Du må ikke begynde byggeriet før du har fået tilladelse. Der er telefonvejledning tilgængelig fra byggesagsbehandlere.",
    keywords: ["byggetilladelse", "byggeri", "ansøgning", "tilladelse"]
  },
  {
    question: "Hvad sker der hvis jeg bygger uden tilladelse?",
    answer: "Hvis du starter et byggeri uden tilladelse, risikerer du at få en bøde og blive pålagt at nedrive det ulovlige byggeri. Du skal altid have byggetilladelse først.",
    keywords: ["ulovligt byggeri", "bøde", "nedrivning", "byggetilladelse"]
  },

  // Culture and Events
  {
    question: "Hvor mange kulturelle arrangementer er der?",
    answer: "I marts 2023 var der 439 arrangementer i kulturkalenderen, med 25 koncerter, 24 forestillinger, 36 foredrag og 32 motionstilbud. Find dem på kalundborg.dk/kulturkalender.",
    keywords: ["kultur", "arrangementer", "koncerter", "events", "kulturkalender"]
  },
  {
    question: "Hvornår får Kalundborg et nyt kulturhus?",
    answer: "Kalundborg får et nyt kulturhus ved havnen i 2026.",
    keywords: ["kulturhus", "nyt", "havn", "fremtid"]
  },
  {
    question: "Hvilke aktiviteter er der for børn på biblioteket?",
    answer: "Biblioteket tilbyder bogklubber, 7 teaterforestillinger årligt, Børnebiffen med gratis film for 3-6 årige, og hjælp med Orla prisen børnebogspris.",
    keywords: ["børn", "bibliotek", "aktiviteter", "teater", "film"]
  },

  // Transportation
  {
    question: "Hvordan kommer jeg til Kalundborg med tog?",
    answer: "Kalundborg Station er endestationen for Nordvestbanen med RE linje forbindelse. Der er tog til København og omegn.",
    keywords: ["tog", "station", "nordvestbanen", "transport"]
  },
  {
    question: "Hvilke buslinjer kører i Kalundborg?",
    answer: "Der kører busserne 430R, 520, 543, 551, 552, 553, 554, 577, 545, RE, RØD og 576 i Kalundborg Kommune.",
    keywords: ["bus", "buslinjer", "offentlig transport"]
  },
  {
    question: "Er der cykelstier i Kalundborg?",
    answer: "Kommunen har en cykelstinet fra 2017 med målet om sikre, trygge og sammenhængende cykelstier. Der er planer om en ny cykelsti fra Ubby til Ugerløse på 4 km.",
    keywords: ["cykelstier", "cykling", "cykel", "transport"]
  },

  // Business Services
  {
    question: "Hvordan kan jeg få hjælp til min virksomhed?",
    answer: "Kalundborgegnens Erhvervsråd på kalundborgerhverv.dk hjælper med netværk, samarbejdspartnere og finansiering. Erhvervshus Sjælland hjælper med vækstplaner.",
    keywords: ["virksomhed", "erhverv", "hjælp", "rådgivning", "business"]
  },
  {
    question: "Hvilke store virksomheder er der i Kalundborg?",
    answer: "Kalundborg har biotek og farmaceutisk industri med verdens største insulinfabrik. Der er over 1200 nye job skabt sidste år, og der er ledende industriel symbiose.",
    keywords: ["virksomheder", "industri", "job", "arbejde", "erhverv"]
  },

  // Emergency and Important Numbers
  {
    question: "Hvad er nødnummeret?",
    answer: "Ring 112 i akutte nødsituationer. Ved lægehjælp uden for normal åbningstid ring 1813.",
    keywords: ["nødnummer", "112", "1813", "akut", "hjælp"]
  },

  // General Municipal Information
  {
    question: "Hvor mange indbyggere har Kalundborg Kommune?",
    answer: "Kalundborg Kommune har 48.103 indbyggere på et areal af 604 kvadratkilometer, hvilket giver en befolkningstæthed på 80 indbyggere per kvadratkilometer.",
    keywords: ["indbyggere", "befolkning", "størrelse", "antal"]
  },
  {
    question: "Hvad kan jeg få hjælp til på borgerservice?",
    answer: "På borgerservice kan du få hjælp til pas og ID-kort, borgeropslag, flytning, vielser, begravelser og tidsbestilling. Du skal booke tid på forhånd.",
    keywords: ["borgerservice", "pas", "ID-kort", "flytning", "vielse"]
  }
];

export const commonQuestions = {
  "kontakt": ["telefon", "adresse", "email", "åbningstider", "borgerservice"],
  "affald": ["genbrugsplads", "sortering", "ARGO", "åbningstider"],
  "uddannelse": ["skoler", "børnehaver", "universitet", "uddannelser"],
  "sundhed": ["læge", "tandlæge", "hospital", "nærklinik"],
  "byggeri": ["byggetilladelse", "planlægning", "ansøgning"],
  "kultur": ["bibliotek", "arrangementer", "aktiviteter", "kulturhus"],
  "transport": ["tog", "bus", "cykelstier", "parkering"],
  "erhverv": ["virksomheder", "erhvervsservice", "job", "rådgivning"]
};

// Enhanced fallback responses
export const fallbackResponses = {
  general: "Det kan jeg desværre ikke svare præcist på. Du kan kontakte Kalundborg Kommune på 59 53 44 00 for mere information, eller besøge kalundborg.dk.",
  contact: "For den specifikke information kan du kontakte borgerservice på 59 53 44 00 eller sende en mail til borgerservice@kalundborg.dk.",
  website: "Mere detaljeret information finder du på kalundborg.dk eller ved at ringe til 59 53 44 00.",
  appointment: "Husk at du skal bestille tid til borgerservice gennem kommunens hjemmeside på kalundborg.dk."
};

// Search function for finding relevant answers
export function findAnswer(query) {
  const lowerQuery = query.toLowerCase();

  // Find matching Q&A pairs based on keywords
  const matches = questionAnswerPairs.filter(qa =>
    qa.keywords.some(keyword => lowerQuery.includes(keyword)) ||
    lowerQuery.includes(qa.question.toLowerCase())
  );

  if (matches.length > 0) {
    // Return the best match (could be enhanced with scoring)
    return matches[0].answer;
  }

  return fallbackResponses.general;
}