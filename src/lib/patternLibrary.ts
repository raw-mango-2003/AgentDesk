/**
 * Global Conversation Pattern Library
 * Language and intent classification patterns for understanding human phrasing,
 * multi-intent, Hinglish, typos, negation, confirmation, follow-ups, and small talk.
 * 
 * IMPORTANT: This library contains ONLY linguistic/intent patterns.
 * It does NOT contain client-specific business facts.
 */

export interface PatternRule {
  id: string;
  category: 'pricing' | 'duration' | 'schedule' | 'demo' | 'refund' | 'application' | 'eligibility' | 'list' | 'human_support' | 'small_talk' | 'thanks' | 'goodbye' | 'confirmation' | 'negation' | 'correction' | 'comparison';
  patterns: RegExp[];
  hinglishPatterns?: RegExp[];
  typoPatterns?: RegExp[];
}

export const PATTERN_RULES: PatternRule[] = [
  {
    id: 'pricing',
    category: 'pricing',
    patterns: [
      /\b(fee|fees|cost|costs|price|pricing|charge|charges|tuition|rate|payment|how much|how expensive|much do i have to pay|what do i pay|what are the charges)\b/i,
      /\b(how much is|cost of|price of|fee for|charges for|pay for)\b/i
    ],
    hinglishPatterns: [
      /\b(ki fees kya hai|kitne ka hai|kitna lagta hai|kitni fees hai|kitne paise|kitna charge|fees kitni hai)\b/i
    ],
    typoPatterns: [
      /\b(wat is da fee|wat is the fees|fees pls|how much data analytics|demo fee\?|fees\?)\b/i
    ]
  },
  {
    id: 'duration',
    category: 'duration',
    patterns: [
      /\b(duration|how long|length|how many months|how many weeks|when does it finish|time required|how much time|study duration)\b/i
    ],
    hinglishPatterns: [
      /\b(kitne months ka|kitne weeks ka|kitna time lagta|kab tak chalega|kitne mahine ka)\b/i
    ],
    typoPatterns: [
      /\b(how long it is|for how much duration|how long is it|duration\?)\b/i
    ]
  },
  {
    id: 'schedule',
    category: 'schedule',
    patterns: [
      /\b(timing|timings|time|times|schedule|when are classes|what time are classes|class timing|batch|next batch|weekend|evening|morning|saturday|sunday|days|start date|when does it start)\b/i
    ],
    hinglishPatterns: [
      /\b(classes kab hoti|kab se start|timing kya hai|batch kab hai|kab hota hai|classes kab hai)\b/i
    ],
    typoPatterns: [
      /\b(timing\?|when class|what time it is|class timing\?)\b/i
    ]
  },
  {
    id: 'demo',
    category: 'demo',
    patterns: [
      /\b(demo|free demo|trial|free trial|demo class|demo session|sample class|trial session)\b/i
    ],
    hinglishPatterns: [
      /\b(demo free hai|demo kab hota hai|demo session kab hai|demo class free hai)\b/i
    ],
    typoPatterns: [
      /\b(is demo free|demo fee\?|demo free\?|free demo\?)\b/i
    ]
  },
  {
    id: 'refund',
    category: 'refund',
    patterns: [
      /\b(refund|cancellation|cancel|money back|get my money back|refund policy|cancel enrollment)\b/i
    ],
    hinglishPatterns: [
      /\b(refund mil jayega|money back milega|paisa wapas|cancellation policy kya hai)\b/i
    ]
  },
  {
    id: 'application',
    category: 'application',
    patterns: [
      /\b(how do i apply|how to apply|enroll|how to enroll|register|how do i register|how to register|sign up|join|admission|admission process|take admission)\b/i
    ],
    hinglishPatterns: [
      /\b(admission kaise lena hai|register kaise kare|enroll kaise hona hai|join kaise kare)\b/i,
    ],
    typoPatterns: [
      /\b(how i register|register pls|how apply)\b/i
    ]
  },
  {
    id: 'eligibility',
    category: 'eligibility',
    patterns: [
      /\b(eligibility|prerequisite|prerequisites|requirements|who can join|qualification|prior experience|need coding)\b/i
    ],
    hinglishPatterns: [
      /\b(kaun join kar sakta hai|eligibility kya hai|qualification chahiye)\b/i
    ]
  },
  {
    id: 'list',
    category: 'list',
    patterns: [
      /\b(what courses|which courses|what programs|which programs|list of courses|courses offered|all courses|what do you offer|available courses)\b/i
    ],
    hinglishPatterns: [
      /\b(kaun konse course hai|konse courses hai|wat course u have|what courses u offer)\b/i
    ]
  },
  {
    id: 'human_support',
    category: 'human_support',
    patterns: [
      /\b(human|person|agent|representative|support team|operator|real person|speak to someone|talk to someone|connect me to support|call me|customer care)\b/i
    ]
  },
  {
    id: 'small_talk',
    category: 'small_talk',
    patterns: [
      /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|hey there)$/i,
      /^(how are you|how are you doing|whats up|what's up)$/i
    ]
  },
  {
    id: 'thanks',
    category: 'thanks',
    patterns: [
      /\b(thank you|thanks|thank you very much|thanks a lot|that's helpful|that is helpful|perfect thanks|great thanks|ok thanks|thankyou)\b/i
    ]
  },
  {
    id: 'goodbye',
    category: 'goodbye',
    patterns: [
      /\b(goodbye|bye|bye bye|bye for now|talk to you later|see you|see you later|take care|have a great day|have a good day|have a nice day|good night|see you soon|until next time|i have to go|i've got to go|i need to go)\b/i
    ]
  },
  {
    id: 'confirmation',
    category: 'confirmation',
    patterns: [
      /^(so it's|is that|did you say|you're saying|so the fee is|so duration is|right\?|correct\?)/i,
      /\b(is that six months|so it's ₹25,000|you're saying the demo is free)\b/i
    ]
  },
  {
    id: 'negation',
    category: 'negation',
    patterns: [
      /\b(don't|dont|do not|not asking|i don't want|i don't need|no need|not interested|not interested in|don't tell me about|no thanks|no thank you)\b/i
    ]
  },
  {
    id: 'correction',
    category: 'correction',
    patterns: [
      /\b(i mean|actually|instead of|no i meant|correction|not data analytics|not digital marketing)\b/i
    ]
  },
  {
    id: 'comparison',
    category: 'comparison',
    patterns: [
      /\b(difference between|compare|which one is|shorter|cheaper|better|which course would you recommend)\b/i
    ]
  }
];

export const EXACT_CLOSING_PHRASES: string[] = [
  "no that's all", "no text all", "that's all", "that's it", "that's everything",
  "nothing else", "no nothing else", "no thanks", "no thank you", "no thank u",
  "i'm good", "im good", "i'm good thanks", "im good thanks", "i'm all good", "im all good",
  "i'm all set", "im all set", "all set", "that's everything i needed", "thats everything i needed",
  "that's all i needed", "thats all i needed", "that's all for now", "thats all for now",
  "i have no more questions", "no more questions", "i don't have any other questions", "i dont have any other questions",
  "i don't need anything else", "i dont need anything else", "i don't need anything more", "i dont need anything more",
  "nothing more", "nothing else thanks", "that's it thank you", "thats it thank you",
  "okay that's all", "okay thats all", "okay that's it", "okay thats it",
  "okay i'm done", "okay im done", "i'm done", "im done", "we're done", "were done",
  "that will be all", "that'll be all", "thatll be all", "that should be all",
  "that covers everything", "you've answered everything", "youve answered everything",
  "that answers my question", "my question has been answered",
  "i think that's all", "i think thats all", "i think i'm good", "i think im good",
  "i think we're done", "i think were done", "i think that's everything", "i think thats everything",
  "no further help needed", "no further questions", "no further assistance needed",
  "that's all i wanted to know", "thats all i wanted to know", "that's all i wanted", "thats all i wanted",
  "nothing else for now", "nothing else from me", "i don't need anything else thanks", "nothing more from me",
  "that's perfect", "thats perfect", "perfect that's all", "perfect thats all",
  "perfect thank you", "great that's all", "great thats all", "great thanks",
  "okay we're good", "okay were good", "we're good", "were good", "all good",
  "that's perfect thanks", "thats perfect thanks", "that works for me",
  "that's exactly what i needed", "thats exactly what i needed", "that answers it",
  "got everything i needed", "i've got what i need", "ive got what i need",
  "that's enough thank you", "thats enough thank you", "nope that's it", "nope thats it",
  "nope nothing else", "no i'm good", "no im good", "no i'm all set", "no im all set",
  "no i'm done", "no im done", "no we're good", "no were good", "no that's everything", "no thats everything",
  "no nothing more", "nothing else thank you", "thanks i'm good", "thanks im good",
  "no that's okay", "no thats okay", "no that's fine", "no thats fine", "nope i'm good", "nope im good"
];

export function isExplicitClosingIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const stripped = cleaned.replace(/[.,!?]+$/, '').trim();
  const alphaNumOnly = stripped.replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();

  if (EXACT_CLOSING_PHRASES.includes(alphaNumOnly) || EXACT_CLOSING_PHRASES.includes(stripped)) {
    return true;
  }

  const closingRegex = /\b(no that'?s all|that'?s all|that'?s it|nothing else|no thanks|no thank you|i'?m good|im good|i'?m all set|im all set|all set|that'?s everything|that'?s all i needed|no more questions|i'?m done|im done|we'?re done|were done|that covers everything|no further questions|no further help|that'?s all i wanted|we'?re good|all good|got everything i needed|nope that'?s it|no i'?m good|no that'?s everything|no nothing more|nothing else thank you|no that'?s okay|no that'?s fine|nothing else for now|nothing else from me|nothing more from me|i don't need anything else|that'?s perfect thanks|perfect that'?s all|great that'?s all|no further assistance|that'll be all|that will be all|that should be all)\b/i;
  
  if (closingRegex.test(cleaned)) {
    return true;
  }

  return false;
}

export function isGoodbyeIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(goodbye|bye|bye bye|bye for now|talk to you later|see you|see you later|take care|have a great day|have a good day|have a nice day|good night|see you soon|until next time|i have to go|i've got to go|i need to go|i'm leaving)\b/i.test(cleaned);
}

export function isThankYouIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(thank you|thanks|thank you very much|thanks a lot|much appreciated|i appreciate it|appreciate your help|thank you for your help|thanks for helping|that's helpful|that is helpful|great thank you|perfect thank you|ok thanks|thankyou)\b/i.test(cleaned);
}

export function isAcknowledgementIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim();
  return /^(okay|ok|alright|all right|got it|gotcha|understood|i see|sure|great|perfect|sounds good|that makes sense|understood thanks|okay great|alright great|okay got it)$/i.test(cleaned);
}

export function isGreetingOrSmallTalkIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim();
  return /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|hey there|how are you|how are you doing|whats up|what's up|hope you're doing well|nice to meet you)$/i.test(cleaned) || matchesPatternCategory(cleaned, 'small_talk');
}

export function isHumanHandoffIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(human|person|agent|representative|support team|operator|real person|speak to someone|talk to someone|connect me to support|call me|customer care|speak with admissions|talk to sales|speak with your team|contact me|connect me|put me through)\b/i.test(cleaned);
}

export function isComplaintOrFrustrationIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(this isn't helping|you don't understand|that's not what i asked|you're repeating|i already told you|this is frustrating|i need a human|stop repeating|that's wrong|i've asked this already)\b/i.test(cleaned);
}

export function isNegationIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(don't|dont|do not|not asking|i don't want|i don't need|no need|not interested|not interested in|don't tell me about|no thanks|no thank you|i don't want to register|i don't want the demo)\b/i.test(cleaned);
}

export function isIdentityIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase().replace(/[?.,!]+$/, '').trim();
  return /\b(who are you|what is your name|whats your name|what's your name|who do you work for|who do you represent|what company is this|what is this business|tell me about yourself|are you an ai|who am i speaking with|who am i talking to|what is your role|who is this)\b/i.test(cleaned);
}

