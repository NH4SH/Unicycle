export type CampusPickupLocationType =
  | "academic"
  | "library"
  | "student_center"
  | "dining"
  | "athletics"
  | "landmark"
  | "public_meetup"
  | "greek_life"
  | "dorm"
  | "apartment";

export type CampusPickupCommunityId =
  | "central-grounds"
  | "engineering"
  | "athletics"
  | "the-corner"
  | "west-main"
  | "north-grounds"
  | "residential-colleges"
  | "rugby-greek"
  | "alderman-road"
  | "jpa"
  | "downtown"
  | "barracks";

export type CampusPickupLocationGroupId =
  | "central-grounds"
  | "engineering"
  | "athletics"
  | "the-corner"
  | "west-main"
  | "on-grounds-housing"
  | "apartment-communities"
  | "greek-life-areas"
  | "public-meetup-spots";

export type CampusPickupCommunity = {
  id: CampusPickupCommunityId;
  name: string;
  shortLabel: string;
  description: string;
  priority: number;
  searchTerms: string[];
};

export type CampusPickupLocationGroup = {
  id: CampusPickupLocationGroupId;
  name: string;
  shortLabel: string;
  description: string;
  priority: number;
  searchTerms: string[];
};

export type CampusPickupLocation = {
  id: string;
  name: string;
  publicLabel: string;
  shortLabel: string;
  type: CampusPickupLocationType;
  communityId: CampusPickupCommunityId;
  groupId: CampusPickupLocationGroupId;
  area: string;
  latitude: number;
  longitude: number;
  lookupTerms?: string[];
  searchTerms: string[];
  isPublicSafeSpot: boolean;
  priority: number;
  mapsQuery?: string;
};

export const DEFAULT_CAMPUS_MAP_CENTER = {
  latitude: 38.0355,
  longitude: -78.5056
} as const;

export const CAMPUS_PICKUP_COMMUNITIES: CampusPickupCommunity[] = [
  {
    id: "central-grounds",
    name: "Central Grounds",
    shortLabel: "Central Grounds",
    description: "Newcomb, the Rotunda, libraries, and the class-break handoff core.",
    priority: 120,
    searchTerms: ["grounds", "central grounds", "newcomb", "rotunda", "south lawn", "libraries"]
  },
  {
    id: "engineering",
    name: "Engineering",
    shortLabel: "Engineering",
    description: "Rice, Thornton, Clark, and the E-School side of Grounds.",
    priority: 108,
    searchTerms: ["engineering", "eschool", "rice", "thornton", "clark", "olsson"]
  },
  {
    id: "athletics",
    name: "Athletics",
    shortLabel: "Athletics",
    description: "JPJ, Scott, AFC, and the bigger public meetup zones on the athletics side.",
    priority: 88,
    searchTerms: ["athletics", "jpj", "scott", "afc", "memorial gym"]
  },
  {
    id: "the-corner",
    name: "The Corner",
    shortLabel: "The Corner",
    description: "Corner pickups, 14th Street energy, and quick meetups before or after class.",
    priority: 116,
    searchTerms: ["corner", "14th street", "wertland", "elliewood", "grandmarc", "standard"]
  },
  {
    id: "west-main",
    name: "West Main",
    shortLabel: "West Main",
    description: "Student-heavy spots stretching toward West Main and the Flats.",
    priority: 82,
    searchTerms: ["west main", "west village", "flats", "preston", "hospital"]
  },
  {
    id: "north-grounds",
    name: "North Grounds",
    shortLabel: "North Grounds",
    description: "North Grounds housing and public meetup spots that still stay easy to reach.",
    priority: 78,
    searchTerms: ["north grounds", "lambeth", "copeley", "university gardens", "hereford", "alumni hall"]
  },
  {
    id: "residential-colleges",
    name: "Residential Colleges",
    shortLabel: "Res Colleges",
    description: "Brown, IRC, and residential-college-adjacent pickup zones.",
    priority: 74,
    searchTerms: ["brown", "irc", "residential college", "res colleges"]
  },
  {
    id: "rugby-greek",
    name: "Greek Life Areas",
    shortLabel: "Greek Life",
    description: "Rugby Road and Greek-life-adjacent handoff areas.",
    priority: 72,
    searchTerms: ["rugby", "greek", "mad bowl", "frat row", "sorority row"]
  },
  {
    id: "alderman-road",
    name: "Alderman Road",
    shortLabel: "Alderman Road",
    description: "Old dorms, O-Hill, Bond, Bice, and Alderman Road pickup spots.",
    priority: 84,
    searchTerms: ["alderman", "bond", "bice", "gooch", "dillard", "ohill", "runk"]
  },
  {
    id: "jpa",
    name: "JPA",
    shortLabel: "JPA",
    description: "Jefferson Park Avenue and nearby student living pickups.",
    priority: 70,
    searchTerms: ["jpa", "jefferson park avenue", "maury"]
  },
  {
    id: "downtown",
    name: "Downtown Edge",
    shortLabel: "Downtown",
    description: "For handoffs that drift a little beyond Grounds, like the Pavilion.",
    priority: 40,
    searchTerms: ["downtown", "pavilion", "ting pavilion", "downtown mall"]
  },
  {
    id: "barracks",
    name: "Barracks",
    shortLabel: "Barracks",
    description: "Barracks Road shopping-center pickups.",
    priority: 38,
    searchTerms: ["barracks", "whole foods", "shopping center", "barracks road"]
  }
] as const;

