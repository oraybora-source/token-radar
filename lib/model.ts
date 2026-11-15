// Token Radar's model, version radar-2: one snapshot of the protocol universe in, one ranked
// board out. Every number below is a function of the snapshot's own figures. No protocol name
// is ever special-cased: the same function scores every row, and every constant is stated in
// the dashboard's model panel so a reader can check it.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and
// adds pre-token protocols below the watchlist floor: the early rows the radar exists to
// find. A protocol is pre-token when its index entry records no token (no market cap, no
// CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart and shown as
// the market's own values, never mixed into the ranked board.
//
// Expected launch value follows from the snapshot's own figures, in four parts:
//
//   comp multiple  = the category's market multiple: the median market-cap / TVL of the
//                    live-token protocols in the same category, shrunk toward the global
//                    median by sample size (a category with few live comps moves the
//                    multiple only a little), and capped at twice the global median, so no
//                    thin category can bend the board. Categories with no live comps use
//                    the global median. Computed from this snapshot, every run.
//   base           = tvl_usd x comp multiple
//   growth         = clamp(change_7d, -60, 120) per cent
//   growthMult     = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity       = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365 days)
//   implied        = max(1, round(base x growthMult x maturity))
//   likelihood     = the chance the category's protocols ever issue a token at all, from
//                    how the category works: tokens are the norm for exchanges, lenders
//                    and yield vaults, and structurally unlikely for payment networks and
//                    chains that move other people's assets. A stated judgement, by
//                    category only, never by name.
//   expected value = max(1, round(implied x likelihood))
//
// The board ranks by expected value: the worth of a launch times the chance it happens.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** How strongly a category's own comps pull its multiple from the global median. */
  comp_prior_weight: number;
  /** The widest a category multiple may stray from the global median, as a ratio. */
  comp_max_ratio: number;
  comp_min_multiple: number;
  comp_max_multiple: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  comp_prior_weight: 8,
  comp_max_ratio: 2,
  comp_min_multiple: 0.05,
  comp_max_multiple: 0.6,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  /** The ranking number: the implied value times the launch likelihood. */
  implied_value_usd: number;
  /** The implied value before the likelihood is applied. */
  raw_implied_value_usd: number;
  /** The chance this category's protocols ever issue a token, 0 to 1. */
  launch_likelihood: number;
  /** The category's market multiple used for this row. */
  comp_multiple: number;
  farm_difficulty: 'Easy' | 'Moderate' | 'Advanced';
  model: {
    comp_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    launch_likelihood: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  raw_implied_value_usd: number;
  launch_likelihood: number;
  comp_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_difficulty: 'Easy' | 'Moderate' | 'Advanced';
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  mcap_tvl_ratio: number | null;
  change_7d: number | null;
}

/** One category's comps, as the model panel shows them. */
export interface CompRow {
  category: string;
  live_count: number;
  median_multiple: number | null;
  used_multiple: number;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_expected_usd: number;
  total_tvl_usd: number;
  watchlist: string[];
  comps: CompRow[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted array of numbers. */
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The category multiples, computed from the snapshot's own live-token protocols: for each
 * category, the median market-cap / TVL of its live-token protocols, shrunk toward the global
 * median by sample size and capped at twice the global median. A category with no live comps
 * uses the global median. The same table is shown in the dashboard's model panel.
 */
export function categoryComps(snapshot: Snapshot, model: ModelConstants = MODEL): { global: number; byCategory: Map<string, number>; table: CompRow[] } {
  const live = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0,
  );
  const allRatios = live.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
  const global = median(allRatios);
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const key = (p.category ?? 'Other').toLowerCase();
    const arr = byCat.get(key);
    if (arr) arr.push(p.mcap_usd! / p.tvl_usd);
    else byCat.set(key, [p.mcap_usd! / p.tvl_usd]);
  }
  const lo = global / model.comp_max_ratio;
  const hi = global * model.comp_max_ratio;
  const clampMult = (m: number): number =>
    Math.min(model.comp_max_multiple, Math.max(model.comp_min_multiple, Math.min(hi, Math.max(lo, m))));
  const byCategory = new Map<string, number>();
  const table: CompRow[] = [];
  const cats = new Set<string>();
  for (const p of snapshot.protocols) cats.add((p.category ?? 'Other').toLowerCase());
  for (const cat of [...cats].sort()) {
    const ratios = (byCat.get(cat) ?? []).sort((a, b) => a - b);
    const catMedian = ratios.length > 0 ? median(ratios) : null;
    const used =
      catMedian === null
        ? clampMult(global)
        : clampMult((ratios.length * catMedian + model.comp_prior_weight * global) / (ratios.length + model.comp_prior_weight));
    byCategory.set(cat, used);
    table.push({ category: cat, live_count: ratios.length, median_multiple: catMedian, used_multiple: Math.round(used * 1000) / 1000 });
  }
  return { global, byCategory, table };
}

