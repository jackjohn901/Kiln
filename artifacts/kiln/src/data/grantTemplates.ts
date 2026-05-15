interface GrantProfile {
  artistName: string;
  medium: string;
  yearsActive: string;
  location: string;
  grantName: string;
  grantAmount: string;
  projectTitle: string;
  projectDesc: string;
  communityImpact: string;
  awards: string;
  tone: "formal" | "conversational" | "academic";
}

type DocType = "artist_statement" | "project_narrative" | "bio" | "budget_justification" | "work_samples_desc";

function name(p: GrantProfile) { return p.artistName || "the artist"; }
function medium(p: GrantProfile) { return p.medium || "craft"; }
function years(p: GrantProfile) { return p.yearsActive || "many years"; }
function loc(p: GrantProfile) { return p.location || "the United States"; }
function grant(p: GrantProfile) { return p.grantName || "this grant"; }
function amount(p: GrantProfile) { return p.grantAmount ? `$${parseInt(p.grantAmount).toLocaleString()}` : "the requested funding"; }
function project(p: GrantProfile) { return p.projectTitle || "the proposed project"; }
function desc(p: GrantProfile) { return p.projectDesc || "a significant new body of work exploring the boundaries of the medium"; }
function impact(p: GrantProfile) { return p.communityImpact || "foster deeper engagement with craft traditions within the community"; }
function awards(p: GrantProfile) { return p.awards || "numerous exhibitions and residency programs"; }

function artistStatement(p: GrantProfile): string {
  if (p.tone === "conversational") {
    return `My work in ${medium(p)} grew out of a simple fascination: the way material resists, then yields. After ${years(p)} years in the studio, I still find that moment of transformation — when raw matter becomes something shaped by intention and time — endlessly compelling.

Working from my studio in ${loc(p)}, I've developed a practice centered on the relationship between process and meaning. ${medium(p)} is not merely a vehicle for my ideas; it is the idea. The decisions I make at each stage — which tools, which temperatures, which gestures to allow and which to correct — are inseparable from what the finished work communicates.

${project(p)} marks a significant evolution in this inquiry. ${desc(p)}. I am drawn to this project because it asks me to take risks I haven't taken before — to push against the edges of what I know how to do and see what emerges.

Craft occupies a particular position in contemporary culture: it is at once ancient and immediate, humble and ambitious. I believe work made with the hands carries a different kind of attention than work made otherwise, and I am committed to that difference. ${impact(p)}.

I am grateful for the opportunity to apply for ${grant(p)}. The support of an organization that values craft as a serious artistic practice means a great deal to me, both practically and in terms of validation that this work matters beyond my own studio walls.`;
  }

  if (p.tone === "academic") {
    return `My artistic practice engages with ${medium(p)} as a site of material, cultural, and phenomenological inquiry. Over the course of ${years(p)} years, my work has investigated the ontological conditions under which craft objects acquire aesthetic and social meaning — examining how the indexical relationship between maker, material, and process is registered in the finished object.

Operating from ${loc(p)}, my studio practice is grounded in a sustained engagement with the physical properties of ${medium(p)}, understood not as mere medium but as an active agent in the production of form. My methodology draws on process-based art theory, material culture studies, and the phenomenology of making, while remaining fundamentally rooted in technical mastery of the craft.

The proposed project, "${project(p)}," represents a critical juncture in this research. ${desc(p)}. This project advances a theoretical and material investigation into the productive tensions between control and contingency, tradition and innovation, within contemporary studio practice.

The implications of this work extend beyond formalist concerns: ${impact(p)}. I contend that rigorous engagement with craft practice offers unique epistemological insights unavailable through other artistic modes, particularly regarding the relationship between embodied knowledge and aesthetic judgment.

My work has been recognized through ${awards(p)}, demonstrating sustained engagement with both critical and practitioner communities. I am confident that ${grant(p)} will provide the material and temporal conditions necessary to realize the full potential of this project.`;
  }

  // formal (default)
  return `For ${years(p)} years, my practice in ${medium(p)} has been shaped by a commitment to both technical rigor and artistic inquiry. Working from my studio in ${loc(p)}, I have developed a body of work that engages deeply with the expressive possibilities of the medium — exploring how material, process, and form can combine to create objects that carry meaning beyond their physical presence.

My interest in ${medium(p)} began as a pursuit of mastery: learning the temperatures, the timing, the particular logic of a demanding craft. Over time, that pursuit evolved into something more complex. I became interested not just in achieving technical control, but in working productively with the moments when control is relinquished — when the material asserts its own nature and something unexpected emerges. Those moments have become central to my practice.

The project I am proposing, "${project(p)}," represents the next significant development in this ongoing inquiry. ${desc(p)}. I believe this work will deepen my artistic practice in meaningful ways while also contributing to broader conversations about the role of craft in contemporary art and culture.

My work has been exhibited and recognized through ${awards(p)}, reflecting a sustained commitment to excellence in the field. I am grateful for the support of ${grant(p)} and believe that this funding will provide the resources necessary to realize a project that I have been building toward throughout my career.

Beyond the studio, I am committed to ${impact(p)}, ensuring that the knowledge and culture of ${medium(p)} remains vital and accessible.`;
}

