export type CheckerCategory =
  | "Finance"
  | "Privacy"
  | "IP"
  | "Morality"
  | "Consumer"
  | "Health"
  | "Gaming"
  | "Political"
  | "Security";

export type CheckerMeta = {
  id: string;
  name: string;
  description: string;
  category: CheckerCategory;
};

export const CHECKERS: CheckerMeta[] = [
  {
    id: "sebi_finfluencer",
    name: "SEBI / Finfluencer",
    description: "Flags unregistered investment advice and SEBI finfluencer regulation violations",
    category: "Finance",
  },
  {
    id: "it_act",
    name: "IT Act",
    description: "Checks for IT Act 2000 violations including Section 66A-type content",
    category: "Morality",
  },
  {
    id: "dpdp_privacy",
    name: "DPDP Privacy",
    description: "Detects personal data exposure issues under the Digital Personal Data Protection Act 2023",
    category: "Privacy",
  },
  {
    id: "defamation",
    name: "Defamation",
    description: "Identifies statements that could constitute civil or criminal defamation under Indian law",
    category: "Morality",
  },
  {
    id: "copyright",
    name: "Copyright",
    description: "Detects potential copyright infringement in content or references to third-party works",
    category: "IP",
  },
  {
    id: "trademark_misuse",
    name: "Trademark Misuse",
    description: "Flags misuse of registered brand names and trademarks under the Trade Marks Act 1999",
    category: "IP",
  },
  {
    id: "obscenity",
    name: "Obscenity",
    description: "Checks content against Indian Penal Code Section 292 and IT Act obscenity standards",
    category: "Morality",
  },
  {
    id: "religious_sentiment",
    name: "Religious Sentiment",
    description: "Flags content likely to outrage religious feelings under IPC Section 295A",
    category: "Morality",
  },
  {
    id: "consumer_protection",
    name: "Consumer Protection",
    description: "Checks for misleading ads and endorsement disclosures under Consumer Protection Act 2019 and ASCI guidelines",
    category: "Consumer",
  },
  {
    id: "drugs_magic_remedies",
    name: "Drugs & Magic Remedies",
    description: "Detects prohibited claims under the Drugs and Magic Remedies (Objectionable Advertisements) Act 1954",
    category: "Health",
  },
  {
    id: "fssai_food",
    name: "FSSAI / Food",
    description: "Checks food and beverage content against FSSAI advertising standards",
    category: "Health",
  },
  {
    id: "health_medical",
    name: "Health & Medical",
    description: "Flags unsubstantiated health claims and medical advice under NMC guidelines",
    category: "Health",
  },
  {
    id: "gaming_betting",
    name: "Gaming & Betting",
    description: "Checks for prohibited online gaming, betting, and fantasy sports promotion",
    category: "Gaming",
  },
  {
    id: "election_political",
    name: "Election / Political",
    description: "Detects violations of the Representation of People Act and ECI guidelines during election periods",
    category: "Political",
  },
  {
    id: "official_secrets",
    name: "Official Secrets",
    description: "Flags potential violations of the Official Secrets Act 1923 and defence/security restrictions",
    category: "Security",
  },
];

export const CHECKER_MAP: Record<string, CheckerMeta> = Object.fromEntries(
  CHECKERS.map((c) => [c.id, c])
);
