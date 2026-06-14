/* ============================================================
   APP_DATA — placeholder content (to be replaced with real
   题库 / 专业数据 later). Structured so swapping is trivial.
   v2: 30 题 · 22 产业(3组) · 专业池含 科目要求/就业评级/诚实提示
   ============================================================ */
(function () {
  // Holland (RIASEC) dimensions
  const HOLLAND = {
    R: { code: "R", name: "现实型", desc: "动手、机械、户外、操作实物", icon: "wrench" },
    I: { code: "I", name: "研究型", desc: "钻研、分析、探索原理", icon: "microscope" },
    A: { code: "A", name: "艺术型", desc: "创意、表达、审美设计", icon: "palette" },
    S: { code: "S", name: "社会型", desc: "助人、沟通、教育服务", icon: "users" },
    E: { code: "E", name: "企业型", desc: "领导、说服、组织经营", icon: "trending-up" },
    C: { code: "C", name: "常规型", desc: "条理、数据、规则流程", icon: "clipboard-list" },
  };

  // 首选科目
  const SUBJECTS = [
    { id: "physics", name: "物理类", icon: "atom", desc: "可报考绝大多数理工科专业" },
    { id: "history", name: "历史类", icon: "scroll-text", desc: "可报考人文社科及部分专业" },
  ];

  // 30 题：每个维度 5 题（占位题干，可替换为真实题库）
  const QUESTIONS = [
    // R 现实型
    { d: "R", t: "我喜欢动手拆装机械、电子或硬件设备" },
    { d: "R", t: "比起空谈，我更想亲手把一个东西做出来" },
    { d: "R", t: "户外、实验室或车间这类能动手的环境更吸引我" },
    { d: "R", t: "我愿意花时间学会一项需要动手的技能" },
    { d: "R", t: "操作工具、仪器或设备让我觉得很有意思" },
    // I 研究型
    { d: "I", t: "遇到难题时，我会一直钻研直到弄懂背后的原理" },
    { d: "I", t: "我对“为什么会这样”这类问题特别感兴趣" },
    { d: "I", t: "我喜欢看科普、纪录片，了解科技和自然的奥秘" },
    { d: "I", t: "做实验、找规律、验证猜想让我很有成就感" },
    { d: "I", t: "我喜欢把一个复杂问题拆解清楚再逐一解决" },
    // A 艺术型
    { d: "A", t: "我享受用画面、文字或音乐去表达自己的想法" },
    { d: "A", t: "看到不好看的设计，我会忍不住想把它改得更美" },
    { d: "A", t: "我有不少天马行空、与众不同的点子" },
    { d: "A", t: "我喜欢自由发挥、不被太多规则束缚的事情" },
    { d: "A", t: "创作或欣赏艺术作品是我重要的乐趣" },
    // S 社会型
    { d: "S", t: "把一件事讲清楚、帮别人解决困惑让我很有成就感" },
    { d: "S", t: "朋友有烦恼时，常常愿意找我倾诉" },
    { d: "S", t: "我希望未来的工作能实实在在地帮到别人" },
    { d: "S", t: "我喜欢和人打交道、合作完成一件事" },
    { d: "S", t: "教别人学会一项技能会让我感到快乐" },
    // E 企业型
    { d: "E", t: "我喜欢组织活动、带着大家一起把目标完成" },
    { d: "E", t: "我愿意为一个想法去说服别人、争取资源" },
    { d: "E", t: "我对创业、商业和“怎么把事做大”很好奇" },
    { d: "E", t: "在团队里，我常常自然地成为带头的那个人" },
    { d: "E", t: "我喜欢有挑战、有竞争、能见到成果的事" },
    // C 常规型
    { d: "C", t: "我做事讲条理，喜欢把数据和资料整理得井井有条" },
    { d: "C", t: "按清晰的步骤和规则做事让我觉得踏实" },
    { d: "C", t: "我擅长发现细节里的错误和不一致" },
    { d: "C", t: "我喜欢和数字、表格、流程打交道" },
    { d: "C", t: "把事情安排得有计划、有秩序让我安心" },
  ];

  // 22 个国家“十五五”重点产业方向，分三组
  const INDUSTRIES = [
    // 战略性新兴产业（12）
    { id: "ai",       name: "人工智能",          icon: "brain-circuit", desc: "大模型、智能体与算力底座", group: "strategic" },
    { id: "digital",  name: "数字经济",          icon: "bar-chart-3",   desc: "数据要素与产业数字化", group: "strategic" },
    { id: "energy",   name: "新能源",            icon: "sun",           desc: "光伏、风电与新型储能", group: "strategic" },
    { id: "ev",       name: "智能网联新能源汽车", icon: "car-front",      desc: "电动化 + 智能驾驶", group: "strategic" },
    { id: "ic",       name: "集成电路",          icon: "cpu",           desc: "芯片设计、制造与封测", group: "strategic" },
    { id: "robot",    name: "机器人",            icon: "bot",           desc: "工业、服务与人形机器人", group: "strategic" },
    { id: "material", name: "新材料",            icon: "layers",        desc: "高端合金、复合与半导体材料", group: "strategic" },
    { id: "equip",    name: "高端装备",          icon: "settings-2",    desc: "数控机床与智能制造装备", group: "strategic" },
    { id: "aero",     name: "航空航天",          icon: "rocket",        desc: "商业航天、卫星与大飞机", group: "strategic" },
    { id: "lowalt",   name: "低空经济",          icon: "plane-takeoff", desc: "无人机与城市空中交通", group: "strategic" },
    { id: "ocean",    name: "海洋经济",          icon: "ship",          desc: "海洋工程、装备与资源开发", group: "strategic" },
    { id: "biomed",   name: "生物医药",          icon: "pill",          desc: "创新药、医疗器械与诊断", group: "strategic" },
    // 未来产业（6）
    { id: "quantum",  name: "量子科技",          icon: "atom",          desc: "量子计算、通信与测量", group: "future" },
    { id: "biomanu",  name: "生物制造",          icon: "flask-conical", desc: "合成生物学与生物基材料", group: "future" },
    { id: "hydrogen", name: "氢能与核聚变",      icon: "flame",         desc: "绿氢、燃料电池与聚变能", group: "future" },
    { id: "bci",      name: "脑机接口",          icon: "brain",         desc: "神经信号采集与人机交互", group: "future" },
    { id: "embodied", name: "具身智能",          icon: "scan-face",     desc: "会感知、能行动的智能体", group: "future" },
    { id: "sixg",     name: "6G",               icon: "radio-tower",   desc: "下一代通信与空天地一体网", group: "future" },
    // 人文社科战略（4，文科友好）
    { id: "culture",  name: "文化强国与文旅",    icon: "drama",         desc: "文化产业、文旅融合与传播", group: "humanities" },
    { id: "intl",     name: "国际传播与区域国别", icon: "globe",         desc: "对外传播与区域国别研究", group: "humanities" },
    { id: "silver",   name: "银发经济与社会服务", icon: "heart-handshake", desc: "养老健康与社会服务体系", group: "humanities" },
    { id: "trade",    name: "贸易强国与对外开放", icon: "handshake",     desc: "国际经贸与高水平开放", group: "humanities" },
  ];

  // 就业行情评级（入库专业均通过就业筛选，仅 绿牌 / 稳定 两档）
  const EMP = {
    green:  { key: "green",  label: "绿牌", icon: "circle", tone: "green",
              note: "绿牌专业：就业率、薪资与满意度综合靠前，需求旺盛。" },
    stable: { key: "stable", label: "稳定", icon: "circle", tone: "grey",
              note: "就业稳定：社会需求持续，部分岗位更偏好深造后进入。" },
  };

  // 专业池（占位）。subject: physics=需首选物理 / any=物理历史均可
  const MAJORS = [
    // ——— 需首选物理 ———
    { name: "人工智能", cat: "工学", isNew: true, subject: "physics", holland: ["I","R"], inds: ["ai","robot","embodied"],
      emp: "green",
      why: "你既爱钻研原理、又想动手实现，AI 正是“理解 + 构建”兼备的方向。",
      policy: "“十五五”规划将人工智能列为战略性新兴产业核心，部署大模型与智能体产业化。",
      jobs: ["算法 / 大模型工程师", "机器学习研究员", "AI 产品经理"],
      tip: "薪资高、缺口大，但技术更新极快，要做好持续学习的准备。" },
    { name: "集成电路设计与集成系统", cat: "工学", isNew: false, subject: "physics", holland: ["I","R","C"], inds: ["ic","ai"],
      emp: "green",
      why: "你对原理钻研深、又重视细节与条理，芯片设计很契合这种特质。",
      policy: "集成电路是国家重点攻关的“卡脖子”领域，长期享受政策与资金倾斜。",
      jobs: ["数字 / 模拟 IC 设计", "EDA 工具研发", "芯片验证工程师"],
      tip: "国家急需、待遇好，但学习曲线陡，建议本硕连读、长期深耕。" },
    { name: "机器人工程", cat: "工学", isNew: true, subject: "physics", holland: ["R","I"], inds: ["robot","embodied","ev"],
      emp: "green",
      why: "你喜欢把东西亲手做出来，机器人是机械、电子与智能的交汇点。",
      policy: "机器人被列入战略性新兴产业，人形与具身智能是“十五五”重点突破方向。",
      jobs: ["机器人控制工程师", "运动规划算法", "具身智能研发"],
      tip: "软硬件复合、动手要求高，跨学科学习压力不小。" },
    { name: "新能源科学与工程", cat: "工学", isNew: false, subject: "physics", holland: ["I","R"], inds: ["energy","hydrogen","ev"],
      emp: "green",
      why: "兼具探索与实践，能源转型领域工程岗位需求长期旺盛。",
      policy: "新能源与新型储能是“十五五”能源安全与“双碳”战略的支柱产业。",
      jobs: ["储能系统工程师", "光伏 / 风电研发", "能源系统规划"],
      tip: "赛道长期向上，岗位需求稳定，适合愿意扎根工程的人。" },
    { name: "储能科学与工程", cat: "工学", isNew: true, subject: "physics", holland: ["I","R","C"], inds: ["energy","hydrogen"],
      emp: "green",
      why: "你重原理也重流程，储能是新能源落地不可或缺的关键环节。",
      policy: "新型储能被明确为“十五五”能源体系建设的重点新兴产业。",
      jobs: ["电池研发工程师", "储能系统集成", "电力电子工程师"],
      tip: "新兴方向、岗位增长快，但学科较新、院校间差异大。" },
    { name: "飞行器设计与工程", cat: "工学", isNew: false, subject: "physics", holland: ["R","I"], inds: ["aero","lowalt"],
      emp: "stable",
      why: "你享受动手与探索，航空航天能把硬核工程做到极致。",
      policy: "商业航天与低空经济是“十五五”培育的新增长极，人才缺口大。",
      jobs: ["飞行器结构设计", "无人机系统工程师", "航天测控"],
      tip: "对口单位较集中、门槛高，建议规划读研以进入核心岗位。" },
    { name: "材料科学与工程", cat: "工学", isNew: false, subject: "physics", holland: ["I","R"], inds: ["material","ic","energy"],
      emp: "stable",
      why: "你爱探究本质，材料是几乎所有高端产业的共同底座。",
      policy: "新材料被列为战略性新兴产业，支撑芯片、能源与航空航天升级。",
      jobs: ["半导体材料研发", "复合材料工程师", "电池材料研究"],
      tip: "口径宽但深造导向强，本科直接对口岗位有限，建议规划读研。" },
    { name: "数据科学与大数据技术", cat: "工学", isNew: false, subject: "physics", holland: ["I","C","E"], inds: ["ai","digital","sixg"],
      emp: "green",
      why: "你善于分析与归纳，数据科学是各行业智能化的通用引擎。",
      policy: "数据要素与人工智能融合是“十五五”数字经济建设的重要方向。",
      jobs: ["数据科学家", "数据分析师", "大数据平台工程师"],
      tip: "跨行业通用、就业面广，但需要扎实的数学与编程基础。" },
    { name: "生物医学工程", cat: "工学", isNew: false, subject: "physics", holland: ["I","R","S"], inds: ["biomed","bci"],
      emp: "stable",
      why: "你想用所学帮到别人，又爱钻研，医工交叉非常适合你。",
      policy: "高端医疗器械与脑机接口是“十五五”生命健康产业的前沿方向。",
      jobs: ["医疗器械研发", "脑机接口工程师", "影像算法工程师"],
      tip: "交叉学科、发展空间大，但深造后职业天花板更高，建议规划读研。" },
    { name: "量子信息科学", cat: "理学", isNew: true, subject: "physics", holland: ["I"], inds: ["quantum","ic"],
      emp: "stable",
      why: "你对“为什么”有强烈好奇，量子是面向未来的前沿基础学科。",
      policy: "量子科技被列入“十五五”未来产业，国家长期布局量子计算与通信。",
      jobs: ["量子算法研究", "量子器件研发", "量子通信工程师"],
      tip: "前沿基础学科、长期看好，但本科就业窄，明确建议规划读研。" },
    { name: "生物工程", cat: "工学", isNew: false, subject: "physics", holland: ["I","R"], inds: ["biomanu","biomed"],
      emp: "stable",
      why: "你兼具探索与动手能力，合成生物正成为制造业新范式。",
      policy: "生物制造是“十五五”未来产业，合成生物学被列入重点培育方向。",
      jobs: ["合成生物研发", "发酵工艺工程师", "生物材料研究"],
      tip: "前景广但产业化尚在早期，深造导向明显，建议规划读研。" },
    { name: "电子信息工程", cat: "工学", isNew: false, subject: "physics", holland: ["R","I","C"], inds: ["sixg","ic","ai"],
      emp: "green",
      why: "口径宽、出路广，适合喜欢动手又重逻辑的你打基础。",
      policy: "6G 与下一代通信被列入“十五五”未来产业前瞻布局。",
      jobs: ["通信系统工程师", "嵌入式开发", "射频 / 信号处理"],
      tip: "就业面好、岗位多，是理工科里较稳妥的“宽口径”选择。" },
    { name: "海洋工程与技术", cat: "工学", isNew: false, subject: "physics", holland: ["R","I"], inds: ["ocean","energy"],
      emp: "stable",
      why: "你喜欢动手与探索，海洋工程把工程能力用在广阔的蓝色国土上。",
      policy: "海洋经济是“十五五”培育的重要新增长极，涉海装备需求上升。",
      jobs: ["海洋工程结构设计", "海上风电工程师", "海洋装备研发"],
      tip: "区域性较强、对口单位集中，建议结合沿海地区院校与就业。" },
    { name: "机械工程", cat: "工学", isNew: false, subject: "physics", holland: ["R","I","C"], inds: ["equip","robot","ev"],
      emp: "stable",
      why: "你动手能力强、重逻辑，机械是制造业升级的通用基本功。",
      policy: "高端装备被列为战略性新兴产业，智能制造拉动机械人才需求。",
      jobs: ["机械设计工程师", "智能装备研发", "工艺 / 自动化工程师"],
      tip: "传统强基、口径宽，需主动向智能化、高端化方向升级。" },
    { name: "工业设计", cat: "工学", isNew: false, subject: "any", holland: ["A","R","E"], inds: ["robot","ev","equip"],
      emp: "stable",
      why: "你有审美和创意，又愿意把想法落地成真实产品。",
      policy: "高端制造升级对“技术 + 设计”复合人才需求持续上升。",
      jobs: ["产品 / 交互设计师", "用户体验设计", "智能硬件设计"],
      tip: "技术与设计复合，作品集与实习经历对就业很关键。" },
    { name: "信息管理与信息系统", cat: "管理学", isNew: false, subject: "any", holland: ["C","E","I"], inds: ["ai","digital"],
      emp: "stable",
      why: "你条理清晰、也有组织力，处在技术与管理的交叉地带。",
      policy: "数字化转型推动复合型信息管理人才需求增长。",
      jobs: ["数据产品经理", "信息系统分析", "数字化运营"],
      tip: "岗位多元、适应面广，但需主动补强技术或业务的某一头。" },
    // ——— 人文社科 / 文科友好（物理历史均可，历史类同样适合）———
    { name: "新闻传播学", cat: "文学", isNew: false, subject: "any", holland: ["A","S","E"], inds: ["intl","culture","digital"],
      emp: "stable",
      why: "你善表达、关注人和社会，传播是连接内容与公众的核心专业。",
      policy: "国际传播能力建设是“十五五”文化强国战略的重要任务。",
      jobs: ["新媒体 / 内容运营", "记者 / 编辑", "国际传播与公关"],
      tip: "行业变化快、入门门槛低，需靠复合能力与作品建立竞争力。" },
    { name: "国际经济与贸易", cat: "经济学", isNew: false, subject: "any", holland: ["E","C","S"], inds: ["trade","digital"],
      emp: "stable",
      why: "你有组织力、重数据，又愿与人打交道，外贸是它们的交汇点。",
      policy: "推进贸易强国与高水平对外开放是“十五五”的明确方向。",
      jobs: ["外贸 / 跨境电商", "国际商务", "供应链与关务"],
      tip: "对外开放长期受益，外语 + 商务双修会让竞争力明显更强。" },
    { name: "社会工作", cat: "法学", isNew: false, subject: "any", holland: ["S","C"], inds: ["silver"],
      emp: "stable",
      why: "你愿意实实在在帮到别人，社会工作正是以助人为核心的专业。",
      policy: "银发经济与社会服务体系建设是“十五五”民生领域重点。",
      jobs: ["社会工作者", "社区 / 公益项目", "养老与健康服务"],
      tip: "需求随老龄化上升，重在服务热情与同理心，起薪偏务实。" },
    { name: "旅游管理", cat: "管理学", isNew: false, subject: "any", holland: ["S","E","A"], inds: ["culture"],
      emp: "stable",
      why: "你乐于与人协作、也有点创意，文旅是体验与运营并重的行业。",
      policy: "文旅融合与文化强国建设为旅游产业带来政策红利。",
      jobs: ["文旅策划 / 运营", "目的地与酒店管理", "在线旅游产品"],
      tip: "受政策推动、想象空间大，但重实践，需积累实习与项目经验。" },
    { name: "区域国别学", cat: "交叉学科", isNew: true, subject: "any", holland: ["I","S"], inds: ["intl"],
      emp: "stable",
      why: "你爱探究、也关注世界，区域国别是面向国家战略的新兴交叉学科。",
      policy: "区域国别研究被列为服务对外开放与国际传播的重点新兴方向。",
      jobs: ["国际事务研究", "涉外机构 / 智库", "区域语言与文化"],
      tip: "新兴交叉学科、外语与国际视野要求高，建议规划读研深耕。" },
    { name: "健康服务与管理", cat: "管理学", isNew: false, subject: "any", holland: ["S","C","E"], inds: ["silver","biomed"],
      emp: "stable",
      why: "你重条理、也乐于服务他人，健康管理是民生与产业的结合点。",
      policy: "应对老龄化、发展银发经济是“十五五”健康中国建设的重点。",
      jobs: ["健康管理师", "医养机构运营", "健康产业项目"],
      tip: "需求随老龄化增长，管理 + 健康复合，岗位与院校差异较大。" },
  ];

  function describeCode(code) {
    return code.split("").map(c => `${HOLLAND[c].name} ${c}`).join(" · ");
  }

  window.APP_DATA = { HOLLAND, SUBJECTS, QUESTIONS, INDUSTRIES, EMP, MAJORS, describeCode };

  window.APP_META = {
    sources: "依据《“十五五”规划纲要》(2026) 与 教育部《普通高等学校本科专业目录》",
    disclaimer: "本工具结果仅供参考，不构成志愿填报建议，请结合分数、招生计划与个人情况综合决策。",
    updated: "数据更新于 2026-06",
  };
})();
