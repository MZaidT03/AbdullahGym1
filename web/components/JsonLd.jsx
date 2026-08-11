// JSON-LD Structured Data — Server Component (no "use client")
// Injects LocalBusiness, FAQPage, BreadcrumbList, and WebSite schemas for Google rich results

const SITE_URL = "https://abdullahgym1.online";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["HealthClub", "SportsActivityLocation"],
  "@id": `${SITE_URL}/#gym`,
  name: "Abdullah Gym 1",
  alternateName: [
    "Abdullah Gym 1 Gujranwala",
    "Abdullah Gym 1 Ladies & Gents",
    "Abdullah Gym Sialkot Road",
    "Abdullah Gym Jagna Bazar",
    "Abdullah Gym Rajput Colony",
  ],
  description:
    "Best Ladies & Gents Fitness Center in Gujranwala. Separate dedicated shifts ensure 100% privacy, certified personal trainers, weight training, cardio, bodybuilding, and custom diet & nutrition plans. Located on Sialkot Road near Jagna Bazar, Rajput Colony, Gujranwala.",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/icons/logo.png`,
  image: `${SITE_URL}/assets/icons/logo.png`,
  telephone: ["+923007748282", "+923233536378"],
  email: "abdullahgym521@gmail.com",
  priceRange: "$$",
  currenciesAccepted: "PKR",
  paymentAccepted: "Cash",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Sialkot Road near Jagna Bazar, Rajput Colony",
    addressLocality: "Gujranwala",
    addressRegion: "Punjab",
    postalCode: "52250",
    addressCountry: "PK",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 32.1734,
    longitude: 74.1885,
  },
  areaServed: [
    {
      "@type": "City",
      name: "Gujranwala",
    },
  ],
  serviceArea: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: 32.1734,
      longitude: 74.1885,
    },
    geoRadius: "15000",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      ],
      opens: "10:00",
      closes: "13:00",
      description: "Ladies Dedicated Shift — 100% Private",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      ],
      opens: "16:00",
      closes: "23:00",
      description: "Gents Dedicated Shift",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    bestRating: "5",
    worstRating: "1",
    ratingCount: "47",
    reviewCount: "47",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Ammad" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Best gym in Gujranwala. Training under Rana Irfan (Mr. Champion) completely changed my posture, strength, and confidence. Top-notch equipment!",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Talha" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Personalized workout and diet plans from Rana Ibrar really work. The gym atmosphere and motivation keep me coming every single day!",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Ahmed" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Super clean gym, separate shifts for ladies and gents — complete peace of mind for families. Highly recommended!",
    },
  ],
  offers: [
    {
      "@type": "Offer",
      name: "Gym Membership — Ladies Shift",
      description: "Monthly membership for the dedicated ladies-only shift with certified female trainers. 100% private environment.",
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#gym` },
    },
    {
      "@type": "Offer",
      name: "Gym Membership — Gents Shift",
      description: "Monthly membership for the gents shift with access to full powerlifting, cardio, and personal coaching.",
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#gym` },
    },
    {
      "@type": "Offer",
      name: "Personal Training Package",
      description: "1-on-1 coaching sessions with certified master trainers Rana Irfan and Rana Ibrar.",
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#gym` },
    },
  ],
  sameAs: [
    "https://www.facebook.com/share/1BxrUQMroM/?mibextid=wwXIfr",
    "https://www.tiktok.com/@abdullah.gym1snooker.cl0?_r=1&_t=ZS-98lDJith0bw",
    "https://www.instagram.com/aabdullahspliment?igsh=bWFwcTNrc3lmazk5",
  ],
  hasMap: "https://www.google.com/maps/search/?api=1&query=Abdullah+Gym+1+%26+Snooker+Club,+56Q5%2B69G,+Rajput+Colony+Gujranwala,+Pakistan",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Separate Ladies Section", value: true },
    { "@type": "LocationFeatureSpecification", name: "100% Private Ladies Environment", value: true },
    { "@type": "LocationFeatureSpecification", name: "Separate Gents Section", value: true },
    { "@type": "LocationFeatureSpecification", name: "Certified Personal Trainers", value: true },
    { "@type": "LocationFeatureSpecification", name: "Female Personal Trainers", value: true },
    { "@type": "LocationFeatureSpecification", name: "Weight Training Equipment", value: true },
    { "@type": "LocationFeatureSpecification", name: "Powerlifting & Free Weights", value: true },
    { "@type": "LocationFeatureSpecification", name: "Cardio Equipment", value: true },
    { "@type": "LocationFeatureSpecification", name: "Custom Diet Plans", value: true },
    { "@type": "LocationFeatureSpecification", name: "Sports Nutrition Plans", value: true },
    { "@type": "LocationFeatureSpecification", name: "Private Changing Rooms", value: true },
    { "@type": "LocationFeatureSpecification", name: "Bodybuilding Programs", value: true },
    { "@type": "LocationFeatureSpecification", name: "Beginner Friendly", value: true },
  ],
  employee: [
    {
      "@type": "Person",
      name: "Rana Irfan",
      jobTitle: "Founder & Head Master Coach",
      description: "Mr. Champion Gujranwala — 20+ years experience in bodybuilding, strength training, and contest prep.",
      worksFor: { "@id": `${SITE_URL}/#gym` },
    },
    {
      "@type": "Person",
      name: "Rana Ibrar",
      jobTitle: "Co-Founder & Master Trainer",
      description: "5+ years experience in personalized fitness coaching, hypertrophy, weight loss, and custom diet plans.",
      worksFor: { "@id": `${SITE_URL}/#gym` },
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Fitness Services",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Weight Training" },
      { "@type": "OfferCatalog", name: "Cardio Training" },
      { "@type": "OfferCatalog", name: "Personal Training" },
      { "@type": "OfferCatalog", name: "Bodybuilding Programs" },
      { "@type": "OfferCatalog", name: "Diet & Nutrition Plans" },
      { "@type": "OfferCatalog", name: "Ladies Fitness Classes" },
      { "@type": "OfferCatalog", name: "Powerlifting Training" },
      { "@type": "OfferCatalog", name: "Fat Loss Programs" },
    ],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are the gym shift timings at Abdullah Gym 1 Gujranwala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Abdullah Gym 1 operates in dedicated gender shifts every day of the week. The Ladies Shift runs from 10:00 AM to 01:00 PM, and the Gents Shift runs from 04:00 PM to 11:00 PM — 7 days a week.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a ladies gym in Gujranwala with privacy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Abdullah Gym 1 offers a 100% private ladies-only shift from 10:00 AM to 01:00 PM with zero male presence, certified female personal trainers, and private changing facilities.",
      },
    },
    {
      "@type": "Question",
      name: "Where is Abdullah Gym 1 located in Gujranwala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Abdullah Gym 1 is located on Sialkot Road near Jagna Bazar, Rajput Colony, Gujranwala, Punjab, Pakistan. Plus Code: 56Q5+69G.",
      },
    },
    {
      "@type": "Question",
      name: "How much are the gym membership fees at Abdullah Gym 1?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Membership fees vary depending on your plan and goals. Contact us on WhatsApp at 0320-8313000 or visit our gym at Rajput Colony, Gujranwala for current packages and special discount offers.",
      },
    },
    {
      "@type": "Question",
      name: "Are personal trainers available at Abdullah Gym 1?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Certified master coaches are on the floor every day. Founder Rana Irfan (Mr. Champion Gujranwala, 20+ years experience) and Co-Founder Rana Ibrar provide 1-on-1 coaching, form corrections, and customized workout regimens.",
      },
    },
    {
      "@type": "Question",
      name: "Is Abdullah Gym 1 suitable for beginners?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely! We welcome members of all fitness levels. Our trainers introduce you to all equipment, design a beginner-friendly workout routine, and track your progress step-by-step.",
      },
    },
    {
      "@type": "Question",
      name: "Does Abdullah Gym 1 provide diet and nutrition plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Customized meal and sports nutrition plans are crafted by our fitness experts for fat loss, lean muscle gain, or powerlifting competition prep.",
      },
    },
    {
      "@type": "Question",
      name: "What is the contact number of Abdullah Gym 1 Gujranwala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Contact Abdullah Gym 1 via WhatsApp at 0320-8313000, or call 0300-7748282 or 0323-3536378. Email: abdullahgym521@gmail.com.",
      },
    },
    {
      "@type": "Question",
      name: "Does Abdullah Gym 1 have separate facilities for males and females?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Completely separate dedicated shifts: Ladies (10 AM – 1 PM) and Gents (4 PM – 11 PM). Each shift has its own certified trainers and private changing facilities.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home — Abdullah Gym 1 Gujranwala", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "About Us", item: `${SITE_URL}/#about` },
    { "@type": "ListItem", position: 3, name: "Services", item: `${SITE_URL}/#services` },
    { "@type": "ListItem", position: 4, name: "Timings & Privacy", item: `${SITE_URL}/#timings` },
    { "@type": "ListItem", position: 5, name: "Our Trainers", item: `${SITE_URL}/#trainers` },
    { "@type": "ListItem", position: 6, name: "Gallery", item: `${SITE_URL}/#gallery` },
    { "@type": "ListItem", position: 7, name: "Location", item: `${SITE_URL}/#location` },
    { "@type": "ListItem", position: 8, name: "FAQ", item: `${SITE_URL}/#faq` },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Abdullah Gym 1 — Best Gym in Gujranwala",
  url: SITE_URL,
  description:
    "Best Ladies & Gents Fitness Center in Gujranwala — Sialkot Road near Jagna Bazar, Rajput Colony.",
  publisher: { "@id": `${SITE_URL}/#gym` },
  inLanguage: "en-PK",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

