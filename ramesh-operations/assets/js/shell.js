/* =============================================================================
   SHARED PAGE SHELL: interface text, language switch, header, saved progress.
   Every page calls Shell.init(renderFn); renderFn runs again on language change.
   ============================================================================= */
window.Shell = (function () {
  'use strict';

  const LANGS = [
    { id: 'en', label: 'English', sr: 'en-IN' },
    { id: 'te', label: 'తెలుగు', sr: 'te-IN' },
    { id: 'hi', label: 'हिन्दी', sr: 'hi-IN' }
  ];
  const READY_SCORE = 80;

  const T = {
    en: {
      brand: 'Ramesh Training', navHome: 'Home', navDesk: 'Walk-in desk', navCourses: 'Courses', navQuestions: 'Questions', navPractice: 'Practice', navQuiz: 'Fee quiz',
      homeKicker: 'Front desk course training', homeTitle: 'Explain every course with confidence, in three languages.',
      homeLead: 'Ramesh, this is your practice space. Learn what to say to walk-in visitors, then read it aloud. The page listens, highlights each word and gives you a score.',
      pathTitle: 'Your training path', pathLead: 'Follow these steps in order. A lesson counts as ready at a score of 80 or more.',
      p1: 'Learn the walk-in steps', p1d: 'The seven steps of every visit, from greeting to goodbye.',
      p2: 'Learn the courses', p2d: 'All 15 courses on the price sheet, with duration and fee.',
      p3: 'Prepare for questions', p3d: 'Honest answers to fees, jobs, tax and more.',
      p4: 'Practise aloud', p4d: 'Read each script aloud and score 80 or more.',
      p5: 'Take the fee quiz', p5d: 'Check that you remember every fee without the sheet.',
      progressTitle: 'Your progress', progressNote: 'Scores are saved in this browser, on this computer only.',
      lessonsReady: 'lessons ready', quizBest: 'Best quiz score', notYet: 'Not taken yet', open: 'Open',
      sheetTitle: 'Price sheet', sheetLead: 'Fees and durations below come from this sheet. If the sheet changes, the sheet is right.', viewSheet: 'Open the full price sheet',
      coursesTitle: 'Courses and fees', coursesLead: 'Every course runs for three months. Tap Practise to read a course aloud.',
      course: 'Course', duration: 'Duration', fee: 'Fee', months: '3 months', tools: 'What they learn', needs: 'What they should know', say: 'What to say', practise: 'Practise', hear: 'Listen',
      basicsTitle: 'Words you should know', basicsLead: 'Visitors may ask what these mean. Use these simple answers.',
      deskTitle: 'The walk-in desk', deskLead: 'Follow these seven steps with every visitor, in this order.', doThis: 'Do this', sayThis: 'Say this',
      finderTitle: 'Course finder', finderLead: 'After you ask about their goal, use this to suggest a course.', visitor: 'If the visitor is', suggest: 'Suggest',
      contactTitle: 'Contact details to share', demoDays: 'Free demo days',
      questionsTitle: 'Visitor questions', questionsLead: 'Learn these answers. When you are not sure, use the last one. It is always a good answer.',
      neverTitle: 'Four rules', neverLead: 'Wrong promises cost more than a lost visitor.',
      practiceTitle: 'Read-aloud practice', practiceLead: 'Pick a script, press Start and read it aloud. Every word lights up as you say it.',
      setDesk: 'Walk-in desk', setCourse: 'Courses', setQuestion: 'Questions',
      words: 'words', best: 'Best score', notAttempted: 'Not attempted yet',
      start: 'Start', pause: 'Pause', resume: 'Resume', scoring: 'Scoring...', again: 'Start again', endScore: 'End and score', reset: 'Reset', hearFirst: 'Hear it first', stopAudio: 'Stop audio',
      ready: 'Ready', listening: 'Listening...', paused: 'Paused', finishing: 'Finishing...', scored: 'Scored', time: 'Time', pace: 'Pace', wpm: 'wpm',
      heardHint: 'What the microphone hears will appear here as you read.',
      legendOk: 'Read correctly', legendMiss: 'Misread (hover to see what was heard)', legendSkip: 'Skipped', legendNext: 'Read this next',
      noVoice: 'This computer has no voice for this language, so Hear it first is off. Microsoft Edge usually has Telugu and Hindi voices.',
      howTitle: 'How your score works',
      how1: 'Accuracy (60%): the share of words you attempted that were recognised correctly.', how2: 'Completion (25%): how much of the script you read before ending.',
      how3: 'Pace (15%): full marks at a calm speaking speed for this language.', how4: 'Extra words, such as fillers or repeats, take off one point each, up to ten.',
      howTip: 'Use Google Chrome with a headset microphone in a quiet room. Speech goes through the browser speech service, so you need internet. English words inside Telugu or Hindi may be misheard sometimes. If that happens on a word you said clearly, it is the service and not you.',
      reportKicker: 'Your reading report', scoreOf: 'out of 100', accuracy: 'Accuracy', accuracySub: 'of words you attempted', completion: 'Completion', completionSub: 'words reached',
      paceSub: 'words per minute, ideal', to: 'to', readingTime: 'Reading time', readingSub: 'pauses not counted',
      correct: 'correct', misread: 'misread', missed: 'missed', extra: 'extra', misreadTitle: 'Misread words', missedTitle: 'Missed words', extraTitle: 'Extra words heard',
      noMisread: 'None. Every word you read was recognised correctly.', noMissed: 'None. You read every word.', improve: 'How to improve', tryAgain: 'Try again', nextScript: 'Next script',
      r5: ['Excellent', 'Clear, accurate and well paced. You are ready to say this to a visitor.'], r4: ['Very good', 'Strong reading with only a few slips. One more round will make it polished.'],
      r3: ['Good', 'A solid attempt. Work on the highlighted words and try again.'], r2: ['Fair', 'You are getting there. Slow down a little and read every word clearly.'], r1: ['Keep practising', 'Read the script once silently, then aloud slowly. Accuracy first, speed later.'],
      tipNone: 'No words were recognised. Check that the microphone is allowed and close to you.', tipStop: n => `You stopped ${n} words before the end. Finish the whole script.`,
      tipSkip: n => `You skipped ${n} word(s). Keep your eyes one word ahead of your voice.`, tipMiss: w => `Practise these slowly: ${w}. Tap a word below to hear it.`,
      tipSlow: (w, l, h) => `Your pace was ${w} words per minute. Aim for ${l} to ${h}, and read in phrases rather than word by word.`, tipFast: (w, l, h) => `Your pace was ${w} words per minute, which is fast for a visitor. Aim for ${l} to ${h} and pause at every full stop.`,
      tipExtra: 'Several extra words were heard. Avoid fillers like um, and do not repeat words when you restart a sentence.', tipGreat: 'Great result. Now try saying it while looking at the visitor, not the screen.', tipOk: 'Nice work. Read it once more in a confident, steady tone.',
      errBlocked: 'Microphone access was blocked. Allow the microphone for this site (the icon in the address bar), then press Resume.', errNoMic: 'No microphone was found. Plug one in or check your sound settings, then press Resume.',
      errNet: 'The speech service could not be reached. Check your internet connection, then press Resume.', errLang: 'This browser does not offer speech recognition for this language. Please use Google Chrome.', errOther: e => `Speech recognition stopped (${e}). Press Resume to continue.`,
      errRepeat: 'The microphone keeps stopping. Press Resume to try again.', errStart: 'Could not start the microphone. Please try again.', errBrowser: 'This browser does not support speech recognition. Please open this page in Google Chrome on a computer or Android phone.',
      quizTitle: 'Fee quiz', quizLead: 'Ten quick questions, without looking at the sheet. Aim for ten out of ten before you work the desk alone.', quizStart: 'Start the quiz', question: 'Question', of: 'of', right: 'Correct', wrong: 'Not quite. The answer is', nextQ: 'Next question', quizDone: 'Quiz finished', quizScore: 'You scored', quizRetry: 'Take a new quiz', reviewSheet: 'Go back to the fee table',
      qFee: c => `What is the fee for the ${c}?`, qDur: c => `How long is the ${c}?`, qCat: c => `Which group is the ${c} in?`, qDemo: 'Which days have the free demo classes?', qHigh: 'Which course has the highest fee on the sheet?', qFirst: 'What should every walk-in do first?', qFirstA: 'Scan the QR code', qFirstB: 'Pay the fee', qFirstC: 'Join a batch', qFirstD: 'Meet the trainer',
      qJob: 'A visitor asks if a job is guaranteed. What do you say?', qJobA: 'We give placement support, but cannot promise a job', qJobB: 'Yes, a job is guaranteed', qJobC: 'Yes, within three months', qJobD: 'No, we do not help at all',
      backHome: 'Back to home', rs: 'Rs.', footer: 'Internal training for the Tinitiate AI front desk.', langLabel: 'Language'
    },
    te: {
      brand: 'రమేష్ ట్రైనింగ్', navHome: 'హోమ్', navDesk: 'వాక్-ఇన్ డెస్క్', navCourses: 'కోర్సులు', navQuestions: 'ప్రశ్నలు', navPractice: 'ప్రాక్టీస్', navQuiz: 'ఫీజు క్విజ్',
      homeKicker: 'ఫ్రంట్ డెస్క్ కోర్సు శిక్షణ', homeTitle: 'ప్రతి కోర్సును మూడు భాషల్లో ధైర్యంగా వివరించండి.',
      homeLead: 'రమేష్, ఇది మీ ప్రాక్టీస్ స్థలం. వాక్-ఇన్ వచ్చినవారితో ఏం మాట్లాడాలో నేర్చుకుని, గట్టిగా చదవండి. ఈ పేజీ మీ మాట విని, ప్రతి పదాన్ని హైలైట్ చేసి, స్కోర్ ఇస్తుంది.',
      pathTitle: 'మీ శిక్షణ మార్గం', pathLead: 'ఈ దశలను వరుసగా పాటించండి. 80 లేదా అంతకంటే ఎక్కువ స్కోర్ వస్తే పాఠం సిద్ధమైనట్టు.',
      p1: 'వాక్-ఇన్ దశలు నేర్చుకోండి', p1d: 'స్వాగతం నుంచి వీడ్కోలు వరకు ప్రతి సందర్శనలోని ఏడు దశలు.',
      p2: 'కోర్సులు నేర్చుకోండి', p2d: 'ప్రైస్ షీట్‌లోని 15 కోర్సులు, వ్యవధి, ఫీజుతో సహా.',
      p3: 'ప్రశ్నలకు సిద్ధం కండి', p3d: 'ఫీజు, ఉద్యోగం, టాక్స్ గురించి నిజాయితీ సమాధానాలు.',
      p4: 'గట్టిగా ప్రాక్టీస్ చేయండి', p4d: 'ప్రతి స్క్రిప్ట్ చదివి 80 లేదా ఎక్కువ స్కోర్ తెచ్చుకోండి.',
      p5: 'ఫీజు క్విజ్ రాయండి', p5d: 'షీట్ చూడకుండా ప్రతి ఫీజు గుర్తుందో చూసుకోండి.',
      progressTitle: 'మీ ప్రగతి', progressNote: 'స్కోర్లు ఈ కంప్యూటర్‌లోని ఈ బ్రౌజర్‌లో మాత్రమే ఉంటాయి.',
      lessonsReady: 'పాఠాలు సిద్ధం', quizBest: 'క్విజ్ ఉత్తమ స్కోర్', notYet: 'ఇంకా రాయలేదు', open: 'తెరవండి',
      sheetTitle: 'ప్రైస్ షీట్', sheetLead: 'ఇక్కడి ఫీజులు, వ్యవధులు ఈ షీట్ నుంచి తీసుకున్నవి. షీట్ మారితే, షీట్‌నే పాటించండి.', viewSheet: 'పూర్తి ప్రైస్ షీట్ తెరవండి',
      coursesTitle: 'కోర్సులు, ఫీజులు', coursesLead: 'ప్రతి కోర్సు మూడు నెలలు. కోర్సును గట్టిగా చదవడానికి ప్రాక్టీస్ నొక్కండి.',
      course: 'కోర్సు', duration: 'వ్యవధి', fee: 'ఫీజు', months: '3 నెలలు', tools: 'ఏం నేర్చుకుంటారు', needs: 'ఏం తెలిసి ఉండాలి', say: 'ఏం చెప్పాలి', practise: 'ప్రాక్టీస్', hear: 'వినండి',
      basicsTitle: 'మీకు తెలియాల్సిన పదాలు', basicsLead: 'వీటి అర్థం సందర్శకులు అడగవచ్చు. ఈ సులభమైన జవాబులు చెప్పండి.',
      deskTitle: 'వాక్-ఇన్ డెస్క్', deskLead: 'ప్రతి సందర్శకుడితో ఈ ఏడు దశలను ఇదే వరుసలో పాటించండి.', doThis: 'ఇలా చేయండి', sayThis: 'ఇలా చెప్పండి',
      finderTitle: 'కోర్స్ ఫైండర్', finderLead: 'వారి లక్ష్యం అడిగిన తర్వాత, దీన్ని చూసి కోర్సు సూచించండి.', visitor: 'సందర్శకులు ఇలా అయితే', suggest: 'ఇవి సూచించండి',
      contactTitle: 'ఇవ్వాల్సిన కాంటాక్ట్ వివరాలు', demoDays: 'ఉచిత డెమో రోజులు',
      questionsTitle: 'సందర్శకుల ప్రశ్నలు', questionsLead: 'ఈ జవాబులు నేర్చుకోండి. సందేహం వస్తే చివరి జవాబు వాడండి. అది ఎప్పుడూ మంచి జవాబే.',
      neverTitle: 'నాలుగు నియమాలు', neverLead: 'తప్పుడు హామీ ఒక సందర్శకుడిని కోల్పోవడం కంటే ఎక్కువ నష్టం.',
      practiceTitle: 'గట్టిగా చదివే ప్రాక్టీస్', practiceLead: 'స్క్రిప్ట్ ఎంచుకుని, ప్రారంభించండి నొక్కి గట్టిగా చదవండి. మీరు చెప్పే ప్రతి పదం వెలుగుతుంది.',
      setDesk: 'వాక్-ఇన్ డెస్క్', setCourse: 'కోర్సులు', setQuestion: 'ప్రశ్నలు',
      words: 'పదాలు', best: 'ఉత్తమ స్కోర్', notAttempted: 'ఇంకా ప్రయత్నించలేదు',
      start: 'ప్రారంభించండి', pause: 'ఆపండి', resume: 'కొనసాగించండి', scoring: 'స్కోర్ చేస్తోంది...', again: 'మళ్లీ ప్రారంభించండి', endScore: 'ముగించి స్కోర్ చూడండి', reset: 'రీసెట్', hearFirst: 'ముందు వినండి', stopAudio: 'ఆడియో ఆపండి',
      ready: 'సిద్ధం', listening: 'వింటోంది...', paused: 'ఆగింది', finishing: 'ముగిస్తోంది...', scored: 'స్కోర్ వచ్చింది', time: 'సమయం', pace: 'వేగం', wpm: 'పదాలు/నిమి',
      heardHint: 'మీరు చదువుతుంటే మైక్రోఫోన్ విన్నది ఇక్కడ కనిపిస్తుంది.',
      legendOk: 'సరిగ్గా చదివారు', legendMiss: 'తప్పుగా చదివారు (మౌస్ ఉంచితే విన్నది కనిపిస్తుంది)', legendSkip: 'వదిలేశారు', legendNext: 'తర్వాత ఇది చదవండి',
      noVoice: 'ఈ కంప్యూటర్‌లో ఈ భాష వాయిస్ లేదు, అందుకే ముందు వినండి పనిచేయదు. Microsoft Edge లో సాధారణంగా తెలుగు, హిందీ వాయిస్‌లు ఉంటాయి.',
      howTitle: 'మీ స్కోర్ ఎలా వస్తుంది',
      how1: 'కచ్చితత్వం (60%): మీరు చదివిన పదాల్లో సరిగ్గా గుర్తించినవి.', how2: 'పూర్తి చేయడం (25%): ముగించే ముందు స్క్రిప్ట్ ఎంత చదివారు.',
      how3: 'వేగం (15%): ఈ భాషకు తగిన ప్రశాంతమైన వేగంలో చదివితే పూర్తి మార్కులు.', how4: 'అదనపు పదాలు, మళ్లీ చెప్పిన పదాలకు ఒక్కోదానికి ఒక పాయింట్ తగ్గుతుంది, గరిష్ఠంగా పది.',
      howTip: 'నిశ్శబ్ద గదిలో హెడ్‌సెట్ మైక్రోఫోన్‌తో Google Chrome వాడండి. మాటలు బ్రౌజర్ స్పీచ్ సర్వీస్ ద్వారా వెళ్తాయి, కాబట్టి ఇంటర్నెట్ అవసరం. తెలుగు మధ్యలో వచ్చే ఇంగ్లీష్ పదాలు కొన్నిసార్లు తప్పుగా వినిపించవచ్చు. మీరు స్పష్టంగా చెప్పిన పదం తప్పుగా వస్తే, అది సర్వీస్ పొరపాటు, మీది కాదు.',
      reportKicker: 'మీ రీడింగ్ రిపోర్ట్', scoreOf: '100 లో', accuracy: 'కచ్చితత్వం', accuracySub: 'మీరు చదివిన పదాల్లో', completion: 'పూర్తి', completionSub: 'పదాలు చదివారు',
      paceSub: 'పదాలు నిమిషానికి, ఉత్తమం', to: 'నుంచి', readingTime: 'చదివిన సమయం', readingSub: 'ఆపిన సమయం లెక్కలోకి రాదు',
      correct: 'సరైనవి', misread: 'తప్పుగా చదివినవి', missed: 'వదిలేసినవి', extra: 'అదనం', misreadTitle: 'తప్పుగా చదివిన పదాలు', missedTitle: 'వదిలేసిన పదాలు', extraTitle: 'అదనంగా వినిపించిన పదాలు',
      noMisread: 'ఏమీ లేవు. మీరు చదివిన ప్రతి పదం సరిగ్గా గుర్తించబడింది.', noMissed: 'ఏమీ లేవు. ప్రతి పదం చదివారు.', improve: 'ఎలా మెరుగుపడాలి', tryAgain: 'మళ్లీ ప్రయత్నించండి', nextScript: 'తర్వాతి స్క్రిప్ట్',
      r5: ['అద్భుతం', 'స్పష్టంగా, కచ్చితంగా, సరైన వేగంతో చదివారు. సందర్శకులతో ఇలా చెప్పడానికి మీరు సిద్ధం.'], r4: ['చాలా బాగుంది', 'కొన్ని చిన్న తప్పులే ఉన్నాయి. ఇంకోసారి చదివితే పక్కాగా వస్తుంది.'],
      r3: ['బాగుంది', 'మంచి ప్రయత్నం. హైలైట్ అయిన పదాలు సరిచూసుకుని మళ్లీ ప్రయత్నించండి.'], r2: ['పర్వాలేదు', 'దగ్గరకు వస్తున్నారు. కొంచెం నెమ్మదిగా, ప్రతి పదం స్పష్టంగా చదవండి.'], r1: ['ప్రాక్టీస్ కొనసాగించండి', 'ముందు మనసులో చదివి, తర్వాత నెమ్మదిగా గట్టిగా చదవండి. ముందు కచ్చితత్వం, తర్వాత వేగం.'],
      tipNone: 'ఏ పదమూ గుర్తించబడలేదు. మైక్రోఫోన్ అనుమతి ఇచ్చారో, అది దగ్గరగా ఉందో చూడండి.', tipStop: n => `చివరికి ఇంకా ${n} పదాలు ఉండగా ఆపేశారు. పూర్తి స్క్రిప్ట్ చదవండి.`,
      tipSkip: n => `${n} పదాలు వదిలేశారు. మీ కళ్లు మాట కంటే ఒక పదం ముందు ఉండాలి.`, tipMiss: w => `వీటిని నెమ్మదిగా ప్రాక్టీస్ చేయండి: ${w}. కింద పదాన్ని నొక్కితే వినిపిస్తుంది.`,
      tipSlow: (w, l, h) => `మీ వేగం నిమిషానికి ${w} పదాలు. ${l} నుంచి ${h} లక్ష్యంగా పెట్టుకోండి, పదం పదంగా కాకుండా వాక్యభాగాలుగా చదవండి.`, tipFast: (w, l, h) => `మీ వేగం నిమిషానికి ${w} పదాలు, సందర్శకులకు ఇది వేగం ఎక్కువ. ${l} నుంచి ${h} లక్ష్యంగా పెట్టుకుని, ప్రతి వాక్యం తర్వాత ఆగండి.`,
      tipExtra: 'చాలా అదనపు పదాలు వినిపించాయి. ఊ, ఆ లాంటివి తగ్గించండి, వాక్యం మళ్లీ మొదలుపెట్టేటప్పుడు పదాలు రిపీట్ చేయకండి.', tipGreat: 'చాలా బాగుంది. ఇప్పుడు స్క్రీన్ కాకుండా సందర్శకుడిని చూస్తూ చెప్పడానికి ప్రయత్నించండి.', tipOk: 'బాగుంది. ఇంకోసారి ధైర్యంగా, స్థిరంగా చదవండి.',
      errBlocked: 'మైక్రోఫోన్ అనుమతి ఆగిపోయింది. అడ్రస్ బార్‌లోని గుర్తుతో ఈ సైట్‌కు మైక్రోఫోన్ అనుమతించి, కొనసాగించండి నొక్కండి.', errNoMic: 'మైక్రోఫోన్ కనిపించలేదు. ప్లగ్ చేయండి లేదా సౌండ్ సెట్టింగ్స్ చూసి, కొనసాగించండి నొక్కండి.',
      errNet: 'స్పీచ్ సర్వీస్ అందుబాటులో లేదు. ఇంటర్నెట్ చూసి, కొనసాగించండి నొక్కండి.', errLang: 'ఈ బ్రౌజర్‌లో ఈ భాషకు స్పీచ్ రికగ్నిషన్ లేదు. దయచేసి Google Chrome వాడండి.', errOther: e => `స్పీచ్ రికగ్నిషన్ ఆగిపోయింది (${e}). కొనసాగించండి నొక్కండి.`,
      errRepeat: 'మైక్రోఫోన్ పదే పదే ఆగుతోంది. మళ్లీ ప్రయత్నించడానికి కొనసాగించండి నొక్కండి.', errStart: 'మైక్రోఫోన్ ప్రారంభం కాలేదు. మళ్లీ ప్రయత్నించండి.', errBrowser: 'ఈ బ్రౌజర్‌లో స్పీచ్ రికగ్నిషన్ లేదు. కంప్యూటర్ లేదా Android ఫోన్‌లో Google Chrome తో తెరవండి.',
      quizTitle: 'ఫీజు క్విజ్', quizLead: 'షీట్ చూడకుండా పది చిన్న ప్రశ్నలు. ఒంటరిగా డెస్క్ చూసుకునే ముందు పదికి పది తెచ్చుకోండి.', quizStart: 'క్విజ్ ప్రారంభించండి', question: 'ప్రశ్న', of: '/', right: 'సరైన జవాబు', wrong: 'కాదు. సరైన జవాబు', nextQ: 'తర్వాతి ప్రశ్న', quizDone: 'క్విజ్ పూర్తయింది', quizScore: 'మీ స్కోర్', quizRetry: 'కొత్త క్విజ్ రాయండి', reviewSheet: 'ఫీజు పట్టిక చూడండి',
      qFee: c => `${c} ఫీజు ఎంత?`, qDur: c => `${c} ఎంత కాలం?`, qCat: c => `${c} ఏ విభాగంలో ఉంది?`, qDemo: 'ఉచిత డెమో క్లాసులు ఏ రోజుల్లో ఉంటాయి?', qHigh: 'షీట్‌లో ఎక్కువ ఫీజు ఉన్న కోర్సు ఏది?', qFirst: 'వచ్చిన ప్రతి ఒక్కరూ ముందుగా ఏం చేయాలి?', qFirstA: 'QR కోడ్ స్కాన్ చేయాలి', qFirstB: 'ఫీజు కట్టాలి', qFirstC: 'బ్యాచ్‌లో చేరాలి', qFirstD: 'ట్రైనర్‌ను కలవాలి',
      qJob: 'ఉద్యోగం గ్యారంటీనా అని సందర్శకులు అడిగితే ఏం చెబుతారు?', qJobA: 'ప్లేస్‌మెంట్ సపోర్ట్ ఇస్తాము, కానీ ఉద్యోగం హామీ ఇవ్వలేము', qJobB: 'అవును, ఉద్యోగం గ్యారంటీ', qJobC: 'అవును, మూడు నెలల్లో వస్తుంది', qJobD: 'లేదు, మేము ఏ సహాయమూ చేయము',
      backHome: 'హోమ్‌కు వెళ్లండి', rs: 'రూ.', footer: 'Tinitiate AI ఫ్రంట్ డెస్క్ అంతర్గత శిక్షణ.', langLabel: 'భాష'
    },
    hi: {
      brand: 'रमेश ट्रेनिंग', navHome: 'होम', navDesk: 'वॉक-इन डेस्क', navCourses: 'कोर्स', navQuestions: 'सवाल', navPractice: 'प्रैक्टिस', navQuiz: 'फीस क्विज़',
      homeKicker: 'फ्रंट डेस्क कोर्स ट्रेनिंग', homeTitle: 'हर कोर्स को तीन भाषाओं में भरोसे से समझाएं।',
      homeLead: 'रमेश, यह आपकी प्रैक्टिस की जगह है। वॉक-इन आने वालों से क्या कहना है, यह सीखें और ज़ोर से पढ़ें। यह पेज आपको सुनता है, हर शब्द को हाइलाइट करता है और स्कोर देता है।',
      pathTitle: 'आपका ट्रेनिंग रास्ता', pathLead: 'इन चरणों को क्रम से पूरा करें। 80 या उससे ज़्यादा स्कोर पर पाठ तैयार माना जाता है।',
      p1: 'वॉक-इन के चरण सीखें', p1d: 'स्वागत से विदाई तक हर विज़िट के सात चरण।',
      p2: 'कोर्स सीखें', p2d: 'प्राइस शीट के सभी 15 कोर्स, अवधि और फीस के साथ।',
      p3: 'सवालों की तैयारी करें', p3d: 'फीस, नौकरी, टैक्स पर ईमानदार जवाब।',
      p4: 'ज़ोर से प्रैक्टिस करें', p4d: 'हर स्क्रिप्ट पढ़ें और 80 या ज़्यादा स्कोर लाएं।',
      p5: 'फीस क्विज़ दें', p5d: 'देखें कि बिना शीट के हर फीस याद है या नहीं।',
      progressTitle: 'आपकी प्रगति', progressNote: 'स्कोर सिर्फ इसी कंप्यूटर के इसी ब्राउज़र में सेव होते हैं।',
      lessonsReady: 'पाठ तैयार', quizBest: 'क्विज़ का सबसे अच्छा स्कोर', notYet: 'अभी नहीं दिया', open: 'खोलें',
      sheetTitle: 'प्राइस शीट', sheetLead: 'यहां की फीस और अवधि इसी शीट से ली गई है। शीट बदले तो शीट को ही सही मानें।', viewSheet: 'पूरी प्राइस शीट खोलें',
      coursesTitle: 'कोर्स और फीस', coursesLead: 'हर कोर्स तीन महीने का है। कोर्स ज़ोर से पढ़ने के लिए प्रैक्टिस दबाएं।',
      course: 'कोर्स', duration: 'अवधि', fee: 'फीस', months: '3 महीने', tools: 'क्या सीखते हैं', needs: 'क्या आना चाहिए', say: 'क्या कहना है', practise: 'प्रैक्टिस', hear: 'सुनें',
      basicsTitle: 'ये शब्द आपको पता होने चाहिए', basicsLead: 'आने वाले इनका मतलब पूछ सकते हैं। ये आसान जवाब दें।',
      deskTitle: 'वॉक-इन डेस्क', deskLead: 'हर आने वाले के साथ ये सात चरण इसी क्रम में करें।', doThis: 'यह करें', sayThis: 'यह कहें',
      finderTitle: 'कोर्स फाइंडर', finderLead: 'उनका लक्ष्य पूछने के बाद, यह देखकर कोर्स सुझाएं।', visitor: 'अगर आने वाले', suggest: 'यह सुझाएं',
      contactTitle: 'देने वाली संपर्क जानकारी', demoDays: 'फ्री डेमो के दिन',
      questionsTitle: 'आने वालों के सवाल', questionsLead: 'ये जवाब सीखें। पक्का न हो तो आखिरी जवाब इस्तेमाल करें। वह हमेशा अच्छा जवाब है।',
      neverTitle: 'चार नियम', neverLead: 'गलत वादा, एक विज़िटर खोने से ज़्यादा नुकसान करता है।',
      practiceTitle: 'ज़ोर से पढ़ने की प्रैक्टिस', practiceLead: 'स्क्रिप्ट चुनें, शुरू दबाएं और ज़ोर से पढ़ें। आपका बोला हर शब्द चमकता जाएगा।',
      setDesk: 'वॉक-इन डेस्क', setCourse: 'कोर्स', setQuestion: 'सवाल',
      words: 'शब्द', best: 'सबसे अच्छा स्कोर', notAttempted: 'अभी कोशिश नहीं की',
      start: 'शुरू करें', pause: 'रोकें', resume: 'जारी रखें', scoring: 'स्कोर बन रहा है...', again: 'फिर से शुरू करें', endScore: 'खत्म करें और स्कोर देखें', reset: 'रीसेट', hearFirst: 'पहले सुनें', stopAudio: 'ऑडियो रोकें',
      ready: 'तैयार', listening: 'सुन रहा है...', paused: 'रुका हुआ', finishing: 'खत्म हो रहा है...', scored: 'स्कोर मिला', time: 'समय', pace: 'गति', wpm: 'शब्द/मिनट',
      heardHint: 'आपके पढ़ते समय माइक्रोफोन ने जो सुना, वह यहां दिखेगा।',
      legendOk: 'सही पढ़ा', legendMiss: 'गलत पढ़ा (माउस रखने पर सुना हुआ दिखेगा)', legendSkip: 'छोड़ दिया', legendNext: 'अब यह पढ़ें',
      noVoice: 'इस कंप्यूटर में इस भाषा की आवाज़ नहीं है, इसलिए पहले सुनें बंद है। Microsoft Edge में आमतौर पर तेलुगु और हिंदी आवाज़ें होती हैं।',
      howTitle: 'आपका स्कोर कैसे बनता है',
      how1: 'शुद्धता (60%): आपके पढ़े शब्दों में से कितने सही पहचाने गए।', how2: 'पूरा पढ़ना (25%): खत्म करने से पहले आपने स्क्रिप्ट का कितना हिस्सा पढ़ा।',
      how3: 'गति (15%): इस भाषा की शांत गति पर पूरे अंक।', how4: 'अतिरिक्त या दोहराए गए शब्दों पर एक-एक अंक कटता है, अधिकतम दस।',
      howTip: 'शांत कमरे में हेडसेट माइक्रोफोन के साथ Google Chrome इस्तेमाल करें। आवाज़ ब्राउज़र की स्पीच सर्विस से जाती है, इसलिए इंटरनेट चाहिए। हिंदी के बीच अंग्रेज़ी शब्द कभी-कभी गलत सुने जा सकते हैं। साफ बोला शब्द गलत आए तो यह सर्विस की गलती है, आपकी नहीं।',
      reportKicker: 'आपकी रीडिंग रिपोर्ट', scoreOf: '100 में से', accuracy: 'शुद्धता', accuracySub: 'आपके पढ़े शब्दों में', completion: 'पूरा पढ़ा', completionSub: 'शब्द पढ़े',
      paceSub: 'शब्द प्रति मिनट, आदर्श', to: 'से', readingTime: 'पढ़ने का समय', readingSub: 'रुकने का समय नहीं गिना',
      correct: 'सही', misread: 'गलत पढ़े', missed: 'छूटे', extra: 'अतिरिक्त', misreadTitle: 'गलत पढ़े गए शब्द', missedTitle: 'छूटे हुए शब्द', extraTitle: 'अतिरिक्त सुने गए शब्द',
      noMisread: 'कोई नहीं। आपका पढ़ा हर शब्द सही पहचाना गया।', noMissed: 'कोई नहीं। आपने हर शब्द पढ़ा।', improve: 'कैसे बेहतर करें', tryAgain: 'फिर कोशिश करें', nextScript: 'अगली स्क्रिप्ट',
      r5: ['शानदार', 'साफ, सही और अच्छी गति। आप यह बात आने वालों से कहने के लिए तैयार हैं।'], r4: ['बहुत अच्छा', 'बस कुछ छोटी गलतियां हैं। एक बार और पढ़ने से पक्का हो जाएगा।'],
      r3: ['अच्छा', 'अच्छी कोशिश। हाइलाइट किए शब्दों पर काम करके फिर पढ़ें।'], r2: ['ठीक है', 'आप करीब पहुंच रहे हैं। थोड़ा धीरे और हर शब्द साफ पढ़ें।'], r1: ['प्रैक्टिस जारी रखें', 'पहले मन में पढ़ें, फिर धीरे से ज़ोर से पढ़ें। पहले शुद्धता, फिर गति।'],
      tipNone: 'कोई शब्द नहीं पहचाना गया। देखें कि माइक्रोफोन की अनुमति है और वह पास में है।', tipStop: n => `आप आखिरी ${n} शब्द पहले रुक गए। पूरी स्क्रिप्ट पढ़ें।`,
      tipSkip: n => `आपने ${n} शब्द छोड़े। अपनी नज़र आवाज़ से एक शब्द आगे रखें।`, tipMiss: w => `इन्हें धीरे-धीरे प्रैक्टिस करें: ${w}। सुनने के लिए नीचे शब्द दबाएं।`,
      tipSlow: (w, l, h) => `आपकी गति ${w} शब्द प्रति मिनट थी। ${l} से ${h} का लक्ष्य रखें और शब्द-शब्द की जगह वाक्यांश में पढ़ें।`, tipFast: (w, l, h) => `आपकी गति ${w} शब्द प्रति मिनट थी, जो आने वालों के लिए तेज़ है। ${l} से ${h} का लक्ष्य रखें और हर वाक्य पर रुकें।`,
      tipExtra: 'कई अतिरिक्त शब्द सुने गए। अं, उं जैसे शब्दों से बचें और वाक्य दोबारा शुरू करते समय शब्द न दोहराएं।', tipGreat: 'बढ़िया। अब स्क्रीन की जगह सामने वाले को देखकर बोलने की कोशिश करें।', tipOk: 'अच्छा काम। एक बार और भरोसे और स्थिर आवाज़ में पढ़ें।',
      errBlocked: 'माइक्रोफोन की अनुमति रुकी हुई है। एड्रेस बार के आइकन से इस साइट को अनुमति दें, फिर जारी रखें दबाएं।', errNoMic: 'माइक्रोफोन नहीं मिला। उसे लगाएं या साउंड सेटिंग देखें, फिर जारी रखें दबाएं।',
      errNet: 'स्पीच सर्विस से जुड़ नहीं पाया। इंटरनेट देखें, फिर जारी रखें दबाएं।', errLang: 'इस ब्राउज़र में इस भाषा की स्पीच रिकग्निशन नहीं है। कृपया Google Chrome इस्तेमाल करें।', errOther: e => `स्पीच रिकग्निशन रुक गई (${e})। जारी रखें दबाएं।`,
      errRepeat: 'माइक्रोफोन बार-बार रुक रहा है। फिर कोशिश के लिए जारी रखें दबाएं।', errStart: 'माइक्रोफोन शुरू नहीं हुआ। कृपया फिर कोशिश करें।', errBrowser: 'यह ब्राउज़र स्पीच रिकग्निशन नहीं चलाता। कृपया कंप्यूटर या Android फोन पर Google Chrome में खोलें।',
      quizTitle: 'फीस क्विज़', quizLead: 'बिना शीट देखे दस छोटे सवाल। अकेले डेस्क संभालने से पहले दस में से दस लाएं।', quizStart: 'क्विज़ शुरू करें', question: 'सवाल', of: '/', right: 'सही', wrong: 'नहीं। सही जवाब है', nextQ: 'अगला सवाल', quizDone: 'क्विज़ पूरा हुआ', quizScore: 'आपका स्कोर', quizRetry: 'नया क्विज़ दें', reviewSheet: 'फीस की सूची देखें',
      qFee: c => `${c} की फीस कितनी है?`, qDur: c => `${c} कितने समय का है?`, qCat: c => `${c} किस समूह में है?`, qDemo: 'फ्री डेमो क्लास किन दिनों होती है?', qHigh: 'शीट में सबसे ज़्यादा फीस किस कोर्स की है?', qFirst: 'हर आने वाले को सबसे पहले क्या करना है?', qFirstA: 'QR कोड स्कैन करना', qFirstB: 'फीस देना', qFirstC: 'बैच में जुड़ना', qFirstD: 'ट्रेनर से मिलना',
      qJob: 'कोई पूछे कि नौकरी की गारंटी है या नहीं, तो आप क्या कहेंगे?', qJobA: 'हम प्लेसमेंट सपोर्ट देते हैं, पर नौकरी का वादा नहीं कर सकते', qJobB: 'हां, नौकरी की गारंटी है', qJobC: 'हां, तीन महीने में मिल जाएगी', qJobD: 'नहीं, हम कोई मदद नहीं करते',
      backHome: 'होम पर जाएं', rs: 'रु.', footer: 'Tinitiate AI फ्रंट डेस्क की आंतरिक ट्रेनिंग।', langLabel: 'भाषा'
    }
  };

  // -------- saved state (per browser). Every access can fail in a private window. --------
  const KEY = 'ramesh-training-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  let store = load();
  store.best = store.best || {};

  const urlLang = new URLSearchParams(location.search).get('lang');
  let lang = LANGS.some(l => l.id === urlLang) ? urlLang : (LANGS.some(l => l.id === store.lang) ? store.lang : 'en');
  let render = () => {};
  let locked = false;

  const t = key => T[lang][key] !== undefined ? T[lang][key] : T.en[key];
  const pick = obj => obj[lang] !== undefined ? obj[lang] : obj.en;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => t('rs') + ' ' + n.toLocaleString('en-IN');

  function getBest(lessonId, l) { return store.best[`${l || lang}:${lessonId}`]; }
  function setBest(lessonId, score) {
    const k = `${lang}:${lessonId}`;
    if (store.best[k] !== undefined && store.best[k] >= score) return;
    store.best[k] = score;
    save(store);
  }
  function setQuiz(score) { if (store.quiz === undefined || score > store.quiz) { store.quiz = score; save(store); } }

  function setLang(next) {
    if (locked || next === lang) return;
    lang = next;
    store.lang = next;
    save(store);
    apply();
  }

  const NAV = [
    ['index.html', 'home', 'navHome'], ['walk-in-desk.html', 'storefront', 'navDesk'], ['courses.html', 'school', 'navCourses'],
    ['questions.html', 'forum', 'navQuestions'], ['practice.html', 'mic', 'navPractice'], ['fee-quiz.html', 'quiz', 'navQuiz']
  ];

  function renderHeader() {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.getElementById('rtHeader').innerHTML = `
      <div class="rt-bar">
        <a class="rt-brand" href="index.html"><img src="assets/img/tinitiate_header-banner-dark.png" alt="Tinitiate AI"><span>${esc(t('brand'))}</span></a>
        <div class="rt-lang" role="group" aria-label="${esc(t('langLabel'))}">
          ${LANGS.map(l => `<button type="button" lang="${l.id}" data-lang="${l.id}" aria-pressed="${l.id === lang}" ${locked ? 'disabled' : ''}>${l.label}</button>`).join('')}
        </div>
      </div>
      <nav class="rt-nav" aria-label="Sections">
        ${NAV.map(([href, icon, key]) => `<a href="${href}"${href === here ? ' aria-current="page"' : ''}><span class="msr">${icon}</span>${esc(t(key))}</a>`).join('')}
      </nav>`;
  }

  function apply() {
    document.documentElement.lang = lang;
    renderHeader();
    document.title = `${t(document.body.dataset.title || 'brand')} | ${t('brand')}`;
    const foot = document.getElementById('rtFooter');
    if (foot) foot.textContent = t('footer');
    render();
  }

  function init(fn) {
    render = fn;
    document.getElementById('rtHeader').addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (b) setLang(b.dataset.lang);
    });
    apply();
  }

  // The coach blocks language changes while the microphone is open
  function lockLanguage(v) {
    if (locked === v) return;
    locked = v;
    renderHeader();
  }

  return { LANGS, READY_SCORE, t, pick, esc, money, init, getBest, setBest, setQuiz, lockLanguage, store: () => store, lang: () => lang, srLang: () => LANGS.find(l => l.id === lang).sr };
})();
