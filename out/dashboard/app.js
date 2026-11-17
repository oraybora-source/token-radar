// Token Radar's dashboard, radar-4. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, a filterable table, a per-protocol detail view with
// the model's own inputs and the protocol's farm plan, and a model sandbox that re-ranks the
// board live. The board carries the farm economics and the value band on every row, a scatter
// chart and an ablation table for the fit, a best-farms card, and a strip accounting for all
// 758 protocols. No network: every byte it shows is in data.js. No protocol name is
// special-cased anywhere here: every number is recomputed from the snapshot figures.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var DEF = { growth_weight: 0.5, useComp: true, useLikelihood: true };
  var state = { q: '', category: 'all', chain: 'all', tab: 'pre-token', sort: 'expected', dir: -1, selected: null, wl: false, sb: { growth_weight: DEF.growth_weight, useComp: true, useLikelihood: true } };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  // The model in one function: the page recomputes a row from the snapshot figures and checks
  // the number board.json carries, so the page's code and the board's data are visibly the same
  // arithmetic. The sandbox changes only the three inputs below; the board's ranks never move.
  function expectedOf(row, sb) {
    var m = DATA.model;
    var growth = clamp(row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d, m.growth_floor, m.growth_cap);
    var growthMult = 1 + (growth / 100) * sb.growth_weight;
    var fitted = sb.useComp ? row.fitted_value_usd : row.base_fitted_value_usd;
    var implied = Math.max(1, Math.round(fitted * growthMult * row.maturity_multiplier));
    var expected = Math.max(1, Math.round(implied * (sb.useLikelihood ? row.launch_likelihood : 1)));
    return { implied: implied, expected: expected };
  }
  function sbActive() {
    return state.sb.growth_weight !== DEF.growth_weight || !state.sb.useComp || !state.sb.useLikelihood;
  }
  function effExpected(row) { return expectedOf(row, state.sb).expected; }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL
  // and age decide the action, the capital, the hold and every cost and time. The page
  // regenerates it from the row so the dialog and the board can never disagree.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function gasTx(chain) {
    var c = (chain || '').toLowerCase();
    if (c === 'ethereum') return 'about $4 of gas';
    if (c === 'bitcoin' || c === 'tron' || c === 'bsquared' || c === 'core' || c === 'babylon genesis') return 'about $2 of gas';
    return 'under $0.50 of gas';
  }
  function gasWeekly(chain) {
    var c = (chain || '').toLowerCase();
    if (c === 'ethereum') return 'about $4 of gas a week';
    if (c === 'bitcoin' || c === 'tron' || c === 'bsquared' || c === 'core' || c === 'babylon genesis') return 'about $2 of gas a week';
    return 'under $0.50 of gas a week';
  }
  function gasUsd(chain) {
    var c = (chain || '').toLowerCase();
    if (c === 'ethereum') return { tx: 4, weekly: 4 };
    if (c === 'bitcoin' || c === 'tron' || c === 'bsquared' || c === 'core' || c === 'babylon genesis') return { tx: 2, weekly: 2 };
    return { tx: 0.5, weekly: 0.5 };
  }
  // The farm plan's dollar netting, the same arithmetic main.ts writes to board.json:
  // low-end expected farmer value minus farm cost, at the band's low end.
  function farmEcon(row) {
    var m = DATA.model;
    var capital = capitalFor(row);
    var hold = holdDaysFor(row.age_days);
    var gas = gasUsd(chainOf(row));
    var weeks = Math.ceil(hold / 7);
    var gasCost = Math.round((gas.tx + gas.weekly * weeks) * 100) / 100;
    var opp = Math.round(capital * m.opp_rate_yr * (hold / 365) * 100) / 100;
    var cost = Math.max(1, Math.round(gasCost + opp));
    var gross = Math.max(0, Math.round(row.low_expected_value_usd * m.pool_share * capital / (m.farmed_share * row.tvl_usd)));
    var net = gross - cost;
    var verdict = net >= m.farm_threshold_usd ? 'farm' : net >= 0 ? 'thin' : 'skip';
    return { capital: capital, gas: gasCost, opp: opp, cost: cost, gross: gross, net: net, verdict: verdict };
  }
  // Active hours behind a farm plan: the steps' own times added up (5 minutes for the
  // wallet, 15 to set up, 10 a week through the hold, 10 to check points, 5 for the log).
  // Net per hour is the low-end net divided by those hours: the return on the farmer's
  // time, not on the capital sitting in the position.
  function activeHours(hold) { return (35 + 10 * Math.ceil(hold / 7)) / 60; }
  function netPerHour(row) {
    var econ = farmEcon(row);
    var hold = holdDaysFor(row.age_days);
    var hours = activeHours(hold);
    return { econ: econ, hold: hold, hours: hours, perHour: econ.net / hours };
  }
  function fmtPerHour(v) {
    var a = Math.abs(v);
    return (v >= 0 ? '+' : '-') + '$' + (a >= 100 ? Math.round(a) : a >= 10 ? a.toFixed(1) : a.toFixed(2)) + '/h';
  }
  // The P25-P75 band: the central half of the model's lognormal value band, +-0.6745 sigma.
  function band25_75(ev) {
    var f = Math.pow(10, 0.6745 * DATA.fit.sigma_dex);
    return { lo: ev / f, hi: ev * f };
  }
  function shortAction(row) {
    var a = actionFor(row, capitalFor(row), chainOf(row));
    return a.length > 72 ? a.slice(0, 69) + '...' : a;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ', then borrow $10 against it so both sides of the market see your wallet.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and hold the vault shares; curators snapshot vault balances.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position in range.';
    if (c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s highest-TVL strategy on " + chain + ' and leave it compounding.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ', then use the bridged funds in its app instead of bridging straight back.';
    if (c.indexOf('restak') >= 0 || c.indexOf('liquid staking') >= 0 || c.indexOf('staking pool') >= 0) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt token in the same wallet.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position, then close it the same week.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' on ' + name + ' and place one market position, then leave the winnings in the account.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of ' + name + "'s yield-bearing asset on " + chain + ' and hold it through one full distribution cycle.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and keep the balance untouched.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active for the full term.';
    if (c.indexOf('basis trading') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s basis vault on " + chain + ' and hold the shares through one funding cycle.';
    if (c.indexOf('chain') >= 0) return 'Bridge $' + capital + ' to ' + chain + " through " + name + "'s own bridge and use the chain's flagship app once a week.";
    if (c.indexOf('payments') >= 0) return 'Send one real payment of $' + capital + ' through ' + name + ' each week and keep the wallet funded between payments.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function weeklyFor(p) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Adjust the supply or the borrow a little each week, so the position shows fresh activity.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Top the vault up by a small amount, or move between two of ' + name + "'s vaults, once a week.";
    if (c.indexOf('dex') >= 0) return 'Swap a small amount through ' + name + "'s main pool once a week, on top of the liquidity position.";
    if (c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Claim and re-deposit the yield once a week instead of letting it sit unclaimed.';
    if (c.indexOf('bridge') >= 0) return 'Bridge a small amount through ' + name + ' once a week rather than once and never again.';
    if (c.indexOf('restak') >= 0 || c.indexOf('liquid staking') >= 0 || c.indexOf('staking pool') >= 0) return 'Check the staking rewards once a week and restake them instead of withdrawing.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Open and close one small position a week, keeping the margin deposited throughout.';
    if (c.indexOf('prediction') >= 0) return 'Place one small market position a week and let the earlier ones settle.';
    if (c.indexOf('rwa') >= 0) return 'Leave the yield asset untouched and confirm each distribution lands in the same wallet.';
    if (c.indexOf('stable') >= 0) return 'Keep the stable balance in place and use the protocol\'s app once a week.';
    if (c.indexOf('insurance') >= 0) return 'Keep the policy active and check once a week that it still covers the position.';
    if (c.indexOf('basis trading') >= 0) return 'Leave the vault shares in place and check the funding rate once a week.';
    if (c.indexOf('chain') >= 0) return 'Use the chain\'s flagship app once a week so the wallet shows repeat activity.';
    if (c.indexOf('payments') >= 0) return 'Send one small real payment a week instead of a single large one.';
    return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
  }
  function pointsFor(p) {
    var c = (p.category || '').toLowerCase();
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Open ' + p.name + "'s vault page and confirm your vault shares and any points balance before you move anything.";
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Open the protocol\'s rewards page and confirm the supply and borrow both counted before you repay.';
    if (c.indexOf('dex') >= 0) return 'Open the protocol\'s rewards page and confirm the liquidity position and the swaps both counted.';
    if (c.indexOf('restak') >= 0 || c.indexOf('liquid staking') >= 0 || c.indexOf('staking pool') >= 0) return 'Confirm the receipt token and the staking rewards are in the same wallet before you unstake.';
    if (c.indexOf('rwa') >= 0) return 'Confirm the distributions for the full holding period landed before you redeem the asset.';
    return 'Open the protocol\'s own points or rewards page and claim only from the link it publishes.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\'s own page.';
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var econ = farmEcon(p);
    var verdictWord = econ.verdict === 'farm' ? 'FARM' : econ.verdict === 'thin' ? 'THIN' : 'SKIP';
    var netWord = econ.net >= 0 ? '+$' + econ.net : '-$' + (-econ.net);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: gasTx(chain) + ' for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: gasTx(chain) + ' on ' + chain, time: '15 minutes to set up' },
      { text: weeklyFor(p), cost: gasWeekly(chain), time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: pointsFor(p) + ' Never pay to claim, and never follow a claim link from a chat or a comment.', cost: 'no fee to check', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
      { text: 'Netting at the low end of the value band: a $' + capital + ' position is expected to earn $' + econ.gross + ' gross from the launch pool, farm costs are $' + econ.cost + ', net ' + netWord + ' — verdict: ' + verdictWord + '. The pool is 10% of implied value and farmed TVL is 1% of protocol TVL; both are stated assumptions, not facts.', cost: '$' + econ.cost + ' in total farm costs', time: hold + ' days of holding' }
    ].map(stepText);
  }

  // One line on what a category does, for the detail view. A function of the category only.
  function categoryLine(c) {
    var s = (c || '').toLowerCase();
    if (s.indexOf('curator') >= 0 || s.indexOf('allocator') >= 0) return 'A vault curator: it runs yield vaults on other protocols and takes a fee on what they earn.';
    if (s.indexOf('lend') >= 0) return 'A lending market: users supply assets and borrow against them.';
    if (s.indexOf('dex') >= 0) return 'A decentralised exchange: users swap and provide liquidity.';
    if (s.indexOf('rwa') >= 0) return 'Real-world assets on chain: tokenised yield from off-chain assets.';
    if (s.indexOf('yield') >= 0) return 'A yield product: deposits are routed into strategies that pay a return.';
    if (s.indexOf('bridge') >= 0) return 'A bridge: it moves assets between chains.';
    if (s.indexOf('restak') >= 0 || s.indexOf('staking') >= 0) return 'A staking product: it stakes assets and issues a receipt for them.';
    if (s.indexOf('perpetual') >= 0 || s.indexOf('derivative') >= 0) return 'A derivatives venue: traders take leveraged positions.';
    if (s.indexOf('cdp') >= 0) return 'A collateralised debt position: users lock collateral and mint a stable asset.';
    if (s.indexOf('basis trading') >= 0) return 'A basis-trading vault: it earns the spread between spot and futures.';
    if (s.indexOf('payments') >= 0) return 'A payments network: it moves value between users.';
    if (s.indexOf('chain') >= 0) return 'A chain: the base layer other apps build on.';
    if (s.indexOf('insurance') >= 0) return 'An insurance protocol: it sells cover against on-chain losses.';
    if (s.indexOf('stable') >= 0) return 'A stable asset: it holds a peg to a fiat currency.';
    return 'A decentralised protocol tracked by the snapshot.';
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('wl') === '1') state.wl = true;
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.wl) params.set('wl', '1');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    var wl = {};
    DATA.rows.forEach(function (r) { if (DATA.watchlist.indexOf(r.slug) >= 0) wl[r.slug] = true; });
    return DATA.rows.filter(function (r) {
      if (state.wl && !wl[r.slug]) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    var active = sbActive();
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'likelihood') { av = a.launch_likelihood; bv = b.launch_likelihood; }
      else if (key === 'net') { av = a.farm.net_low_usd; bv = b.farm.net_low_usd; }
      else { av = active ? effExpected(a) : a.implied_value_usd; bv = active ? effExpected(b) : b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' }, el('div', { class: 'top-inner' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', null, 'Snapshot ', el('b', { text: DATA.as_of })),
        el('span', null, 'Source: ', el('b', { text: 'DefiLlama protocol index' })),
        el('span', null, 'Model ', el('b', { text: DATA.model_version }))
      )
    ));
  }

  function lede() {
    var d = DATA.disposition;
    var parts = [
      ['Ranked', d.ranked, '#b96a00'],
      ['Already record a token', d.tokened, '#5c6b78'],
      ['Bridges', d.bridge, '#7a6a9b'],
      ['Liquid staking / restaking', d.lst, '#4a7a96'],
      ['Exchange', d.exchange, '#96704a'],
      ['Versioned or wrapped', d.versioned_wrapped, '#8a8a5c'],
      ['Below the cut', d.below_cut, '#b9b09a'],
    ];
    var bar = el('div', { class: 'dispo-bar', 'aria-hidden': 'true' });
    parts.forEach(function (p) {
      bar.appendChild(el('i', { style: 'width:' + (p[1] / d.total * 100).toFixed(1) + '%;background:' + p[2], title: p[0] + ': ' + p[1] }));
    });
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.board_size + ' pre-token protocols, ranked by expected launch value' }),
        el('p', null, 'The watchlist is the floor: every protocol with at least ', el('b', { text: '$' + Math.round(DATA.floor_usd / 1e6) + 'M' }), ' of TVL and no token on record. The board adds ', el('b', { text: String(DATA.offlist_size) }), ' off-list launches above that floor and ', el('b', { text: String(DATA.board_size - DATA.watchlist_size - DATA.offlist_size) }), ' pre-token protocols below it. Expected value is the fitted launch value times the chance the category ever issues a token. Every farm plan is netted to the dollar at the low end of the value band. It is a model, not a promise, and never a prediction of when a token comes.')
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Off-list above the floor' }), el('b', { text: String(DATA.offlist_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Total expected value' }), el('b', { text: fmtUsd(DATA.total_expected_usd) })),
        el('div', { class: 'fact' }, el('span', { text: 'TVL tracked on the board' }), el('b', { text: fmtUsd(DATA.total_tvl_usd) })),
        el('div', { class: 'fact' }, el('span', { text: 'Size curve fitted' }), el('b', { text: DATA.fit.comps_n + ' comps · R² ' + DATA.fit.r2.toFixed(2) })),
        el('div', { class: 'fact' }, el('span', { text: 'Out-of-sample, time-split' }), el('b', { text: 'x' + DATA.fit.timesplit_factor.toFixed(2) + ' median error' })),
        el('div', { class: 'fact' }, el('span', { text: 'Farm verdicts' }), el('b', { text: DATA.fit.verdict_counts.farm + ' farm · ' + DATA.fit.verdict_counts.thin + ' thin · ' + DATA.fit.verdict_counts.skip + ' skip' }))
      ),
      el('div', { class: 'dispo' },
        el('div', { class: 'dispo-line' },
          el('b', { text: 'Where the ' + d.total + ' protocols go: ' }),
          el('span', { text: parts.map(function (p) { return p[1] + ' ' + p[0].toLowerCase(); }).join(' · ') })
        ),
        bar,
        el('p', { class: 'sub', text: 'Bridges, staking products, exchanges and versioned or wrapped products are set aside by the watchlist rule; the ' + d.below_cut + ' below the cut are pre-token and rankable, but below the board’s early cut. Every protocol is counted once.' })
      )
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSel = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c + ' (' + DATA.rows.filter(function (r) { return (r.category || 'Other') === c; }).length + ')', selected: c === state.category ? 'selected' : null }); })
    );
    catSel.addEventListener('change', function () { state.category = catSel.value; writeHash(); render(); });
    var chainSel = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeHash(); render(); });
    var wlBox = el('input', { type: 'checkbox', id: 'wl', checked: state.wl ? 'checked' : null, 'aria-label': 'Watchlist only' });
    wlBox.addEventListener('change', function () { state.wl = wlBox.checked; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeHash(); render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), catSel),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSel),
      el('label', { class: 'check' }, wlBox, 'Watchlist only'),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count sub', text: state.tab === 'pre-token' ? rows().length + ' rows shown' : DATA.live.length + ' live-token protocols' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }
  function diffBadge(d) {
    return el('span', { class: 'badge ' + (d === 'Easy' ? 'easy' : d === 'Moderate' ? 'mod' : 'adv'), text: d });
  }
  function verdictBadge(v) {
    // NOTE: the class must be verdict-skip, not "verdict skip": app.css has a .skip
    // rule for the skip-to-content link that positions it off-screen.
    return el('span', { class: 'badge verdict-' + v, text: v === 'farm' ? 'FARM' : v === 'thin' ? 'THIN' : 'SKIP' });
  }

  function boardTable() {
    var list = sortedRows(rows());
    var active = sbActive();
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category or chain to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.wl = false; writeHash(); render(); } })
      ));
    }
    var max = Math.max.apply(null, list.map(function (r) { return active ? effExpected(r) : r.implied_value_usd; })) || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var ev = active ? effExpected(r) : r.implied_value_usd;
      var band = band25_75(ev);
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var rankLabel = active ? String(list.indexOf(r) + 1) : String(r.rank);
      var np = netPerHour(r);
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: rankLabel }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: Math.round(r.launch_likelihood * 100) + '%' }),
        el('td', null,
          el('div', { class: 'implied' },
            el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((ev / max) * 100)) + '%' })),
            el('span', { class: 'num', text: fmtUsd(ev) })
          ),
          el('div', { class: 'band sub', text: 'P25–P75 ' + fmtUsd(band.lo) + ' – ' + fmtUsd(band.hi) })
        ),
        el('td', null, verdictBadge(r.farm_verdict), el('div', { class: 'num', text: (r.farm.net_low_usd >= 0 ? '+$' : '-$') + Math.abs(r.farm.net_low_usd) })),
        el('td', null,
          el('div', { class: 'farm-action', text: shortAction(r) }),
          el('div', { class: 'farm-econ num', text: r.farm_difficulty + ' · $' + np.econ.cost + ' · ' + np.hold + 'd · ' + fmtPerHour(np.perHour) })
        )
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: active ? 'Sandbox re-ranking: these ranks come from the sandbox settings below, not the board. Select a row for its model and farm plan.' : 'Pre-token protocols, strongest expected value first. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('expected', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('likelihood', 'Launch chance'),
            sortHeader('expected', 'Expected value'),
            sortHeader('net', 'Net'),
            el('th', { scope: 'col', text: 'Farm' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', null, el('span', { class: 'badge live', text: 'already trades' })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: r.mcap_tvl_ratio === null ? 'n/a' : r.mcap_tvl_ratio.toFixed(2) + 'x' })
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking, and their market caps are the comps the size curve is fitted on.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }))),
          tbody
        )
      )
    );
  }

  function bestFarmsCard() {
    var scored = DATA.rows.map(function (r) { return { row: r, np: netPerHour(r) }; })
      .filter(function (x) { return x.np.perHour > 0; })
      .sort(function (a, b) { return b.np.perHour - a.np.perHour || b.np.econ.net - a.np.econ.net; })
      .slice(0, 5);
    if (scored.length === 0) return null;
    var tbody = el('tbody');
    scored.forEach(function (x, i) {
      var r = x.row;
      tbody.appendChild(el('tr', { onclick: function () { openDetail(r.slug); } },
        el('td', { class: 'num', text: String(i + 1) }),
        el('td', null, el('b', { text: r.name }), el('span', { class: 'sub', text: ' rank ' + r.rank + ' · ' + (r.category || 'Other') })),
        el('td', null, el('span', { class: 'sub', text: shortAction(r) })),
        el('td', { class: 'num', text: '$' + x.np.econ.cost }),
        el('td', { class: 'num', text: x.np.hold + 'd' }),
        el('td', { class: 'num', text: (x.np.econ.net >= 0 ? '+$' : '-$') + Math.abs(x.np.econ.net) }),
        el('td', { class: 'num', text: fmtPerHour(x.np.perHour) }),
        el('td', null, verdictBadge(r.farm_verdict))
      ));
    });
    return el('section', { class: 'panel bestfarms' },
      el('h2', { text: 'Best farms now, by net per hour' }),
      el('p', { class: 'sub', text: 'Low-end net divided by the farm’s active hours (5 minutes for the wallet, 15 to set up, 10 a week, 10 to check points, 5 for the log). Only positive net per hour is shown.' }),
      el('div', { class: 'table-wrap' }, el('table', { class: 'compact' },
        el('thead', null, el('tr', null,
          el('th', { scope: 'col', text: '#' }),
          el('th', { scope: 'col', text: 'Protocol' }),
          el('th', { scope: 'col', text: 'Farm' }),
          el('th', { scope: 'col', text: 'Cost' }),
          el('th', { scope: 'col', text: 'Hold' }),
          el('th', { scope: 'col', text: 'Net' }),
          el('th', { scope: 'col', text: 'Net / hour' }),
          el('th', { scope: 'col', text: 'Verdict' })
        )),
        tbody
      ))
    );
  }

  // The comps' scatter from the fit's own points (log-log, fitted line, +-1 sigma band):
  // an inline SVG from DATA.fit.scatter, so chart and code cannot disagree.
  function scatterSvg() {
    var pts = DATA.fit.scatter, f = DATA.fit, W = 660, H = 360, L = 52, B = 40, R = 14, T = 12;
    var xs = pts.map(function (p) { return Math.log10(p[0]); }), ys = pts.map(function (p) { return Math.log10(p[1]); });
    var x0 = Math.floor(Math.min.apply(null, xs)), x1 = Math.ceil(Math.max.apply(null, xs));
    var y0 = Math.floor(Math.min.apply(null, ys)), y1 = Math.ceil(Math.max.apply(null, ys));
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return H - B - (v - y0) / (y1 - y0) * (H - T - B); }
    function n(v) { return Math.round(v * 10) / 10; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Comps: market cap vs TVL, log scales">';
    s += '<polygon points="' + n(X(x0)) + ',' + n(Y(f.intercept + f.slope * x0 - f.sigma_dex)) + ' ' + n(X(x1)) + ',' + n(Y(f.intercept + f.slope * x1 - f.sigma_dex)) + ' ' + n(X(x1)) + ',' + n(Y(f.intercept + f.slope * x1 + f.sigma_dex)) + ' ' + n(X(x0)) + ',' + n(Y(f.intercept + f.slope * x0 + f.sigma_dex)) + '" fill="#f3e3c2"/>';
    var g;
    for (g = x0; g <= x1; g++) s += '<text x="' + n(X(g)) + '" y="' + (H - 24) + '" font-size="11" text-anchor="middle" fill="#5c6b78">10^' + g + '</text>';
    for (g = y0; g <= y1; g++) s += '<text x="' + (L - 6) + '" y="' + (n(Y(g)) + 4) + '" font-size="11" text-anchor="end" fill="#5c6b78">10^' + g + '</text>';
    s += '<line x1="' + n(X(x0)) + '" y1="' + n(Y(f.intercept + f.slope * x0)) + '" x2="' + n(X(x1)) + '" y2="' + n(Y(f.intercept + f.slope * x1)) + '" stroke="#b96a00" stroke-width="2"/>';
    pts.forEach(function (p) { s += '<circle cx="' + n(X(Math.log10(p[0]))) + '" cy="' + n(Y(Math.log10(p[1]))) + '" r="2.6" fill="#16304a"/>'; });
    s += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" font-size="12" text-anchor="middle">TVL (log scale)</text></svg>';
    return s;
  }

  function modelPanel() {
    var m = DATA.model;
    var f = DATA.fit;
    var comps = DATA.comps.filter(function (c) {
      return DATA.rows.some(function (r) { return (r.category || 'Other').toLowerCase() === c.category; });
    }).sort(function (a, b) { return b.offset_dex - a.offset_dex; });
    var compRows = comps.map(function (c) {
      return el('tr', null,
        el('td', { text: c.category }),
        el('td', { text: c.mechanism }),
        el('td', { class: 'num', text: String(c.live_count) }),
        el('td', { class: 'num', text: c.median_multiple === null ? 'n/a' : c.median_multiple.toFixed(3) + 'x' }),
        el('td', { class: 'num', text: (c.offset_dex > 0 ? '+' : '') + c.offset_dex.toFixed(3) + ' dex' })
      );
    });
    var mechRows = f.mechanisms.map(function (g) {
      return el('tr', null,
        el('td', { text: g.mechanism }),
        el('td', { class: 'num', text: String(g.live_count) }),
        el('td', { class: 'num', text: (g.median_offset_dex > 0 ? '+' : '') + g.median_offset_dex.toFixed(3) + ' dex' })
      );
    });
    var stabRows = f.top10_stability.map(function (t) {
      var row = DATA.rows.filter(function (r) { return r.slug === t.slug; })[0];
      return el('tr', null,
        el('td', { text: (row ? row.rank + '. ' : '') + t.name }),
        el('td', { class: 'num', text: Math.round(t.stability * 100) + '%' })
      );
    });
    var ablRows = f.ablation.map(function (a) {
      return el('tr', null,
        el('td', { text: a.variant }),
        el('td', { class: 'num', text: 'x' + a.factor.toFixed(2) }),
        el('td', { class: 'num', text: Math.round(a.within2 * 100) + '%' }),
        el('td', { class: 'num', text: String(a.n) })
      );
    });
    var gw = el('input', { type: 'range', id: 'sb-growth', min: '0', max: '1', step: '0.05', value: String(state.sb.growth_weight), 'aria-label': 'Growth weight' });
    gw.addEventListener('input', function () { state.sb.growth_weight = parseFloat(gw.value); render(); });
    var compBox = el('input', { type: 'checkbox', id: 'sb-comp', checked: state.sb.useComp ? 'checked' : null, 'aria-label': 'Use mechanism offsets' });
    compBox.addEventListener('change', function () { state.sb.useComp = compBox.checked; render(); });
    var likeBox = el('input', { type: 'checkbox', id: 'sb-like', checked: state.sb.useLikelihood ? 'checked' : null, 'aria-label': 'Use launch likelihood' });
    likeBox.addEventListener('change', function () { state.sb.useLikelihood = likeBox.checked; render(); });
    var reset = el('button', { class: 'button', type: 'button', text: 'Reset sandbox', onclick: function () { state.sb = { growth_weight: DEF.growth_weight, useComp: true, useLikelihood: true }; render(); } });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How expected value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No name is special-cased. The page recomputes each row and checks the number board.json carries.' }),
      el('div', { class: 'model-grid' },
        el('div', null,
          el('h3', { text: 'The fitted size curve' }),
          el('div', { class: 'formula' }, 'log10(mcap) = ' + f.intercept + ' + ' + f.slope + ' x log10(TVL) + offset'),
          el('p', null, 'Fitted by least squares on ' + f.comps_n + ' traded tokens that are comparable launches: not exchange, bridge or chain tokens, not versioned or wrapped products. The offset is the category\'s own premium or discount, shrunk toward zero by sample size and capped at +/-0.3 dex. Expected value is fitted value x growth x maturity x likelihood.'),
          el('h3', { text: 'How well it fits' }),
          el('p', null, 'In-sample R² ' + f.r2 + ', scatter ' + f.sigma_dex + ' dex (value band x' + f.band_factor + ' either way). Out-of-sample 5-fold: median error x' + f.oos_5fold_factor + ', Spearman ' + f.oos_5fold_spearman + '. Time-split: median error x' + f.timesplit_factor + ', Spearman ' + f.timesplit_spearman + '.'),
          el('h3', { text: 'The fit, seen' }),
          el('p', null, 'Each dot is one of the ' + f.comps_n + ' traded tokens the curve is fitted on. The line is the fitted power law; the band is plus and minus one sigma (' + f.sigma_dex + ' dex).'),
          el('div', { class: 'scatter' }, el('div', { html: scatterSvg() })),
          el('h3', { text: 'What each part of the model earns' }),
          el('p', null, 'The same time-split test (fit on the ' + f.timesplit_n_train + ' comps listed before ' + f.timesplit_cut + ', tested on the ' + f.timesplit_n_test + ' after), scored by four variants:'),
          el('div', { class: 'table-wrap' }, el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Variant' }), el('th', { scope: 'col', text: 'Median error' }), el('th', { scope: 'col', text: 'Within 2x' }), el('th', { scope: 'col', text: 'Tested' }))),
            el('tbody', null, ablRows)
          )),
          el('h3', { text: 'Top-ten stability' }),
          el('p', null, 'Share of bootstrap refits in which the row stays in the top ten:'),
          el('div', { class: 'table-wrap' }, el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Stays top 10' }))),
            el('tbody', null, stabRows)
          )),
          el('h3', { text: 'Mechanisms' }),
          el('div', { class: 'table-wrap' }, el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Mechanism' }), el('th', { scope: 'col', text: 'Live comps' }), el('th', { scope: 'col', text: 'Median offset' }))),
            el('tbody', null, mechRows)
          )),
          el('h3', { text: 'The category offsets' }),
          el('div', { class: 'table-wrap' }, el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Mechanism' }), el('th', { scope: 'col', text: 'Live comps' }), el('th', { scope: 'col', text: 'Median ratio' }), el('th', { scope: 'col', text: 'Offset' }))),
            el('tbody', null, compRows)
          ))
        ),
        el('div', { class: 'sandbox' },
          el('h3', { text: 'Model sandbox' }),
          el('p', null, 'Change the inputs and the board re-ranks live, in this page only.'),
          el('label', { for: 'sb-growth', text: 'Growth weight' }),
          el('div', { class: 'row' }, el('span', { text: 'How much 7-day growth matters' }), el('b', { text: state.sb.growth_weight.toFixed(2) })),
          gw,
          el('label', { class: 'check' }, compBox, 'Use mechanism offsets (off: the bare size curve for every row)'),
          el('label', { class: 'check' }, likeBox, 'Use launch likelihood (off: rank by implied value alone)'),
          el('p', { class: 'sub', text: sbActive() ? 'Sandbox is on: the table above shows sandbox ranks.' : 'Sandbox is at the stated model.' }),
          reset,
          el('h3', { text: 'Farm plans, netted' }),
          el('p', null, 'Netted at the low end of the value band. A1: the pool is ' + Math.round(m.pool_share * 100) + '% of implied value. A2: farmed TVL is ' + Math.round(m.farmed_share * 100) + '% of protocol TVL. A3: a position earns its share. A4: idle capital costs ' + Math.round(m.opp_rate_yr * 100) + '% a year. Verdict: FARM at net $' + m.farm_threshold_usd + ' or more, THIN from $0, SKIP below $0. This board: ' + f.verdict_counts.farm + ' farm, ' + f.verdict_counts.thin + ' thin, ' + f.verdict_counts.skip + ' skip.'),
          el('p', null, 'The biggest launches are often the worst farms per dollar: a large protocol\'s pool is split over far more farmed TVL, so a small position\'s share shrinks while its gas stays.')
        )
      ),
      el('div', { class: 'method' },
        el('p', null, el('b', { text: 'How to read this board. ' }), '“No token on record” means the snapshot records no token; it is not proof it has none. The watchlist is a floor, never a ceiling. A high expected value is a claim about worth if a launch happened, not a prediction that one will.'),
        el('p', null, el('b', { text: 'Farming safely. ' }), 'Use a fresh wallet, keep its seed phrase offline, never pay to claim, and claim only from links the protocol itself publishes.')
      )
    );
  }

  function doneKey(slug, i) { return 'radar-done-' + slug + '-' + i; }
  function isDone(slug, i) {
    try { return window.localStorage.getItem(doneKey(slug, i)) === '1'; } catch (e) { return false; }
  }
  function setDone(slug, i, v) {
    try {
      if (v) window.localStorage.setItem(doneKey(slug, i), '1');
      else window.localStorage.removeItem(doneKey(slug, i));
    } catch (e) { /* storage unavailable: the checklist still works for the visit */ }
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);
    var check = expectedOf(row, { growth_weight: DATA.model.growth_weight, useComp: true, useLikelihood: true });
    var match = check.implied === row.raw_implied_value_usd && check.expected === row.implied_value_usd;
    var capital = capitalFor(row);
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + '  ·  ' + (row.category || 'Other') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: categoryLine(row.category) + ' Mechanism: ' + row.mechanism + '. On ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') + '. Farm difficulty: ' + row.farm_difficulty + '.' })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Expected launch value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Fitted value (size curve)' }), el('b', { class: 'num', text: fmtUsd(row.fitted_value_usd) })),
        el('div', null, el('span', { text: 'Value band, low to high' }), el('b', { class: 'num', text: fmtUsd(row.low_implied_value_usd) + ' – ' + fmtUsd(row.high_implied_value_usd) })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: row.growth_multiplier.toFixed(4) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: row.maturity_multiplier.toFixed(4) })),
        el('div', null, el('span', { text: 'Launch likelihood' }), el('b', { class: 'num', text: Math.round(row.launch_likelihood * 100) + '%' })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.raw_implied_value_usd) })),
        el('div', null, el('span', { text: 'Expected value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('div', { class: 'factors' },
        el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((row.implied_value_usd / row.raw_implied_value_usd) * 100)) + '%' })),
        el('div', { class: 'row' }, el('span', { text: 'Expected value is the likelihood share of the implied value.' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) + ' of ' + fmtUsd(row.raw_implied_value_usd) }))
      ),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the page recomputes this row as ' + fmtUsd(check.expected) + (match ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    var econ = farmEcon(row);
    var econMatch = econ.net === row.farm.net_low_usd && econ.gross === row.farm.gross_low_usd && econ.cost === row.farm.total_cost_usd;
    var verdictWord = econ.verdict === 'farm' ? 'FARM' : econ.verdict === 'thin' ? 'THIN' : 'SKIP';
    var netWord = econ.net >= 0 ? '+$' + econ.net : '-$' + (-econ.net);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan, netted to the dollar' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Value band, low to high' }), el('b', { class: 'num', text: fmtUsd(row.low_implied_value_usd) + ' – ' + fmtUsd(row.high_implied_value_usd) })),
        el('div', null, el('span', { text: 'Low-end expected value' }), el('b', { class: 'num', text: fmtUsd(row.low_expected_value_usd) })),
        el('div', null, el('span', { text: 'Gross from the pool, low end' }), el('b', { class: 'num', text: '$' + econ.gross })),
        el('div', null, el('span', { text: 'Farm cost (gas $' + econ.gas + ' + opportunity $' + econ.opp + ')' }), el('b', { class: 'num', text: '$' + econ.cost })),
        el('div', null, el('span', { text: 'Net, low end' }), el('b', { class: 'num', text: netWord })),
        el('div', null, el('span', { text: 'Verdict' }), el('b', { class: 'num', text: verdictWord }))
      ),
      el('p', { class: 'sub', text: 'Netted at the band\'s low end: the pool is 10% of implied value, farmed TVL is 1% of protocol TVL, a $' + econ.capital + ' position earns its share. The page recomputes this net as ' + netWord + (econMatch ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s, i) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        var box = el('input', { type: 'checkbox', checked: isDone(row.slug, i) ? 'checked' : null, 'aria-label': 'Step ' + (i + 1) + ' done' });
        box.addEventListener('change', function () { setDone(row.slug, i, box.checked); });
        var li = el('li', { class: isDone(row.slug, i) ? 'done' : null }, box, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
        return li;
      })),
      el('p', { class: 'note', text: 'Setup cost: $' + capital + ' of capital and ' + gasTx(chainOf(row)) + ' on ' + chainOf(row) + '. The capital stays in the position; only the gas is spent. Verdict: ' + verdictWord + ' at net ' + netWord + '.' })
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') {
      var best = bestFarmsCard();
      if (best) shell.appendChild(best);
      shell.appendChild(modelPanel());
    }
    shell.appendChild(el('p', { class: 'foot', text: 'Token Radar, model ' + DATA.model_version + '. Snapshot ' + DATA.as_of + ' from the DefiLlama protocol index. Implied and expected values are this radar\u2019s own claims, never prices, and never a prediction of when a token comes.' }));
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
