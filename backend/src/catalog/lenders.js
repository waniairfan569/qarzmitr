/**
 * Microfinance lenders a shopkeeper could approach.
 *
 * The names and websites are real. The criteria are NOT the lenders' published
 * policy: they are illustrative values chosen for this prototype, and every
 * response that carries them says so. QarzMitr has no partnership with any of
 * these lenders. Replace a lender's criteria only with figures that lender has
 * confirmed.
 */
const LENDERS = [
  {
    id: 'akhuwat',
    name: 'Akhuwat Foundation',
    name_ur: 'اخوت فاؤنڈیشن',
    type: 'interest_free',
    website: 'https://akhuwat.org.pk',
    min_score: 55,
    min_months: 1,
    max_loan: 50000,
    documents: ['cnic', 'guarantors']
  },
  {
    id: 'kashf',
    name: 'Kashf Foundation',
    name_ur: 'کشف فاؤنڈیشن',
    type: 'conventional',
    website: 'https://kashf.org',
    min_score: 60,
    min_months: 3,
    max_loan: 100000,
    documents: ['cnic', 'guarantor'],
    focus: 'women'
  },
  {
    id: 'mobilink',
    name: 'Mobilink Microfinance Bank',
    name_ur: 'موبی لنک مائیکروفنانس بینک',
    type: 'conventional',
    website: 'https://mobilinkbank.com',
    min_score: 65,
    min_months: 1,
    max_loan: 150000,
    documents: ['cnic', 'shop_proof']
  },
  {
    id: 'nrsp',
    name: 'NRSP Microfinance Bank',
    name_ur: 'این آر ایس پی مائیکروفنانس بینک',
    type: 'conventional',
    website: 'https://www.nrspbank.com',
    min_score: 70,
    min_months: 3,
    max_loan: 200000,
    documents: ['cnic', 'guarantor', 'shop_proof']
  },
  {
    id: 'khushhali',
    name: 'Khushhali Microfinance Bank',
    name_ur: 'خوشحالی مائیکروفنانس بینک',
    type: 'conventional',
    website: 'https://www.khushhalibank.com.pk',
    min_score: 75,
    min_months: 6,
    max_loan: 300000,
    documents: ['cnic', 'guarantor', 'shop_proof']
  }
];

function findLender(id) {
  return LENDERS.find((lender) => lender.id === id) || null;
}

module.exports = {
  LENDERS,
  findLender
};