function projectNarrative(p: GrantProfile): string {
  if (p.tone === "conversational") {
    return `The project I'm calling "${project(p)}" has been taking shape in my studio for some time — it started as a question I couldn't stop returning to, and gradually became clear enough to pursue seriously.

At its core, the project involves: ${desc(p)}. I'm excited about this work because it pushes me into territory that's genuinely unknown for me, which is where I think the most interesting art gets made.

Here's how I'm planning to approach it: The first phase (roughly months 1–3) will be dedicated to research and material experimentation — testing new approaches, building on what I already know while identifying the gaps. Phase two (months 4–7) is where the core work gets made: the pieces that represent the central ideas I'm exploring. The final phase (months 8–12) covers refinement, documentation, and presentation preparation.

The significance of this project lies in more than the finished objects. ${impact(p)}.

The funding from ${grant(p)} — ${amount(p)} — will allow me to work on this without compromising quality due to material costs or time pressure. Specifically, it covers materials, dedicated studio time, and the documentation costs needed to share the work widely after completion.`;
  }

  if (p.tone === "academic") {
    return `The proposed project, "${project(p)}," constitutes a systematic investigation into the material, formal, and conceptual dimensions of ${medium(p)} as a contemporary artistic practice. This project proceeds from a research question that has animated my studio practice for several years: ${desc(p)}.

The project unfolds across three methodological phases. In the initial phase (months 1–3), I will conduct extensive material research and experimental work, testing hypotheses developed through previous practice and establishing the technical parameters of the inquiry. This phase is necessarily open-ended; the research must be allowed to reveal unexpected pathways.

The second phase (months 4–7) constitutes the primary making period, during which the central body of work will be produced. Drawing on the research findings of phase one, this period involves sustained, intensive studio practice — the iterative, embodied process through which my theoretical questions find material resolution.

The final phase (months 8–12) encompasses critical review, documentation, and dissemination. I regard documentation not as supplementary to the work but as integral to it: photographs, process journals, and written reflection constitute a secondary layer of the project's intellectual contribution.

The broader significance of this project is substantial: ${impact(p)}. Supported by ${amount(p)} from ${grant(p)}, this investigation will produce outcomes that advance both my individual practice and the field's collective understanding of what ${medium(p)} can do.`;
  }

  return `"${project(p)}" is a body of work that represents a focused, ambitious development in my practice as an artist working in ${medium(p)}. The project emerged from questions that have been building throughout my career, and I am at a point where I have the technical foundation and artistic vision to pursue them fully.

The core of the project is this: ${desc(p)}. This is work that requires extended studio time, access to high-quality materials, and the freedom to experiment — the conditions that this grant would make possible.

My working process is structured but responsive. I plan to spend the first months (1–3) in intensive research and material exploration, testing approaches and refining the direction. The central making period (months 4–7) is when the primary body of work will be produced — the pieces that embody the project's core ideas. The final months (8–12) are dedicated to refinement, professional documentation, and preparation for presentation.

The work's significance extends beyond my studio. ${impact(p)}. The craft field benefits when artists have the support to take real risks and pursue work that expands what the medium can do.

The funding from ${grant(p)} — ${amount(p)} — is specifically targeted toward materials, additional studio access, and professional documentation costs. Every dollar will be directed toward making this project the best it can be.`;
}

function bio(p: GrantProfile): string {
  if (p.tone === "conversational") {
    return `${name(p)} is a ${medium(p)} artist based in ${loc(p)} with ${years(p)} years of studio experience. Their work explores [central theme of practice] through a hands-on process that values both technical precision and creative risk-taking.

Known for their distinctive approach to ${medium(p)}, ${name(p).split(" ")[0]}'s pieces have been recognized through ${awards(p)}. They maintain an active studio practice while engaging with their regional craft community, and are committed to ${impact(p)}.

"${project(p)}" represents their most ambitious work to date.`;
  }

  if (p.tone === "academic") {
    return `${name(p)} is a studio artist and researcher whose practice in ${medium(p)} engages with questions of materiality, process, and embodied knowledge. Based in ${loc(p)}, ${name(p).split(" ")[0]} has sustained a rigorous studio practice for ${years(p)} years, producing work that has been exhibited and recognized through ${awards(p)}.

${name(p).split(" ")[0]}'s approach is grounded in a theoretical framework that understands craft not as a category of decorative production but as a site of serious artistic and intellectual inquiry. The work interrogates the relationship between technical mastery and artistic contingency, between cultural tradition and contemporary innovation.

${name(p).split(" ")[0]}'s current project, "${project(p)}," continues this investigation. Their work is supported by ${grant(p)}.`;
  }

  return `${name(p)} is a studio artist working in ${medium(p)}, based in ${loc(p)}. With ${years(p)} years of dedicated practice, ${name(p).split(" ")[0]} has developed a distinctive body of work recognized for its technical precision and depth of artistic vision.

${name(p).split(" ")[0]}'s work has been featured through ${awards(p)}, reflecting a sustained commitment to excellence in contemporary craft. Their practice engages with the expressive possibilities of ${medium(p)}, exploring how material, process, and form intersect to create work that resonates beyond its physical presence.

${name(p).split(" ")[0]} maintains an active studio practice and is committed to ${impact(p)}. "${project(p)}" is their current major project, supported in part by ${grant(p)}.`;
}