export const CAMPUS_PICKUP_LOCATION_GROUPS: CampusPickupLocationGroup[] = [
  {
    id: "central-grounds",
    name: "Central Grounds",
    shortLabel: "Central Grounds",
    description: "Core academic pickup spots near classes and libraries.",
    priority: 68,
    searchTerms: ["central grounds", "grounds", "core campus"]
  },
  {
    id: "engineering",
    name: "Engineering",
    shortLabel: "Engineering",
    description: "Engineering-side buildings and handoff zones.",
    priority: 64,
    searchTerms: ["engineering", "eschool"]
  },
  {
    id: "athletics",
    name: "Athletics",
    shortLabel: "Athletics",
    description: "Athletics-side pickup zones.",
    priority: 50,
    searchTerms: ["athletics", "stadium", "arena"]
  },
  {
    id: "the-corner",
    name: "The Corner",
    shortLabel: "The Corner",
    description: "Quick handoffs around the Corner and 14th Street.",
    priority: 66,
    searchTerms: ["corner", "14th street", "elliewood"]
  },
  {
    id: "west-main",
    name: "West Main",
    shortLabel: "West Main",
    description: "Student-heavy pickup spots along West Main.",
    priority: 42,
    searchTerms: ["west main", "west village"]
  },
  {
    id: "on-grounds-housing",
    name: "On-Grounds Housing",
    shortLabel: "Housing",
    description: "Residential colleges, old dorms, and North Grounds student housing.",
    priority: 46,
    searchTerms: ["housing", "dorms", "on grounds", "residential college", "lambeth", "hereford"]
  },
  {
    id: "apartment-communities",
    name: "Apartment Communities",
    shortLabel: "Apartments",
    description: "Student apartment communities near Grounds.",
    priority: 40,
    searchTerms: ["apartments", "grandmarc", "standard", "copeley", "jpa", "flats"]
  },
  {
    id: "greek-life-areas",
    name: "Greek Life Areas",
    shortLabel: "Greek Life",
    description: "Rugby Road and Greek-life-adjacent pickup zones.",
    priority: 36,
    searchTerms: ["greek", "rugby", "frat", "sorority"]
  },
  {
    id: "public-meetup-spots",
    name: "Public Meetup Spots",
    shortLabel: "Public spots",
    description: "Recognizable public meetup spots HoosFinds should privilege by default.",
    priority: 72,
    searchTerms: ["public", "meetup", "safe spot", "landmark", "student center", "library"]
  }
] as const;

