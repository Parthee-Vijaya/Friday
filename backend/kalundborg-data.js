// Kalundborg Kommune - Mock data til voice assistant

export const kalundborgData = {
  contact: {
    main_phone: "59 53 44 00",
    address: "Holbækvej 141, 4400 Kalundborg",
    postal_code: "4400",
    email: "kalundborg@kalundborg.dk",
    website: "kalundborg.dk",
    cvr: "29189374"
  },

  opening_hours: {
    weekdays: "Mandag-torsdag: 8:00-16:00, Fredag: 8:00-15:00",
    citizen_service: "Mandag-fredag: 9:00-15:00",
    phone_service: "Mandag-fredag: 8:00-16:00"
  },

  departments: {
    borgerservice: {
      phone: "59 53 44 12",
      services: ["Pas og ID-kort", "Borgeropslag", "Flytning", "Vielser", "Begravelser"]
    },
    teknik_miljoe: {
      phone: "59 53 44 44",
      services: ["Byggesager", "Miljøsager", "Veje", "Renovation", "Spildevand"]
    },
    sundhed_dagtilbud: {
      phone: "59 53 44 55",
      services: ["Dagtilbud", "Skoler", "Ældreområdet", "Sundhed"]
    },
    kultur_fritid: {
      phone: "59 53 44 66",
      services: ["Kultur", "Idræt", "Biblioteker", "Musik- og kulturskole"]
    }
  },

  schools: [
    { name: "Kalundborg Gymnasium", type: "Gymnasium" },
    { name: "Raklev Skole", type: "Folkeskole" },
    { name: "Vestervangskolen", type: "Folkeskole" },
    { name: "Gørlev Skole", type: "Folkeskole" },
    { name: "Ubby Skole", type: "Folkeskole" }
  ],

  healthcare: {
    hospital: "Holbæk Sygehus (nærmeste)",
    emergency: "112",
    doctor_emergency: "1813",
    pharmacies: [
      "Kalundborg Apotek - Kordilgade 9",
      "Svane Apotek - Holbækvej 185"
    ]
  },

  attractions: [
    {
      name: "Vor Frue Kirke",
      description: "Historisk kirke med fem tårne fra 1100-tallet",
      address: "Sankt Nikolaj Plads"
    },
    {
      name: "Kalundborg Museum",
      description: "Lokalt museum med byens historie",
      address: "Adelgade 23"
    },
    {
      name: "Røsnæs Fyr",
      description: "Fyrtårn på Røsnæs med smuk udsigt",
      location: "Røsnæs"
    }
  ],

  beaches: [
    {
      name: "Reersø Strand",
      description: "Populær sandstrand med gode faciliteter",
      facilities: ["Toilet", "Parkering", "Legeplads"]
    },
    {
      name: "Rørvig Strand",
      description: "Familievenlig strand med lavt vand",
      facilities: ["Toilet", "Parkering", "Kiosk"]
    },
    {
      name: "Gisseløre Strand",
      description: "Naturstrand med fred og ro",
      facilities: ["Parkering"]
    }
  ],

  transport: {
    trains: {
      route: "Kalundborg-København",
      frequency: "Hver time i myldretiden",
      duration: "1 time 45 minutter til København"
    },
    ferries: [
      {
        route: "Kalundborg-Aarhus",
        operator: "Mols-Linien",
        duration: "2 timer 45 minutter"
      },
      {
        route: "Kalundborg-Samsø",
        operator: "Samsø Rederi",
        duration: "1 time 15 minutter"
      }
    ],
    buses: {
      local: "Movia busser i lokalområdet",
      regional: "Forbindelse til Holbæk og omegn"
    }
  },

  events: [
    {
      name: "Kalundborg Festival",
      period: "Juli måned",
      description: "Årlig musikfestival i byens centrum"
    },
    {
      name: "Middelaldermarked",
      period: "August",
      description: "Historisk marked ved Vor Frue Kirke"
    },
    {
      name: "Havnefest",
      period: "September",
      description: "Fest i Kalundborg Havn"
    }
  ],

  business: {
    industrial_area: "Kalundborg Industripark",
    major_companies: [
      "Novo Nordisk",
      "Novozymes",
      "Equinor",
      "Ørsted"
    ],
    business_support: {
      phone: "59 53 44 77",
      email: "erhverv@kalundborg.dk"
    }
  },

  statistics: {
    population: 48103,
    area_km2: 604,
    households: 21500,
    unemployment_rate: "3.2%"
  }
};

export const commonQuestions = {
  "kontakt": ["telefon", "adresse", "email", "åbningstider"],
  "services": ["borgerservice", "byggesager", "dagtilbud", "skoler"],
  "transport": ["tog", "færge", "bus", "parkering"],
  "turisme": ["seværdigheder", "strande", "museer", "events"],
  "erhverv": ["virksomheder", "erhvervsservice", "industripark"]
};

// Fallback responses when specific information isn't available
export const fallbackResponses = {
  general: "Det kan jeg desværre ikke svare præcist på. Du kan kontakte Kalundborg Kommune på 59 53 44 00 for mere information.",
  contact: "For den specifikke information kan du kontakte den relevante afdeling i Kalundborg Kommune.",
  website: "Mere information finder du på kalundborg.dk eller ved at ringe til 59 53 44 00."
};