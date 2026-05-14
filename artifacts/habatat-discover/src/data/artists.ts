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
  bio: string;
  concepts: string[];
  series: ArtistSeries[];
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
    location: "New York, USA",
    medium: "Cast & Optical Glass",
    tagline: "Color, Form, and Optical Complexity",
    bio: "Alex Gabriel Bernstein is an award-winning glass artist whose work presents a bold and refreshing exploration of visual form and storytelling. Throughout his career, Bernstein has developed a visual language of technical sophistication — casting dense glass forms that radiate color from within and invite extended, meditative looking. His sculptures work across two primary bodies: vivid colorful cast forms that pulse with amber, emerald, and cobalt energy, and precise optical glass works engineered to bend, refract, and multiply light in deliberate ways. Born and based in New York, Bernstein trained at the Rochester Institute of Technology and has exhibited internationally at major galleries and art fairs. His work is held in public and private collections across the US, Europe, and Asia. Each Bernstein sculpture rewards close attention — its character changes entirely with light, angle, and time of day.",
    concepts: ["Optical depth", "Color as structure", "Internal light", "Sculptural weight", "Chromatic energy", "Meditative form"],
    series: [
      { name: "Color Series", years: "2010–present", description: "Vibrant cast glass sculptures saturated with deep, luminous color. Amber, emerald, cobalt, and crimson forms that radiate warmth and movement from within the dense glass body." },
      { name: "Optical Series", years: "2015–present", description: "Precisely engineered optical glass works — triangles, spheres, and cylinders — that create internal architectural systems of refracted light. Each piece contains a unique optical world." },
      { name: "Figurative Series", years: "2005–2012", description: "Early figurative explorations in cast glass that established Bernstein's signature approach to dense, light-saturated form before his move toward pure abstraction." },
      { name: "Steel & Glass", years: "2008–2018", description: "Works combining cast and cut glass with fused steel elements, exploring the tension between industrial material and the luminous qualities of glass." },
    ],
    videos: [
      { id: "nYorOV7sOW4", title: "Alex Gabriel Bernstein Glass Artist Presentation" },
      { id: "rgohJBBto-U", title: "Alex Bernstein - Glass Art Sculptures | Lahaina Galleries" },
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
    location: "Murano, Italy",
    medium: "Blown & Hotworked Glass",
    tagline: "The Greatest Living Glassblower in the World",
    bio: "Lino Tagliapietra was born on August 10, 1934, on the island of Murano, Italy — a place with an unbroken tradition of glassmaking stretching back to 1291. At the age of 11 he began his apprenticeship in a Murano factory, and by 21 he had earned the title of maestro, the youngest in the island's history. Over six decades, Tagliapietra mastered every major Venetian glassblowing technique — murrine, filigrana, incalmo, battuto — and invented new approaches that have influenced a generation of contemporary glass artists worldwide. In the late 1970s he made his first visits to the United States, sharing his knowledge at Pilchuck Glass School and catalyzing the American studio glass movement. His own works — characteristically elongated, colored in rich transparent hues, and finished with breathtaking technical precision — hang in the permanent collections of the Smithsonian, the Victoria & Albert Museum, the Corning Museum of Glass, and dozens of other institutions. At over 90 years old, Tagliapietra remains one of the most revered figures in the history of glass.",
    concepts: ["Venetian mastery", "Breath and fire", "Organic gesture", "Heritage reimagined", "Pure craft", "Murano tradition", "Technical transcendence"],
    series: [
      { name: "Dinosaur", years: "1997–present", description: "Sweeping horizontal forms with spotted murrine patterning that evoke ancient creatures and prehistoric color. One of Tagliapietra's most celebrated ongoing series." },
      { name: "Endeavour", years: "2004–present", description: "Elongated vessel forms with internal color gradients that reference space, sky, and the limits of human aspiration." },
      { name: "Bilbao", years: "1999–2005", description: "Named for the Guggenheim Bilbao, this series features dynamic swirling forms with complex murrine patterns in primary palette tones." },
      { name: "Batman", years: "1995–2010", description: "Dramatically winged forms in deep black, cobalt, and gold — architectural and theatrical in their sweep." },
      { name: "Angel", years: "2006–present", description: "Delicate, feathered forms in soft whites and golds that suggest celestial presence and ethereal lightness." },
    ],
    videos: [
      { id: "luU1mlCZc8U", title: "Glass Masters at Work: Lino Tagliapietra" },
      { id: "7qt8-5Vx1HA", title: "Large Blown Glass Piece Shatters — Rare Lino Tagliapietra Footage" },
      { id: "sWcwdlTqk2I", title: "Celebrating Lino Tagliapietra | The Maestro's Last Demonstration at The Museum" },
      { id: "knlD4-jWANE", title: "Lino Tagliapietra – Artist Profile" },
    ],
    images: [
      { url: "https://img.youtube.com/vi/luU1mlCZc8U/maxresdefault.jpg", caption: "Glass Masters at Work" },
      { url: "https://img.youtube.com/vi/sWcwdlTqk2I/maxresdefault.jpg", caption: "The Maestro's Last Demonstration" },
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
    bio: "Peter Bremers was born in 1957 in Maastricht, the Netherlands. After completing studies in ceramics, Bremers discovered cast glass in 1990 and immediately recognized it as the ideal vehicle for his central artistic obsession: the behavior of light within dense, crystalline volumes. Drawing inspiration from glaciers, deep oceans, geological formations, and the silence of extreme landscapes, Bremers creates large-scale optical glass sculptures that distill the sublime into tangible, holdable objects. His works are built from optically pure glass, cast in multiple layers and then cut and polished by hand — a process that can take months for a single piece. The result is objects that contain entire interior landscapes: shifting prismatic hues, internal reflections, and depths that seem to exceed the physical limits of the material. Bremers has exhibited in more than 30 countries, and his work is held in major collections in the Netherlands, USA, Japan, and across Europe. He is one of the foremost practitioners of optical glass sculpture in the world.",
    concepts: ["Captured light", "Geological time", "Arctic silence", "Prismatic depth", "Chromatic layering", "Interior landscape", "Transparency"],
    series: [
      { name: "IceScapes", years: "2000–present", description: "Monumental optical glass works inspired by polar ice formations — Arctic glaciers, icebergs, and frozen seas. Deep blues, greens, and transparent whites capture the silence of extreme cold." },
      { name: "Colors of the Sea", years: "2008–present", description: "Saturated optical works exploring the chromatic range of ocean water from turquoise shallows to abyssal blue-black. Each piece captures a different depth and temperature of sea." },
      { name: "Metamorphosis", years: "2012–present", description: "Works that document transformation — geological, biological, temporal. Forms caught mid-change, materials in transition between states." },
      { name: "Bunnies", years: "2018–present", description: "Playful large-scale installations of cast glass rabbit forms, bringing optical complexity and humor into large public and gallery spaces." },
    ],
    videos: [
      { id: "nLBpHh2opPk", title: "Peter Bremers — Bunnies Art Installation" },
      { id: "6usn-ODghd0", title: "Conversation with Glass Sculptor Peter Bremers" },
      { id: "W6ISiDzU1Uo", title: "IM Exchange | Peter Bremers" },
      { id: "QAXjMcw_CLg", title: "Peter Bremers — Metamorphosis Glass" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2014/08/Dec-13-Stewart-peter-bremers.jpg", caption: "Peter Bremers — Habatat Galleries" },
    ],
    website: "https://peterbremers.com",
    instagram: "@peterbremers",
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
    bio: "Erik Bertil Vallien was born on January 17, 1938, in Stockholm, Sweden. After studying at the Stockholm College of Arts, Crafts and Design, he spent two years in the United States, where encounters with Abstract Expressionism and Native American art would permanently shape his visual language. In 1963 he joined Kosta Boda glassworks in Sweden, where he has remained an artistic director ever since. Vallien's glass works — primarily sand-cast and kiln-cast — rank among the most narratively powerful in the medium. His famous boat series, begun in the 1980s, draws on ancient symbolism: boats as vessels for the dead, for passage, for the journey between worlds. His cast head works are simultaneously archaeological and psychological — objects recovered from time, bearing the marks of what they have witnessed. Vallien's sculptures have been exhibited worldwide and are held in major collections including the Smithsonian, the Corning Museum of Glass, the Metropolitan Museum of Art, and leading institutions in Scandinavia and Europe.",
    concepts: ["Myth and memory", "The vessel", "Passage and journey", "Unconscious symbols", "Frozen narrative", "Archaeological time", "Nordic consciousness"],
    series: [
      { name: "Boat Series", years: "1982–present", description: "Sand-cast glass boats — some tiny, some monumental — that function as metaphysical vessels. Objects of passage and transition, drawing on ancient cultures' use of boats as symbols of the journey between life and death." },
      { name: "Head Series", years: "1990–present", description: "Cast glass heads with embedded imagery, text, and objects inside the glass. Archaeological objects from an imagined past, carrying memory and narrative within their translucent mass." },
      { name: "Brain Works", years: "2005–present", description: "Dense optical cast glass brains — both literal and metaphorical explorations of consciousness, thought, and the organ of imagination." },
      { name: "Satellite / Space Series", years: "2010–present", description: "Works that look outward — cast glass forms referencing cosmic bodies, orbital paths, and the sublime scale of outer space." },
    ],
    videos: [
      { id: "NK0U6kgGxlc", title: "Guest Artist Lecture: Bertil Vallien" },
      { id: "e6sR2yZ6F_8", title: "Bertil Vallien — A True Art Glass Artist" },
      { id: "kqCZ1uN1P6Y", title: "Guest Artist Demonstration | Bertil Vallien & Kosta Boda" },
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
    location: "British Columbia, Canada",
    medium: "Flameworked Glass",
    tagline: "Nature Rendered in Fire and Glass",
    bio: "Shelley Muzylowski Allen was born in Manitoba, Canada, and holds a BFA in Painting and Intaglio from the Emily Carr Institute of Art & Design in Vancouver. Though trained as a painter, Allen discovered flameworked glass in the early 1990s and immediately found in the torch a medium capable of matching the precision and subtlety her subject matter demanded. Working at the flame, she constructs exquisitely detailed sculptures of natural subjects — insects, birds, marine organisms, botanical forms — with a fidelity and intimacy that draws viewers deep into the miniature world. Each piece requires extraordinary technical skill: Allen builds up her sculptures from hundreds of individually formed glass filaments and elements, assembled with the patience of a scientist and the eye of a painter. Her work is not merely decorative — it carries a philosophical weight, positioning nature as subject deserving the same sustained attention as any classical artistic concern. Her sculptures are held in collections worldwide and have been exhibited at Habatat Galleries, the Corning Museum of Glass, and major galleries across North America.",
    concepts: ["Natural systems", "Precision and detail", "Organic beauty", "Fragility", "The living world", "Scientific attention", "Botanical intimacy"],
    series: [
      { name: "Insects & Arachnids", years: "1995–present", description: "Hyper-detailed flameworked insects — beetles, dragonflies, moths, spiders — rendered at magnified scale that reveals the extraordinary architecture of their forms." },
      { name: "Marine Life", years: "2000–present", description: "Octopus, jellyfish, sea anemones, and other oceanic organisms captured with precise translucency and delicate color shifts that mimic living tissue." },
      { name: "Birds", years: "2005–present", description: "Flameworked birds — hummingbirds, owls, corvids — with extraordinary feather detail and expressive poses that animate still glass with apparent life." },
      { name: "Botanical", years: "2010–present", description: "Glass flowers, seed pods, and plant structures exploring the architecture of growth, reproduction, and organic form." },
    ],
    videos: [
      { id: "lg7m3vZ5hy8", title: "Artist Lecture: Shelley Muzylowski Allen — Color of Everything" },
      { id: "nchQ4OV3quI", title: "How Animals Inspire Glass Artist Shelley Muzylowski Allen" },
      { id: "5NDlrgERPWo", title: "Studio Demonstration | Shelley Muzylowski Allen" },
      { id: "A7QKZFlN7dM", title: "IM Exchange | Shelley Allen" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2018/03/Allen-Shelley.jpg", caption: "Shelley Muzylowski Allen — Habatat Galleries" },
    ],
    website: "https://www.muzylowski.com",
    instagram: "@shelleymuzylowskiallen",
    habatat: "https://www.habatat.com/artist/25-shelley-muzylowski-allen/",
    keywords: ["shelley", "muzylowski", "allen", "shelley allen"],
  },
  {
    id: "lucy-lyon",
    name: "Lucy Lyon",
    born: "1947",
    nationality: "American",
    location: "New Mexico, USA",
    medium: "Cast Glass",
    tagline: "Figurative Work of Extraordinary Intimacy",
    bio: "Lucy Lyon was born in 1947 in Colorado Springs, Colorado. She received her BA in Philosophy from Antioch College in 1971, and in the early 1970s worked for New York City's Parks Department before discovering glass. Her path to the medium was circuitous and self-directed — she taught herself to work with glass over many years, developing an approach to cast figurative sculpture that is entirely her own. Lyon's figures are among the most psychologically present in contemporary glass art. Working from life and from memory, she constructs intimate portraits and full figures in cast glass that seem to hold their breath — to contain something unsaid. The material serves her: glass's inherent translucency suggests skin, warmth, and inner light in ways no other material can. Her work has been exhibited widely across the United States and internationally, and is held in collections including the Corning Museum of Glass, the Renwick Gallery of the Smithsonian, and leading private collections. Lyon works from her studio in New Mexico, where she continues to push the figurative possibilities of cast glass.",
    concepts: ["Human form", "Emotional stillness", "Intimacy", "Psychological presence", "The body in glass", "Memory", "Portraiture"],
    series: [
      { name: "Figurative Works", years: "1985–present", description: "Full and partial figure castings in dense glass that read simultaneously as sculpture and as intimate document. Works that seem to record an actual presence rather than an idealized form." },
      { name: "Portrait Series", years: "1995–present", description: "Cast glass portrait heads and busts — works of extraordinary facial detail and psychological complexity that use glass's light-holding properties to suggest inner life." },
      { name: "Reclining Figures", years: "2005–present", description: "Horizontal figures in repose — sleeping, thinking, dreaming. Works that explore vulnerability, rest, and the quality of private interior experience." },
    ],
    videos: [
      { id: "dsPsAvnl5RY", title: "Morgan Peterson & Lucy Lyon & Trish Duggan — Artist Talk 2022" },
      { id: "3GnHzIQlIFQ", title: "Artist Lucy Lyon Talks About Her Piece 'Student'" },
      { id: "1BhY5quUY5A", title: "AACG Fired Up! — Lucy Lyon" },
    ],
    images: [
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
    medium: "Leaded & Fused Glass Sculpture",
    tagline: "Animals in Glass, Alive with Uncanny Energy",
    bio: "Marta Klonowska was born in Warsaw in 1964 and lives and works between Warsaw and Düsseldorf, Germany. She studied Fine Arts at the Academy of Fine Arts in Wrocław (1987–1989) and at the Kunstakademie Düsseldorf (1989–1995). Klonowska's technique is as unique as her vision: she constructs animal sculptures from hundreds of hand-cut shards of colored glass, lead-soldered together to form fur, feathers, and skin. The effect is simultaneously familiar and uncanny — animals that are recognizably animals, but caught in a state between reality and material fiction. Often sourcing her subjects from Old Master paintings — animals depicted in hunting scenes, still lifes, and baroque allegories — Klonowska liberates these creatures from their pictorial context and gives them three-dimensional, glass-fleshed life. The tension between classical art history and her radically contemporary material constitutes the heart of her practice. Her work has been exhibited across Europe, the United States, and Japan, and is held in significant public and private collections internationally.",
    concepts: ["Art history reclaimed", "Fragmentation", "Animal energy", "Classical forms subverted", "Glass as fur", "Baroque influence", "Material uncanny"],
    series: [
      { name: "After Masters", years: "2000–present", description: "Animals extracted from Old Master paintings — Rubens, Velázquez, Snyders — and reconstructed in three dimensions from glass shards. The pictorial becomes sculptural; the historical becomes present." },
      { name: "Glass Menagerie", years: "2005–present", description: "Standalone animal sculptures — dogs, cats, foxes, lynxes — not sourced from specific paintings but existing as pure glass creatures with their own psychological presence." },
      { name: "Roe Series", years: "2010–present", description: "Works exploring reproduction, multiplicity, and the forms of eggs and spawn — thousands of glass elements arranged to suggest organic abundance and biological process." },
    ],
    videos: [
      { id: "5QlFD7V4G_g", title: "Glasscherbenskulpturen von Marta Klonowska | Euromaxx" },
      { id: "j2ZqLTWJ1HI", title: "Sculptures from Glass Shards | Euromaxx" },
      { id: "x7twVLxYe3w", title: "Glass Lynx — Marta Klonowska" },
    ],
    images: [
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
    born: "1960",
    nationality: "German",
    location: "Düsseldorf, Germany",
    medium: "Cast Glass",
    tagline: "Geometry and Light in Conversation",
    bio: "Michael Behrens was born in 1960 and is based in Düsseldorf, Germany. He studied at the Fachhochschule Düsseldorf and has developed a practice centered on the intersection of geometric precision and the luminous, unpredictable qualities of cast glass. Behrens works with large-scale cast glass forms — often monumental, always architecturally considered — that balance the rational systems of geometry against the irrational beauty of light as it moves through dense glass. His Earth series, shown internationally and at Habatat, explores the geological and elemental — forms that reference mountains, rock strata, the surface of the earth seen from distance. His work demands physical presence: photographs cannot adequately capture the way his sculptures shift with changing light, or the depth of color that accumulates in his cast forms. Behrens has exhibited extensively across Europe and North America, and his work is held in collections in Germany, the USA, Japan, and the Netherlands.",
    concepts: ["Geometric tension", "Architectural form", "Material honesty", "Light as subject", "Precise beauty", "Earth and geology", "Monumental scale"],
    series: [
      { name: "Earth Series", years: "2010–present", description: "Large-scale cast glass works referencing geological forms — mountains, strata, erosion, the surface of the planet. Deeply colored and massively present." },
      { name: "Geometric Forms", years: "2000–present", description: "Pure geometric abstraction in cast glass — cylinders, cubes, spheres — that explore how the regular and the luminous interact when glass is the medium." },
      { name: "Big Mike Series", years: "2015–present", description: "Monumental works that push the scale limits of cast glass, requiring industrial-scale casting processes and months of slow cooling." },
    ],
    videos: [
      { id: "lt_DGzyISGI", title: "Big Mike — Michael Behrens" },
      { id: "xFay7TguMSg", title: "Habatat Now Presents: Getting Personal with Michael Behrens" },
      { id: "Bzs_Jc9tgeo", title: "Michael Behrens — Artist Talk, Glas Museum Frauenau 2023" },
      { id: "KRamQuxIN7I", title: "Gallery Sikabonyi with Michael Behrens Interview" },
    ],
    images: [
      { url: "https://www.habatat.com/wp-content/uploads/2014/08/BehrensP.jpg", caption: "Michael Behrens — Habatat Galleries" },
    ],
    website: "http://www.michael-behrens.com",
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
    medium: "Blown Glass",
    tagline: "Transforming Glass into Living Color and Form",
    bio: "Dale Chihuly was born on September 20, 1941, in Tacoma, Washington. He studied interior design at the University of Washington, then glass at the University of Wisconsin with Harvey Littleton — a formative encounter that redirected his life entirely. In 1968 he earned his MFA from the Rhode Island School of Design. In 1971 he co-founded the Pilchuck Glass School north of Seattle, which would become the most important institution for studio glass education in the world. Following a 1976 automobile accident that cost him sight in his left eye, and a 1979 shoulder injury that prevented him from blowing, Chihuly evolved from solo practitioner to director of a large collaborative studio — a model that expanded the scale of what glass art could accomplish. His output spans several decades and many celebrated series: the organic Seaforms, the chaotic Macchia, the theatrical Venetians and Ikebana, the monumental Chandeliers and architectural installations. Chihuly's garden installations — at Kew Gardens, the V&A Museum, the New York Botanical Garden — have brought contemporary glass to the broadest possible public. His work is represented in more than 200 museum collections worldwide.",
    concepts: ["Color and form", "Organic growth", "Collaborative scale", "Public glass", "Theatrical presence", "Natural systems", "American glass tradition"],
    series: [
      { name: "Seaforms", years: "1980–present", description: "Undulating shell and sea-creature forms in soft pastels and translucent layers — among Chihuly's earliest and most beloved series, referencing the fluid world below the ocean surface." },
      { name: "Macchia", years: "1981–present", description: "Spotted, chaotic forms with contrasting interior and exterior colors — the Italian word for 'spot' or 'stain'. Works that celebrate the unpredictable as aesthetic principle." },
      { name: "Venetians", years: "1988–present", description: "Works made with Lino Tagliapietra combining Chihuly's exuberant color vision with Venetian glass techniques — baroque, theatrical, technically extraordinary." },
      { name: "Chandeliers", years: "1992–present", description: "Monumental cascading installations of hundreds of blown elements — Chihuly's signature architectural intervention, present in museums, hotels, and public spaces worldwide." },
      { name: "Garden Installations", years: "2000–present", description: "Large-scale outdoor installations at Kew Gardens, the New York Botanical Garden, and other significant public spaces — works that place glass in dialogue with living nature." },
    ],
    videos: [
      { id: "mTgjZe8O3bY", title: "Chihuly — A Life in Glass" },
      { id: "BTsxMcNbNNk", title: "Dale Chihuly — Glass Artist Documentary" },
      { id: "Z2ym1JmRHUI", title: "Chihuly at the V&A" },
    ],
    images: [],
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
    tagline: "Invented a New Language for Glass",
    bio: "Mary Ann 'Toots' Zynsky was born in 1951 and raised in Massachusetts. She received her BFA from the Rhode Island School of Design in 1973, where she was among the first students to study glass under Dale Chihuly. She was a founding member of the New York Experimental Glass Workshop and a co-founder of Pilchuck Glass School. In the early 1980s, working with Dutchman Mathijs Teunissen van Manen, Zynsky developed filet de verre — a technique of drawing molten glass into fine threads, layering them into compositions, fusing them in the kiln, and then slumping the resulting glass fabric over a mold. The result is objects of extraordinary visual complexity: bowls and vessels whose walls are composed of hundreds of interwoven color threads, creating chromatic fields that shift with movement and light. Her color sense is extraordinary — influenced by her time in West Africa, the music of jazz and salsa, and the vivid palette of international street culture. No one else makes work that looks like Toots Zynsky's. Her objects are held in major museum collections worldwide, including the Smithsonian's Renwick Gallery, the Corning Museum of Glass, the Metropolitan Museum of Art, and dozens of others.",
    concepts: ["Color fields", "Invented technique", "Musical rhythm", "Global influences", "Chromatic density", "Filigree", "Woven light"],
    series: [
      { name: "Tierra del Fuego", years: "1987–2000", description: "Works in filet de verre inspired by the volcanic landscape and extreme chromatic environments of the southern tip of South America. Deep reds, blacks, and oranges in dense weaves." },
      { name: "Chaos", years: "1995–present", description: "Works in which the color threads are deliberately randomized and intermixed — an embrace of chance and chaos as compositional principle." },
      { name: "Picasso", years: "2000–present", description: "Works drawing on Cubist color relationships and the fragmented, multi-perspective vision of early modernism — bright, primary-adjacent palettes in complex thread arrangements." },
      { name: "Terra", years: "2005–present", description: "Earth-toned works that reference soil, clay, sediment, and the color of the ground — an earthward turn from Zynsky's typically saturated palette." },
    ],
    videos: [
      { id: "z8_CVRiCjfY", title: "Toots Zynsky — Filet de Verre Technique" },
      { id: "YphCOb5XT0A", title: "Toots Zynsky — Artist Profile" },
    ],
    images: [
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
    bio: "Albert Paley was born in 1944 in Philadelphia, Pennsylvania. He studied jewelry and metalsmithing at Tyler School of Art, Temple University, and has been a professor of art and design at the Rochester Institute of Technology since 1969. Paley began his career as a goldsmith and jeweler, creating body ornaments of extraordinary intricacy. In the 1970s he shifted toward architectural-scale metalwork — forged steel gates, railings, and monumental sculptures that brought the sensibility of fine jewelry to the scale of architecture. His Portal Gates (1974) for the Renwick Gallery of the Smithsonian Institution are among the most celebrated works in American craft history. Paley's sculptures — organic in rhythm, industrial in material — can be found in major public spaces throughout the United States and in museum collections including the Smithsonian, the Metropolitan Museum of Art, the Boston Museum of Fine Arts, and the Victoria & Albert Museum. Though primarily a metalsmith, his presence in the glass art world reflects his deep connections to the contemporary craft movement and Habatat Galleries' commitment to the broadest range of material mastery.",
    concepts: ["Metal as drawing", "Architectural scale", "Organic rhythm", "Industrial material", "American craft", "Monumental presence", "Forged gesture"],
    series: [
      { name: "Portal Gates", years: "1974–present", description: "Architectural-scale forged steel gates — the series that established Paley's international reputation, beginning with the celebrated gates for the Renwick Gallery, Smithsonian Institution." },
      { name: "Garden Sculpture", years: "1985–present", description: "Large-scale outdoor sculptures that animate landscape with flowing, plant-like metal forms — industrial material made organic." },
      { name: "Animal Series", years: "2000–present", description: "Figurative works exploring the natural world in forged steel — birds, horses, and other creatures rendered in Paley's characteristic swirling, linear metalwork." },
    ],
    videos: [
      { id: "3Kfj7BvzuZw", title: "Albert Paley, Sculptor — Career Overview" },
      { id: "qSGKEfFDU_E", title: "Meet the Artist: Albert Paley" },
      { id: "NAGdVu_knLU", title: "Sculptor Albert Paley — FORGE Episode" },
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
