/* =============================================================================
   TRAINING CONTENT
   Fees and durations: "Future-Ready Skills Training Poster.png" (the price sheet).
   Course detail and prerequisites: tinitiateai.com/training/professional-training.
   Courses marked prereq: 'ask' have no page on the website, so their description
   comes from this repo's course material and no prerequisite is stated.

   Scripts are read aloud, so write numbers in words (no digits, no dashes) and
   put any new product name in TERMS in speech-match.js.
   ============================================================================= */
window.RT = (function () {
  'use strict';

  const CATEGORIES = [
    { id: 'ai', icon: 'smart_toy', en: 'AI (Artificial Intelligence)', te: 'AI (కృత్రిమ మేధ)', hi: 'AI (आर्टिफिशियल इंटेलिजेंस)' },
    { id: 'data', icon: 'cloud', en: 'Cloud Data Engineering', te: 'క్లౌడ్ డేటా ఇంజనీరింగ్', hi: 'क्लाउड डेटा इंजीनियरिंग' },
    { id: 'report', icon: 'bar_chart', en: 'Reporting', te: 'రిపోర్టింగ్', hi: 'रिपोर्टिंग' },
    { id: 'full', icon: 'code', en: 'Full Stack', te: 'ఫుల్ స్టాక్', hi: 'फुल स्टैक' }
  ];

  const PREREQ = {
    ask: { en: 'Not published. Ask the counsellor.', te: 'వెబ్‌సైట్‌లో లేదు. కౌన్సెలర్‌ను అడగండి.', hi: 'वेबसाइट पर नहीं है। काउंसलर से पूछें।' },
    sqlpy: { en: 'SQL fundamentals and basic Python', te: 'SQL ప్రాథమికాలు, Python బేసిక్స్', hi: 'SQL की बुनियाद और Python की बेसिक जानकारी' },
    sqlcloud: { en: 'SQL fundamentals, basic Python, cloud awareness helps', te: 'SQL ప్రాథమికాలు, Python బేసిక్స్, క్లౌడ్ అవగాహన ఉంటే మంచిది', hi: 'SQL की बुनियाद, Python की बेसिक जानकारी, क्लाउड की समझ हो तो अच्छा' },
    excel: { en: 'Basic Excel or SQL helps', te: 'Excel లేదా SQL బేసిక్స్ ఉంటే మంచిది', hi: 'Excel या SQL की बेसिक जानकारी हो तो अच्छा' },
    java: { en: 'Basic programming, HTML and CSS basics, daily practice', te: 'ప్రోగ్రామింగ్ బేసిక్స్, HTML, CSS బేసిక్స్, రోజూ ప్రాక్టీస్', hi: 'प्रोग्रामिंग की बेसिक जानकारी, HTML और CSS, रोज़ अभ्यास' },
    web: { en: 'Basic HTML, CSS and JavaScript, regular practice', te: 'HTML, CSS, JavaScript బేసిక్స్, క్రమం తప్పని ప్రాక్టీస్', hi: 'HTML, CSS और JavaScript की बेसिक जानकारी, नियमित अभ्यास' },
    next: { en: 'React fundamentals, basic TypeScript recommended', te: 'React ప్రాథమికాలు, TypeScript బేసిక్స్ ఉంటే మంచిది', hi: 'React की बुनियाद, TypeScript की बेसिक जानकारी हो तो अच्छा' }
  };

  const COURSES = [
    {
      id: 'ai-agentic', cat: 'ai', name: 'AI - Agentic Developer Course', months: 3, fee: 40000, prereq: 'ask',
      tools: ['Python', 'LangGraph', 'CrewAI', 'Claude SDK', 'Gemini SDK'],
      en: 'In the AI Agentic Developer Course, you learn to build AI agents that plan a task, use tools and finish the work by themselves. You build real projects with Python, LangGraph and CrewAI. The course runs for three months and the fee is forty thousand rupees. You can join a free demo class first.',
      te: 'AI ఏజెంటిక్ డెవలపర్ కోర్సులో, పనిని ప్లాన్ చేసి, టూల్స్ వాడి, సొంతంగా పూర్తి చేసే AI ఏజెంట్లను తయారు చేయడం నేర్చుకుంటారు. Python, LangGraph, CrewAI తో నిజమైన ప్రాజెక్టులు చేస్తారు. కోర్సు మూడు నెలలు, ఫీజు నలభై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'AI एजेंटिक डेवलपर कोर्स में आप ऐसे AI एजेंट बनाना सीखते हैं जो काम की योजना बनाते हैं, टूल इस्तेमाल करते हैं और खुद काम पूरा करते हैं। Python, LangGraph और CrewAI से असली प्रोजेक्ट बनाते हैं। कोर्स तीन महीने का है और फीस चालीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'fde', cat: 'ai', name: 'Forward Deployment Engineer Course', months: 3, fee: 40000, prereq: 'ask',
      tools: ['Enterprise AI', 'Integration', 'Client Solutions', 'Field Delivery'],
      en: 'A Forward Deployment Engineer works directly with client companies and puts AI solutions into real use. In this course, you learn to connect AI products with company systems and deliver them into production. The course runs for three months and the fee is forty thousand rupees. You can join a free demo class first.',
      te: 'ఫార్వర్డ్ డిప్లాయ్‌మెంట్ ఇంజనీర్ నేరుగా క్లయింట్ కంపెనీలతో పనిచేసి, AI సొల్యూషన్స్‌ను నిజంగా వాడుకలోకి తెస్తారు. ఈ కోర్సులో AI ప్రొడక్ట్స్‌ను కంపెనీ సిస్టమ్స్‌తో కలిపి, ప్రొడక్షన్‌లోకి తీసుకెళ్లడం నేర్చుకుంటారు. కోర్సు మూడు నెలలు, ఫీజు నలభై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'फॉरवर्ड डिप्लॉयमेंट इंजीनियर सीधे क्लाइंट कंपनियों के साथ काम करता है और AI सॉल्यूशन को असली इस्तेमाल में लाता है। इस कोर्स में आप AI प्रोडक्ट को कंपनी के सिस्टम से जोड़ना और प्रोडक्शन तक पहुंचाना सीखते हैं। कोर्स तीन महीने का है और फीस चालीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'aws-bedrock', cat: 'ai', name: 'AWS Bedrock - AI Agentic Developer Course', months: 3, fee: 40000, prereq: 'ask',
      tools: ['AWS Bedrock', 'Python', 'AWS Strands', 'AI agents'],
      en: 'In the AWS Bedrock AI Agentic Developer Course, you learn to build AI agents on the Amazon cloud. Bedrock gives you ready AI models, so you focus on building useful applications for companies. The course runs for three months and the fee is forty thousand rupees. You can join a free demo class first.',
      te: 'AWS Bedrock AI ఏజెంటిక్ డెవలపర్ కోర్సులో, అమెజాన్ క్లౌడ్ మీద AI ఏజెంట్లను తయారు చేయడం నేర్చుకుంటారు. Bedrock లో AI మోడల్స్ సిద్ధంగా ఉంటాయి, కాబట్టి కంపెనీలకు ఉపయోగపడే అప్లికేషన్లు తయారు చేయడం మీద దృష్టి పెడతారు. కోర్సు మూడు నెలలు, ఫీజు నలభై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'AWS Bedrock AI एजेंटिक डेवलपर कोर्स में आप अमेज़न क्लाउड पर AI एजेंट बनाना सीखते हैं। Bedrock में AI मॉडल तैयार मिलते हैं, इसलिए आप कंपनियों के काम की एप्लिकेशन बनाने पर ध्यान देते हैं। कोर्स तीन महीने का है और फीस चालीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'azure-foundry', cat: 'ai', name: 'Azure Foundry - AI Agentic Developer Course', months: 3, fee: 40000, prereq: 'ask',
      tools: ['Azure AI Foundry', 'Python', 'AI agents'],
      en: 'In the Azure Foundry AI Agentic Developer Course, you learn to build AI agents on the Microsoft cloud. Many large companies use Azure, so this skill suits people who want to work on enterprise projects. The course runs for three months and the fee is forty thousand rupees. You can join a free demo class first.',
      te: 'Azure Foundry AI ఏజెంటిక్ డెవలపర్ కోర్సులో, మైక్రోసాఫ్ట్ క్లౌడ్ మీద AI ఏజెంట్లను తయారు చేయడం నేర్చుకుంటారు. చాలా పెద్ద కంపెనీలు Azure వాడుతున్నాయి, కాబట్టి పెద్ద కంపెనీ ప్రాజెక్టుల్లో పని చేయాలనుకునే వారికి ఇది సరిపోతుంది. కోర్సు మూడు నెలలు, ఫీజు నలభై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'Azure Foundry AI एजेंटिक डेवलपर कोर्स में आप माइक्रोसॉफ्ट क्लाउड पर AI एजेंट बनाना सीखते हैं। बहुत सी बड़ी कंपनियां Azure इस्तेमाल करती हैं, इसलिए यह कोर्स बड़ी कंपनियों के प्रोजेक्ट पर काम करने वालों के लिए अच्छा है। कोर्स तीन महीने का है और फीस चालीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'aws-de', cat: 'data', name: 'AWS Data Engineer Course', months: 3, fee: 30000, prereq: 'sqlcloud',
      tools: ['S3', 'Glue', 'Athena', 'Redshift', 'Kinesis', 'Airflow'],
      en: 'A Data Engineer builds pipelines that collect company data, clean it and keep it ready for reports. In the AWS Data Engineer Course, you do this on Amazon cloud with Glue, Athena and Redshift. You should know basic SQL and Python. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'డేటా ఇంజనీర్ కంపెనీ డేటాను సేకరించి, శుభ్రం చేసి, రిపోర్టులకు సిద్ధంగా ఉంచే పైప్‌లైన్లు తయారు చేస్తారు. AWS డేటా ఇంజనీర్ కోర్సులో ఈ పనిని అమెజాన్ క్లౌడ్ మీద Glue, Athena, Redshift తో నేర్చుకుంటారు. SQL, Python బేసిక్స్ తెలిసి ఉండాలి. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'डेटा इंजीनियर ऐसी पाइपलाइन बनाता है जो कंपनी का डेटा इकट्ठा करती है, साफ करती है और रिपोर्ट के लिए तैयार रखती है। AWS डेटा इंजीनियर कोर्स में आप यह काम अमेज़न क्लाउड पर Glue, Athena और Redshift से सीखते हैं। SQL और Python की बेसिक जानकारी होनी चाहिए। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'snowflake-de', cat: 'data', name: 'Snowflake Data Engineer Course', months: 3, fee: 30000, prereq: 'sqlpy',
      tools: ['Snowflake SQL', 'Snowpipe', 'Snowpark', 'Streams', 'Tasks'],
      en: 'Snowflake is a popular cloud data warehouse where companies store and analyse large data. In the Snowflake Data Engineer Course, you learn to load data, transform it and automate the work with Snowpipe and Snowpark. You should know basic SQL. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'Snowflake అనేది కంపెనీలు పెద్ద డేటాను దాచి విశ్లేషించే ప్రముఖ క్లౌడ్ డేటా వేర్‌హౌస్. Snowflake డేటా ఇంజనీర్ కోర్సులో డేటాను లోడ్ చేయడం, మార్చడం, Snowpipe మరియు Snowpark తో పనిని ఆటోమేట్ చేయడం నేర్చుకుంటారు. SQL బేసిక్స్ తెలిసి ఉండాలి. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'Snowflake एक लोकप्रिय क्लाउड डेटा वेयरहाउस है जहां कंपनियां बड़ा डेटा रखती और समझती हैं। Snowflake डेटा इंजीनियर कोर्स में आप डेटा लोड करना, बदलना और Snowpipe और Snowpark से काम को ऑटोमेट करना सीखते हैं। SQL की बेसिक जानकारी होनी चाहिए। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'databricks-de', cat: 'data', name: 'Databricks Data Engineer Course', months: 3, fee: 30000, prereq: 'ask',
      tools: ['Databricks', 'Apache Spark', 'Delta Lake', 'Lakehouse'],
      en: 'Databricks is a platform where companies process very large data with Apache Spark. In the Databricks Data Engineer Course, you learn to build lakehouse pipelines with Spark and Delta Lake on real projects. The course runs for three months and the fee is thirty thousand rupees. You can join a free demo class first.',
      te: 'Databricks అనేది కంపెనీలు Apache Spark తో చాలా పెద్ద డేటాను ప్రాసెస్ చేసే ప్లాట్‌ఫామ్. Databricks డేటా ఇంజనీర్ కోర్సులో Spark మరియు Delta Lake తో లేక్‌హౌస్ పైప్‌లైన్లు తయారు చేయడం నిజమైన ప్రాజెక్టులతో నేర్చుకుంటారు. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'Databricks एक प्लेटफॉर्म है जहां कंपनियां Apache Spark से बहुत बड़ा डेटा प्रोसेस करती हैं। Databricks डेटा इंजीनियर कोर्स में आप Spark और Delta Lake से लेकहाउस पाइपलाइन बनाना असली प्रोजेक्ट पर सीखते हैं। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'azure-de', cat: 'data', name: 'Azure Data Engineer Course', months: 3, fee: 30000, prereq: 'sqlpy',
      tools: ['ADLS Gen2', 'Azure Data Factory', 'Databricks', 'Synapse'],
      en: 'In the Azure Data Engineer Course, you build data solutions on the Microsoft cloud with Data Factory, Databricks and Synapse. You learn to bring in data, transform it and make it ready for reports. You should know basic SQL and Python. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'Azure డేటా ఇంజనీర్ కోర్సులో మైక్రోసాఫ్ట్ క్లౌడ్ మీద Data Factory, Databricks, Synapse తో డేటా సొల్యూషన్స్ తయారు చేస్తారు. డేటాను తీసుకురావడం, మార్చడం, రిపోర్టులకు సిద్ధం చేయడం నేర్చుకుంటారు. SQL, Python బేసిక్స్ తెలిసి ఉండాలి. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'Azure डेटा इंजीनियर कोर्स में आप माइक्रोसॉफ्ट क्लाउड पर Data Factory, Databricks और Synapse से डेटा सॉल्यूशन बनाते हैं। आप डेटा लाना, बदलना और रिपोर्ट के लिए तैयार करना सीखते हैं। SQL और Python की बेसिक जानकारी होनी चाहिए। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'pyspark', cat: 'data', name: 'PySpark Developer Course', months: 3, fee: 30000, prereq: 'ask',
      tools: ['Python', 'Apache Spark', 'Streaming', 'Performance tuning'],
      en: 'PySpark lets you use Python to process very large data across many computers. In the PySpark Developer Course, you learn how Spark works, how to write fast data jobs and how to fix slow ones. The course runs for three months and the fee is thirty thousand rupees. You can join a free demo class first.',
      te: 'PySpark తో Python వాడి చాలా కంప్యూటర్ల మీద పెద్ద డేటాను ప్రాసెస్ చేయవచ్చు. PySpark డెవలపర్ కోర్సులో Spark ఎలా పనిచేస్తుందో, వేగమైన డేటా జాబ్స్ ఎలా రాయాలో, నెమ్మదిగా ఉన్నవాటిని ఎలా సరిచేయాలో నేర్చుకుంటారు. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు. ముందుగా ఉచిత డెమో క్లాస్ చూడవచ్చు.',
      hi: 'PySpark से आप Python का इस्तेमाल करके कई कंप्यूटरों पर बहुत बड़ा डेटा प्रोसेस कर सकते हैं। PySpark डेवलपर कोर्स में आप सीखते हैं कि Spark कैसे काम करता है, तेज़ डेटा जॉब कैसे लिखें और धीमी जॉब कैसे ठीक करें। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है। पहले आप फ्री डेमो क्लास देख सकते हैं।'
    },
    {
      id: 'governance', cat: 'data', name: 'Data Governance Engineer Course', months: 3, fee: 50000, prereq: 'ask',
      tools: ['Microsoft Purview', 'Unity Catalog', 'Apache Atlas', 'Data lineage'],
      en: 'A Data Governance Engineer makes sure company data is correct, safe and easy to find. In this course, you learn data quality, data lineage and tools like Purview. This is our highest fee course on this sheet. The course runs for three months and the fee is fifty thousand rupees.',
      te: 'డేటా గవర్నెన్స్ ఇంజనీర్ కంపెనీ డేటా సరిగ్గా, సురక్షితంగా, సులభంగా దొరికేలా చూస్తారు. ఈ కోర్సులో డేటా క్వాలిటీ, డేటా లినియేజ్, Purview లాంటి టూల్స్ నేర్చుకుంటారు. ఈ లిస్టులో ఇదే ఎక్కువ ఫీజు ఉన్న కోర్సు. కోర్సు మూడు నెలలు, ఫీజు యాభై వేల రూపాయలు.',
      hi: 'डेटा गवर्नेंस इंजीनियर यह देखता है कि कंपनी का डेटा सही हो, सुरक्षित हो और आसानी से मिल जाए। इस कोर्स में आप डेटा क्वालिटी, डेटा लिनिएज और Purview जैसे टूल सीखते हैं। इस लिस्ट में यह सबसे ज़्यादा फीस वाला कोर्स है। कोर्स तीन महीने का है और फीस पचास हज़ार रुपये है।'
    },
    {
      id: 'powerbi', cat: 'report', name: 'PowerBI Developer Course', months: 3, fee: 30000, prereq: 'excel',
      tools: ['Power BI', 'Data modeling', 'Report design', 'Business insights'],
      en: 'Power BI turns raw company data into clear dashboards that managers use to make decisions. In the PowerBI Developer Course, you learn data modeling and report design. This is a good start for people who work with Excel. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'Power BI కంపెనీ డేటాను మేనేజర్లు నిర్ణయాలు తీసుకోవడానికి వాడే స్పష్టమైన డాష్‌బోర్డులుగా మారుస్తుంది. Power BI డెవలపర్ కోర్సులో డేటా మోడలింగ్, రిపోర్ట్ డిజైన్ నేర్చుకుంటారు. Excel తో పనిచేసే వారికి ఇది మంచి ప్రారంభం. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'Power BI कंपनी के डेटा को ऐसे साफ डैशबोर्ड में बदलता है जिनसे मैनेजर फैसले लेते हैं। Power BI डेवलपर कोर्स में आप डेटा मॉडलिंग और रिपोर्ट डिज़ाइन सीखते हैं। Excel पर काम करने वालों के लिए यह अच्छी शुरुआत है। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'java-fs', cat: 'full', name: 'Full Stack Java Developer Course', months: 3, fee: 30000, prereq: 'java',
      tools: ['Core Java', 'Spring Boot', 'React', 'SQL', 'CI/CD'],
      en: 'A Full Stack Developer builds both the screens that users see and the system behind them. In the Full Stack Java Developer Course, you build complete applications with Java, Spring Boot and React. You should know basic programming. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'ఫుల్ స్టాక్ డెవలపర్ వాడుకదారులు చూసే స్క్రీన్లను, వాటి వెనుక ఉండే సిస్టమ్‌ను రెండింటినీ తయారు చేస్తారు. ఫుల్ స్టాక్ జావా డెవలపర్ కోర్సులో Java, Spring Boot, React తో పూర్తి అప్లికేషన్లు తయారు చేస్తారు. ప్రోగ్రామింగ్ బేసిక్స్ తెలిసి ఉండాలి. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'फुल स्टैक डेवलपर यूज़र को दिखने वाली स्क्रीन और उनके पीछे का सिस्टम, दोनों बनाता है। फुल स्टैक जावा डेवलपर कोर्स में आप Java, Spring Boot और React से पूरी एप्लिकेशन बनाते हैं। प्रोग्रामिंग की बेसिक जानकारी होनी चाहिए। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'angular-fs', cat: 'full', name: 'Full Stack C# Angular Developer Course', months: 3, fee: 30000, prereq: 'web',
      tools: ['Angular', '.NET', 'C#', 'ASP.NET Core Web API', 'SQL Server'],
      en: 'In the Full Stack C Sharp Angular Developer Course, you build complete applications with Angular for the screens and C Sharp with .NET for the system behind them. You also work with SQL Server. You should know basic HTML, CSS and JavaScript. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'ఫుల్ స్టాక్ C Sharp Angular డెవలపర్ కోర్సులో, స్క్రీన్ల కోసం Angular, వెనుక సిస్టమ్ కోసం C Sharp మరియు .NET వాడి పూర్తి అప్లికేషన్లు తయారు చేస్తారు. SQL Server తో కూడా పనిచేస్తారు. HTML, CSS, JavaScript బేసిక్స్ తెలిసి ఉండాలి. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'फुल स्टैक C Sharp Angular डेवलपर कोर्स में आप स्क्रीन के लिए Angular और पीछे के सिस्टम के लिए C Sharp और .NET से पूरी एप्लिकेशन बनाते हैं। आप SQL Server पर भी काम करते हैं। HTML, CSS और JavaScript की बेसिक जानकारी होनी चाहिए। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'node-fs', cat: 'full', name: 'Full Stack NodeJS Next JS Developer Course', months: 3, fee: 30000, prereq: 'ask',
      tools: ['Node.js', 'React', 'Next.js', 'TypeScript'],
      en: 'In the Full Stack NodeJS Next JS Developer Course, you use one language, JavaScript, for both the screens and the system behind them. You build fast websites with React and Next JS, and the server side with NodeJS. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'ఫుల్ స్టాక్ NodeJS Next JS డెవలపర్ కోర్సులో, స్క్రీన్లకు, వెనుక సిస్టమ్‌కు ఒకే భాష JavaScript వాడతారు. React మరియు Next JS తో వేగమైన వెబ్‌సైట్లు, NodeJS తో సర్వర్ భాగం తయారు చేస్తారు. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'फुल स्टैक NodeJS Next JS डेवलपर कोर्स में आप स्क्रीन और पीछे के सिस्टम, दोनों के लिए एक ही भाषा JavaScript इस्तेमाल करते हैं। React और Next JS से तेज़ वेबसाइट बनाते हैं और NodeJS से सर्वर का हिस्सा बनाते हैं। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    },
    {
      id: 'python-fs', cat: 'full', name: 'Python FastAPI Developer Course', months: 3, fee: 30000, prereq: 'ask',
      tools: ['Python', 'FastAPI', 'REST APIs', 'SQL'],
      en: 'Python is one of the easiest and most used programming languages. In the Python FastAPI Developer Course, you learn to build the fast APIs that connect mobile apps and websites to data. AI work also uses Python, so this is a useful skill. The course runs for three months and the fee is thirty thousand rupees.',
      te: 'Python చాలా సులభమైన, ఎక్కువగా వాడే ప్రోగ్రామింగ్ భాష. Python FastAPI డెవలపర్ కోర్సులో మొబైల్ యాప్స్, వెబ్‌సైట్లను డేటాతో కలిపే వేగమైన API లు తయారు చేయడం నేర్చుకుంటారు. AI పనిలో కూడా Python వాడతారు, కాబట్టి ఇది చాలా ఉపయోగకరం. కోర్సు మూడు నెలలు, ఫీజు ముప్పై వేల రూపాయలు.',
      hi: 'Python सबसे आसान और सबसे ज़्यादा इस्तेमाल होने वाली प्रोग्रामिंग भाषाओं में से एक है। Python FastAPI डेवलपर कोर्स में आप ऐसे तेज़ API बनाना सीखते हैं जो मोबाइल ऐप और वेबसाइट को डेटा से जोड़ते हैं। AI के काम में भी Python चलता है, इसलिए यह बहुत काम की स्किल है। कोर्स तीन महीने का है और फीस तीस हज़ार रुपये है।'
    }
  ];

  // Walk-in desk, in the order a visit happens
  const DESK = [
    {
      id: 'greet', icon: 'waving_hand',
      title: { en: 'Greet the visitor', te: 'స్వాగతం చెప్పండి', hi: 'स्वागत करें' },
      do: { en: 'Stand up, smile and offer a seat.', te: 'లేచి నిలబడి, నవ్వుతూ కూర్చోమని చెప్పండి.', hi: 'खड़े होकर मुस्कुराएं और बैठने को कहें।' },
      en: 'Good morning and welcome to Tinitiate AI. My name is Ramesh. Please have a seat. How can I help you today?',
      te: 'నమస్కారం, Tinitiate AI కి స్వాగతం. నా పేరు రమేష్. దయచేసి కూర్చోండి. ఈ రోజు మీకు ఎలా సహాయం చేయగలను?',
      hi: 'नमस्ते, Tinitiate AI में आपका स्वागत है। मेरा नाम रमेश है। कृपया बैठिए। आज हम आपकी क्या मदद कर सकते हैं?'
    },
    {
      id: 'qr', icon: 'qr_code_scanner',
      title: { en: 'Ask them to scan the QR code', te: 'QR కోడ్ స్కాన్ చేయమనండి', hi: 'QR कोड स्कैन कराएं' },
      do: { en: 'Do this for every walk-in, before anything else.', te: 'వచ్చిన ప్రతి ఒక్కరితో, ముందుగా ఇది చేయించండి.', hi: 'हर आने वाले से, सबसे पहले यह कराएं।' },
      en: 'Please scan this QR code with your phone. It takes less than a minute, and it helps us share the right details with you.',
      te: 'దయచేసి మీ ఫోన్‌తో ఈ QR కోడ్ స్కాన్ చేయండి. ఒక నిమిషం కూడా పట్టదు, మీకు సరైన వివరాలు పంపడానికి ఇది ఉపయోగపడుతుంది.',
      hi: 'कृपया अपने फोन से यह QR कोड स्कैन कीजिए। इसमें एक मिनट भी नहीं लगता, और इससे हम आपको सही जानकारी भेज पाते हैं।'
    },
    {
      id: 'register', icon: 'edit_note',
      title: { en: 'Fill in the register', te: 'రిజిస్టర్‌లో రాయండి', hi: 'रजिस्टर में लिखें' },
      do: { en: 'Write every visitor in the register, even if they scanned the QR code.', te: 'QR స్కాన్ చేసినా, ప్రతి ఒక్కరి వివరాలు రిజిస్టర్‌లో రాయండి.', hi: 'QR स्कैन करने पर भी हर आने वाले को रजिस्टर में लिखें।' },
      en: 'May I please write your name, your phone number and the course you are interested in, in our register? We use it only to stay in touch with you.',
      te: 'దయచేసి మీ పేరు, ఫోన్ నంబర్, మీకు ఆసక్తి ఉన్న కోర్సు మా రిజిస్టర్‌లో రాసుకోవచ్చా? మిమ్మల్ని సంప్రదించడానికి మాత్రమే వాడతాము.',
      hi: 'क्या हम आपका नाम, फोन नंबर और आपकी पसंद का कोर्स अपने रजिस्टर में लिख सकते हैं? हम इसे सिर्फ आपसे संपर्क करने के लिए इस्तेमाल करते हैं।'
    },
    {
      id: 'ask', icon: 'psychology_alt',
      title: { en: 'Ask about their goal', te: 'వారి లక్ష్యం అడగండి', hi: 'उनका लक्ष्य पूछें' },
      do: { en: 'Listen first. Do not talk about fees yet.', te: 'ముందు వినండి. ఇంకా ఫీజు గురించి మాట్లాడకండి.', hi: 'पहले सुनें। अभी फीस की बात न करें।' },
      en: 'Are you a student, a fresher or a working professional? What did you study, and what kind of job do you want? This helps me suggest the right course for you.',
      te: 'మీరు విద్యార్థా, ఫ్రెషరా, లేక ఉద్యోగం చేస్తున్నారా? మీరు ఏం చదివారు, ఎలాంటి ఉద్యోగం కావాలనుకుంటున్నారు? దీనివల్ల మీకు సరైన కోర్సు సూచించగలను.',
      hi: 'आप स्टूडेंट हैं, फ्रेशर हैं या नौकरी कर रहे हैं? आपने क्या पढ़ाई की है और आप कैसी नौकरी चाहते हैं? इससे हम आपके लिए सही कोर्स बता पाएंगे।'
    },
    {
      id: 'suggest', icon: 'recommend',
      title: { en: 'Suggest a course', te: 'కోర్సు సూచించండి', hi: 'कोर्स सुझाएं' },
      do: { en: 'Show the price sheet. Use the course finder below.', te: 'ప్రైస్ షీట్ చూపించండి. కింద ఉన్న కోర్స్ ఫైండర్ వాడండి.', hi: 'प्राइस शीट दिखाएं। नीचे दिया कोर्स फाइंडर इस्तेमाल करें।' },
      en: 'Based on what you told me, this course looks right for you. Here is our price sheet with the duration and the fee. Our counsellor can explain the details further.',
      te: 'మీరు చెప్పిన దాన్ని బట్టి, ఈ కోర్సు మీకు సరిపోతుంది. ఇదిగో కోర్సు వ్యవధి, ఫీజు ఉన్న మా ప్రైస్ షీట్. మరిన్ని వివరాలు మా కౌన్సెలర్ చెబుతారు.',
      hi: 'आपने जो बताया, उसके हिसाब से यह कोर्स आपके लिए सही है। यह हमारी प्राइस शीट है, इसमें अवधि और फीस लिखी है। बाकी जानकारी हमारे काउंसलर देंगे।'
    },
    {
      id: 'demo', icon: 'videocam',
      title: { en: 'Invite them to a free demo', te: 'ఉచిత డెమోకు ఆహ్వానించండి', hi: 'फ्री डेमो के लिए बुलाएं' },
      do: { en: 'Always end the course talk with the demo. It is free and there is no risk for them.', te: 'కోర్సు మాటలు ఎప్పుడూ డెమోతో ముగించండి. ఇది ఉచితం, వారికి ఏ నష్టమూ లేదు.', hi: 'कोर्स की बात हमेशा डेमो पर खत्म करें। यह फ्री है, उनका कोई नुकसान नहीं।' },
      en: 'We have free demo classes every Monday, Wednesday and Saturday, live on Zoom and YouTube. Recordings are also available, and seats are limited. Please attend a demo first and then decide.',
      te: 'ప్రతి సోమవారం, బుధవారం, శనివారం ఉచిత డెమో క్లాసులు Zoom మరియు YouTube లో లైవ్‌గా జరుగుతాయి. రికార్డింగులు కూడా ఉన్నాయి, సీట్లు పరిమితం. ముందు డెమో చూసి, తర్వాత నిర్ణయం తీసుకోండి.',
      hi: 'हर सोमवार, बुधवार और शनिवार को फ्री डेमो क्लास Zoom और YouTube पर लाइव होती है। रिकॉर्डिंग भी मिलती है और सीटें सीमित हैं। पहले डेमो देखिए, फिर फैसला कीजिए।'
    },
    {
      id: 'bye', icon: 'handshake',
      title: { en: 'Thank them and say goodbye', te: 'ధన్యవాదాలు చెప్పి పంపండి', hi: 'धन्यवाद कहकर विदा करें' },
      do: { en: 'Give them the price sheet to take home.', te: 'ప్రైస్ షీట్ ఇంటికి తీసుకెళ్లమని ఇవ్వండి.', hi: 'प्राइस शीट घर ले जाने के लिए दें।' },
      en: 'Thank you for visiting Tinitiate AI. You can call us or send a WhatsApp message any time. Our number is on this sheet. Have a nice day.',
      te: 'Tinitiate AI కి వచ్చినందుకు ధన్యవాదాలు. మీరు ఎప్పుడైనా మాకు ఫోన్ చేయవచ్చు లేదా WhatsApp మెసేజ్ పంపవచ్చు. మా నంబర్ ఈ షీట్‌లో ఉంది. మీ రోజు బాగుండాలి.',
      hi: 'Tinitiate AI आने के लिए धन्यवाद। आप कभी भी हमें फोन कर सकते हैं या WhatsApp मैसेज भेज सकते हैं। हमारा नंबर इस शीट पर है। आपका दिन शुभ हो।'
    }
  ];

  // Who should hear about which course
  const FINDER = [
    {
      who: { en: 'Student or fresher who wants to be a developer', te: 'డెవలపర్ కావాలనుకునే విద్యార్థి లేదా ఫ్రెషర్', hi: 'डेवलपर बनना चाहने वाला स्टूडेंट या फ्रेशर' },
      courses: ['java-fs', 'python-fs', 'node-fs']
    },
    {
      who: { en: 'Works with Excel or reports, not a programmer', te: 'Excel లేదా రిపోర్టులతో పనిచేసేవారు, ప్రోగ్రామర్ కాదు', hi: 'Excel या रिपोर्ट पर काम करते हैं, प्रोग्रामर नहीं हैं' },
      courses: ['powerbi']
    },
    {
      who: { en: 'Already knows SQL and some Python', te: 'SQL, కొంత Python ఇప్పటికే తెలిసినవారు', hi: 'SQL और थोड़ा Python पहले से जानते हैं' },
      courses: ['aws-de', 'azure-de', 'snowflake-de']
    },
    {
      who: { en: 'Working data engineer who wants to grow', te: 'ఇప్పటికే డేటా ఇంజనీర్, ఇంకా ఎదగాలనుకునేవారు', hi: 'डेटा इंजीनियर हैं और आगे बढ़ना चाहते हैं' },
      courses: ['databricks-de', 'pyspark', 'governance']
    },
    {
      who: { en: 'Working developer who wants to move into AI', te: 'AI లోకి మారాలనుకునే డెవలపర్', hi: 'AI में जाना चाहने वाला डेवलपर' },
      courses: ['ai-agentic', 'aws-bedrock', 'azure-foundry', 'fde']
    },
    {
      who: { en: 'Not sure, or from a non-IT background', te: 'ఏది కావాలో తెలియదు, లేదా IT నేపథ్యం లేదు', hi: 'तय नहीं है, या IT बैकग्राउंड नहीं है' },
      courses: [], note: { en: 'Do not guess. Book a free demo and bring in the counsellor.', te: 'ఊహించి చెప్పకండి. ఉచిత డెమో బుక్ చేసి, కౌన్సెలర్‌తో మాట్లాడించండి.', hi: 'अंदाज़ा न लगाएं। फ्री डेमो बुक करें और काउंसलर से बात कराएं।' }
    }
  ];

  const QUESTIONS = [
    {
      id: 'q-fees', icon: 'payments',
      q: { en: 'What are your fees?', te: 'మీ ఫీజులు ఎంత?', hi: 'आपकी फीस कितनी है?' },
      en: 'Most data engineering, reporting and full stack courses are thirty thousand rupees. AI courses are forty thousand rupees. The Data Governance Engineer Course is fifty thousand rupees. All the courses on this sheet run for three months.',
      te: 'ఎక్కువ డేటా ఇంజనీరింగ్, రిపోర్టింగ్, ఫుల్ స్టాక్ కోర్సులు ముప్పై వేల రూపాయలు. AI కోర్సులు నలభై వేల రూపాయలు. డేటా గవర్నెన్స్ ఇంజనీర్ కోర్సు యాభై వేల రూపాయలు. ఈ షీట్‌లోని అన్ని కోర్సులు మూడు నెలలు.',
      hi: 'ज़्यादातर डेटा इंजीनियरिंग, रिपोर्टिंग और फुल स्टैक कोर्स तीस हज़ार रुपये के हैं। AI कोर्स चालीस हज़ार रुपये के हैं। डेटा गवर्नेंस इंजीनियर कोर्स पचास हज़ार रुपये का है। इस शीट के सभी कोर्स तीन महीने के हैं।'
    },
    {
      id: 'q-tax', icon: 'receipt_long',
      q: { en: 'Is tax included in the fee?', te: 'ఫీజులో టాక్స్ కలిసి ఉందా?', hi: 'क्या फीस में टैक्स शामिल है?' },
      en: 'The fee on this sheet does not include applicable taxes. Our counsellor will confirm the final amount with you before you join.',
      te: 'ఈ షీట్‌లోని ఫీజులో వర్తించే టాక్స్ కలిసి లేదు. మీరు చేరే ముందు మా కౌన్సెలర్ చివరి మొత్తం చెబుతారు.',
      hi: 'इस शीट की फीस में लागू टैक्स शामिल नहीं है। जुड़ने से पहले हमारे काउंसलर आपको पूरी रकम बता देंगे।'
    },
    {
      id: 'q-pay', icon: 'credit_card',
      q: { en: 'Can I pay in parts?', te: 'విడతలుగా కట్టవచ్చా?', hi: 'क्या किस्तों में दे सकते हैं?' },
      en: 'The payment schedule is confirmed with you before you join, so please speak to our counsellor. We accept cards, UPI and net banking.',
      te: 'చెల్లింపు విధానం మీరు చేరే ముందు ఖరారు చేస్తాము, కాబట్టి దయచేసి మా కౌన్సెలర్‌తో మాట్లాడండి. కార్డు, UPI, నెట్ బ్యాంకింగ్ తీసుకుంటాము.',
      hi: 'भुगतान का तरीका जुड़ने से पहले आपके साथ तय होता है, इसलिए कृपया हमारे काउंसलर से बात कीजिए। हम कार्ड, UPI और नेट बैंकिंग लेते हैं।'
    },
    {
      id: 'q-online', icon: 'cast_for_education',
      q: { en: 'Are classes online or in the office?', te: 'క్లాసులు ఆన్‌లైనా, ఆఫీసులోనా?', hi: 'क्लास ऑनलाइन है या ऑफिस में?' },
      en: 'Classes are live and online with a trainer, on Zoom and YouTube. You also get recordings and doubt support.',
      te: 'క్లాసులు ట్రైనర్‌తో లైవ్‌గా ఆన్‌లైన్‌లో, Zoom మరియు YouTube లో జరుగుతాయి. రికార్డింగులు, డౌట్ సపోర్ట్ కూడా ఉంటాయి.',
      hi: 'क्लास ट्रेनर के साथ लाइव और ऑनलाइन होती है, Zoom और YouTube पर। रिकॉर्डिंग और डाउट सपोर्ट भी मिलता है।'
    },
    {
      id: 'q-miss', icon: 'event_busy',
      q: { en: 'What if I miss a class?', te: 'క్లాస్ మిస్ అయితే ఎలా?', hi: 'क्लास छूट जाए तो क्या होगा?' },
      en: 'Do not worry. Recordings are available, so you can watch the class later and ask your doubts.',
      te: 'కంగారు పడకండి. రికార్డింగులు ఉంటాయి, కాబట్టి తర్వాత క్లాస్ చూసి మీ డౌట్లు అడగవచ్చు.',
      hi: 'चिंता मत कीजिए। रिकॉर्डिंग मिलती है, इसलिए आप बाद में क्लास देखकर अपने डाउट पूछ सकते हैं।'
    },
    {
      id: 'q-nonit', icon: 'school',
      q: { en: 'I am not from IT. Can I join?', te: 'నాది IT కాదు. నేను చేరవచ్చా?', hi: 'मैं IT से नहीं हूं। क्या यह कोर्स मेरे लिए है?' },
      en: 'Our learning paths go from beginner to advanced, but some courses need basics like SQL or Python. Please attend a free demo and speak to our counsellor, who will guide you to the right course.',
      te: 'మా కోర్సులు బిగినర్ నుంచి అడ్వాన్స్‌డ్ వరకు ఉంటాయి, కానీ కొన్నింటికి SQL లేదా Python బేసిక్స్ అవసరం. దయచేసి ఉచిత డెమో చూసి మా కౌన్సెలర్‌తో మాట్లాడండి, వారు సరైన కోర్సు చెబుతారు.',
      hi: 'हमारे कोर्स बिगिनर से एडवांस तक होते हैं, लेकिन कुछ के लिए SQL या Python की बेसिक जानकारी चाहिए। कृपया फ्री डेमो देखिए और हमारे काउंसलर से बात कीजिए, वे सही कोर्स बताएंगे।'
    },
    {
      id: 'q-job', icon: 'work',
      q: { en: 'Will I get a job after this?', te: 'దీని తర్వాత ఉద్యోగం వస్తుందా?', hi: 'इसके बाद नौकरी मिलेगी?' },
      en: 'We give career guidance and placement support, with resume guidance and interview preparation. You also build real projects for your portfolio. We cannot promise a job, because it depends on your practice and your interviews.',
      te: 'మేము కెరీర్ గైడెన్స్, ప్లేస్‌మెంట్ సపోర్ట్, రెజ్యూమె గైడెన్స్, ఇంటర్వ్యూ ప్రిపరేషన్ ఇస్తాము. మీ పోర్ట్‌ఫోలియో కోసం నిజమైన ప్రాజెక్టులు కూడా చేస్తారు. ఉద్యోగం వస్తుందని మాత్రం హామీ ఇవ్వలేము, అది మీ ప్రాక్టీస్, ఇంటర్వ్యూల మీద ఆధారపడి ఉంటుంది.',
      hi: 'हम करियर गाइडेंस और प्लेसमेंट सपोर्ट देते हैं, साथ में रिज्यूमे गाइडेंस और इंटरव्यू की तैयारी भी। आप अपने पोर्टफोलियो के लिए असली प्रोजेक्ट भी बनाते हैं। नौकरी की गारंटी हम नहीं दे सकते, क्योंकि यह आपकी प्रैक्टिस और इंटरव्यू पर निर्भर करता है।'
    },
    {
      id: 'q-why', icon: 'verified',
      q: { en: 'Why should I choose Tinitiate AI?', te: 'Tinitiate AI ఎందుకు ఎంచుకోవాలి?', hi: 'मैं Tinitiate AI क्यों चुनूं?' },
      en: 'We teach the latest technologies used in real companies, and you learn from experienced industry trainers. You build real projects, you get career support, and you have live classes, recordings and doubt support.',
      te: 'నిజమైన కంపెనీలు వాడే తాజా టెక్నాలజీలు నేర్పిస్తాము, అనుభవం ఉన్న ఇండస్ట్రీ ట్రైనర్ల దగ్గర నేర్చుకుంటారు. నిజమైన ప్రాజెక్టులు చేస్తారు, కెరీర్ సపోర్ట్ ఉంటుంది, లైవ్ క్లాసులు, రికార్డింగులు, డౌట్ సపోర్ట్ కూడా ఉంటాయి.',
      hi: 'हम असली कंपनियों में इस्तेमाल होने वाली नई टेक्नोलॉजी सिखाते हैं और आप अनुभवी इंडस्ट्री ट्रेनर से सीखते हैं। आप असली प्रोजेक्ट बनाते हैं, करियर सपोर्ट मिलता है, और लाइव क्लास, रिकॉर्डिंग और डाउट सपोर्ट भी मिलता है।'
    },
    {
      id: 'q-other', icon: 'travel_explore',
      q: { en: 'Do you teach React or GCP?', te: 'React లేదా GCP నేర్పిస్తారా?', hi: 'क्या आप React या GCP सिखाते हैं?' },
      en: 'Our website lists more courses, such as React and GCP data engineering. They are not on this price sheet, so our counsellor will confirm the fee and the batch for you.',
      te: 'మా వెబ్‌సైట్‌లో React, GCP డేటా ఇంజనీరింగ్ లాంటి మరిన్ని కోర్సులు ఉన్నాయి. అవి ఈ ప్రైస్ షీట్‌లో లేవు, కాబట్టి ఫీజు, బ్యాచ్ వివరాలు మా కౌన్సెలర్ చెబుతారు.',
      hi: 'हमारी वेबसाइट पर React और GCP डेटा इंजीनियरिंग जैसे और कोर्स भी हैं। वे इस प्राइस शीट में नहीं हैं, इसलिए फीस और बैच की जानकारी हमारे काउंसलर देंगे।'
    },
    {
      id: 'q-plans', icon: 'stacked_bar_chart',
      q: { en: 'What are Spark, Prime and Apex on your website?', te: 'వెబ్‌సైట్‌లో ఉన్న Spark, Prime, Apex ఏమిటి?', hi: 'वेबसाइट पर Spark, Prime और Apex क्या हैं?' },
      en: 'Those are longer pathway programs with their own fees. This sheet lists single courses. Our counsellor can compare both options for you.',
      te: 'అవి సొంత ఫీజులు ఉన్న పెద్ద పాత్‌వే ప్రోగ్రామ్స్. ఈ షీట్‌లో ఒక్కో కోర్సు వివరాలు ఉన్నాయి. రెండింటినీ మా కౌన్సెలర్ పోల్చి చెబుతారు.',
      hi: 'वे अपनी अलग फीस वाले लंबे पाथवे प्रोग्राम हैं। इस शीट में अलग अलग कोर्स हैं। हमारे काउंसलर दोनों की तुलना करके बताएंगे।'
    },
    {
      id: 'q-unknown', icon: 'support_agent',
      q: { en: 'When you do not know the answer', te: 'సమాధానం తెలియనప్పుడు', hi: 'जब जवाब न पता हो' },
      en: 'That is a good question, and I do not want to give you wrong information. Let me check with our counsellor, and we will call you back.',
      te: 'మంచి ప్రశ్న, మీకు తప్పు సమాచారం ఇవ్వకూడదు. మా కౌన్సెలర్‌ను అడిగి తెలుసుకుంటాను, మేము మీకు తిరిగి ఫోన్ చేస్తాము.',
      hi: 'अच्छा सवाल है, और हम आपको गलत जानकारी नहीं देना चाहते। हम अपने काउंसलर से पूछकर आपको वापस फोन करेंगे।'
    }
  ];

  const NEVER = [
    { en: 'Never promise a job or a salary.', te: 'ఉద్యోగం లేదా జీతం గురించి ఎప్పుడూ హామీ ఇవ్వకండి.', hi: 'नौकरी या सैलरी का वादा कभी न करें।' },
    { en: 'Never offer a discount or change a fee.', te: 'డిస్కౌంట్ ఇవ్వకండి, ఫీజు మార్చకండి.', hi: 'डिस्काउंट न दें और फीस न बदलें।' },
    { en: 'Never guess a batch date or a class time.', te: 'బ్యాచ్ తేదీ లేదా క్లాస్ సమయం ఊహించి చెప్పకండి.', hi: 'बैच की तारीख या क्लास का समय अंदाज़े से न बताएं।' },
    { en: 'Never let a visitor leave without the QR scan and a register entry.', te: 'QR స్కాన్, రిజిస్టర్ ఎంట్రీ లేకుండా ఎవరినీ పంపకండి.', hi: 'QR स्कैन और रजिस्टर एंट्री के बिना किसी को जाने न दें।' }
  ];

  const BASICS = [
    { term: 'AI', en: 'Software that can understand language, answer questions and make decisions.', te: 'భాషను అర్థం చేసుకుని, ప్రశ్నలకు జవాబిచ్చి, నిర్ణయాలు తీసుకోగల సాఫ్ట్‌వేర్.', hi: 'ऐसा सॉफ्टवेयर जो भाषा समझता है, सवालों के जवाब देता है और फैसले लेता है।' },
    { term: 'AI Agent', en: 'An AI that does not only answer. It takes actions, like searching a website or making a report.', te: 'జవాబు చెప్పడమే కాదు, వెబ్‌సైట్ వెతకడం, రిపోర్ట్ చేయడం లాంటి పనులు చేసే AI.', hi: 'ऐसा AI जो सिर्फ जवाब नहीं देता, बल्कि वेबसाइट खोजने या रिपोर्ट बनाने जैसे काम भी करता है।' },
    { term: 'Cloud', en: 'Renting computers and storage over the internet, from Amazon (AWS), Microsoft (Azure) or Google.', te: 'అమెజాన్ (AWS), మైక్రోసాఫ్ట్ (Azure), గూగుల్ నుంచి ఇంటర్నెట్ ద్వారా కంప్యూటర్లు, స్టోరేజ్ అద్దెకు తీసుకోవడం.', hi: 'अमेज़न (AWS), माइक्रोसॉफ्ट (Azure) या गूगल से इंटरनेट के ज़रिए कंप्यूटर और स्टोरेज किराए पर लेना।' },
    { term: 'Data Engineer', en: 'The person who collects, cleans and moves company data so others can use it.', te: 'కంపెనీ డేటాను సేకరించి, శుభ్రం చేసి, ఇతరులు వాడుకునేలా అందించే వ్యక్తి.', hi: 'वह व्यक्ति जो कंपनी का डेटा इकट्ठा करता है, साफ करता है और दूसरों के इस्तेमाल के लिए पहुंचाता है।' },
    { term: 'Full Stack Developer', en: 'A developer who builds both the screens users see and the system behind them.', te: 'వాడుకదారులు చూసే స్క్రీన్లను, వెనుక సిస్టమ్‌ను రెండూ తయారు చేసే డెవలపర్.', hi: 'ऐसा डेवलपर जो दिखने वाली स्क्रीन और उनके पीछे का सिस्टम, दोनों बनाता है।' },
    { term: 'Python', en: 'A simple and popular programming language, used a lot for data and AI.', te: 'డేటా, AI పనుల్లో ఎక్కువగా వాడే సులభమైన ప్రోగ్రామింగ్ భాష.', hi: 'एक आसान और लोकप्रिय प्रोग्रामिंग भाषा, जो डेटा और AI में खूब चलती है।' },
    { term: 'SQL', en: 'The language used to ask a database for information.', te: 'డేటాబేస్ నుంచి సమాచారం అడగడానికి వాడే భాష.', hi: 'डेटाबेस से जानकारी निकालने की भाषा।' },
    { term: 'Power BI', en: 'A Microsoft tool that turns data into charts and dashboards.', te: 'డేటాను చార్టులు, డాష్‌బోర్డులుగా మార్చే మైక్రోసాఫ్ట్ టూల్.', hi: 'माइक्रोसॉफ्ट का टूल जो डेटा को चार्ट और डैशबोर्ड में बदलता है।' }
  ];

  const CONTACT = {
    site: 'www.tinitiateai.com', email: 'contact@tinitiateai.com',
    phones: ['+91 630 9123485', '+91 630 9123489'],
    demoDays: { en: 'Monday, Wednesday, Saturday', te: 'సోమవారం, బుధవారం, శనివారం', hi: 'सोमवार, बुधवार, शनिवार' }
  };

  // Everything Ramesh reads aloud, as one list
  function lessons() {
    return [
      ...DESK.map(d => ({ id: d.id, set: 'desk', title: d.title, en: d.en, te: d.te, hi: d.hi })),
      ...COURSES.map(c => ({ id: c.id, set: 'course', title: { en: c.name, te: c.name, hi: c.name }, en: c.en, te: c.te, hi: c.hi })),
      ...QUESTIONS.map(q => ({ id: q.id, set: 'question', title: q.q, en: q.en, te: q.te, hi: q.hi }))
    ];
  }

  return { CATEGORIES, PREREQ, COURSES, DESK, FINDER, QUESTIONS, NEVER, BASICS, CONTACT, lessons };
})();