export function matchesPatternCategory(text: string, category: PatternRule['category']): boolean {
  const norm = text.toLowerCase().trim();
  const rules = PATTERN_RULES.filter(r => r.category === category);
  for (const rule of rules) {
    if (rule.patterns.some(p => p.test(norm))) return true;
    if (rule.hinglishPatterns?.some(hp => hp.test(norm))) return true;
    if (rule.typoPatterns?.some(tp => tp.test(norm))) return true;
  }
  return false;
}

export function extractEntitiesFromText(text: string): string[] {
  if (!text) return [];
  const norm = text.toLowerCase();
  const entities: string[] = [];

  if (/\b(demo|trial|demo class|demo session|sample class)\b/i.test(norm)) {
    entities.push('Demo');
  }
  if (/\b(data analytics|analytics|data science|python analytics)\b/i.test(norm)) {
    entities.push('Data Analytics');
  }
  if (/\b(digital marketing|marketing course|digital marketing program)\b/i.test(norm)) {
    entities.push('Digital Marketing');
  }
  if (/\b(full stack|web dev|fullstack|web development|software development)\b/i.test(norm)) {
    entities.push('Full Stack Development');
  }
  if (/\b(refund|cancellation|money back)\b/i.test(norm)) {
    entities.push('Refund');
  }
  if (/\b(eligibility|admission|prerequisite|requirements)\b/i.test(norm)) {
    entities.push('Admissions');
  }

  return entities;
}

