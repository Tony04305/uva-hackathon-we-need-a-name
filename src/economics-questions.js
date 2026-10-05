// Original teaching scenarios. Sources explain the underlying models; the
// fictional shocks and explicit assumptions below are not market forecasts.
const SOURCES = {
  markets: { title: 'St. Louis Fed — Supply and demand', url: 'https://www.stlouisfed.org/education/supply-and-demand' },
  valuation: { title: 'Federal Reserve — Asset valuations', url: 'https://www.federalreserve.gov/publications/may-2021-asset-valuations.htm' },
  trade: { title: 'St. Louis Fed — International trade', url: 'https://www.stlouisfed.org/publications/page-one-economics/2017/11/01/does-international-trade-create-winners-and-losers' },
  currency: { title: 'RBA — Exchange rates and the economy', url: 'https://www.rba.gov.au/education/resources/explainers/exchange-rates-and-the-australian-economy.html' },
  policy: { title: 'ECB — Monetary policy transmission', url: 'https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html' },
};

export const ECON_LEVELS = [
  { id: 1, title: 'One small shock', subtitle: 'Demand, with everything else fixed', economy: 'Closed economy', description: 'Follow a single change in buyers’ behaviour while supply and policy stay fixed.' },
  { id: 2, title: 'Behind the supply', subtitle: 'Costs, production and prices', economy: 'Closed economy', description: 'Change the producers’ side of the market while holding demand fixed.' },
  { id: 3, title: 'Read the market', subtitle: 'Profits and stock valuations', economy: 'Closed economy', description: 'Connect a shock to expected cash flows or required returns, one channel at a time.' },
  { id: 4, title: 'Open the borders', subtitle: 'Trade joins the picture', economy: 'Open economy · fixed exchange rate', description: 'Introduce overseas customers, imported inputs and trade barriers while the currency stays fixed.' },
  { id: 5, title: 'Currencies in motion', subtitle: 'Let the exchange rate move', economy: 'Open economy · moving exchange rate', description: 'Track exchange-rate changes through import costs, export demand and firm value.' },
  { id: 6, title: 'Policy in motion', subtitle: 'Follow several channels', economy: 'Open economy · policy response', description: 'Combine changes in borrowing costs, trade, spending and stock valuation.' },
  { id: 7, title: 'The whole picture', subtitle: 'Weigh competing shocks', economy: 'Open economy · interacting shocks', description: 'Separate conclusions supported by the evidence from outcomes that need more information.' },
];

const DIRECTION_OPTIONS = [
  { value: 'up', label: 'Increases' },
  { value: 'down', label: 'Decreases' },
  { value: 'unchanged', label: 'Unchanged' },
  { value: 'uncertain', label: 'Cannot determine' },
];
const CURVE_OPTIONS = [
  { value: 'right', label: 'Shifts right' },
  { value: 'left', label: 'Shifts left' },
  { value: 'unchanged', label: 'No shift' },
  { value: 'uncertain', label: 'Cannot determine' },
];
const direction = (id, label, answer, explanation) => ({ id, label, options: DIRECTION_OPTIONS.map((o) => ({ ...o })), answer, explanation });
const curve = (id, label, answer, explanation) => ({ id, label, options: CURVE_OPTIONS.map((o) => ({ ...o })), answer, explanation });
const hints = (start, method, check) => [
  { id: 'start', text: start }, { id: 'method', text: method }, { id: 'check', text: check },
];
const reasons = (correct, ...others) => [{ id: 'mechanism', text: correct }, ...others.map((text, i) => ({ id: `alternative-${i + 1}`, text }))];
const closedMarket = ['Closed economy: no imports or exports.', 'A competitive market with downward-sloping demand and upward-sloping supply; prices can adjust.'];
const fixedValuation = 'Expected risk-free interest rates and the equity risk premium stay fixed; there is no other news.';

