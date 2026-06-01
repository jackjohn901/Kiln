export interface ArtistSeries {
  name: string;
  years: string;
  description: string;
}

export interface ArtistVideo {
  id: string;
  title: string;
}

export interface ArtistImage {
  url: string;
  caption: string;
}

export interface Artist {
  id: string;
  name: string;
  born: string | null;
  nationality: string;
  location: string;
  medium: string;
  tagline: string;
  quote: string | null;
  bio: string;
  artistStatement: string | null;
  concepts: string[];
  series: ArtistSeries[];
  collections: string[];
  videos: ArtistVideo[];
  images: ArtistImage[];
  website: string | null;
  instagram: string | null;
  habatat: string;
  keywords: string[];
}

export const artists: Artist[] = [
  {
    id: "alex-bernstein",
    name: "Alex Bernstein",
    born: "1972",
    nationality: "American",
    location: "Asheville, North Carolina, USA",
    medium: "Cast, Carved & Polished Glass",
    tagline: "Color, Form, and Optical Complexity",
    quote: "Exploration of new ideas is what drives my passion. Whether it's texture, surface, color, opacity and translucency — these are the words I use to tell the stories that are my sculptures.",
    bio: "Alex Gabriel Bernstein grew up in a creative environment with access to many of the artists of the American studio glass movement. As the child of two established glass artists, William and Katherine Bernstein, the beautiful surroundings of the Blue Ridge Mountains in Western North Carolina played almost as much of a part in his inspired upbringing as did the breadth of teachers around him. Alex studied psychology at the University of North Carolina in Asheville and worked at a children's psychiatric hospital before making the decision to pursue his artistic endeavors full time. He received a Master of Fine Arts from the Rochester Institute of Technology's School for American Crafts and went on to teach at the Rochester Institute of Technology, the Cleveland Institute of Art, the Penland School of Crafts, and The Studio at the Corning Museum of Glass. Most recently Alex was the Department Head of Glass at the Worcester Center for Crafts in Massachusetts, but he made the decision to return to his hometown, Asheville, NC, in 2007 to set up a studio and focus on creating his own work full-time. Bernstein has mounted solo shows at Chappell Gallery in NYC, Hooks Epstein Gallery in Houston, Habatat Gallery in Royal Oak, and the William Traver Gallery in Seattle.",
    artistStatement: "Bernstein skillfully combines metaphor with the power and sensuality of sculpted glass. His cast, carved and polished glass sculptures provide the viewer with intimate narrative landscapes, drawn from light, form and color. The forms of his pieces — as well as the techniques he uses to work the glass — mirror processes in nature, such as oxidation, erosion, growth and decay. As a result, many of his pieces evoke images of flowing water, ice crystals, mountain peaks and jagged canyons — all structures that seem solid and unyielding, but are actually in constant flux.",
    concepts: ["Optical depth", "Color as structure", "Internal light", "Sculptural weight", "Natural processes", "Erosion and growth", "Chromatic energy"],
    series: [
      { name: "Color Series", years: "2010–present", description: "Vibrant cast glass sculptures saturated with deep, luminous color. Amber, emerald, cobalt, and crimson forms that radiate warmth and movement from within the dense glass body. Each piece explores a single dominant hue, allowing light to animate the color from the inside out." },
      { name: "Optical Series", years: "2015–present", description: "Precisely engineered optical glass works — triangles, spheres, and cylinders — that create internal architectural systems of refracted light. Bernstein treats glass as a lens, engineering works whose interior lives shift entirely with the viewer's position." },
      { name: "Steel & Glass", years: "2008–2018", description: "Works combining cast and cut glass with fused steel elements, exploring the tension between the industrial roughness of rusted steel and the luminous precision of carved glass. 'An exquisitely cut geometric crystal sculpture set against a brutal, rusted steel backdrop.'" },
      { name: "Nature Forms", years: "2005–present", description: "Geological and organic abstractions — volcanic bursts, canyon walls, ice formations — cast in dense glass that captures the paradox of materials that appear frozen yet are in constant, geological flux." },
    ],
    collections: [
      "Corning Museum of Glass",
      "Glasmuseum Frauenau, Germany",
      "Mellon Financial Corporation",
      "Museum of Fine Arts, Boston",
      "Palm Springs Art Museum",
    ],
    videos: [
      { id: "nYorOV7sOW4", title: "Alex Gabriel Bernstein Glass Artist Presentation" },
      { id: "rgohJBBto-U", title: "Alex Bernstein — Glass Art Sculptures | Lahaina Galleries" },
      { id: "7xZfRTsNBos", title: "Alex Bernstein's Cast & Cut Glass with Fused Steel Sculptures" },
      { id: "lvOjWStv_Q0", title: "Alex Bernstein Glass Artist" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2025/07/Bernstein1.jpg", caption: "Recent Work — Habatat Galleries" },
    ],
    website: "https://alexbernsteinglass.com",
    instagram: "@alexbernsteinglass",
    habatat: "https://www.habatat.com/artist/32-alex-bernstein/",
    keywords: ["bernstein", "alex bernstein", "alex gabriel bernstein"],
  },

  {
    id: "lino-tagliapietra",
    name: "Lino Tagliapietra",
    born: "1934",
    nationality: "Italian",
    location: "Murano, Italy & Seattle, Washington, USA",
    medium: "Blown & Hotworked Glass",
    tagline: "World-Renowned Maestro of Venetian Glass",
    quote: "Glass is a material that never stops surprising me. After seventy years, it still has secrets.",
    bio: "Lino Tagliapietra was born in 1934 in Murano, Italy — an island whose glassmaking tradition stretches back to 1291. He became an apprentice glassblower at age 11, and even at a young age exhibited an immense dexterity for the medium. He was appointed the title of Maestro when he was just 21 years old. In 1979, Lino visited Seattle for the first time and introduced students at the Pilchuck Glass School to the traditions of Venetian glassblowing. This cross-cultural collaboration helped shape the identity of American studio glassblowing and offered Lino an opportunity to expand his artistic horizons internationally. Now with over 70 years of experience, the Maestro splits his time between Murano and Seattle, continuing to exercise his prodigious technical skill and creative experimentation — producing works that both inspire and amaze. His command of every major Venetian technique — murrine, filigrana, incalmo, battuto — is unmatched, and his influence on a generation of American glass artists is immeasurable.",
    artistStatement: null,
    concepts: ["Venetian mastery", "Breath and fire", "Organic gesture", "Heritage reimagined", "Murano tradition", "Technical transcendence", "Cross-cultural exchange"],
    series: [
      { name: "Dinosaur", years: "1997–present", description: "Sweeping horizontal forms with spotted murrine patterning that evoke ancient creatures and prehistoric color. The Dinosaur series is among Tagliapietra's most celebrated — its markings recall animal skin and natural camouflage, while the forms push the limits of blown glass scale." },
      { name: "Endeavour", years: "2004–present", description: "Elongated vessel forms with internal color gradients that reference space, sky, and the limits of human aspiration. Named for the spirit of exploration, the Endeavour series distills Tagliapietra's technical mastery into vessels of profound quietude." },
      { name: "Bilbao", years: "1999–2005", description: "Named for the Guggenheim Bilbao, this series features dynamic swirling forms with complex murrine patterns in primary palette tones. Works made in direct dialogue with Gehry's architectural icon." },
      { name: "Batman", years: "1995–2010", description: "Dramatically winged forms in deep black, cobalt, and gold — architectural and theatrical in their sweep. The Batman series uses the exaggerated silhouette of the bat wing as a vehicle for Murano's most demanding blown techniques." },
      { name: "Angel", years: "2006–present", description: "Delicate feathered forms in soft whites, golds, and pearl — suggesting celestial presence and the ethereal lightness that only the finest Venetian glassblowing can achieve." },
    ],
    collections: [
      "Smithsonian Institution",
      "Victoria & Albert Museum, London",
      "Corning Museum of Glass",
      "Metropolitan Museum of Art",
      "Seattle Art Museum",
    ],
    videos: [
      { id: "luU1mlCZc8U", title: "Glass Masters at Work: Lino Tagliapietra" },
      { id: "7qt8-5Vx1HA", title: "Large Blown Glass Piece Shatters — Rare Lino Tagliapietra Footage" },
      { id: "sWcwdlTqk2I", title: "Celebrating Lino Tagliapietra | The Maestro's Last Demonstration at The Museum" },
      { id: "knlD4-jWANE", title: "Lino Tagliapietra — Artist Profile" },
    ],
    images: [
      { url: "https://www.linotagliapietra.com/sites/default/files/styles/video_teaser/public/images/showrooms/lino-bio-1.jpg", caption: "Lino shaping a piece at the Museum of Glass, February 2020" },
      { url: "https://www.linotagliapietra.com/sites/default/files/styles/video_teaser/public/images/showrooms/lino-bio-2.jpg", caption: "Lino at work at the Museum of Glass, February 2020" },
      { url: "https://img.youtube.com/vi/luU1mlCZc8U/hqdefault.jpg", caption: "Glass Masters at Work" },
    ],
    website: "https://www.linotagliapietra.com",
    instagram: "@linotagliapietra",
    habatat: "https://www.habatat.com/artist/144-lino-tagliapietra/",
    keywords: ["tagliapietra", "lino", "lino tagliapietra"],
  },

  {
    id: "peter-bremers",
    name: "Peter Bremers",
    born: "1957",
    nationality: "Dutch",
    location: "Maastricht, Netherlands",
    medium: "Optical Cast Glass",
    tagline: "Light, Color, and the Architecture of Silence",
    quote: "Glass is light — this is what I always have been doing; playing with light.",
    bio: "Born in the old town of Maastricht in 1957, Peter developed an interest in fashion, interior decoration, architecture and design at an early age. It was not until his years at the Art Academy in his hometown that he developed a profound interest in sculptural art, finding a love for light and form through creating light-sculptures. Although expelled from the Academy in 1980 after four years of study, he kept making unique light sculptures and started exhibiting all over Europe. His work was published in several design books — until he happened to walk into a glassblowing workshop with Andries Copier and Willem and Bernard Heesen at the Jan van Eyck Academy. Mesmerized by the glowing light of hot glass at the end of a blowpipe, he immediately began investigating the possibilities of blown glass. In 1989, Lino Tagliapietra gave a workshop at the Gerrit Rietveld Academy in Amsterdam. Peter participated, and two of Peter's designs that Lino executed were purchased by the Kunst Museum in The Hague. He then went to work with Neil Wilkin in England, developing the graal technique and later double graal, resulting in many successful exhibits and his first book, Metamorphosis. A transformative voyage to the Antarctic in 2001 permanently shifted his practice toward the large-scale optical cast glass sculptures for which he is now internationally known.",
    artistStatement: "Peter considers himself always to have been working with light, color and form. The Antarctic voyage in 2001 opened his eyes to a world of light, colour and silence; ever since he has been trying to capture these sensations in optical glass, producing objects that contain entire interior landscapes: shifting prismatic hues, internal reflections, and depths that seem to exceed the physical limits of the material.",
    concepts: ["Captured light", "Geological time", "Arctic silence", "Prismatic depth", "Chromatic layering", "Interior landscape", "Light as subject"],
    series: [
      { name: "IceScapes", years: "2001–present", description: "Monumental optical glass works inspired by Peter's 2001 voyage to Antarctica — Arctic glaciers, icebergs, and frozen seas. The series began the day he stepped off the ship; the silence and the light of polar ice changed his work permanently." },
      { name: "Colors of the Sea", years: "2008–present", description: "Saturated optical works exploring the chromatic range of ocean water from turquoise shallows to abyssal blue-black. Each piece captures a different depth, temperature, and quality of sea light." },
      { name: "Metamorphosis", years: "1995–present", description: "The series that gave Bremers his first book — works documenting transformation: geological, biological, temporal. Forms caught mid-change, materials in transition between states, honoring the graal technique that originally made his name." },
      { name: "Bunnies", years: "2018–present", description: "Playful large-scale installations of cast glass rabbit forms, bringing optical complexity and humor into public and gallery spaces. An unexpected turn from the grandeur of the IceScapes series toward accessible, joyful presence." },
    ],
    collections: [
      "Kunst Museum, The Hague",
      "Glasmuseum Frauenau, Germany",
      "Corning Museum of Glass",
      "Museum of Arts and Design, New York",
      "Collections in 30+ countries",
    ],
    videos: [
      { id: "nLBpHh2opPk", title: "Peter Bremers — Bunnies Art Installation, Norfolk, USA" },
      { id: "6usn-ODghd0", title: "Conversation with Glass Sculptor Peter Bremers" },
      { id: "W6ISiDzU1Uo", title: "IM Exchange | Peter Bremers" },
      { id: "QAXjMcw_CLg", title: "Peter Bremers — Metamorphosis Glass" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2014/08/Dec-13-Stewart-peter-bremers.jpg", caption: "Peter Bremers — Habatat Galleries" },
    ],
    website: "https://peterbremers.com",
    instagram: "@peter_bremersglassart",
    habatat: "https://www.habatat.com/artist/40-peter-bremers/",
    keywords: ["bremers", "peter bremers"],
  },

  {
    id: "bertil-vallien",
    name: "Bertil Vallien",
    born: "1938",
    nationality: "Swedish",
    location: "Åfors, Sweden",
    medium: "Sand-Cast & Kiln-Cast Glass",
    tagline: "Mythology, Memory, and the Vessel",
    quote: "The boat is a symbol of life — the journey, the passage, the movement between worlds.",
    bio: "Erik Bertil Vallien was born on January 17, 1938, in Stockholm, Sweden. After studying at the Stockholm College of Arts, Crafts and Design, he spent two years in the United States, where encounters with Abstract Expressionism and Native American art would permanently shape his visual language. In 1963 he joined the Kosta Boda glassworks in Sweden, where he has remained as artistic director for over six decades. Vallien's glass works — primarily sand-cast and kiln-cast — rank among the most narratively powerful in the medium. His celebrated boat series, begun in the 1980s, draws on ancient symbolism: boats as vessels for the dead, for passage, for the journey between worlds. His cast head works are simultaneously archaeological and psychological — objects recovered from deep time, bearing the marks of what they have witnessed. Vallien's sculptures are held in the Smithsonian, the Corning Museum of Glass, the Metropolitan Museum of Art, and dozens of institutions across Scandinavia and Europe. He is considered the most significant Swedish artist working in glass.",
    artistStatement: null,
    concepts: ["Myth and memory", "The vessel", "Passage and journey", "Unconscious symbols", "Frozen narrative", "Archaeological time", "Nordic consciousness"],
    series: [
      { name: "Boat Series", years: "1982–present", description: "Sand-cast glass boats — some tiny, some monumental — that function as metaphysical vessels. Objects of passage and transition, drawing on ancient cultures' use of boats as symbols of the journey between life and death. The series that established Vallien's international reputation." },
      { name: "Head Series", years: "1990–present", description: "Cast glass heads with embedded imagery, text, and objects trapped inside the glass. Archaeological objects from an imagined past — bearing memory and narrative within their translucent mass. Each head seems to have survived something we cannot name." },
      { name: "Brain Works", years: "2005–present", description: "Dense optical cast glass brains — explorations of consciousness, thought, and the organ of imagination. The brain made visible, made precious, made of light." },
      { name: "Universe Series", years: "2010–present", description: "Works that look outward — cast glass forms referencing cosmic bodies, orbital paths, and the sublime scale of outer space. The universe internalized within a glass object you can hold in your hands." },
    ],
    collections: [
      "Smithsonian Institution",
      "Corning Museum of Glass",
      "Metropolitan Museum of Art",
      "Nationalmuseum, Stockholm",
      "Victoria & Albert Museum, London",
    ],
    videos: [
      { id: "NK0U6kgGxlc", title: "Guest Artist Lecture: Bertil Vallien" },
      { id: "e6sR2yZ6F_8", title: "Bertil Vallien — A True Art Glass Artist" },
      { id: "kqCZ1uN1P6Y", title: "Guest Artist Demonstration | Bertil Vallien & Kosta Boda: Passing Through" },
      { id: "hHuc6AnBVtk", title: "The Enigmatic Glass Art of Bertil Vallien" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2014/05/Vallien.jpg", caption: "Bertil Vallien — Habatat Galleries" },
    ],
    website: "https://www.kostaboda.com/bertil-vallien-artist",
    instagram: "@kostaboda",
    habatat: "https://www.habatat.com/artist/108-bertil-vallien/",
    keywords: ["vallien", "bertil", "bertil vallien"],
  },

  {
    id: "shelley-muzylowski-allen",
    name: "Shelley Muzylowski Allen",
    born: "1967",
    nationality: "Canadian",
    location: "Skagit County, Washington, USA",
    medium: "Flameworked & Sculpted Glass",
    tagline: "Nature Rendered in Fire and Glass",
    quote: "Muzylowski Allen creates contemplative vignettes in glass from her interaction and experience with her surroundings. Sumptuous coloring and textural surfaces of her forms inspire a powerful influence on human feeling.",
    bio: "Shelley Muzylowski Allen was born in Manitoba, Canada, and holds a BFA in Painting and Intaglio from the Emily Carr Institute of Art & Design in Vancouver. In 1998, Shelley worked with the William Morris sculpture team in Washington State as a glass-sculpting assistant, continuing through 2004. In 2005, she established a glass and sculpture studio with her husband, fellow artist Rik Allen, at their property in Skagit County, Washington. She has taught internationally at the Toyama Institute of Glass in Japan, Nuutajarvii Lasikyla in Finland, and the International Glass Festival in Stourbridge, England — as well as nationally at the Penland School of Craft, Pittsburgh Glass Center, and Pilchuck. In 2012, Shelley was a guest artist at Studio Salvadore in Murano, Italy, where she collaborated with Davide Salvadore on a series of large-scale sculptures. Her work has been exhibited at the Museum of Northwest Art, the San Juan Museum of Art, Blue Rain Gallery in Santa Fe and Scottsdale, Habatat Galleries, Traver Gallery in Seattle, and Schantz Galleries in Massachusetts.",
    artistStatement: "Using her background in painting and her understanding of anatomy, Muzylowski Allen creates contemplative vignettes in glass from her interaction and experience with her surroundings. Each piece begins with sustained observation of living creatures — their anatomy, their behavior, the quality of light through their feathers or skin — before that observation is translated into fire and glass.",
    concepts: ["Natural systems", "Precision and detail", "Organic beauty", "Fragility", "The living world", "Anatomical observation", "Flamework mastery"],
    series: [
      { name: "Insects & Arachnids", years: "1995–present", description: "Hyper-detailed flameworked insects — beetles, dragonflies, moths, spiders — rendered at magnified scale that reveals the extraordinary architecture of their forms. Works born from sustained anatomical study." },
      { name: "Marine Life", years: "2000–present", description: "Octopus, jellyfish, sea anemones, and other oceanic organisms captured with precise translucency and delicate color shifts that mimic living tissue and bioluminescence." },
      { name: "Birds", years: "2005–present", description: "Flameworked birds — hummingbirds, owls, corvids — with extraordinary feather detail and expressive poses. Informed by her collaboration with William Morris and years of drawing from life, these are among her most technically demanding works." },
      { name: "Murano Collaborations", years: "2012–present", description: "Large-scale sculptures made in collaboration with Davide Salvadore at Studio Salvadore in Murano — works that combine Shelley's flamework sensibility with the traditions and scale of Venetian hotglass." },
    ],
    collections: [
      "Museum of Northwest Art, La Conner, WA",
      "Corning Museum of Glass",
      "Private collections worldwide",
    ],
    videos: [
      { id: "lg7m3vZ5hy8", title: "Palley Glass Lecture: Shelley Muzylowski Allen — Color of Everything" },
      { id: "nchQ4OV3quI", title: "How Animals Inspire Glass Artist Shelley Muzylowski Allen" },
      { id: "5NDlrgERPWo", title: "Studio Demonstration | Shelley Muzylowski Allen" },
      { id: "A7QKZFlN7dM", title: "IM Exchange | Shelley Allen" },
    ],
    images: [
      { url: "https://www.muzylowski.com/wp-content/uploads/2019/04/shelley-muzylowski-allen-artist.jpg", caption: "Shelley Muzylowski Allen in her studio" },
      { url: "https://www.habatat.com/wp-content/uploads/2018/03/Allen-Shelley.jpg", caption: "Shelley Muzylowski Allen — Habatat Galleries" },
    ],
    website: "https://www.muzylowski.com",
    instagram: "@shelleymuzylowskiallen",
    habatat: "https://www.habatat.com/artist/25-shelley-muzylowski-allen/",
    keywords: ["shelley", "muzylowski", "allen", "shelley allen", "muzylowski allen"],
  },

  {
    id: "lucy-lyon",
    name: "Lucy Lyon",
    born: "1947",
    nationality: "American",
    location: "New Mexico, USA",
    medium: "Cast Glass",
    tagline: "Figurative Work of Extraordinary Intimacy",
    quote: "It holds the light, like the soul.",
    bio: "Lucy Lyon was born in 1947 in Colorado Springs, Colorado. She received her BA in Philosophy from Antioch College in Yellow Springs, Ohio in 1971. In the early 1970s, while living in New York City and working for the city's Parks Department, she discovered glass — and her path as an artist was set, though the journey was entirely self-directed. Lyon taught herself to work with glass over many years, developing an approach to cast figurative sculpture that is entirely her own. Her figures are among the most psychologically present in contemporary glass art. Working from life and from memory, she constructs intimate portraits and full figures in cast glass that seem to hold their breath — to contain something unsaid. The material serves her: glass's inherent translucency suggests skin, warmth, and inner light in ways no other material can. Her work is held in the Bergstrom-Mahler Museum of Glass, the Henry Ford Museum, the Imagine Museum in St. Petersburg, the New Bedford Museum of Glass, the Ringling Museum in Sarasota, and the Sandy Hook Memorial — among many others. Lyon works from her studio in New Mexico.",
    artistStatement: "I have always felt that, even though we are all meeting up with each other and interacting in twos or threes or crowds, each of us is essentially alone. That brings up a bit of melancholy but it also makes the individual unique and therefore very important. I started working in glass simply because it is a very seductive material. What interests me most is trying to convey the intellectual and emotional state of the individuals in my pieces, relying on subtle gestures, a turn of the head or twist of the hips, to express the figure's state of mind. I also am fascinated by the way people interact with one another.",
    concepts: ["Human form", "Emotional stillness", "Solitude", "Psychological presence", "The body in glass", "Subtle gesture", "Portraiture"],
    series: [
      { name: "Figurative Works", years: "1985–present", description: "Full and partial figure castings in dense glass that read simultaneously as sculpture and as intimate document. Lyon's figures carry specific psychological weight — they are particular people caught in particular states of feeling." },
      { name: "Two-Figure Works", years: "1995–present", description: "Pieces with more than one figure whose body language tells a story open to the viewer's interpretation — works that explore how people orbit each other even in their fundamental solitude." },
      { name: "Portrait Series", years: "2000–present", description: "Cast glass portrait heads and busts of extraordinary facial detail. The increased scale of recent years allows for more nuance of expression — a raised brow, a set jaw — that smaller work could never capture." },
      { name: "Sandy Hook Memorial", years: "2013", description: "A commissioned memorial work for the Sandy Hook community in Connecticut — among Lyon's most emotionally demanding and publicly significant pieces." },
    ],
    collections: [
      "Bergstrom-Mahler Museum of Glass, Neenah, WI",
      "Henry Ford Museum, Dearborn, MI",
      "Imagine Museum, St. Petersburg, FL",
      "New Bedford Museum of Glass, MA",
      "Ringling Museum, Sarasota, FL",
      "Sandy Hook Memorial, CT",
    ],
    videos: [
      { id: "dsPsAvnl5RY", title: "Morgan Peterson & Lucy Lyon & Trish Duggan — Artist Talk at Habatat Glass International" },
      { id: "3GnHzIQlIFQ", title: "Artist Lucy Lyon Talks About Her Piece 'Student'" },
      { id: "1BhY5quUY5A", title: "AACG Fired Up! — Lucy Lyon" },
      { id: "2jIvhOLnlo4", title: "Lucy Lyon: Artistic Research" },
    ],
    images: [
      { url: "https://lucylyonart.com/wp-content/uploads/2015/01/gfx-artist-statement.jpg", caption: "Lucy Lyon — Artist Statement Image" },
      { url: "https://www.habatat.com/wp-content/uploads/2014/05/LYON.jpg", caption: "Lucy Lyon — Habatat Galleries" },
    ],
    website: "https://lucylyonart.com",
    instagram: "@lucylyonart",
    habatat: "https://www.habatat.com/artist/74-lucy-lyon/",
    keywords: ["lucy lyon", "lyon"],
  },

  {
    id: "marta-klonowska",
    name: "Marta Klonowska",
    born: "1964",
    nationality: "Polish",
    location: "Warsaw, Poland / Düsseldorf, Germany",
    medium: "Leaded Glass Shard Sculpture",
    tagline: "Animals of the Old Masters, Set Free in Glass",
    quote: "For me, art is a source of joy. I create 'playful worlds' which, I hope, will carry my viewers into a bizarre yet fascinating universe.",
    bio: "Marta Klonowska was born in Warsaw in 1964 and lives and works between Warsaw and Düsseldorf, Germany. She studied Fine Arts at the Academy of Fine Arts in Wrocław (1987–1989) and at the Kunstakademie Düsseldorf (1989–1995). Klonowska's technique is as unique as her vision: she constructs animal sculptures from hundreds of hand-cut shards of colored glass, lead-soldered together to form fur, feathers, and skin. The effect is simultaneously familiar and uncanny — animals that are recognizably animals, but caught between reality and material fiction. Often sourcing her subjects from Old Master paintings — animals depicted in hunting scenes, still lifes, and baroque allegories — Klonowska liberates these creatures from their pictorial context and gives them three-dimensional, glass-fleshed life. Her 'Lynx,' made in 2009, has its origins in a sketchbook by Albrecht Dürer — a lynx he sketched in the royal zoological garden of Emperor Charles V in Brussels during travels in 1520–1521. The tension between classical art history and her radically contemporary material constitutes the heart of her practice. Her work has been exhibited at the Toyama Glass Art Museum in Japan, across Europe, and in the United States.",
    artistStatement: "For me, art is a source of joy. Whether through experiencing it, or creating it. Art enriches our lives, renews the spirit, and in a larger sense, the spirit of humanity as well. The often concealed figures of animals, which play supporting roles in the images I choose, allow me to create my own world of art. That they are animals is in a sense a charade: each conceals a particular charm, a secret, an intriguing dynamic. For humans, animals are less obviously intelligible than human figures. Although they may seem merely 'playful,' these animals are for me abstract metaphors that generate emotion, atmosphere — but are less 'transparent' than human forms.",
    concepts: ["Art history reclaimed", "Fragmentation and assembly", "Animal energy", "Classical forms subverted", "Glass as fur", "Baroque influence", "Playful worlds"],
    series: [
      { name: "Dogs of the Old Masters", years: "2000–present", description: "Life-sized dogs extracted from paintings by Rubens, Velázquez, Snyders, and other Old Masters — reconstructed in three dimensions from hand-cut colored glass shards. Ruby red, cobalt blue, emerald green. 'Their edges are razor sharp.'" },
      { name: "After Dürer", years: "2009–present", description: "Animals traced to specific drawings and sketchbooks by Albrecht Dürer — including the celebrated Lynx, sourced from a Dürer sketch made in Brussels in 1520 during his travels through the Netherlands." },
      { name: "Glass Menagerie", years: "2005–present", description: "Standalone animal sculptures — dogs, cats, foxes, lynxes — not sourced from specific paintings but existing as pure glass creatures in Klonowska's own voice. Pieces for the Toyama Glass Art Museum exhibition 'Istota.'" },
      { name: "Roe Series", years: "2012–present", description: "Works exploring reproduction, multiplicity, and the forms of eggs and biological abundance — hundreds of glass elements arranged to suggest organic process and the fragile miracle of life beginning." },
    ],
    collections: [
      "Toyama Glass Art Museum, Japan",
      "Private collections across Europe",
      "Museum collections in Poland and Germany",
    ],
    videos: [
      { id: "5QlFD7V4G_g", title: "Glasscherbenskulpturen von Marta Klonowska | Euromaxx" },
      { id: "j2ZqLTWJ1HI", title: "Sculptures from Glass Shards | Euromaxx" },
      { id: "x7twVLxYe3w", title: "Glass Lynx — Marta Klonowska" },
    ],
    images: [
      { url: "https://pixel77.com/wp-content/uploads/2013/02/Amazing-glass-shard-sculptures-Marta-Klonowska-2.jpg", caption: "Lynx, 2009 — after Albrecht Dürer" },
      { url: "https://www.habatat.com/wp-content/uploads/2014/09/artist.png", caption: "Marta Klonowska — Habatat Galleries" },
    ],
    website: "http://martaklonowska.com",
    instagram: "@martaklonowska",
    habatat: "https://www.habatat.com/artist/130-marta-klonowska/",
    keywords: ["klonowska", "marta", "marta klonowska"],
  },

  {
    id: "michael-behrens",
    name: "Michael Behrens",
    born: "1973",
    nationality: "German",
    location: "Düsseldorf, Germany",
    medium: "Cast Glass",
    tagline: "The Energy of Nature in Solid Glass",
    quote: "My vision was and is to create objects in which you can see and feel the energy of nature. We are coming from nature and we will go to nature again.",
    bio: "Michael Behrens was born in Düsseldorf, Germany in 1973. From the Maastricht Academy of Fine Arts in the Netherlands he received a BFA in 2003. During his studies, Behrens had a proclivity for photography and painting, but sculpture emerged as his true passion. In 2006, he founded his own studio in Düsseldorf, where he still works and lives. Two years later, right after his first solo show in Paris, he was invited to exhibit at the Ernsting Foundation. His work received international attention for its strong color combinations and dynamic structures. Since 2004, his work has been part of over 200 group and solo exhibitions, is regularly shown at international art fairs and galleries, and is present in private and public collections around the globe. Behrens plays with the idea of movement and balance in massive solid glass objects — forms that appear almost natural, as if grown in the wild and then ossified, frozen in time. He has created five distinct series: Underwater-World, Landscapes, Seaforms, Phoenix, and Evolution.",
    artistStatement: "Michael Behrens plays with the idea of movement and balance in massive solid glass objects. The Seaforms series embodies decades of personal sensory experiences above and below water. The resulting works appear almost natural in nature, grown in the wild and then ossified, frozen in time. The diverse color range and interior movement varies as if created organically by the environment.",
    concepts: ["Natural energy", "Movement in solid form", "Organic structure", "Color harmony", "Earth and sea", "Geological process", "Balance"],
    series: [
      { name: "Seaforms", years: "2006–present", description: "Deliberately random, yet strong shapes line organic inner structures; velvet and transparent surfaces alternate, creating a dynamic harmony of inside and outside. 'I've always enjoyed nature, the sea, the underwater world — this made me start creating the Seaform series.' Works measured in pieces like SF268 (136 × 85 × 19 cm) push the physical limits of cast glass." },
      { name: "Landscapes", years: "2008–present", description: "Form is predefined by nature, so that structure is brought to the fore — glass works that capture the geological and topographical language of terrain, lit from within." },
      { name: "Underwater-World", years: "2004–present", description: "Behrens' earliest series, drawing on personal sensory experiences diving and observing the natural world beneath the ocean's surface. Dense cast forms with the inner cell-like structures of marine life." },
      { name: "Phoenix", years: "2015–present", description: "Abstract formal language in sculptural glass: the observer's eye is drawn to outlines and surfaces as every object is opaque — a departure from transparency toward the sculptural power of form alone." },
      { name: "Evolution", years: "2018–present", description: "The most recent series — works tracing the long arc of biological change, organic adaptation, and the forms that emerge from millions of years of natural selection." },
    ],
    collections: [
      "Baker Museum, Naples, FL",
      "German Museum of Glass Painting, Linnich",
      "Ernsting Foundation, Germany",
      "Private collections worldwide",
    ],
    videos: [
      { id: "lt_DGzyISGI", title: "Big Mike — Michael Behrens" },
      { id: "xFay7TguMSg", title: "Habatat Now Presents: Getting Personal with Michael Behrens" },
      { id: "Bzs_Jc9tgeo", title: "Michael Behrens — Artist Talk, Glas Museum Frauenau 2023" },
      { id: "KRamQuxIN7I", title: "Gallery Sikabonyi with Michael Behrens Interview" },
    ],
    images: [
      { url: "https://www.michael-behrens.com/wp-content/uploads/Behrens_Portait_2-1_web-1.jpg", caption: "Michael Behrens in his studio" },
      { url: "https://www.michael-behrens.com/wp-content/uploads/Behrens_SF268-17_web-980x1279.jpg", caption: "Seaforms 268, 2017 — 136 × 85 × 19 cm" },
      { url: "https://www.michael-behrens.com/wp-content/uploads/Behrens_SF252-17_web_q-980x980.jpg", caption: "Seaforms 252, 2017" },
      { url: "https://www.michael-behrens.com/wp-content/uploads/Behrens_SF271-18_web-980x1279.jpg", caption: "Seaforms 271, 2018 — 70 × 36 × 13 cm" },
      { url: "https://www.michael-behrens.com/wp-content/uploads/Studio_Detail_1-1_web.jpg", caption: "Studio detail" },
      { url: "https://www.habatat.com/wp-content/uploads/2014/08/BehrensP.jpg", caption: "Michael Behrens — Habatat Galleries" },
    ],
    website: "https://www.michael-behrens.com",
    instagram: "@michael_behrens_glass",
    habatat: "https://www.habatat.com/artist/28-michael-behrens/",
    keywords: ["behrens", "michael behrens"],
  },

  {
    id: "dale-chihuly",
    name: "Dale Chihuly",
    born: "1941",
    nationality: "American",
    location: "Seattle, Washington, USA",
    medium: "Blown Glass & Architectural Installation",
    tagline: "Transforming Glass into Living Color and Form",
    quote: "I want people to be overwhelmed with light and color in a way they've never experienced.",
    bio: "Dale Chihuly was born on September 20, 1941, in Tacoma, Washington. He studied interior design at the University of Washington, where he first incorporated glass shards into woven tapestries, before discovering studio glass under Harvey Littleton at the University of Wisconsin. He earned his MFA from the Rhode Island School of Design in 1968. In 1971 he co-founded the Pilchuck Glass School north of Seattle — the most important institution for studio glass education in the world. Chihuly pioneered a new way of working: utilizing gravity and centrifugal force to let molten glass find its shape in its own organic way. Asymmetry and irregularity became defining principles. Following a 1976 automobile accident that cost him sight in his left eye, and a 1979 shoulder injury, Chihuly evolved from solo practitioner to director of a large collaborative studio — a model that expanded the scale of what glass art could accomplish. His output spans six decades and many celebrated series: the organic Seaforms, the spotted Macchia, the theatrical Venetians, and monumental Chandeliers and garden installations. His garden installations — at Kew Gardens, the V&A Museum, the New York Botanical Garden — have brought contemporary glass to the widest possible public. His work is represented in more than 200 museum collections worldwide.",
    artistStatement: "Chihuly's Seaforms are thin and transparent. Spiral wraps of color envelop the pieces and the use of optic molds strengthens the glass and gives a ribbed effect. The result: pieces with natural rhythm and fluidity — tributes to the sea. Traditional glass factory production was about symmetry and creating perfectly formed vessels. My work represents a departure from the past.",
    concepts: ["Color and form", "Organic growth", "Collaborative scale", "Public glass", "Theatrical presence", "Asymmetry", "American glass tradition"],
    series: [
      { name: "Seaforms", years: "1980–present", description: "Thin and transparent, with spiral wraps of color and optic mold ribbing that gives each piece natural rhythm and fluidity. 'A natural evolution of the Baskets series' — tributes to the sea and its organic, unhurried forms." },
      { name: "Macchia", years: "1981–present", description: "Spotted, chaotic forms with contrasting interior and exterior colors — macchia means 'spot' in Italian. Works that celebrate the unpredictable as aesthetic principle, featuring thousands of color combinations across thousands of individual pieces." },
      { name: "Venetians", years: "1988–present", description: "Works made in direct collaboration with Lino Tagliapietra — combining Chihuly's exuberant color vision with Venetian glass techniques. Baroque, theatrical, technically extraordinary, born from the greatest cross-cultural collaboration in studio glass history." },
      { name: "Chandeliers", years: "1992–present", description: "Monumental cascading installations of hundreds of individually blown elements — Chihuly's signature architectural intervention, present in museums, hotels, and public spaces worldwide. Works that transform a room's relationship with light." },
      { name: "Garden Installations", years: "2000–present", description: "Large-scale outdoor installations at Kew Gardens, the New York Botanical Garden, Biltmore, and other significant public spaces — works that place glass in dialogue with living nature, sky, and seasonal light." },
    ],
    collections: [
      "Smithsonian Institution",
      "Metropolitan Museum of Art",
      "Corning Museum of Glass",
      "Victoria & Albert Museum, London",
      "200+ museum collections worldwide",
    ],
    videos: [
      { id: "mTgjZe8O3bY", title: "Chihuly — A Life in Glass" },
      { id: "BTsxMcNbNNk", title: "Dale Chihuly — Glass Artist Documentary" },
      { id: "Z2ym1JmRHUI", title: "Chihuly at the V&A" },
    ],
    images: [
      { url: "https://www.chihuly.com/sites/default/files/images/M14120s5_01_nw-1600-3.jpg", caption: "Indigo Gold Leaf Seaform Set with Midnight Lip Wraps, 2014" },
      { url: "https://www.chihuly.com/sites/default/files/images/m932443s8_A-1600-3.jpg", caption: "Seaforms — Corning Museum Collection" },
      { url: "https://www.chihuly.com/sites/default/files/images/m971279s2_01_nw-1600.jpg", caption: "Seaforms — Collection" },
      { url: "https://www.chihuly.com/sites/default/files/images/m01951s7_nw-1600.jpg", caption: "Seaforms — Pink Set" },
    ],
    website: "https://www.chihuly.com",
    instagram: "@chihuly",
    habatat: "https://www.habatat.com/artist/138-dale-chihuly/",
    keywords: ["chihuly", "dale chihuly"],
  },

  {
    id: "toots-zynsky",
    name: "Toots Zynsky",
    born: "1951",
    nationality: "American",
    location: "Providence, Rhode Island, USA",
    medium: "Filet de Verre (Thread-Drawn Glass)",
    tagline: "Inventor of a New Language for Glass",
    quote: "When I hear music, it translates into color.",
    bio: "Mary Ann 'Toots' Zynsky was born in 1951 and raised in Massachusetts. She received her BFA from the Rhode Island School of Design in 1973 — one of Dale Chihuly's first glass students. She was a founding member of the New York Experimental Glass Workshop and a co-founder of Pilchuck Glass School. In the early 1980s, working with Dutchman Mathijs Teunissen van Manen, Zynsky developed filet de verre — a technique of drawing molten glass into fine threads, layering them into color compositions, fusing them in the kiln, and slumping the resulting glass fabric over a mold. Her color sense is extraordinary — informed by time in West Africa, the music of jazz and salsa, and the saturated palettes of international street culture. Her most recent work, the Endangered Species series, responds to the disappearance of bird species: 'I grew up surrounded by birds in a woodland and marshland that was a child's wonderland. Later, on a recent visit home, I was struck by how few birds remained.' Glass, she notes, seemed a fitting medium for honoring them — both beautiful and fragile. Zynsky's objects are held in the Smithsonian's Renwick Gallery, the Corning Museum of Glass, the Metropolitan Museum of Art, and dozens of other institutions worldwide. No one else makes work that looks like hers.",
    artistStatement: "Toots Zynsky's distinctive heat-formed filet de verre vessels enjoy widespread popularity and deserved acclaim for their extraordinary explorations in color. Defying categorization, her pieces inhabit a region all their own — interweaving the traditions of painting, sculpture, and the decorative arts.",
    concepts: ["Color fields", "Invented technique", "Musical rhythm", "Global influences", "Chromatic density", "Woven light", "Endangered beauty"],
    series: [
      { name: "Endangered Species", years: "2018–present", description: "Glass vessels drawing inspiration from the colors and patterning of endangered birds — Ithaginis, Alexandrine parakeets, Brown-capped Rosy Finch, Hooded Robin. Works that honor fragile beauty through a fragile material. 'Glassmaking initially intrigued me for the same reasons birds did — it feels both impossible and inevitable.'" },
      { name: "Selected Works / Primaticcio Series", years: "2000–present", description: "Works titled Primaticcio, Volante, Giogaia, Viluppo, Calare, Reminiscenza — Italian names that evoke movement, memory, and transformation. Dense chromatic thread-fields in Zynsky's most refined palette." },
      { name: "Tierra del Fuego", years: "1987–2000", description: "The series that first established her international reputation — works in filet de verre inspired by the volcanic landscape and extreme chromatic environments of the southern tip of South America. Deep reds, blacks, and oranges in dense weaves." },
      { name: "Chaos", years: "1995–present", description: "Works in which the color threads are deliberately randomized and intermixed — an embrace of chance as compositional principle. When disorder becomes beauty." },
    ],
    collections: [
      "Renwick Gallery, Smithsonian Institution",
      "Corning Museum of Glass",
      "Metropolitan Museum of Art",
      "Museum of Arts and Design, New York",
      "Victoria & Albert Museum, London",
    ],
    videos: [
      { id: "z8_CVRiCjfY", title: "Toots Zynsky — Filet de Verre Technique" },
      { id: "YphCOb5XT0A", title: "Toots Zynsky — Artist Profile" },
    ],
    images: [
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/10665383_transformations-banner.jpg?6ec942d316ddfbdd57be039fa1ba408f", caption: "Transformations series" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/539775_Primaticcio-149-web.jpg?436775612c22c262c63a670c7ea9c0b4", caption: "Primaticcio-149" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/539782_Volante-050-web.jpg?c56a19be9b3a0e1dea6a15765e6eef04", caption: "Volante-050" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/539789_Giogaia-0146-web.jpg?686f367cf0292445892a647ff1a3f069", caption: "Giogaia-0146" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/10666326_Ithaginis-RectoVerso.jpg?d103751c419dfd302d61969780ba1880", caption: "Ithaginis — Endangered Species" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/10666254_Alexandrine-RectoVerso.jpg?6222dd0f69173e320ac63694e620fa40", caption: "Alexandrine — Endangered Species" },
      { url: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/9246627_NonBinary-Rosebreasted-Grosbeak-4876-web.jpg?47747e359f9696a0005c64479d50461f", caption: "Non-Binary Rose-breasted Grosbeak" },
      { url: "https://www.habatat.com/wp-content/uploads/2014/08/TootsZynskyPortrait.jpg", caption: "Toots Zynsky — Habatat Galleries" },
    ],
    website: "https://www.tootszynsky.com",
    instagram: "@tootszynsky",
    habatat: "https://www.habatat.com/artist/118-toots-zynsky/",
    keywords: ["zynsky", "toots", "toots zynsky"],
  },

  {
    id: "albert-paley",
    name: "Albert Paley",
    born: "1944",
    nationality: "American",
    location: "Rochester, New York, USA",
    medium: "Forged Steel & Metal Sculpture",
    tagline: "Monumental Metal as Living Gesture",
    quote: "The process of creation is the primary motivation for making art. The work is the residue of that process.",
    bio: "Albert Paley was born in 1944 in Philadelphia, Pennsylvania. He studied jewelry and metalsmithing at Tyler School of Art, Temple University, and has been a professor of art and design at the Rochester Institute of Technology since 1969. Paley began his career as a goldsmith and jeweler — creating body ornaments of extraordinary intricacy — before shifting in the 1970s toward architectural-scale metalwork. His Portal Gates (1974) for the Renwick Gallery of the Smithsonian Institution are among the most celebrated works in American craft history. Made from forged steel, brass, bronze, and copper, the gates transformed the potential of metalwork and announced a new paradigm for public architectural craft. Since then, Paley's sculptures — organic in rhythm, industrial in material — have entered major public spaces throughout the United States. His work is held in the Smithsonian, the Metropolitan Museum of Art, the Boston Museum of Fine Arts, the Victoria & Albert Museum, and leading collections worldwide. Though primarily a metalsmith, his presence in the glass art world reflects his deep connections to the contemporary craft movement and Habatat Galleries' commitment to the broadest range of material mastery.",
    artistStatement: "The works I create carry the spirit of their making. Forged steel remembers the heat that shaped it; the final sculpture contains the record of its own creation. I want work that is alive with the energy of process — not finished, but becoming.",
    concepts: ["Metal as drawing", "Architectural scale", "Organic rhythm", "Industrial material transformed", "American craft tradition", "Monumental presence", "Forged gesture"],
    series: [
      { name: "Portal Gates", years: "1974–present", description: "Architectural-scale forged steel gates — beginning with the celebrated gates for the Renwick Gallery, Smithsonian Institution, these works transformed what metalwork could be. Paley treats steel the way a calligrapher treats ink: with living, organic flow." },
      { name: "Garden Sculpture", years: "1985–present", description: "Large-scale outdoor sculptures that animate landscape with flowing, plant-like metal forms. Works that make industrial material organic — steel that appears to grow rather than to be made." },
      { name: "Animal Series", years: "2000–present", description: "Figurative works exploring the natural world in forged steel — birds, horses, and other creatures rendered in Paley's characteristic swirling metalwork. The animal kingdom translated into the grammar of forged metal." },
      { name: "Architectural Commissions", years: "1974–present", description: "Major public commissions for universities, government buildings, and cultural institutions across the United States — works that function as gateways, thresholds, and focal points for public life." },
    ],
    collections: [
      "Smithsonian Institution / Renwick Gallery",
      "Metropolitan Museum of Art",
      "Museum of Fine Arts, Boston",
      "Victoria & Albert Museum, London",
      "Rochester Memorial Art Gallery",
    ],
    videos: [
      { id: "3Kfj7BvzuZw", title: "Albert Paley, Sculptor — Career Overview" },
      { id: "qSGKEfFDU_E", title: "Meet the Artist: Albert Paley" },
      { id: "NAGdVu_knLU", title: "Sculptor Albert Paley — FORGE Episode" },
      { id: "Chqo2VIKhHA", title: "Albert Paley — Visited by Craft in America Program" },
    ],
    images: [],
    website: "https://www.albertpaley.com",
    instagram: "@albertpaley",
    habatat: "https://www.habatat.com/artist/83-albert-paley/",
    keywords: ["paley", "albert paley"],
  },
];

export function getArtistById(id: string): Artist | undefined {
  return artists.find((a) => a.id === id);
}

export function matchArtistFromCaption(caption: string | null): Artist | null {
  if (!caption) return null;
  const lower = caption.toLowerCase();
  return artists.find((a) => a.keywords.some((kw) => lower.includes(kw))) ?? null;
}

export function getHourlyArtist(): Artist {
  const hour = Math.floor(Date.now() / 3_600_000);
  return artists[hour % artists.length];
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getAllImages(artist: Artist): { url: string; caption: string }[] {
  const fromVideos = artist.videos.map((v) => ({
    url: getYoutubeThumbnail(v.id),
    caption: v.title,
  }));
  return [...artist.images, ...fromVideos];
}
