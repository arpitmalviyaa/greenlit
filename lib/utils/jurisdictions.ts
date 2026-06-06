export type JurisdictionCode = 'IN' | 'US' | 'UK' | 'UAE' | 'SG' | 'AU' | 'EU';
export type JurisdictionStatus = 'live' | 'coming_soon';

export interface Jurisdiction {
  code: JurisdictionCode;
  name: string;
  flag: string;
  status: JurisdictionStatus;
  description: string;
  corpus_sources: string[];
}

export const JURISDICTIONS: Jurisdiction[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    status: 'live',
    description: 'ASCI, SEBI, FSSAI, IT Act, Consumer Protection Act',
    corpus_sources: ['ASCI Code', 'SEBI Circular', 'FSSAI Guidelines', 'IT Act 2000', 'Consumer Protection Act 2019'],
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    status: 'live',
    description: 'FTC Endorsement Guides, COPPA, CAN-SPAM, CFPB rules',
    corpus_sources: ['FTC Endorsement Guides', 'COPPA', 'CAN-SPAM Act', 'CFPB Regulations'],
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    status: 'live',
    description: 'ASA/CAP Code, ICO guidelines, Consumer Rights Act',
    corpus_sources: ['ASA CAP Code', 'ICO Guidelines', 'Consumer Rights Act 2015', 'UK GDPR'],
  },
  {
    code: 'UAE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    status: 'coming_soon',
    description: 'NMC guidelines, UAE Consumer Protection Law, TDRA regulations',
    corpus_sources: ['UAE Federal Law No. 15/2020', 'NMC Code', 'TDRA Regulations'],
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    status: 'coming_soon',
    description: 'PDPA, CPFTA, MAS guidelines, ASAS code',
    corpus_sources: ['PDPA 2012', 'CPFTA', 'MAS Guidelines', 'ASAS Code'],
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    status: 'coming_soon',
    description: 'ACCC guidelines, Australian Consumer Law, Privacy Act',
    corpus_sources: ['Australian Consumer Law', 'ACCC Influencer Guidelines', 'Privacy Act 1988'],
  },
  {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    status: 'coming_soon',
    description: 'GDPR, DSA, UCPD, EU Consumer Rights Directive',
    corpus_sources: ['GDPR', 'Digital Services Act', 'UCPD', 'EU Consumer Rights Directive'],
  },
];

export const JURISDICTION_MAP = Object.fromEntries(
  JURISDICTIONS.map((j) => [j.code, j])
) as Record<JurisdictionCode, Jurisdiction>;