export const UVA_PICKUP_LOCATIONS: CampusPickupLocation[] = [
  {
    id: "newcomb",
    name: "Newcomb",
    publicLabel: "Newcomb",
    shortLabel: "near Newcomb",
    type: "student_center",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0359,
    longitude: -78.5048,
    lookupTerms: ["newcomb hall"],
    searchTerms: ["newcomb hall", "student activities", "newcomb hall uva", "student center"],
    isPublicSafeSpot: true,
    priority: 100,
    mapsQuery: "Newcomb Hall University of Virginia"
  },
  {
    id: "rotunda",
    name: "Rotunda",
    publicLabel: "Rotunda",
    shortLabel: "by the Rotunda",
    type: "landmark",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0356,
    longitude: -78.5034,
    lookupTerms: ["uva rotunda", "academical village", "the lawn"],
    searchTerms: ["academical village", "lawn", "uva rotunda", "the lawn"],
    isPublicSafeSpot: true,
    priority: 96,
    mapsQuery: "Rotunda University of Virginia"
  },
  {
    id: "south-lawn",
    name: "South Lawn",
    publicLabel: "South Lawn",
    shortLabel: "on South Lawn",
    type: "public_meetup",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0345,
    longitude: -78.5046,
    searchTerms: ["south lawn", "amphitheater", "lawn amphitheater", "south lawn steps"],
    isPublicSafeSpot: true,
    priority: 92
  },
  {
    id: "amphitheater",
    name: "Amphitheater",
    publicLabel: "Amphitheater",
    shortLabel: "by the Amphitheater",
    type: "public_meetup",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0342,
    longitude: -78.5039,
    lookupTerms: ["south lawn amphitheater", "amphitheatre"],
    searchTerms: ["amp", "south lawn amphitheater", "amphitheatre"],
    isPublicSafeSpot: true,
    priority: 90,
    mapsQuery: "South Lawn Amphitheater University of Virginia"
  },
  {
    id: "clemons",
    name: "Clemons",
    publicLabel: "Clemons",
    shortLabel: "by Clemons",
    type: "library",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0372,
    longitude: -78.5066,
    lookupTerms: ["clemons library"],
    searchTerms: ["clemons library", "library", "clemons front steps"],
    isPublicSafeSpot: true,
    priority: 90,
    mapsQuery: "Clemons Library University of Virginia"
  },
  {
    id: "shannon",
    name: "Shannon",
    publicLabel: "Shannon",
    shortLabel: "near Shannon",
    type: "library",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0363,
    longitude: -78.5061,
    lookupTerms: ["shannon library", "main library", "alderman"],
    searchTerms: ["alderman", "shannon library", "main library", "shannon steps"],
    isPublicSafeSpot: true,
    priority: 88,
    mapsQuery: "Shannon Library University of Virginia"
  },
  {
    id: "nau-hall",
    name: "Nau Hall",
    publicLabel: "Nau Hall",
    shortLabel: "near Nau Hall",
    type: "academic",
    communityId: "central-grounds",
    groupId: "central-grounds",
    area: "Central Grounds",
    latitude: 38.0336,
    longitude: -78.5062,
    lookupTerms: ["mcintire"],
    searchTerms: ["nau", "commerce school", "mcintire"],
    isPublicSafeSpot: true,
    priority: 80,
    mapsQuery: "Nau Hall University of Virginia"
  },
  {
    id: "old-cabell",
    name: "Old Cabell",
    publicLabel: "Old Cabell",
    shortLabel: "near Old Cabell",
    type: "landmark",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0361,
    longitude: -78.5024,
    lookupTerms: ["cabell hall", "old cabell hall"],
    searchTerms: ["cabell", "cabell hall", "old cabell hall"],
    isPublicSafeSpot: true,
    priority: 79,
    mapsQuery: "Old Cabell Hall University of Virginia"
  },
  {
    id: "mccormick-road",
    name: "McCormick Road",
    publicLabel: "McCormick Road",
    shortLabel: "on McCormick",
    type: "public_meetup",
    communityId: "central-grounds",
    groupId: "public-meetup-spots",
    area: "Central Grounds",
    latitude: 38.0357,
    longitude: -78.5079,
    searchTerms: ["mccormick", "mccormick road dorms", "mccormick side"],
    isPublicSafeSpot: true,
    priority: 76
  },
  {
    id: "rice-hall",
    name: "Rice Hall",
    publicLabel: "Rice Hall",
    shortLabel: "near Rice Hall",
    type: "academic",
    communityId: "engineering",
    groupId: "engineering",
    area: "Engineering",
    latitude: 38.0318,
    longitude: -78.5103,
    searchTerms: ["rice", "engineering", "eschool", "thornton side", "rice lobby"],
    isPublicSafeSpot: true,
    priority: 89,
    mapsQuery: "Rice Hall University of Virginia"
  },
  {
    id: "thornton-hall",
    name: "Thornton Hall",
    publicLabel: "Thornton Hall",
    shortLabel: "near Thornton Hall",
    type: "academic",
    communityId: "engineering",
    groupId: "engineering",
    area: "Engineering",
    latitude: 38.0321,
    longitude: -78.5096,
    searchTerms: ["thornton", "e-school", "engineering lawn"],
    isPublicSafeSpot: true,
    priority: 84,
    mapsQuery: "Thornton Hall University of Virginia"
  },
  {
    id: "clark-hall",
    name: "Clark Hall",
    publicLabel: "Clark Hall",
    shortLabel: "near Clark Hall",
    type: "academic",
    communityId: "engineering",
    groupId: "engineering",
    area: "Engineering",
    latitude: 38.0327,
    longitude: -78.5094,
    searchTerms: ["clark", "engineering side"],
    isPublicSafeSpot: true,
    priority: 78,
    mapsQuery: "Clark Hall University of Virginia"
  },
  {
    id: "olsson-hall",
    name: "Olsson Hall",
    publicLabel: "Olsson Hall",
    shortLabel: "near Olsson Hall",
    type: "academic",
    communityId: "engineering",
    groupId: "engineering",
    area: "Engineering",
    latitude: 38.0324,
    longitude: -78.5088,
    searchTerms: ["olsson", "engineering building", "olsson hall"],
    isPublicSafeSpot: true,
    priority: 74,
    mapsQuery: "Olsson Hall University of Virginia"
  },
  {
    id: "alumni-hall",
    name: "Alumni Hall",
    publicLabel: "Alumni Hall",
    shortLabel: "at Alumni Hall",
    type: "public_meetup",
    communityId: "north-grounds",
    groupId: "public-meetup-spots",
    area: "North Grounds edge",
    latitude: 38.0342,
    longitude: -78.5152,
    searchTerms: ["alumni", "ivy road", "north grounds edge"],
    isPublicSafeSpot: true,
    priority: 72,
    mapsQuery: "Alumni Hall University of Virginia"
  },
  {
    id: "jpj",
    name: "JPJ",
    publicLabel: "JPJ",
    shortLabel: "by JPJ",
    type: "athletics",
    communityId: "athletics",
    groupId: "athletics",
    area: "Athletics",
    latitude: 38.0455,
    longitude: -78.5069,
    lookupTerms: ["john paul jones", "john paul jones arena", "jpj arena"],
    searchTerms: ["john paul jones", "arena", "jpj arena"],
    isPublicSafeSpot: true,
    priority: 82,
    mapsQuery: "John Paul Jones Arena Charlottesville VA"
  },
  {
    id: "scott-stadium",
    name: "Scott Stadium",
    publicLabel: "Scott Stadium",
    shortLabel: "near Scott Stadium",
    type: "athletics",
    communityId: "athletics",
    groupId: "athletics",
    area: "Athletics",
    latitude: 38.0311,
    longitude: -78.5125,
    searchTerms: ["scott", "stadium", "football", "athletics"],
    isPublicSafeSpot: true,
    priority: 74,
    mapsQuery: "Scott Stadium Charlottesville VA"
  },
  {
    id: "afc",
    name: "AFC",
    publicLabel: "AFC",
    shortLabel: "near AFC",
    type: "athletics",
    communityId: "athletics",
    groupId: "public-meetup-spots",
    area: "Athletics",
    latitude: 38.0331,
    longitude: -78.5121,
    lookupTerms: ["aquatic and fitness center", "aquatic fitness center", "afc uva"],
    searchTerms: ["aquatic and fitness center", "aquatic fitness center", "gym", "afc uva"],
    isPublicSafeSpot: true,
    priority: 76,
    mapsQuery: "Aquatic & Fitness Center University of Virginia"
  },
  {
    id: "memorial-gym",
    name: "Memorial Gym",
    publicLabel: "Memorial Gym",
    shortLabel: "near Memorial Gym",
    type: "athletics",
    communityId: "athletics",
    groupId: "public-meetup-spots",
    area: "Athletics",
    latitude: 38.0376,
    longitude: -78.5088,
    searchTerms: ["mem gym", "mem", "memorial"],
    isPublicSafeSpot: true,
    priority: 68,
    mapsQuery: "Memorial Gymnasium University of Virginia"
  },
  {
    id: "the-corner",
    name: "The Corner",
    publicLabel: "The Corner",
    shortLabel: "near the Corner",
    type: "landmark",
    communityId: "the-corner",
    groupId: "the-corner",
    area: "The Corner",
    latitude: 38.0349,
    longitude: -78.5003,
    searchTerms: ["corner", "14th street", "elliewood", "corner bars"],
    isPublicSafeSpot: true,
    priority: 98,
    mapsQuery: "The Corner Charlottesville VA"
  },
  {
    id: "boylan",
    name: "Boylan",
    publicLabel: "Boylan",
    shortLabel: "by Boylan",
    type: "public_meetup",
    communityId: "the-corner",
    groupId: "the-corner",
    area: "The Corner",
    latitude: 38.0362,
    longitude: -78.4987,
    searchTerms: ["boylan heights", "boylan"],
    isPublicSafeSpot: true,
    priority: 68,
    mapsQuery: "Boylan Heights Charlottesville VA"
  },
  {
    id: "elliewood",
    name: "Elliewood",
    publicLabel: "Elliewood",
    shortLabel: "on Elliewood",
    type: "public_meetup",
    communityId: "the-corner",
    groupId: "the-corner",
    area: "The Corner",
    latitude: 38.035,
    longitude: -78.4997,
    searchTerms: ["elliewood avenue", "elliewood"],
    isPublicSafeSpot: true,
    priority: 67,
    mapsQuery: "Elliewood Avenue Charlottesville VA"
  },
  {
    id: "grandmarc",
    name: "GrandMarc",
    publicLabel: "GrandMarc",
    shortLabel: "by GrandMarc",
    type: "apartment",
    communityId: "the-corner",
    groupId: "apartment-communities",
    area: "The Corner edge",
    latitude: 38.0326,
    longitude: -78.4998,
    lookupTerms: ["grand marc"],
    searchTerms: ["grand marc", "15th street", "gm"],
    isPublicSafeSpot: true,
    priority: 73,
    mapsQuery: "GrandMarc at the Corner Charlottesville VA"
  },
  {
    id: "standard",
    name: "The Standard",
    publicLabel: "The Standard",
    shortLabel: "near The Standard",
    type: "apartment",
    communityId: "the-corner",
    groupId: "apartment-communities",
    area: "Wertland / 14th",
    latitude: 38.0342,
    longitude: -78.4989,
    lookupTerms: ["standard at charlottesville"],
    searchTerms: ["standard charlottesville", "wertland", "standard at charlottesville"],
    isPublicSafeSpot: true,
    priority: 72,
    mapsQuery: "The Standard at Charlottesville"
  },
  {
    id: "wertland-street",
    name: "Wertland Street",
    publicLabel: "Wertland Street",
    shortLabel: "around Wertland",
    type: "public_meetup",
    communityId: "the-corner",
    groupId: "apartment-communities",
    area: "Wertland / 14th",
    latitude: 38.0345,
    longitude: -78.4979,
    searchTerms: ["wertland", "wertland street", "14th"],
    isPublicSafeSpot: true,
    priority: 64
  },
  {
    id: "mad-bowl",
    name: "Mad Bowl",
    publicLabel: "Mad Bowl",
    shortLabel: "around Mad Bowl",
    type: "greek_life",
    communityId: "rugby-greek",
    groupId: "greek-life-areas",
    area: "Rugby / Greek life",
    latitude: 38.0402,
    longitude: -78.5034,
    searchTerms: ["madison bowl", "rugby", "frat row", "sorority row", "greek row"],
    isPublicSafeSpot: true,
    priority: 64
  },
  {
    id: "rugby-road",
    name: "Rugby Road",
    publicLabel: "Rugby Road",
    shortLabel: "on Rugby Road",
    type: "greek_life",
    communityId: "rugby-greek",
    groupId: "greek-life-areas",
    area: "Rugby / Greek life",
    latitude: 38.0394,
    longitude: -78.5018,
    searchTerms: ["rugby", "greek life", "frat", "sorority", "frat row"],
    isPublicSafeSpot: true,
    priority: 60
  },
  {
    id: "brown",
    name: "Brown",
    publicLabel: "Brown",
    shortLabel: "near Brown",
    type: "dorm",
    communityId: "residential-colleges",
    groupId: "on-grounds-housing",
    area: "Residential colleges",
    latitude: 38.0387,
    longitude: -78.5058,
    searchTerms: ["brown college", "brown residential college"],
    isPublicSafeSpot: true,
    priority: 67,
    mapsQuery: "Brown Residential College University of Virginia"
  },
  {
    id: "irc",
    name: "IRC",
    publicLabel: "IRC",
    shortLabel: "near the IRC",
    type: "dorm",
    communityId: "residential-colleges",
    groupId: "on-grounds-housing",
    area: "Residential colleges",
    latitude: 38.0398,
    longitude: -78.5076,
    searchTerms: ["international residential college", "irc uva"],
    isPublicSafeSpot: true,
    priority: 66,
    mapsQuery: "International Residential College University of Virginia"
  },
  {
    id: "hereford",
    name: "Hereford",
    publicLabel: "Hereford",
    shortLabel: "near Hereford",
    type: "dorm",
    communityId: "north-grounds",
    groupId: "on-grounds-housing",
    area: "Hereford residential",
    latitude: 38.0408,
    longitude: -78.5143,
    searchTerms: ["hereford college", "residential college", "hf"],
    isPublicSafeSpot: true,
    priority: 63,
    mapsQuery: "Hereford College University of Virginia"
  },
  {
    id: "lambeth",
    name: "Lambeth",
    publicLabel: "Lambeth",
    shortLabel: "near Lambeth",
    type: "dorm",
    communityId: "north-grounds",
    groupId: "on-grounds-housing",
    area: "North Grounds housing",
    latitude: 38.0405,
    longitude: -78.5165,
    searchTerms: ["lambeth commons", "lambeth field", "north grounds housing"],
    isPublicSafeSpot: true,
    priority: 70,
    mapsQuery: "Lambeth Commons University of Virginia"
  },
  {
    id: "bond",
    name: "Bond",
    publicLabel: "Bond",
    shortLabel: "near Bond",
    type: "dorm",
    communityId: "alderman-road",
    groupId: "on-grounds-housing",
    area: "Alderman Road",
    latitude: 38.0344,
    longitude: -78.5112,
    searchTerms: ["bond house", "bond dorms"],
    isPublicSafeSpot: true,
    priority: 58,
    mapsQuery: "Bond House University of Virginia"
  },
  {
    id: "bice",
    name: "Bice",
    publicLabel: "Bice",
    shortLabel: "near Bice",
    type: "dorm",
    communityId: "alderman-road",
    groupId: "on-grounds-housing",
    area: "Alderman Road",
    latitude: 38.0352,
    longitude: -78.512,
    searchTerms: ["bice house", "bice dorms"],
    isPublicSafeSpot: true,
    priority: 58,
    mapsQuery: "Bice House University of Virginia"
  },
  {
    id: "alderman-road",
    name: "Alderman Road Dorms",
    publicLabel: "Alderman dorms",
    shortLabel: "by Alderman dorms",
    type: "dorm",
    communityId: "alderman-road",
    groupId: "on-grounds-housing",
    area: "Alderman Road",
    latitude: 38.0357,
    longitude: -78.5116,
    searchTerms: ["gooch", "dillard", "balz", "old dorms", "alderman dorms"],
    isPublicSafeSpot: true,
    priority: 76,
    mapsQuery: "Alderman Road Dormitories University of Virginia"
  },
  {
    id: "gooch-dillard",
    name: "Gooch / Dillard",
    publicLabel: "Gooch / Dillard",
    shortLabel: "near Gooch / Dillard",
    type: "dorm",
    communityId: "alderman-road",
    groupId: "on-grounds-housing",
    area: "Alderman Road",
    latitude: 38.0348,
    longitude: -78.513,
    lookupTerms: ["gooch dillard"],
    searchTerms: ["gooch", "dillard", "old dorms", "gooch dillard"],
    isPublicSafeSpot: true,
    priority: 62,
    mapsQuery: "Gooch Dillard Residence Area University of Virginia"
  },
  {
    id: "ohill",
    name: "O-Hill",
    publicLabel: "O-Hill",
    shortLabel: "near O-Hill",
    type: "dining",
    communityId: "alderman-road",
    groupId: "public-meetup-spots",
    area: "Observatory Hill",
    latitude: 38.0354,
    longitude: -78.5099,
    lookupTerms: ["observatory hill dining hall"],
    searchTerms: ["observatory hill", "ohill dining", "ohill"],
    isPublicSafeSpot: true,
    priority: 71,
    mapsQuery: "Observatory Hill Dining Hall University of Virginia"
  },
  {
    id: "runk",
    name: "Runk",
    publicLabel: "Runk",
    shortLabel: "near Runk",
    type: "dining",
    communityId: "alderman-road",
    groupId: "public-meetup-spots",
    area: "Alderman Road",
    latitude: 38.0335,
    longitude: -78.5102,
    lookupTerms: ["runk dining", "runk hall"],
    searchTerms: ["runk dining", "runk", "runk hall"],
    isPublicSafeSpot: true,
    priority: 63,
    mapsQuery: "Runk Dining Hall University of Virginia"
  },
  {
    id: "copeley",
    name: "Copeley",
    publicLabel: "Copeley",
    shortLabel: "near Copeley",
    type: "apartment",
    communityId: "north-grounds",
    groupId: "apartment-communities",
    area: "North Grounds living",
    latitude: 38.0447,
    longitude: -78.5138,
    lookupTerms: ["copeley apartments"],
    searchTerms: ["copeley hill", "copeley apartments", "north grounds apartments"],
    isPublicSafeSpot: true,
    priority: 60,
    mapsQuery: "Copeley Apartments University of Virginia"
  },
  {
    id: "university-gardens",
    name: "University Gardens",
    publicLabel: "University Gardens",
    shortLabel: "by University Gardens",
    type: "apartment",
    communityId: "north-grounds",
    groupId: "apartment-communities",
    area: "North Grounds living",
    latitude: 38.0423,
    longitude: -78.5149,
    lookupTerms: ["ugardens"],
    searchTerms: ["university gardens", "north grounds apartments", "ugardens"],
    isPublicSafeSpot: true,
    priority: 57,
    mapsQuery: "University Gardens Charlottesville VA"
  },
  {
    id: "flats",
    name: "The Flats",
    publicLabel: "The Flats",
    shortLabel: "by The Flats",
    type: "apartment",
    communityId: "west-main",
    groupId: "apartment-communities",
    area: "West Main",
    latitude: 38.0318,
    longitude: -78.5099,
    lookupTerms: ["flats at west village"],
    searchTerms: ["flats at west village", "west village", "west main", "the flats"],
    isPublicSafeSpot: true,
    priority: 65,
    mapsQuery: "The Flats at West Village Charlottesville VA"
  },
  {
    id: "west-main-corridor",
    name: "West Main Corridor",
    publicLabel: "West Main",
    shortLabel: "on West Main",
    type: "public_meetup",
    communityId: "west-main",
    groupId: "west-main",
    area: "West Main",
    latitude: 38.031,
    longitude: -78.5072,
    searchTerms: ["west main", "hospital side", "main street", "preston"],
    isPublicSafeSpot: true,
    priority: 58,
    mapsQuery: "West Main Street Charlottesville VA"
  },
  {
    id: "jpa-maury",
    name: "JPA & Maury",
    publicLabel: "JPA",
    shortLabel: "around JPA",
    type: "apartment",
    communityId: "jpa",
    groupId: "apartment-communities",
    area: "JPA",
    latitude: 38.0282,
    longitude: -78.5077,
    searchTerms: ["jefferson park avenue", "maury", "jpa", "jpa apartments"],
    isPublicSafeSpot: true,
    priority: 61
  },
  {
    id: "pavilion",
    name: "Pavilion",
    publicLabel: "Pavilion",
    shortLabel: "at the Pavilion",
    type: "landmark",
    communityId: "downtown",
    groupId: "public-meetup-spots",
    area: "Downtown edge",
    latitude: 38.0295,
    longitude: -78.4778,
    lookupTerms: ["ting pavilion"],
    searchTerms: ["pavilion downtown", "ting pavilion", "downtown mall"],
    isPublicSafeSpot: true,
    priority: 45,
    mapsQuery: "Ting Pavilion Charlottesville VA"
  },
  {
    id: "barracks-road",
    name: "Barracks Road",
    publicLabel: "Barracks Road",
    shortLabel: "near Barracks Road",
    type: "public_meetup",
    communityId: "barracks",
    groupId: "public-meetup-spots",
    area: "Barracks",
    latitude: 38.0436,
    longitude: -78.5007,
    lookupTerms: ["barracks road shopping center"],
    searchTerms: ["barracks shopping center", "whole foods", "barracks road shopping center"],
    isPublicSafeSpot: true,
    priority: 44,
    mapsQuery: "Barracks Road Shopping Center Charlottesville VA"
  }
] as const;