const scenarios = [
  {
    id: 'econ-1-a', level: 1, title: 'A new love for cycling',
    scenario: 'Over the next month, a popular local campaign makes more households want a bicycle at every possible price. Predict the new bicycle-market equilibrium.',
    assumptions: [...closedMarket, 'Household incomes, other goods’ prices and the number of buyers stay fixed.', 'Production costs, technology and the number of bicycle producers stay fixed.'],
    outcomes: [curve('demand', 'Demand for bicycles', 'right', 'At each price, buyers now want more bicycles.'), direction('price', 'Equilibrium bicycle price', 'up', 'The unchanged supply curve meets the new demand curve at a higher price.')],
    reasonOptions: reasons('Preferences change demand; the resulting price adjustment is a movement along the existing supply curve.', 'A higher bicycle price must shift the supply curve right.', 'The campaign changes production technology, so only supply shifts.', 'A closed economy cannot experience a change in demand.'),
    explanation: 'Stronger preferences shift bicycle demand right. With supply fixed, equilibrium price and quantity increase.',
    hints: hints('Identify whether the campaign changes buyers or producers.', 'Ask how many bicycles households want at the same price as before.', 'Distinguish a shift of a curve from movement along a curve when price adjusts.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-1-b', level: 1, title: 'Households tighten their budgets',
    scenario: 'For the next quarter, households’ disposable incomes fall. Restaurant meals are a normal good in this economy. Predict the restaurant-meal market after prices adjust.',
    assumptions: [...closedMarket, 'Tastes, population and prices of alternatives stay fixed.', 'Restaurant costs, capacity and technology stay fixed; only household income changes.'],
    outcomes: [curve('demand', 'Demand for restaurant meals', 'left', 'For a normal good, lower income means less demand at each price.'), direction('quantity', 'Equilibrium number of meals sold', 'down', 'With supply fixed, the lower demand curve produces a lower equilibrium quantity.')],
    reasonOptions: reasons('Lower income reduces demand for a normal good, while restaurants move along their unchanged supply curve.', 'Lower income makes all normal goods more desirable.', 'Fewer meals sold proves that the supply curve shifted left.', 'The price of meals must be fixed because production costs did not change.'),
    explanation: 'The income shock shifts demand left. With supply unchanged, both the equilibrium price and quantity of restaurant meals fall.',
    hints: hints('The phrase “normal good” tells you how demand responds to income.', 'Hold the meal price fixed first and consider what a household wants to buy.', 'Fewer sales can result from a demand change even when producers’ supply curve does not move.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-1-c', level: 1, title: 'A substitute gets expensive',
    scenario: 'Next month, the price of tea rises for a reason outside the coffee market. Households view tea and coffee as substitutes. Predict the coffee market after it adjusts.',
    assumptions: [...closedMarket, 'Only the price of tea changes; coffee buyers’ incomes, tastes and population stay fixed.', 'Coffee production costs, technology and number of suppliers stay fixed.'],
    outcomes: [curve('demand', 'Demand for coffee', 'right', 'Some buyers switch from the more expensive substitute to coffee at each coffee price.'), direction('price', 'Equilibrium coffee price', 'up', 'Higher coffee demand meets the unchanged supply curve at a higher price.')],
    reasonOptions: reasons('The higher price of a substitute changes coffee demand, even though coffee production conditions are unchanged.', 'A change in tea’s price is a movement along the coffee demand curve.', 'Tea and coffee being substitutes means they must have identical prices.', 'Coffee supply must rise because tea is now more expensive.'),
    explanation: 'A rise in the price of a substitute shifts coffee demand right. The equilibrium coffee price increases with supply unchanged.',
    hints: hints('Focus on the coffee market, not the tea market.', 'Consider whether the price changing is coffee’s own price or the price of a related good.', 'Use the meaning of “substitutes” to work out which purchases households reconsider.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-1-d', level: 1, title: 'Fewer visitors at the rink',
    scenario: 'Over the next month, enthusiasm for ice skating falls. At every ticket price, fewer visits are desired. Predict the market for skating sessions.',
    assumptions: [...closedMarket, 'Incomes, population and prices of other leisure activities stay fixed.', 'Rink energy costs, staffing costs, capacity and technology stay fixed.'],
    outcomes: [curve('demand', 'Demand for skating sessions', 'left', 'Reduced enthusiasm lowers the number of sessions desired at every price.'), curve('supply', 'Supply of skating sessions', 'unchanged', 'No production condition changes; the new price causes movement along supply.')],
    reasonOptions: reasons('A preference change shifts demand; a resulting change in sales does not itself shift supply.', 'Every reduction in sales shifts both demand and supply left.', 'Unchanged incomes imply that demand cannot change.', 'The rink must shift supply right to restore the old ticket price.'),
    explanation: 'Demand shifts left because tastes change. Supply does not shift, although equilibrium price and the quantity supplied both fall.',
    hints: hints('List the factors that usually shift supply and check which of them changed.', 'A curve describes quantities at many possible prices, rather than just today’s sales.', 'Keep the change in demand separate from producers’ response to a new market price.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-2-a', level: 2, title: 'A costly ingredient',
    scenario: 'Over the next month, flour becomes more expensive for every bakery. Flour is needed to make each loaf. Predict the bread market after prices adjust.',
    assumptions: [...closedMarket, 'Bread demand stays fixed; the flour shock does not change household incomes or preferences.', 'Other input costs, baking technology and the number of bakeries stay fixed.'],
    outcomes: [curve('supply', 'Supply of bread', 'left', 'Higher marginal production costs reduce the quantity bakeries offer at each bread price.'), direction('price', 'Equilibrium bread price', 'up', 'With demand unchanged, reduced supply raises the equilibrium bread price.')],
    reasonOptions: reasons('The ingredient cost changes producers’ willingness to supply at each price; customers then move along demand.', 'Bread demand must shift right because its market price rises.', 'Higher costs make bakeries willing to supply more at every price.', 'The flour price affects bread only if households buy flour directly.'),
    explanation: 'The input-cost shock shifts bread supply left. Price rises and quantity falls along the unchanged demand curve.',
    hints: hints('Treat flour as an input into bread production.', 'Compare a bakery’s willingness to sell at the same bread price before and after the shock.', 'A higher bread price changes quantity demanded without necessarily shifting demand.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-2-b', level: 2, title: 'A smarter production line',
    scenario: 'For the next quarter, all lamp manufacturers adopt a technique that uses less labour and material per lamp. Predict the lamp market after prices adjust.',
    assumptions: [...closedMarket, 'The technique lowers marginal production costs at each output level.', 'Buyer incomes, tastes and population stay fixed; no other costs or policies change.'],
    outcomes: [curve('supply', 'Supply of lamps', 'right', 'Lower marginal costs allow producers to offer more lamps at every price.'), direction('quantity', 'Equilibrium lamps sold', 'up', 'The expanded supply intersects fixed demand at a larger quantity.')],
    reasonOptions: reasons('The technology improvement changes supply; buyers respond to the resulting price along their existing demand curve.', 'Lower production costs are a direct increase in consumers’ preferences.', 'Using fewer inputs must mean fewer lamps are produced.', 'The new technique shifts demand left because lamps are cheaper.'),
    explanation: 'A cost-reducing technology shifts supply right. With demand fixed, equilibrium quantity increases and price falls.',
    hints: hints('Decide which side of the market uses the new technology.', 'Consider the cost of making one more lamp at a given output.', 'Lower prices and larger quantities can arise from one curve shifting.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-2-c', level: 2, title: 'A poor harvest',
    scenario: 'During this harvest season, bad weather damages some apple orchards. Surviving farms can still increase sales when the apple price is higher. Predict the apple market.',
    assumptions: [...closedMarket, 'At every price, farms offer fewer apples than before; remaining supply is still upward sloping.', 'Apple demand, other input costs and government policy stay fixed.'],
    outcomes: [direction('price', 'Equilibrium apple price', 'up', 'Lower supply creates a higher market-clearing price when demand stays fixed.'), curve('demand', 'Demand for apples', 'unchanged', 'Weather changes apple production, not the stated determinants of demand.')],
    reasonOptions: reasons('Damaged production shifts supply; the price response changes quantity demanded along an unchanged demand curve.', 'Higher apple prices shift demand left by definition.', 'Fewer apples available must make consumers prefer apples less.', 'The supply loss changes only quantity, so price cannot adjust.'),
    explanation: 'The harvest loss shifts supply left. Apples become more expensive; customers buy fewer along the same demand curve.',
    hints: hints('Separate the origin of the shock from the way buyers respond to price.', 'Demand means willingness to buy at every price, not just the quantity purchased.', 'Check which assumption, if any, changes tastes, income or the prices of related goods.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-2-d', level: 2, title: 'A tax on each bottle',
    scenario: 'Next quarter, a new per-bottle tax must be paid by producers of soft drinks. Predict the consumer market after it reaches a new equilibrium.',
    assumptions: [...closedMarket, 'Supply is measured against the price paid by consumers, including the tax.', 'Demand, input costs, technology and all other taxes stay fixed; no tax revenue is spent during this period.'],
    outcomes: [curve('supply', 'Supply at each consumer price', 'left', 'At a given consumer price, producers keep less after tax and offer fewer bottles.'), direction('quantity', 'Equilibrium bottles sold', 'down', 'The tax reduces traded quantity with an unchanged downward-sloping demand curve.')],
    reasonOptions: reasons('A tax creates a wedge between the consumer price and the amount producers receive, reducing trade.', 'Consumers must pay the entire tax because producers legally pay it.', 'The tax directly increases demand for soft drinks.', 'A per-bottle tax is a fixed cost that never affects marginal production decisions.'),
    explanation: 'The per-unit tax shifts supply up/left in consumer-price terms and reduces quantity. Its burden need not fall entirely on one side.',
    hints: hints('At an unchanged shelf price, compare what a producer keeps before and after tax.', 'Distinguish a tax on every unit from a one-time fixed fee.', 'Legal responsibility for paying a tax is not the same as who ultimately bears its cost.'), sources: [SOURCES.markets],
  },
  {
    id: 'econ-3-a', level: 3, title: 'A promising new contract',
    scenario: 'Today, a listed delivery company unexpectedly wins a profitable five-year domestic contract. Investors revise expected future cash payments to shareholders upward at some dates and leave the rest unchanged.',
    assumptions: ['Closed economy: the firm has no foreign sales, inputs or currency exposure.', 'The contract is new information; the number of shares and payment dates stay fixed.', fixedValuation],
    outcomes: [direction('cashflows', 'Expected future shareholder cash flows', 'up', 'Investors expect larger payments at some dates, with no reductions elsewhere.'), direction('stock', 'Model-implied stock value today', 'up', 'Larger expected cash flows discounted at the same rates have a higher present value.')],
    reasonOptions: reasons('The cash-flow outlook improves while the required return is unchanged, increasing present value.', 'A stock’s value depends only on last year’s profits.', 'Winning any contract raises the discount rate by exactly the profit gain.', 'The stock value cannot change before the cash is actually paid.'),
    explanation: 'Expected future shareholder payments rise. With discount rates, risk and shares fixed, the model-implied stock value rises today.',
    hints: hints('A stock represents a claim on future payments, not just current earnings.', 'Separate the expected cash-flow channel from the discount-rate channel.', 'Ask which information is new and which valuation inputs the assumptions hold fixed.'), sources: [SOURCES.valuation],
  },
  {
    id: 'econ-3-b', level: 3, title: 'A higher required return',
    scenario: 'Today, an unexpected rise in safe interest rates raises the required discount rate for a domestic utility at every future payment date. Assess the valuation effect immediately after the news.',
    assumptions: ['Closed economy; the utility has no trade or currency exposure.', 'All expected shareholder cash payments remain positive and unchanged.', 'The equity risk premium, share count and payment dates stay fixed; no other news arrives.'],
    outcomes: [direction('cashflows', 'Expected future shareholder cash flows', 'unchanged', 'The scenario explicitly holds every expected cash payment fixed.'), direction('stock', 'Model-implied stock value today', 'down', 'A higher discount rate reduces the present value of the same positive future payments.')],
    reasonOptions: reasons('The same future payments are worth less today when investors require a higher return.', 'A higher required return guarantees a higher current stock price.', 'Every interest-rate increase must reduce the firm’s expected payments even when they are held fixed.', 'Discount rates matter only for bonds, never for stocks.'),
    explanation: 'This scenario isolates discounting. Expected cash payments are unchanged, but a higher required return lowers their present value.',
    hints: hints('Keep the assumptions even if another effect might occur in the real world.', 'Think about the value today of a fixed payment received in the future.', 'Do not confuse the return an investor requires with the price they pay for an asset.'), sources: [SOURCES.valuation],
  },
  {
    id: 'econ-3-c', level: 3, title: 'An unexpected cost squeeze',
    scenario: 'Today, a manufacturer learns that domestic energy costs will be higher for the next two years. Its fixed-price sales contracts prevent passing on the increase, so expected shareholder cash payments fall at some dates.',
    assumptions: ['Closed economy: energy and all other inputs are domestic.', 'Sales volumes, other costs, share count and payment dates stay fixed; no expected cash payment rises.', fixedValuation],
    outcomes: [direction('cashflows', 'Expected shareholder cash flows', 'down', 'The additional energy bill reduces cash available to shareholders with revenue fixed.'), direction('stock', 'Model-implied stock value today', 'down', 'Lower expected cash payments reduce present value when discount rates do not change.')],
    reasonOptions: reasons('Higher costs squeeze the expected cash available to shareholders, with no offsetting discount-rate change.', 'Higher input prices always raise the stock price because revenue must rise too.', 'The stock value changes only when the higher energy bill is actually paid.', 'Unchanged sales volumes imply that profits and cash flows must be unchanged.'),
    explanation: 'Fixed sales revenue and higher costs lower expected shareholder payments. With required returns fixed, stock value falls in this model.',
    hints: hints('Trace the shock through revenue minus costs before thinking about stocks.', 'Read the contract assumption: can the firm change its selling price?', 'Check whether any separate change in required returns offsets the cash-flow effect.'), sources: [SOURCES.valuation],
  },
  {
    id: 'econ-3-d', level: 3, title: 'Good results, no surprise',
    scenario: 'Today, a domestic retailer announces high profits that exactly match what every investor already expected. The announcement changes no forecast or required return.',
    assumptions: ['Closed economy with no trade or currency exposure.', 'Expected future shareholder payments, interest rates, risk premiums and shares outstanding all remain fixed.', 'Consider only this announcement’s immediate effect; no other information arrives.'],
    outcomes: [direction('cashflows', 'Expected future shareholder cash flows', 'unchanged', 'The announcement exactly matches existing expectations and causes no forecast revision.'), direction('stock', 'Model-implied stock value today', 'unchanged', 'None of the valuation inputs changes, so this announcement adds no new value.')],
    reasonOptions: reasons('Prices respond to changes in expectations; already-expected good results do not change this valuation.', 'A report of high profits must always cause an immediate price increase.', 'Meeting expectations automatically increases the equity risk premium.', 'Stock prices reflect only the level of profits and ignore what was expected.'),
    explanation: 'Good news is not necessarily new information. With all valuation inputs unchanged, this announcement has no model-implied price effect.',
    hints: hints('Compare the announced result with what investors expected before the announcement.', 'Separate a high level of profits from a revision to forecasts.', 'List the inputs to stock valuation and look for one that actually changes.'), sources: [SOURCES.valuation],
  },
  {
    id: 'econ-4-a', level: 4, title: 'Overseas customers arrive',
    scenario: 'Next quarter, foreign households develop a taste for locally made furniture. At each price in the domestic currency, they want more furniture. Predict the domestic furniture market.',
    assumptions: ['Open economy; the exchange rate and all trade costs stay fixed.', 'Total demand includes domestic and foreign buyers; domestic buyers’ demand stays fixed.', 'Domestic supply is upward sloping and unchanged; total demand is downward sloping. No policy response occurs.'],
    outcomes: [curve('demand', 'Total demand for domestic furniture', 'right', 'Foreign demand adds to unchanged domestic demand at each price.'), direction('price', 'Equilibrium price of domestic furniture', 'up', 'With supply fixed, higher total demand raises the market-clearing price.')],
    reasonOptions: reasons('Additional foreign customers shift total demand for domestic output without directly changing production costs.', 'Exports are part of supply, so foreign demand shifts domestic supply right.', 'A fixed exchange rate prevents foreign customers from changing their purchases.', 'Domestic prices cannot change because the foreign customers pay another currency.'),
    explanation: 'Opening the economy adds a source of demand. This foreign preference shock shifts total demand right and raises the equilibrium price.',
    hints: hints('Count all customers for domestically produced furniture, not only local households.', 'Keep the exchange rate fixed as the scenario requests.', 'Identify whether foreign preferences change willingness to buy or the cost of making furniture.'), sources: [SOURCES.markets, SOURCES.trade],
  },
  {
    id: 'econ-4-b', level: 4, title: 'A cheaper imported component',
    scenario: 'Next quarter, the foreign-currency price of a widely used imported battery falls. Domestic e-bike producers can buy as many batteries as they need at the new price. Predict the market for domestically made e-bikes.',
    assumptions: ['Open economy; the exchange rate, tariffs and shipping costs stay fixed.', 'Battery costs per e-bike fall; all other production costs and technology stay fixed.', 'Demand for domestically made e-bikes stays fixed; these are differentiated from imported finished bikes. Supply slopes upward, demand downward and prices can adjust.'],
    outcomes: [curve('supply', 'Supply of domestically made e-bikes', 'right', 'The cheaper imported input reduces production costs at each output level.'), direction('price', 'Equilibrium e-bike price', 'down', 'More supply with fixed demand results in a lower equilibrium price.')],
    reasonOptions: reasons('With the exchange rate fixed, a cheaper imported input lowers local production costs and changes supply.', 'Every fall in an import price is automatically a fall in domestic consumer demand.', 'The fixed exchange rate cancels every change in a foreign supplier’s price.', 'Cheaper batteries mean producers must make fewer e-bikes.'),
    explanation: 'Trade transmits the foreign input-price reduction into domestic costs. E-bike supply shifts right and the equilibrium price falls.',
    hints: hints('Convert the input price into domestic currency using the unchanged exchange rate.', 'Trace the battery price into the cost of producing one more e-bike.', 'Separate an imported production input from a finished product sold to consumers.'), sources: [SOURCES.markets, SOURCES.currency],
  },
  {
    id: 'econ-4-c', level: 4, title: 'A tariff on imported shoes',
    scenario: 'Next quarter, a small country adds a per-pair tariff to imported shoes. It continues to import shoes after the tariff. Predict the domestic shoe market once prices adjust.',
    assumptions: ['Open economy; the exchange rate and the foreign shoe price stay fixed.', 'Imported and domestic shoes are identical; competitive importers fully pass on the tariff.', 'Domestic supply slopes upward and demand slopes downward. Neither curve shifts; no retaliation or policy response occurs.'],
    outcomes: [direction('price', 'Price paid by domestic shoe buyers', 'up', 'The tariff adds to the unchanged import cost that sets the domestic price.'), direction('quantity', 'Shoes made by domestic producers', 'up', 'Domestic firms move along their unchanged supply curve in response to the higher price.')],
    reasonOptions: reasons('The import-price wedge raises the domestic price, causing movement along existing domestic supply and demand curves.', 'The tariff necessarily shifts domestic producers’ supply curve right.', 'A tariff is paid by foreign producers in full, leaving the domestic price unchanged.', 'With imports still available, a tariff cannot affect the price buyers pay.'),
    explanation: 'Under these small-country assumptions, the tariff raises the domestic price. Local production increases along supply, while domestic consumption and imports fall.',
    hints: hints('Compare the cost of bringing in a pair of shoes before and after the tariff.', '“The country continues to import” tells you which price still anchors the local market.', 'Ask whether a domestic producer’s costs changed or just the price it can receive.'), sources: [SOURCES.trade, SOURCES.markets],
  },
  {
    id: 'econ-4-d', level: 4, title: 'A foreign customer cuts orders',
    scenario: 'Today, an overseas downturn unexpectedly reduces a domestic software exporter’s contracted orders for the next two years. Forecast shareholder cash payments fall at some dates and rise at none.',
    assumptions: ['Open economy; the exchange rate stays fixed, and there are no imported inputs.', 'Contract prices, domestic orders, costs, shares outstanding and payment dates stay fixed.', fixedValuation],
    outcomes: [direction('revenue', 'Expected export revenue', 'down', 'Fewer orders at unchanged contract prices reduce expected export receipts.'), direction('stock', 'Model-implied exporter stock value today', 'down', 'Reduced future shareholder payments lower value with discount rates fixed.')],
    reasonOptions: reasons('Weaker foreign orders reduce expected cash flows, even without an exchange-rate movement.', 'A fixed currency makes domestic firms immune to overseas demand.', 'Lower export orders necessarily reduce the discount rate enough to raise stock value.', 'The stock cannot react until the overseas recession ends.'),
    explanation: 'Trade exposes the firm to foreign spending. With prices and required returns fixed, the loss of orders lowers expected cash flows and stock value.',
    hints: hints('Foreign customers can change their spending even when the currency does not move.', 'Use price times quantity to identify the revenue channel.', 'Keep the cash-flow revision separate from the assumed unchanged required return.'), sources: [SOURCES.trade, SOURCES.valuation],
  },
  {
    id: 'econ-5-a', level: 5, title: 'A stronger home currency',
    scenario: 'Today, the domestic currency unexpectedly appreciates and is expected to stay stronger for two years. A local clinic imports equipment under fixed foreign-currency contracts; it sells only domestic services.',
    assumptions: ['Open economy; there is no currency hedging, foreign debt or foreign revenue.', 'Foreign-currency equipment prices, import quantities, domestic revenue and all other costs stay fixed.', 'The lower import bill is fully reflected in higher expected shareholder payments; shares and payment dates stay fixed.', fixedValuation],
    outcomes: [direction('cost', 'Equipment bill in domestic currency', 'down', 'Each unit of foreign currency now costs less domestic currency.'), direction('stock', 'Model-implied clinic stock value today', 'up', 'The stated higher shareholder cash payments have a higher present value with required returns fixed.')],
    reasonOptions: reasons('The appreciation reduces the domestic-currency import bill, improving cash flows under the fixed revenue and valuation assumptions.', 'A stronger currency always lowers every company’s stock price.', 'Appreciation makes each unit of foreign currency cost more domestic currency.', 'The clinic is unaffected because it has no foreign customers.'),
    explanation: 'A stronger home currency makes this unhedged importer’s fixed foreign-currency bill cheaper. The specified cash-flow gain raises model-implied stock value.',
    hints: hints('Define appreciation in terms of how much foreign currency one domestic unit buys.', 'Identify whether this firm earns or spends foreign currency.', 'Use the explicit assumptions to separate the currency exposure from other possible stock-market effects.'), sources: [SOURCES.currency, SOURCES.valuation],
  },
  {
    id: 'econ-5-b', level: 5, title: 'A weaker currency for an exporter',
    scenario: 'Today, the domestic currency unexpectedly depreciates and is expected to stay weaker for a year. A local animation studio has fixed foreign-currency export receipts due during that year.',
    assumptions: ['Open economy; export quantities and foreign-currency selling prices are contractually fixed.', 'All costs are in domestic currency and unchanged; there is no hedging, imported input or foreign-currency debt.', 'The extra domestic-currency receipts become shareholder cash payments; shares and payment dates stay fixed.', fixedValuation],
    outcomes: [direction('revenue', 'Export receipts in domestic currency', 'up', 'Each unchanged unit of foreign-currency revenue converts into more domestic currency.'), direction('stock', 'Model-implied studio stock value today', 'up', 'With domestic costs and required returns fixed, the increased shareholder payments raise value.')],
    reasonOptions: reasons('The same foreign-currency receipts translate into more domestic currency, with no offsetting foreign-currency cost exposure here.', 'A depreciation always reduces a firm’s domestic-currency export receipts.', 'Export quantity must instantly rise even though the contracts fix it.', 'Foreign revenue and domestic costs must change by identical amounts.'),
    explanation: 'This is a currency-conversion effect, with volumes fixed. Higher domestic-currency receipts increase shareholder cash flows and model-implied stock value.',
    hints: hints('Keep export quantity fixed; this question concerns translation of contracted receipts.', 'Work out what happens to the domestic-currency value of one unit of foreign currency.', 'Check whether the firm has any foreign-currency costs that could offset the revenue effect.'), sources: [SOURCES.currency, SOURCES.valuation],
  },
  {
    id: 'econ-5-c', level: 5, title: 'A holiday becomes more expensive',
    scenario: 'The domestic currency appreciates. Over the next year, foreign travellers can change their holiday plans and respond to prices. Domestic hotels keep room prices fixed in domestic currency.',
    assumptions: ['Open economy; foreign travellers’ incomes, preferences and prices of holidays elsewhere stay fixed.', 'Foreign demand for these rooms slopes downward in the foreign-currency room price.', 'No travel restrictions, policy changes or offsetting hotel-price adjustments occur.'],
    outcomes: [direction('price', 'Room price measured in foreign currency', 'up', 'More foreign currency is needed to buy the domestic currency for the unchanged room price.'), direction('quantity', 'Number of rooms demanded by foreign visitors', 'down', 'The higher foreign-currency price reduces bookings along the stated demand relationship.')],
    reasonOptions: reasons('Appreciation makes a fixed domestic price more expensive to foreign buyers, who can adjust their purchases over this horizon.', 'A domestic-currency price that stays fixed also stays fixed in every foreign currency.', 'A stronger currency automatically raises foreign tourists’ incomes.', 'Foreign visitors ignore exchange rates whenever a hotel sets its own prices.'),
    explanation: 'With the domestic room price fixed, appreciation raises its foreign-currency cost. Price-sensitive foreign travellers demand fewer rooms over the stated year.',
    hints: hints('Translate the same domestic room price into the visitors’ currency.', 'Use the time horizon: travellers are allowed to revise plans.', 'Distinguish a price fixed in one currency from a price fixed in all currencies.'), sources: [SOURCES.currency],
  },
  {
    id: 'econ-5-d', level: 5, title: 'Imported fuel gets dearer',
    scenario: 'The domestic currency depreciates. Next quarter, local freight companies renew unhedged fuel contracts priced in foreign currency. Predict the domestic freight-service market.',
    assumptions: ['Open economy; the foreign-currency fuel price, tariffs and other input costs stay fixed.', 'Freight demand is purely domestic and unchanged; prices can adjust.', 'Fuel is a variable input. Freight supply slopes upward and demand slopes downward; no policy response occurs.'],
    outcomes: [curve('supply', 'Supply of domestic freight services', 'left', 'The depreciation raises the domestic-currency cost of imported fuel per shipment.'), direction('price', 'Equilibrium freight-service price', 'up', 'Higher production costs raise the equilibrium price when demand stays fixed.')],
    reasonOptions: reasons('The currency change raises an imported variable cost, shifting supply rather than directly shifting the fixed domestic demand curve.', 'Depreciation makes imported fuel cheaper in domestic currency.', 'Currency movements affect only exporters and never domestic service producers.', 'More expensive freight proves that its demand curve shifted right.'),
    explanation: 'The weaker currency raises the local fuel bill. Higher marginal costs shift freight supply left and raise its equilibrium price.',
    hints: hints('The price of fuel abroad is fixed; its domestic-currency price need not be.', 'Trace the currency change through the cost per shipment.', 'Separate a production-cost shock from a change in customers’ willingness to buy at each price.'), sources: [SOURCES.currency, SOURCES.markets],
  },
  {
    id: 'econ-6-a', level: 6, title: 'Tightening through two channels',
    scenario: 'An unexpected policy-rate increase raises domestic borrowing costs and the domestic currency appreciates. Over the next year, credit-sensitive spending falls and price-sensitive export customers adjust their orders.',
    assumptions: ['Open economy; foreign incomes and preferences, foreign interest rates, risk premiums and government spending stay fixed.', 'Domestic goods’ prices are sticky; the appreciation makes exports dearer to foreign buyers.', 'No offsetting wealth or income effects occur; the short-run aggregate-supply curve stays fixed and slopes upward.'],
    outcomes: [curve('demand', 'Aggregate demand for domestic output', 'left', 'Weaker credit-sensitive spending and weaker export demand both reduce demand at each domestic price level.'), direction('output', 'Short-run equilibrium real output', 'down', 'Lower aggregate demand with an unchanged upward-sloping short-run supply curve reduces output.')],
    reasonOptions: reasons('Borrowing-cost and exchange-rate channels both reduce demand for domestic output under these assumptions.', 'Higher interest rates automatically increase household borrowing and spending.', 'The currency appreciation must increase export demand because foreign buyers prefer stronger currencies.', 'Monetary policy affects stock prices only and cannot affect demand for output.'),
    explanation: 'The two specified channels reinforce one another: more costly borrowing reduces domestic spending, and appreciation weakens export demand. Aggregate demand and short-run output fall.',
    hints: hints('Trace domestic borrowers and foreign customers separately before combining their effects.', 'Ask whose currency is used when foreign buyers compare prices.', 'Use the fixed short-run supply curve to translate a demand change into an output effect.'), sources: [SOURCES.policy, SOURCES.currency],
  },
  {
    id: 'econ-6-b', level: 6, title: 'Easier money and an exporter',
    scenario: 'Today, an unexpected rate cut lowers all relevant discount rates. The currency also depreciates, increasing a domestic exporter’s expected net shareholder payments from fixed foreign-currency sales contracts.',
    assumptions: ['Open economy; all firm costs are domestic, with no hedging or foreign-currency debt.', 'Foreign-currency receipts, domestic costs, shares and payment dates stay fixed; expected shareholder payments remain positive.', 'The equity risk premium stays fixed and no other news changes the cash-flow outlook.'],
    outcomes: [direction('cashflows', 'Expected shareholder payments in domestic currency', 'up', 'The stated depreciation converts the contracted foreign receipts into more domestic currency.'), direction('stock', 'Model-implied exporter stock value today', 'up', 'Higher expected payments and lower discount rates both increase their present value.')],
    reasonOptions: reasons('The cash-flow translation effect and the lower required return both support a higher valuation in this scenario.', 'Lower interest rates reduce present value, exactly cancelling any export gain.', 'A depreciation always reduces the domestic-currency value of foreign receipts.', 'Opposite types of valuation inputs can never reinforce one another.'),
    explanation: 'Both channels favour the firm’s valuation here: cash payments rise while the rate used to discount them falls. The assumptions exclude offsetting exposures.',
    hints: hints('Treat expected shareholder payments and the discount rate as separate valuation inputs.', 'Convert the fixed foreign receipts into domestic currency.', 'After identifying each channel, check whether they reinforce or oppose one another.'), sources: [SOURCES.policy, SOURCES.currency, SOURCES.valuation],
  },
  {
    id: 'econ-6-c', level: 6, title: 'Public investment, foreign inputs',
    scenario: 'Next quarter, the government unexpectedly buys more locally produced rail equipment. A fixed share of each additional order is spent on imported components; the remaining share pays for domestic value added.',
    assumptions: ['Open economy; the exchange rate, interest rates and prices stay fixed during this quarter.', 'Domestic firms have spare capacity. No private spending is displaced and taxes do not rise during this period.', 'The imported share is strictly between zero and all of the order; assess the initial direct effect, before further rounds of spending.'],
    outcomes: [direction('output', 'Domestic real output from the initial orders', 'up', 'The positive domestic-value-added portion of the extra orders raises production.'), direction('imports', 'Imports of components', 'up', 'Each additional order includes a positive imported-input share.')],
    reasonOptions: reasons('Extra orders create both domestic production and an import leakage; imported components are not themselves domestic value added.', 'Every euro spent on the equipment must count as an equal increase in domestic output.', 'Any imported input makes the entire government purchase foreign output.', 'Imports must fall whenever domestic production rises.'),
    explanation: 'Some of the added spending supports domestic production and some pays for imported components. Both output and imports rise; the whole purchase is not a direct one-for-one increase in domestic value added.',
    hints: hints('Split each order into the domestic and imported portions described in the assumptions.', 'GDP counts domestic value added, rather than every input purchased by a domestic firm.', 'Stay with the initial direct effect; no spending multiplier needs to be calculated.'), sources: [SOURCES.trade, SOURCES.policy],
  },
  {
    id: 'econ-6-d', level: 6, title: 'Fuel relief and lower borrowing costs',
    scenario: 'For the coming year, a fall in the foreign price of oil lowers domestic production costs. At the same time, easier credit increases household and business spending on domestic output.',
    assumptions: ['Open economy; the exchange rate and non-oil input costs stay fixed.', 'Use downward-sloping aggregate demand and upward-sloping short-run aggregate supply; both shifts occur at every relevant price level.', 'No other shocks occur. The relative sizes of the oil-cost and spending effects are not given.'],
    outcomes: [direction('output', 'Short-run equilibrium real output', 'up', 'A rightward supply shift and a rightward demand shift both increase equilibrium output.'), direction('prices', 'Short-run equilibrium price level', 'uncertain', 'Greater demand pushes prices up while lower costs push them down; their relative strengths are unknown.')],
    reasonOptions: reasons('The supply and demand changes reinforce each other for output but pull the price level in opposite directions.', 'A rise in output always requires an increase in the price level.', 'Lower oil costs cancel easier credit by definition.', 'Unknown shock sizes make the direction of every outcome unknowable.'),
    explanation: 'Cheaper oil shifts short-run supply right, while easier credit shifts demand right. Output rises, but the net price-level effect needs information about the relative shifts.',
    hints: hints('Sketch each shock separately before combining them.', 'For each outcome, ask whether the two channels point the same way or compete.', 'Missing magnitudes matter only for outcomes where the individual effects oppose one another.'), sources: [SOURCES.markets, SOURCES.policy, SOURCES.currency],
  },
  {
    id: 'econ-7-a', level: 7, title: 'A boom meets a supply squeeze',
    scenario: 'Over the next year, a foreign spending boom raises demand for domestic output while disrupted international shipping raises domestic production costs. Assess their combined short-run effect.',
    assumptions: ['Open economy; the exchange rate and domestic policy stay fixed.', 'Aggregate demand slopes downward and short-run aggregate supply slopes upward.', 'Demand shifts right and supply shifts left at every relevant price level; the relative sizes are not provided.'],
    outcomes: [direction('prices', 'Short-run equilibrium price level', 'up', 'Stronger demand and restricted supply both push the price level upward.'), direction('output', 'Short-run equilibrium real output', 'uncertain', 'The demand shock raises output, but the supply shock reduces it; either may dominate.')],
    reasonOptions: reasons('Both shocks raise prices, but their output effects oppose one another and require relative magnitudes.', 'More foreign demand guarantees higher output regardless of production costs.', 'A supply squeeze must reduce both prices and output.', 'If output is uncertain, the direction of the price effect must also be uncertain.'),
    explanation: 'The shocks agree on higher prices. They disagree on output, so output could rise, fall or stay unchanged depending on their strength.',
    hints: hints('Keep a separate sign for each shock’s price effect and output effect.', 'A conclusion about one variable does not settle every other variable.', 'Check which result depends on knowing the relative sizes of the shifts.'), sources: [SOURCES.markets, SOURCES.trade],
  },
  {
    id: 'econ-7-b', level: 7, title: 'Export boost, import bill',
    scenario: 'Today, the currency unexpectedly depreciates and is expected to remain weaker. A listed manufacturer receives foreign-currency export revenues but also pays foreign-currency input bills. Both foreign-currency amounts are fixed.',
    assumptions: ['Open economy; the firm is unhedged and has no foreign-currency debt.', 'Domestic revenue and costs, shares, payment dates and required returns stay fixed.', 'Both foreign revenue and foreign costs are positive, but their relative sizes and timing are not provided; only the net cash-flow effect can change value.'],
    outcomes: [direction('importcost', 'Imported-input bill in domestic currency', 'up', 'The unchanged foreign-currency bill requires more domestic currency after depreciation.'), direction('stock', 'Model-implied manufacturer stock value today', 'uncertain', 'Depreciation raises both translated receipts and costs; the net discounted exposure is unspecified.')],
    reasonOptions: reasons('Gross foreign-currency receipts and costs both rise in domestic terms; net exposure is needed to infer the valuation effect.', 'Any firm with export revenue must gain from a weaker currency.', 'Any firm with imported inputs must lose from a weaker currency.', 'A depreciation leaves all foreign-currency transactions unchanged in domestic-currency terms.'),
    explanation: 'The imported-input bill definitely rises. The stock effect depends on the balance and timing of foreign receipts versus foreign costs, which the scenario does not provide.',
    hints: hints('Separate gross revenue exposure from gross cost exposure.', 'Convert one unit of foreign currency into domestic currency on both sides of the firm’s accounts.', 'A stock-value conclusion needs the net cash-flow effect, including when receipts and costs occur.'), sources: [SOURCES.currency, SOURCES.valuation],
  },
  {
    id: 'econ-7-c', level: 7, title: 'Better prospects, higher rates',
    scenario: 'Today, a global investment boom improves a firm’s expected future shareholder payments. At the same time, market interest rates rise and raise the discount rates applied to those payments.',
    assumptions: ['Open economy; the exchange rate, equity risk premium, shares and payment dates stay fixed.', 'Expected payments remain positive and rise at some dates, with no decreases; every relevant discount rate rises.', 'Both changes are surprises. Their magnitudes are not provided; there is no other news.'],
    outcomes: [direction('cashflows', 'Expected shareholder cash flows', 'up', 'The scenario explicitly specifies an improved payment outlook.'), direction('stock', 'Model-implied stock value today', 'uncertain', 'Higher cash payments support value while higher discount rates reduce it; magnitudes determine the net effect.')],
    reasonOptions: reasons('Cash-flow news and discount-rate news pull valuation in opposite directions, so their sizes are needed.', 'Higher expected payments always dominate any rise in discount rates.', 'A higher discount rate always dominates any cash-flow improvement.', 'Stocks cannot change value when good news and bad news arrive together.'),
    explanation: 'Expected payments increase, but stock value is not determined by that fact alone. The opposing discount-rate effect makes the net valuation change ambiguous.',
    hints: hints('Avoid using a single piece of good or bad news as the whole valuation model.', 'Consider how each changing input affects the present value of future payments on its own.', 'Check whether the assumptions specify which opposing effect is larger.'), sources: [SOURCES.valuation, SOURCES.policy],
  },
  {
    id: 'econ-7-d', level: 7, title: 'A currency move before orders adjust',
    scenario: 'Today, the domestic currency depreciates. For the next month, all export and import quantities are locked by contracts. Export receipts are fixed in domestic currency, while import bills are fixed in foreign currency.',
    assumptions: ['Open economy; there is no hedging and contract prices do not adjust during the month.', 'All other transactions stay fixed. Measure the goods trade balance as export receipts minus import payments in domestic currency.', 'No information is provided about later contract prices, demand elasticities or how quantities will adjust over the following year.'],
    outcomes: [direction('balance', 'Goods trade balance during the contracted month', 'down', 'Export receipts stay fixed but the import bill rises in domestic currency, reducing exports minus imports.'), direction('later', 'Goods trade balance after one year', 'uncertain', 'Later price and quantity responses are not specified, so the one-year net effect cannot be established.')],
    reasonOptions: reasons('The immediate conversion effect is determined by the contracts; later trade responses need information about prices, quantities and demand.', 'A depreciation improves the trade balance immediately under every contract structure.', 'Fixed quantities guarantee that the trade balance is fixed in domestic currency.', 'The first month’s effect must continue with the same sign after contracts and quantities adjust.'),
    explanation: 'The contracted import bill costs more immediately, worsening the monthly trade balance. A later improvement is possible, but is not guaranteed without information about price and quantity responses.',
    hints: hints('Use the currency in which each contract is fixed, not just whether quantities are fixed.', 'Evaluate the next month and the following year as separate horizons.', 'A short-run result cannot by itself tell you how unprovided longer-run behaviour will work.'), sources: [SOURCES.currency],
  },
];

// Rotate answer positions without changing their stable IDs. Students should
// choose a mechanism rather than learn that the first option is always right.
export const ECON_QUESTIONS = scenarios.map((question, index) => {
  const offset = index % question.reasonOptions.length;
  return {
    ...question,
    reasonAnswer: 'mechanism',
    reasonOptions: [...question.reasonOptions.slice(offset), ...question.reasonOptions.slice(0, offset)],
  };
});

export function getEconomicsQuestion(id) {
  return ECON_QUESTIONS.find((question) => question.id === id);
}

export function pickEconomicsQuestion(level, previousId, history = [], rng = Math.random) {
  const validLevel = ECON_LEVELS.some((item) => item.id === level) ? level : 1;
  const bank = ECON_QUESTIONS.filter((question) => question.level === validLevel);
  const recent = Array.isArray(history) ? history.filter((id) => bank.some((question) => question.id === id)) : [];
  let available = bank.filter((question) => question.id !== previousId && !recent.includes(question.id));
  // On exhausting a level, release the oldest history entries first. The
  // immediately previous question remains excluded even when history is full.
  while (!available.length && recent.length) {
    recent.shift();
    available = bank.filter((question) => question.id !== previousId && !recent.includes(question.id));
  }
  if (!available.length) available = bank.filter((question) => question.id !== previousId);
  const random = Number(rng());
  const unit = Number.isFinite(random) ? Math.max(0, Math.min(random, 1 - Number.EPSILON)) : 0;
  return available[Math.floor(unit * available.length)];
}
