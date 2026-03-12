import { Category, Condition, ListingStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    name: "Ava Carter",
    username: "avacarter",
    email: "ava@virginia.edu",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "Fourth-year in Comm. Always rotating wardrobe pieces.",
    gradYear: 2026,
    favoritePickup: "The Corner",
    instagram: "@ava.on.grounds"
  },
  {
    name: "Malik Johnson",
    username: "malikj",
    email: "malik@virginia.edu",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "CS + design. I sell clean tech and desk setup gear.",
    gradYear: 2027,
    favoritePickup: "Rice Hall",
    instagram: "@malikj.dev"
  },
  {
    name: "Leah Kim",
    username: "leahkim",
    email: "leah@mail.virginia.edu",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "Nursing student. Selling dorm and textbook staples.",
    gradYear: 2028,
    favoritePickup: "Newcomb",
    instagram: "@leah.ki"
  },
  {
    name: "Noah Patel",
    username: "noahp",
    email: "noah@virginia.edu",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "Econ + club soccer. Tickets and streetwear drops.",
    gradYear: 2026,
    favoritePickup: "Scott Stadium",
    instagram: "@nopatelszn"
  },
  {
    name: "Sofia Ruiz",
    username: "sofiar",
    email: "sofia@virginia.edu",
    image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "Architecture student with cozy room finds.",
    gradYear: 2027,
    favoritePickup: "Clemons",
    instagram: "@sofiaroomedits"
  },
  {
    name: "Ethan Walker",
    username: "ethanw",
    email: "ethan@virginia.edu",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&w=400&h=400&q=80",
    bio: "Third-year engineering. Quick response, fair prices.",
    gradYear: 2028,
    favoritePickup: "JPJ",
    instagram: "@ethanwkr"
  }
];

