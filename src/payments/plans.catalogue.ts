export interface PlanDetails {
  amount: number;
  currency: string;
  description: string;
}

export const PLAN_CATALOGUE: Record<string, PlanDetails> = {
  'group-1m': {
    amount: 100,
    currency: 'USD',
    description: 'Fluentia — Group classes (1 month)',
  },
  'group-2m': {
    amount: 180,
    currency: 'USD',
    description: 'Fluentia — Group classes (2 months)',
  },
  'group-3m': {
    amount: 250,
    currency: 'USD',
    description: 'Fluentia — Group classes (3 months)',
  },
  'group-6m': {
    amount: 420,
    currency: 'USD',
    description: 'Fluentia — Group classes (6 months)',
  },
  'group-12m': {
    amount: 780,
    currency: 'USD',
    description: 'Fluentia — Group classes (12 months)',
  },
  'private-30-1': {
    amount: 15,
    currency: 'USD',
    description: 'Fluentia — Private 30 min (1 session)',
  },
  'private-30-4': {
    amount: 52,
    currency: 'USD',
    description: 'Fluentia — Private 30 min (4 sessions)',
  },
  'private-30-8': {
    amount: 96,
    currency: 'USD',
    description: 'Fluentia — Private 30 min (8 sessions)',
  },
  'private-30-12': {
    amount: 132,
    currency: 'USD',
    description: 'Fluentia — Private 30 min (12 sessions)',
  },
  'private-30-16': {
    amount: 168,
    currency: 'USD',
    description: 'Fluentia — Private 30 min (16 sessions)',
  },
  'private-60-1': {
    amount: 25,
    currency: 'USD',
    description: 'Fluentia — Private 60 min (1 session)',
  },
  'private-60-4': {
    amount: 90,
    currency: 'USD',
    description: 'Fluentia — Private 60 min (4 sessions)',
  },
  'private-60-8': {
    amount: 170,
    currency: 'USD',
    description: 'Fluentia — Private 60 min (8 sessions)',
  },
  'private-60-12': {
    amount: 240,
    currency: 'USD',
    description: 'Fluentia — Private 60 min (12 sessions)',
  },
  'private-60-16': {
    amount: 300,
    currency: 'USD',
    description: 'Fluentia — Private 60 min (16 sessions)',
  },
};
