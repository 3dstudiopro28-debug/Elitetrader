"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type Lang = "pt" | "en" | "es";

// ─── Translations ─────────────────────────────────────────────────────────────
const dict = {
  pt: {
    header: {
      riskBanner:
        "Aviso de Risco: Negociar CFDs envolve alto risco e pode não ser adequado para todos os investidores, pois os preços podem oscilar significativamente e resultar em perdas.",
      nav: {
        trading: "Negociação",
        education: "Educação",
        partners: "Parceiros",
        company: "Empresa",
        support: "Suporte",
      },
      trading: {
        forex: "Forex",
        stocks: "Ações",
        metals: "Metais",
        crypto: "Criptomoedas",
      },
      education: {
        beginners: "Iniciantes",
        advanced: "Avançado",
        webinars: "Webinars",
      },
      company: {
        about: "Sobre Nós",
        regulation: "Regulamentação",
        contact: "Contacto",
      },
      support: { faq: "FAQ", chat: "Chat ao Vivo", email: "Email" },
      openAccount: "Abrir uma conta",
      login: "Iniciar sessão",
    },
    footer: {
      description: "Uma forma mais inteligente de abordar os mercados.",
      categories: {
        Products: "Produtos",
        Platforms: "Plataformas",
        Company: "Empresa",
        Legal: "Legal",
      },
      links: {
        "Forex Trading": "Trading Forex",
        "Stock Trading": "Trading de Ações",
        Commodities: "Commodities",
        "Crypto CFDs": "CFDs de Cripto",
        "MetaTrader 5": "MetaTrader 5",
        WebTrader: "WebTrader",
        "Mobile Apps": "Apps Móveis",
        TradingView: "TradingView",
        "Sobre Nós": "Sobre Nós",
        Regulamentação: "Regulamentação",
        Careers: "Carreiras",
        Contact: "Contacto",
        Press: "Imprensa",
        "Privacy Policy": "Política de Privacidade",
        "Terms of Service": "Termos de Serviço",
        "Risk Disclosure": "Aviso de Risco",
        "Cookie Policy": "Política de Cookies",
      },
      riskWarning:
        "<strong>Aviso de Risco:</strong> Negociar CFDs envolve alto risco e pode não ser adequado para todos os investidores, pois os preços podem oscilar significativamente e resultar em perdas. Estes instrumentos complexos requerem conhecimento suficiente. O desempenho passado não é indicativo de resultados futuros.",
      copyright: "Todos os direitos reservados.",
      twitter: "Twitter",
      linkedin: "LinkedIn",
      instagram: "Instagram",
    },
    hero: {
      line1: "Confiança.",
      line2: "Segurança.",
      line3: "Estabilidade.",
      subtext:
        "Uma forma mais inteligente de abordar os mercados. Aprimore seu conhecimento, pratique sem riscos e cresça como trader.",
      cta: "Negociar",
    },
    features: {
      title: "Por que negociar com a",
      items: [
        {
          title: "Conta de Prática de US$ 100.000",
          desc: "Domine a plataforma e teste sua estratégia.",
        },
        {
          title: "Proteção contra Saldo Negativo",
          desc: "Negocie sabendo que você não pode perder mais do que o seu depósito.",
        },
        {
          title: "90% dos Saques Instantâneos",
          desc: "Acesse seus fundos com rapidez e transparência.",
        },
        {
          title: "Corretora Regulamentada",
          desc: "Negocie em uma plataforma que segue padrões rigorosos.",
        },
      ],
    },
    steps: {
      title: "Uma Forma Melhor de",
      titleAccent: "Começar a Negociar",
      items: [
        {
          number: "1",
          title: "Aprenda",
          desc: "Educação clara, sem jargões, para construir sua base de negociação.",
          btn: "Aprenda",
        },
        {
          number: "2",
          title: "Pratique",
          desc: "Teste estratégias com sua conta demo gratuita de US$ 100.000.",
          btn: "Simular",
        },
        {
          number: "3",
          title: "Negocie",
          desc: "Ative sua conta real quando estiver pronto, com depósito mínimo de apenas US$ 250.",
          btn: "Investir",
        },
      ],
    },
    markets: {
      title: "Aceda aos Mercados Globais numa Só Plataforma",
      subtitle:
        "Negocie em múltiplas classes de ativos com condições competitivas.",
      learnMore: "Saiba Mais",
      items: [
        {
          title: "Negociar Metais Preciosos",
          desc: "Negoceie ouro, prata e outros metais preciosos numa plataforma segura e intuitiva.",
        },
        {
          title: "Investir em Ações",
          desc: "Aceda aos mercados globais com spreads competitivos e ferramentas avançadas para todas as estratégias.",
        },
        {
          title: "Negociar Pares Forex",
          desc: "Invista nos líderes do mercado global. Explore moedas de alto desempenho e diversifique o seu portfólio.",
        },
      ],
    },
    platform: {
      title: "Uma Plataforma Pensada para",
      titleAccent: "Você",
      cta: "Negociar",
      items: [
        {
          title: 'Uma Filosofia "Education-First"',
          desc: "Acreditamos em aprender antes de ganhar. Domine o básico antes mesmo de fazer um depósito. Sem pressão, apenas progresso.",
        },
        {
          title: "Acessível por Design",
          desc: "Desde um processo de onboarding simplificado até o depósito mínimo de US$ 250, cada detalhe foi criado para eliminar barreiras.",
        },
        {
          title: "Transparência Radical",
          desc: "Sem taxas ocultas ou jargões confusos. Com calculadoras em tempo real e estruturas de custos claras, você sempre sabe quanto está pagando.",
        },
        {
          title: "Ferramentas Profissionais, Amigáveis para Iniciantes",
          desc: "Acesse gráficos avançados com integração ao TradingView, execução rápida no MT5 e nosso recurso intuitivo de copy trading.",
        },
      ],
    },
    testimonials: {
      title: "Negocie de Forma Mais Inteligente,",
      titleAccent: "Juntos",
      subtitle:
        "Vá além da negociação individual. Nossa plataforma integra recursos sociais que permitem conectar-se a uma comunidade global de traders.",
      items: [
        {
          title: "Uma Comunidade Real de Trading",
          quote:
            "Adoro como é fácil compartilhar ideias e receber feedback de outros traders. EliteTrader torna o trading colaborativo, não solitário.",
          name: "Faisal A.",
          role: "Consultor de negócios",
        },
        {
          title: "Aprenda e Evolua Juntos",
          quote:
            "Finalmente, uma plataforma que combina trading e comunidade. Aprendi mais aqui em dois meses do que em um ano sozinho.",
          name: "Kenji S.",
          role: "Designer de produto",
        },
        {
          title: "Simples, Inteligente e Motivador",
          quote:
            "Interface limpa, ferramentas inteligentes e uma ótima vibe de comunidade. EliteTrader me mantém motivado e focado nos meus objetivos.",
          name: "Anisa Rahman",
          role: "Analista financeiro",
        },
        {
          title: "Aprenda. Negocie. Evolua.",
          quote:
            "Ganhei mais confiança e estratégia aqui em semanas do que em meses negociando sozinho.",
          name: "Marcus T.",
          role: "Consultor de negócios",
        },
      ],
    },
    conditions: {
      title: "Condições Claras. Negociação Simples.",
      subtitle:
        "A sua primeira linha de defesa: conhecer todas as condições. Isso dá a você controle para gerir riscos e continuar aprendendo no seu ritmo.",
      items: [
        { label: "Sem Comissões Ocultas", value: "" },
        { label: "Alavancagem", value: "até 1:1000" },
        { label: "Spreads a partir de", value: "0,4 pips" },
      ],
      cta: "Negociar Agora",
    },
    cta: {
      title: "Pronto para Começar?",
      subtitle:
        "Escolha o seu caminho para os mercados. Active a sua conta em minutos ou pratique gratuitamente com uma conta demo de $100.000.",
      btn1: "Começar a Negociar",
      btn2: "Conta Demo",
    },
    about: {
      badge: "Sobre a EliteTrader",
      heroTitle1: "O Teu Progresso",
      heroTitle2: "Começa Aqui",
      heroSubtext:
        "Acreditamos que com as ferramentas certas, qualquer pessoa pode participar nos mercados financeiros globais. Tornamos o trading acessível, educativo e transparente para traders de todos os níveis em todo o mundo.",
      openAccount: "Criar conta gratuita",
      demoAccount: "Conta Demo $100.000",
      stats: [
        "Instrumentos disponíveis",
        "Alavancagem máxima",
        "Suporte ao cliente",
        "Execução média de ordens",
      ],
      purposeBadge: "O Nosso Propósito",
      missionVision: "Missão & Visão",
      missionTitle: "Nossa Missão",
      missionText:
        "Orientar traders em todas as etapas — da primeira operação à maestria técnica — através de tecnologia clara, educação prática e uma comunidade global de apoio. Removemos as barreiras financeiras e técnicas para que qualquer pessoa possa negociar com confiança e conhecimento.",
      visionTitle: "Nossa Visão",
      visionText:
        "Ser a plataforma de referência global para traders que querem aprender, praticar e evoluir continuamente. Com a EliteTrader, não apenas negocias — cresces. Cada ferramenta, cada recurso e cada interacção é desenhada para te levar ao nível seguinte.",
      pillarsBadge: "Os nossos pilares",
      pillarsTitle: "A Vantagem",
      pillarsSubtext:
        "Toda a plataforma é construída sobre cinco compromissos essenciais que garantem que o teu progresso seja a prioridade em cada detalhe.",
      pillars: [
        {
          letter: "E",
          word: "Excelência",
          text: "Entregamos tecnologia de nível institucional a cada utilizador — gráficos em tempo real, execução de alta velocidade e ferramentas profissionais acessíveis desde o primeiro dia.",
        },
        {
          letter: "L",
          word: "Lealdade",
          text: "O nosso compromisso é com o cliente. Estruturas de custos claras, sem taxas escondidas. Processamos 90% dos levantamentos de forma instantânea e os fundos são mantidos em contas segregadas.",
        },
        {
          letter: "I",
          word: "Inovação",
          text: "Desenvolvemos continuamente novas funcionalidades para que nunca fiques para trás. Da conta demo de $100.000 à integração com TradingView — a plataforma evolui contigo.",
        },
        {
          letter: "T",
          word: "Transparência",
          text: "Comunicamos os riscos de forma honesta. Nunca prometemos retornos garantidos. Acreditamos que um trader informado é um trader mais forte — por isso educamos antes de gerir.",
        },
        {
          letter: "E",
          word: "Evolução",
          text: "Com a EliteTrader, cada operação é uma oportunidade de aprendizado. Recursos educativos, comunidade global e suporte dedicado garantem que o teu progresso seja constante.",
        },
      ],
      trustBadge: "Segurança & Confiança",
      trustTitle: "O que nos distingue",
      trust: [
        "Fundos em contas segregadas",
        "Protecção contra saldo negativo",
        "Plataforma regulada e auditada",
        "Suporte dedicado 24 horas",
        "Presença em mais de 100 países",
        "Educação gratuita para todos",
      ],
      offerBadge: "A Plataforma",
      offerTitle: "Tecnologia profissional,",
      offerTitleAccent: "acessível a todos",
      offerText:
        "A EliteTrader oferece acesso a mais de 150 instrumentos financeiros — Forex, Acções, Metais, Índices, Commodities e Criptomoedas — numa plataforma desenhada para ser intuitiva para iniciantes e poderosa para profissionais.",
      offerFeatures: [
        "Gráficos em tempo real integrados com TradingView",
        "Conta demo de $100.000 sem depósito inicial",
        "Alavancagem até 1:500 em instrumentos seleccionados",
        "Execução instantânea com spreads competitivos",
        "Dashboard profissional com métricas em tempo real",
        "Suporte a ordens pendentes, TP e SL automáticos",
      ],
      ctaBadge: "Junte-se a milhares de traders",
      ctaTitle1: "Pronto para",
      ctaTitle2: "começar a evoluir?",
      ctaSubtext:
        "Não precisas de fazer um depósito para começar. Experimenta a plataforma completa com uma conta demo de $100.000 — sem riscos, sem compromissos.",
      ctaBtn1: "Abrir conta gratuita",
      ctaBtn2: "Entrar na plataforma",
      ctaNote: "Sem cartão de crédito. Sem depósito mínimo. Começa agora.",
    },
    regulation: {
      badge: "Regulamentação & Conformidade",
      heroTitle1: "Autorizado.",
      heroTitle2: "Regulamentado.",
      heroTitle3: "Confiável.",
      heroSubtext:
        "A EliteTrader opera sob licença da Financial Conduct Authority (FCA) do Reino Unido — um dos reguladores financeiros mais rigorosos do mundo. A tua segurança e os teus fundos são a nossa maior responsabilidade.",
      fcaBadgeLabel: "Entidade principal regulada pela",
      licensesBadge: "Licenças",
      licensesTitle: "Regulamentados em Múltiplas Jurisdições",
      licensesSubtext:
        "O grupo EliteTrader opera através de entidades licenciadas em três jurisdições, garantindo conformidade regulatória para clientes em todo o mundo.",
      licenseFields: {
        entity: "Entidade",
        seat: "Sede",
        type: "Tipo",
        date: "Data",
      },
      officeBadge: "Sede Principal",
      officeTitle: "Regulados a partir de",
      officeTitleAccent: "Londres",
      officeText:
        "A nossa entidade principal, EliteTrader Capital Ltd, está registada em Inglaterra e País de Gales (Company No. 11 847 302) e autorizada pela FCA para a prestação de serviços de intermediação de investimentos a retalho e profissionais.",
      officeDetailsTitle: "Detalhes de Registo",
      officeRows: [
        "Company Number",
        "Jurisdição",
        "Autoridade Reguladora",
        "Referência FCA",
        "Estado",
        "Categoria",
        "Data de Autorização",
        "Tipo de Cliente",
      ],
      officeValues: [
        "11 847 302",
        "Inglaterra e País de Gales",
        "Financial Conduct Authority",
        "FRN: 987451",
        "Autorizado",
        "Intermediário de Investimentos",
        "14 de Março de 2019",
        "Retalho & Profissional",
      ],
      protectionsBadge: "Protecção do Cliente",
      protectionsTitle: "Os seus fundos, protegidos",
      protectionsTitleAccent: "a todos os níveis",
      protections: [
        {
          title: "Fundos em Contas Segregadas",
          text: "Os fundos dos clientes são mantidos em contas bancárias separadas dos activos da empresa, em instituições bancárias de Nível I no Reino Unido (Barclays e HSBC). Nunca misturamos fundos de clientes com capital operacional.",
        },
        {
          title: "Protecção FSCS",
          text: "Os clientes do Reino Unido elegíveis estão protegidos pelo Financial Services Compensation Scheme (FSCS) até £85.000 por pessoa, na eventualidade de a empresa se tornar insolvente.",
        },
        {
          title: "Protecção Contra Saldo Negativo",
          text: "A nossa política de Protecção Contra Saldo Negativo (NSP) garante que nunca perdes mais do que depositaste. O saldo da tua conta jamais fica negativo.",
        },
        {
          title: "Transparência Total",
          text: "Publicamos os nossos relatórios financeiros anuais auditados. As nossas métricas de execução — preço de execução, velocidade e derrapagem — estão disponíveis publicamente no nosso portal de qualidade.",
        },
        {
          title: "Política de Melhor Execução",
          text: "Estamos obrigados pela regulamentação MiFID II a executar as tuas ordens nos melhores termos disponíveis. O nosso painel de qualidade de execução é actualizado mensalmente.",
        },
        {
          title: "Gestão de Conflitos de Interesse",
          text: "Mantemos uma política de conflitos de interesse documentada e aprovada pela FCA. Não operamos como market maker nas contas dos clientes — somos 100% STP (Straight-Through Processing).",
        },
      ],
      docsBadge: "Documentação Legal",
      docsTitle: "Documentação Regulatória",
      docsSubtext:
        "Todos os documentos legais estão disponíveis para consulta. A transparência e o cumprimento normativo são compromissos da EliteTrader.",
      docs: [
        { label: "Termos & Condições", desc: "Acordo de Cliente completo" },
        {
          label: "Política de Privacidade",
          desc: "Tratamento de dados pessoais (GDPR)",
        },
        { label: "Aviso de Risco", desc: "Divulgação completa de riscos" },
        {
          label: "Política de Cookies",
          desc: "Utilização e controlo de cookies",
        },
        {
          label: "Política de Melhor Execução",
          desc: "Relatório de qualidade de execução RTS 27/28",
        },
        {
          label: "Política de Conflitos de Interesse",
          desc: "Identificação e gestão de conflitos",
        },
        { label: "Política AML/KYC", desc: "Anti-Lavagem de Dinheiro e KYC" },
        {
          label: "Política de Reclamações",
          desc: "Como apresentar e acompanhar reclamações",
        },
      ],
      riskTitle: "Aviso de Risco — Leia antes de negociar",
      riskText1:
        "Os produtos de CFD são instrumentos complexos e comportam um risco elevado de perda rápida de dinheiro devido à alavancagem.",
      riskBold:
        "72% das contas de investidores não profissionais perdem dinheiro quando negoceiam CFDs com este fornecedor.",
      riskText2:
        "Deve considerar se compreende como funcionam os CFDs e se pode assumir o risco elevado de perder o seu dinheiro.",
      riskText3:
        "EliteTrader Capital Ltd está autorizada e regulada pela Financial Conduct Authority (FRN: 987451). Os serviços e produtos financeiros aqui referidos podem não ser adequados para todos os investidores. O conteúdo deste sítio Web é apenas de carácter informativo e não constitui aconselhamento de investimento.",
      riskFooter:
        "© 2024 EliteTrader Capital Ltd. Registada em Inglaterra e País de Gales · Nº 11 847 302 · Sede: 12 Finsbury Square, 4th Floor, London, EC2A 1AR, United Kingdom",
      ctaBadge: "Negoceia com confiança",
      ctaTitle1: "Uma plataforma segura",
      ctaTitle2: "e regulamentada",
      ctaSubtext:
        "Abre uma conta hoje e beneficia da mesma protecção regulatória que os principais bancos e corretoras do mundo oferecem. Começa com a conta demo gratuita de $100.000 — sem riscos, sem compromissos.",
      ctaBtn1: "Abrir conta segura",
      ctaBtn2: "Sobre a EliteTrader",
    },
    dashboard: {
      balance: "Saldo",
      equity: "Capital Próprio",
      usedMargin: "Margem utilizada",
      freeMargin: "Margem Livre",
      pnl: "Lucro / Perda",
      marginLevel: "Nível de Margem",
      notifications: "Notificações",
      markAllRead: "Marcar todas lidas",
      noNotifications: "Sem notificações",
      clearAll: "Limpar tudo",
      settings: "Configurações",
      portfolio: "Portfólio",
      signOut: "Sair",
      deposit: "Depósito",
      navDashboard: "Painel de instrumentos",
      navAssets: "Lista de ativos",
      navFunds: "Fundos",
      navDeposit: "Depósito",
      navWithdraw: "Levantamento",
      navHistory: "Histórico",
      navPortfolio: "Portfólio",
      navOpenPositions: "Posições Abertas",
      navAccount: "A minha conta",
      navPersonalInfo: "Info pessoal",
      navSecurity: "Configurações",
      navAnalysis: "Análise I.A.",
      navTechnical: "Análise Técnica",
      navRobot: "Robô Elite-IA",
      navHelp: "Ajuda",
      navSupport: "Suporte",
      navEducation: "Educação",
      navPartners: "Parceiros",
      navAdmin: "Admin",
      modeVirtual: "Virtual",
      modeReal: "Real",
      accountId: "ID da conta",
      maxLeverage: "Alavancagem máx.",
      demoBalance: "Saldo demo",
      realBalance: "Saldo real",
      completeProfile: "Complete o seu perfil",
    },
  },

  en: {
    header: {
      riskBanner:
        "Risk Warning: Trading CFDs involves high risk and may not be suitable for all investors, as prices can fluctuate significantly and result in losses.",
      nav: {
        trading: "Trading",
        education: "Education",
        partners: "Partners",
        company: "Company",
        support: "Support",
      },
      trading: {
        forex: "Forex",
        stocks: "Stocks",
        metals: "Metals",
        crypto: "Crypto",
      },
      education: {
        beginners: "Beginners",
        advanced: "Advanced",
        webinars: "Webinars",
      },
      company: {
        about: "About Us",
        regulation: "Regulation",
        contact: "Contact",
      },
      support: { faq: "FAQ", chat: "Live Chat", email: "Email" },
      openAccount: "Open an account",
      login: "Sign in",
    },
    footer: {
      description: "A smarter way to approach the markets.",
      categories: {
        Products: "Products",
        Platforms: "Platforms",
        Company: "Company",
        Legal: "Legal",
      },
      links: {
        "Forex Trading": "Forex Trading",
        "Stock Trading": "Stock Trading",
        Commodities: "Commodities",
        "Crypto CFDs": "Crypto CFDs",
        "MetaTrader 5": "MetaTrader 5",
        WebTrader: "WebTrader",
        "Mobile Apps": "Mobile Apps",
        TradingView: "TradingView",
        "Sobre Nós": "About Us",
        Regulamentação: "Regulation",
        Careers: "Careers",
        Contact: "Contact",
        Press: "Press",
        "Privacy Policy": "Privacy Policy",
        "Terms of Service": "Terms of Service",
        "Risk Disclosure": "Risk Disclosure",
        "Cookie Policy": "Cookie Policy",
      },
      riskWarning:
        "<strong>Risk Warning:</strong> Trading CFDs involves high risk and may not be suitable for all investors, as prices can fluctuate significantly and result in losses. These complex instruments require sufficient knowledge and understanding before trading. Past performance is not indicative of future results. Please ensure you fully understand the risks involved.",
      copyright: "All rights reserved.",
      twitter: "Twitter",
      linkedin: "LinkedIn",
      instagram: "Instagram",
    },
    hero: {
      line1: "Confidence.",
      line2: "Security.",
      line3: "Stability.",
      subtext:
        "A smarter way to approach the markets. Build your knowledge, practice risk-free, and grow as a trader.",
      cta: "Start Trading",
    },
    features: {
      title: "Why trade with",
      items: [
        {
          title: "$100,000 Practice Account",
          desc: "Master the platform and test your strategy risk-free.",
        },
        {
          title: "Negative Balance Protection",
          desc: "Trade knowing you can never lose more than your deposit.",
        },
        {
          title: "90% of Withdrawals Instant",
          desc: "Access your funds quickly and transparently.",
        },
        {
          title: "Regulated Broker",
          desc: "Trade on a platform that follows the highest standards.",
        },
      ],
    },
    steps: {
      title: "A Better Way to",
      titleAccent: "Start Trading",
      items: [
        {
          number: "1",
          title: "Learn",
          desc: "Clear education, no jargon, to build your trading foundation.",
          btn: "Learn",
        },
        {
          number: "2",
          title: "Practice",
          desc: "Test strategies with your free $100,000 demo account.",
          btn: "Simulate",
        },
        {
          number: "3",
          title: "Trade",
          desc: "Activate your live account when ready, with a minimum deposit of just $250.",
          btn: "Invest",
        },
      ],
    },
    markets: {
      title: "Access Global Markets in One Platform",
      subtitle:
        "Trade across multiple asset classes with competitive conditions.",
      learnMore: "Learn More",
      items: [
        {
          title: "Trade Precious Metals",
          desc: "Trade gold, silver, and other precious metals on a secure and intuitive platform.",
        },
        {
          title: "Invest in Stocks",
          desc: "Access global markets with competitive spreads and advanced tools for all strategies.",
        },
        {
          title: "Trade Forex Pairs",
          desc: "Invest in global market leaders. Explore high-performing currencies and diversify your portfolio.",
        },
      ],
    },
    platform: {
      title: "A Platform Designed",
      titleAccent: "for You",
      cta: "Start Trading",
      items: [
        {
          title: "Education-First Philosophy",
          desc: "We believe in learning before earning. Master the basics before making a deposit. No pressure, just progress.",
        },
        {
          title: "Accessible by Design",
          desc: "From a streamlined onboarding to the $250 minimum deposit, every detail was built to remove barriers.",
        },
        {
          title: "Radical Transparency",
          desc: "No hidden fees or confusing jargon. With real-time calculators and clear cost structures, you always know what you're paying.",
        },
        {
          title: "Professional Tools, Beginner-Friendly",
          desc: "Access advanced charts with TradingView integration, fast MT5 execution, and our intuitive copy trading feature.",
        },
      ],
    },
    testimonials: {
      title: "Trade Smarter,",
      titleAccent: "Together",
      subtitle:
        "Go beyond solo trading. Our platform integrates social features that let you connect with a global community of traders.",
      items: [
        {
          title: "A Real Trading Community",
          quote:
            "I love how easy it is to share ideas and get feedback from other traders. EliteTrader makes trading collaborative, not lonely.",
          name: "Faisal A.",
          role: "Business Consultant",
        },
        {
          title: "Learn and Grow Together",
          quote:
            "Finally, a platform that combines trading and community. I've learned more here in two months than in a year on my own.",
          name: "Kenji S.",
          role: "Product Designer",
        },
        {
          title: "Simple, Smart and Motivating",
          quote:
            "Clean interface, smart tools and a great community vibe. EliteTrader keeps me motivated and focused on my goals.",
          name: "Anisa Rahman",
          role: "Financial Analyst",
        },
        {
          title: "Learn. Trade. Evolve.",
          quote:
            "I gained more confidence and strategy here in weeks than in months of solo trading.",
          name: "Marcus T.",
          role: "Business Consultant",
        },
      ],
    },
    conditions: {
      title: "Clear Conditions. Simple Trading.",
      subtitle:
        "Your first line of defense: knowing every condition. This gives you control to manage risks and keep learning at your own pace.",
      items: [
        { label: "No Hidden Commissions", value: "" },
        { label: "Leverage", value: "up to 1:1000" },
        { label: "Spreads from", value: "0.4 pips" },
      ],
      cta: "Trade Now",
    },
    cta: {
      title: "Ready to Get Started?",
      subtitle:
        "Choose your path to the markets. Activate your account in minutes or practice for free with a $100,000 demo account.",
      btn1: "Start Trading",
      btn2: "Try Demo Account",
    },
    about: {
      badge: "About EliteTrader",
      heroTitle1: "Your Progress",
      heroTitle2: "Starts Here",
      heroSubtext:
        "We believe that with the right tools, anyone can participate in global financial markets. We make trading accessible, educational and transparent for traders of all levels worldwide.",
      openAccount: "Create free account",
      demoAccount: "Demo Account $100,000",
      stats: [
        "Available instruments",
        "Maximum leverage",
        "Customer support",
        "Average order execution",
      ],
      purposeBadge: "Our Purpose",
      missionVision: "Mission & Vision",
      missionTitle: "Our Mission",
      missionText:
        "To guide traders at every step — from the first trade to technical mastery — through clear technology, practical education and a supportive global community. We remove financial and technical barriers so anyone can trade with confidence and knowledge.",
      visionTitle: "Our Vision",
      visionText:
        "To be the global reference platform for traders who want to continuously learn, practice and evolve. With EliteTrader, you don't just trade — you grow. Every tool, every resource and every interaction is designed to take you to the next level.",
      pillarsBadge: "Our pillars",
      pillarsTitle: "The",
      pillarsSubtext:
        "The entire platform is built on five essential commitments that ensure your progress is the priority in every detail.",
      pillars: [
        {
          letter: "E",
          word: "Excellence",
          text: "We deliver institutional-grade technology to every user — real-time charts, high-speed execution and professional tools accessible from day one.",
        },
        {
          letter: "L",
          word: "Loyalty",
          text: "Our commitment is to the client. Clear cost structures, no hidden fees. We process 90% of withdrawals instantly and funds are held in segregated accounts.",
        },
        {
          letter: "I",
          word: "Innovation",
          text: "We continuously develop new features so you never fall behind. From the $100,000 demo account to TradingView integration — the platform evolves with you.",
        },
        {
          letter: "T",
          word: "Transparency",
          text: "We communicate risks honestly. We never promise guaranteed returns. We believe an informed trader is a stronger trader — that's why we educate before managing.",
        },
        {
          letter: "E",
          word: "Evolution",
          text: "With EliteTrader, every trade is a learning opportunity. Educational resources, global community and dedicated support ensure your progress is constant.",
        },
      ],
      trustBadge: "Security & Trust",
      trustTitle: "What sets us apart",
      trust: [
        "Funds in segregated accounts",
        "Negative balance protection",
        "Regulated and audited platform",
        "Dedicated 24-hour support",
        "Presence in over 100 countries",
        "Free education for everyone",
      ],
      offerBadge: "The Platform",
      offerTitle: "Professional technology,",
      offerTitleAccent: "accessible to all",
      offerText:
        "EliteTrader offers access to over 150 financial instruments — Forex, Stocks, Metals, Indices, Commodities and Cryptocurrencies — on a platform designed to be intuitive for beginners and powerful for professionals.",
      offerFeatures: [
        "Real-time charts integrated with TradingView",
        "Demo account with $100,000 — no initial deposit",
        "Leverage up to 1:500 on selected instruments",
        "Instant execution with competitive spreads",
        "Professional dashboard with real-time metrics",
        "Pending orders, automatic TP and SL support",
      ],
      ctaBadge: "Join thousands of traders",
      ctaTitle1: "Ready to",
      ctaTitle2: "start evolving?",
      ctaSubtext:
        "You don't need to make a deposit to get started. Try the full platform with a $100,000 demo account — no risk, no commitment.",
      ctaBtn1: "Open free account",
      ctaBtn2: "Enter the platform",
      ctaNote: "No credit card. No minimum deposit. Start now.",
    },
    regulation: {
      badge: "Regulation & Compliance",
      heroTitle1: "Authorised.",
      heroTitle2: "Regulated.",
      heroTitle3: "Trusted.",
      heroSubtext:
        "EliteTrader operates under a licence from the Financial Conduct Authority (FCA) of the United Kingdom — one of the most rigorous financial regulators in the world. Your safety and your funds are our greatest responsibility.",
      fcaBadgeLabel: "Principal entity regulated by",
      licensesBadge: "Licences",
      licensesTitle: "Regulated Across Multiple Jurisdictions",
      licensesSubtext:
        "The EliteTrader group operates through licensed entities in three jurisdictions, ensuring regulatory compliance for clients worldwide.",
      licenseFields: {
        entity: "Entity",
        seat: "Registered",
        type: "Type",
        date: "Date",
      },
      officeBadge: "Principal Office",
      officeTitle: "Regulated from",
      officeTitleAccent: "London",
      officeText:
        "Our principal entity, EliteTrader Capital Ltd, is registered in England and Wales (Company No. 11 847 302) and authorised by the FCA to provide retail and professional investment intermediation services.",
      officeDetailsTitle: "Registration Details",
      officeRows: [
        "Company Number",
        "Jurisdiction",
        "Regulatory Authority",
        "FCA Reference",
        "Status",
        "Category",
        "Authorisation Date",
        "Client Type",
      ],
      officeValues: [
        "11 847 302",
        "England and Wales",
        "Financial Conduct Authority",
        "FRN: 987451",
        "Authorised",
        "Investment Intermediary",
        "14 March 2019",
        "Retail & Professional",
      ],
      protectionsBadge: "Client Protection",
      protectionsTitle: "Your funds, protected",
      protectionsTitleAccent: "at every level",
      protections: [
        {
          title: "Funds in Segregated Accounts",
          text: "Client funds are held in bank accounts separate from company assets at Tier 1 banking institutions in the UK (Barclays and HSBC). We never mix client funds with operating capital.",
        },
        {
          title: "FSCS Protection",
          text: "Eligible UK clients are protected by the Financial Services Compensation Scheme (FSCS) up to £85,000 per person in the event of the company becoming insolvent.",
        },
        {
          title: "Negative Balance Protection",
          text: "Our Negative Balance Protection (NBP) policy ensures you never lose more than you deposited. Your account balance will never go negative.",
        },
        {
          title: "Full Transparency",
          text: "We publish our audited annual financial reports. Our execution metrics — execution price, speed and slippage — are publicly available on our quality portal.",
        },
        {
          title: "Best Execution Policy",
          text: "We are obligated under MiFID II regulation to execute your orders on the best available terms. Our execution quality dashboard is updated monthly.",
        },
        {
          title: "Conflict of Interest Management",
          text: "We maintain a conflict of interest policy documented and approved by the FCA. We do not operate as market maker on client accounts — we are 100% STP (Straight-Through Processing).",
        },
      ],
      docsBadge: "Legal Documentation",
      docsTitle: "Regulatory Documentation",
      docsSubtext:
        "All legal documents are available for consultation. Transparency and regulatory compliance are EliteTrader's commitments.",
      docs: [
        { label: "Terms & Conditions", desc: "Full Client Agreement" },
        { label: "Privacy Policy", desc: "Personal data processing (GDPR)" },
        { label: "Risk Disclosure", desc: "Full risk disclosure" },
        { label: "Cookie Policy", desc: "Cookie use and control" },
        {
          label: "Best Execution Policy",
          desc: "Execution quality report RTS 27/28",
        },
        {
          label: "Conflict of Interest Policy",
          desc: "Conflict identification and management",
        },
        { label: "AML/KYC Policy", desc: "Anti-Money Laundering and KYC" },
        {
          label: "Complaints Policy",
          desc: "How to submit and track complaints",
        },
      ],
      riskTitle: "Risk Warning — Read before trading",
      riskText1:
        "CFD products are complex instruments and carry a high risk of losing money rapidly due to leverage.",
      riskBold:
        "72% of retail investor accounts lose money when trading CFDs with this provider.",
      riskText2:
        "You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.",
      riskText3:
        "EliteTrader Capital Ltd is authorised and regulated by the Financial Conduct Authority (FRN: 987451). The financial services and products referred to here may not be suitable for all investors. The content of this website is for informational purposes only and does not constitute investment advice.",
      riskFooter:
        "© 2024 EliteTrader Capital Ltd. Registered in England and Wales · No. 11 847 302 · Registered Office: 12 Finsbury Square, 4th Floor, London, EC2A 1AR, United Kingdom",
      ctaBadge: "Trade with confidence",
      ctaTitle1: "A safe platform",
      ctaTitle2: "and regulated",
      ctaSubtext:
        "Open an account today and benefit from the same regulatory protection that the world's leading banks and brokers offer. Start with the free $100,000 demo account — no risk, no commitment.",
      ctaBtn1: "Open secure account",
      ctaBtn2: "About EliteTrader",
    },
    dashboard: {
      balance: "Balance",
      equity: "Equity",
      usedMargin: "Used Margin",
      freeMargin: "Free Margin",
      pnl: "Profit / Loss",
      marginLevel: "Margin Level",
      notifications: "Notifications",
      markAllRead: "Mark all read",
      noNotifications: "No notifications",
      clearAll: "Clear all",
      settings: "Settings",
      portfolio: "Portfolio",
      signOut: "Sign Out",
      deposit: "Deposit",
      navDashboard: "Dashboard",
      navAssets: "Asset list",
      navFunds: "Funds",
      navDeposit: "Deposit",
      navWithdraw: "Withdrawal",
      navHistory: "History",
      navPortfolio: "Portfolio",
      navOpenPositions: "Open Positions",
      navAccount: "My Account",
      navPersonalInfo: "Personal info",
      navSecurity: "Settings",
      navAnalysis: "A.I. Analysis",
      navTechnical: "Technical Analysis",
      navRobot: "Elite-IA Robot",
      navHelp: "Help",
      navSupport: "Support",
      navEducation: "Education",
      navPartners: "Partners",
      navAdmin: "Admin",
      modeVirtual: "Virtual",
      modeReal: "Real",
      accountId: "Account ID",
      maxLeverage: "Max leverage",
      demoBalance: "Demo balance",
      realBalance: "Real balance",
      completeProfile: "Complete your profile",
    },
  },

  es: {
    header: {
      riskBanner:
        "Aviso de Riesgo: Operar con CFDs implica un alto riesgo y puede no ser adecuado para todos los inversores, ya que los precios pueden fluctuar significativamente y generar pérdidas.",
      nav: {
        trading: "Operaciones",
        education: "Educación",
        partners: "Socios",
        company: "Empresa",
        support: "Soporte",
      },
      trading: {
        forex: "Forex",
        stocks: "Acciones",
        metals: "Metales",
        crypto: "Cripto",
      },
      education: {
        beginners: "Principiantes",
        advanced: "Avanzado",
        webinars: "Webinars",
      },
      company: {
        about: "Sobre Nosotros",
        regulation: "Regulación",
        contact: "Contacto",
      },
      support: { faq: "FAQ", chat: "Chat en Vivo", email: "Email" },
      openAccount: "Abrir una cuenta",
      login: "Iniciar sesión",
    },
    footer: {
      description: "Una forma más inteligente de abordar los mercados.",
      categories: {
        Products: "Productos",
        Platforms: "Plataformas",
        Company: "Empresa",
        Legal: "Legal",
      },
      links: {
        "Forex Trading": "Trading Forex",
        "Stock Trading": "Trading de Acciones",
        Commodities: "Materias Primas",
        "Crypto CFDs": "CFDs de Cripto",
        "MetaTrader 5": "MetaTrader 5",
        WebTrader: "WebTrader",
        "Mobile Apps": "Apps Móviles",
        TradingView: "TradingView",
        "Sobre Nós": "Sobre Nosotros",
        Regulamentação: "Regulación",
        Careers: "Carreras",
        Contact: "Contacto",
        Press: "Prensa",
        "Privacy Policy": "Política de Privacidad",
        "Terms of Service": "Términos de Servicio",
        "Risk Disclosure": "Aviso de Riesgo",
        "Cookie Policy": "Política de Cookies",
      },
      riskWarning:
        "<strong>Aviso de Riesgo:</strong> Operar con CFDs implica un alto riesgo y puede no ser adecuado para todos los inversores, ya que los precios pueden fluctuar significativamente y generar pérdidas. Estos instrumentos complejos requieren conocimiento suficiente. El rendimiento pasado no es indicativo de resultados futuros.",
      copyright: "Todos los derechos reservados.",
      twitter: "Twitter",
      linkedin: "LinkedIn",
      instagram: "Instagram",
    },
    hero: {
      line1: "Confianza.",
      line2: "Seguridad.",
      line3: "Estabilidad.",
      subtext:
        "Una forma más inteligente de abordar los mercados. Amplía tu conocimiento, practica sin riesgos y crece como trader.",
      cta: "Operar",
    },
    features: {
      title: "¿Por qué operar con",
      items: [
        {
          title: "Cuenta de Práctica de $100.000",
          desc: "Domina la plataforma y prueba tu estrategia sin riesgos.",
        },
        {
          title: "Protección contra Saldo Negativo",
          desc: "Opera sabiendo que nunca puedes perder más de lo que depositaste.",
        },
        {
          title: "90% de Retiros Instantáneos",
          desc: "Accede a tus fondos con rapidez y transparencia.",
        },
        {
          title: "Bróker Regulado",
          desc: "Opera en una plataforma que sigue los estándares más exigentes.",
        },
      ],
    },
    steps: {
      title: "Una Mejor Forma de",
      titleAccent: "Empezar a Operar",
      items: [
        {
          number: "1",
          title: "Aprende",
          desc: "Educación clara, sin jerga, para construir tu base de trading.",
          btn: "Aprender",
        },
        {
          number: "2",
          title: "Practica",
          desc: "Prueba estrategias con tu cuenta demo gratuita de $100.000.",
          btn: "Simular",
        },
        {
          number: "3",
          title: "Opera",
          desc: "Activa tu cuenta real cuando estés listo, con un depósito mínimo de solo $250.",
          btn: "Invertir",
        },
      ],
    },
    markets: {
      title: "Accede a los Mercados Globales en Una Plataforma",
      subtitle:
        "Opera en múltiples clases de activos con condiciones competitivas.",
      learnMore: "Saber Más",
      items: [
        {
          title: "Operar Metales Preciosos",
          desc: "Opera con oro, plata y otros metales preciosos en una plataforma segura e intuitiva.",
        },
        {
          title: "Invertir en Acciones",
          desc: "Accede a mercados globales con spreads competitivos y herramientas avanzadas para todas las estrategias.",
        },
        {
          title: "Operar Pares Forex",
          desc: "Invierte en líderes del mercado global. Explora divisas de alto rendimiento y diversifica tu cartera.",
        },
      ],
    },
    platform: {
      title: "Una Plataforma Pensada",
      titleAccent: "para Ti",
      cta: "Operar",
      items: [
        {
          title: 'Filosofía "Education-First"',
          desc: "Creemos en aprender antes de ganar. Domina lo básico antes de hacer un depósito. Sin presión, solo progreso.",
        },
        {
          title: "Accesible por Diseño",
          desc: "Desde un proceso de incorporación simplificado hasta el depósito mínimo de $250, cada detalle fue diseñado para eliminar barreras.",
        },
        {
          title: "Transparencia Radical",
          desc: "Sin comisiones ocultas ni jerga confusa. Con calculadoras en tiempo real y estructuras de costos claras, siempre sabes cuánto pagas.",
        },
        {
          title: "Herramientas Profesionales, Amigables para Principiantes",
          desc: "Accede a gráficos avanzados con integración de TradingView, ejecución rápida en MT5 y nuestra función intuitiva de copy trading.",
        },
      ],
    },
    testimonials: {
      title: "Opera de Forma Más Inteligente,",
      titleAccent: "Juntos",
      subtitle:
        "Ve más allá del trading individual. Nuestra plataforma integra funciones sociales que te permiten conectar con una comunidad global de traders.",
      items: [
        {
          title: "Una Comunidad Real de Trading",
          quote:
            "Me encanta lo fácil que es compartir ideas y recibir retroalimentación de otros traders. EliteTrader hace que el trading sea colaborativo, no solitario.",
          name: "Faisal A.",
          role: "Consultor de negocios",
        },
        {
          title: "Aprende y Crece Juntos",
          quote:
            "Por fin, una plataforma que combina trading y comunidad. He aprendido más aquí en dos meses que en un año por mi cuenta.",
          name: "Kenji S.",
          role: "Diseñador de producto",
        },
        {
          title: "Simple, Inteligente y Motivador",
          quote:
            "Interfaz limpia, herramientas inteligentes y un gran ambiente de comunidad. EliteTrader me mantiene motivado y enfocado en mis objetivos.",
          name: "Anisa Rahman",
          role: "Analista financiero",
        },
        {
          title: "Aprende. Opera. Evoluciona.",
          quote:
            "Gané más confianza y estrategia aquí en semanas que en meses operando solo.",
          name: "Marcus T.",
          role: "Consultor de negocios",
        },
      ],
    },
    conditions: {
      title: "Condiciones Claras. Trading Simple.",
      subtitle:
        "Tu primera línea de defensa: conocer cada condición. Esto te da control para gestionar riesgos y seguir aprendiendo a tu ritmo.",
      items: [
        { label: "Sin Comisiones Ocultas", value: "" },
        { label: "Apalancamiento", value: "hasta 1:1000" },
        { label: "Spreads desde", value: "0,4 pips" },
      ],
      cta: "Operar Ahora",
    },
    cta: {
      title: "¿Listo para Empezar?",
      subtitle:
        "Elige tu camino hacia los mercados. Activa tu cuenta en minutos o practica gratis con una cuenta demo de $100.000.",
      btn1: "Empezar a Operar",
      btn2: "Cuenta Demo",
    },
    about: {
      badge: "Sobre EliteTrader",
      heroTitle1: "Tu Progreso",
      heroTitle2: "Empieza Aquí",
      heroSubtext:
        "Creemos que con las herramientas adecuadas, cualquier persona puede participar en los mercados financieros globales. Hacemos el trading accesible, educativo y transparente para traders de todos los niveles en todo el mundo.",
      openAccount: "Crear cuenta gratuita",
      demoAccount: "Cuenta Demo $100.000",
      stats: [
        "Instrumentos disponibles",
        "Apalancamiento máximo",
        "Soporte al cliente",
        "Ejecución media de órdenes",
      ],
      purposeBadge: "Nuestro Propósito",
      missionVision: "Misión & Visión",
      missionTitle: "Nuestra Misión",
      missionText:
        "Guiar a los traders en cada etapa — desde la primera operación hasta la maestría técnica — a través de tecnología clara, educación práctica y una comunidad global de apoyo. Eliminamos las barreras financieras y técnicas para que cualquier persona pueda operar con confianza y conocimiento.",
      visionTitle: "Nuestra Visión",
      visionText:
        "Ser la plataforma de referencia global para traders que quieren aprender, practicar y evolucionar continuamente. Con EliteTrader, no solo operas — creces. Cada herramienta, cada recurso y cada interacción está diseñada para llevarte al siguiente nivel.",
      pillarsBadge: "Nuestros pilares",
      pillarsTitle: "La Ventaja",
      pillarsSubtext:
        "Toda la plataforma está construida sobre cinco compromisos esenciales que garantizan que tu progreso sea la prioridad en cada detalle.",
      pillars: [
        {
          letter: "E",
          word: "Excelencia",
          text: "Entregamos tecnología de nivel institucional a cada usuario — gráficos en tiempo real, ejecución de alta velocidad y herramientas profesionales accesibles desde el primer día.",
        },
        {
          letter: "L",
          word: "Lealtad",
          text: "Nuestro compromiso es con el cliente. Estructuras de costos claras, sin tarifas ocultas. Procesamos el 90% de los retiros de forma instantánea y los fondos se mantienen en cuentas segregadas.",
        },
        {
          letter: "I",
          word: "Innovación",
          text: "Desarrollamos continuamente nuevas funcionalidades para que nunca te quedes atrás. Desde la cuenta demo de $100.000 hasta la integración con TradingView — la plataforma evoluciona contigo.",
        },
        {
          letter: "T",
          word: "Transparencia",
          text: "Comunicamos los riesgos de forma honesta. Nunca prometemos rendimientos garantizados. Creemos que un trader informado es un trader más fuerte — por eso educamos antes de gestionar.",
        },
        {
          letter: "E",
          word: "Evolución",
          text: "Con EliteTrader, cada operación es una oportunidad de aprendizaje. Recursos educativos, comunidad global y soporte dedicado garantizan que tu progreso sea constante.",
        },
      ],
      trustBadge: "Seguridad & Confianza",
      trustTitle: "Lo que nos distingue",
      trust: [
        "Fondos en cuentas segregadas",
        "Protección contra saldo negativo",
        "Plataforma regulada y auditada",
        "Soporte dedicado 24 horas",
        "Presencia en más de 100 países",
        "Educación gratuita para todos",
      ],
      offerBadge: "La Plataforma",
      offerTitle: "Tecnología profesional,",
      offerTitleAccent: "accesible para todos",
      offerText:
        "EliteTrader ofrece acceso a más de 150 instrumentos financieros — Forex, Acciones, Metales, Índices, Materias Primas y Criptomonedas — en una plataforma diseñada para ser intuitiva para principiantes y poderosa para profesionales.",
      offerFeatures: [
        "Gráficos en tiempo real integrados con TradingView",
        "Cuenta demo de $100.000 sin depósito inicial",
        "Apalancamiento hasta 1:500 en instrumentos seleccionados",
        "Ejecución instantánea con spreads competitivos",
        "Dashboard profesional con métricas en tiempo real",
        "Soporte para órdenes pendientes, TP y SL automáticos",
      ],
      ctaBadge: "Únete a miles de traders",
      ctaTitle1: "¿Listo para",
      ctaTitle2: "empezar a evolucionar?",
      ctaSubtext:
        "No necesitas hacer un depósito para empezar. Prueba la plataforma completa con una cuenta demo de $100.000 — sin riesgos, sin compromisos.",
      ctaBtn1: "Abrir cuenta gratuita",
      ctaBtn2: "Entrar a la plataforma",
      ctaNote: "Sin tarjeta de crédito. Sin depósito mínimo. Empieza ahora.",
    },
    regulation: {
      badge: "Regulación & Cumplimiento",
      heroTitle1: "Autorizado.",
      heroTitle2: "Regulado.",
      heroTitle3: "Confiable.",
      heroSubtext:
        "EliteTrader opera bajo licencia de la Financial Conduct Authority (FCA) del Reino Unido — uno de los reguladores financieros más rigurosos del mundo. Tu seguridad y tus fondos son nuestra mayor responsabilidad.",
      fcaBadgeLabel: "Entidad principal regulada por",
      licensesBadge: "Licencias",
      licensesTitle: "Regulados en Múltiples Jurisdicciones",
      licensesSubtext:
        "El grupo EliteTrader opera a través de entidades licenciadas en tres jurisdicciones, garantizando el cumplimiento regulatorio para clientes en todo el mundo.",
      licenseFields: {
        entity: "Entidad",
        seat: "Sede",
        type: "Tipo",
        date: "Fecha",
      },
      officeBadge: "Sede Principal",
      officeTitle: "Regulados desde",
      officeTitleAccent: "Londres",
      officeText:
        "Nuestra entidad principal, EliteTrader Capital Ltd, está registrada en Inglaterra y Gales (Company No. 11 847 302) y autorizada por la FCA para la prestación de servicios de intermediación de inversiones a minoristas y profesionales.",
      officeDetailsTitle: "Detalles de Registro",
      officeRows: [
        "Número de empresa",
        "Jurisdicción",
        "Autoridad Reguladora",
        "Referencia FCA",
        "Estado",
        "Categoría",
        "Fecha de Autorización",
        "Tipo de Cliente",
      ],
      officeValues: [
        "11 847 302",
        "Inglaterra y Gales",
        "Financial Conduct Authority",
        "FRN: 987451",
        "Autorizado",
        "Intermediario de Inversiones",
        "14 de marzo de 2019",
        "Minorista y Profesional",
      ],
      protectionsBadge: "Protección del Cliente",
      protectionsTitle: "Sus fondos, protegidos",
      protectionsTitleAccent: "a todos los niveles",
      protections: [
        {
          title: "Fondos en Cuentas Segregadas",
          text: "Los fondos de los clientes se mantienen en cuentas bancarias separadas de los activos de la empresa, en instituciones bancarias de Nivel I en el Reino Unido (Barclays y HSBC). Nunca mezclamos fondos de clientes con capital operativo.",
        },
        {
          title: "Protección FSCS",
          text: "Los clientes del Reino Unido elegibles están protegidos por el Financial Services Compensation Scheme (FSCS) hasta £85.000 por persona, en caso de que la empresa se vuelva insolvente.",
        },
        {
          title: "Protección contra Saldo Negativo",
          text: "Nuestra política de Protección contra Saldo Negativo (NSP) garantiza que nunca pierdas más de lo que depositaste. El saldo de tu cuenta nunca será negativo.",
        },
        {
          title: "Transparencia Total",
          text: "Publicamos nuestros informes financieros anuales auditados. Nuestras métricas de ejecución — precio de ejecución, velocidad y deslizamiento — están disponibles públicamente en nuestro portal de calidad.",
        },
        {
          title: "Política de Mejor Ejecución",
          text: "Estamos obligados por la regulación MiFID II a ejecutar tus órdenes en los mejores términos disponibles. Nuestro panel de calidad de ejecución se actualiza mensualmente.",
        },
        {
          title: "Gestión de Conflictos de Interés",
          text: "Mantenemos una política de conflictos de interés documentada y aprobada por la FCA. No operamos como market maker en las cuentas de los clientes — somos 100% STP (Straight-Through Processing).",
        },
      ],
      docsBadge: "Documentación Legal",
      docsTitle: "Documentación Regulatoria",
      docsSubtext:
        "Todos los documentos legales están disponibles para consulta. La transparencia y el cumplimiento normativo son compromisos de EliteTrader.",
      docs: [
        {
          label: "Términos y Condiciones",
          desc: "Acuerdo de Cliente completo",
        },
        {
          label: "Política de Privacidad",
          desc: "Tratamiento de datos personales (GDPR)",
        },
        { label: "Aviso de Riesgo", desc: "Divulgación completa de riesgos" },
        { label: "Política de Cookies", desc: "Uso y control de cookies" },
        {
          label: "Política de Mejor Ejecución",
          desc: "Informe de calidad de ejecución RTS 27/28",
        },
        {
          label: "Política de Conflictos de Interés",
          desc: "Identificación y gestión de conflictos",
        },
        { label: "Política AML/KYC", desc: "Anti-Lavado de Dinero y KYC" },
        {
          label: "Política de Reclamaciones",
          desc: "Cómo presentar y seguir reclamaciones",
        },
      ],
      riskTitle: "Aviso de Riesgo — Lea antes de operar",
      riskText1:
        "Los productos CFD son instrumentos complejos y conllevan un alto riesgo de perder dinero rápidamente debido al apalancamiento.",
      riskBold:
        "El 72% de las cuentas de inversores minoristas pierden dinero al operar CFDs con este proveedor.",
      riskText2:
        "Debe considerar si entiende cómo funcionan los CFDs y si puede permitirse asumir el alto riesgo de perder su dinero.",
      riskText3:
        "EliteTrader Capital Ltd está autorizada y regulada por la Financial Conduct Authority (FRN: 987451). Los servicios y productos financieros aquí mencionados pueden no ser adecuados para todos los inversores. El contenido de este sitio web es solo informativo y no constituye asesoramiento de inversión.",
      riskFooter:
        "© 2024 EliteTrader Capital Ltd. Registrada en Inglaterra y Gales · Nº 11 847 302 · Sede: 12 Finsbury Square, 4th Floor, London, EC2A 1AR, United Kingdom",
      ctaBadge: "Opera con confianza",
      ctaTitle1: "Una plataforma segura",
      ctaTitle2: "y regulada",
      ctaSubtext:
        "Abre una cuenta hoy y benefíciate de la misma protección regulatoria que ofrecen los principales bancos y brokers del mundo. Empieza con la cuenta demo gratuita de $100.000 — sin riesgos, sin compromisos.",
      ctaBtn1: "Abrir cuenta segura",
      ctaBtn2: "Sobre EliteTrader",
    },
    dashboard: {
      balance: "Saldo",
      equity: "Capital Propio",
      usedMargin: "Margen utilizado",
      freeMargin: "Margen Libre",
      pnl: "Ganancia / Pérdida",
      marginLevel: "Nivel de Margen",
      notifications: "Notificaciones",
      markAllRead: "Marcar todo leído",
      noNotifications: "Sin notificaciones",
      clearAll: "Limpiar todo",
      settings: "Configuraciones",
      portfolio: "Portafolio",
      signOut: "Cerrar sesión",
      deposit: "Depósito",
      navDashboard: "Panel de control",
      navAssets: "Lista de activos",
      navFunds: "Fondos",
      navDeposit: "Depósito",
      navWithdraw: "Retiro",
      navHistory: "Historial",
      navPortfolio: "Portafolio",
      navOpenPositions: "Posiciones Abiertas",
      navAccount: "Mi cuenta",
      navPersonalInfo: "Info personal",
      navSecurity: "Configuraciones",
      navAnalysis: "Análisis I.A.",
      navTechnical: "Análisis Técnico",
      navRobot: "Robot Elite-IA",
      navHelp: "Ayuda",
      navSupport: "Soporte",
      navEducation: "Educación",
      navPartners: "Socios",
      navAdmin: "Admin",
      modeVirtual: "Virtual",
      modeReal: "Real",
      accountId: "ID de cuenta",
      maxLeverage: "Apalancamiento máx.",
      demoBalance: "Saldo demo",
      realBalance: "Saldo real",
      completeProfile: "Completa tu perfil",
    },
  },
} as const;

export type Translations = typeof dict.pt;

const typedDict = dict as unknown as Record<Lang, Translations>;

// ─── Context ──────────────────────────────────────────────────────────────────
const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}>({ lang: "pt", setLang: () => {}, t: dict.pt });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const dispToCtx: Record<string, Lang> = {
      en: "en",
      ar: "en",
      ko: "en",
      ja: "en",
      zh: "en",
      pt: "pt",
      es: "es",
    };
    const saved = localStorage.getItem("elite_lang");
    if (saved && dispToCtx[saved]) setLangState(dispToCtx[saved]);
  }, []);

  useEffect(() => {
    const htmlLang = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
    document.documentElement.setAttribute("lang", htmlLang);
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("elite_lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: typedDict[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