export function isYesNoQuestion(text: string): boolean {
  if (!text) return false;
  const norm = text.trim().toLowerCase();

  // Single word or short phrase yes/no queries
  if (/^(free|available|online|weekend|paid|saturday)\??$/i.test(norm)) return true;
  if (/\b(is it|are they|can i|do you|does it|will i|is demo|is the demo|is this|are classes|is course)\b/i.test(norm)) return true;
  if (/^\s*(is|are|can|do|does|will|has|have|free\?|online\?|weekend\?)\b/i.test(norm) && norm.includes('?')) return true;

  return false;
}

export function isBookingActionIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(book|booking|book it|book the demo|book demo|i want to book|yes book it|register|register me|i want to register|sign me up|sign up|let's do it|lets do it|i'd like the demo|id like the demo|can i book|can i book it|book me|i want to attend|take admission|enroll me|register for demo|book demo class|book class|book a demo|book free demo|book a free demo)\b/i.test(cleaned);
}

export function isSyllabusActionIntent(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  return /\b(syllabus|curriculum|modules|view syllabus|show syllabus|show me syllabus|show me the syllabus|send syllabus|download syllabus|syllabus details|course content|what is covered)\b/i.test(cleaned);
}

export function isAffirmativeResponse(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim();
  return /^(yes|yeah|yep|sure|okay|ok|alright|definitely|please do|go ahead|sounds good|i'd like that|id like that|yes please|sure thing|yes book it|yes please book it|yes show me|yeah sure)$/i.test(cleaned);
}

export function isNegativeResponse(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim();
  return /^(no|nope|nah|no thanks|no thank you|not now|i'm good|im good|that's all|thats all|no need|no don't|no dont|no i'm fine|no im fine)$/i.test(cleaned);
}

export function isShortFollowUp(text: string): boolean {
  if (!text) return false;
  const norm = text.trim().toLowerCase().replace(/[^\w\s?]/g, '');
  const words = norm.split(/\s+/).filter(Boolean);

  if (words.length <= 5) {
    const shortPhrases = [
      'free', 'free?', 'how much', 'how much?', 'when', 'when?', 'where', 'where?',
      'timing', 'timing?', 'timings', 'timings?', 'duration', 'duration?', 'how long', 'how long?',
      'what about', 'what about?', 'and price', 'and price?', 'price', 'price?', 'fee', 'fee?',
      'okay', 'ok', 'which one', 'which one?', 'can i', 'can i?', 'how', 'how?', 'why', 'why?',
      'available', 'available?', 'online', 'online?', 'weekend', 'weekend?', 'do you', 'do you?',
      'is it', 'is it?', 'are they', 'are they?', 'does it', 'does it?', 'how do i register', 'how do i register?',
      'what about timings', 'what about timings?', 'what about fee', 'what about fee?', 'what about duration', 'what about duration?'
    ];
    if (shortPhrases.some(p => norm === p || norm.startsWith(p))) return true;
  }
  return false;
}


export type DetectedLanguage =
  | 'en' | 'hinglish' | 'hi' | 'es' | 'fr' | 'de' | 'pt' | 'ar'
  | 'bn' | 'ta' | 'te' | 'kn' | 'ml' | 'gu' | 'pa' | 'unknown';

const COMMON_HINGLISH_WORDS = new Set([
  'kya','hai','hain','ka','ki','ke','ko','se','me','mein','mera','meri','mere','mujhe',
  'aap','apka','apki','apke','yeh','ye','woh','wo','kab','kahan','kaise','kitna','kitni',
  'kitne','chahiye','chahta','chahti','karna','kare','karo','karu','mil','milega','paisa',
  'paise','baat','insaan','aadmi','madad','batao','bataiye','nahi','nahin','haan','ji',
  'kripya','abhi','phir','aur','bhi','wala','wali','wale'
]);

const COMMON_SPELLING_ALIASES: Record<string,string> = {
  wat:'what',wht:'what',hw:'how',hwo:'how',plz:'please',pls:'please',thx:'thanks',
  thnks:'thanks',pric:'price',prce:'price',prcing:'pricing',pricingg:'pricing',
  feees:'fees',feee:'fee',cosst:'cost',duraton:'duration',durration:'duration',
  durtion:'duration',timng:'timing',timming:'timing',timimgs:'timings',
  schedual:'schedule',shcedule:'schedule',schedul:'schedule',avalable:'available',
  availble:'available',avilable:'available',availibility:'availability',
  eligibilty:'eligibility',prerequsite:'prerequisite',registr:'register',
  regster:'register',registe:'register',enrool:'enroll',enrol:'enroll',
  admision:'admission',admisson:'admission',cours:'course',coures:'course',
  corses:'courses',syallbus:'syllabus',sylabus:'syllabus',curiculum:'curriculum',
  humna:'human',humn:'human',peopel:'people',suport:'support',suppport:'support',
  custmer:'customer',contcat:'contact',cntact:'contact',emial:'email',phne:'phone',
  mesage:'message',intergration:'integration',integraton:'integration',
  integratoin:'integration',subcription:'subscription',subscripton:'subscription',
  subscribtion:'subscription',conversaton:'conversation',knwoledge:'knowledge',
  qualifcation:'qualification',qualificaton:'qualification',leades:'leads',
  leadd:'lead',busines:'business',webiste:'website',chatot:'chatbot',
  langauge:'language',languge:'language',multilangual:'multilingual',
  mulitlingual:'multilingual',agentdsk:'agentdesk',agentdek:'agentdesk'
};

function levenshteinDistance(a:string,b:string,maxDistance=3):number {
  if (a===b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length-b.length)>maxDistance) return maxDistance+1;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const current=[i]; let rowMin=current[0];
    for(let j=1;j<=b.length;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      const value=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+cost);
      current[j]=value; rowMin=Math.min(rowMin,value);
    }
    if(rowMin>maxDistance) return maxDistance+1;
    previous=current;
  }
  return previous[b.length];
}