function budgetJustification(p: GrantProfile): string {
  const amt = p.grantAmount ? parseInt(p.grantAmount) : 10000;
  const matCost = Math.round(amt * 0.40);
  const timeCost = Math.round(amt * 0.35);
  const equipCost = Math.round(amt * 0.15);
  const docCost = Math.round(amt * 0.10);

  return `The requested grant of ${amount(p)} from ${grant(p)} will be allocated directly to the realization of "${project(p)}" across four budget categories. Each expense is essential to achieving the project's artistic and community goals, and each has been carefully researched to reflect realistic current costs.

**Materials and Supplies (approximately ${matCost.toLocaleString()} — ${Math.round(matCost/amt*100)}% of total):**
The nature of ${medium(p)} requires significant material investment. This allocation covers the raw materials, consumables, and specialty items specific to this project. The scale and ambition of the proposed work make a substantial materials budget necessary; producing smaller or lower-quality work to reduce costs would fundamentally compromise the project's artistic integrity.

**Studio Time and Artist Labor (approximately ${timeCost.toLocaleString()} — ${Math.round(timeCost/amt*100)}% of total):**
Sustained studio time is the foundation of any serious studio practice. This allocation supports dedicated project time over the funding period, allowing for the deep, uninterrupted engagement that ambitious work requires. It also partially offsets the opportunity cost of time redirected from income-generating activities toward this project.

**Equipment and Facility Costs (approximately ${equipCost.toLocaleString()} — ${Math.round(equipCost/amt*100)}% of total):**
This category covers access to specialized equipment, firing costs, and facility fees necessary to execute the work at the intended scale. Some of this equipment would require rental or facility access beyond what my studio currently provides.

**Documentation and Presentation (approximately ${docCost.toLocaleString()} — ${Math.round(docCost/amt*100)}% of total):**
Professional photography, archiving, and presentation preparation ensure the work reaches its intended audiences and contributes to the broader craft field. Documentation also supports future funding applications and exhibition opportunities.

This budget has been developed conservatively; no category includes unnecessary expenditure. ${name(p)} is committed to the responsible stewardship of ${grant(p)}'s investment in this work.`;
}

function workSamplesDesc(p: GrantProfile): string {
  return `The work samples submitted with this application represent a focused selection from ${name(p)}'s practice over the past ${Math.min(parseInt(p.yearsActive || "5"), 5)} years, chosen to demonstrate both technical range and the artistic concerns central to the proposed project, "${project(p)}."

The selection moves from earlier work to more recent, tracing the development of a practice increasingly focused on ${desc(p).substring(0, 100)}. Viewers familiar with the field of ${medium(p)} will recognize the technical demands of each piece; those less familiar with the medium are invited to attend to the formal and emotional qualities that the craft makes possible.

Several pieces in the portfolio were made in direct preparation for the proposed project — experiments in material, scale, and process that have clarified the direction of the new work without yet fully realizing it. These transitional pieces are included intentionally: they demonstrate a working artist in motion, not simply a static achievement.

The remaining samples represent completed bodies of work that have been exhibited publicly, including through ${awards(p)}. They establish the baseline of technical competence and artistic seriousness from which the proposed project departs.

Taken together, the work samples make the case that ${name(p)} has the technical foundation, the artistic vision, and the track record of completion necessary to realize "${project(p)}" at the level this application proposes. The grant from ${grant(p)} would provide the material conditions — time, resources, focus — to fully realize what these samples suggest is possible.`;
}

export function generateDoc(profile: GrantProfile, docType: DocType): string {
  switch (docType) {
    case "artist_statement": return artistStatement(profile);
    case "project_narrative": return projectNarrative(profile);
    case "bio": return bio(profile);
    case "budget_justification": return budgetJustification(profile);
    case "work_samples_desc": return workSamplesDesc(profile);
    default: return artistStatement(profile);
  }
}