export const FEATURED_PICKUP_LOCATION_IDS = [
  "newcomb",
  "the-corner",
  "rice-hall",
  "clemons",
  "south-lawn",
  "alumni-hall",
  "afc",
  "lambeth",
  "grandmarc",
  "standard"
] as const;

const communityById = new Map(CAMPUS_PICKUP_COMMUNITIES.map((community) => [community.id, community]));
const groupById = new Map(CAMPUS_PICKUP_LOCATION_GROUPS.map((group) => [group.id, group]));
const byId = new Map(UVA_PICKUP_LOCATIONS.map((location) => [location.id, location]));
const byName = new Map(UVA_PICKUP_LOCATIONS.map((location) => [location.name.toLowerCase(), location]));
const byLookupTerm = new Map<string, CampusPickupLocation>();

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchToken(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[&/]/g, " ")
    .replace(/[.,'’()-]/g, " ")
    .replace(/\b(pickup|pick|meetup|meet|meets|meeting|usually|can|after|before|between|classes|class|break|handoff|spot|spots|near|by|at|around|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = normalizeSearchToken(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    terms.push(normalized);
  }

  return terms;
}

function getCampusPickupCommunityMeta(location: CampusPickupLocation) {
  return communityById.get(location.communityId) ?? null;
}

function getCampusPickupLocationGroupMeta(location: CampusPickupLocation) {
  return groupById.get(location.groupId) ?? null;
}

function getLocationPrimaryTerms(location: CampusPickupLocation) {
  return uniqueTerms([location.name, location.publicLabel, location.shortLabel, location.area, ...(location.lookupTerms ?? []), ...location.searchTerms]);
}

function getLocationSecondaryTerms(location: CampusPickupLocation) {
  const community = getCampusPickupCommunityMeta(location);
  const group = getCampusPickupLocationGroupMeta(location);

  return uniqueTerms([
    community?.name,
    community?.shortLabel,
    ...(community?.searchTerms ?? []),
    group?.name,
    group?.shortLabel,
    ...(group?.searchTerms ?? [])
  ]);
}

function getLocationLookupTerms(location: CampusPickupLocation) {
  return uniqueTerms([location.name, ...(location.lookupTerms ?? [])]);
}

for (const location of UVA_PICKUP_LOCATIONS) {
  for (const term of getLocationLookupTerms(location)) {
    byLookupTerm.set(term, location);
  }
}

export const FEATURED_PICKUP_LOCATIONS = FEATURED_PICKUP_LOCATION_IDS.map((id) => byId.get(id)).filter(
  (location): location is CampusPickupLocation => Boolean(location)
);

function getLocationBasePriority(location: CampusPickupLocation) {
  const community = getCampusPickupCommunityMeta(location);
  const group = getCampusPickupLocationGroupMeta(location);

  return (
    location.priority +
    (location.isPublicSafeSpot ? 28 : 0) +
    (community?.priority ?? 0) * 0.12 +
    (group?.priority ?? 0) * 0.1
  );
}

function getLocationMatchScore(location: CampusPickupLocation, normalizedQuery: string) {
  if (!normalizedQuery) {
    return getLocationBasePriority(location);
  }

  const primaryTerms = getLocationPrimaryTerms(location);
  const secondaryTerms = getLocationSecondaryTerms(location);
  const joined = [...primaryTerms, ...secondaryTerms].join(" ");
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const term of primaryTerms) {
    if (term === normalizedQuery) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 640);
      continue;
    }

    if (term.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 420);
      continue;
    }

    if (normalizedQuery.startsWith(term)) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 280);
      continue;
    }

    if (term.includes(normalizedQuery) || normalizedQuery.includes(term)) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 220);
    }
  }

  for (const term of secondaryTerms) {
    if (term === normalizedQuery) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 135);
      continue;
    }

    if (term.startsWith(normalizedQuery) || term.includes(normalizedQuery) || normalizedQuery.includes(term)) {
      bestScore = Math.max(bestScore, getLocationBasePriority(location) + 72);
    }
  }

  if (queryTokens.length > 1 && queryTokens.every((token) => joined.includes(token))) {
    bestScore = Math.max(bestScore, getLocationBasePriority(location) + 210);
  }

  return bestScore;
}