function buildSpellVocabulary(extraVocabulary:string[]=[]):Set<string>{
  const vocabulary=new Set<string>([
    'what','how','when','where','why','which','can','could','would','do','does','is','are',
    'the','your','you','our','for','with','from','and','or','about','agentdesk','agent','human',
    'support','team','contact','phone','email','name','pricing','price','fee','fees','cost',
    'duration','timing','timings','schedule','demo','trial','refund','cancel','apply','enroll',
    'register','admission','eligibility','courses','course','program','programs','features',
    'integration','integrations','lead','leads','qualification','conversation','knowledge',
    'website','chatbot','sales','employee','voice','crm','automation','spreadsheet','webhook',
    'available','online','offline','weekend','today','tomorrow','please','thanks'
  ]);
  for(const rule of PATTERN_RULES){
    for(const source of [...rule.patterns,...(rule.hinglishPatterns||[]),...(rule.typoPatterns||[])]){
      for(const token of source.source.match(/[a-z][a-z0-9]{2,}/gi)||[]) vocabulary.add(token.toLowerCase());
    }
  }
  for(const value of extraVocabulary){
    for(const token of String(value||'').toLowerCase().match(/[a-z][a-z0-9]{2,}/g)||[]) vocabulary.add(token);
  }
  return vocabulary;
}

