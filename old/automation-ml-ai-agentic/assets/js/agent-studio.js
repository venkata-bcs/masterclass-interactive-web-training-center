/* =============================================================================
   AGENT STUDIO: a beginner-friendly, fully simulated agent dashboard.
   Pick a business domain (top tabs), a model, and a team of agents, then run
   the think → act → observe loop with human approval, testing, an audit log
   and observability. Everything is predefined: no real model is called.
   ============================================================================= */
(function () {
  const root = document.getElementById('agentStudio');
  if (!root) return;

  // Brand marks from Simple Icons (CC0). Rendered inline so no network is needed.
  const LOGOS = {
    claude: 'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z',
    openai: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
    googlegemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
    meta: 'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z',
    amazonwebservices: 'M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z',
    microsoftazure: 'M22.379 23.343a1.62 1.62 0 0 0 1.536-2.14v.002L17.35 1.76A1.62 1.62 0 0 0 15.816.657H8.184A1.62 1.62 0 0 0 6.65 1.76L.086 21.204a1.62 1.62 0 0 0 1.536 2.139h4.741a1.62 1.62 0 0 0 1.535-1.103l.977-2.892 4.947 3.675c.28.208.618.32.966.32m-3.084-12.531 3.624 10.739a.54.54 0 0 1-.51.713v-.001h-.03a.54.54 0 0 1-.322-.106l-9.287-6.9h4.853m6.313 7.006c.116-.326.13-.694.007-1.058L9.79 1.76a1.722 1.722 0 0 0-.007-.02h6.034a.54.54 0 0 1 .512.366l6.562 19.445a.54.54 0 0 1-.338.684'
  };

  const ENGINES = [
    { id: 'claude', name: 'Claude', vendor: 'Anthropic', logo: 'claude', color: '#D97757', pace: 1.0 },
    { id: 'gpt', name: 'GPT', vendor: 'OpenAI', logo: 'openai', color: 'currentColor', pace: 0.96 },
    { id: 'gemini', name: 'Gemini', vendor: 'Google', logo: 'googlegemini', color: '#8E75B2', pace: 0.94 },
    { id: 'llama', name: 'Llama', vendor: 'Meta · open model', logo: 'meta', color: '#0467DF', pace: 1.1 },
    { id: 'bedrock', name: 'Bedrock', vendor: 'Amazon Web Services', logo: 'amazonwebservices', color: '#FF9900', pace: 1.04 },
    { id: 'foundry', name: 'AI Foundry', vendor: 'Microsoft Azure', logo: 'microsoftazure', color: '#0078D4', pace: 1.0 }
  ];

  // ---------------------------------------------------------------------------
  // Five business domains. Each has a trigger, an objective, a lead agent,
  // four specialist agents with their tools, and a predefined script.
  //   think  : the agent reasons (needs/alt: fallback text when facts are missing)
  //   act    : a tool call by a specialist (missing: no such agent on the team,
  //            needs/blocked: earlier facts required, risky: needs human approval)
  //   guard  : a guardrail check on the final output or action
  // ---------------------------------------------------------------------------
  const DOMAINS = [
    {
      id: 'retail', name: 'Retail', icon: 'storefront',
      trigger: { who: 'Maria · customer', avatar: 'person', channel: 'Website chat',
        text: 'My blender arrived broken. Order #R-2093. Can I get a refund?' },
      objective: 'Resolve the damaged-item complaint within policy and keep Maria happy.',
      lead: { id: 'lead', name: 'Support Orchestrator', icon: 'support_agent', tone: 'purple',
        role: 'Plans the work, hands tasks to specialists and writes the final reply.', tools: ['Planner', 'Reply writer'] },
      agents: [
        { id: 'order', name: 'Order Agent', icon: 'receipt_long', tone: 'blue', role: 'Looks up orders and deliveries.', tools: ['Orders DB', 'Shipping tracker'] },
        { id: 'policy', name: 'Policy Agent', icon: 'gavel', tone: 'amber', role: 'Finds the exact rule in the policy handbook.', tools: ['Policy knowledge base (RAG)'] },
        { id: 'refund', name: 'Refund Agent', icon: 'payments', tone: 'green', role: 'Issues refunds through the payment system.', tools: ['Payments API'] },
        { id: 'comms', name: 'Comms Agent', icon: 'mail', tone: 'red', role: 'Sends emails and chat replies to customers.', tools: ['Email service'] }
      ],
      script: [
        { type: 'think', agent: 'lead', text: 'New complaint from Maria about a damaged blender. My plan: 1) confirm the order, 2) check the refund policy, 3) refund if allowed, 4) reply to Maria.', why: 'Agents start by turning the goal into a short plan of smaller steps.' },
        { type: 'act', agent: 'order', tool: 'Orders DB', text: 'Look up order R-2093.', result: 'Order R-2093: PowerBlend 600 blender, $129, delivered 2 days ago, paid by card ending 4421.', why: 'Agents use tools to get real facts instead of guessing.', missing: 'There is no Order Agent on the team, so the order cannot be verified. The agent asks Maria for her receipt instead.' },
        { type: 'act', agent: 'policy', tool: 'Policy knowledge base', text: 'Search the policy for "item damaged on arrival".', result: 'Policy 4.2: items damaged on arrival get a full refund within 30 days. Items under $150 do not need to be returned.', why: 'This is RAG: the agent retrieves the exact policy text before deciding anything about money.', missing: 'There is no Policy Agent, so the refund rules are unknown. The agent will not guess about money.' },
        { type: 'think', agent: 'lead', needs: ['order', 'policy'], text: 'The order is real, it arrived 2 days ago, and $129 is under the $150 no-return limit. A full refund is allowed.', alt: 'I do not have verified facts about the order and the policy, so I cannot approve a refund.', why: 'After every observation the agent thinks again with the new facts. That repetition is the agent loop.' },
        { type: 'act', agent: 'refund', tool: 'Payments API', needs: ['order', 'policy'], text: 'Refund $129 to the card ending 4421.', result: 'Refund RF-7781 created. Money back in 3 to 5 business days.', effect: '$129 refunded to Maria (RF-7781)', why: 'Moving money is a high-risk action, so it goes through a human checkpoint.',
          risky: { ask: 'Refund $129 to Maria\'s card ending 4421?', reject: 'Refund not issued. The case goes to a human support lead with the order and policy already attached.' },
          blocked: 'Refund skipped: the order and policy were not verified, so the agent will not move money.', missing: 'There is no Refund Agent with payment access. A human will have to issue the refund.' },
        { type: 'act', agent: 'comms', tool: 'Email service', text: 'Send Maria a reply with the outcome.', result: 'Email delivered to Maria.', effect: 'Reply sent to Maria', why: 'Closing the loop with the customer is part of the goal.', missing: 'There is no Comms Agent, so the reply is written but never sent.' },
        { type: 'guard', agent: 'lead', text: 'Output guardrail passed: card number masked as ****4421, tone checked as polite, no promises outside the policy.', why: 'Guardrails check the final answer before a customer ever sees it.' }
      ],
      reply: 'Hi Maria, I\'m so sorry your blender arrived damaged! I\'ve issued a full refund of $129 to your card ending ****4421 (ref RF-7781). You\'ll see it in 3 to 5 business days, and there\'s no need to send the blender back.',
      success: 'Maria got a full refund within policy and a friendly reply in under a minute.',
      handoff: 'You rejected the refund, so the agent escalated to a human support lead with the order details and policy already gathered.'
    },
    {
      id: 'banking', name: 'Banking', icon: 'account_balance',
      trigger: { who: 'James · customer', avatar: 'person', channel: 'Mobile banking app',
        text: 'There\'s a $2,400 charge from an electronics store in Lisbon on my card. I\'ve never been to Portugal!' },
      objective: 'Protect James: confirm the fraud, stop further charges and start getting his money back.',
      lead: { id: 'lead', name: 'Fraud Desk Orchestrator', icon: 'security', tone: 'purple',
        role: 'Coordinates the fraud response and talks to the customer.', tools: ['Planner', 'Secure messaging'] },
      agents: [
        { id: 'txn', name: 'Transaction Agent', icon: 'receipt_long', tone: 'blue', role: 'Reads the customer\'s card transactions.', tools: ['Core banking API'] },
        { id: 'risk', name: 'Risk Agent', icon: 'query_stats', tone: 'amber', role: 'Scores how likely a charge is fraud.', tools: ['Fraud score model', 'Device location'] },
        { id: 'card', name: 'Card Ops Agent', icon: 'credit_card_off', tone: 'red', role: 'Blocks and replaces cards.', tools: ['Card management API'] },
        { id: 'dispute', name: 'Dispute Agent', icon: 'gavel', tone: 'green', role: 'Opens disputes to recover money.', tools: ['Disputes system'] }
      ],
      script: [
        { type: 'think', agent: 'lead', text: 'Possible card fraud on James\'s account. My plan: 1) pull recent transactions, 2) score the fraud risk, 3) block the card if it is risky, 4) open a dispute for the $2,400.', why: 'Agents start by turning the goal into a short plan of smaller steps.' },
        { type: 'act', agent: 'txn', tool: 'Core banking API', text: 'Get the last 10 card transactions.', result: '$2,400 at "TechZone Lisboa" at 3:12 AM, online. Every other purchase this month was in Chicago.', why: 'Agents use tools to get real facts instead of guessing.', missing: 'There is no Transaction Agent, so the charge cannot be checked against James\'s history.' },
        { type: 'act', agent: 'risk', tool: 'Fraud score model', needs: ['txn'], text: 'Score the Lisbon charge for fraud.', result: 'Fraud score 0.94 (high). James\'s phone was in Chicago at the time. The pattern matches stolen-card fraud.', why: 'A classic machine-learning model gives a risk score, and the agent uses it as evidence.', blocked: 'Fraud scoring skipped: there is no transaction to score.', missing: 'There is no Risk Agent, so there is no fraud score to justify action.' },
        { type: 'think', agent: 'lead', needs: ['txn', 'risk'], text: 'A high fraud score, and James\'s phone was somewhere else. This is very likely fraud. Next step: block the card.', alt: 'There is not enough evidence to act on the card safely.', why: 'After every observation the agent thinks again with the new facts. That repetition is the agent loop.' },
        { type: 'act', agent: 'card', tool: 'Card management API', needs: ['txn', 'risk'], text: 'Block the card ending 7710 and order a replacement.', result: 'Card 7710 blocked. A new card ships in 3 days; the digital wallet card works right now.', effect: 'Card 7710 blocked and replaced', why: 'Blocking a card affects the customer, so a human confirms it.',
          risky: { ask: 'Block James\'s card ending 7710 and send him a new one?', reject: 'Card left active. The case goes to a fraud analyst for manual review.' },
          blocked: 'Card not blocked: fraud was not confirmed.', missing: 'There is no Card Ops Agent, so the card stays active. That is a real risk!' },
        { type: 'act', agent: 'dispute', tool: 'Disputes system', needs: ['txn'], text: 'Open a dispute for the $2,400 charge.', result: 'Dispute D-5512 opened. A provisional credit of $2,400 arrives within 2 business days.', effect: 'Dispute D-5512 opened with a $2,400 provisional credit', why: 'Recovering the money is part of the goal, not just stopping the fraud.', blocked: 'No dispute opened: there is no transaction record to dispute.', missing: 'There is no Dispute Agent, so James has to call the bank to start the dispute himself.' },
        { type: 'guard', agent: 'lead', text: 'Output guardrail passed: full card and account numbers removed, message sent only through the secure in-app inbox.', why: 'Guardrails check the final answer before a customer ever sees it.' }
      ],
      reply: 'Hi James, you\'re right, that charge wasn\'t you. We\'ve blocked card ****7710, a new card is on its way, and your digital wallet card works now. We opened dispute D-5512, and you\'ll see a $2,400 credit within 2 business days.',
      success: 'Fraud confirmed, the card was blocked within a minute, and James gets his money back.',
      handoff: 'You chose not to block the card, so a fraud analyst will review the case manually.'
    },
    {
      id: 'insurance', name: 'Insurance', icon: 'health_and_safety',
      trigger: { who: 'Aisha · policyholder', avatar: 'person', channel: 'Claims portal',
        text: 'A tree fell on my car in last night\'s storm. I\'ve uploaded 3 photos. Please help!' },
      objective: 'Assess the car claim, confirm coverage, and pay Aisha quickly and fairly.',
      lead: { id: 'lead', name: 'Claims Orchestrator', icon: 'assignment', tone: 'purple',
        role: 'Runs the claim from start to finish and explains the decision.', tools: ['Planner', 'Reply writer'] },
      agents: [
        { id: 'intake', name: 'Intake Agent', icon: 'document_scanner', tone: 'blue', role: 'Reads claim forms and damage photos.', tools: ['Document AI', 'Photo damage model'] },
        { id: 'coverage', name: 'Coverage Agent', icon: 'policy', tone: 'amber', role: 'Checks what the policy covers.', tools: ['Policy database'] },
        { id: 'fraud', name: 'Fraud Check Agent', icon: 'radar', tone: 'red', role: 'Verifies the story and looks for red flags.', tools: ['Weather API', 'Claims history'] },
        { id: 'payout', name: 'Payout Agent', icon: 'payments', tone: 'green', role: 'Pays approved claims.', tools: ['Payments API'] }
      ],
      script: [
        { type: 'think', agent: 'lead', text: 'New car claim from Aisha. My plan: 1) read the photos and form, 2) check her coverage, 3) run fraud checks, 4) pay the claim.', why: 'Agents start by turning the goal into a short plan of smaller steps.' },
        { type: 'act', agent: 'intake', tool: 'Document AI', text: 'Read the claim form and the 3 photos.', result: '2021 Honda Civic. Damage: dented roof and cracked windshield. Repair estimate from the photos: $3,850.', why: 'Multimodal models can read photos and documents, not just text.', missing: 'There is no Intake Agent, so nobody assesses the photos. Aisha has to wait for an in-person inspection.' },
        { type: 'act', agent: 'coverage', tool: 'Policy database', text: 'Check Aisha\'s policy for storm damage.', result: 'Comprehensive cover is active. Falling objects and storms are covered. Deductible: $500.', why: 'Facts about coverage must come from the policy system, never from the model\'s memory.', missing: 'There is no Coverage Agent, so the claim cannot be confirmed as covered.' },
        { type: 'act', agent: 'fraud', tool: 'Weather API', needs: ['intake'], text: 'Confirm the storm and check past claims.', result: 'A storm with 60 mph gusts is confirmed at Aisha\'s address last night. No previous claims. Fraud risk: low.', why: 'Checking the story against an outside source keeps the process fair for everyone.', blocked: 'Fraud check skipped: there is no damage report to check.', missing: 'There is no Fraud Check Agent. Paying without checks breaks company rules.' },
        { type: 'think', agent: 'lead', needs: ['intake', 'coverage', 'fraud'], text: 'Damage of $3,850 minus the $500 deductible means a $3,350 payout. Everything checks out.', alt: 'Some checks are missing, so the payout amount cannot be confirmed.', why: 'After every observation the agent thinks again with the new facts. That repetition is the agent loop.' },
        { type: 'act', agent: 'payout', tool: 'Payments API', needs: ['intake', 'coverage', 'fraud'], text: 'Pay $3,350 to Aisha by direct deposit.', result: 'Payment P-2290 sent. It arrives within 24 hours.', effect: '$3,350 paid to Aisha (P-2290)', why: 'Paying a claim moves money, so it goes through a human checkpoint.',
          risky: { ask: 'Approve a $3,350 payout to Aisha ($3,850 damage minus the $500 deductible)?', reject: 'Payout on hold. The claim goes to a human adjuster with every finding attached.' },
          blocked: 'Payout not made: required checks are missing.', missing: 'There is no Payout Agent, so a human must process the payment.' },
        { type: 'guard', agent: 'lead', text: 'Output guardrail passed: the reply shows the deductible math, bank details are masked, and the wording is plain and clear.', why: 'Guardrails check the final answer before a customer ever sees it.' }
      ],
      reply: 'Hi Aisha, we\'re sorry about your car! Your claim is approved: the $3,850 repair estimate minus your $500 deductible comes to $3,350, sent by direct deposit (ref P-2290). It should arrive within 24 hours.',
      success: 'The claim was assessed, verified and paid the same day instead of in two weeks.',
      handoff: 'You held the payout, so a human adjuster will inspect the car. All the agent\'s findings are attached.'
    },
    {
      id: 'logistics', name: 'Logistics', icon: 'local_shipping',
      trigger: { who: 'Control tower · IoT alert', avatar: 'sensors', channel: 'Truck sensor alert',
        text: 'Shipment SH-448 (vaccines that must stay at 2–8°C) is stuck: highway I-80 is closed by a snowstorm.' },
      objective: 'Deliver the vaccines on time and keep them cold the whole way.',
      lead: { id: 'lead', name: 'Dispatch Orchestrator', icon: 'local_shipping', tone: 'purple',
        role: 'Owns the delivery plan and keeps everyone informed.', tools: ['Planner'] },
      agents: [
        { id: 'track', name: 'Tracking Agent', icon: 'location_on', tone: 'blue', role: 'Knows where every truck is and how cold the cargo is.', tools: ['GPS telematics', 'Temperature sensor'] },
        { id: 'route', name: 'Route Agent', icon: 'alt_route', tone: 'amber', role: 'Plans detours around road closures.', tools: ['Maps & traffic API'] },
        { id: 'carrier', name: 'Carrier Agent', icon: 'handshake', tone: 'green', role: 'Books extra drivers and trucks.', tools: ['Carrier booking API'] },
        { id: 'notify', name: 'Notify Agent', icon: 'notifications', tone: 'red', role: 'Updates drivers and customers.', tools: ['SMS & email'] }
      ],
      script: [
        { type: 'think', agent: 'lead', text: 'A cold-chain shipment is at risk. My plan: 1) check the truck and the cargo temperature, 2) find a new route, 3) arrange help if the driver runs out of hours, 4) update the hospital.', why: 'Agents start by turning the goal into a short plan of smaller steps.' },
        { type: 'act', agent: 'track', tool: 'GPS telematics', text: 'Get the truck position and cargo temperature.', result: 'Truck 12 is at mile 214 near Laramie. Cargo at 5.1°C (safe). Cooling power left: 6 hours.', why: 'Agents use tools to get real facts instead of guessing.', missing: 'There is no Tracking Agent, so the cargo temperature is unknown. The shipment is flagged as high risk.' },
        { type: 'act', agent: 'route', tool: 'Maps & traffic API', needs: ['track'], text: 'Find a detour around the I-80 closure.', result: 'A detour on US-30 adds 2h 10m, arriving at 4:40 PM, inside the delivery window. But the driver reaches the legal driving-hours limit at Cheyenne.', why: 'The agent combines live data from several tools to make a decision.', blocked: 'Route planning skipped: the truck location is unknown.', missing: 'There is no Route Agent, so the truck waits for the highway to reopen, with no known time.' },
        { type: 'think', agent: 'lead', needs: ['track', 'route'], text: 'The detour works, but a fresh driver must take over at Cheyenne. That costs money, so I need approval.', alt: 'There is not enough information to change the plan.', why: 'After every observation the agent thinks again with the new facts. That repetition is the agent loop.' },
        { type: 'act', agent: 'carrier', tool: 'Carrier booking API', needs: ['track', 'route'], text: 'Book a relay driver at the Cheyenne hub for $480.', result: 'Relay driver confirmed for 1:15 PM at the Cheyenne hub.', effect: 'Relay driver booked at Cheyenne ($480)', why: 'Spending company money needs a human checkpoint.',
          risky: { ask: 'Spend $480 on a relay driver at Cheyenne to keep the vaccines on schedule?', reject: 'No relay booked. The truck parks at Cheyenne overnight, and the agent alerts the operations manager about the cooling risk.' },
          blocked: 'No booking made: the new route is not confirmed.', missing: 'There is no Carrier Agent, so a dispatcher must phone carriers by hand.' },
        { type: 'act', agent: 'notify', tool: 'SMS & email', text: 'Tell the hospital and the driver about the new plan.', result: 'The hospital receiving dock and the driver have been notified.', effect: 'Hospital and driver notified', why: 'Keeping people informed is part of the job, not an afterthought.', missing: 'There is no Notify Agent, so the hospital is not told about the change.' },
        { type: 'guard', agent: 'lead', text: 'Action guardrail passed: $480 is under the $1,000 spending limit for agents, and the driving-hours safety rule was respected.', why: 'Guardrails also limit what an agent is allowed to do, not just what it says.' }
      ],
      reply: 'Update for City Hospital: shipment SH-448 (vaccines) has been re-routed around the I-80 closure and will arrive at 4:40 PM today. The cargo is at 5.1°C and monitored live.',
      success: 'The vaccines were re-routed, kept cold and delivered on time despite the storm.',
      handoff: 'You declined the relay driver, so the truck parks overnight and the operations manager decides what to do next.'
    },
    {
      id: 'telecom', name: 'Telecom', icon: 'cell_tower',
      trigger: { who: 'Lee · customer', avatar: 'person', channel: 'Support chat',
        text: 'My home internet keeps dropping every hour since yesterday. I work from home, this is a disaster!' },
      objective: 'Find the cause, fix it remotely if possible, and make it right for Lee.',
      lead: { id: 'lead', name: 'Network Care Orchestrator', icon: 'router', tone: 'purple',
        role: 'Diagnoses customer issues and decides on the fix.', tools: ['Planner', 'Reply writer'] },
      agents: [
        { id: 'diag', name: 'Diagnostics Agent', icon: 'network_check', tone: 'blue', role: 'Reads data from the customer\'s modem.', tools: ['Modem telemetry API'] },
        { id: 'network', name: 'Network Agent', icon: 'hub', tone: 'amber', role: 'Checks for outages in the area.', tools: ['Outage map', 'Node health'] },
        { id: 'fix', name: 'Fix Agent', icon: 'build', tone: 'green', role: 'Updates and restarts devices remotely.', tools: ['Remote device manager'] },
        { id: 'billing', name: 'Billing Agent', icon: 'receipt', tone: 'red', role: 'Applies credits to customer bills.', tools: ['Billing API'] }
      ],
      script: [
        { type: 'think', agent: 'lead', text: 'Lee\'s connection keeps dropping. My plan: 1) read the modem data, 2) rule out an area outage, 3) fix it remotely, 4) offer a goodwill credit.', why: 'Agents start by turning the goal into a short plan of smaller steps.' },
        { type: 'act', agent: 'diag', tool: 'Modem telemetry API', text: 'Read the last 24 hours of modem data.', result: '14 disconnects in 24 hours. Signal strength is fine. Firmware 3.1 has a known bug that causes hourly drops.', why: 'Agents use tools to get real facts instead of guessing.', missing: 'There is no Diagnostics Agent, so the cause is unknown. A technician visit is booked instead (3 days).' },
        { type: 'act', agent: 'network', tool: 'Outage map', text: 'Check for outages in Lee\'s area.', result: 'No outage. The neighborhood node C-17 is healthy.', why: 'Ruling things out is as important as finding the cause.', missing: 'There is no Network Agent, so an area outage cannot be ruled out.' },
        { type: 'think', agent: 'lead', needs: ['diag', 'network'], text: 'The network is fine and the modem software is buggy. Updating the firmware should fix it.', alt: 'The cause is not confirmed, so a remote fix would just be a guess.', why: 'After every observation the agent thinks again with the new facts. That repetition is the agent loop.' },
        { type: 'act', agent: 'fix', tool: 'Remote device manager', needs: ['diag', 'network'], text: 'Update the modem firmware to 3.4 and restart it.', result: 'Firmware 3.4 installed and the modem restarted. 0 drops in the last 30 minutes.', effect: 'Modem firmware fixed remotely', why: 'The agent verifies the fix worked instead of assuming it did.', blocked: 'Remote fix skipped: the cause was not confirmed.', missing: 'There is no Fix Agent, so a technician visit is needed.' },
        { type: 'act', agent: 'billing', tool: 'Billing API', needs: ['diag'], text: 'Add a $20 goodwill credit to Lee\'s account.', result: '$20 credit added to the next bill.', effect: '$20 goodwill credit applied', why: 'Giving money away is a business decision, so a human signs off.',
          risky: { ask: 'Give Lee a $20 goodwill credit for the disruption?', reject: 'No credit applied. Lee is told the problem is fixed.' },
          blocked: 'No credit: the problem was not confirmed.', missing: 'There is no Billing Agent, so no credit can be offered.' },
        { type: 'guard', agent: 'lead', text: 'Output guardrail passed: the reply only promises what was actually done, and the tone is empathetic.', why: 'Guardrails check the final answer before a customer ever sees it.' }
      ],
      reply: 'Hi Lee, sorry for the trouble! We found a bug in your modem\'s software and fixed it remotely, and your connection has been stable since. We\'ve also added a $20 credit to your next bill.',
      success: 'The root cause was found and fixed remotely in minutes, with no technician visit.',
      handoff: 'You declined the credit. The fix still worked, but Lee got no goodwill gesture.'
    }
  ];

  const EV = {
    think:   { label: 'THINK',          icon: 'psychology',   tag: 't-purple' },
    act:     { label: 'ACT · TOOL CALL', icon: 'build',       tag: 't-blue' },
    observe: { label: 'OBSERVE',        icon: 'visibility',   tag: 't-green' },
    guard:   { label: 'GUARDRAIL',      icon: 'shield',       tag: 't-green' },
    hitl:    { label: 'NEEDS APPROVAL', icon: 'front_hand',   tag: 't-amber' },
    human:   { label: 'HUMAN DECISION', icon: 'how_to_reg',   tag: 't-amber' },
    auto:    { label: 'AUTO-APPROVED',  icon: 'warning',      tag: 't-amber' },
    gap:     { label: 'MISSING SKILL',  icon: 'report',       tag: 't-red' },
    error:   { label: 'TOOL ERROR',     icon: 'error',        tag: 't-red' },
    stop:    { label: 'STOPPED',        icon: 'stop_circle',  tag: 't-red' },
    result:  { label: 'DONE',           icon: 'flag',         tag: 't-green' }
  };
  // Illustrative cost model: base duration (ms) and tokens per event type
  const COST = {
    think: [1300, 640], act: [420, 170], observe: [320, 260], guard: [260, 140], hitl: [0, 0], human: [0, 0],
    auto: [40, 0], gap: [600, 280], error: [5000, 60], stop: [0, 0], result: [1500, 720]
  };
  const PRICE_PER_TOKEN = 0.000006; // illustrative only
  const MAX_LOOPS = 12;

  const VIEWS = [
    { id: 'build', label: 'Build', icon: 'construction' },
    { id: 'run', label: 'Run', icon: 'play_circle' },
    { id: 'results', label: 'Results', icon: 'task_alt' },
    { id: 'tests', label: 'Tests & Audit', icon: 'fact_check' },
    { id: 'obs', label: 'Observability', icon: 'monitoring' }
  ];

  const S = {
    domain: 0, engine: 'claude', view: 'build', hitl: true, failTool: false, speed: 1,
    rosters: DOMAINS.map(d => new Set(d.agents.map(a => a.id))),
    run: null
  };

  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dom = () => DOMAINS[S.domain];
  const roster = () => S.rosters[S.domain];
  const engine = () => ENGINES.find(e => e.id === S.engine);
  const busy = () => S.run && (S.run.status === 'running' || S.run.status === 'waiting');
  const logo = (e, size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${e.color}" aria-hidden="true"><path d="${LOGOS[e.logo]}"/></svg>`;

  function agentOf(id) {
    if (id === 'human') return { name: 'You (human)', icon: 'person', tone: 'amber' };
    if (id === 'system') return { name: 'System', icon: 'settings', tone: 'neutral' };
    const d = dom();
    return id === 'lead' ? d.lead : d.agents.find(a => a.id === id);
  }

  // ---------------------------------------------------------------- shell
  root.innerHTML = `
    <div class="lab-top">
      <div class="lab-tabs" role="tablist" aria-label="Business domain">${DOMAINS.map((d, i) =>
        `<button class="lab-tab" role="tab" data-domain="${i}"><span class="msr sm">${d.icon}</span>${d.name}</button>`).join('')}</div>
      <div class="lab-top-actions"></div>
    </div>
    <div class="as-context" id="asContext"></div>
    <div class="lab-views">${VIEWS.map(v => `<section class="lab-view" data-view="${v.id}" id="asView-${v.id}"></section>`).join('')}</div>
    <nav class="lab-nav" aria-label="Dashboard sections">${VIEWS.map(v =>
      `<button class="lab-nav-btn" data-view="${v.id}"><span class="lab-nav-pill"><span class="msr">${v.icon}</span><span class="lab-nav-badge" hidden></span></span><span>${v.label}</span></button>`).join('')}</nav>`;

  root.querySelectorAll('[data-domain]').forEach(b => b.addEventListener('click', () => setDomain(+b.dataset.domain)));
  root.querySelectorAll('.lab-nav-btn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  function setDomain(i) {
    if (busy()) return;
    S.domain = i;
    S.run = null;
    renderAll();
  }

  function setView(v) {
    S.view = v;
    root.querySelectorAll('.lab-view').forEach(el => el.classList.toggle('active', el.dataset.view === v));
    root.querySelectorAll('.lab-nav-btn').forEach(el => el.classList.toggle('active', el.dataset.view === v));
    if (v === 'results') setBadge('results', null);
    if (v === 'results') renderResults();
    if (v === 'tests') renderTests();
    if (v === 'obs') renderObs();
  }

  function setBadge(view, text, opts = {}) {
    const b = root.querySelector(`.lab-nav-btn[data-view="${view}"] .lab-nav-badge`);
    if (!b) return;
    b.hidden = text == null;
    b.textContent = text || '';
    b.classList.toggle('dot', text === '');
    b.classList.toggle('pulse', !!opts.pulse);
  }

  function renderAll() {
    root.querySelectorAll('[data-domain]').forEach(b => {
      const on = +b.dataset.domain === S.domain;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
      b.disabled = busy() && !on;
    });
    const d = dom();
    document.getElementById('asContext').innerHTML = `
      <div class="as-trigger">
        <span class="lab-icon sm t-blue"><span class="msr">${d.trigger.avatar}</span></span>
        <div class="as-bubble"><span class="lab-small">${esc(d.trigger.who)} · ${esc(d.trigger.channel)}</span>"${esc(d.trigger.text)}"</div>
      </div>
      <div class="as-objective"><span class="msr">flag</span><div><span class="lab-small">AGENT OBJECTIVE (THE GOAL)</span><br>${esc(d.objective)}</div></div>`;
    renderBuild();
    renderRun();
    renderResults();
    renderTests();
    renderObs();
    ['results', 'tests', 'obs'].forEach(v => setBadge(v, null));
    setBadge('run', null);
    setView(S.view);
  }

  // ---------------------------------------------------------------- BUILD
  function agentCard(a, opts) {
    const tools = a.tools.map(t => `<span class="lab-chip"><span class="msr">build</span>${esc(t)}</span>`).join('');
    const btn = opts.lead
      ? ''
      : opts.ghost
        ? `<button class="md-btn md-btn-tonal" data-add="${a.id}" ${busy() ? 'disabled' : ''}><span class="msr">add</span>Add</button>`
        : `<button class="md-icon-btn" data-remove="${a.id}" title="Remove from team" ${busy() ? 'disabled' : ''}><span class="msr">close</span></button>`;
    return `<div class="as-agent ${opts.lead ? 'lead' : ''} ${opts.ghost ? 'ghost' : ''}">
      <span class="lab-icon t-${a.tone}"><span class="msr">${a.icon}</span></span>
      <div><div class="md-title-s">${esc(a.name)}${opts.lead ? '<span class="as-tag-lead">LEAD</span>' : ''}</div>
        <div class="lab-small">${esc(a.role)}</div><div class="lab-chips">${tools}</div></div>
      ${btn}</div>`;
  }

  function renderBuild() {
    const d = dom();
    const team = d.agents.filter(a => roster().has(a.id));
    const library = d.agents.filter(a => !roster().has(a.id));
    const el = document.getElementById('asView-build');
    el.innerHTML = `
      <div class="lab-tip"><span class="msr">lightbulb</span><div><strong>What is an AI agent?</strong> A model (the brain) + tools (its hands) + a goal + a loop that repeats <strong>think → act → observe</strong> until the goal is done. Build your team below, pick a model, then press <strong>Run</strong>.</div></div>
      <div class="lab-panel">
        <div class="lab-panel-title"><span class="msr">neurology</span><span class="md-title-m">1. Choose the model that powers your agents</span></div>
        <div class="as-engines">${ENGINES.map(e => `
          <button class="as-engine ${e.id === S.engine ? 'active' : ''}" data-engine="${e.id}" ${busy() ? 'disabled' : ''}>
            ${logo(e, 28)}<span class="md-title-s">${esc(e.name)}</span><span class="lab-small">${esc(e.vendor)}</span>
          </button>`).join('')}</div>
        <div class="lab-small">Any of these models can power the same agent. The loop, tools and guardrails stay the same. This is a simulation: no real model is called, and timing and token numbers are illustrative.</div>
      </div>
      <div class="lab-grid-2">
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">groups</span><span class="md-title-m">2. Your agent team</span><span class="lab-panel-aside lab-small">${team.length + 1} agents</span></div>
          <div class="as-roster">${agentCard(d.lead, { lead: true })}${team.map(a => agentCard(a, {})).join('')}</div>
          ${library.length ? `<div class="lab-panel-title"><span class="msr">add_circle</span><span class="md-title-s">Agents you can add</span></div>
          <div class="as-library">${library.map(a => agentCard(a, { ghost: true })).join('')}</div>` : ''}
        </div>
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">science</span><span class="md-title-m">3. Try these experiments</span></div>
          <ol class="as-experiments">
            <li><strong>Run the full team</strong> and watch each agent use its tool.</li>
            <li><strong>Remove an agent</strong> (for example, the policy or order agent) and run again. The lead notices the missing skill and refuses to guess.</li>
            <li><strong>Turn off human approval</strong> in Run. The agent moves money on its own, and Tests &amp; Audit flag it.</li>
            <li><strong>Make a tool fail</strong> to see the agent retry instead of giving up.</li>
            <li><strong>Press Stop</strong> mid-run. Stopping is a key safety control.</li>
          </ol>
          <div class="lab-tip" style="margin-top:auto;"><span class="msr">layers</span><div>Every run passes through 4 layers: <strong>Objective</strong> (the goal above), <strong>Tools</strong> (on each agent), <strong>Testing &amp; audit</strong> (checks and a permanent log) and <strong>Observability</strong> (time, tokens and errors).</div></div>
        </div>
      </div>`;
    el.querySelectorAll('[data-engine]').forEach(b => b.addEventListener('click', () => { S.engine = b.dataset.engine; renderBuild(); renderRun(); }));
    el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { roster().add(b.dataset.add); S.run = null; renderAll(); }));
    el.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { roster().delete(b.dataset.remove); S.run = null; renderAll(); }));
  }

  // ---------------------------------------------------------------- RUN
  function renderRun() {
    const el = document.getElementById('asView-run');
    const e = engine();
    el.innerHTML = `
      <div class="lab-tip"><span class="msr">lightbulb</span><div>Watch the loop: <strong>purple</strong> = thinking, <strong>blue</strong> = using a tool, <strong>green</strong> = reading the result. <strong>Amber</strong> means the agent is waiting for you. Each step says <em>why</em> it happened.</div></div>
      <div class="lab-grid-run">
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">timeline</span><span class="md-title-m">Agent loop, step by step</span><span class="lab-panel-aside lab-small">${logo(e, 14)} ${esc(e.name)}</span></div>
          <div class="as-timeline" id="asTimeline"><div class="lab-empty"><span class="msr">smart_toy</span><div>Press <strong>Run agent</strong> to start. The team will work toward the objective above.</div></div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0;">
          <div class="lab-panel">
            <div class="as-status" id="asStatus"><span class="dot"></span><span>Ready</span></div>
            <div class="as-controls">
              <button class="md-btn md-btn-filled" id="asRunBtn"><span class="msr">play_arrow</span>Run agent</button>
              <button class="md-btn as-btn-stop" id="asStopBtn" disabled><span class="msr">stop</span>Stop</button>
              <button class="md-btn md-btn-outlined" id="asResetBtn"><span class="msr">restart_alt</span>Reset</button>
            </div>
            <label class="lab-switch"><span><span class="md-title-s">Human in the loop</span><br><span class="lab-small">Pause for your approval before risky actions</span></span>
              <input type="checkbox" id="asHitl" ${S.hitl ? 'checked' : ''}><span class="lab-switch-track"></span></label>
            <label class="lab-switch"><span><span class="md-title-s">Make a tool fail</span><br><span class="lab-small">The first tool call times out</span></span>
              <input type="checkbox" id="asFail" ${S.failTool ? 'checked' : ''}><span class="lab-switch-track"></span></label>
            <div><div class="lab-small" style="margin-bottom:6px;">Speed</div>
              <div class="as-speed">${[0.5, 1, 2].map(s => `<button data-speed="${s}" class="${s === S.speed ? 'active' : ''}">${s}x</button>`).join('')}</div></div>
          </div>
          <div class="lab-panel">
            <div class="lab-panel-title"><span class="msr">autorenew</span><span class="md-title-s">The agent loop</span></div>
            <div class="as-loop">
              <div class="as-loop-node think" data-phase="think"><span class="msr">psychology</span>Think</div><span class="msr as-loop-arrow">arrow_forward</span>
              <div class="as-loop-node act" data-phase="act"><span class="msr">build</span>Act</div><span class="msr as-loop-arrow">arrow_forward</span>
              <div class="as-loop-node observe" data-phase="observe"><span class="msr">visibility</span>Observe</div>
            </div>
            <div class="as-loop-foot"><span id="asLoopCount">Loop 0</span><div class="as-loop-meter"><div id="asLoopMeter"></div></div><span>max ${MAX_LOOPS}</span></div>
            <div class="lab-small">A loop limit stops a confused agent from running forever.</div>
          </div>
        </div>
      </div>`;
    el.querySelector('#asRunBtn').addEventListener('click', startRun);
    el.querySelector('#asStopBtn').addEventListener('click', stopRun);
    el.querySelector('#asResetBtn').addEventListener('click', () => { if (S.run) clearTimeout(S.run.timer); S.run = null; renderAll(); setView('run'); });
    el.querySelector('#asHitl').addEventListener('change', (ev) => { S.hitl = ev.target.checked; });
    el.querySelector('#asFail').addEventListener('change', (ev) => { S.failTool = ev.target.checked; });
    el.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
      S.speed = +b.dataset.speed;
      el.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('active', x === b));
    }));
    if (S.run) replayTimeline();
    updateRunUi();
  }

  function updateRunUi() {
    const r = S.run;
    const st = document.getElementById('asStatus');
    if (!st) return;
    const map = {
      running: ['running', 'Running: the agent is working'],
      waiting: ['waiting', 'Paused: waiting for your approval'],
      done: ['done', 'Finished'],
      stopped: ['stopped', 'Stopped by you']
    };
    const [cls, text] = r ? map[r.status] : ['', 'Ready'];
    st.className = 'as-status ' + cls;
    st.querySelector('span:last-child').textContent = text;
    document.getElementById('asRunBtn').disabled = busy();
    document.getElementById('asStopBtn').disabled = !busy();
    document.getElementById('asHitl').disabled = busy();
    document.getElementById('asFail').disabled = busy();
    const loops = r ? r.loops : 0;
    document.getElementById('asLoopCount').textContent = 'Loop ' + loops;
    document.getElementById('asLoopMeter').style.width = Math.min(100, loops / MAX_LOOPS * 100) + '%';
    root.querySelectorAll('[data-domain]').forEach(b => { b.disabled = busy() && +b.dataset.domain !== S.domain; });
    root.querySelectorAll('[data-engine],[data-add],[data-remove]').forEach(b => { b.disabled = busy(); });
  }

  function setPhase(type) {
    const phase = type === 'think' ? 'think' : type === 'act' ? 'act' : (type === 'observe' || type === 'error') ? 'observe' : null;
    root.querySelectorAll('.as-loop-node').forEach(n => n.classList.toggle('on', n.dataset.phase === phase));
  }

  // ---------------------------------------------------------------- run engine
  function needsMet(st) { return !st.needs || st.needs.every(id => roster().has(id)); }

  function actOps(st, fail) {
    const ops = [];
    if (fail) {
      ops.push({ ev: { type: 'act', agent: st.agent, tool: st.tool, text: st.text, why: st.why } });
      ops.push({ ev: { type: 'error', agent: st.agent, tool: st.tool, text: `${st.tool} did not answer within 5 seconds (timeout).`, why: 'Real tools fail. A good agent notices the error instead of making up an answer.' } });
      ops.push({ ev: { type: 'think', agent: st.agent, text: 'The tool timed out. I will wait a moment and try again (retry 1 of 3).', why: 'Retrying with a limit is a standard way for agents to recover from errors.' }, retried: true });
    }
    ops.push({ ev: { type: 'act', agent: st.agent, tool: st.tool, text: st.text, why: fail ? 'Second attempt after the timeout.' : st.why } });
    ops.push({ ev: { type: 'observe', agent: st.agent, tool: st.tool, text: st.result, why: 'The agent reads the tool result and adds it to what it knows.' }, effect: st.effect, risky: !!st.risky });
    return ops;
  }

  function buildOps() {
    const d = dom();
    const ops = [];
    let failPending = S.failTool;
    d.script.forEach(st => {
      if (st.type === 'act') {
        if (!roster().has(st.agent)) {
          ops.push({ ev: { type: 'gap', agent: 'lead', text: st.missing, why: 'The lead can only delegate to agents on the team. Instead of inventing an answer, it reports the gap.' }, gap: agentOf(st.agent).name });
        } else if (!needsMet(st)) {
          ops.push({ ev: { type: 'gap', agent: st.agent, text: st.blocked, why: 'This step depends on facts another agent should have found first.' }, gap: null });
        } else if (st.risky) {
          ops.push({ hitl: st });
        } else {
          ops.push(...actOps(st, failPending));
          failPending = false;
        }
      } else if (st.type === 'think') {
        const ok = needsMet(st);
        ops.push({ ev: { type: 'think', agent: st.agent, text: ok ? st.text : st.alt, why: st.why } });
      } else {
        ops.push({ ev: { type: st.type, agent: st.agent, text: st.text, why: st.why } });
      }
    });
    ops.push({ finish: true });
    return ops;
  }

  function startRun() {
    if (busy()) return;
    const e = engine();
    S.run = {
      status: 'running', ops: buildOps(), i: 0, timer: null, events: [], audit: [], effects: [], gaps: [],
      loops: 0, toolCalls: 0, errors: 0, approvals: 0, rejected: false, autoApproved: false, retried: false,
      guardPassed: false, clock: 0, engine: e
    };
    document.getElementById('asTimeline').innerHTML = '';
    ['results', 'tests', 'obs'].forEach(v => setBadge(v, null));
    audit('System', `Run started · model: ${e.name} (${e.vendor}) · team: ${roster().size + 1} agents · human approval ${S.hitl ? 'ON' : 'OFF'}`);
    updateRunUi();
    setView('run');
    schedule(250);
  }

  function schedule(ms) {
    S.run.timer = setTimeout(tick, ms != null ? ms : 950 / S.speed);
  }

  function tick() {
    const r = S.run;
    if (!r || r.status !== 'running') return;
    const op = r.ops[r.i++];
    if (!op) return;
    if (op.finish) return finishRun();
    if (op.hitl) {
      const st = op.hitl;
      if (S.hitl) {
        r.status = 'waiting';
        r.pending = st;
        emit({ type: 'hitl', agent: st.agent, tool: st.tool, text: st.risky.ask, why: 'This action is risky (money or customer impact), so the agent pauses and asks a human first. This is called human-in-the-loop.' });
        audit(agentOf(st.agent).name, `Requested approval: ${st.risky.ask}`, 'flag');
        showApproval(st);
        setBadge('run', '1', { pulse: true });
        updateRunUi();
        return;
      }
      r.autoApproved = true;
      emit({ type: 'auto', agent: st.agent, tool: st.tool, text: `Approved automatically: ${st.risky.ask}`, why: 'Human-in-the-loop is OFF, so the agent acted on its own. Faster, but nobody checked a risky action.' });
      audit(agentOf(st.agent).name, `Risky action ran WITHOUT human approval: ${st.text}`, 'bad');
      r.ops.splice(r.i, 0, ...actOps(st, false));
      return schedule();
    }
    emit(op.ev, op);
    if (r.loops > MAX_LOOPS) return stopRun('Loop limit reached. The run was stopped for safety.');
    schedule();
  }

  function decide(approve) {
    const r = S.run;
    if (!r || r.status !== 'waiting') return;
    const st = r.pending;
    r.pending = null;
    r.status = 'running';
    document.getElementById('asApproval')?.remove();
    setBadge('run', null);
    if (approve) {
      r.approvals++;
      emit({ type: 'human', agent: 'human', text: `You approved: ${st.risky.ask}`, why: 'A person stayed in control of the risky step. The agent now continues.' });
      audit('You (human)', `APPROVED: ${st.text}`);
      r.ops.splice(r.i, 0, ...actOps(st, false));
    } else {
      r.rejected = true;
      emit({ type: 'human', agent: 'human', text: `You rejected: ${st.risky.ask}`, why: 'Agents must respect a "no". The agent switches to a safe fallback plan.' });
      audit('You (human)', `REJECTED: ${st.text}`, 'flag');
      r.ops.splice(r.i, 0, { ev: { type: 'observe', agent: 'lead', text: st.risky.reject, why: 'A good agent has a safe fallback when a human says no.' } });
    }
    updateRunUi();
    schedule(400);
  }

  function stopRun(reason) {
    const r = S.run;
    if (!r || !busy()) return;
    clearTimeout(r.timer);
    document.getElementById('asApproval')?.remove();
    setBadge('run', null);
    r.status = 'stopped';
    const why = typeof reason === 'string' ? reason : 'You pressed Stop. A stop button (often called a kill switch) is a key safety control for autonomous agents.';
    emit({ type: 'stop', agent: 'human', text: 'Run stopped. No further actions will be taken.', why });
    audit('You (human)', 'Run STOPPED before finishing', 'bad');
    endButtons();
    updateRunUi();
    afterRun();
  }

  function finishRun() {
    const r = S.run;
    r.status = 'done';
    const out = outcome();
    const text = {
      success: dom().success,
      partial: `Finished with gaps: ${r.gaps.length ? 'missing ' + r.gaps.join(', ') : 'some steps could not run'}. Add the missing agents and run again.`,
      handoff: dom().handoff
    }[out];
    emit({ type: 'result', agent: 'lead', text, why: 'The agent stops when the goal is met, or when it cannot safely go further.' });
    audit('System', `Run finished · outcome: ${out.toUpperCase()}`);
    endButtons();
    updateRunUi();
    afterRun();
  }

  function afterRun() {
    setPhase(null);
    setBadge('results', '');
    const failed = runTests().filter(t => t.state === 'fail').length;
    setBadge('tests', failed ? String(failed) : null);
    setBadge('obs', '');
    if (S.view !== 'run') setView(S.view);
  }

  function outcome() {
    const r = S.run;
    if (!r) return 'idle';
    if (r.status === 'stopped') return 'stopped';
    if (r.gaps.length || r.events.some(e => e.type === 'gap')) return 'partial';
    if (r.rejected) return 'handoff';
    return 'success';
  }

  // Deterministic "jitter" so numbers look natural but stay repeatable
  const jitter = (n) => 0.85 + ((n * 37) % 31) / 100;

  function emit(ev, op = {}) {
    const r = S.run;
    const [baseMs, baseTok] = COST[ev.type] || [300, 100];
    const n = r.events.length + 1;
    ev.ms = Math.round(baseMs * jitter(n) * (ev.type === 'error' ? 1 : r.engine.pace));
    ev.tokens = Math.round(baseTok * jitter(n + 3));
    ev.start = r.clock;
    r.clock += ev.ms;
    r.events.push(ev);
    if (ev.type === 'act') { r.toolCalls++; r.loops++; audit(agentOf(ev.agent).name, `Tool call → ${ev.tool}: ${ev.text}`); }
    if (ev.type === 'error') { r.errors++; audit(agentOf(ev.agent).name, `Tool error from ${ev.tool}: timeout`, 'bad'); }
    if (ev.type === 'gap') audit(agentOf(ev.agent).name, `Step skipped: ${ev.text}`, 'flag');
    if (ev.type === 'guard') { r.guardPassed = true; audit('Guardrail', ev.text); }
    if (op.gap) r.gaps.push(op.gap);
    if (op.retried) r.retried = true;
    if (op.effect) r.effects.push(op.effect);
    setPhase(ev.type);
    appendEvent(ev);
    updateRunUi();
  }

  function audit(actor, text, level) {
    const r = S.run;
    const t = new Date(Date.UTC(2026, 0, 1, 9, 30, 0) + r.clock);
    const time = t.toISOString().slice(11, 19);
    r.audit.push({ time, actor, text, level });
  }

  function eventHtml(ev) {
    const m = EV[ev.type];
    const a = agentOf(ev.agent);
    const meta = ev.ms || ev.tokens ? `<div class="as-ev-meta">${(ev.ms / 1000).toFixed(2)}s${ev.tokens ? ' · ' + ev.tokens + ' tokens' : ''}</div>` : '';
    return `<div class="as-ev t-${ev.type}">
      <span class="as-ev-ic"><span class="msr">${m.icon}</span></span>
      <div><div class="as-ev-head"><span class="as-ev-type md-tag ${m.tag}">${m.label}</span>
        <span class="as-ev-agent"><span class="msr">${a.icon}</span>${esc(a.name)}</span>
        ${ev.tool ? `<span class="as-ev-tool"><span class="msr" style="font-size:13px;">build</span>${esc(ev.tool)}</span>` : ''}</div>
        <div class="as-ev-text">${esc(ev.text)}</div>
        ${ev.why ? `<div class="as-ev-why"><b>Why:</b> ${esc(ev.why)}</div>` : ''}${meta}</div></div>`;
  }

  function appendEvent(ev) {
    const tl = document.getElementById('asTimeline');
    if (!tl) return;
    tl.querySelector('.lab-empty')?.remove();
    tl.insertAdjacentHTML('beforeend', eventHtml(ev));
    tl.scrollTop = tl.scrollHeight;
  }

  function replayTimeline() {
    const tl = document.getElementById('asTimeline');
    tl.innerHTML = S.run.events.map(eventHtml).join('');
    if (S.run.status === 'waiting') showApproval(S.run.pending);
    if (S.run.status === 'done' || S.run.status === 'stopped') endButtons();
    tl.scrollTop = tl.scrollHeight;
  }

  function showApproval(st) {
    const tl = document.getElementById('asTimeline');
    tl.insertAdjacentHTML('beforeend', `
      <div class="as-hitl" id="asApproval">
        <div class="as-hitl-head"><span class="msr">front_hand</span>Your approval is needed</div>
        <div>${esc(st.risky.ask)}</div>
        <div class="lab-small" style="color:inherit;opacity:.85;">The agent has paused. Nothing happens until you decide.</div>
        <div class="as-hitl-actions">
          <button class="md-btn as-btn-approve" data-decide="1"><span class="msr">check</span>Approve</button>
          <button class="md-btn as-btn-reject" data-decide="0"><span class="msr">block</span>Reject</button>
        </div>
      </div>`);
    tl.querySelectorAll('[data-decide]').forEach(b => b.addEventListener('click', () => decide(b.dataset.decide === '1')));
    tl.scrollTop = tl.scrollHeight;
  }

  function endButtons() {
    const tl = document.getElementById('asTimeline');
    if (!tl || tl.querySelector('.as-end')) return;
    tl.insertAdjacentHTML('beforeend', `<div class="as-end">
      <button class="md-btn md-btn-filled" data-goto="results"><span class="msr">task_alt</span>See results</button>
      <button class="md-btn md-btn-tonal" data-goto="tests"><span class="msr">fact_check</span>Tests &amp; audit</button>
      <button class="md-btn md-btn-tonal" data-goto="obs"><span class="msr">monitoring</span>Observability</button></div>`);
    tl.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => setView(b.dataset.goto)));
    tl.scrollTop = tl.scrollHeight;
  }

  // ---------------------------------------------------------------- RESULTS
  function renderResults() {
    const el = document.getElementById('asView-results');
    const r = S.run;
    if (!r || busy()) {
      el.innerHTML = `<div class="lab-empty"><span class="msr">task_alt</span><div>${r ? 'The agent is still working…' : 'No results yet. Build your team, then run the agent.'}</div>
        ${r ? '' : '<button class="md-btn md-btn-filled" data-goto="run"><span class="msr">play_arrow</span>Go to Run</button>'}</div>`;
      el.querySelector('[data-goto]')?.addEventListener('click', () => setView('run'));
      return;
    }
    const d = dom();
    const out = outcome();
    const banner = {
      success: ['success', 'verified', 'Goal achieved', d.success],
      partial: ['partial', 'warning', 'Partly done', 'Some skills were missing, so the agent did what it safely could and reported the gaps instead of guessing.'],
      handoff: ['handoff', 'support_agent', 'Handed to a human', d.handoff],
      stopped: ['stopped', 'stop_circle', 'Stopped by you', 'The run ended early. Any actions already taken stay in the audit log; nothing else will happen.']
    }[out];
    const tips = {
      success: ['Remove one specialist agent and run again to see how the team copes.', 'Turn off human approval and compare the Tests & Audit results.'],
      partial: [`Add the missing agent${r.gaps.length > 1 ? 's' : ''} in Build: ${r.gaps.join(', ') || 'see the gaps above'}.`, 'Notice that the agent refused to invent facts. That is good agent design.'],
      handoff: ['Run again and approve the action to see the full outcome.', 'Escalating to a human is a valid, safe result for an agent.'],
      stopped: ['Press Run again and let it finish.', 'Check Observability to see where the run stopped.']
    }[out];
    el.innerHTML = `
      <div class="as-banner ${banner[0]}"><span class="msr">${banner[1]}</span><div><div class="md-title-l">${banner[2]}</div><div>${esc(banner[3])}</div></div></div>
      <div class="lab-grid-2">
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">public</span><span class="md-title-m">What changed in the real world</span></div>
          ${r.effects.length ? `<ul class="as-list">${r.effects.map(x => `<li><span class="msr c-green">check_circle</span>${esc(x)}</li>`).join('')}</ul>`
            : '<div class="lab-small">No real-world actions were taken.</div>'}
          ${r.gaps.length ? `<div class="lab-panel-title"><span class="msr c-red">report</span><span class="md-title-s">Missing skills</span></div>
            <ul class="as-list">${r.gaps.map(g => `<li><span class="msr c-red">person_off</span>No ${esc(g)} on the team</li>`).join('')}</ul>` : ''}
        </div>
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">chat</span><span class="md-title-m">Message to the customer</span></div>
          ${out === 'success' ? `<div class="as-reply">${esc(d.reply)}</div>`
            : `<div class="lab-small">${out === 'stopped' ? 'No message was sent because the run was stopped.' : 'A human teammate will follow up, using everything the agent found.'}</div>`}
          <div class="lab-panel-title"><span class="msr">science</span><span class="md-title-s">Try next</span></div>
          <ul class="as-list">${tips.map(t => `<li><span class="msr c-purple">arrow_forward</span>${esc(t)}</li>`).join('')}</ul>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- TESTS & AUDIT
  function runTests() {
    const r = S.run;
    const done = r && !busy();
    const st = (cond, warn) => !done ? 'idle' : cond ? 'pass' : warn ? 'warn' : 'fail';
    const hadRisky = r && r.events.some(e => e.type === 'hitl' || e.type === 'auto');
    return [
      { group: 'BEFORE THE RUN (TESTING)', name: 'Objective and success criteria are written down', state: 'pass' },
      { group: 'BEFORE THE RUN (TESTING)', name: 'Each agent only has the tools it needs (least privilege)', state: 'pass' },
      { group: 'BEFORE THE RUN (TESTING)', name: 'Risky tools are marked as needing approval', state: 'pass' },
      { group: 'AFTER THE RUN (EVALUATION)', name: 'Goal achieved', state: st(outcome() === 'success', outcome() === 'handoff') },
      { group: 'AFTER THE RUN (EVALUATION)', name: 'No guessing: every needed skill had an agent', state: st(r && r.gaps.length === 0 && !r.events.some(e => e.type === 'gap')) },
      { group: 'AFTER THE RUN (EVALUATION)', name: 'Risky actions were approved by a human', state: !done ? 'idle' : !hadRisky ? 'pass' : r.autoApproved ? 'fail' : 'pass' },
      { group: 'AFTER THE RUN (EVALUATION)', name: 'Recovered from a tool failure', state: !done ? 'idle' : !S.failTool && !r.errors ? 'pass' : r.retried && r.status !== 'stopped' ? 'pass' : 'warn', note: done && !r.errors ? 'no failure this run' : '' },
      { group: 'AFTER THE RUN (EVALUATION)', name: 'Guardrail checked the final output', state: st(r && r.guardPassed) },
      { group: 'AFTER THE RUN (EVALUATION)', name: `Stayed within the loop limit (${MAX_LOOPS})`, state: st(r && r.loops <= MAX_LOOPS) }
    ];
  }

  function renderTests() {
    const el = document.getElementById('asView-tests');
    const tests = runTests();
    const r = S.run;
    let group = '';
    const label = { pass: 'PASS', fail: 'FAIL', warn: 'CHECK', idle: 'NOT RUN' };
    const icon = { pass: 'check_circle', fail: 'cancel', warn: 'error', idle: 'radio_button_unchecked' };
    const rows = tests.map((t, i) => {
      const g = t.group !== group ? `<div class="as-test-group">${t.group}</div>` : '';
      group = t.group;
      return `${g}<div class="as-test ${t.state}" style="animation-delay:${i * 40}ms"><span class="msr">${icon[t.state]}</span>
        <span>${esc(t.name)}${t.note ? ` <span class="lab-small">(${esc(t.note)})</span>` : ''}</span><span class="as-test-state">${label[t.state]}</span></div>`;
    }).join('');
    const passed = tests.filter(t => t.state === 'pass').length;
    el.innerHTML = `
      <div class="lab-tip"><span class="msr">lightbulb</span><div><strong>Testing</strong> checks the agent before and after it runs, like unit tests for AI. The <strong>audit log</strong> is the permanent record of every action and decision, which regulated businesses must keep.</div></div>
      <div class="lab-grid-2">
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">fact_check</span><span class="md-title-m">Tests &amp; evaluations</span><span class="lab-panel-aside lab-small">${passed} / ${tests.length} passing</span></div>
          <div class="as-tests">${rows}</div>
        </div>
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">policy</span><span class="md-title-m">Audit log</span><span class="lab-panel-aside lab-small">${r ? r.audit.length : 0} entries</span></div>
          ${r ? `<div class="as-audit"><div class="as-audit-row head"><span>Time</span><span>Who</span><span>What happened</span></div>
            ${r.audit.map(a => `<div class="as-audit-row ${a.level || ''}"><span class="t">${a.time}</span><span>${esc(a.actor)}</span><span>${esc(a.text)}</span></div>`).join('')}</div>`
            : '<div class="lab-empty"><span class="msr">policy</span><div>The audit log fills up when you run the agent.</div></div>'}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- OBSERVABILITY
  function renderObs() {
    const el = document.getElementById('asView-obs');
    const r = S.run;
    const tip = `<div class="lab-tip"><span class="msr">lightbulb</span><div><strong>Observability</strong> shows what happened inside the agent: how long each step took, how many tokens it used (tokens = cost), and where errors happened. Numbers here are simulated for learning.</div></div>`;
    if (!r || !r.events.length) {
      el.innerHTML = tip + '<div class="lab-empty"><span class="msr">monitoring</span><div>Run the agent to see traces, tokens and timing.</div></div>';
      return;
    }
    const tokens = r.events.reduce((s, e) => s + e.tokens, 0);
    const total = Math.max(1, r.clock);
    const kpis = [
      ['steps', 'Steps', r.events.length], ['build', 'Tool calls', r.toolCalls], ['autorenew', 'Loops', r.loops],
      ['token', 'Tokens', tokens.toLocaleString()], ['timer', 'Run time', (total / 1000).toFixed(1) + 's'],
      ['payments', 'Est. cost', '$' + (tokens * PRICE_PER_TOKEN).toFixed(3)], ['error', 'Errors', r.errors],
      ['how_to_reg', 'Human approvals', r.approvals]
    ];
    const byAgent = {};
    r.events.forEach(e => { const n = agentOf(e.agent).name; byAgent[n] = (byAgent[n] || 0) + e.tokens; });
    const maxTok = Math.max(...Object.values(byAgent), 1);
    el.innerHTML = tip + `
      <div class="as-kpis">${kpis.map(([ic, l, v]) => `<div class="as-kpi"><div class="as-kpi-label"><span class="msr">${ic}</span>${l}</div><div class="as-kpi-value">${v}</div></div>`).join('')}</div>
      <div class="lab-grid-run">
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">waterfall_chart</span><span class="md-title-m">Trace: every step on a timeline</span></div>
          <div class="as-wf">${r.events.map((e, i) => `<div class="as-wf-row">
            <span class="as-wf-label"><span class="msr" style="color:var(--tone-${toneOf(e.type)})">${EV[e.type].icon}</span><span title="${esc(e.text)}">${esc(EV[e.type].label.split(' ·')[0])} · ${esc(agentOf(e.agent).name)}</span></span>
            <span class="as-wf-track"><span class="as-wf-bar bg-${e.type}" style="left:${e.start / total * 100}%;width:${Math.max(0.6, e.ms / total * 100)}%;animation-delay:${i * 25}ms"></span></span>
            <span class="as-wf-ms">${(e.ms / 1000).toFixed(2)}s</span></div>`).join('')}</div>
          <div class="lab-small">Long red bars are tool errors (timeouts). Think steps cost the most tokens; tool calls are usually fast.</div>
        </div>
        <div class="lab-panel">
          <div class="lab-panel-title"><span class="msr">token</span><span class="md-title-m">Tokens by agent</span></div>
          <div class="as-bars">${Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([n, t], i) => `<div class="as-bar-row"><span>${esc(n)}</span>
            <span class="as-bar-track"><span class="as-bar-fill" style="display:block;width:${t / maxTok * 100}%;animation-delay:${i * 60}ms"></span></span><b>${t.toLocaleString()}</b></div>`).join('')}</div>
          <div class="lab-small">Model: ${esc(r.engine.name)} (${esc(r.engine.vendor)}). In production these traces come from tools like OpenTelemetry, LangSmith or Langfuse.</div>
        </div>
      </div>`;
  }

  function toneOf(type) {
    return { think: 'purple', act: 'blue', observe: 'green', guard: 'green', result: 'green', hitl: 'amber', human: 'amber', auto: 'amber' }[type] || 'red';
  }

  renderAll();
  setView('build');
})();
