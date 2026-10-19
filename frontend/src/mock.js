export const triage = [
  { id: 'INV0042', name: 'Ananya Kulkarni', risk_profile: 'Moderate', aum: 6850000, goal: 'Retirement', goal_year: 2031,
    ahs: 48, status: 'Critical', priority: 142.6, reasons: ['Equity +11 pp vs target', 'SIP paused, timing cost -1.9%'],
    breach: null, opportunity: null, days_since_contact: 164, tags: ['Redeems in drawdowns', 'SIP paused'] },
  { id: 'INV0107', name: 'Rohan Mehta', risk_profile: 'Conservative', aum: 4200000, goal: 'Child education', goal_year: 2029,
    ahs: 81, status: 'Critical', priority: 1031.2, reasons: ['Holds a restricted sector (Tobacco)', 'Debt -6 pp vs target'],
    breach: 'Holds a restricted sector (Tobacco)', opportunity: null, days_since_contact: 92, tags: ['SIP-consistent'] },
  { id: 'INV0013', name: 'Farah Siddiqui', risk_profile: 'Aggressive', aum: 2900000, goal: 'Wealth creation', goal_year: 2041,
    ahs: 72, status: 'Moderate', priority: 38.4, reasons: ['Volatility 15.1% vs 14% cap', 'Funds lag benchmark by 0.8%'],
    breach: null, opportunity: 'Idle cash 12%: deploy', days_since_contact: 40, tags: ['SIP-consistent', 'High idle cash'] },
  { id: 'INV0188', name: 'Vikram Desai', risk_profile: 'Moderate', aum: 9100000, goal: 'House purchase', goal_year: 2028,
    ahs: 91, status: 'Aligned', priority: 12.1, reasons: ['Within all tolerances'],
    breach: null, opportunity: 'Goal ahead of plan: consider de-risking', days_since_contact: 21, tags: ['SIP-consistent'] },
];

const base = {
  headline: 'Critical: -6.2% vs what the advice expected. Market explains -3.1%; -3.1% is controllable (equity +11 pp vs target).',
  goal_amount: 21500000, sip: { planned: 40000, current: 12000 },
  tiles: { goal_prob: 58, goal_target: 80, volatility: 11.8, vol_cap: 10, allocation_drift: 11.4, advice_gap: -6.2 },
  allocation: [
    { asset: 'Equity', target: 55, actual: 66 }, { asset: 'Debt', target: 35, actual: 25 },
    { asset: 'Gold', target: 5, actual: 3 }, { asset: 'Cash', target: 5, actual: 6 },
  ],
  returns: { expected: 9.95, policy: 6.85, actual: 5.62, xirr: 3.72 },
  waterfall: [
    { label: 'Market', value: -3.1 }, { label: 'Allocation', value: -0.65 },
    { label: 'Selection', value: -0.58 }, { label: 'Behaviour', value: -1.9 },
  ],
  timeline: ['Nov 25','Dec 25','Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26','Jul 26','Aug 26','Sep 26','Oct 26']
    .map((month, i) => {
      const t = (i + 1) / 12, w = Math.sin(Math.PI * t);
      return { month, expected: +(((1.0995 ** t) - 1) * 100).toFixed(2),
               policy: +(6.85 * t - 2.2 * w).toFixed(2), actual: +(5.62 * t - 3.4 * w).toFixed(2) };
    }),
  advice: [
    { date: '2025-10-15', action: 'Set allocation to 55/35 equity/debt', expected_outcome: 'About 9.9% a year', status: 'Executed' },
    { date: '2026-03-10', action: 'Continue SIP of Rs 40,000/month', expected_outcome: 'Retirement by 2031', status: 'Not followed' },
  ],
};

export const detail = (id) => ({ ...base, ...(triage.find((t) => t.id === id) ?? triage[0]) });

export const rebalance = {
  trades: [
    { action: 'Sell', asset: 'Equity', detail: '11.0% of portfolio' },
    { action: 'Buy', asset: 'Debt', detail: '10.0% of portfolio' },
    { action: 'Buy', asset: 'Gold', detail: '2.0% of portfolio' },
    { action: 'Restart SIP', asset: 'SIP', detail: 'Rs 40,000/month' },
  ],
  style: 'Staggered over 3 months (STP), as the client tends to redeem in dips',
  before: { ahs: 48, goal_prob: 58, volatility: 11.8 },
  after: { ahs: 79, goal_prob: 81, volatility: 9.6 },
};

export const sampleTranscript =
  "Met with the client today. She has just been promoted and wants to retire earlier, in 2040 instead of 2045. She's comfortable staying moderate on risk. We agreed to move to 60 percent equity and 30 percent debt, and to restart her SIP at 40,000 rupees a month from November. She asked us to avoid tobacco and alcohol companies. I expect this to get her back to around 11 percent a year.";

export const extract = {
  source: 'local LLM',
  current: { risk_profile: 'Moderate', target_equity_pct: 55, target_debt_pct: 35, goal: 'Retirement', goal_year: 2031, monthly_sip: 40000 },
  extracted: {
    risk_profile: 'Moderate', target_return_pct: 11, target_equity_pct: 60, target_debt_pct: 30,
    goal: 'Retirement', goal_year: 2040, monthly_sip: 40000, restricted_sectors: ['Tobacco', 'Alcohol'],
    advice_items: [{ action: 'Restart SIP at Rs 40,000/month', expected_outcome: 'Back to about 11% a year' }],
    life_events: ['Promotion'],
    evidence: [
      { field: 'goal_year', quote: 'wants to retire earlier, in 2040 instead of 2045' },
      { field: 'target_equity_pct', quote: 'move to 60 percent equity and 30 percent debt' },
      { field: 'target_debt_pct', quote: 'move to 60 percent equity and 30 percent debt' },
      { field: 'monthly_sip', quote: 'restart her SIP at 40,000 rupees a month' },
      { field: 'restricted_sectors', quote: 'avoid tobacco and alcohol companies' },
      { field: 'target_return_pct', quote: 'back to around 11 percent a year' },
    ],
  },
};

export const brief = {
  source: 'local LLM', verified: true,
  text: "Dear {CLIENT},\n\nOver the past year your portfolio returned 3.7%, below the 9.9% we planned for. Most of that gap came from the market, which accounted for -3.1%. The part we can fix is your mix: it has drifted towards equity, and your monthly SIP has been paused.\n\nWe propose moving gradually back to your agreed mix over three months and restarting your SIP. This lifts the chance of reaching your retirement goal from 58% to 81%.\n\nCan we speak this week?",
};