const listingSeeds = [
  {
    title: "Mini Fridge + Freezer Shelf",
    description: "Perfect for dorm move-in. Clean, cold, and quiet. Fits under lofted bed and still leaves room for storage.",
    priceCents: 9000,
    category: Category.DORM,
    condition: Condition.GOOD,
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616628182509-6f4f5f4ac2ff?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Newcomb", "The Corner"],
    meetupNotes: "Can meet after 4pm near Newcomb bus stop.",
    seller: "leah@mail.virginia.edu"
  },
  {
    title: "iClicker 2 + Batteries",
    description: "Works perfectly, used in STAT 2120 last semester. Batteries included.",
    priceCents: 2600,
    category: Category.TEXTBOOKS,
    condition: Condition.LIKE_NEW,
    images: [
      "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Pavilion", "Newcomb"],
    meetupNotes: "Quick handoff between classes.",
    seller: "ava@virginia.edu"
  },
  {
    title: "Patagonia Better Sweater (M)",
    description: "Navy with orange trim, classic Grounds layering piece. No stains.",
    priceCents: 6200,
    category: Category.STREETWEAR,
    condition: Condition.GOOD,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["The Corner", "Pavilion"],
    meetupNotes: "Meet at Trin if easier.",
    seller: "noah@virginia.edu"
  },
  {
    title: "Barbour Waxed Jacket (S)",
    description: "Vintage olive Barbour, iconic for football Saturdays. Recently rewaxed.",
    priceCents: 14500,
    category: Category.STREETWEAR,
    condition: Condition.GOOD,
    images: [
      "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Scott Stadium", "The Corner"],
    meetupNotes: "Usually around Scott lot on weekends.",
    seller: "sofia@virginia.edu"
  },
  {
    title: "AirPods Pro (Gen 1)",
    description: "Still great battery life, includes charging case + extra ear tips.",
    priceCents: 8900,
    category: Category.TECH,
    condition: Condition.GOOD,
    images: [
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Rice Hall", "Clemons"],
    meetupNotes: "Can demo sound quality in person.",
    seller: "malik@virginia.edu"
  },
  {
    title: "Desk Lamp + USB Port",
    description: "Warm + cool light modes. Great for late-night study sessions.",
    priceCents: 1800,
    category: Category.DORM,
    condition: Condition.LIKE_NEW,
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Clemons", "Newcomb"],
    meetupNotes: "Can meet in Clemons lobby.",
    seller: "sofia@virginia.edu"
  },
  {
    title: "MATH 1210 + ECON 2010 Textbooks",
    description: "Bundle of required texts, lightly highlighted. Saves you serious money.",
    priceCents: 4500,
    category: Category.TEXTBOOKS,
    condition: Condition.FAIR,
    images: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80"
    ],
    pickupLocations: ["Pavilion", "Newcomb"],
    meetupNotes: "Drop at Clark Hall courtyard.",
    seller: "ethan@virginia.edu"
  },
  {
    title: "North Face Puffer (L)",
    description: "Black puffer, super warm, excellent for winter walks to class.",
    priceCents: 7800,
    category: Category.STREETWEAR,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "Newcomb"],
    meetupNotes: "Can meet after 6pm.",
    seller: "ava@virginia.edu"
  },
  {
    title: "Monitor 24in + HDMI",
    description: "Crisp display for coding and Netflix. No dead pixels.",
    priceCents: 6500,
    category: Category.TECH,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Rice Hall", "JPJ"],
    meetupNotes: "Bring a tote; easy carry.",
    seller: "malik@virginia.edu"
  },
  {
    title: "Virginia Basketball Lower Bowl Ticket",
    description: "Single ticket for this weekend game. Section 109. Instant mobile transfer.",
    priceCents: 7000,
    category: Category.TICKETS,
    condition: Condition.NEW,
    images: ["https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["JPJ", "The Corner"],
    meetupNotes: "Transfer after Venmo at meetup.",
    seller: "noah@virginia.edu"
  },
  {
    title: "Dorm Rug 5x7 (Cream)",
    description: "Neutral rug, no pet damage, steam-cleaned before posting.",
    priceCents: 3200,
    category: Category.DORM,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Alumni Hall", "Newcomb"],
    meetupNotes: "Can roll it and bring to Newcomb.",
    seller: "leah@mail.virginia.edu"
  },
  {
    title: "Mac Keyboard + Mouse Bundle",
    description: "Apple Magic Keyboard and Magic Mouse. Works flawlessly.",
    priceCents: 9900,
    category: Category.TECH,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Rice Hall", "Pavilion"],
    meetupNotes: "Evenings only.",
    seller: "ethan@virginia.edu"
  },
  {
    title: "Polaroid Camera + Film Pack",
    description: "For game days and formals. One unopened film pack included.",
    priceCents: 5400,
    category: Category.MISC,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "Newcomb"],
    meetupNotes: "Can show sample prints.",
    seller: "sofia@virginia.edu"
  },
  {
    title: "Lululemon Belt Bag (Black)",
    description: "On-trend and perfect for game day essentials.",
    priceCents: 2800,
    category: Category.STREETWEAR,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "JPJ"],
    meetupNotes: "Fast pickup near Boylan.",
    seller: "ava@virginia.edu"
  },
  {
    title: "Chem Lab Coat + Goggles",
    description: "Used one semester. Cleaned and ready for next lab section.",
    priceCents: 2100,
    category: Category.TEXTBOOKS,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1579165466741-7f35e4755660?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Newcomb", "Pavilion"],
    meetupNotes: "Can meet right before CHEM lab blocks.",
    seller: "leah@mail.virginia.edu"
  },
  {
    title: "Sony WH-1000XM4 Headphones",
    description: "Noise canceling legend. Includes case and charger.",
    priceCents: 13000,
    category: Category.TECH,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Rice Hall", "The Corner"],
    meetupNotes: "Can test ANC in person.",
    seller: "malik@virginia.edu"
  },
  {
    title: "Dorm Standing Mirror",
    description: "Full length mirror with wood frame. No chips or cracks.",
    priceCents: 3500,
    category: Category.DORM,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1616594039964-3dfdb59ca1c7?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Alumni Hall", "Newcomb"],
    meetupNotes: "Need help carrying from parking lot.",
    seller: "sofia@virginia.edu"
  },
  {
    title: "Vintage UVA Crewneck (XL)",
    description: "Thrifted at Darling. Heavyweight and faded just right.",
    priceCents: 4200,
    category: Category.STREETWEAR,
    condition: Condition.WELL_LOVED,
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "Scott Stadium"],
    meetupNotes: "Game day meetup preferred.",
    seller: "noah@virginia.edu"
  },
  {
    title: "Desk Chair Ergonomic",
    description: "Mesh back + adjustable height. Good support for long study sessions.",
    priceCents: 7300,
    category: Category.DORM,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1582582429416-5e1f4f0b4b5f?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Newcomb", "Pavilion"],
    meetupNotes: "Can disassemble for easier transport.",
    seller: "ethan@virginia.edu"
  },
  {
    title: "Graphing Calculator TI-84 Plus",
    description: "Required for several intro classes. Fresh batteries.",
    priceCents: 5600,
    category: Category.TEXTBOOKS,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1631635589499-afd87d52bf64?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Pavilion", "Newcomb"],
    meetupNotes: "Midday pickups easiest.",
    seller: "ava@virginia.edu"
  },
  {
    title: "Beat-up but Working Skateboard",
    description: "Great campus cruiser. Wheels recently replaced.",
    priceCents: 2400,
    category: Category.MISC,
    condition: Condition.WELL_LOVED,
    images: ["https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "Newcomb"],
    meetupNotes: "Test ride allowed.",
    seller: "ethan@virginia.edu"
  },
  {
    title: "UVA Baseball Ticket Pair",
    description: "Two seats together for Friday night game. Student section.",
    priceCents: 2600,
    category: Category.TICKETS,
    condition: Condition.NEW,
    images: ["https://images.unsplash.com/photo-1521417531039-98928bf09f22?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Scott Stadium", "The Corner"],
    meetupNotes: "Transfer through Ticketmaster at meetup.",
    seller: "noah@virginia.edu"
  },
  {
    title: "Portable Projector",
    description: "Movie nights in the dorm made easy. HDMI included.",
    priceCents: 8800,
    category: Category.TECH,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Rice Hall", "Clemons"],
    meetupNotes: "Can preview image quality onsite.",
    seller: "malik@virginia.edu"
  },
  {
    title: "UVA Flag + LED Strip Bundle",
    description: "Classic first-year room setup starter pack.",
    priceCents: 2000,
    category: Category.DORM,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Alumni Hall", "Newcomb"],
    meetupNotes: "Flexible pickup times.",
    seller: "leah@mail.virginia.edu"
  },
  {
    title: "Canon DSLR Starter Kit",
    description: "Camera body + lens + strap. Great for club content creators.",
    priceCents: 22500,
    category: Category.TECH,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Newcomb", "Pavilion"],
    meetupNotes: "Can show shutter count and sample images.",
    seller: "sofia@virginia.edu"
  },
  {
    title: "Concert Ticket: Student Band Night",
    description: "One digital pass for Saturday show at The Southern.",
    priceCents: 1800,
    category: Category.TICKETS,
    condition: Condition.NEW,
    images: ["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner"],
    meetupNotes: "Transfer in person preferred.",
    seller: "ava@virginia.edu"
  },
  {
    title: "IKEA Kallax 2x2 Shelf",
    description: "Great condition with two fabric bins. Fits books and sneakers.",
    priceCents: 4000,
    category: Category.DORM,
    condition: Condition.GOOD,
    images: ["https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["Alumni Hall", "Newcomb"],
    meetupNotes: "SUV recommended for pickup.",
    seller: "ethan@virginia.edu"
  },
  {
    title: "Arc'teryx Beanie",
    description: "Soft + warm. Minimal wear, authentic.",
    priceCents: 3000,
    category: Category.STREETWEAR,
    condition: Condition.LIKE_NEW,
    images: ["https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1200&q=80"],
    pickupLocations: ["The Corner", "JPJ"],
    meetupNotes: "Usually around Clemons afternoons.",
    seller: "noah@virginia.edu"
  }
];

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.report.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.user.deleteMany();

  const userMap = new Map<string, string>();

  for (const user of users) {
    const created = await prisma.user.create({ data: user });
    userMap.set(user.email, created.id);
  }

  const createdListings = [] as { id: string; sellerId: string }[];

  for (const [index, listing] of listingSeeds.entries()) {
    const sellerId = userMap.get(listing.seller);
    if (!sellerId) continue;

    const created = await prisma.listing.create({
      data: {
        title: listing.title,
        description: listing.description,
        priceCents: listing.priceCents,
        category: listing.category,
        condition: listing.condition,
        images: listing.images,
        pickupLocations: listing.pickupLocations,
        meetupNotes: listing.meetupNotes,
        sellerId,
        status: index % 11 === 0 ? ListingStatus.SOLD : ListingStatus.ACTIVE,
        createdAt: new Date(Date.now() - index * 1000 * 60 * 60 * 4)
      }
    });

    createdListings.push({ id: created.id, sellerId });
  }

  const allUsers = await prisma.user.findMany();
  const recentCutoff = Date.now() - 72 * 60 * 60 * 1000;

  for (let i = 0; i < createdListings.length; i += 1) {
    const listing = createdListings[i];

    for (let j = 0; j < allUsers.length; j += 1) {
      const user = allUsers[j];
      if (user.id === listing.sellerId) continue;

      const shouldFavorite = (i + j) % 3 === 0 || i % 5 === 0;
      if (!shouldFavorite) continue;

      await prisma.favorite.create({
        data: {
          listingId: listing.id,
          userId: user.id,
          createdAt: new Date(recentCutoff + ((i + j * 17) % (70 * 60)) * 60 * 1000)
        }
      });
    }
  }

  const buyer = allUsers.find((u) => u.email === "ava@virginia.edu");
  const seller = allUsers.find((u) => u.email === "malik@virginia.edu");
  const listing = createdListings.find((item) => item.sellerId === seller?.id);

  if (buyer && seller && listing) {
    const convo = await prisma.conversation.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        listingId: listing.id
      }
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: convo.id,
          senderId: buyer.id,
          body: "Hey! Is this still available for pickup near Rice Hall?",
          createdAt: new Date(Date.now() - 1000 * 60 * 45)
        },
        {
          conversationId: convo.id,
          senderId: seller.id,
          body: "Yep, still available. I can meet around 3:30pm.",
          createdAt: new Date(Date.now() - 1000 * 60 * 40),
          readAt: new Date(Date.now() - 1000 * 60 * 38)
        },
        {
          conversationId: convo.id,
          senderId: buyer.id,
          body: "Perfect, I will be outside Rice Hall main entrance.",
          createdAt: new Date(Date.now() - 1000 * 60 * 32),
          readAt: new Date(Date.now() - 1000 * 60 * 30)
        }
      ]
    });
  }

  const buyerTwo = allUsers.find((u) => u.email === "noah@virginia.edu");
  const sellerTwo = allUsers.find((u) => u.email === "sofia@virginia.edu");
  const listingTwo = createdListings.find((item) => item.sellerId === sellerTwo?.id);

  if (buyerTwo && sellerTwo && listingTwo) {
    const convo2 = await prisma.conversation.create({
      data: {
        buyerId: buyerTwo.id,
        sellerId: sellerTwo.id,
        listingId: listingTwo.id
      }
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: convo2.id,
          senderId: buyerTwo.id,
          body: "Could you do $120 if I pick up at The Corner tonight?",
          createdAt: new Date(Date.now() - 1000 * 60 * 80)
        },
        {
          conversationId: convo2.id,
          senderId: sellerTwo.id,
          body: "I can do $130 and include the garment bag.",
          createdAt: new Date(Date.now() - 1000 * 60 * 74)
        }
      ]
    });
  }

  console.log(`Seeded ${users.length} users and ${createdListings.length} listings.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