function compareLocationsByUsefulness(a: CampusPickupLocation, b: CampusPickupLocation) {
  const priorityDiff = getLocationBasePriority(b) - getLocationBasePriority(a);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return a.name.localeCompare(b.name);
}

export function normalizePickupLocationValue(value: string) {
  const normalized = collapseWhitespace(value);
  const known = getCampusPickupLocation(normalized);
  return known?.name ?? normalized;
}

export function getCampusPickupLocation(value: string) {
  const normalized = normalizeSearchToken(value);
  if (!normalized) {
    return null;
  }

  return byName.get(collapseWhitespace(value).toLowerCase()) ?? byLookupTerm.get(normalized) ?? null;
}

export function getCampusPickupLocationById(id: string) {
  return byId.get(id) ?? null;
}

export function getCampusPickupCommunityById(id: CampusPickupCommunityId) {
  return communityById.get(id) ?? null;
}

export function getCampusPickupLocationGroupById(id: CampusPickupLocationGroupId) {
  return groupById.get(id) ?? null;
}

export function getCampusPickupCommunity(value: string | CampusPickupLocation) {
  const location = typeof value === "string" ? getCampusPickupLocation(value) : value;
  if (!location) {
    return null;
  }

  return getCampusPickupCommunityById(location.communityId);
}