/**
 * The chance a category's protocols ever issue a token, as a stated judgement by category
 * only. Tokens are the norm for exchanges, lenders and yield products; a payment network or
 * a chain that moves other people's assets has far less reason to issue one. The dashboard
 * lists this table beside the formula, so the judgement is visible, not hidden.
 */
export function launchLikelihood(category: string | null): number {
  const c = (category ?? '').toLowerCase();
  if (c.includes('dex') || c.includes('lending') || c.includes('yield') || c.includes('derivative') || c.includes('perpetual') || c.includes('prediction') || c.includes('leveraged farm') || c.includes('liquidity manager')) return 0.85;
  if (c.includes('curator') || c.includes('allocator') || c.includes('indexes') || c.includes('launchpad')) return 0.8;
  if (c.includes('rwa') || c.includes('basis trading') || c.includes('cdp') || c.includes('stablecoin')) return 0.75;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking pool') || c.includes('insurance') || c.includes('cedefi') || c.includes('collateral')) return 0.65;
  if (c.includes('chain') || c.includes('payments') || c.includes('governance incentives') || c.includes('bridge')) return 0.5;
  return 0.7;
}

/** The multipliers and the expected value one protocol gets under `model`. */
export function expectedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  compMultiple: number,
  model: ModelConstants,
): { implied: number; expected: number; likelihood: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const base = protocol.tvl_usd * compMultiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  const likelihood = launchLikelihood(protocol.category);
  const expected = Math.max(1, Math.round(implied * likelihood));
  return { implied, expected, likelihood, growthPct, growthMult, maturityMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const { byCategory } = categoryComps(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped. Never a replacement
  // for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const mult = byCategory.get((p.category ?? 'Other').toLowerCase()) ?? MODEL.comp_min_multiple;
    const v = expectedValue(p, snapshot.as_of, mult, model);
    return { p, mult, ...v };
  });
  scored.sort((a, b) => b.expected - a.expected || b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.expected,
    raw_implied_value_usd: s.implied,
    launch_likelihood: s.likelihood,
    comp_multiple: s.mult,
    farm_difficulty: farmDifficulty(s.p),
    model: {
      comp_multiple: s.mult,
      growth_pct: s.growthPct,
      growth_multiplier: s.growthMult,
      maturity_multiplier: s.maturityMult,
      launch_likelihood: s.likelihood,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Gas for one transaction on a chain: cheap L2s and fast L1s cost cents, Ethereum costs dollars. */
function gasTier(chain: string): { label: string; tx: string; weekly: string } {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return { label: 'Ethereum mainnet gas', tx: 'about $4 of gas', weekly: 'about $4 of gas a week' };
  if (c === 'bitcoin' || c === 'tron' || c === 'bsquared' || c === 'core' || c === 'babylon genesis') {
    return { label: 'costly-chain gas', tx: 'about $2 of gas', weekly: 'about $2 of gas a week' };
  }
  return { label: 'low-fee chain gas', tx: 'under $0.50 of gas', weekly: 'under $0.50 of gas a week' };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** How hard the farm is: derivatives and bridges on mainnet are the most demanding. */
export function farmDifficulty(p: SnapshotProtocol): 'Easy' | 'Moderate' | 'Advanced' {
  const c = (p.category ?? '').toLowerCase();
  const mainnetOnly = p.chains.length > 0 && p.chains.every((ch) => ch.toLowerCase() === 'ethereum');
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('leveraged farm') || c.includes('bridge')) return 'Advanced';
  if (mainnetOnly || c.includes('rwa') || c.includes('insurance') || c.includes('basis trading')) return 'Moderate';
  return 'Easy';
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow $10 against it so both sides of the market see your wallet.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and hold the vault shares; curators snapshot vault balances.`;
  if (c.includes('dex')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position in range.`;
  if (c.includes('yield') || c.includes('leveraged farm')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL strategy on ${chain} and leave it compounding.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name}, then use the bridged funds in its app instead of bridging straight back.`;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking pool')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position, then close it the same week.`;
  if (c.includes('prediction')) return `Fund $${capital} on ${name} and place one market position, then leave the winnings in the account.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it through one full distribution cycle.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and keep the balance untouched.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active for the full term.`;
  if (c.includes('basis trading')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and hold the shares through one funding cycle.`;
  if (c.includes('chain')) return `Bridge $${capital} to ${chain} through ${name}'s own bridge and use the chain's flagship app once a week.`;
  if (c.includes('payments')) return `Send one real payment of $${capital} through ${name} each week and keep the wallet funded between payments.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Adjust the supply or the borrow a little each week, so the position shows fresh activity.`;
  if (c.includes('curator') || c.includes('allocator')) return `Top the vault up by a small amount, or move between two of ${name}'s vaults, once a week.`;
  if (c.includes('dex')) return `Swap a small amount through ${name}'s main pool once a week, on top of the liquidity position.`;
  if (c.includes('yield') || c.includes('leveraged farm')) return `Claim and re-deposit the yield once a week instead of letting it sit unclaimed.`;
  if (c.includes('bridge')) return `Bridge a small amount through ${name} once a week rather than once and never again.`;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking pool')) return `Check the staking rewards once a week and restake them instead of withdrawing.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Open and close one small position a week, keeping the margin deposited throughout.`;
  if (c.includes('prediction')) return `Place one small market position a week and let the earlier ones settle.`;
  if (c.includes('rwa')) return `Leave the yield asset untouched and confirm each distribution lands in the same wallet.`;
  if (c.includes('stable')) return `Keep the stable balance in place and use the protocol's app once a week.`;
  if (c.includes('insurance')) return `Keep the policy active and check once a week that it still covers the position.`;
  if (c.includes('basis trading')) return `Leave the vault shares in place and check the funding rate once a week.`;
  if (c.includes('chain')) return `Use the chain's flagship app once a week so the wallet shows repeat activity.`;
  if (c.includes('payments')) return `Send one small real payment a week instead of a single large one.`;
  return `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`;
}

/** The category's points check, for the step before withdrawing. */
function pointsFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('curator') || c.includes('allocator')) return `Open ${p.name}'s vault page and confirm your vault shares and any points balance before you move anything.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Open the protocol's rewards page and confirm the supply and borrow both counted before you repay.`;
  if (c.includes('dex')) return `Open the protocol's rewards page and confirm the liquidity position and the swaps both counted.`;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking pool')) return `Confirm the receipt token and the staking rewards are in the same wallet before you unstake.`;
  if (c.includes('rwa')) return `Confirm the distributions for the full holding period landed before you redeem the asset.`;
  return `Open the protocol's own points or rewards page and claim only from the link it publishes.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list
 * of names: the same function plans every row.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasTier(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $1 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and ${gas.tx}`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p),
      cost: gas.weekly,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `${pointsFor(p)} Never pay to claim, and never follow a claim link from a chat or a comment.`,
      cost: 'no fee to check',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      mcap_tvl_ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? Math.round((p.mcap_usd / p.tvl_usd) * 1000) / 1000 : null,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    raw_implied_value_usd: row.raw_implied_value_usd,
    launch_likelihood: row.launch_likelihood,
    comp_multiple: row.comp_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    farm_difficulty: row.farm_difficulty,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const { table } = categoryComps(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_expected_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    total_tvl_usd: board.reduce((n, r) => n + r.tvl_usd, 0),
    watchlist: snapshot.watchlist,
    comps: table,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
