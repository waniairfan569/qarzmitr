/**
 * Every string the interface shows, in English and Urdu.
 *
 * Urdu is the point of the product, not a translation layer bolted on: a
 * shopkeeper who cannot comfortably read a formal Urdu paragraph certainly
 * cannot read an English button. Wording is kept plain and spoken rather than
 * formal — "who owes you money", not "receivables outstanding".
 */
export const STRINGS = {
  // ---- shell ----
  'brand.tagline': ['Paper to possibility', 'کاغذ سے امکان تک'],
  'shell.workspace': ['Verified workspace', 'تصدیق شدہ کھاتہ'],
  'shell.howItWorks': ['How it works', 'یہ کیسے کام کرتا ہے'],
  'shell.private': ['Private & auditable', 'نجی اور قابلِ جانچ'],
  'shell.logout': ['Log out', 'باہر نکلیں'],
  'shell.language': ['Language', 'زبان'],

  // ---- dashboard header ----
  'dash.kicker': ['Shopkeeper dashboard', 'دکاندار کا کھاتہ'],
  'dash.greeting': ['Salaam, {name}.', 'السلام علیکم، {name}۔'],
  'dash.subtitle': [
    'Your paper trail, translated into a financial profile you can understand and stand behind.',
    'آپ کے کاغذی کھاتے کو ایسی مالی تصویر میں بدلا گیا ہے جو آپ خود سمجھ سکیں اور جس پر قائم رہ سکیں۔'
  ],
  'dash.lenderView': ['Lender view', 'قرض دینے والے کا نظارہ'],
  'dash.refresh': ['Refresh record', 'کھاتہ تازہ کریں'],
  'dash.refreshing': ['Refreshing…', 'تازہ ہو رہا ہے…'],
  'dash.reading': ['Reading your latest entries…', 'آپ کے تازہ اندراج پڑھے جا رہے ہیں…'],
  'dash.updated': ['Updated {time} · {count} entries', '{time} پر تازہ · {count} اندراج'],
  'dash.opening': ['Opening your ledger…', 'آپ کا کھاتہ کھولا جا رہا ہے…'],
  'dash.tryAgain': ['Try again', 'دوبارہ کوشش کریں'],

  // ---- tabs ----
  'tab.udhaar': ['Udhaar book', 'ادھار کھاتہ'],
  'tab.reminders': ['Reminders', 'یاد دہانیاں'],
  'tab.history': ['History', 'کاروبار کی تاریخ'],
  'tab.review': ['To check', 'جانچنے کے لیے'],
  'tab.transactions': ['Transactions', 'تمام اندراج'],
  'tab.aria': ['Ledger detail', 'کھاتے کی تفصیل'],

  // ---- score card ----
  'score.kicker': ['Current credit score', 'موجودہ کریڈٹ اسکور'],
  'score.updated': ['Updated {date}', '{date} کو تازہ'],
  'score.outOf': ['out of 100', '۱۰۰ میں سے'],
  'score.tone.low': ['Needs attention', 'توجہ درکار ہے'],
  'score.tone.mid': ['Building momentum', 'بہتری کی طرف'],
  'score.tone.high': ['Strong profile', 'مضبوط ریکارڈ'],
  'score.note': [
    'Calculated from ledger activity using transparent, auditable metrics—',
    'یہ آپ کے کھاتے سے شفاف اور قابلِ جانچ حساب سے نکالا گیا ہے — '
  ],
  'score.noteStrong': ['not an AI-generated guess', 'کوئی اے آئی کا اندازہ نہیں'],
  'score.emptyTitle': ['Your first score starts with a page.', 'آپ کا پہلا اسکور ایک صفحے سے شروع ہوتا ہے۔'],
  'score.emptyBody': [
    'Upload a ledger, structure its entries, and compute a transparent score.',
    'کھاتے کا صفحہ بھیجیں، اندراج ترتیب دیں، اور شفاف اسکور بنائیں۔'
  ],
  'score.beginBelow': ['Begin below', 'نیچے سے شروع کریں'],
  'score.profile': ['Credit profile', 'کریڈٹ ریکارڈ'],

  // ---- score chart ----
  'chart.kicker': ['Score journey', 'اسکور کا سفر'],
  'chart.title': ['Progress over time', 'وقت کے ساتھ بہتری'],

  // ---- explanation ----
  'explain.kicker': ['In your own words', 'آپ کی اپنی زبان میں'],
  'explain.title': ['What your score means', 'آپ کے اسکور کا مطلب'],
  'explain.none': ['Explanation not available yet', 'وضاحت ابھی دستیاب نہیں'],
  'explain.listen': ['Listen', 'سنیں'],
  'explain.stop': ['Stop', 'روکیں'],
  'explain.listenAria': ['Read this aloud in Urdu', 'اسے اردو میں سنیں'],
  'explain.stopAria': ['Stop reading aloud', 'سنانا بند کریں'],

  // ---- evidence tiles ----
  'evidence.kicker': ['Evidence at a glance', 'ایک نظر میں ثبوت'],
  'evidence.transactions': ['Transactions', 'اندراج'],
  'evidence.scoreRuns': ['Score runs', 'اسکور کے حساب'],
  'evidence.note': [
    'The score itself is calculated by deterministic backend code. AI only explains the result in Urdu.',
    'اسکور خود پروگرام کے طے شدہ حساب سے بنتا ہے۔ اے آئی صرف نتیجہ اردو میں سمجھاتا ہے۔'
  ],
  'evidence.noteStrong': ['deterministic backend code', 'پروگرام کے طے شدہ حساب'],

  // ---- loan readiness ----
  'ready.kicker': ['Getting a loan', 'قرض کی طرف'],
  'ready.eligibleTitle': ['A lender can act on this today', 'قرض دینے والا آج اس پر عمل کر سکتا ہے'],
  'ready.awayTitle': ['You are {points} point(s) away', 'آپ صرف {points} نمبر دور ہیں'],
  'ready.eligibleBody': [
    'Your record is strong enough to put in front of a microfinance institution. On average monthly sales of {sales}, that supports an indicative facility of about {facility}.',
    'آپ کا ریکارڈ اتنا مضبوط ہے کہ کسی مائیکرو فنانس ادارے کے سامنے رکھا جا سکے۔ ماہانہ اوسط فروخت {sales} پر تقریباً {facility} تک کی سہولت بنتی ہے۔'
  ],
  'ready.awayBody': [
    'At {at} out of 100 a microfinance institution can be asked to consider you. You are at {score}.',
    '۱۰۰ میں سے {at} پر کوئی مائیکرو فنانس ادارہ آپ پر غور کر سکتا ہے۔ آپ ابھی {score} پر ہیں۔'
  ],
  'ready.now': ['{score} now', 'ابھی {score}'],
  'ready.eligible': ['Eligible', 'اہل'],
  'ready.needed': ['{at} needed', '{at} درکار'],
  'ready.lifts': ['What lifts it most', 'سب سے زیادہ فائدہ کس سے'],
  'ready.worth': ['Worth up to {points} points of your score', 'آپ کے اسکور میں {points} نمبر تک کا فائدہ'],
  'ready.getStatement': ['Get the statement for a lender', 'قرض دینے والے کے لیے اسٹیٹمنٹ لیں'],
  'ready.caveat': [
    'These thresholds are prototype defaults, not a lender\'s own policy, and no score decides a loan on its own. A lender sees the same evidence in the lender view.',
    'یہ حدیں نمونے کے طور پر رکھی گئی ہیں، کسی ادارے کی اپنی پالیسی نہیں، اور کوئی اسکور اکیلا قرض کا فیصلہ نہیں کرتا۔ قرض دینے والے کو یہی ثبوت دکھائے جاتے ہیں۔'
  ],
  'ready.band.recommended': ['Ready to be recommended', 'سفارش کے قابل'],
  'ready.band.review': ['Ready, with a review', 'جانچ کے ساتھ تیار'],
  'ready.band.manual': ['Needs a closer look', 'مزید جانچ درکار'],
  'ready.band.early': ['Still building evidence', 'ابھی ثبوت بن رہا ہے'],
  'ready.lever.cashflow': ['Steady weekly income', 'ہفتہ وار مستقل آمدنی'],
  'ready.lever.cashflow.action': [
    'Record every trading day, including the quiet ones. The score rewards a steady week far more than one big week.',
    'ہر کاروباری دن لکھیں، سست دن بھی۔ اسکور ایک بڑے ہفتے سے زیادہ مستقل ہفتے کو اہمیت دیتا ہے۔'
  ],
  'ready.lever.repayment': ['Customers paying you back', 'گاہکوں کا ادھار واپس کرنا'],
  'ready.lever.repayment.action': [
    'Collect the udhaar you are owed. Every repayment you record lifts this directly — the reminders are written for you.',
    'جو ادھار آپ کا باقی ہے وہ وصول کریں۔ ہر واپسی اسے سیدھا بڑھاتی ہے — یاد دہانیاں آپ کے لیے تیار ہیں۔'
  ],
  'ready.lever.revenue': ['Sales growing over time', 'وقت کے ساتھ فروخت بڑھنا'],
  'ready.lever.revenue.action': [
    'Keep uploading pages as trade continues, so a rising month is visible rather than assumed.',
    'کاروبار چلتا رہے تو صفحے بھیجتے رہیں، تاکہ بہتر مہینہ نظر آئے، صرف اندازہ نہ رہے۔'
  ],

  // ---- ledger workflow ----
  'ledger.kicker': ['New evidence', 'نیا ثبوت'],
  'ledger.title': ['Turn one ledger page into financial proof.', 'کھاتے کا ایک صفحہ مالی ثبوت بنائیں۔'],
  'ledger.body': [
    'Photograph the whole page in good light. Anything read uncertainly is flagged rather than hidden, and listed under To check for you to correct.',
    'پورا صفحہ اچھی روشنی میں کھینچیں۔ جو کچھ شک سے پڑھا جائے وہ چھپایا نہیں جاتا بلکہ "جانچنے کے لیے" میں رکھ دیا جاتا ہے تاکہ آپ درست کر سکیں۔'
  ],
  'ledger.choose': ['Choose a ledger image', 'کھاتے کی تصویر منتخب کریں'],
  'ledger.limits': ['JPEG, PNG, or WebP · max 10 MB', 'JPEG، PNG یا WebP · زیادہ سے زیادہ ۱۰ MB'],
  'ledger.upload': ['Upload & run OCR', 'بھیجیں اور پڑھوائیں'],
  'ledger.uploading': ['Uploading & reading…', 'بھیجا اور پڑھا جا رہا ہے…'],
  'ledger.step1': ['Capture & OCR', 'تصویر اور پڑھائی'],
  'ledger.step2': ['Structure transactions', 'اندراج ترتیب دیں'],
  'ledger.step3': ['Compute transparent score', 'شفاف اسکور نکالیں'],
  'ledger.waiting': ['Waiting for an image.', 'تصویر کا انتظار ہے۔'],
  'ledger.viewText': ['View extracted text', 'پڑھا گیا متن دیکھیں'],
  'ledger.process': ['Process ledger', 'کھاتہ ترتیب دیں'],
  'ledger.computeScore': ['Compute score', 'اسکور نکالیں'],
  'ledger.created': ['{count} transactions created.', '{count} اندراج بن گئے۔'],
  'ledger.flagged': ['{count} uncertain or adjusted entries flagged.', '{count} اندراج مشکوک یا بدلے ہوئے نشان زد ہوئے۔'],
  'ledger.storage': ['Storage:', 'محفوظ:'],
  'ledger.ocrLabel': ['OCR:', 'پڑھائی:'],
  'ledger.ocrSkipped': ['OCR skipped: API key not configured. No text is available to structure.', 'پڑھائی نہیں ہوئی: API key موجود نہیں۔ ترتیب دینے کے لیے کوئی متن نہیں۔'],
  'ledger.badType': ['Choose a JPEG, PNG, or WebP image.', 'JPEG، PNG یا WebP تصویر منتخب کریں۔'],
  'ledger.tooBig': ['Image must be 10 MB or smaller.', 'تصویر ۱۰ MB یا اس سے چھوٹی ہونی چاہیے۔'],
  'txn.kicker': ['Ledger entries', 'کھاتے کے اندراج'],
  'txn.title': ['Every transaction', 'تمام اندراج'],
  'txn.date': ['Date', 'تاریخ'],
  'txn.type': ['Type', 'قسم'],
  'txn.customer': ['Customer', 'گاہک'],
  'txn.amount': ['Amount', 'رقم'],
  'txn.note': ['Note', 'تفصیل'],
  'txn.today': ['Today', 'آج'],
  'txn.week': ['This week', 'اس ہفتے'],
  'txn.month': ['This month', 'اس مہینے'],
  'txn.all': ['All time', 'شروع سے'],
  'txn.custom': ['Pick dates', 'تاریخ چنیں'],
  'txn.from': ['From', 'سے'],
  'txn.to': ['To', 'تک'],
  'txn.rangeTotals': ['{count} entries · sales {sales} · expenses {expenses} · net {net}', '{count} اندراج · فروخت {sales} · خرچ {expenses} · خالص {net}'],
  'txn.noneInRange': ['Nothing recorded in these dates.', 'ان تاریخوں میں کوئی اندراج نہیں۔'],
  'txn.undatedNote': ['Undated entries are not shown while a date filter is on.', 'تاریخ کا فلٹر لگا ہو تو بغیر تاریخ والے اندراج نہیں دکھائے جاتے۔'],
  'txn.empty': ['No transactions yet.', 'ابھی کوئی اندراج نہیں۔'],
  'txn.loading': ['Loading…', 'لایا جا رہا ہے…'],
  'ledger.desk': ['Processing desk', 'کارروائی'],

  // ---- udhaar book ----
  'udhaar.kicker': ['Udhaar book', 'ادھار کھاتہ'],
  'udhaar.title': ['Who owes you money', 'کس نے آپ کے پیسے دینے ہیں'],
  'udhaar.body': [
    'Built from the credit and repayment lines on your own ledger pages. Nothing extra to record.',
    'یہ آپ کے اپنے کھاتے کی ادھار اور واپسی والی سطروں سے بنتا ہے۔ الگ سے کچھ لکھنے کی ضرورت نہیں۔'
  ],
  'udhaar.totalOutstanding': ['Total outstanding', 'کل باقی رقم'],
  'udhaar.across': ['across {count} customer(s)', '{count} گاہکوں سے'],
  'udhaar.given': ['{given} given · {repaid} repaid', '{given} دیے · {repaid} واپس'],
  'udhaar.last': ['last {date}', 'آخری {date}'],
  'udhaar.alias': ['also written as {names}', 'یہ نام یوں بھی لکھا گیا: {names}'],
  'udhaar.days': ['{days} days', '{days} دن'],
  'udhaar.outstanding': ['outstanding', 'باقی'],
  'udhaar.settled': ['Settled up:', 'حساب صاف:'],
  'udhaar.emptyTitle': ['No credit recorded yet', 'ابھی کوئی ادھار درج نہیں'],
  'udhaar.emptyBody': [
    'When a ledger page mentions giving goods on udhaar, the customer will appear here with what they still owe.',
    'جب کھاتے کے صفحے پر ادھار کا ذکر ہوگا، گاہک یہاں اپنے باقی حساب کے ساتھ نظر آئے گا۔'
  ],
  'udhaar.nudge': [
    'Your oldest unpaid credit is {days} days old. Steady repayment is 35% of your credit score, so collecting it lifts the score as well as the till.',
    'آپ کا سب سے پرانا ادھار {days} دن کا ہو چکا ہے۔ واپسی کا تناسب اسکور کا ۳۵٪ ہے، تو وصولی سے گلہ بھی بھرتا ہے اور اسکور بھی بڑھتا ہے۔'
  ],
  'udhaar.working': ['Working out who owes what…', 'حساب لگایا جا رہا ہے…'],

  // ---- reminders ----
  'rem.kicker': ['Collect what you\'re owed', 'اپنی وصولی کریں'],
  'rem.title': ['Ready-to-send reminders', 'بھیجنے کے لیے تیار یاد دہانیاں'],
  'rem.body': [
    'A polite message for each customer who still owes, written for you. Copy it and send it however you already talk to them.',
    'ہر اُس گاہک کے لیے مؤدب پیغام تیار ہے جس کا ادھار باقی ہے۔ نقل کریں اور جیسے آپ عام طور پر بات کرتے ہیں، ویسے بھیج دیں۔'
  ],
  'rem.copy': ['Copy message', 'پیغام نقل کریں'],
  'rem.copied': ['Copied', 'نقل ہو گیا'],
  'rem.copyError': [
    'Your browser blocked the copy. Select the message and copy it manually.',
    'براؤزر نے نقل روک دی۔ پیغام منتخب کر کے خود نقل کریں۔'
  ],
  'rem.emptyTitle': ['Everyone has settled up', 'سب کا حساب صاف ہے'],
  'rem.emptyBody': [
    'No customer currently owes you anything. Reminders will appear here when credit goes unpaid.',
    'اس وقت کسی گاہک کا ادھار باقی نہیں۔ جب ادھار رہ جائے گا تو یاد دہانی یہاں آ جائے گی۔'
  ],
  'rem.note': [
    'The wording is fixed, not generated, so it reads the same every time and works with no connection. Tone follows how long the credit has been outstanding — nothing is sent on your behalf.',
    'الفاظ پہلے سے طے ہیں، ہر بار ایک جیسے، اور انٹرنیٹ کے بغیر بھی کام کرتے ہیں۔ لہجہ ادھار کی عمر کے مطابق بدلتا ہے — آپ کی طرف سے کچھ خود بخود نہیں بھیجا جاتا۔'
  ],
  'rem.preparing': ['Preparing reminders…', 'یاد دہانیاں تیار ہو رہی ہیں…'],
  'rem.tone.gentle': ['Gentle nudge', 'نرم یاد دہانی'],
  'rem.tone.firm': ['Direct reminder', 'سیدھی یاد دہانی'],
  'rem.tone.urgent': ['Overdue', 'کافی دیر ہو چکی'],

  // ---- history ----
  'hist.kicker': ['Trading history', 'کاروبار کی تاریخ'],
  'hist.title': ['How the shop has been doing', 'دکان کیسی چل رہی ہے'],
  'hist.body': [
    'Every ledger page you upload adds to this record. Weekly net income is exactly what the cash flow part of your score is measured on.',
    'آپ جو بھی صفحہ بھیجتے ہیں وہ اس ریکارڈ میں شامل ہو جاتا ہے۔ ہفتہ وار خالص آمدنی وہی ہے جس پر آپ کے اسکور کا نقد بہاؤ والا حصہ ناپا جاتا ہے۔'
  ],
  'hist.day': ['Daily', 'روزانہ'],
  'hist.week': ['Weekly', 'ہفتہ وار'],
  'hist.month': ['Monthly', 'ماہانہ'],
  'hist.year': ['Yearly', 'سالانہ'],
  'hist.period': ['Period', 'مدت'],
  'hist.sales': ['Sales', 'فروخت'],
  'hist.expenses': ['Expenses', 'خرچ'],
  'hist.givenCol': ['Given', 'ادھار دیا'],
  'hist.repaidCol': ['Repaid', 'واپس آیا'],
  'hist.net': ['Net', 'خالص'],
  'hist.totalSales': ['Total sales', 'کل فروخت'],
  'hist.average': ['Average per {period}', 'فی {period} اوسط'],
  'hist.best': ['Best period', 'بہترین مدت'],
  'hist.netLabel': ['{net} net', '{net} خالص'],
  'hist.emptyTitle': ['Nothing dated yet', 'ابھی کوئی تاریخ درج نہیں'],
  'hist.emptyBody': [
    'Upload a ledger page with dates on it and your trading history will build up here.',
    'تاریخوں والا صفحہ بھیجیں تو آپ کے کاروبار کی تاریخ یہاں بننا شروع ہو جائے گی۔'
  ],
  'hist.note': [
    'Net income counts sales and repayments in, expenses and credit given out — the same signing the score uses, so these numbers and your cash flow metric always agree.',
    'خالص آمدنی میں فروخت اور واپسی جمع، اور خرچ اور دیا گیا ادھار منہا ہوتا ہے — بالکل وہی حساب جو اسکور میں ہے، اس لیے یہ اعداد اور آپ کا نقد بہاؤ ہمیشہ ایک جیسے رہتے ہیں۔'
  ],
  'hist.undated': [
    '{count} transaction(s) carried no usable date and are left out rather than placed in a guessed period.',
    '{count} اندراج پر قابلِ استعمال تاریخ نہیں تھی، اس لیے انہیں اندازے کی مدت میں ڈالنے کے بجائے چھوڑ دیا گیا۔'
  ],
  'hist.loading': ['Loading history…', 'تاریخ لائی جا رہی ہے…'],

  // ---- review queue ----
  'rev.kicker': ['Worth a second look', 'دوبارہ دیکھنے کے قابل'],
  'rev.title': ['Entries to check', 'جانچنے والے اندراج'],
  'rev.body': [
    'When the reading was unsure, or a detail is missing, the entry is listed here instead of being quietly accepted. Correct it or confirm it — either way it stops asking.',
    'جب پڑھنے میں شک ہو یا کوئی تفصیل کم ہو، تو اندراج چپکے سے قبول کرنے کے بجائے یہاں رکھ دیا جاتا ہے۔ درست کر دیں یا تصدیق کر دیں — دونوں صورتوں میں یہ دوبارہ نہیں پوچھے گا۔'
  ],
  'rev.toCheck': ['To check', 'جانچنا ہے'],
  'rev.correct': ['Correct', 'درست کریں'],
  'rev.itsRight': ['It\'s right', 'یہ ٹھیک ہے'],
  'rev.save': ['Save correction', 'درستی محفوظ کریں'],
  'rev.saving': ['Saving…', 'محفوظ ہو رہا ہے…'],
  'rev.cancel': ['Cancel', 'منسوخ'],
  'rev.type': ['What kind of entry', 'اندراج کی قسم'],
  'rev.amount': ['Amount (PKR)', 'رقم (روپے)'],
  'rev.customer': ['Customer name', 'گاہک کا نام'],
  'rev.customerHint': ['Leave empty for a walk-in sale', 'عام گاہک کی فروخت ہو تو خالی چھوڑ دیں'],
  'rev.date': ['Date', 'تاریخ'],
  'rev.emptyTitle': ['Every entry looks clear', 'ہر اندراج صاف ہے'],
  'rev.emptyBody': [
    'Nothing was flagged as uncertain or incomplete on the pages you have uploaded.',
    'آپ کے بھیجے گئے صفحوں پر کوئی اندراج مشکوک یا ادھورا نہیں نکلا۔'
  ],
  'rev.note': [
    'Corrections update your score, balances and history straight away — the figures are always recalculated from these entries, never stored separately.',
    'درستی کرتے ہی آپ کا اسکور، حساب اور تاریخ سب بدل جاتے ہیں — یہ اعداد ہمیشہ انہی اندراجات سے دوبارہ نکالے جاتے ہیں، الگ سے محفوظ نہیں ہوتے۔'
  ],
  'rev.checking': ['Checking your entries…', 'آپ کے اندراج دیکھے جا رہے ہیں…'],
  'rev.sev.high': ['Needs a name', 'نام درکار'],
  'rev.sev.medium': ['Unsure reading', 'پڑھنے میں شک'],
  'rev.sev.low': ['Missing date', 'تاریخ نہیں'],

  // ---- transaction types ----
  'type.sale': ['Sale', 'فروخت'],
  'type.expense': ['Expense', 'خرچ'],
  'type.credit_given': ['Credit given (udhaar)', 'ادھار دیا'],
  'type.repayment': ['Repayment (waapsi)', 'واپسی'],
  'type.all': ['All types', 'تمام اقسام'],

  // ---- auth ----
  'auth.signIn': ['Sign in', 'داخل ہوں'],
  'auth.signingIn': ['Signing in…', 'داخل ہو رہے ہیں…'],
  'auth.welcomeBack': ['Welcome back', 'خوش آمدید'],
  'auth.openRecord': ['Open your shop record.', 'اپنی دکان کا کھاتہ کھولیں۔'],
  'auth.email': ['Email address', 'ای میل'],
  'auth.password': ['Password', 'پاس ورڈ'],
  'auth.forgot': ['Forgot your password?', 'پاس ورڈ بھول گئے؟'],
  'auth.newHere': ['New to QarzMitr?', 'پہلی بار آئے ہیں؟'],
  'auth.createAccount': ['Create an account', 'نیا کھاتہ بنائیں'],
  'auth.tryDemo': ['Try the demo', 'نمونہ دیکھیں'],
  'auth.fillDemo': ['Fill demo credentials', 'نمونے کی تفصیل بھریں'],

  // ---- lender view ----
  'lender.kicker': ['Lender assessment', 'قرض دینے والے کی جانچ'],
  'lender.back': ['Back to shopkeeper view', 'دکاندار کے نظارے پر واپس'],
  'lender.prepared': ['{name} · Prepared {date} · Evidence from ledger photographs only', '{name} · {date} کو تیار · ثبوت صرف کھاتے کی تصویروں سے'],
  'lender.unnamed': ['Unnamed shop', 'بے نام دکان'],
  'lender.score': ['Score', 'اسکور'],
  'lender.outOf': ['out of 100', '۱۰۰ میں سے'],
  'lender.since': ['{delta} since previous run', 'پچھلی بار سے {delta}'],
  'lender.recommendation': ['Recommendation', 'سفارش'],
  'lender.ceiling': ['Indicative facility ceiling', 'اندازاً زیادہ سے زیادہ سہولت'],
  'lender.ceilingNote': ['{multiple}× average monthly sales of {sales}, measured across {days} days of ledger evidence.', 'ماہانہ اوسط فروخت {sales} کا {multiple} گنا، {days} دن کے کھاتے کے ثبوت پر۔'],
  'lender.band.recommended': ['Recommended', 'سفارش کی جاتی ہے'],
  'lender.band.review': ['Recommended with review', 'جانچ کے ساتھ سفارش'],
  'lender.band.manual': ['Refer for manual review', 'دستی جانچ کے لیے بھیجیں'],
  'lender.band.none': ['Not recommended yet', 'ابھی سفارش نہیں'],
  'lender.note.recommended': ['Consistent ledger evidence across the tracked period.', 'پوری مدت میں کھاتے کا ثبوت مستقل رہا۔'],
  'lender.note.review': ['Viable, but confirm repayment behaviour before disbursing.', 'قابلِ غور، مگر رقم دینے سے پہلے واپسی کا رویہ جانچ لیں۔'],
  'lender.note.manual': ['Ledger evidence is mixed. No automatic facility suggested.', 'کھاتے کا ثبوت ملا جلا ہے۔ خودکار سہولت تجویز نہیں کی جاتی۔'],
  'lender.note.none': ['Insufficient or declining evidence. Re-assess after more ledger pages.', 'ثبوت ناکافی یا گرتا ہوا ہے۔ مزید صفحوں کے بعد دوبارہ جانچیں۔'],
  'lender.evidence': ['Ledger evidence', 'کھاتے کا ثبوت'],
  'lender.evidenceTitle': ['What the paper record shows', 'کاغذی ریکارڈ کیا بتاتا ہے'],
  'lender.row.transactions': ['Transactions on record', 'ریکارڈ پر اندراج'],
  'lender.row.customers': ['Named customers', 'نام والے گاہک'],
  'lender.row.period': ['Period covered', 'کتنی مدت'],
  'lender.row.runs': ['Score runs', 'اسکور کے حساب'],
  'lender.row.sales': ['Total sales', 'کل فروخت'],
  'lender.row.expenses': ['Total expenses', 'کل خرچ'],
  'lender.row.credit': ['Credit extended to customers', 'گاہکوں کو دیا گیا ادھار'],
  'lender.row.repaid': ['Repaid by customers', 'گاہکوں سے واپس آیا'],
  'lender.row.outstanding': ['Outstanding customer credit', 'گاہکوں پر باقی ادھار'],
  'lender.row.monthly': ['Average monthly sales', 'ماہانہ اوسط فروخت'],
  'lender.undated': ['Undated', 'بغیر تاریخ'],
  'lender.download': ['Download statement', 'اسٹیٹمنٹ ڈاؤن لوڈ کریں'],
  'lender.downloadHint': ['Opens your print dialog — choose "Save as PDF" to keep a copy for a lender.', 'پرنٹ کا خانہ کھلے گا — "Save as PDF" چن کر کاپی محفوظ کر لیں۔'],
  'lender.statement': ['Credit statement', 'کریڈٹ اسٹیٹمنٹ'],
  'lender.reference': ['Reference', 'حوالہ نمبر'],
  'lender.generated': ['Generated', 'تیار کیا گیا'],
  'lender.pages': ['Ledger pages', 'کھاتے کے صفحات'],
  'lender.verify': [
    'This statement was produced by QarzMitr from photographs of the shopkeeper\'s own handwritten ledger. The score is computed by deterministic code from the transactions listed; re-running the same ledger reproduces the same figures. Reference the number above when checking this statement.',
    'یہ اسٹیٹمنٹ قرض متر نے دکاندار کے اپنے ہاتھ سے لکھے کھاتے کی تصویروں سے بنائی ہے۔ اسکور نیچے درج اندراجات سے طے شدہ حساب کے ذریعے نکالا گیا ہے؛ وہی کھاتہ دوبارہ چلانے پر وہی اعداد آتے ہیں۔ تصدیق کے وقت اوپر دیا گیا حوالہ نمبر استعمال کریں۔'
  ],
  'lender.method': ['Method', 'طریقہ'],
  'lender.methodTitle': ['How this number was reached', 'یہ عدد کیسے نکلا'],
  'lender.methodBody': [
    'The score is arithmetic, not inference. Three metrics are computed from the transaction record in backend code and combined at fixed weights — 40% cash flow consistency, 35% repayment ratio, 25% revenue trend. Re-running the same ledger always produces the same score. A language model is used only to transcribe the handwriting and to explain the finished result to the shopkeeper in Urdu; it is never asked what the score should be.',
    'یہ اسکور حساب ہے، اندازہ نہیں۔ تین پیمانے اندراج سے پروگرام میں نکالے جاتے ہیں اور طے شدہ وزن سے جوڑے جاتے ہیں — ۴۰٪ نقد بہاؤ کی مستقل مزاجی، ۳۵٪ واپسی کا تناسب، ۲۵٪ فروخت کا رجحان۔ وہی کھاتہ ہمیشہ وہی اسکور دیتا ہے۔ زبان کا ماڈل صرف لکھائی پڑھنے اور نتیجہ اردو میں سمجھانے کے لیے ہے؛ اس سے کبھی نہیں پوچھا جاتا کہ اسکور کیا ہونا چاہیے۔'
  ],
  'lender.caveat': [
    'This is a feasibility prototype. The band thresholds and the facility multiple above are illustrative defaults, not underwriting policy, and transcription of handwriting can carry errors. No figure here should decide a loan on its own.',
    'یہ ایک آزمائشی نمونہ ہے۔ اوپر دی گئی حدیں اور سہولت کا تناسب صرف مثال کے طور پر ہیں، کوئی قرض پالیسی نہیں، اور لکھائی پڑھنے میں غلطی ہو سکتی ہے۔ یہاں کا کوئی عدد اکیلا قرض کا فیصلہ نہ کرے۔'
  ],
  'lender.preparing': ['Preparing assessment…', 'جانچ تیار ہو رہی ہے…'],
  'lender.noScore': ['No score has been computed yet', 'ابھی کوئی اسکور نہیں نکالا گیا'],
  'lender.noScoreBody': ['This applicant needs at least one processed ledger page before an assessment can be produced.', 'جانچ کے لیے کم از کم ایک کھاتے کا صفحہ ترتیب دینا ضروری ہے۔'],
  'lender.metric.cashflow': ['Cash flow consistency', 'نقد بہاؤ کی مستقل مزاجی'],
  'lender.metric.repayment': ['Repayment ratio', 'واپسی کا تناسب'],
  'lender.metric.revenue': ['Revenue trend', 'فروخت کا رجحان'],

  // ---- footer ----
  'footer.prototype': [
    'QarzMitr is a feasibility prototype, not a final lending decision.',
    'قرض متر ایک آزمائشی نمونہ ہے، قرض کا حتمی فیصلہ نہیں۔'
  ],
  'footer.builtFor': [
    'Built for people who have never used a banking app—using only what they already do.',
    'اُن لوگوں کے لیے جنہوں نے کبھی بینکنگ ایپ استعمال نہیں کی — صرف اُسی چیز سے جو وہ پہلے سے کرتے ہیں۔'
  ],
}