export function getCampusPickupLocationGroup(value: string | CampusPickupLocation) {
  const location = typeof value === "string" ? getCampusPickupLocation(value) : value;
  if (!location) {
    return null;
  }

  return getCampusPickupLocationGroupById(location.groupId);
}

export function isKnownCampusPickupLocation(value: string) {
  return Boolean(getCampusPickupLocation(value));
}

export function searchCampusPickupLocations(query: string) {
  const normalized = normalizeSearchToken(query);

  if (!normalized) {
    return [...UVA_PICKUP_LOCATIONS].sort(compareLocationsByUsefulness);
  }

  return UVA_PICKUP_LOCATIONS.filter((location) => getLocationMatchScore(location, normalized) > Number.NEGATIVE_INFINITY).sort(
    (a, b) => getLocationMatchScore(b, normalized) - getLocationMatchScore(a, normalized)
  );
}

export function getPickupLocationMapHref(value: string) {
  const known = getCampusPickupLocation(value);
  if (known) {
    const query = known.mapsQuery ?? `${known.name} ${known.area} Charlottesville VA`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const normalized = collapseWhitespace(value);
  if (!normalized) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${normalized} Charlottesville VA`)}`;
}

export function getPickupLocationPublicLabel(value: string) {
  return getCampusPickupLocation(value)?.publicLabel ?? value;
}

export function getPickupLocationShortLabel(value: string) {
  return getCampusPickupLocation(value)?.shortLabel ?? value;
}

export function getPickupLocationArea(value: string) {
  return getCampusPickupLocation(value)?.area ?? null;
}

export function getPickupLocationContextLabel(value: string) {
  const known = getCampusPickupLocation(value);
  if (!known) {
    return null;
  }

  const community = getCampusPickupCommunity(known);
  const group = getCampusPickupLocationGroup(known);
  const parts = [community?.name ?? null, group?.name ?? null].filter((part, index, array) => Boolean(part) && array.indexOf(part) === index);

  return parts.length ? parts.join(" · ") : known.area;
}

export function getKnownCampusPickupLocations(values: string[]) {
  const seen = new Set<string>();
  const locations: CampusPickupLocation[] = [];

  for (const value of values) {
    const known = getCampusPickupLocation(value);
    if (known && !seen.has(known.id)) {
      seen.add(known.id);
      locations.push(known);
    }
  }

  return locations;
}

export function getCampusMapCenterForValues(values: string[]) {
  const known = getKnownCampusPickupLocations(values);
  if (known.length === 0) {
    return DEFAULT_CAMPUS_MAP_CENTER;
  }

  const latitude = known.reduce((sum, location) => sum + location.latitude, 0) / known.length;
  const longitude = known.reduce((sum, location) => sum + location.longitude, 0) / known.length;

  return { latitude, longitude };
}