export function correctMisspellings(text:string,extraVocabulary:string[]=[]):string{
  if(!text) return '';
  const vocabulary=buildSpellVocabulary(extraVocabulary);
  return text.replace(/[A-Za-z][A-Za-z']*/g,token=>{
    const lower=token.toLowerCase();
    if(COMMON_SPELLING_ALIASES[lower]) return COMMON_SPELLING_ALIASES[lower];
    if(COMMON_HINGLISH_WORDS.has(lower)||vocabulary.has(lower)||lower.length<4) return lower;
    let best=lower; let bestDistance=lower.length>7?2:1;
    for(const candidate of vocabulary){
      if(Math.abs(candidate.length-lower.length)>bestDistance) continue;
      const distance=levenshteinDistance(lower,candidate,bestDistance);
      if(distance<bestDistance||(distance===bestDistance&&candidate.length===lower.length&&candidate<best)){
        best=candidate; bestDistance=distance;
      }
    }
    return best;
  });
}

export function detectLanguage(text:string):DetectedLanguage{
  if(!text) return 'en';
  const value=text.trim();
  if(/[\u0900-\u097F]/.test(value)) return 'hi';
  if(/[\u0980-\u09FF]/.test(value)) return 'bn';
  if(/[\u0B80-\u0BFF]/.test(value)) return 'ta';
  if(/[\u0C00-\u0C7F]/.test(value)) return 'te';
  if(/[\u0C80-\u0CFF]/.test(value)) return 'kn';
  if(/[\u0D00-\u0D7F]/.test(value)) return 'ml';
  if(/[\u0A80-\u0AFF]/.test(value)) return 'gu';
  if(/[\u0A00-\u0A7F]/.test(value)) return 'pa';
  if(/[\u0600-\u06FF]/.test(value)) return 'ar';
  const lower=value.toLowerCase();
  const hinglishHits=[...COMMON_HINGLISH_WORDS].filter(w=>new RegExp('\\b'+w+'\\b','i').test(lower)).length;
  if(hinglishHits>=2) return 'hinglish';
  if(/\b(hola|precio|cuanto|cuánto|gracias|quiero|hablar|persona|humano|ayuda|curso)\b/i.test(lower)) return 'es';
  if(/\b(bonjour|prix|combien|merci|je veux|parler|humain|aide|cours)\b/i.test(lower)) return 'fr';
  if(/\b(hallo|preis|wie viel|danke|ich möchte|sprechen|mensch|hilfe|kurs)\b/i.test(lower)) return 'de';
  if(/\b(olá|ola|preço|quanto|obrigado|quero|falar|pessoa|humano|ajuda|curso)\b/i.test(lower)) return 'pt';
  return 'en';
}

export function getLanguageInstruction(language:DetectedLanguage):string{
  const labels:Record<DetectedLanguage,string>={
    en:'English',
    hinglish:'Hinglish: natural Indian English mixed with Hindi written in Latin script',
    hi:'Hindi',es:'Spanish',fr:'French',de:'German',pt:'Portuguese',ar:'Arabic',
    bn:'Bengali',ta:'Tamil',te:'Telugu',kn:'Kannada',ml:'Malayalam',gu:'Gujarati',
    pa:'Punjabi',unknown:"the user's language"
  };
  return labels[language]||labels.en;
}
