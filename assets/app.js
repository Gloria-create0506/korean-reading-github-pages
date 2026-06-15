(function () {
  const chapters = window.KOREAN_BOOK_DATA.chapters;
  enrichV3Data(chapters);
  const hashChapterId = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("chapter");
  const savedChapterId = hashChapterId || localStorage.getItem("korean-reading-current-chapter");
  let chapter = chapters.find((item) => item.id === savedChapterId) || chapters[0];
  const memoryBoxKey = "korean-reading-memory-box";
  const preferencesKey = "korean-reading-preferences";
  // Learning system: restore user preferences before creating the chapter audio.
  const initialPreferences = loadPreferences();
  const userState = window.KRState ? window.KRState.markStudyDay(window.KRState.load()) : null;
  const state = {
    mastered: new Set(loadProgress(chapter.id)),
    taskState: loadTaskState(chapter.id),
    challengeAnswer: [],
    challengeChecked: false,
    challengeSentenceId: null,
    bossStep: 0,
    bossScore: 100,
    bossDone: false,
    preferences: initialPreferences,
    voices: [],
    koreanVoice: null,
    currentUtterance: null,
    storyAudio: createStoryAudio(chapter, initialPreferences.playbackRate),
    audioInputBound: false,
    loopSentenceId: null,
    loopActive: false,
    wordSearchTimer: null,
    expandedSentenceId: null
  };

  const els = {
    chapterNumber: document.getElementById("chapterNumber"),
    chapterTitleKo: document.getElementById("chapterTitleKo"),
    chapterTitleEn: document.getElementById("chapterTitleEn"),
    chapterSelect: document.getElementById("chapterSelect"),
    heroLead: document.getElementById("heroLead"),
    heroTopic: document.getElementById("heroTopic"),
    lessonFocus: document.getElementById("lessonFocus"),
    chapterHeroImage: document.getElementById("chapterHeroImage"),
    progressWidget: document.getElementById("progressWidget"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    levelText: document.getElementById("levelText"),
    xpText: document.getElementById("xpText"),
    coinText: document.getElementById("coinText"),
    streakText: document.getElementById("streakText"),
    dashboardGrid: document.getElementById("recordGrid"),
    continueStudyBtn: document.getElementById("continueStudyBtn"),
    voiceStatus: document.getElementById("voiceStatus"),
    audioCurrent: document.getElementById("audioCurrent"),
    audioDuration: document.getElementById("audioDuration"),
    audioSeek: document.getElementById("audioSeek"),
    sentenceList: document.getElementById("sentenceList"),
    vocabGrid: document.getElementById("vocabGrid"),
    grammarList: document.getElementById("grammarList"),
    pronunciationList: document.getElementById("pronunciationList"),
    cultureText: document.getElementById("cultureText"),
    quizForm: document.getElementById("quizForm"),
    quizResult: document.getElementById("quizResult"),
    memoryPractice: document.getElementById("memoryPractice"),
    wordSearch: document.getElementById("wordSearch"),
    posFilter: document.getElementById("posFilter"),
    taskList: document.getElementById("taskList"),
    taskProgressText: document.getElementById("taskProgressText"),
    taskProgressBar: document.getElementById("taskProgressBar"),
    vocabSection: document.getElementById("vocabSection"),
    grammarSection: document.getElementById("grammarSection"),
    challengeSection: document.getElementById("challengeSection"),
    sentenceChallenge: document.getElementById("sentenceChallenge"),
    resetChallengeBtn: document.getElementById("resetChallengeBtn"),
    playPauseBtn: document.getElementById("playPauseBtn"),
    quizPanel: document.getElementById("quizPanel"),
    clearMemoryBtn: document.getElementById("clearMemoryBtn"),
    memoryBoxList: document.getElementById("memoryBoxList"),
    bossSection: document.getElementById("integratedChallengeSection"),
    bossChallenge: document.getElementById("integratedChallenge"),
    resetBossBtn: document.getElementById("resetIntegratedChallengeBtn"),
    markReadingBtn: document.getElementById("markReadingBtn"),
    silentModeToggle: document.getElementById("silentModeToggle")
  };

  const lessonTasks = [
    { id: "reading", label: "阅读原文", detail: "通读原文并点击“标记原文已读”" },
    { id: "vocab", label: "重点单词", detail: "查看或标记 80% 重点词" },
    { id: "grammar", label: "语法句式", detail: "阅读全部语法卡片并确认理解" },
    { id: "challenge", label: "句子重组", detail: "句子练习正确率达到 80%" },
    { id: "quiz", label: "理解检测", detail: "检测得分达到 80%" },
    { id: "boss", label: "综合挑战", detail: "综合挑战得分达到 80%" }
  ];

  function enrichV3Data(items) {
    const chapterOne = items.find((item) => item.id === "01");
    if (chapterOne && !chapterOne.v3ManualReady) {
      chapterOne.v3ManualReady = true;

      const sentenceDetails = {
      s1: {
        structure: "主题 + 宾语 + 频率副词 + 动词",
        structureParts: [
          { label: "主题", korean: "한국 사람들은", note: "한국 사람들 + 은，说明这句话谈论“韩国人”。" },
          { label: "宾语", korean: "김치찌개를", note: "김치찌개 + 를，表示“吃”的对象。" },
          { label: "频率副词", korean: "자주", note: "说明动作发生频率：经常。" },
          { label: "动词", korean: "먹어요", note: "먹다 的礼貌现在式，句子核心动作。" }
        ],
        selfStudyNote: "先抓住 한국 사람들은 这个主题，再看 김치찌개를 是 먹어요 的动作对象。",
        breakdown: [
          { token: "한국 사람들", meaning: "韩国人们", grammar: "名词短语，表示一类人群" },
          { token: "은", meaning: "主题助词", grammar: "把“韩国人”设为这句话讨论的主题" },
          { token: "김치찌개", meaning: "泡菜汤", grammar: "名词，动作 먹어요 的对象" },
          { token: "를", meaning: "宾格助词", grammar: "标记前面的名词是动作对象" },
          { token: "자주", meaning: "经常", grammar: "频率副词，修饰后面的动作" },
          { token: "먹어요", meaning: "吃", grammar: "먹다 的礼貌现在式" }
        ],
        substitutions: [
          { korean: "한국 사람들은 밥을 자주 먹어요.", chinese: "韩国人经常吃米饭。" },
          { korean: "저는 김치찌개를 자주 먹어요.", chinese: "我经常吃泡菜汤。" }
        ]
      },
      s2: {
        structure: "地点/范围主题 + 并列名词 + 主格 + 动词",
        structureParts: [
          { label: "地点/范围主题", korean: "김치찌개에는", note: "김치찌개 + 에는，表示“在泡菜汤里/就泡菜汤来说”。" },
          { label: "并列名词", korean: "김치와 돼지고기", note: "N와/과 连接两个名词，表示“和”。前一名词无收音用 와，有收音用 과；本句 김치 无收音，所以用 김치와。" },
          { label: "主格", korean: "가", note: "标记前面的并列名词是 들어가요 的主体。" },
          { label: "动词", korean: "들어가요", note: "这里不是字面“走进去”，而是“含有/放有”。" }
        ],
        selfStudyNote: "에는 把“泡菜汤里”作为范围，后面说明里面有什么。",
        breakdown: [
          { token: "김치찌개", meaning: "泡菜汤", grammar: "说明范围的名词" },
          { token: "에는", meaning: "在……里面/对于……来说", grammar: "에 + 는，表示地点或范围主题" },
          { token: "김치와 돼지고기", meaning: "泡菜和猪肉", grammar: "N와/과：连接两个名词，表示“和”。前一名词无收音用 와，有收音用 과；本句 김치 无收音，所以是 김치와。可替换为 밥과 김、마늘과 대파。" },
          { token: "가", meaning: "主格助词", grammar: "标记 들어가요 的主体" },
          { token: "들어가요", meaning: "进入；含有", grammar: "들어가다 的礼貌现在式，这里理解为“里面有/含有”" }
        ],
        substitutions: [
          { korean: "김밥에는 밥과 김이 들어가요.", chinese: "紫菜包饭里有米饭和紫菜。" },
          { korean: "라면에는 계란이 들어가요.", chinese: "拉面里有鸡蛋。" }
        ]
      },
      s3: {
        structure: "顺序副词 + 地点 + 宾语 + 连接动作 + 动词",
        structureParts: [
          { label: "顺序副词", korean: "먼저", note: "表示步骤顺序：首先。" },
          { label: "地点/方向", korean: "냄비에", note: "냄비 + 에，表示往锅里/在锅里。" },
          { label: "宾语", korean: "돼지고기를", note: "돼지고기 + 를，表示被放入、被翻炒的对象。" },
          { label: "连接动作", korean: "넣고", note: "넣다 + -고，表示放入后接着做下一步。" },
          { label: "动词", korean: "볶아요", note: "볶다 的礼貌现在式：翻炒。" }
        ],
        selfStudyNote: "넣고 把“放入”和“翻炒”连起来，是做菜步骤里很常见的连接方式。",
        breakdown: [
          { token: "먼저", meaning: "首先", grammar: "顺序副词" },
          { token: "냄비에", meaning: "往锅里/在锅里", grammar: "에 表示方向或位置" },
          { token: "돼지고기를", meaning: "猪肉", grammar: "를 标记宾语" },
          { token: "넣고", meaning: "放入后/放入并且", grammar: "넣다 + -고，连接前后动作" },
          { token: "볶아요", meaning: "翻炒", grammar: "볶다 的礼貌现在式" }
        ],
        substitutions: [
          { korean: "냄비에 물을 넣고 끓여요.", chinese: "往锅里加水后煮。" },
          { korean: "팬에 김치를 넣고 볶아요.", chinese: "把泡菜放进平底锅里炒。" }
        ]
      },
      s4: {
        structure: "连接副词 + 条件/时间从句 + 宾语 + 动词",
        structureParts: [
          { label: "连接副词", korean: "그리고", note: "承接上一步：然后。" },
          { label: "条件/时间从句", korean: "돼지고기가 익으면", note: "V/A-(으)면 表示条件或时间：如果/当……。前面词干有收音时接 -으면，无收音时接 -면；익다 词干 익- 有收音ㄱ，所以是 익으면。菜谱步骤里更自然译为“熟了以后”。" },
          { label: "宾语", korean: "김치를", note: "김치 + 를，表示放入的对象。" },
          { label: "动词", korean: "넣어요", note: "넣다 的礼貌现在式：放入。" }
        ],
        selfStudyNote: "익으면 在菜谱语境里更自然地理解为“熟了以后”。",
        breakdown: [
          { token: "그리고", meaning: "然后", grammar: "连接副词" },
          { token: "돼지고기가", meaning: "猪肉", grammar: "가 标记状态变化的主体" },
          { token: "익으면", meaning: "熟了以后/如果熟了", grammar: "V/A-(으)면：表示条件或时间，相当于“如果……/当……”。接法：词干有收音用 -으면，无收音用 -면；익다 的词干 익- 有收音ㄱ，所以变成 익으면。本句是做菜步骤，按时间顺序理解为“猪肉熟了以后”。" },
          { token: "김치를", meaning: "泡菜", grammar: "를 标记放入的对象" },
          { token: "넣어요", meaning: "放入", grammar: "넣다 的礼貌现在式" }
        ],
        substitutions: [
          { korean: "물이 끓으면 라면을 넣어요.", chinese: "水开以后放入拉面。" },
          { korean: "고기가 익으면 채소를 넣어요.", chinese: "肉熟了以后放入蔬菜。" }
        ]
      },
      s5: {
        structure: "时间数量 + 程度词 + 并列宾语 + 副词 + 动词",
        structureParts: [
          { label: "时间数量", korean: "3분", note: "表示动作持续时间：3分钟。" },
          { label: "程度词", korean: "정도", note: "放在数量后，表示“大约/左右”。" },
          { label: "并列宾语", korean: "고기와 김치를", note: "고기와 김치 + 를，表示一起被翻炒的对象。" },
          { label: "副词", korean: "함께", note: "说明动作方式：一起。" },
          { label: "动词", korean: "볶아요", note: "句子核心动作：翻炒。" }
        ],
        selfStudyNote: "정도 放在数量后面表示“大约”，함께 说明两个食材一起被翻炒。",
        breakdown: [
          { token: "3분", meaning: "3分钟", grammar: "时间数量，3 读作 삼" },
          { token: "정도", meaning: "大约/左右", grammar: "放在数量后表示估计" },
          { token: "고기와 김치를", meaning: "肉和泡菜", grammar: "와 连接名词，를 标记宾语" },
          { token: "함께", meaning: "一起", grammar: "副词，说明动作方式" },
          { token: "볶아요", meaning: "翻炒", grammar: "볶다 的礼貌现在式" }
        ],
        substitutions: [
          { korean: "5분 정도 기다려요.", chinese: "等大约5分钟。" },
          { korean: "친구와 함께 공부해요.", chinese: "和朋友一起学习。" }
        ]
      },
      s6: {
        structure: "顺序副词 + 选择宾语 + 连接动作 + 程度副词 + 条件动词 + 结果",
        structureParts: [
          { label: "顺序副词", korean: "마지막으로", note: "表示步骤顺序：最后。" },
          { label: "选择宾语", korean: "물이나 육수를", note: "물이나 육수 + 를，表示“水或高汤”这个倒入对象。" },
          { label: "连接动作", korean: "붓고", note: "붓다 + -고，表示倒入后接下一步。" },
          { label: "程度副词", korean: "더", note: "表示动作继续或程度增加：再/更。" },
          { label: "条件动词", korean: "끓이면", note: "끓이다 + -(으)면，表示“煮的话/煮以后”。" },
          { label: "结果", korean: "완성이에요", note: "说明最后结果：完成了。" }
        ],
        selfStudyNote: "이나 表示“水或高汤任选其一”，완성이에요 是菜谱里常见的收尾表达。",
        breakdown: [
          { token: "마지막으로", meaning: "最后", grammar: "顺序副词" },
          { token: "물이나 육수를", meaning: "水或高汤", grammar: "이나 表示选择，를 标记宾语" },
          { token: "붓고", meaning: "倒入后/倒入并且", grammar: "붓다 + -고，连接动作" },
          { token: "더", meaning: "再/更", grammar: "副词，表示动作继续或程度增加" },
          { token: "끓이면", meaning: "煮的话/煮以后", grammar: "끓이다 + -(으)면" },
          { token: "완성이에요", meaning: "完成了", grammar: "완성 + 이에요，名词谓语句" }
        ],
        substitutions: [
          { korean: "물을 붓고 더 끓이면 돼요.", chinese: "倒入水再煮一下就可以了。" },
          { korean: "밥이나 빵을 먹어요.", chinese: "吃米饭或面包。" }
        ]
      },
      s7: {
        structure: "并列食材 + 宾语助词 + 条件动词 + 程度副词 + 形容词",
        structureParts: [
          { label: "并列食材", korean: "마늘, 대파, 두부", note: "三个名词并列：蒜、大葱、豆腐。" },
          { label: "宾语助词", korean: "를", note: "接在 두부 后，统领前面并列的食材，表示“放入”的对象。" },
          { label: "条件动词", korean: "넣으면", note: "넣다 + -(으)면，表示“如果放入”。" },
          { label: "程度副词", korean: "더", note: "表示“更”，加强后面 맛있어요 的程度。" },
          { label: "形容词", korean: "맛있어요", note: "맛있다 的礼貌现在式，表示“好吃”。" }
        ],
        selfStudyNote: "더 맛있어요 里的 더 是“更”，用于加强 맛있어요 的程度。",
        breakdown: [
          { token: "마늘, 대파, 두부를", meaning: "蒜、大葱、豆腐", grammar: "并列名词，를 标记放入对象" },
          { token: "넣으면", meaning: "如果放入", grammar: "넣다 + -(으)면，表示条件" },
          { token: "더", meaning: "更", grammar: "程度副词" },
          { token: "맛있어요", meaning: "好吃", grammar: "맛있다 的礼貌现在式" }
        ],
        substitutions: [
          { korean: "치즈를 넣으면 더 맛있어요.", chinese: "如果放奶酪会更好吃。" },
          { korean: "마늘을 넣으면 맛있어요.", chinese: "如果放蒜会好吃。" }
        ]
      }
    };

      const wordDetails = {
      "김치찌개": {
        pronunciation: "kim-chi-jji-gae",
        originType: "复合词",
        lessonSentence: "한국 사람들은 김치찌개를 자주 먹어요.",
        roleInSentence: "在句中作宾语，后接宾格助词 를，表示“吃”的对象。",
        collocations: [
          { korean: "김치찌개를 끓이다", chinese: "煮泡菜汤" },
          { korean: "김치찌개를 먹다", chinese: "吃泡菜汤" },
          { korean: "김치찌개가 맵다", chinese: "泡菜汤很辣" }
        ],
        confusingWords: [
          { word: "국", difference: "泛指汤，通常比 찌개 更清。" },
          { word: "찌개", difference: "炖汤，味道较浓，配料更多。" },
          { word: "탕", difference: "常见于正式菜名，如 삼계탕。" }
        ],
        note: "韩国饮食文化中非常常见的菜名，建议能看懂并会说。"
      },
      "자주": {
        pronunciation: "ja-ju",
        originType: "固有词/常用副词",
        roleInSentence: "修饰 먹어요，说明动作发生频率。",
        collocations: [
          { korean: "자주 먹다", chinese: "经常吃" },
          { korean: "자주 가다", chinese: "经常去" },
          { korean: "자주 보다", chinese: "经常看/经常见" }
        ],
        confusingWords: [
          { word: "항상", difference: "总是，频率比 자주 更高。" },
          { word: "가끔", difference: "偶尔，频率比 자주 低。" }
        ],
        masteryLevel: "必须掌握",
        note: "日常表达频率很高，可直接迁移到很多动词前。"
      },
      "먹다": {
        pronunciation: "meok-da",
        originType: "固有词",
        roleInSentence: "句子核心动词，먹어요 是礼貌现在式。",
        collocations: [
          { korean: "밥을 먹다", chinese: "吃饭" },
          { korean: "아침을 먹다", chinese: "吃早饭" },
          { korean: "약을 먹다", chinese: "吃药" }
        ],
        confusingWords: [
          { word: "마시다", difference: "喝，用于水、咖啡等饮品。" },
          { word: "드시다", difference: "먹다 的尊敬表达。" }
        ],
        masteryLevel: "必须掌握",
        note: "韩语初级最核心动词之一，必须熟练掌握 먹어요。"
      },
      "돼지고기": {
        pronunciation: "dwae-ji-go-gi",
        originType: "复合词",
        roleInSentence: "在本课中多次作为食材名词出现，可接 가 或 를。",
        collocations: [
          { korean: "돼지고기를 넣다", chinese: "放入猪肉" },
          { korean: "돼지고기를 볶다", chinese: "炒猪肉" },
          { korean: "돼지고기가 익다", chinese: "猪肉熟了" }
        ],
        confusingWords: [
          { word: "고기", difference: "肉的泛称。" },
          { word: "소고기", difference: "牛肉。" },
          { word: "닭고기", difference: "鸡肉。" }
        ],
        note: "食物主题中的高频词，建议掌握。"
      },
      "넣다": {
        pronunciation: "neot-da",
        originType: "固有词",
        roleInSentence: "表示“放入”，在菜谱步骤中是核心动作。",
        collocations: [
          { korean: "냄비에 넣다", chinese: "放进锅里" },
          { korean: "물을 넣다", chinese: "加水" },
          { korean: "김치를 넣다", chinese: "放泡菜" }
        ],
        confusingWords: [
          { word: "붓다", difference: "倒入液体。" },
          { word: "담다", difference: "装入、盛入容器。" }
        ],
        masteryLevel: "必须掌握",
        note: "做饭、收纳、添加材料都常用。"
      },
      "볶다": {
        pronunciation: "bok-da",
        originType: "固有词",
        roleInSentence: "表示“翻炒”，与 넣고 连用描述连续动作。",
        collocations: [
          { korean: "김치를 볶다", chinese: "炒泡菜" },
          { korean: "고기를 볶다", chinese: "炒肉" },
          { korean: "함께 볶다", chinese: "一起炒" }
        ],
        confusingWords: [
          { word: "끓이다", difference: "煮、烧开，多用于汤、水。" },
          { word: "굽다", difference: "烤、煎。" }
        ],
        note: "烹饪主题关键词，建议掌握。"
      },
      "끓이다": {
        pronunciation: "kkeur-i-da",
        originType: "固有词",
        roleInSentence: "끓이면 表示“煮的话/煮以后”，用于完成菜谱步骤。",
        collocations: [
          { korean: "물을 끓이다", chinese: "烧水" },
          { korean: "국을 끓이다", chinese: "煮汤" },
          { korean: "라면을 끓이다", chinese: "煮拉面" }
        ],
        confusingWords: [
          { word: "끓다", difference: "自动词，水开了。" },
          { word: "끓이다", difference: "他动词，把某物煮开。" }
        ],
        masteryLevel: "必须掌握",
        note: "注意 끓다/끓이다 的自动词和他动词区别。"
      },
      "맛있다": {
        pronunciation: "ma-sit-da",
        originType: "复合表达",
        roleInSentence: "맛있어요 描述加入食材后的结果状态。",
        collocations: [
          { korean: "정말 맛있어요", chinese: "真的很好吃" },
          { korean: "더 맛있어요", chinese: "更好吃" },
          { korean: "김치찌개가 맛있어요", chinese: "泡菜汤很好吃" }
        ],
        confusingWords: [
          { word: "맛없다", difference: "不好吃。" },
          { word: "좋다", difference: "好，范围更泛，不一定指味道。" }
        ],
        masteryLevel: "必须掌握",
        note: "日常评价食物最常用表达之一。"
      }
    };

      chapterOne.sentences.forEach((sentence) => {
        Object.assign(sentence, sentenceDetails[sentence.id] || {});
        sentence.grammarPoints = (sentence.grammarIds || []).map((id) => {
          const grammar = chapterOne.grammar.find((item) => item.id === id);
          return grammar ? { title: grammar.pattern, explanation: grammar.meaningZh } : null;
        }).filter(Boolean);
      });

      chapterOne.vocabulary.forEach((word, index) => {
        const detail = wordDetails[word.ko] || {};
        const lessonSentence = detail.lessonSentence || word.example || chapterOne.sentences.find((sentence) => sentence.ko.includes(word.ko.replace(/다$/, "")))?.ko || "";
        const needsExpressionTarget = /\s/.test(word.ko || "") || /动词|形容词/.test(word.pos || "") || /하다$|되다$|[가-힣]+다$/.test(word.ko || "");
        const objectParticle = koreanParticle(word.ko, "을", "를");
        const rememberExample = needsExpressionTarget ? `이 표현을 기억해요: ${word.ko}.` : `${word.ko}${objectParticle} 기억해요.`;
        const confirmExample = needsExpressionTarget ? `원문에서 이 표현을 확인해요: ${word.ko}.` : `이 문장에서 ${word.ko}${objectParticle} 확인해요.`;
        Object.assign(word, {
          id: word.id || `ch01-word-${String(index + 1).padStart(2, "0")}`,
          pronunciation: detail.pronunciation || romanizeFallback(word.ko),
          originType: detail.originType || guessOriginType(word.ko),
          hanja: detail.hanja || "",
          lessonSentence,
          roleInSentence: detail.roleInSentence || roleForWord(chapterOne, word, lessonSentence),
          collocations: detail.collocations || defaultCollocations(word),
          confusingWords: detail.confusingWords || defaultConfusingWords(word),
          examples: detail.examples || defaultWordExamples(word, lessonSentence, rememberExample, confirmExample),
          masteryLevel: detail.masteryLevel || (index < 12 ? "建议掌握" : "了解即可"),
          note: detail.note || defaultWordNote(chapterOne, word, lessonSentence)
        });
      });
    }

    enrichPriorityChapterV3Details(items);
    items.forEach(enrichChapterV3Defaults);
  }

  function enrichPriorityChapterV3Details(items) {
    const chapterThirteen = items.find((item) => item.id === "13");
    if (chapterThirteen && !chapterThirteen.v3ManualReady) {
      chapterThirteen.v3ManualReady = true;
      const sentenceDetails = {
        s1: {
          structure: "时间范围 + 全部对象 + 工具/方式 + 可能表达",
          structureParts: [
            { label: "时间范围", korean: "요즘에는", note: "요즘 + 에는，表示“最近/现在这个阶段”。" },
            { label: "全部对象", korean: "모든 물건을", note: "모든 修饰 물건，을 标记“买”的对象。" },
            { label: "工具/方式", korean: "인터넷으로", note: "으로 表示方式：通过互联网/在网上。" },
            { label: "可能表达", korean: "살 수 있어요", note: "사다 的 관형형 살 + 수 있어요，表示“可以买/能够买”。" }
          ],
          breakdown: [
            { token: "요즘에는", meaning: "最近/如今", grammar: "요즘 + 에는，把当前时间范围作为话题。" },
            { token: "모든", meaning: "所有的", grammar: "冠形词，修饰后面的 물건。" },
            { token: "물건을", meaning: "物品/东西", grammar: "물건 + 을，宾格助词标记购买对象。" },
            { token: "인터넷으로", meaning: "通过互联网/在网上", grammar: "으로 表示工具、方式或途径。" },
            { token: "살 수 있어요", meaning: "可以买", grammar: "V-(으)ㄹ 수 있다 表示能力或可能性。" }
          ],
          selfStudyNote: "这句的核心不是“买什么”，而是“现在什么都能通过互联网买到”。重点看 인터넷으로 和 살 수 있어요。",
          substitutions: [
            { korean: "요즘에는 책을 인터넷으로 살 수 있어요.", chinese: "最近可以在网上买书。" },
            { korean: "요즘에는 음식을 인터넷으로 주문할 수 있어요.", chinese: "最近可以在网上订餐。" }
          ]
        },
        s2: {
          structure: "地点范围 + 条件 + 时间范围 + 对象 + 可能表达",
          structureParts: [
            { label: "地点范围", korean: "한국에서는", note: "한국 + 에서는，表示“在韩国”这个范围。" },
            { label: "条件", korean: "인터넷으로 물건을 주문하면", note: "주문하다 + -(으)면，表示“如果在网上下单”。" },
            { label: "时间范围", korean: "보통 2~3일 안에", note: "보통 表示通常，안에 表示在某段时间以内。" },
            { label: "对象", korean: "물건을", note: "물건 + 을，表示收到的对象。" },
            { label: "可能表达", korean: "받을 수 있어요", note: "받다 的 관형형 받을 + 수 있어요，表示“能收到”。" }
          ],
          breakdown: [
            { token: "한국에서는", meaning: "在韩国", grammar: "에서 + 는，表示地点范围并提示话题。" },
            { token: "인터넷으로 물건을", meaning: "通过网络把物品", grammar: "인터넷으로 表方式，물건을 是 주문하다 的对象。" },
            { token: "주문하면", meaning: "如果下单", grammar: "주문하다 + -(으)면，表示条件。" },
            { token: "보통", meaning: "通常", grammar: "频率/程度副词。" },
            { token: "2~3일 안에", meaning: "两三天内", grammar: "时间数量 + 안에，表示期限以内。" },
            { token: "물건을", meaning: "物品", grammar: "받다 的宾语。" },
            { token: "받을 수 있어요", meaning: "能收到", grammar: "V-(으)ㄹ 수 있다 表示可能。" }
          ],
          selfStudyNote: "这句比第一句多了一个条件从句：주문하면。读的时候先切成“如果下单 / 几天内 / 能收到”。",
          substitutions: [
            { korean: "한국에서는 오늘 주문하면 내일 받을 수 있어요.", chinese: "在韩国，今天下单明天就能收到。" },
            { korean: "인터넷으로 책을 주문하면 집에서 받을 수 있어요.", chinese: "如果在网上订书，可以在家收到。" }
          ]
        },
        s3: {
          structure: "范围 + 时间条件 + 时间结果 + 对象 + 可能表达",
          structureParts: [
            { label: "范围", korean: "어떤 쇼핑몰에서는", note: "어떤 表示“某些”，쇼핑몰에서는 表示在某些购物平台上。" },
            { label: "时间条件", korean: "오늘 주문하면", note: "今天下单的话，으면 表示条件。" },
            { label: "时间结果", korean: "내일", note: "表示收到快递的时间：明天。" },
            { label: "对象", korean: "택배를", note: "택배 + 를，是 받을 的对象。" },
            { label: "可能表达", korean: "받을 수 있어요", note: "表示能够收到。" }
          ],
          breakdown: [
            { token: "어떤", meaning: "某些/有的", grammar: "修饰后面的 쇼핑몰。" },
            { token: "쇼핑몰에서는", meaning: "在购物平台上", grammar: "쇼핑몰 + 에서는，表示范围。" },
            { token: "오늘", meaning: "今天", grammar: "时间词。" },
            { token: "주문하면", meaning: "如果下单", grammar: "주문하다 + -(으)면。" },
            { token: "내일", meaning: "明天", grammar: "时间词。" },
            { token: "택배를", meaning: "快递", grammar: "택배 + 를，宾语。" },
            { token: "받을 수 있어요", meaning: "能收到", grammar: "V-(으)ㄹ 수 있다。" }
          ],
          selfStudyNote: "这句核心对比是 오늘 和 내일：今天下单，明天收到。",
          substitutions: [
            { korean: "오늘 주문하면 내일 책을 받을 수 있어요.", chinese: "今天下单的话，明天能收到书。" },
            { korean: "어떤 곳에서는 오늘 사면 내일 받을 수 있어요.", chinese: "有些地方今天买，明天能收到。" }
          ]
        },
        s4: {
          structure: "补充范围 + 截止时间 + 条件 + 当天时间 + 可能表达",
          structureParts: [
            { label: "补充范围", korean: "또 어떤 곳에서는", note: "또 表示补充另一个情况，어떤 곳에서는 表示某些地方。" },
            { label: "截止时间", korean: "오후 2시 전에", note: "전에 表示在某个时间之前。" },
            { label: "条件", korean: "주문하면", note: "如果下单。" },
            { label: "当天时间", korean: "그날 저녁에", note: "그날 是当天，저녁에 是晚上这个时间点。" },
            { label: "可能表达", korean: "받을 수 있어요", note: "能收到。" }
          ],
          breakdown: [
            { token: "또", meaning: "另外/又", grammar: "连接副词，补充新情况。" },
            { token: "어떤 곳에서는", meaning: "在某些地方", grammar: "곳 + 에서는，表示范围。" },
            { token: "오후 2시 전에", meaning: "下午两点前", grammar: "时间 + 전에，表示之前。" },
            { token: "주문하면", meaning: "如果下单", grammar: "条件表达。" },
            { token: "그날 저녁에", meaning: "当天晚上", grammar: "时间表达，에 标记时间点。" },
            { token: "받을 수 있어요", meaning: "能收到", grammar: "可能表达。" }
          ],
          selfStudyNote: "这句的关键信息是截止时间：오후 2시 전에。先找到“几点前”，再看“什么时候能收到”。",
          substitutions: [
            { korean: "오전 10시 전에 주문하면 오후에 받을 수 있어요.", chinese: "上午十点前下单的话，下午能收到。" },
            { korean: "오늘 주문하면 그날 저녁에 받을 수 있어요.", chinese: "今天下单的话，当天晚上能收到。" }
          ]
        },
        s5: {
          structure: "不仅A + 而且B + 工具/方式 + 可能表达",
          structureParts: [
            { label: "不仅A", korean: "옷이나 책뿐만 아니라", note: "뿐만 아니라 表示“不仅……而且……”。" },
            { label: "而且B", korean: "과일이나 달걀까지", note: "까지 表示“连……也/甚至”。" },
            { label: "工具/方式", korean: "인터넷으로", note: "通过互联网。" },
            { label: "可能表达", korean: "주문할 수 있어요", note: "주문하다 + ㄹ 수 있어요，表示“可以订购”。" }
          ],
          breakdown: [
            { token: "옷이나", meaning: "衣服或", grammar: "이나 表示选择：或者。" },
            { token: "책뿐만 아니라", meaning: "不仅书", grammar: "N뿐만 아니라 表示“不仅……”。" },
            { token: "과일이나", meaning: "水果或", grammar: "이나 表示选择。" },
            { token: "달걀까지", meaning: "连鸡蛋也", grammar: "까지 表示范围延伸到某物。" },
            { token: "인터넷으로", meaning: "通过互联网", grammar: "으로 表示方式。" },
            { token: "주문할 수 있어요", meaning: "可以订购", grammar: "주문하다 + ㄹ 수 있어요。" }
          ],
          selfStudyNote: "这句不是普通列举，而是在强调网购范围扩大：不只是衣服、书，连水果和鸡蛋也能订。",
          substitutions: [
            { korean: "책뿐만 아니라 음식도 인터넷으로 주문할 수 있어요.", chinese: "不仅书，食物也可以在网上订购。" },
            { korean: "옷이나 과일도 인터넷으로 살 수 있어요.", chinese: "衣服或水果也可以在网上买。" }
          ]
        }
      };

      chapterThirteen.sentences.forEach((sentence) => {
        Object.assign(sentence, sentenceDetails[sentence.id] || {});
        sentence.grammarPoints = (sentence.grammarIds || [])
          .map((id) => chapterThirteen.grammar.find((grammar) => grammar.id === id))
          .filter(Boolean)
          .map((grammar) => ({ title: grammar.pattern || grammar.id, explanation: grammar.meaningZh || grammar.usage }));
      });
    }

    const chapterTwenty = items.find((item) => item.id === "20");
    if (chapterTwenty && !chapterTwenty.v3ManualReady) {
      chapterTwenty.v3ManualReady = true;
      const sentenceDetails = {
        s1: {
          structure: "收信人 + 书信助词",
          structureParts: [
            { label: "收信人", korean: "주석이", note: "人名后加 이，语气更亲近，也便于接后面的助词。" },
            { label: "书信助词", korean: "에게", note: "에게 表示“给/致某人”，在信件开头相当于“写给……”。" }
          ],
          breakdown: [
            { token: "주석이", meaning: "柱锡", grammar: "收信人的名字，이 是亲近称呼中常见的补充音节。" },
            { token: "에게", meaning: "给/致", grammar: "对象助词，标记这封信写给谁。" }
          ],
          selfStudyNote: "这不是普通陈述句，而是书信开头。看到 人名 + 에게，可以先理解为中文里的“致……”。",
          substitutions: [
            { korean: "친구에게.", chinese: "致朋友。" },
            { korean: "선생님께.", chinese: "致老师。께 是更尊敬的“给”。" }
          ]
        },
        s2: {
          structure: "呼语 + 问候表达",
          structureParts: [
            { label: "呼语", korean: "주석아", note: "아/야 接在人名后，用来直接叫对方，语气亲近。" },
            { label: "问候表达", korean: "오랜만이야", note: "오랜만이다 的非敬语形式，意思是“好久不见”。" }
          ],
          breakdown: [
            { token: "주석아", meaning: "柱锡啊", grammar: "名字 + 아/야，是朋友之间直接称呼对方。" },
            { token: "오랜만이야", meaning: "好久不见", grammar: "이다 变成 이야，属于亲近、口语化的句末形式。" }
          ],
          selfStudyNote: "这句建立信件语气：亲近、自然，不是正式通知。读的时候把 주석아 和 오랜만이야 分成“叫人 + 问候”。",
          substitutions: [
            { korean: "민수야, 오랜만이야.", chinese: "民秀，好久不见。" },
            { korean: "친구야, 정말 오랜만이야.", chinese: "朋友，真的好久不见。" }
          ]
        },
        s3: {
          structure: "程度副词 + 近况确认",
          structureParts: [
            { label: "程度副词", korean: "잘", note: "表示“好好地/顺利地”，修饰 지내다。" },
            { label: "近况确认", korean: "지내지?", note: "지내다 + 지?，带有“你过得还好吧？”的确认语气。" }
          ],
          breakdown: [
            { token: "잘", meaning: "好好地/顺利地", grammar: "副词，说明生活、近况的状态。" },
            { token: "지내지?", meaning: "过得好吧？", grammar: "지내다 + 지?，向熟人确认自己预期中的事实。" }
          ],
          selfStudyNote: "잘 지내지? 比单纯 질문 更像信里的自然问候：我猜你过得不错，同时轻轻确认一下。",
          substitutions: [
            { korean: "잘 지내?", chinese: "你过得好吗？" },
            { korean: "요즘 잘 지내지?", chinese: "最近过得不错吧？" }
          ]
        },
        s4: {
          structure: "指示词 + 地点话题 + 状态询问",
          structureParts: [
            { label: "指示词", korean: "그", note: "指对方所在或前文已知的地方，中文可译作“那”。" },
            { label: "地点话题", korean: "곳은", note: "곳 + 은，把“那个地方”拿出来作为话题。" },
            { label: "状态询问", korean: "어때?", note: "어떻다 的口语疑问形式，意思是“怎么样？”" }
          ],
          breakdown: [
            { token: "그", meaning: "那/那个", grammar: "指示词，修饰后面的 곳。" },
            { token: "곳은", meaning: "那个地方", grammar: "곳 + 은，主题助词提示“至于那个地方”。" },
            { token: "어때?", meaning: "怎么样？", grammar: "어떻다 的口语疑问，询问状态或感受。" }
          ],
          selfStudyNote: "这句可以整体记成 그 곳은 어때?，用于问对方所在地、学校、工作环境等“那边怎么样”。",
          substitutions: [
            { korean: "학교는 어때?", chinese: "学校怎么样？" },
            { korean: "그 도시는 어때?", chinese: "那个城市怎么样？" }
          ]
        },
        s5: {
          structure: "地点话题 + 变化程度 + 变化进行",
          structureParts: [
            { label: "地点话题", korean: "한국은", note: "한국 + 은，把韩国的天气情况作为话题。" },
            { label: "变化程度", korean: "점점", note: "表示变化逐步加深，中文是“越来越”。" },
            { label: "变化进行", korean: "추워지고 있어", note: "춥다 → 추워지다 表示“变冷”，고 있어 表示这个变化正在持续。" }
          ],
          breakdown: [
            { token: "한국은", meaning: "韩国呢/韩国这里", grammar: "主题助词 은，提示接下来讲韩国的情况。" },
            { token: "점점", meaning: "越来越", grammar: "程度副词，常和 변화 表达搭配。" },
            { token: "추워지고", meaning: "正在变冷", grammar: "춥다 + 어지다 变成“变冷”，再接 고。" },
            { token: "있어", meaning: "在……着", grammar: "V-고 있다 的口语形式，表示变化正在进行。" }
          ],
          selfStudyNote: "这一句重点不是单词 춥다，而是 추워지고 있어：天气正在一点点变冷。",
          substitutions: [
            { korean: "날씨가 점점 따뜻해지고 있어.", chinese: "天气正在越来越暖和。" },
            { korean: "한국은 점점 추워져.", chinese: "韩国越来越冷。" }
          ]
        },
        s6: {
          structure: "时间副词 + 主体 + 已发生动作 + 推测表达",
          structureParts: [
            { label: "时间副词", korean: "벌써", note: "表示比预想更早，中文是“已经”。" },
            { label: "主体", korean: "겨울이", note: "겨울 + 이，标出“冬天”这个主体。" },
            { label: "已发生动作", korean: "온 것", note: "오다 的过去冠形形 온 + 것，表示“来了这件事/状态”。" },
            { label: "推测表达", korean: "같아", note: "같다 的口语形式，表示“好像/感觉”。" }
          ],
          breakdown: [
            { token: "벌써", meaning: "已经", grammar: "时间副词，带有“比想象中早”的感觉。" },
            { token: "겨울이", meaning: "冬天", grammar: "主格助词 이，标出到来的主体。" },
            { token: "온", meaning: "来了的", grammar: "오다 的过去冠形形，修饰 것。" },
            { token: "것 같아", meaning: "好像/感觉", grammar: "V-(으)ㄴ 것 같다，表示说话人的推测或感觉。" }
          ],
          selfStudyNote: "把 온 것 같아 合起来看：不是“来的东西像”，而是“好像已经来了”。",
          substitutions: [
            { korean: "봄이 온 것 같아.", chinese: "好像春天来了。" },
            { korean: "벌써 시간이 된 것 같아.", chinese: "好像已经到时间了。" }
          ]
        },
        s7: {
          structure: "地点话题 + 原因 + 羡慕/推测",
          structureParts: [
            { label: "地点话题", korean: "거기는", note: "거기 + 는，指对方所在的那里。" },
            { label: "原因", korean: "따뜻해서", note: "따뜻하다 + 아/어서，表示“因为暖和”。" },
            { label: "羡慕/推测", korean: "좋겠다", note: "좋다 + 겠다，表达“应该很好吧/真不错”。" }
          ],
          breakdown: [
            { token: "거기는", meaning: "那里呢", grammar: "主题助词 는，提示对方所在地。" },
            { token: "따뜻해서", meaning: "因为暖和", grammar: "A/V-아/어서 表示原因或顺承。" },
            { token: "좋겠다", meaning: "真不错/应该很好", grammar: "겠 表示推测或羡慕语气。" }
          ],
          selfStudyNote: "좋겠다 在这里不是单纯“会好”，而是看到对方条件不错时说“真好啊”。",
          substitutions: [
            { korean: "날씨가 좋아서 좋겠다.", chinese: "天气好，真不错。" },
            { korean: "거기는 조용해서 좋겠다.", chinese: "那里很安静，真不错。" }
          ]
        },
        s8: {
          structure: "共同回忆 + 时间条件 + 频率 + 对象 + 回忆确认",
          structureParts: [
            { label: "共同回忆", korean: "우리", note: "这里指“我们俩/我们一起”，带出共同经历。" },
            { label: "时间条件", korean: "겨울 되면", note: "되다 + 면，表示“到了冬天的话/每到冬天”。" },
            { label: "频率", korean: "항상", note: "表示“总是”，强调这是反复发生的回忆。" },
            { label: "对象", korean: "눈사람", note: "堆/做的对象是雪人。" },
            { label: "回忆确认", korean: "만들었잖아", note: "만들다 + 었잖아，用来提醒对方“我们不是做过嘛”。" }
          ],
          breakdown: [
            { token: "우리", meaning: "我们", grammar: "在朋友信件里常指说话人和收信人共同的经历。" },
            { token: "겨울 되면", meaning: "到了冬天的话", grammar: "되다 + 면，表示时间条件。" },
            { token: "항상", meaning: "总是", grammar: "频率副词。" },
            { token: "눈사람", meaning: "雪人", grammar: "만들다 的对象，口语中常省略 을。" },
            { token: "만들었잖아", meaning: "不是做过嘛", grammar: "过去式 + 잖아，提醒对方共同知道的事实。" }
          ],
          selfStudyNote: "잖아 是这句的情感重点：写信的人不是在陈述事实，而是在拉出共同回忆。",
          substitutions: [
            { korean: "우리 방학 되면 항상 놀러 갔잖아.", chinese: "我们一到假期总是出去玩，不是吗？" },
            { korean: "우리 같이 눈사람 만들었잖아.", chinese: "我们一起堆过雪人嘛。" }
          ]
        },
        s9: {
          structure: "回忆动词 + 疑问语气",
          structureParts: [
            { label: "回忆动词", korean: "기억나", note: "기억나다 表示“想起来/记得起来”。" },
            { label: "疑问语气", korean: "?", note: "在信中接上一句共同回忆，意思是“还记得吗？”" }
          ],
          breakdown: [
            { token: "기억나?", meaning: "还记得吗？", grammar: "기억나다 的非敬语疑问形式，直接问对方是否还记得。" }
          ],
          selfStudyNote: "这一句要和上一句连读：先说共同回忆，再问 기억나?，情感上很自然。",
          substitutions: [
            { korean: "그날 기억나?", chinese: "还记得那天吗？" },
            { korean: "우리 약속 기억나?", chinese: "还记得我们的约定吗？" }
          ]
        },
        s10: {
          structure: "时间范围 + 方向地点 + 未来动作 + 确认语气",
          structureParts: [
            { label: "时间范围", korean: "이번 겨울에는", note: "이번 겨울 + 에는，把“这个冬天”作为时间范围。" },
            { label: "方向地点", korean: "한국에", note: "에 表示动作到达的方向：来韩国。" },
            { label: "未来动作", korean: "올", note: "오다 的未来/冠形形式，修饰后面的 거。" },
            { label: "确认语气", korean: "거지?", note: "것이지? 的口语缩略，表示“会……吧？”" }
          ],
          breakdown: [
            { token: "이번", meaning: "这次/这个", grammar: "限定后面的 겨울。" },
            { token: "겨울에는", meaning: "这个冬天", grammar: "겨울 + 에는，时间范围。" },
            { token: "한국에", meaning: "到韩国", grammar: "에 表示来/去的方向。" },
            { token: "올", meaning: "会来的", grammar: "오다 的未来冠形形。" },
            { token: "거지?", meaning: "……吧？", grammar: "确认对方计划或自己期待的事实。" }
          ],
          selfStudyNote: "올 거지? 带期待感，常用于熟人之间确认计划：你会来的吧？",
          substitutions: [
            { korean: "이번 주말에는 올 거지?", chinese: "这个周末你会来吧？" },
            { korean: "한국에 다시 올 거지?", chinese: "你会再来韩国吧？" }
          ]
        },
        s11: {
          structure: "说话人 + 近况时间 + 练习内容 + 进行状态",
          structureParts: [
            { label: "说话人", korean: "나", note: "非敬语里常用 나 表示“我”。" },
            { label: "近况时间", korean: "요즘", note: "表示最近这段时间，常用于说自己的近况。" },
            { label: "练习内容", korean: "요리", note: "练习的内容是做菜/料理。" },
            { label: "进行状态", korean: "연습하고 있어", note: "연습하다 + 고 있어，表示正在练习。" }
          ],
          breakdown: [
            { token: "나", meaning: "我", grammar: "非敬语主语，朋友间自然使用。" },
            { token: "요즘", meaning: "最近", grammar: "时间副词，引出近况。" },
            { token: "요리", meaning: "做菜/料理", grammar: "연습하다 的内容，口语中可省略 을。" },
            { token: "연습하고", meaning: "练习着", grammar: "연습하다 + 고，连接 있어。" },
            { token: "있어", meaning: "正在", grammar: "V-고 있다 的非敬语形式。" }
          ],
          selfStudyNote: "这是典型“近况句”：나 + 요즘 + 内容 + 하고 있어，可以直接套用来写自己的自学记录。",
          substitutions: [
            { korean: "나 요즘 한국어 공부하고 있어.", chinese: "我最近在学韩语。" },
            { korean: "나 요즘 운동 연습하고 있어.", chinese: "我最近在练运动。" }
          ]
        },
        s12: {
          structure: "到达条件 + 食物对象 + 数量程度 + 受益承诺",
          structureParts: [
            { label: "到达条件", korean: "한국에 오면", note: "한국에 + 오다 + 면，表示“你来韩国的话”。" },
            { label: "食物对象", korean: "맛있는 것", note: "맛있다 的冠形形 맛있는 修饰 것，表示“好吃的东西”。" },
            { label: "数量程度", korean: "많이", note: "表示“很多”，修饰后面的 만들다。" },
            { label: "受益承诺", korean: "만들어 줄게", note: "V-아/어 주다 表示为对方做，ㄹ게 表示说话人的承诺。" }
          ],
          breakdown: [
            { token: "한국에", meaning: "到韩国", grammar: "에 表示到达方向。" },
            { token: "오면", meaning: "如果/当你来", grammar: "오다 + 면，表示条件或时间。" },
            { token: "맛있는", meaning: "好吃的", grammar: "맛있다 的现在冠形形，修饰 것。" },
            { token: "것", meaning: "东西", grammar: "代词性名词，指好吃的食物。" },
            { token: "많이", meaning: "很多", grammar: "副词，修饰 만들어 줄게。" },
            { token: "만들어 줄게", meaning: "我会给你做", grammar: "만들다 + 아/어 주다 + ㄹ게，表示为对方做并作出承诺。" }
          ],
          selfStudyNote: "这句的核心是 만들어 줄게：不是单纯“做”，而是“做给你”。这是朋友信件里很温暖的承诺。",
          substitutions: [
            { korean: "집에 오면 밥을 만들어 줄게.", chinese: "你来家里的话，我会给你做饭。" },
            { korean: "한국에 오면 맛있는 것을 사 줄게.", chinese: "你来韩国的话，我会给你买好吃的。" }
          ]
        },
        s13: {
          structure: "转换连接 + 时间终点 + 问候动作",
          structureParts: [
            { label: "转换连接", korean: "그럼", note: "表示“那么/那就”，常用于信件结尾转入收束。" },
            { label: "时间终点", korean: "그때까지", note: "그때 + 까지，表示“到那时为止”。" },
            { label: "问候动作", korean: "잘 지내", note: "지내다 的非敬语祈使/叮嘱形式，意思是“好好过”。" }
          ],
          breakdown: [
            { token: "그럼", meaning: "那么/那就", grammar: "连接副词，进入结尾。" },
            { token: "그때까지", meaning: "到那时为止", grammar: "까지 表示时间终点。" },
            { token: "잘", meaning: "好好地", grammar: "副词，修饰 지내。" },
            { token: "지내", meaning: "过/生活", grammar: "지내다 的非敬语结尾，可作叮嘱。" }
          ],
          selfStudyNote: "잘 지내 在结尾不是询问，而是叮嘱：到见面之前要好好过。",
          substitutions: [
            { korean: "그때까지 건강하게 지내.", chinese: "到那时为止要健康地过。" },
            { korean: "그럼 잘 지내.", chinese: "那就好好过。" }
          ]
        },
        s14: {
          structure: "想见对象 + 愿望表达",
          structureParts: [
            { label: "想见动作", korean: "보고", note: "보다 + 고，接 싶다 构成“想看/想见”。" },
            { label: "愿望表达", korean: "싶어", note: "싶다 的非敬语形式，表示愿望；보고 싶어 常译为“想你/想见你”。" }
          ],
          breakdown: [
            { token: "보고", meaning: "见/看", grammar: "보다 和 싶다 搭配时，表示“想见”。" },
            { token: "싶어", meaning: "想", grammar: "V-고 싶다 的非敬语形式，表示愿望。" }
          ],
          selfStudyNote: "보고 싶어 在信件结尾通常不是字面“想看”，而是“我想你/想见你”。",
          substitutions: [
            { korean: "너를 보고 싶어.", chinese: "我想见你。" },
            { korean: "친구들이 보고 싶어.", chinese: "我想朋友们。" }
          ]
        },
        s15: {
          structure: "年份 + 月份 + 日期",
          structureParts: [
            { label: "年份", korean: "2018년", note: "년 表示年份。" },
            { label: "月份", korean: "10월", note: "월 表示月份。" },
            { label: "日期", korean: "30일", note: "일 表示日期。" }
          ],
          breakdown: [
            { token: "2018년", meaning: "2018年", grammar: "数字 + 년，表示年份。" },
            { token: "10월", meaning: "10月", grammar: "数字 + 월，表示月份。" },
            { token: "30일", meaning: "30日", grammar: "数字 + 일，表示日期。" }
          ],
          selfStudyNote: "这是信件日期，按“年 + 月 + 日”的顺序读，不需要当作普通句子分析。",
          substitutions: [
            { korean: "2026년 6월 13일.", chinese: "2026年6月13日。" },
            { korean: "12월 25일.", chinese: "12月25日。" }
          ]
        },
        s16: {
          structure: "署名人 + 发信人标记",
          structureParts: [
            { label: "署名人", korean: "경은이", note: "写信人的名字。" },
            { label: "发信人标记", korean: "가", note: "信件落款里 人名 + 가/이가 可理解为“……写”。" }
          ],
          breakdown: [
            { token: "경은이", meaning: "京恩", grammar: "发信人的名字。" },
            { token: "가", meaning: "由/写", grammar: "信件落款中的主格助词，标出写信人。" }
          ],
          selfStudyNote: "경은이가 是韩语信件常见落款，不要硬译成完整主谓句；理解成“京恩写”。",
          substitutions: [
            { korean: "민수가.", chinese: "民秀写。" },
            { korean: "친구가.", chinese: "朋友写。" }
          ]
        }
      };
      const vocabularyDetails = {
        "오랜만이다": { roleInSentence: "오랜만이야：信件开头的亲近问候，表示“好久不见”。", collocations: [{ korean: "오랜만이야.", chinese: "好久不见。" }, { korean: "정말 오랜만이다.", chinese: "真的好久不见。" }], note: "固定问候表达，重点记口语形式 오랜만이야。" },
        "추워지다": { roleInSentence: "추워지고 있어：描述天气正在变冷。", collocations: [{ korean: "날씨가 추워져요.", chinese: "天气变冷。" }, { korean: "점점 추워지고 있어.", chinese: "正在越来越冷。" }], note: "춥다 是“冷”，추워지다 是“变冷”，不要混成一个静态形容词。" },
        "보고 싶다": { meaningEn: "to miss; to want to see", meaningZh: "想念/想见", roleInSentence: "보고 싶어：信件结尾表达想念对方。", collocations: [{ korean: "보고 싶어.", chinese: "我想你/想见你。" }, { korean: "친구가 보고 싶어요.", chinese: "我想朋友。" }], confusingWords: [{ word: "보다", difference: "보다 是“看/见”；보고 싶다 是“想见/想念”，在信件中常译为“想你”。" }], note: "这是情感表达，不是“制作”。第 20 章应按“想念/想见”掌握。" }
      };

      chapterTwenty.sentences.forEach((sentence) => {
        Object.assign(sentence, sentenceDetails[sentence.id] || {});
        sentence.grammarPoints = (sentence.grammarIds || [])
          .map((id) => chapterTwenty.grammar.find((grammar) => grammar.id === id))
          .filter(Boolean)
          .map((grammar) => ({ title: grammar.pattern || grammar.id, explanation: grammar.meaningZh || grammar.usage }));
      });
      chapterTwenty.vocabulary.forEach((word) => {
        const detail = vocabularyDetails[word.ko];
        if (!detail) return;
        Object.assign(word, detail);
      });
    }

    applyPriorityManualChapter("24", {
      s1: {
        structure: "所属关系 + 介绍对象 + 数量单位 + 意愿表达",
        note: "这是人物介绍的开头句。读的时候先找“介绍谁”，再看 소개할게요 表示“我来介绍”。",
        breakdown: [["제", "我的", "저의 的缩略，放在名词前表示所属。"], ["친구를", "朋友", "친구 + 를，标出要介绍的对象。"], ["한", "一个", "数词，修饰后面的 명。"], ["명", "名/位", "数人的单位。"], ["소개할게요", "我来介绍", "소개하다 + ㄹ게요，表示说话人的意愿或承诺。"]]
      },
      s2: {
        structure: "姓名话题 + 名字说明",
        note: "이름은 ...예요 是介绍姓名的基本模板，可以整体记成“名字叫……”。",
        breakdown: [["이름은", "名字是", "이름 + 은，把名字作为说明话题。"], ["최수지예요", "是崔秀智", "人名 + 예요，礼貌陈述“是……”。"]]
      },
      s3: {
        structure: "关系对象 + 起点时间 + 身份说明",
        note: "这句说明关系从什么时候开始。原文 때부터친구예요 连写，阅读时按 때부터 / 친구예요 切开。",
        breakdown: [["저랑", "和我", "저 + 랑，口语里的“和我/跟我”。"], ["초등학교", "小学", "表示时间背景。"], ["때부터", "从……时候起", "때 + 부터，表示起点。"], ["친구예요", "是朋友", "친구 + 예요，说明关系。"]]
      },
      s4: {
        structure: "关系对象 + 最高程度 + 亲密状态 + 身份说明",
        note: "가장 친한 친구 是高频整体表达，意思是“最亲近的朋友/最好的朋友”。",
        breakdown: [["저랑", "和我", "랑 表示“和”。"], ["가장", "最", "程度副词，表示最高程度。"], ["친한", "亲近的", "친하다 的冠形形，修饰 친구。"], ["친구예요", "是朋友", "名词 + 예요。"]]
      },
      s5: {
        structure: "人物话题 + 性格主体 + 状态描述",
        note: "성격이 밝아요 是介绍性格的固定搭配，自然译为“性格开朗”。",
        breakdown: [["수지는", "秀智呢", "수지 + 는，把秀智作为介绍对象。"], ["성격이", "性格", "성격 + 이，标出被描述的主体。"], ["밝아요", "开朗", "밝다 + 아요，描述性格明朗。"]]
      },
      s6: {
        structure: "补充连接 + 喜欢对象 + 程度副词 + 喜好表达",
        note: "걸 是关键：사람 만나는 걸 表示“见人这件事”，整体作 좋아해요 的对象。",
        breakdown: [["그리고", "而且", "连接副词，继续补充人物特点。"], ["사람", "人", "만나다 的对象。"], ["만나는", "见/见面的", "만나다 的现在冠形形，修饰 것。"], ["걸", "这件事", "것을 的口语缩略，作 좋아하다 的宾语。"], ["정말", "非常/真的", "程度副词。"], ["좋아해요", "喜欢", "좋아하다 的礼貌现在式。"]]
      },
      s7: {
        structure: "结果连接 + 周边范围 + 认识的人 + 数量状态",
        note: "这句承接上一句：因为喜欢见人，所以身边认识的人很多。",
        breakdown: [["그래서", "所以", "结果连接副词。"], ["주변에", "周围/身边", "주변 + 에，表示范围或位置。"], ["아는", "认识的", "알다 的现在冠形形，修饰 사람들。"], ["사람들이", "人们", "사람들 + 이，主格助词。"], ["많아요", "很多", "많다 的礼貌现在式。"]]
      },
      s8: {
        structure: "积极原因 + 共同影响 + 新对象 + 数量程度 + 过去结果",
        note: "N 덕분에 常用于积极结果。这里说明秀智带来的影响：我也交到了很多新朋友。",
        breakdown: [["수지", "秀智", "덕분에 的前项，说明多亏谁。"], ["덕분에", "多亏", "N 덕분에 表示积极原因。"], ["저도", "我也", "저 + 도，表示“也”。"], ["새로운", "新的", "새롭다 的冠形形，修饰 친구。"], ["친구를", "朋友", "宾格助词 를，标出 사귀다 的对象。"], ["많이", "很多", "副词，修饰动作结果。"], ["사귀었어요", "交到了", "사귀다 的礼貌过去式。"]]
      }
    }, {
      "소개하다": { roleInSentence: "소개할게요：介绍文开头的动作，表示“我来介绍”。", note: "重点掌握 소개하다 和 소개할게요 的关系：一个是原形，一个是“我来介绍”。" },
      "친하다": { roleInSentence: "친한 친구：形容朋友关系亲近。", note: "친하다 是关系亲近，不是物理距离近。" },
      "덕분에": { roleInSentence: "수지 덕분에：说明积极结果的原因。", confusingWords: [{ word: "때문에", difference: "덕분에 多用于积极结果；때문에 可中性或负面。" }], note: "介绍人物影响时很好用：N 덕분에 + 좋은 결과。" },
      "사귀다": { roleInSentence: "친구를 사귀었어요：表示结交朋友。", note: "和 친구 搭配时是“交朋友/结交”，不是简单“交往”。" }
    });

    applyPriorityManualChapter("09", {
      s1: { structure: "说话人话题 + 频率 + 去处 + 动作", note: "开头先交代个人习惯：我有时去书店。가끔 是频率词。", breakdown: [["저는", "我呢", "저 + 는，把说话人作为话题。"], ["가끔", "有时", "频率副词。"], ["서점에", "去书店/在书店", "서점 + 에，这里表示去的方向。"], ["가요", "去", "가다 的礼貌现在式。"]] },
      s2: { structure: "地点条件 + 顺序副词 + 查看对象 + 动作", note: "가면 表示“去的话/到了之后”。这句是逛书店的第一步：先看畅销书。", breakdown: [["서점에", "到书店", "에 表示方向。"], ["가면", "去的话/到了之后", "가다 + 면，表示条件或时间。"], ["먼저", "首先", "顺序副词。"], ["베스트셀러", "畅销书", "外来词 best seller。"], ["책들을", "书", "책들 + 을，复数对象。"], ["확인해요", "查看/确认", "확인하다 的礼貌现在式。"]] },
      s3: { structure: "顺序连接 + 新近状态 + 查看对象 + 动作", note: "그러고 나서 是“然后”的顺序连接，새로 나온 책들 指“新出的书”。", breakdown: [["그러고", "那样做之后", "和 나서 一起构成顺序连接。"], ["나서", "之后", "V-고 나서 表示做完前一动作后。"], ["새로", "新近/新地", "副词，修饰 나온。"], ["나온", "出来的/出版的", "나오다 的过去冠形形。"], ["책들을", "书", "책들 + 을，查看的对象。"], ["확인해요", "查看", "확인하다 的礼貌现在式。"]] },
      s4: { structure: "说话人话题 + 主要频率 + 阅读对象 + 动作", note: "주로 表示“主要/通常”，说明自己平时读什么类型。", breakdown: [["저는", "我呢", "主题表达。"], ["주로", "主要/通常", "频率或倾向副词。"], ["소설을", "小说", "소설 + 을，읽다 的对象。"], ["읽어요", "读", "읽다 的礼貌现在式。"]] },
      s5: { structure: "近况时间 + 类型修饰 + 阅读对象 + 进行状态", note: "읽고 있어요 表示正在读，不是普通习惯。요즘에는 把时间限定在最近。", breakdown: [["요즘에는", "最近", "요즘 + 에는，限定当前阶段。"], ["추리", "推理", "修饰 소설。"], ["소설을", "小说", "阅读对象。"], ["읽고", "读着", "읽다 + 고，连接 있어요。"], ["있어요", "正在", "V-고 있다 的礼貌现在式。"]] },
      s6: { structure: "说话人话题 + 购买前 + 少量试读 + 喜好表达", note: "사기 전에 是“买之前”，읽어 보는 걸 是“试着读一读这件事”。", breakdown: [["저는", "我呢", "主题表达。"], ["책을", "书", "사다 的对象。"], ["사기", "买", "사다 名词化，用在 전에 前。"], ["전에", "之前", "N/V-기 전에 表示之前。"], ["조금", "一点", "程度/数量副词。"], ["읽어", "读", "읽다 的连接形。"], ["보는", "试着……的", "V-아/어 보다 表示尝试。"], ["걸", "这件事", "것을 的口语缩略，作 좋아하다 的对象。"], ["좋아해요", "喜欢", "좋아하다 的礼貌现在式。"]] },
      s7: { structure: "结果连接 + 大型地点 + 动作", note: "그래서 连接原因和结果：因为喜欢试读，所以去大书店。", breakdown: [["그래서", "所以", "结果连接副词。"], ["큰", "大的", "크다 的冠形形，修饰 서점。"], ["서점에", "到书店", "方向地点。"], ["가요", "去", "礼貌现在式。"]] },
      s8: { structure: "地点范围 + 座位位置 + 动作顺承 + 阅读可能", note: "这句核心是 읽을 수 있어요：在大书店可以坐着读书。", breakdown: [["큰", "大的", "修饰 서점。"], ["서점에서는", "在大书店里", "서점 + 에서는，表示地点范围。"], ["의자에", "在椅子上", "의자 + 에，表示位置。"], ["앉아서", "坐着/坐下后", "앉다 + 아서，表示方式或顺承。"], ["책을", "书", "읽다 的对象。"], ["읽을", "读的/可读的", "읽다 的 ㄹ 形，接 수。"], ["수", "办法/可能性", "和 있어요 构成 ㄹ 수 있다。"], ["있어요", "可以/有", "ㄹ 수 있어요 表示可以。"]] }
    });

    applyPriorityManualChapter("16", {
      s1: { structure: "地点范围 + 时间场合 + 食物对象 + 习俗动作", note: "这句先给出韩国生日习俗：生日时喝海带汤。한국에서는 表示文化范围。", breakdown: [["한국에서는", "在韩国", "에서 + 는，表示地点/文化范围。"], ["생일에", "生日时", "생일 + 에，时间点。"], ["미역국을", "海带汤", "미역국 + 을，먹다 的对象。"], ["먹어요", "吃/喝", "먹다 的礼貌现在式，韩语里汤也常用 먹다。"]] },
      s2: { structure: "海带话题 + 功效一 + 连接 + 功效二", note: "해 주다 表示“帮着/使得”。这句解释为什么海带汤和生产恢复相关。", breakdown: [["미역은", "海带呢", "미역 + 은，提出话题。"], ["피를", "血液", "피 + 를，맑게 하다 的对象。"], ["맑게", "清澈/干净地", "맑다 + 게，变成副词性表达。"], ["해", "使……", "하다 的连接形。"], ["주고", "给/帮并且", "주다 + 고，表示帮助并连接下一动作。"], ["상처를", "伤口", "상처 + 를。"], ["낫게", "痊愈地/好起来", "낫다 + 게，表示使其好转。"], ["해", "使……", "하다 的连接形。"], ["줘요", "给/帮助", "주다 的礼貌现在式。"]] },
      s3: { structure: "结果连接 + 传统起点 + 主体 + 分娩之后 + 食物习惯", note: "옛날부터 和 후에 是时间线索：从过去开始，妈妈们生完孩子后喝海带汤。", breakdown: [["그래서", "因此", "结果连接副词。"], ["옛날부터", "从以前起", "옛날 + 부터，表示起点。"], ["엄마들은", "妈妈们", "엄마들 + 은，话题。"], ["아기를", "婴儿", "아기 + 를，낳다 的对象。"], ["낳은", "生下的", "낳다 的过去冠形形。"], ["후에", "之后", "후 + 에，表示之后。"], ["미역국을", "海带汤", "먹다 的对象。"], ["먹었어요", "吃/喝了", "먹다 的礼貌过去式。"]] },
      s4: { structure: "话题转换 + 生日时间 + 疑问词 + 食物对象 + 推测疑问", note: "먹을까요? 不是普通疑问，而是在引导读者思考原因。", breakdown: [["그러면", "那么", "承接前文并提出问题。"], ["생일에는", "生日时", "생일 + 에는，时间话题。"], ["왜", "为什么", "疑问副词。"], ["미역국을", "海带汤", "먹다 的对象。"], ["먹을까요", "会吃呢/为什么吃呢", "먹다 + 을까요，表示疑问或推测。"]] },
      s5: { structure: "母亲主体 + 我作为对象 + 辛苦方式 + 生育受益 + 共同认知", note: "줬잖아요 带有“不是这样嘛”的提醒语气，强调生日也包含对妈妈的感谢。", breakdown: [["엄마가", "妈妈", "엄마 + 가，主语。"], ["나를", "我", "나 + 를，낳다 的对象。"], ["힘들게", "辛苦地", "힘들다 + 게，表示方式。"], ["낳아", "生下", "낳다 的连接形。"], ["줬잖아요", "为我做了嘛", "주다 + 었잖아요，提醒对方共同知道的事实。"]] },
      s6: { structure: "结果连接 + 出生时间 + 给予者 + 感谢心情 + 开始传闻", note: "长句先切成三块：生日这天 / 感谢妈妈 / 据说开始喝海带汤。", breakdown: [["그래서", "所以", "结果连接。"], ["자신이", "自己", "자신 + 이，태어나다 的主体。"], ["태어난", "出生的", "태어나다 的过去冠形形。"], ["생일에", "生日时", "时间点。"], ["낳아", "生下", "낳다 的连接形。"], ["준", "给/为……做的", "주다 的过去冠形形，修饰 엄마。"], ["엄마에게", "给妈妈/对妈妈", "엄마 + 에게，感谢的对象。"], ["감사하는", "感谢的", "감사하다 的现在冠形形。"], ["마음에서", "出于心意", "마음 + 에서，表示出发点。"], ["먹기", "吃/喝这件事", "먹다 名词化。"], ["시작했다고", "据说开始了", "시작하다 的过去引用形。"], ["해요", "说/据说", "하다 的礼貌现在式，构成传闻表达。"]] }
    });

    applyPriorityManualChapter("05", {
      s1: { structure: "睡眠对象 + 充分方式 + 名词化主题 + 程度 + 判断", note: "자는 것은 把“睡觉这件事”变成主题；푹 是睡得充分、踏实。", breakdown: [["잠을", "觉/睡眠", "잠 + 을，자다 的对象。"], ["푹", "好好地/充分地", "副词，常修饰 자다。"], ["자는", "睡的", "자다 的现在冠形形。"], ["것은", "这件事", "것 + 은，把动作名词化成主题。"], ["정말", "真的/非常", "程度副词。"], ["중요해요", "重要", "중요하다 的礼貌现在式。"]] },
      s2: { structure: "睡意主体 + 否定条件 + 方法对象 + 试做建议", note: "잠이 안 오다 是“睡不着”的固定说法；써 보세요 是“试着用”。", breakdown: [["잠이", "睡意/觉", "잠 + 이，오다 的主体。"], ["잘", "好好地/顺利地", "副词。"], ["안", "不", "否定副词。"], ["오면", "来的话", "오다 + 면，条件。"], ["이런", "这样的", "修饰 방법。"], ["방법을", "方法", "방법 + 을，쓰다 的对象。"], ["써", "使用", "쓰다 的连接形。"], ["보세요", "请试试", "보다 的敬语命令，表示尝试。"]] },
      s3: { structure: "序号 + 每天 + 相同时间 + 睡眠动作 + 相同时间 + 起床建议", note: "这是睡眠建议清单。重点看 같은 시간에 重复两次：同一时间睡，同一时间起。", breakdown: [["1.", "第一条", "清单序号。"], ["매일", "每天", "频率副词。"], ["같은", "相同的", "같다 的冠形形。"], ["시간에", "在时间", "시간 + 에，时间点。"], ["잠을", "觉", "자다 的对象。"], ["자고", "睡并且", "자다 + 고，连接动作。"], ["같은", "相同的", "再次修饰 시간。"], ["시간에", "在时间", "时间点。"], ["일어나세요", "请起床", "일어나다 的敬语命令。"]] },
      s4: { structure: "序号 + 白天时间 + 轻度修饰 + 运动对象 + 尝试建议", note: "가벼운 운동 是“轻度运动”，해 보세요 是建议尝试。", breakdown: [["2.", "第二条", "清单序号。"], ["낮에", "白天", "낮 + 에，时间。"], ["가벼운", "轻的/轻度的", "가볍다 的冠形形。"], ["운동을", "运动", "운동 + 을，하다 的对象。"], ["해", "做", "하다 的连接形。"], ["보세요", "请试试", "尝试建议。"]] },
      s5: { structure: "序号 + 睡前时间 + 剧烈运动话题 + 禁止表达", note: "자기 전에 是“睡觉前”，하지 마세요 是礼貌禁止。", breakdown: [["3.", "第三条", "清单序号。"], ["자기", "睡觉", "자다 的名词化表达。"], ["전에", "之前", "前面接名词/名词化动作。"], ["심한", "严重的/剧烈的", "심하다 的冠形形。"], ["운동은", "运动呢", "운동 + 은，作为禁止话题。"], ["하지", "做", "하다 + 지，接 마세요。"], ["마세요", "请不要", "V-지 마세요，礼貌禁止。"]] },
      s6: { structure: "序号 + 晚上范围 + 饮品列举 + 咖啡因说明 + 回避建议", note: "这句长，但结构是“晚上避开含咖啡因的饮料”。같은 表示“像……这样的”。", breakdown: [["4.", "第四条", "清单序号。"], ["저녁에는", "晚上", "저녁 + 에는，时间范围。"], ["커피나", "咖啡或", "나 表示选择。"], ["녹차", "绿茶", "饮品名词。"], ["홍차", "红茶", "饮品名词。"], ["같은", "像……一样的", "修饰后面的 카페인。"], ["카페인이", "咖啡因", "카페인 + 이，있는 的主体。"], ["있는", "有的/含有的", "있다 的冠形形。"], ["음료는", "饮料呢", "음료 + 는，回避对象。"], ["피하세요", "请避开", "피하다 的敬语命令。"]] },
      s7: { structure: "序号 + 晚上时间 + 食物对象 + 过量程度 + 吃的否定禁止", note: "먹지 마세요 是“请不要吃”；너무 많이 是“太多”。", breakdown: [["5.", "第五条", "清单序号。"], ["저녁에", "晚上", "时间点。"], ["음식을", "食物", "음식 + 을，먹다 的对象。"], ["너무", "太", "程度副词。"], ["많이", "多", "程度副词。"], ["먹지", "吃", "먹다 + 지，接 마세요。"], ["마세요", "请不要", "礼貌禁止。"]] },
      s8: { structure: "序号 + 睡前时间 + 温热对象 + 数量单位 + 建议动作", note: "한 잔 是饮料的一杯；드세요 是 먹다/마시다 的尊敬建议形式。", breakdown: [["6.", "第六条", "清单序号。"], ["자기", "睡觉", "名词化表达。"], ["전에", "之前", "时间前置。"], ["따뜻한", "温暖的", "따뜻하다 的冠形形。"], ["우유를", "牛奶", "우유 + 를，喝的对象。"], ["한", "一", "数词。"], ["잔", "杯", "饮料单位。"], ["드세요", "请喝/请用", "들다 的尊敬命令形式。"]] }
    }, {
      "들다": { meaningZh: "喝/吃（尊敬表达）", meaningEn: "to eat or drink honorifically", roleInSentence: "드세요：请喝/请用，是建议动作。", note: "这里不是“拿起”，而是 먹다/마시다 的尊敬表达。" }
    });

    applyPriorityManualChapter("18", {
      s1: { structure: "问候 + 所属单位 + 自我介绍", note: "邀请函开头，先问候，再说明自己是谁。입니다 是正式陈述。", breakdown: [["안녕하세요", "您好", "正式问候。"], ["지나인의", "G9 的", "회사/单位名 + 의，表示所属。"], ["최경은입니다", "我是崔京恩", "姓名 + 입니다，正式自我介绍。"]] },
      s2: { structure: "公司主体 + 成立状态 + 已经 + 时间长度 + 达成", note: "만들어진 지 10년이 되었습니다 表示“成立已有十年”。지 标出经过时间的起点。", breakdown: [["저희", "我们的", "谦逊说法，比 우리 更正式。"], ["회사가", "公司", "회사 + 가，主语。"], ["만들어진", "成立的/被创建的", "만들어지다 的过去冠形形。"], ["지", "以来", "和时间长度搭配表示经过多久。"], ["벌써", "已经", "时间副词。"], ["10년이", "十年", "10년 + 이，经过的时间主体。"], ["되었습니다", "成为/到了", "되다 的正式过去式。"]] },
      s3: { structure: "期间范围 + 帮助内容 + 尊敬给予 + 全部对象 + 感谢", note: "분들께 和 감사드립니다 都很正式，符合邀请函/致谢文体。", breakdown: [["그동안", "这段时间以来", "时间范围。"], ["도움", "帮助", "名词。"], ["주신", "给予的", "주다 的尊敬过去冠形形。"], ["모든", "所有", "修饰 분들。"], ["분들께", "向各位", "분들 + 께，尊敬对象助词。"], ["감사드립니다", "表示感谢", "감사드리다 的正式表达。"]] },
      s4: { structure: "纪念对象 + 迎接/庆祝原因 + 活动对象 + 准备结果", note: "맞이해서 表示“为了迎接/庆祝”，准备的是 작은 행사。", breakdown: [["10주년을", "十周年", "10주년 + 을，맞이하다 的对象。"], ["맞이해서", "为了迎接/庆祝", "맞이하다 + 해서，表示原因或目的。"], ["작은", "小的", "작다 的冠形形。"], ["행사를", "活动", "행사 + 를，준비하다 的对象。"], ["준비했습니다", "准备了", "준비하다 的正式过去式。"]] },
      s5: { structure: "简单餐食 + 并列连接 + 活动主体 + 预定表达", note: "있을 예정입니다 是正式通知里的“将会有/预计有”。", breakdown: [["간단한", "简单的", "간단하다 的冠形形。"], ["식사", "餐食", "名词。"], ["및", "以及", "书面并列连接。"], ["이벤트가", "活动", "이벤트 + 가，있다 的主体。"], ["있을", "会有的", "있다 的未来冠形形。"], ["예정입니다", "预定/计划", "예정 + 입니다，正式表达。"]] },
      s6: { structure: "活动话题 + 日期 + 晚上时间 + 起点 + 举行表达", note: "正式活动信息按“日期 + 时间 + 진행됩니다”读取。부터 标出开始时间。", breakdown: [["행사는", "活动呢", "행사 + 는，说明活动信息。"], ["2019년", "2019年", "年份。"], ["9월", "9月", "月份。"], ["1일", "1日", "日期。"], ["저녁", "晚上", "时间词。"], ["6시부터", "从6点起", "6시 + 부터，开始时间。"], ["진행됩니다", "举行/进行", "진행되다 的正式现在式。"]] },
      s7: { structure: "期待程度 + 出席请求", note: "많은 참석 부탁드립니다 是邀请函结尾固定表达：期待/恳请大家出席。", breakdown: [["많은", "许多的", "많다 的冠形形。"], ["참석", "出席", "名词。"], ["부탁드립니다", "拜托/敬请", "부탁드리다 的正式表达。"]] }
    }, {
      "만들어지다": { meaningZh: "成立/被创建", roleInSentence: "만들어진 지：公司成立以来。", note: "第 18 章语境中指公司成立，不是普通“被制作”。" },
      "들다": { meaningZh: "喝/吃（尊敬表达）", note: "若在饮食语境出现，优先按尊敬表达理解。" }
    });

    function applyPriorityManualChapter(chapterId, sentenceDetails, vocabularyDetails = {}) {
      const chapter = items.find((item) => item.id === chapterId);
      if (!chapter || chapter.v3ManualReady) return;
      chapter.v3ManualReady = true;
      chapter.sentences.forEach((sentence) => {
        const detail = sentenceDetails[sentence.id];
        if (!detail) return;
        sentence.structure = detail.structure;
        sentence.breakdown = detail.breakdown.map(([token, meaning, grammar]) => ({ token, meaning, grammar }));
        sentence.structureParts = detail.breakdown.map(([token, meaning, grammar]) => ({
          label: structureLabelForToken({ text: token, meaning, grammar, form: "" }),
          korean: token,
          note: grammar
        }));
        sentence.selfStudyNote = detail.note.length < 38 ? `${detail.note} 对照中文“${sentence.zh || ""}”，回到韩文确认关键词和句末表达。` : detail.note;
        sentence.substitutions = detail.substitutions || similarSentenceExamples(chapter, sentence, chapter.sentences.indexOf(sentence));
        sentence.substitutionLabel = detail.substitutions ? "替换练习" : "延伸练习";
        sentence.grammarPoints = (sentence.grammarIds || [])
          .map((id) => chapter.grammar.find((grammar) => grammar.id === id))
          .filter(Boolean)
          .map((grammar) => ({ title: grammar.pattern || grammar.id, explanation: grammar.meaningZh || grammar.usage }));
      });
      chapter.vocabulary.forEach((word) => {
        const detail = vocabularyDetails[word.ko];
        if (!detail) return;
        Object.assign(word, detail);
      });
    }
  }

  function enrichChapterV3Defaults(chapterItem) {
    if (!chapterItem || chapterItem.v3DefaultsReady) return;
    chapterItem.v3DefaultsReady = true;
    const grammarById = new Map((chapterItem.grammar || []).map((grammar) => [grammar.id, grammar]));

    (chapterItem.grammar || []).forEach((grammar) => {
      grammar.meaningZh = normalizeGrammarPointExplanation(grammar.pattern || grammar.id, grammar.meaningZh);
      grammar.usage = normalizeGrammarPointExplanation(grammar.pattern || grammar.id, grammar.usage);
    });

    (chapterItem.sentences || []).forEach((sentence, index) => {
      const tokens = normalizedSentenceTokens(sentence, chapterItem);
      sentence.tokens = tokens.map((token) => ({
        text: token.text,
        meaning: token.meaning || "句中表达",
        grammar: normalizeTokenGrammar(token.text, token.grammar) || "普通词块，联系整句确认作用。",
        form: token.form || ""
      }));
      if (!sentence.breakdown || !sentence.breakdown.length) {
        sentence.breakdown = tokens.map((token) => ({
          token: token.text,
          meaning: token.meaning || "句中表达",
          grammar: normalizeTokenGrammar(token.text, token.grammar) || "普通词块，联系整句确认作用。"
        }));
      } else {
        sentence.breakdown = sentence.breakdown.map((item) => {
          const tokenText = item.token || item.text || item[0] || "";
          const meaning = item.meaning || item[1] || "";
          const grammar = item.grammar || item[2] || "";
          return {
            ...item,
            token: tokenText,
            meaning,
            grammar: normalizeTokenGrammar(tokenText, grammar)
          };
        });
      }
      if (!sentence.structureParts || !sentence.structureParts.length) {
        sentence.structureParts = tokens.map((token) => ({
          label: structureLabelForToken(token),
          korean: token.text,
          note: structureNoteForToken(token)
        }));
      } else {
        sentence.structureParts = sentence.structureParts.map((part) => ({
          ...part,
          note: normalizeTokenGrammar(part.korean, part.note) || part.note
        }));
      }
      if (!sentence.structure) {
        sentence.structure = compactLabels(sentence.structureParts).join(" + ") || "词块 + 语法标记 + 句末表达";
      }
      if (!sentence.grammarPoints || !sentence.grammarPoints.length) {
        sentence.grammarPoints = (sentence.grammarIds || [])
          .map((id) => grammarById.get(id))
          .filter(Boolean)
          .map((grammar) => ({
            title: grammar.pattern || grammar.title || grammar.id,
            explanation: grammar.meaningZh || grammar.usage || "回到原句观察这个语法点的作用。"
          }));
      } else {
        sentence.grammarPoints = sentence.grammarPoints.map((item) => ({
          ...item,
          explanation: normalizeGrammarPointExplanation(item.title, item.explanation)
        }));
      }
      if (!sentence.selfStudyNote) {
        sentence.selfStudyNote = defaultSelfStudyNote(chapterItem, sentence, tokens);
      }
      if (sentence.selfStudyNote && sentence.selfStudyNote.length < 38) {
        sentence.selfStudyNote = `${sentence.selfStudyNote} 对照中文“${sentence.zh || ""}”，回到韩文确认关键词和句末表达。`;
      }
      if (!sentence.zhNote || /学习重点：|结合本句理解/.test(sentence.zhNote)) {
        sentence.zhNote = sentenceInlineNote(chapterItem, sentence, tokens);
      }
      if (!sentence.substitutions || !sentence.substitutions.length) {
        sentence.substitutions = similarSentenceExamples(chapterItem, sentence, index);
        sentence.substitutionLabel = "延伸练习";
      }
    });

    (chapterItem.vocabulary || []).forEach((word, index) => {
      const lessonSentence = word.lessonSentence || word.example || findSentenceForWord(chapterItem, word)?.ko || "";
      word.id = word.id || `ch${chapterItem.id}-word-${String(index + 1).padStart(2, "0")}`;
      word.pronunciation = word.pronunciation && !/[가-힣]/.test(word.pronunciation)
        ? word.pronunciation
        : romanizeFallback(word.ko);
      word.originType = normalizeOriginType(word.originType || guessOriginType(word.ko), word.ko);
      word.hanja = word.hanja || "";
      word.lessonSentence = lessonSentence;
      word.roleInSentence = word.roleInSentence && !/结合本课例句|联系原句确认它的作用/.test(word.roleInSentence) ? word.roleInSentence : roleForWord(chapterItem, word, lessonSentence);
      word.collocations = word.collocations && word.collocations.length ? word.collocations : defaultCollocations(word);
      const hasSpecificConfusingWords = word.confusingWords && word.confusingWords.length && !word.confusingWords.some((item) => /本章相近表达|本课相近表达/.test(item.word || ""));
      word.confusingWords = hasSpecificConfusingWords ? word.confusingWords : defaultConfusingWords(word);
      const needsExpressionTarget = /\s/.test(word.ko || "") || /动词|形容词/.test(word.pos || "") || /하다$|되다$|[가-힣]+다$/.test(word.ko || "");
      const objectParticle = koreanParticle(word.ko, "을", "를");
      const rememberExample = needsExpressionTarget ? `이 표현을 기억해요: ${word.ko}.` : `${word.ko}${objectParticle} 기억해요.`;
      const confirmExample = needsExpressionTarget ? `원문에서 이 표현을 확인해요: ${word.ko}.` : `이 문장에서 ${word.ko}${objectParticle} 확인해요.`;
      const hasNaturalExamples = word.examples && word.examples.length && !word.examples.some((example) => /[가-힣]+들를|[가-힣]+들와|다를|다와|를\/을|을\/를|표현은 .+와 함께/.test(example.korean || ""));
      word.examples = hasNaturalExamples ? word.examples : defaultWordExamples(word, lessonSentence, rememberExample, confirmExample);
      word.masteryLevel = word.masteryLevel || (index < 8 ? "必须掌握" : index < 16 ? "建议掌握" : "了解即可");
      word.note = word.note && !/主题词|先做到能在原文中识别|本课语境词/.test(word.note) ? word.note : defaultWordNote(chapterItem, word, lessonSentence);
    });

    if (!chapterItem.cultureZh || /原书拓展：|Cultural Tip/.test(chapterItem.cultureZh)) {
      chapterItem.cultureZh = defaultCultureNote(chapterItem);
    }
  }

  function normalizedSentenceTokens(sentence, chapterItem = null) {
    const vocabulary = chapterItem?.vocabulary || [];
    if (sentence.tokens && sentence.tokens.length) {
      return sentence.tokens
        .map((token) => resolveSentenceToken(sentence, token.text || token.token || "", token, vocabulary))
        .filter((token) => token.text);
    }
    return String(sentence.ko || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => resolveSentenceToken(sentence, text, {}, vocabulary));
  }

  function resolveSentenceToken(sentence, text, sourceToken = {}, vocabulary = []) {
    const normalized = normalizeKoreanToken(text);
    const details = (sentence.breakdown || [])
      .map((item) => ({
        token: item.token || item.text || item[0] || "",
        meaning: item.meaning || item[1] || "",
        grammar: item.grammar || item[2] || "",
        form: item.form || ""
      }));
    const exact = details.find((item) => normalizeKoreanToken(item.token) === normalized);
    const raw = String(text || "").replace(/[.,!?，。！？]/g, "");
    const exactWord = (vocabulary || []).find((word) => normalizeKoreanToken(word.ko) === normalized);
    const partialWord = (vocabulary || []).find((word) => {
      const wordKo = normalizeKoreanToken(word.ko);
      return wordKo && normalized && (normalized.includes(wordKo) || wordKo.includes(normalized));
    });
    const inferredMeaning = inferTokenMeaning(text);
    const meaning = !isGenericTokenValue(sourceToken.meaning)
      ? sourceToken.meaning
      : exact && !isGenericTokenValue(exact.meaning)
        ? exact.meaning
        : exactWord?.meaningZh || exactWord?.meaningEn || inferredMeaning || partialWord?.meaningZh || partialWord?.meaningEn || "句中表达";
    const grammarValue = !isGenericTokenValue(sourceToken.grammar)
      ? sourceToken.grammar
      : exact && !isGenericTokenValue(exact.grammar)
        ? exact.grammar
        : inferTokenGrammarFromRaw(raw);
    const grammar = normalizeTokenGrammar(raw, grammarValue);
    return {
      text,
      meaning,
      grammar,
      form: sourceToken.form || exact?.form || inferTokenFormFromRaw(raw, text)
    };
  }

  function isGenericTokenValue(value) {
    return !value || /结合本句理解|句中表达|句中功能词|普通词块|联系整句确认作用|主题助词|宾格助词|主格助词|韩国人们/.test(value);
  }

  function inferTokenGrammarFromRaw(raw) {
    if (/에는$/.test(raw)) return "N에는：地点/范围 + 主题，表示“在……里/就……来说”。";
    if (/[은는]$/.test(raw)) return "N은/는：主题助词，提示这句话谈论的对象。";
    if (/[을를]$/.test(raw)) return "N을/를：宾格助词，标出动作的对象。";
    if (/[이가]$/.test(raw)) return "N이/가：主格助词，标出动作或状态的主体。";
    if (/[와과]$/.test(raw)) return normalizeTokenGrammar(raw, "N와/과");
    if (/(이나|나)$/.test(raw)) return "N이나/나：表示选择，相当于“或者”。";
    if (/에$/.test(raw)) return "N에：表示地点、方向或时间点。";
    if (/으면$|면$/.test(raw)) return normalizeTokenGrammar(raw, "V/A-(으)면");
    if (/고$/.test(raw)) return "V-고：连接动作，表示并列或先后。";
    if (/요$/.test(raw)) return "礼貌现在式，用于日常礼貌陈述。";
    if (/자주|함께|먼저|그리고|더|마지막으로/.test(raw)) return "副词，修饰后面的动作、顺序或程度。";
    if (raw === "한국") return "名词，表示“韩国”；在本句中和 사람들은 组成“韩国人们/韩国人”。";
    return "核心词块：先确认中文含义，再看它前后的助词、修饰关系或句末连接。";
  }

  function normalizeTokenGrammar(rawText, grammar) {
    const raw = String(rawText || "").replace(/[.,!?，。！？]/g, "");
    const value = String(grammar || "").trim();
    if (/[와과]$/.test(raw) || /N와\/과/.test(value)) {
      if (/前一名词.*收音|无收音用 와/.test(value)) return value;
      return "N와/과：连接两个名词，表示“和”。前一名词无收音用 와，有收音用 과；阅读时先确认它连接了哪两个名词，再看这一组名词在句中作主语、宾语还是补充成分。";
    }
    if (/으면$|면$/.test(raw) || /\(으\)면|으면 表示条件|条件表达|条件句式/.test(value)) {
      if (/词干有收音|无收音用 -면|按时间顺序理解/.test(value)) return value;
      return "V/A-(으)면：表示条件或时间，相当于“如果……/当……”。接法：词干有收音用 -으면，无收音用 -면；在步骤、经验或说明文里，也常按上下文理解为“……以后/……的时候”。";
    }
    if (/(이나|나)$/.test(raw) || /N이나\/나/.test(value)) {
      if (/有收音用 이나|无收音用 나/.test(value)) return value;
      return "N이나/나：表示选择，相当于“或者”。前一名词有收音常用 이나，无收音常用 나；也可表示“随便举一个选项”的语气。";
    }
    if (/[은는]$/.test(raw) || /N은\/는/.test(value)) {
      if (/主题助词.*谈论|对比/.test(value)) return value;
      return "N은/는：主题助词，提示这句话谈论的对象，也可带出轻微对比。前一名词有收音用 은，无收音用 는。";
    }
    if (/[을를]$/.test(raw) || /N을\/를/.test(value)) {
      if (/宾格助词.*对象|动作的对象/.test(value)) return value;
      return "N을/를：宾格助词，标出动作直接作用到的对象。前一名词有收音用 을，无收音用 를。";
    }
    if (/[이가]$/.test(raw) || /N이\/가/.test(value)) {
      if (/主格助词.*主体|状态的主体/.test(value)) return value;
      return "N이/가：主格助词，标出动作、存在或状态的主体。前一名词有收音用 이，无收音用 가。";
    }
    if (isGenericTokenValue(value)) {
      return "核心词块：先确认中文含义，再看它前后的助词、修饰关系或句末连接。";
    }
    return value;
  }

  function normalizeGrammarPointExplanation(pattern, explanation) {
    const value = String(explanation || "").trim();
    if (/N와\/과/.test(pattern || value)) {
      if (/前一名词.*收音|无收音用 와/.test(value)) return value;
      return "连接两个名词，表示“和”。前一名词无收音用 와，有收音用 과；阅读时要把被连接的两个名词作为一个整体，再判断它们在句中作主语、宾语还是补充成分。";
    }
    if (/V\/A-\(으\)면|\(으\)면/.test(pattern || value)) {
      if (/词干有收音|无收音用 -면|按上下文理解/.test(value)) return value;
      return "表示条件或时间，相当于“如果……/当……”。接法：词干有收音用 -으면，无收音用 -면；在步骤、经验或说明文里，也常按上下文理解为“……以后/……的时候”。";
    }
    if (/N이나\/나|이나\/나/.test(pattern || value)) {
      if (/有收音用 이나|无收音用 나/.test(value)) return value;
      return "表示选择，相当于“或者”。前一名词有收音常用 이나，无收音常用 나；也可以带出“举例选择其一”的语气。";
    }
    return value;
  }

  function inferTokenFormFromRaw(raw, fallbackText) {
    const particleMatch = raw.match(/^(.+?)(에는|은|는|을|를|이|가|와|과|이나|나|에)$/);
    if (particleMatch) return `${particleMatch[1]} + ${particleMatch[2]}`;
    if (/어요$|아요$/.test(raw)) return `礼貌现在式：${raw}`;
    if (/으면$|면$/.test(raw)) return `条件/时间连接形：${raw}`;
    if (/고$/.test(raw)) return `连接形：${raw}`;
    return `词形：${raw || fallbackText}`;
  }

  function inferTokenMeaning(text) {
    const raw = String(text || "").replace(/[.,!?，。！？]/g, "");
    const normalized = normalizeKoreanToken(text);
    const common = {
      "저": "我", "저는": "我呢", "제가": "我", "저도": "我也", "나": "我", "나를": "我",
      "우리": "我们", "제": "我的", "이": "这/这个", "그": "那/那个", "이런": "这样的",
      "사람들": "人们",
      "그리고": "然后/而且", "그래서": "所以", "그러면": "那么", "그러고": "那样做后",
      "먼저": "首先", "가끔": "有时", "주로": "主要/通常", "요즘": "最近", "요즘에는": "最近",
      "정말": "真的/非常", "너무": "太", "많이": "很多", "조금": "一点", "잘": "好好地",
      "안": "不", "왜": "为什么", "벌써": "已经", "항상": "总是", "다시": "再次",
      "전": "之前", "전에": "之前", "후에": "之后", "부터": "从……开始", "까지": "到……为止",
      "것": "东西/事情", "걸": "这件事", "수": "办法/可能性",
      "그런데": "但是/不过", "그렇지만": "但是", "그냥": "就/只是",
      "저희": "我们的（谦逊）", "한국": "韩国", "김치": "泡菜", "김밥과": "紫菜包饭和",
      "마스크": "口罩", "팀": "队/团队", "주기": "周期", "천": "千", "원": "韩元",
      "연상호": "延尚昊（人名）", "서": "连接成分/顺承", "칠": "搭/支起", "어떤": "某个/有的",
      "예를": "例子", "들어": "举例说", "캘": "可以挖/采", "일어나요": "起床",
      "일어나자마자": "一起床就", "주셔서": "给/做了所以", "저녁": "晚上",
      "희": "저희 的一部分", "모여서": "聚在一起后", "먹으면서": "一边吃一边",
      "마셔요": "喝", "귀여운": "可爱的", "즐거운": "愉快的", "남기시길": "希望留下",
      "1일": "一天/一日", "10월": "10月", "건조한": "干燥的", "사용한": "使用的",
      "이용한": "利用的", "소개할게요": "我来介绍", "되겠죠": "会有帮助吧/会成为吧",
      "되겠죠?": "会有帮助吧/会成为吧", "시작한": "开始的", "지": "以来/时间经过标记",
      "사람들과": "和人们", "위한": "为了……的", "키워요": "养/饲养",
      "비싸지": "贵（否定前的词干）", "더": "更/再", "끝나요": "结束",
      "그런": "那样的", "고파요": "饿", "시켜서": "点餐后/叫来后",
      "만날": "可以见/将要见", "갈": "要去/去的", "되어": "成为/处于……状态",
      "위해": "为了",
      "다양한": "多样的", "다양해요": "多样", "새로운": "新的", "원래": "原本",
      "무서운": "可怕的", "액션": "动作片/动作", "애니메이션": "动画", "큰": "大的",
      "한": "一/一个", "번": "次", "늘": "总是/一直", "못": "不能/没能",
      "1": "第一项", "2": "第二项", "3": "第三项", "4": "第四项", "5": "第五项", "6": "第六项",
      "1.": "第一项", "2.": "第二项", "3.": "第三项", "4.": "第四项", "5.": "第五项", "6.": "第六项"
    };
    if (common[raw]) return common[raw];
    if (common[normalized]) return common[normalized];
    if (/입니다$/.test(raw)) return "是……";
    if (/예요$|이에요$/.test(raw)) return "是……";
    if (/세요$/.test(raw)) return "请……";
    if (/지 마세요$|마세요$/.test(raw)) return "请不要……";
    if (/습니다$|ㅂ니다$/.test(raw)) return "正式陈述动作/状态";
    if (/했어요$|았어요$|었어요$/.test(raw)) return "已经……了";
    if (/하고 있어요$|고 있어요$|고 있어$/.test(raw)) return "正在……";
    if (/있어요$/.test(raw)) return "有/在/可以";
    if (/좋아해요$/.test(raw)) return "喜欢";
    if (/싫어해요$/.test(raw)) return "讨厌/不喜欢";
    if (/해요$/.test(raw)) return "做/进行";
    if (/돼요$|되요$/.test(raw)) return "成为/可以";
    if (/많아요$/.test(raw)) return "很多";
    if (/좋아요$/.test(raw)) return "好/喜欢";
    if (/먹어요$/.test(raw)) return "吃/喝";
    if (/가요$/.test(raw)) return "去";
    if (/와요$/.test(raw)) return "来";
    if (/봐요$|보아요$/.test(raw)) return "看/试着";
    if (/팔아요$/.test(raw)) return "卖";
    if (/읽어요$/.test(raw)) return "读";
    if (/사요$/.test(raw)) return "买";
    if (/타요$/.test(raw)) return "乘坐";
    if (/내려요$/.test(raw)) return "下车/下来";
    if (/받아요$/.test(raw)) return "收到/领取";
    if (/쉬어요$/.test(raw)) return "休息";
    if (/아파요$/.test(raw)) return "疼/不舒服";
    if (/적어요$/.test(raw)) return "写下/填写";
    if (/기다려요$/.test(raw)) return "等待";
    if (/불러요$/.test(raw)) return "叫/呼叫";
    if (/맞아요$/.test(raw)) return "挨/打针/正确";
    if (/시작해요$/.test(raw)) return "开始";
    if (/다녀요$/.test(raw)) return "往来/上班上学";
    if (/환영합니다$/.test(raw)) return "欢迎";
    if (/감사합니다$/.test(raw)) return "感谢";
    if (/아요$|어요$/.test(raw)) return "礼貌现在式动作/状态";
    if (/같아요$|같아$/.test(raw)) return "好像/感觉";
    if (/까요$/.test(raw)) return "……呢/会……吗";
    if (/ㄹ$|을$|볼$|할$|탈$|줄$|내릴$|보실$|마실$|도착할$|올라갈$|사용할$|위험할$|추울$|시작될$/.test(raw)) return "将要/可以……的动作形";
    if (/기$|보기$|들기$|먹기$|만들기$|보관하기$|여행하기$/.test(raw)) return "动作名词化";
    if (/진$|어진$|해진$|생긴$|그려진$|태어난$|만든$|오신$|주신$|주실$/.test(raw)) return "修饰后面名词的动作形";
    if (/해야$|기다려야$|눌러야$|조심해야$/.test(raw)) return "必须/需要……";
    if (/하지$|좋아하지$|먹지$/.test(raw)) return "否定前的动作词干";
    if (/않아요$/.test(raw)) return "不……";
    if (/으니까$|니까$/.test(raw)) return "因为……所以";
    if (/대해서$/.test(raw)) return "关于……";
    if (/서요$|어서$|아서$/.test(raw)) return "因为/然后";
    if (/으면$|면$/.test(raw)) return "如果/当……";
    if (/에서$|에서는$/.test(raw)) return "在……";
    if (/에게$|한테$|께$/.test(raw)) return "给/向……";
    if (/으로$|로$/.test(raw)) return "用/通过/向……";
    if (/부터$/.test(raw)) return "从……开始";
    if (/까지$/.test(raw)) return "到……为止";
    if (/처럼$|같은$/.test(raw)) return "像……一样";
    if (/이나$|나$/.test(raw)) return "或者/或";
    if (/도$/.test(raw)) return "也";
    if (/은$|는$/.test(raw)) return "话题：……";
    if (/이$|가$/.test(raw)) return "主体：……";
    if (/을$|를$/.test(raw)) return "对象：……";
    if (/에$/.test(raw)) return "时间/地点：……";
    if (/고$/.test(raw)) return "并且/然后";
    if (/게$/.test(raw)) return "以……方式/使……";
    if (/ㄴ$|은$|는$/.test(raw)) return "修饰后面名词";
    return "";
  }

  function defaultSelfStudyNote(chapterItem, sentence, tokens) {
    const ko = sentence.ko || "";
    const zh = sentence.zh || "";
    const labels = compactLabels((sentence.structureParts || []).length ? sentence.structureParts : tokens.map((token) => ({ label: structureLabelForToken(token) })));
    if (/세요|마세요/.test(ko)) return `这句是建议/请求句。先确认要做或不要做的动作，再看时间、对象和程度信息：${zh}`;
    if (/\\?$|까요\\?/.test(ko)) return `这句是疑问或反问。先找疑问点，再回到前文看它承接的问题：${zh}`;
    if (/습니다|입니다|드립니다|됩니다/.test(ko)) return `这句偏正式书面语。阅读时先抓主体和正式谓语，再确认通知或说明的信息：${zh}`;
    if (/면/.test(ko)) return `这句含条件/时间关系。先切出“如果/当……”部分，再看后半句结果：${zh}`;
    if (/고 있어/.test(ko)) return `这句强调正在进行或持续变化。重点看 V-고 있다 前面的动作或状态：${zh}`;
    if (/덕분에|때문에|그래서/.test(ko)) return `这句有原因和结果。先找连接词，再判断前后两部分的逻辑关系：${zh}`;
    if (/부터|까지|전에|후에/.test(ko)) return `这句时间线索明显。先标出起点、终点或先后顺序，再读动作：${zh}`;
    if (/예요|이에요|입니다/.test(ko)) return `这句是在说明身份、名称或状态。先找被说明对象，再看“是/为……”的内容：${zh}`;
    return `这句可按“${labels.join(" + ") || "词块 + 句末表达"}”来读。先理解自然中文，再回到韩文确认助词和句末表达：${zh}`;
  }

  function sentenceInlineNote(chapterItem, sentence, tokens) {
    const parts = sentence.structureParts || tokens.map((token) => ({
      label: structureLabelForToken(token),
      korean: token.text,
      note: token.meaning || token.grammar || ""
    }));
    const highlights = parts
      .filter((part) => part.korean)
      .slice(0, 3)
      .map((part) => `${part.korean} 是${part.label}`)
      .join("，");
    const grammar = (sentence.grammarPoints || [])
      .slice(0, 2)
      .map((item) => item.title)
      .filter(Boolean)
      .join("、");
    if (highlights && grammar) return `${highlights}；重点回看 ${grammar}。`;
    if (highlights) return `${highlights}；读完后回到韩文确认助词和句末表达。`;
    return `围绕「${chapterItem.titleKo || "本章"}」主题，先读懂整句意思，再确认关键词在句中的作用。`;
  }

  function defaultCultureNote(chapterItem) {
    const title = chapterItem.titleKo || "本章";
    const words = (chapterItem.vocabulary || [])
      .slice(0, 4)
      .map((word) => word.ko)
      .filter(Boolean)
      .join("、");
    const grammar = (chapterItem.grammar || [])
      .slice(0, 2)
      .map((item) => item.pattern)
      .filter(Boolean)
      .join("、");
    const wordText = words ? `重点词可先整理为：${words}。` : "先从原文里圈出反复出现的主题词。";
    const grammarText = grammar ? `句式复习优先看：${grammar}。` : "句式复习优先看助词、连接词和句末表达。";
    return `本章拓展：围绕「${title}」建立场景词库和阅读记录。${wordText}${grammarText}拓展内容只作为补充背景，不影响本章完成进度。`;
  }

  function normalizeKoreanToken(text) {
    return String(text || "")
      .replace(/[‘’“”"'.,!?，。！？:：;；()[\]{}]/g, "")
      .replace(/(은|는|을|를|이|가|와|과|에|에서|에게|한테|의|도|만|부터|까지|으로|로|랑|하고|이나|나)$/u, "")
      .replace(/(이에요|예요|입니다|습니다|어요|아요|했어요|봤어요|해요|요)$/u, "")
      .trim();
  }

  function structureLabelForToken(token) {
    const text = `${token.text} ${token.grammar} ${token.form}`;
    if (/예요|이에요|입니다|습니다|어요|아요|다[.。]?$|요[.。]?$/.test(token.text)) return "句末表达";
    if (/主题助词|은\/는|[은는][,，。.\s]*$/.test(text)) return "主题";
    if (/宾格助词|을\/를|[을를][,，。.\s]*$/.test(text)) return "宾语";
    if (/主格助词|이\/가|[이가][,，。.\s]*$/.test(text)) return "主语";
    if (/에게|한테/.test(text)) return "对象/收信人";
    if (/地点|方向|时间|助词에|에(?:서|게)?[,，。.\s]*$/.test(text)) return "地点/时间";
    if (/连接|그리고|고[,，。.\s]*$/.test(text)) return "连接";
    if (/条件|으면|면[,，。.\s]*$/.test(text)) return "条件";
    if (/副词|자주|항상|가끔|더|함께|먼저|마지막/.test(text)) return "副词";
    if (/시간|때|아침|저녁|오늘|내일|어제|요즘|매일|부터|까지|전에|후에/.test(text)) return "时间线索";
    if (/정도|명|분|잔|개|원|년|월|일|시|한\b|두\b|세\b|많이|조금|너무/.test(text)) return "数量/程度";
    if (/사람|친구|엄마|회사|팀|분|선생님|저|나|우리|수지|경은|연상호/.test(text)) return "人物/主体";
    if (/책|영화|음식|커피|우유|미역국|김치|택배|버스|핸드폰|마스크|행사|편지/.test(text)) return "对象/事物";
    if (/좋|싫|많|중요|밝|친|춥|따뜻|크|작|새롭|건조|위험|재미/.test(text)) return "状态/性质";
    if (/가|오|먹|읽|보|사|타|내리|만나|소개|준비|시작|기다리|확인|주문|받|만들|연습|사귀|피하|쓰|앉|자|일어나/.test(text)) return "动作";
    return "核心词";
  }

  function structureNoteForToken(token) {
    if (token.grammar && !isGenericTokenValue(token.grammar)) return token.grammar;
    if (token.meaning && !/结合本句理解/.test(token.meaning)) return `意思：${token.meaning}`;
    return token.form || "结合原句语序和中文翻译理解这个词块。";
  }

  function compactLabels(parts) {
    const result = [];
    (parts || []).forEach((part) => {
      if (part.label && result[result.length - 1] !== part.label) result.push(part.label);
    });
    return result;
  }

  function similarSentenceExamples(chapterItem, sentence, index) {
    const current = { korean: sentence.ko, chinese: `保留本句结构，先替换一个名词、时间或地点后再读：${sentence.zh || ""}` };
    const nearby = (chapterItem.sentences || [])
      .filter((item) => item.id !== sentence.id)
      .slice(Math.max(0, index - 1), index + 2)
      .slice(0, 2)
      .map((item) => ({ korean: item.ko, chinese: `同章句式参考：${item.zh}` }));
    return [current, ...nearby].slice(0, 2);
  }

  function findSentenceForWord(chapterItem, word) {
    const stem = String(word.ko || "").replace(/다$/, "");
    return (chapterItem.sentences || []).find((sentence) => sentence.ko.includes(word.ko) || (stem && sentence.ko.includes(stem)));
  }

  function roleForWord(chapterItem, word, lessonSentence) {
    const sentence = findSentenceForWord(chapterItem, word);
    const token = normalizedSentenceTokens(sentence || {}, chapterItem).find((item) => item.text.includes(String(word.ko || "").replace(/다$/, "")));
    if (token) return `${token.text}：${token.grammar || token.meaning || "联系原句确认它的作用。"}`;
    if (lessonSentence) return `出现在本章例句中，结合“${lessonSentence}”理解它的意思和语法作用。`;
    return "本章重点词，先掌握中文意思，再回到原文确认它和助词/词尾的连接方式。";
  }

  function defaultCollocations(word) {
    const label = word.meaningZh || word.meaningEn || word.ko;
    const isPredicate = /动词|形容词/.test(word.pos || "") || /하다$/.test(word.ko || "") || (/다$/.test(word.ko || "") && !/名词/.test(word.pos || ""));
    if (isPredicate) {
      return [
        { korean: word.example || word.ko, chinese: word.exampleZh || label },
        { korean: politePredicateExample(word.ko), chinese: `把“${label}”变成礼貌现在式` },
        { korean: `${word.ko} 표현을 원문에서 확인하다`, chinese: `在原文中确认“${label}”这个表达` }
      ];
    }
    const objectParticle = koreanParticle(word.ko, "을", "를");
    const subjectParticle = koreanParticle(word.ko, "이", "가");
    return [
      { korean: word.example || word.ko, chinese: word.exampleZh || label },
      { korean: `${word.ko}${objectParticle} 보다`, chinese: `看/确认“${label}”` },
      { korean: `${word.ko}${subjectParticle} 있어요`, chinese: `有“${label}”` }
    ];
  }

  function defaultConfusingWords(word) {
    const label = word.meaningZh || word.meaningEn || word.ko;
    const pos = word.pos || "";
    if (/动词|形容词/.test(pos) || /다$/.test(word.ko || "")) {
      const stem = String(word.ko || "").replace(/다$/, "");
      return [
        { word: `${stem}아요/어요`, difference: `礼貌现在式，用来在句子里直接表达“${label}”。` },
        { word: `${stem}고`, difference: `连接形，用来把“${label}”和后面的动作或状态接起来。` }
      ];
    }
    if (/副词/.test(pos)) {
      return [
        { word: "位置", difference: `像“${label}”这类副词通常放在它修饰的动作或状态前面。` },
        { word: "名词用法", difference: "不要按名词加助词硬记，优先观察它修饰哪个谓语。" }
      ];
    }
    const topicParticle = koreanParticle(word.ko, "은", "는");
    const objectParticle = koreanParticle(word.ko, "을", "를");
    return [
      { word: `${word.ko}${topicParticle}`, difference: `作话题时，强调“至于${label}”。` },
      { word: `${word.ko}${objectParticle}`, difference: `作对象时，表示动作作用到“${label}”。` }
    ];
  }

  function defaultWordExamples(word, lessonSentence, rememberExample, confirmExample) {
    const label = word.meaningZh || word.meaningEn || word.ko;
    return [
      { korean: word.example || lessonSentence || word.ko, chinese: word.exampleZh || label },
      { korean: rememberExample, chinese: `记住“${label}”。` },
      { korean: confirmExample, chinese: `在这个句子里确认“${label}”。` }
    ];
  }

  function defaultWordNote(chapterItem, word, lessonSentence) {
    const label = word.meaningZh || word.meaningEn || word.ko;
    const title = chapterItem.titleKo || "本章";
    if (/动词|形容词/.test(word.pos || "") || /다$/.test(word.ko || "")) {
      return `在《${title}》中重点看它的句中变化：原形是 ${word.ko}，原文里常会变成句末、连接或修饰形式。例句：${lessonSentence || word.example || word.ko}`;
    }
    if (/副词/.test(word.pos || "")) {
      return `在《${title}》中把它当作修饰词来读：它通常说明动作的频率、程度或方式。先确认它修饰哪一个动作/状态。`;
    }
    return `在《${title}》中按“${label} + 助词”的方式掌握：先确认它后面接 은/는、이/가、을/를 还是 에，再判断它在句中的角色。`;
  }

  function koreanParticle(text, withFinal, withoutFinal) {
    const chars = Array.from(String(text || "").replace(/[^가-힣]/g, ""));
    const last = chars[chars.length - 1];
    if (!last) return withoutFinal;
    const code = last.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return withoutFinal;
    return code % 28 === 0 ? withoutFinal : withFinal;
  }

  function politePredicateExample(text) {
    const value = String(text || "");
    if (value.endsWith("하다")) return `${value.slice(0, -2)}해요`;
    if (value.endsWith("이다")) return `${value.slice(0, -2)}이에요`;
    if (value.endsWith("다")) return `${value.slice(0, -1)}아요/어요`;
    return `${value}해요`;
  }

  function romanizeFallback(text) {
    const initial = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
    const medial = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
    const final = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
    const chunks = [];
    let current = "";

    Array.from(String(text || "")).forEach((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      if (code >= 0 && code <= 11171) {
        const sound = `${initial[Math.floor(code / 588)]}${medial[Math.floor((code % 588) / 28)]}${final[code % 28]}`;
        current += current ? `-${sound}` : sound;
        return;
      }
      if (current) {
        chunks.push(current);
        current = "";
      }
      if (/[A-Za-z0-9]/.test(char)) chunks.push(char);
      if (/\s/.test(char)) chunks.push(" ");
    });
    if (current) chunks.push(current);
    return chunks.join("").replace(/\s+/g, " ").trim() || text;
  }

  function guessOriginType(text) {
    const value = String(text || "");
    if (/인터넷|버스|커피|택시|마스크|팩|캠핑|팀|이벤트|쇼핑몰|아파트|라면|핸드폰|스마트폰|드라마|영화|좀비|카페|메뉴|서비스|샤워|애니메이션|코미디|액션|SF/i.test(value)) return "外来词";
    if (/요리|완성|정도|회사|행사|준비|소개|성격|주변|생일|상처|운동|음식|시간|방법|소설|추리|확인|주문|물건|택배|공간|전기|사용|위험|건조|종류|효과|치매|기억|동물|문화|한국/.test(value)) return "汉字词或汉字词构成";
    if (/찌개|고기|먹|넣|볶|끓|맛|요즘|자주|먼저|그리고|더|마지막|오늘|내일|어제|저|나|우리|사람|친구|엄마|물|밥|책|잠|길|집|좋|많|작|크|새롭|따뜻|춥|가|오|보|읽|쓰|자|일어나/.test(value)) return "固有词或常用基础词";
    if (/[가-힣]+하다$|[가-힣]+되다$/.test(value)) return "汉字词/名词 + 하다/되다";
    if (/[A-Za-z]/.test(value)) return "外来词或英文缩写";
    return "暂未标注词源，可先按常用词积累";
  }

  function normalizeOriginType(originType, wordKo = "") {
    const value = String(originType || "").trim();
    if (!value || value === "待积累") return guessOriginType(wordKo);
    return value;
  }

  const chapterOneTeachingNotes = {
    s1: {
      teach: "先找出“谁 + 吃什么 + 多常吃”，再说明은/는把话题放到句首。",
      mistake: "容易把사람들理解成单数“一个人”，提醒들表示复数。"
    },
    s2: {
      teach: "用“泡菜汤里面有什么”理解에는，再圈出两个食材名词。",
      mistake: "容易把들어가요直译成“走进去”，这里应理解为“含有/放进去”。"
    },
    s3: {
      teach: "把먼저、넣고、볶아요按动作顺序连起来记，做菜流程会更清楚。",
      mistake: "容易漏掉宾格를。可以提醒：被放入、被翻炒的对象后面常见을/를。"
    },
    s4: {
      teach: "重点理解익으면是“熟了以后/如果熟了”，再用“条件 + 动作”复述。",
      mistake: "容易把으면只理解成“如果”，本句按做菜步骤也可译为“当……以后”。"
    },
    s5: {
      teach: "把3분 정도作为一个时间块记，再替换数字练习。",
      mistake: "容易把정도漏译。它不是核心动作，而是“大约/左右”的程度补充。"
    },
    s6: {
      teach: "先拆成물이나 육수를 붓고、더 끓이면、완성이에요三个短块。",
      mistake: "容易混淆이나和와。이나是“或者”，와是“和”。"
    },
    s7: {
      teach: "把마늘、대파、두부三个配料读准，再套用넣으면 더 맛있어요造句。",
      mistake: "容易把더只译成“再”。这里修饰맛있어요时更自然是“更”。"
    }
  };

  const sentenceTokenNotes = {
    s1: [
      { text: "한국 사람들은", meaning: "韩国人们", grammar: "N은/는：主题助词，提示这句话在说“韩国人”。", form: "한국 사람들 + 은；사람들有收音ㄹ，所以接은。" },
      { text: "김치찌개를", meaning: "泡菜汤", grammar: "N을/를：宾格助词，标出“吃”的对象。", form: "김치찌개 + 를；没有收音，所以接를。" },
      { text: "자주", meaning: "经常", grammar: "频率副词，放在动词前说明动作发生频率。", form: "副词，无时态变化。" },
      { text: "먹어요.", meaning: "吃", grammar: "礼貌现在式，用于日常礼貌表达。", form: "먹다 -> 먹어요；动词现在时/陈述句。" }
    ],
    s2: [
      { text: "김치찌개에는", meaning: "在泡菜汤里/对于泡菜汤来说", grammar: "N에는：地点/范围 + 主题，说明某物里面有什么。", form: "김치찌개 + 에 + 는。" },
      { text: "김치와", meaning: "泡菜和", grammar: "N와/과：连接名词，表示“和”。", form: "김치无收音，接와。" },
      { text: "돼지고기가", meaning: "猪肉", grammar: "N이/가：主格助词，标出“ 들어가요”的主体。", form: "돼지고기 + 가；没有收音，接가。" },
      { text: "들어가요.", meaning: "进去；含有", grammar: "礼貌现在式，这里可理解为“里面有/含有”。", form: "들어가다 -> 들어가요；动词现在时。" }
    ],
    s3: [
      { text: "먼저,", meaning: "首先", grammar: "顺序副词，用来说明做菜步骤。", form: "副词，无时态变化。" },
      { text: "냄비에", meaning: "在锅里/往锅里", grammar: "N에：地点或方向助词。", form: "냄비 + 에。" },
      { text: "돼지고기를", meaning: "猪肉", grammar: "N을/를：宾格助词，标出“放入”的对象。", form: "돼지고기 + 를。" },
      { text: "넣고", meaning: "放入后/放入并且", grammar: "V-고：连接动作，表示先后或并列。", form: "넣다 -> 넣고；连接形。" },
      { text: "볶아요.", meaning: "炒", grammar: "礼貌现在式，描述做菜动作。", form: "볶다 -> 볶아요；动词现在时。" }
    ],
    s4: [
      { text: "그리고", meaning: "然后；并且", grammar: "连接副词，用来推进步骤。", form: "副词，无时态变化。" },
      { text: "돼지고기가", meaning: "猪肉", grammar: "N이/가：主格助词，标出“熟”的主体。", form: "돼지고기 + 가。" },
      { text: "익으면", meaning: "熟了以后/如果熟了", grammar: "V/A-(으)면：表示条件或时间，相当于“如果……/当……”。词干有收音接 -으면，无收音接 -면；菜谱步骤里多译为“……以后”。", form: "익다 -> 익으면；익- 有收音ㄱ，所以接 -으면。" },
      { text: "김치를", meaning: "泡菜", grammar: "N을/를：宾格助词，标出“放入”的对象。", form: "김치 + 를。" },
      { text: "넣어요.", meaning: "放入", grammar: "礼貌现在式。", form: "넣다 -> 넣어요；动词现在时。" }
    ],
    s5: [
      { text: "3분", meaning: "3分钟", grammar: "数量 + 分钟；3读作삼。", form: "숫자 3 + 분。" },
      { text: "정도", meaning: "大约；左右", grammar: "数量 + 정도：表示大概的时间或数量。", form: "名词性表达，无时态变化。" },
      { text: "고기와", meaning: "肉和", grammar: "N와/과：连接两个名词。", form: "고기无收音，接와。" },
      { text: "김치를", meaning: "泡菜", grammar: "N을/를：宾格助词，标出翻炒对象。", form: "김치 + 를。" },
      { text: "함께", meaning: "一起", grammar: "副词，说明两个食材一起被炒。", form: "副词，无时态变化。" },
      { text: "볶아요.", meaning: "炒", grammar: "礼貌现在式。", form: "볶다 -> 볶아요；动词现在时。" }
    ],
    s6: [
      { text: "마지막으로,", meaning: "最后", grammar: "顺序副词，用来引出最后一步。", form: "副词，无时态变化。" },
      { text: "물이나", meaning: "水或者", grammar: "N이나/나：表示选择，“或者”。", form: "물有收音ㄹ，所以接이나。" },
      { text: "육수를", meaning: "高汤/肉汤", grammar: "N을/를：宾格助词，标出“倒入”的对象。", form: "육수 + 를。" },
      { text: "붓고", meaning: "倒入后/倒入并且", grammar: "V-고：连接动作。", form: "붓다 -> 붓고；发音接近붇꼬。" },
      { text: "더", meaning: "再；更", grammar: "副词，表示程度或动作增加。", form: "副词，无时态变化。" },
      { text: "끓이면", meaning: "如果煮/煮了以后", grammar: "V/A-(으)면：条件或时间。", form: "끓이다 -> 끓이면；发音接近끄리면。" },
      { text: "완성이에요.", meaning: "完成了", grammar: "N이에요/예요：礼貌陈述“是……”。", form: "완성 + 이에요；완성有收音ㅇ。" }
    ],
    s7: [
      { text: "마늘,", meaning: "蒜", grammar: "食材名词，作放入的对象之一。", form: "名词，无时态变化。" },
      { text: "대파,", meaning: "大葱", grammar: "食材名词，和前后名词并列。", form: "名词，无时态变化。" },
      { text: "두부를", meaning: "豆腐", grammar: "N을/를：宾格助词，标出“放入”的对象。", form: "두부 + 를。" },
      { text: "넣으면", meaning: "如果放入", grammar: "V/A-(으)면：条件句式。", form: "넣다 -> 넣으면；有收音ㅎ，接으면。" },
      { text: "더", meaning: "更", grammar: "副词，修饰后面的맛있어요。", form: "副词，无时态变化。" },
      { text: "맛있어요.", meaning: "好吃", grammar: "礼貌现在式，描述状态。", form: "맛있다 -> 맛있어요；形容词现在时。" }
    ]
  };

  const sentenceMeaningLinks = {
    s1: {
      tokens: {
        "한국": "meaningA",
        "사람들은": "meaningA",
        "김치찌개를": "meaningB",
        "자주": "meaningC",
        "먹어요.": "meaningD"
      },
      en: [
        { text: "Koreans", group: "meaningA" },
        { text: "kimchi stew", group: "meaningB" },
        { text: "often", group: "meaningC" },
        { text: "eat", group: "meaningD" }
      ],
      zh: [
        { text: "韩国人", group: "meaningA" },
        { text: "泡菜汤", group: "meaningB" },
        { text: "经常", group: "meaningC" },
        { text: "吃", group: "meaningD" }
      ]
    },
    s2: {
      tokens: {
        "김치찌개에는": "meaningB",
        "김치와": "meaningE",
        "돼지고기가": "meaningF",
        "들어가요.": "meaningD"
      },
      en: [
        { text: "in kimchi stew", group: "meaningB" },
        { text: "kimchi", group: "meaningE" },
        { text: "pork", group: "meaningF" },
        { text: "There is", group: "meaningD" }
      ],
      zh: [
        { text: "泡菜汤里", group: "meaningB" },
        { text: "泡菜", group: "meaningE", occurrence: 2 },
        { text: "猪肉", group: "meaningF" },
        { text: "有", group: "meaningD" }
      ]
    },
    s3: {
      tokens: {
        "먼저,": "meaningA",
        "냄비에": "meaningB",
        "돼지고기를": "meaningF",
        "넣고": "meaningD",
        "볶아요.": "meaningE"
      },
      en: [
        { text: "First", group: "meaningA" },
        { text: "into a pot", group: "meaningB" },
        { text: "the pork", group: "meaningF" },
        { text: "put", group: "meaningD" },
        { text: "fry it", group: "meaningE" }
      ],
      zh: [
        { text: "首先", group: "meaningA" },
        { text: "锅里", group: "meaningB" },
        { text: "猪肉", group: "meaningF" },
        { text: "放进", group: "meaningD" },
        { text: "翻炒", group: "meaningE" }
      ]
    },
    s4: {
      tokens: {
        "그리고": "meaningA",
        "돼지고기가": "meaningF",
        "익으면": "meaningB",
        "김치를": "meaningE",
        "넣어요.": "meaningD"
      },
      en: [
        { text: "When", group: "meaningB" },
        { text: "the pork", group: "meaningF" },
        { text: "is cooked", group: "meaningB" },
        { text: "add", group: "meaningD" },
        { text: "the kimchi", group: "meaningE" }
      ],
      zh: [
        { text: "然后", group: "meaningA" },
        { text: "猪肉", group: "meaningF" },
        { text: "熟了以后", group: "meaningB" },
        { text: "放入", group: "meaningD" },
        { text: "泡菜", group: "meaningE" }
      ]
    },
    s5: {
      tokens: {
        "3분": "meaningA",
        "정도": "meaningC",
        "고기와": "meaningF",
        "김치를": "meaningE",
        "함께": "meaningB",
        "볶아요.": "meaningD"
      },
      en: [
        { text: "approximately", group: "meaningC" },
        { text: "3 minutes", group: "meaningA" },
        { text: "the pork", group: "meaningF" },
        { text: "the kimchi", group: "meaningE" },
        { text: "together", group: "meaningB" },
        { text: "Fry", group: "meaningD" }
      ],
      zh: [
        { text: "大约", group: "meaningC" },
        { text: "3分钟", group: "meaningA" },
        { text: "肉", group: "meaningF" },
        { text: "泡菜", group: "meaningE" },
        { text: "一起", group: "meaningB" },
        { text: "炒", group: "meaningD" }
      ]
    },
    s6: {
      tokens: {
        "마지막으로,": "meaningA",
        "물이나": "meaningB",
        "육수를": "meaningC",
        "붓고": "meaningD",
        "더": "meaningE",
        "끓이면": "meaningF",
        "완성이에요.": "meaningG"
      },
      en: [
        { text: "Finally", group: "meaningA" },
        { text: "water", group: "meaningB" },
        { text: "broth", group: "meaningC" },
        { text: "pour in", group: "meaningD" },
        { text: "some more", group: "meaningE" },
        { text: "boil", group: "meaningF" },
        { text: "it is done", group: "meaningG" }
      ],
      zh: [
        { text: "最后", group: "meaningA" },
        { text: "水", group: "meaningB" },
        { text: "高汤", group: "meaningC" },
        { text: "倒入", group: "meaningD" },
        { text: "再", group: "meaningE" },
        { text: "煮", group: "meaningF" },
        { text: "完成了", group: "meaningG" }
      ]
    },
    s7: {
      tokens: {
        "마늘,": "meaningA",
        "대파,": "meaningB",
        "두부를": "meaningC",
        "넣으면": "meaningD",
        "더": "meaningE",
        "맛있어요.": "meaningF"
      },
      en: [
        { text: "garlic", group: "meaningA" },
        { text: "scallions", group: "meaningB" },
        { text: "tofu", group: "meaningC" },
        { text: "If you add", group: "meaningD" },
        { text: "even", group: "meaningE" },
        { text: "tastier", group: "meaningF" }
      ],
      zh: [
        { text: "蒜", group: "meaningA" },
        { text: "大葱", group: "meaningB" },
        { text: "豆腐", group: "meaningC" },
        { text: "如果加入", group: "meaningD" },
        { text: "更", group: "meaningE" },
        { text: "好吃", group: "meaningF" }
      ]
    }
  };

  const grammarExampleLexicon = {
    "한국": "韩国",
    "사람들은": "人们 + 主题助词은",
    "김치찌개를": "泡菜汤 + 宾格助词를",
    "자주": "经常",
    "먹어요": "吃，먹다的礼貌现在式",
    "저는": "我 + 主题助词는",
    "학생이에요": "是学习者，학생 + 이에요",
    "김치찌개에는": "在泡菜汤里；김치찌개 + 에는",
    "김치와": "泡菜和；김치 + 와",
    "돼지고기가": "猪肉 + 主格助词가",
    "들어가요": "进去；含有",
    "가방에는": "在包里；가방 + 에는",
    "책이": "书 + 主格助词이",
    "있어요": "有",
    "물이": "水 + 主格助词이",
    "끓어요": "沸腾；烧开",
    "돼지고기를": "猪肉 + 宾格助词를",
    "넣고": "放入后；넣다 + 고",
    "볶아요": "炒，볶다的礼貌现在式",
    "김치를": "泡菜 + 宾格助词를",
    "물을": "水 + 宾格助词을",
    "붓고": "倒入后；붓다 + 고",
    "더": "更；再",
    "끓여요": "煮；끓이다的礼貌现在式",
    "익으면": "熟了以后；익다 + 으면",
    "두부를": "豆腐 + 宾格助词를",
    "넣으면": "如果放入；넣다 + 으면",
    "맛있어요": "好吃，맛있다的礼貌现在式",
    "물이나": "水或者；물 + 이나",
    "육수를": "高汤 + 宾格助词를",
    "커피나": "咖啡或者；커피 + 나",
    "차를": "茶 + 宾格助词를",
    "마셔요": "喝，마시다的礼貌现在式",
    "완성이에요": "完成了；완성 + 이에요",
    "3분": "3分钟",
    "정도": "大约；左右",
    "10분": "10分钟",
    "기다려요": "等待，기다리다的礼貌现在式",
    "고기와": "肉和；고기 + 와",
    "함께": "一起"
  };

  function progressKey(chapterId = chapter.id) {
    return `korean-reading-progress-${chapterId}`;
  }

  function taskStateKey(chapterId = chapter.id) {
    return `korean-reading-task-state-${chapterId}`;
  }

  function loadProgress(chapterId) {
    return JSON.parse(localStorage.getItem(progressKey(chapterId)) || "[]");
  }

  function blankTaskState() {
    return {
      listen: false,
      readingDone: false,
      vocab: [],
      masteredWords: [],
      grammar: [],
      understoodGrammar: [],
      challenge: false,
      challengeScore: 0,
      quiz: false,
      quizScore: 0,
      boss: false
      ,
      bossScore: 0,
      optionalAudioDone: false
    };
  }

  function safeJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  function loadTaskState(chapterId) {
    const loaded = { ...blankTaskState(), ...safeJson(taskStateKey(chapterId), blankTaskState()) };
    loaded.masteredWords = Array.from(new Set([...(loaded.masteredWords || []), ...(loaded.vocab || [])]));
    loaded.understoodGrammar = Array.from(new Set([...(loaded.understoodGrammar || []), ...(loaded.grammar || [])]));
    loaded.readingDone = Boolean(loaded.readingDone || loaded.listen);
    return loaded;
  }

  function saveTaskState() {
    localStorage.setItem(taskStateKey(), JSON.stringify(state.taskState));
    renderProgress();
    renderSectionLocks();
  }

  function loadMemoryBox() {
    return safeJson(memoryBoxKey, []);
  }

  function loadPreferences() {
    return { playbackRate: 1, autoHighlight: true, silentMode: false, ...safeJson(preferencesKey, {}) };
  }

  function savePreferences() {
    localStorage.setItem(preferencesKey, JSON.stringify(state.preferences));
  }

  function saveMemoryBox(items) {
    localStorage.setItem(memoryBoxKey, JSON.stringify(items));
    renderMemoryBox();
  }

  function createStoryAudio(chapterItem, playbackRate = 1) {
    if (!chapterItem.audio) return null;
    const audio = new Audio(chapterItem.audio.src);
    audio.playbackRate = playbackRate;
    return audio;
  }

  function saveProgress() {
    localStorage.setItem(progressKey(), JSON.stringify(Array.from(state.mastered)));
    renderProgress();
  }

  function renderProgress() {
    const total = lessonTasks.length;
    const done = lessonTasks.filter((task) => taskDone(task.id)).length;
    els.progressText.textContent = `${done} / ${total}`;
    els.progressBar.style.width = `${Math.round((done / total) * 100)}%`;
    renderTaskProgress();
  }

  function requiredVocabCount() {
    return Math.max(1, Math.ceil(chapter.vocabulary.length * 0.8));
  }

  function requiredGrammarCount() {
    return Math.max(1, chapter.grammar.length);
  }

  function taskDone(taskId) {
    if (taskId === "reading") return Boolean(state.taskState.readingDone || state.taskState.listen);
    if (taskId === "vocab") return uniqueCount(state.taskState.masteredWords || state.taskState.vocab) >= requiredVocabCount();
    if (taskId === "grammar") return uniqueCount(state.taskState.understoodGrammar || state.taskState.grammar) >= requiredGrammarCount();
    if (taskId === "challenge") return Number(state.taskState.challengeScore || 0) >= 80 || Boolean(state.taskState.challenge);
    if (taskId === "quiz") return Number(state.taskState.quizScore || 0) >= 80 || Boolean(state.taskState.quiz);
    if (taskId === "boss") return Number(state.taskState.bossScore || 0) >= 80 || Boolean(state.taskState.boss);
    return false;
  }

  function firstOpenTaskIndex() {
    const index = lessonTasks.findIndex((task) => !taskDone(task.id));
    return index === -1 ? lessonTasks.length - 1 : index;
  }

  function taskUnlocked(taskId) {
    return lessonTasks.some((task) => task.id === taskId);
  }

  function completeTask(taskId) {
    if (taskId === "reading") state.taskState.readingDone = true;
    if (taskId === "listen") {
      state.taskState.listen = true;
      state.taskState.optionalAudioDone = true;
    }
    if (taskId === "challenge") state.taskState.challenge = true;
    if (taskId === "quiz") state.taskState.quiz = true;
    if (taskId === "boss") state.taskState.boss = true;
    awardTask(taskId);
    saveTaskState();
  }

  function markVocabViewed(ko) {
    if (!ko) return;
    if (!state.taskState.vocab.includes(ko)) state.taskState.vocab.push(ko);
    saveTaskState();
  }

  function isWordMastered(ko) {
    return Boolean(ko && (state.taskState.masteredWords || []).includes(ko));
  }

  function wordMasteryLabel(ko) {
    return isWordMastered(ko) ? "已标记，点击移除" : "标记为已掌握";
  }

  function toggleVocabMastery(ko) {
    if (!ko) return false;
    if (!state.taskState.vocab.includes(ko)) state.taskState.vocab.push(ko);
    const mastered = state.taskState.masteredWords || (state.taskState.masteredWords = []);
    const index = mastered.indexOf(ko);
    if (index >= 0) {
      mastered.splice(index, 1);
      saveTaskState();
      return false;
    }
    mastered.push(ko);
    saveTaskState();
    return true;
  }

  function trackGrammar(grammarId) {
    if (!grammarId) return;
    if (!state.taskState.grammar.includes(grammarId)) state.taskState.grammar.push(grammarId);
    if (!state.taskState.understoodGrammar.includes(grammarId)) state.taskState.understoodGrammar.push(grammarId);
    saveTaskState();
  }

  function uniqueCount(items) {
    return new Set(items || []).size;
  }

  function renderTaskProgress() {
    if (!els.taskList) return;
    const doneCount = lessonTasks.filter((task) => taskDone(task.id)).length;
    els.taskProgressText.textContent = `${doneCount} / ${lessonTasks.length}`;
    els.taskProgressBar.style.width = `${Math.round((doneCount / lessonTasks.length) * 100)}%`;
    const nextTask = lessonTasks.find((task) => !taskDone(task.id));
    els.taskList.innerHTML = lessonTasks
      .map((task, index) => {
        const done = taskDone(task.id);
        return `
          <article class="taskItem ${done ? "isDone" : ""}">
            <span class="taskStep">${done ? "✓" : "□"}</span>
            <div>
              <strong>${escapeHtml(task.label)}</strong>
              <p>${escapeHtml(taskDetail(task))}</p>
            </div>
          </article>
        `;
      })
      .join("") + `<p class="nextSuggestion">下一步建议：${escapeHtml(nextTask ? taskDetail(nextTask) : "本章核心项目已完成，可以进入错题复习或下一章。")}</p>`;
    renderSectionLocks();
  }

  function saveUserState() {
    if (window.KRState && userState) {
      window.KRState.save(userState);
    }
  }

  function awardTask(taskId) {
    if (!window.KRRewards || !window.KRState || !userState) return;
    const lessonState = window.KRState.ensureLesson(userState, chapter.id);
    if (!lessonState.completedTasks.includes(taskId)) {
      lessonState.completedTasks.push(taskId);
    }
    lessonState.currentTaskId = lessonTasks.find((task) => !taskDone(task.id))?.id || taskId;
    const result = window.KRRewards.claimTask(userState, chapter.id, taskId);
    if (result.awarded && window.KRComponents) {
      window.KRComponents.toast(`+${result.reward.xp} XP · +${result.reward.coins} Coins`);
      if (result.leveledUp) window.KRComponents.toast(`升级到 Lv ${result.level}`);
    }
    saveUserState();
    renderDashboard();
  }

  function renderGrowthStrip() {
    if (!userState || !window.KRRewards) return;
    if (els.levelText) els.levelText.textContent = window.KRRewards.levelForXp(userState.xp);
    if (els.xpText) els.xpText.textContent = userState.xp;
    if (els.coinText) els.coinText.textContent = userState.coins;
    if (els.streakText) els.streakText.textContent = userState.streak;
  }

  function renderDashboard() {
    renderGrowthStrip();
    if (!els.dashboardGrid || !userState) return;
    const doneCount = lessonTasks.filter((task) => taskDone(task.id)).length;
    const dueCount = window.KRSrs ? window.KRSrs.dueItems().filter((item) => item.sourceLessonId === chapter.id || item.chapterId === chapter.id).length : 0;
    const level = window.KRRewards ? window.KRRewards.levelForXp(userState.xp) : 1;
    const nextXp = window.KRRewards ? window.KRRewards.xpForNextLevel(userState.xp) : 100;
    const latestBadge = userState.badges[userState.badges.length - 1] || "暂无";
    const unfinishedWords = Math.max(0, requiredVocabCount() - uniqueCount(state.taskState.masteredWords));
    const nextTask = lessonTasks.find((task) => !taskDone(task.id));
    els.dashboardGrid.innerHTML = `
      <article><span>当前章节</span><strong>${escapeHtml(chapter.id)} ${escapeHtml(chapter.titleKo)}</strong></article>
      <article><span>本次阅读</span><strong>${Math.max(6, Math.min(16, chapter.sentences.length + 4))} 分钟</strong></article>
      <article><span>当前完成</span><strong>${doneCount} / ${lessonTasks.length}</strong></article>
      <article><span>今日待复习</span><strong>${dueCount}</strong></article>
      <article class="wideMetric"><span>你可以从这里继续</span><strong>${escapeHtml(nextTask ? taskDetail(nextTask) : "复习错题或进入下一章")}</strong></article>
      <article class="wideMetric"><span>本章阅读重点</span><strong>${escapeHtml(chapterFocusText())}</strong></article>
      <article><span>未掌握重点词</span><strong>${unfinishedWords}</strong></article>
      <article><span>当前等级</span><strong>Lv ${level}</strong></article>
      <article><span>下一等级</span><strong>${userState.xp} / ${nextXp} XP</strong></article>
      <article><span>连续学习</span><strong>${userState.streak} 天</strong></article>
      <article><span>最近徽章</span><strong>${escapeHtml(latestBadge)}</strong></article>
    `;
  }

  function teachingRoute() {
    return "自由阅读 -> 词语精读 -> 句式理解 -> 检测与复习";
  }

  function chapterFocusText() {
    const grammarFocus = (chapter.grammar || [])
      .slice(0, 2)
      .map((item) => item.pattern)
      .filter(Boolean)
      .join("、") || "核心句式";
    const wordFocus = (chapter.vocabulary || [])
      .slice(0, 2)
      .map((item) => item.ko)
      .filter(Boolean)
      .join("、") || "主题词";
    return `${chapter.titleKo} 场景词汇（${wordFocus}）、${grammarFocus}、整句结构`;
  }

  function renderLessonFocus() {
    if (!els.lessonFocus) return;
    const firstGrammar = (chapter.grammar || []).slice(0, 2).map((item) => item.pattern).filter(Boolean).join("、") || "核心句式";
    const focusItems = [
      `读懂 ${chapter.titleKo} 主题原文`,
      `精读重点词语和 ${firstGrammar}`,
      "能说出韩文句子的意思、结构和关键词作用"
    ];
    els.lessonFocus.innerHTML = focusItems
      .map((item) => `<span>${escapeHtml(item)}</span>`)
      .join("");
  }

  function sentenceTeachingNote(sentence) {
    const grammar = (sentence.grammarPoints || [])
      .map((item) => item.title)
      .filter(Boolean)
      .join("、") || sentence.structure || "本句关键词";
    return {
      teach: sentence.selfStudyNote || `先圈出关键词，再对照中文解释 ${grammar} 的作用。`,
      mistake: `容易只看中文译文。读完后回到韩文，按“${sentence.structure || "词序 + 助词 + 句末表达"}”复述一遍。`
    };
  }

  function taskDetail(task) {
    if (task.id === "reading") return taskDone("reading") ? "原文已标记为读过" : "通读原文后点击“标记原文已读”";
    if (task.id === "vocab") return `${uniqueCount(state.taskState.masteredWords)} / ${requiredVocabCount()} 个重点词已查看或掌握`;
    if (task.id === "grammar") return `${uniqueCount(state.taskState.understoodGrammar)} / ${requiredGrammarCount()} 个语法点已理解`;
    if (task.id === "challenge") return `${Number(state.taskState.challengeScore || 0)} / 100，达到 80 即完成`;
    if (task.id === "quiz") return `${Number(state.taskState.quizScore || 0)} / 100，达到 80 即通过`;
    if (task.id === "boss") return `${Number(state.taskState.bossScore || 0)} / 100，达到 80 即通过`;
    return task.detail;
  }

  function renderSectionLocks() {
    [els.vocabSection, els.grammarSection, els.challengeSection, els.quizPanel, els.bossSection].forEach((section) => {
      setSectionLock(section, false, "");
    });
  }

  function setSectionLock(section, locked, message) {
    if (!section) return;
    section.classList.toggle("isLocked", locked);
    section.dataset.lockMessage = locked ? message : "";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function mountProgressWidget() {
    if (!els.progressWidget || els.progressWidget.parentElement === document.body) return;
    document.body.appendChild(els.progressWidget);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function speakerIcon() {
    return `
      <svg class="speakerIcon" viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
        <path d="M18.8 5.2a9.5 9.5 0 0 1 0 13.6"></path>
      </svg>
    `;
  }

  function tokenPopup(token) {
    return `
      <span class="tokenPopup" role="tooltip">
        <strong>${escapeHtml(token.text)}</strong>
        <span><b>含义</b>${escapeHtml(token.meaning)}</span>
        <span><b>语法</b>${escapeHtml(token.grammar)}</span>
        <span><b>词形/时态</b>${escapeHtml(token.form)}</span>
      </span>
    `;
  }

  function grammarPopup(item) {
    const examples = item.examples
      .map((example) => `<li>${escapeHtml(example)}</li>`)
      .join("");
    return `
      <span class="grammarPopup" role="tooltip">
        <strong>${escapeHtml(item.pattern)}</strong>
        <span><b>意思</b>${escapeHtml(item.meaningZh)}</span>
        <span><b>用法</b>${escapeHtml(item.usage)}</span>
        <span><b>例句</b></span>
        <ul>${examples}</ul>
      </span>
    `;
  }

  function renderKoreanSentence(sentence) {
    const tokens = sentence.tokens || sentence.breakdown || [];
    const links = getSentenceMeaningLinks(sentence);
    const linkedTokens = links?.tokens || {};
    if (!tokens.length) return escapeHtml(sentence.ko);
    return tokens
      .map((token, index) => `
        <span class="koToken meaningMark ${links?.tokenGroups ? (links.tokenGroups[index] || "") : (linkedTokens[token.text] || "")}" tabindex="0" data-token-note title="点击查看单词知识点" aria-label="查看 ${escapeHtml(token.text)} 的单词知识点">
          ${escapeHtml(token.text)}
          ${tokenPopup(token)}
        </span>
      `)
      .join(" ");
  }

  function getSentenceMeaningLinks(sentence) {
    if (sentence.meaningLinks) return sentence.meaningLinks;
    if (chapter.id === "01") return sentenceMeaningLinks[sentence.id];
    return buildAutoMeaningLinks(sentence);
  }

  function buildAutoMeaningLinks(sentence) {
    if (!sentence.tokens || !sentence.tokens.length) return null;
    const groups = ["meaningA", "meaningB", "meaningC", "meaningD", "meaningE", "meaningF", "meaningG"];
    const links = { tokens: {}, tokenGroups: [], zh: [], en: [] };
    const usedZh = new Set();
    const usedEn = new Set();
    const assignedTokenIndexes = new Set();
    let groupIndex = 0;

    (sentence.structureParts || []).forEach((part) => {
      if (groupIndex >= groups.length || !part.korean) return;
      const partTokenIndexes = structurePartTokenIndexes(part.korean, sentence.tokens, assignedTokenIndexes);
      const partTokens = partTokenIndexes.map((index) => ({ token: sentence.tokens[index], index }));
      if (!partTokens.length) return;
      const group = groups[groupIndex];
      let zhTerm = bestStructureTerm(part, sentence.zh, usedZh, "zh");
      let enTerm = bestStructureTerm(part, sentence.en, usedEn, "en");
      if (termOverlapsExistingLink(sentence.zh, zhTerm, links.zh)) zhTerm = "";
      if (termOverlapsExistingLink(sentence.en, enTerm, links.en)) enTerm = "";
      if (!zhTerm && !enTerm) return;

      partTokens.forEach(({ token, index }) => {
        links.tokens[token.text] = group;
        links.tokenGroups[index] = group;
        assignedTokenIndexes.add(index);
      });
      if (zhTerm) {
        links.zh.push({ text: zhTerm, group });
        usedZh.add(zhTerm);
      }
      if (enTerm) {
        links.en.push({ text: enTerm, group });
        usedEn.add(enTerm.toLowerCase());
      }
      groupIndex += 1;
    });

    sentence.tokens.forEach((token, index) => {
      if (groupIndex >= groups.length || links.tokenGroups[index]) return;
      const group = groups[groupIndex];
      let zhTerm = bestMeaningTerm(token.meaning, sentence.zh, usedZh);
      let enTerm = bestEnglishTerm(token.text, sentence.en, usedEn);
      if (termOverlapsExistingLink(sentence.zh, zhTerm, links.zh)) zhTerm = "";
      if (termOverlapsExistingLink(sentence.en, enTerm, links.en)) enTerm = "";
      if (!zhTerm && !enTerm) return;

      links.tokens[token.text] = group;
      links.tokenGroups[index] = group;
      if (zhTerm) {
        links.zh.push({ text: zhTerm, group });
        usedZh.add(zhTerm);
      }
      if (enTerm) {
        links.en.push({ text: enTerm, group });
        usedEn.add(enTerm.toLowerCase());
      }
      groupIndex += 1;
    });

    return Object.keys(links.tokens).length ? links : null;
  }

  function tokenInStructurePart(tokenText, partText) {
    const token = colorMatchKey(tokenText);
    const part = colorMatchKey(partText);
    if (!token || !part) return false;
    return part.includes(token) || token.includes(part);
  }

  function structurePartTokenIndexes(partText, tokens, assignedTokenIndexes) {
    const part = colorMatchKey(partText);
    if (!part) return [];
    let best = [];
    let bestLength = 0;
    tokens.forEach((token, start) => {
      if (assignedTokenIndexes.has(start)) return;
      let combined = "";
      const indexes = [];
      for (let index = start; index < tokens.length; index += 1) {
        if (assignedTokenIndexes.has(index)) break;
        const normalized = colorMatchKey(tokens[index].text);
        if (!normalized) continue;
        combined += normalized;
        indexes.push(index);
        if (!part.includes(combined) && !combined.includes(part)) break;
        if ((part.includes(combined) || combined.includes(part)) && combined.length > bestLength) {
          best = [...indexes];
          bestLength = combined.length;
        }
        if (combined.length >= part.length) break;
      }
    });
    if (best.length) return best;
    return tokens
      .map((token, index) => ({ token, index }))
      .filter((item) => !assignedTokenIndexes.has(item.index) && tokenInStructurePart(item.token.text, partText))
      .map((item) => item.index);
  }

  function colorMatchKey(text) {
    return String(text || "")
      .replace(/[‘’“”"'.,!?，。！？()[\]{}]/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function bestStructureTerm(part, lineText, used, lang) {
    if (!part || !lineText) return "";
    const label = `${part.label || ""} ${part.korean || ""} ${part.note || ""}`;
    if (/^对象\s+물건/.test(label)) return "";
    const candidates = lang === "en"
      ? structureEnglishCandidates(label)
      : structureChineseCandidates(label);
    return candidates
      .map((item) => item.trim())
      .filter((item) => item && !used.has(lang === "en" ? item.toLowerCase() : item))
      .sort((a, b) => b.length - a.length)
      .find((item) => lineText.toLowerCase().includes(item.toLowerCase())) || "";
  }

  function termOverlapsExistingLink(lineText, term, existingLinks) {
    if (!lineText || !term) return false;
    const line = lineText.toLowerCase();
    const start = line.indexOf(String(term).toLowerCase());
    if (start < 0) return false;
    const end = start + String(term).length;
    return (existingLinks || []).some((link) => {
      const linkStart = line.indexOf(String(link.text || "").toLowerCase());
      if (linkStart < 0) return false;
      const linkEnd = linkStart + String(link.text || "").length;
      return start >= linkStart && end <= linkEnd;
    });
  }

  function structureChineseCandidates(label) {
    const candidates = [];
    if (/요즘|时间范围|近况时间/.test(label)) candidates.push("最近", "如今", "最近这段时间");
    if (/한국|地点范围|文化范围/.test(label)) candidates.push("在韩国", "韩国");
    if (/모든|全部对象/.test(label)) candidates.push("什么都", "所有", "全部");
    if (/인터넷|工具\/方式|方式/.test(label)) candidates.push("在网上", "通过互联网", "互联网", "网上");
    if (/살 수|가능|可以买/.test(label)) candidates.push("可以买", "能买", "买");
    if (/주문하면|条件|下单/.test(label)) candidates.push("在网上下单的话", "下单的话", "如果下单", "下单");
    if (/보통|2~3일|两三天|期限/.test(label)) candidates.push("通常两三天内", "两三天内", "通常");
    if (/받을 수|能收到|可能表达/.test(label)) candidates.push("就能收到", "能收到", "收到");
    if (/오늘/.test(label)) candidates.push("今天");
    if (/내일/.test(label)) candidates.push("明天");
    if (/택배/.test(label)) candidates.push("快递");
    if (/옷|책|과일|달걀|不仅|而且/.test(label)) candidates.push("衣服", "书", "水果", "鸡蛋");
    return candidates;
  }

  function structureEnglishCandidates(label) {
    const candidates = [];
    if (/인터넷.*주문하면|주문하면.*인터넷|조건/.test(label)) candidates.push("when you order something on the Internet", "when you order", "if you order", "order");
    if (/요즘|时间范围|近况时间/.test(label)) candidates.push("These days", "recently");
    if (/한국|地点范围|文化范围/.test(label)) candidates.push("In Korea", "Korea");
    if (/모든|全部对象/.test(label)) candidates.push("everything", "all");
    if (/인터넷|工具\/方式|方式/.test(label)) candidates.push("on the Internet", "Internet", "online");
    if (/살 수|可以买/.test(label)) candidates.push("can buy", "buy");
    if (/보통|2~3일|期限/.test(label)) candidates.push("within 2-3 days", "usually", "2-3 days");
    if (/받을 수|能收到|可能表达/.test(label)) candidates.push("can get", "get", "receive");
    if (/오늘/.test(label)) candidates.push("today");
    if (/내일/.test(label)) candidates.push("tomorrow");
    if (/택배/.test(label)) candidates.push("delivery", "package");
    if (/옷|책|과일|달걀|不仅|而且/.test(label)) candidates.push("clothes", "books", "fruit", "eggs");
    return candidates;
  }

  function bestMeaningTerm(meaning, zhText, used) {
    if (!meaning || !zhText) return "";
    return meaning
      .replace(/^英文释义：/, "")
      .split(/[\/；;、,，\s()（）]+/)
      .map((item) => item.trim())
      .filter((item) => item && item !== "结合本句理解" && !used.has(item))
      .sort((a, b) => b.length - a.length)
      .find((item) => zhText.includes(item)) || "";
  }

  function bestEnglishTerm(tokenText, enText, used) {
    if (!enText || !chapter.vocabulary) return "";
    const clean = stripKoreanParticle(normalizeKoreanToken(tokenText));
    const word = chapter.vocabulary.find((item) => item.ko === clean || clean.startsWith(item.ko.replace(/다$/, "")));
    if (!word || !word.meaningEn) return "";
    return word.meaningEn
      .replace(/^to\s+/i, "")
      .split(/[,;/()]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 2 && !used.has(item.toLowerCase()))
      .sort((a, b) => b.length - a.length)
      .find((item) => enText.toLowerCase().includes(item.toLowerCase())) || "";
  }

  function stripKoreanParticle(text) {
    const particles = ["에서는", "에게는", "에게", "에는", "에서", "으로", "부터", "까지", "이나", "나요", "은", "는", "이", "가", "을", "를", "에", "와", "과", "도", "만"];
    const particle = particles.find((item) => text.endsWith(item) && text.length > item.length);
    return particle ? text.slice(0, -particle.length) : text;
  }

  function renderMeaningLine(text, links = []) {
    if (!links.length) return escapeHtml(text);
    const lowerText = text.toLowerCase();
    const matches = links
      .map((link) => ({ ...link, index: meaningLinkIndex(lowerText, link) }))
      .filter((link) => link.index >= 0)
      .sort((a, b) => a.index - b.index || b.text.length - a.text.length);
    let cursor = 0;
    let html = "";
    matches.forEach((match) => {
      if (match.index < cursor) return;
      html += escapeHtml(text.slice(cursor, match.index));
      html += `<span class="meaningMark ${match.group}">${escapeHtml(match.text)}</span>`;
      cursor = match.index + match.text.length;
    });
    html += escapeHtml(text.slice(cursor));
    return html;
  }

  function meaningLinkIndex(lowerText, link) {
    const needle = String(link.text || "").toLowerCase();
    if (!needle) return -1;
    const targetOccurrence = Math.max(1, Number(link.occurrence || 1));
    let index = -1;
    let fromIndex = 0;
    for (let count = 0; count < targetOccurrence; count += 1) {
      index = lowerText.indexOf(needle, fromIndex);
      if (index < 0) return -1;
      fromIndex = index + needle.length;
    }
    return index;
  }

  function normalizeGrammarToken(token) {
    return token.replace(/[.,!?，。]/g, "");
  }

  function isGrammarFocus(token, grammarId) {
    const clean = normalizeGrammarToken(token);
    if (grammarId === "topic-particle") return /[은는]$/.test(clean);
    if (grammarId === "location-topic") return clean.endsWith("에는");
    if (grammarId === "subject-particle") return /[이가]$/.test(clean);
    if (grammarId === "object-particle") return /[을를]$/.test(clean);
    if (grammarId === "and-action") return clean.endsWith("고");
    if (grammarId === "condition-eumyeon") return clean.endsWith("면");
    if (grammarId === "or-choice") return clean.endsWith("이나") || clean.endsWith("나");
    if (grammarId === "ieyo") return clean.endsWith("이에요") || clean.endsWith("예요");
    if (grammarId === "more-adjective") return clean === "더";
    if (grammarId === "approx-degree") return clean === "정도" || /^[0-9]+분$/.test(clean);
    if (grammarId === "and-noun") return clean.endsWith("와") || clean.endsWith("과");
    return false;
  }

  function grammarExamplePopup(token, grammarItem, isFocus) {
    const clean = normalizeGrammarToken(token);
    const meaning = grammarExampleLexicon[clean] || "结合例句语境理解。";
    const grammar = isFocus ? `这里体现本条语法：${grammarItem.pattern}` : "普通词汇，辅助理解例句。";
    return tokenPopup({
      text: token,
      meaning,
      grammar,
      form: isFocus ? grammarItem.usage : "点击其他词也可以逐词查看。"
    });
  }

  function renderGrammarExample(example, grammarItem) {
    return example
      .split(/(\s+)/)
      .map((part) => {
        if (/^\s+$/.test(part)) return part;
        const focus = isGrammarFocus(part, grammarItem.id);
        return `
          <span class="grammarExampleToken ${focus ? "grammarFocus" : ""}" tabindex="0" data-token-note title="点击查看词义">
            ${escapeHtml(part)}
            ${grammarExamplePopup(part, grammarItem, focus)}
          </span>
        `;
      })
      .join("");
  }

  function clearActiveSentence() {
    document.querySelectorAll(".sentenceCard.isActive").forEach((item) => item.classList.remove("isActive"));
  }

  function setActiveSentence(sentenceId) {
    if (!sentenceId || !state.preferences.autoHighlight) return;
    document.querySelectorAll(".sentenceCard").forEach((item) => {
      item.classList.toggle("isActive", item.dataset.sentenceId === sentenceId);
    });
  }

  function updateActiveSentenceFromAudio() {
    if (!state.storyAudio || !state.preferences.autoHighlight) return;
    const duration = Number.isFinite(state.storyAudio.duration) ? state.storyAudio.duration : 0;
    if (!duration || state.storyAudio.paused || state.storyAudio.ended) {
      if (state.storyAudio.ended) clearActiveSentence();
      return;
    }
    const index = Math.min(chapter.sentences.length - 1, Math.floor((state.storyAudio.currentTime / duration) * chapter.sentences.length));
    const sentence = chapter.sentences[index];
    if (sentence) setActiveSentence(sentence.id);
  }

  function speak(text, options = {}) {
    if (state.preferences.silentMode) {
      if (els.voiceStatus) els.voiceStatus.textContent = "静音学习模式已开启，可关闭后再朗读。";
      return;
    }
    if (state.storyAudio) {
      state.storyAudio.pause();
    }
    if (!("speechSynthesis" in window)) {
      els.voiceStatus.textContent = "当前浏览器不支持朗读";
      els.voiceStatus.classList.add("warning");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.82;
    utterance.pitch = 1;
    if (state.koreanVoice) {
      utterance.voice = state.koreanVoice;
    }
    if (options.onend) utterance.onend = options.onend;
    state.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopSentenceLoop() {
    state.loopActive = false;
    state.loopSentenceId = null;
    state.expandedSentenceId = null;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearActiveSentence();
    renderSentences();
  }

  function startSentenceLoop(sentenceId) {
    const sentence = chapter.sentences.find((item) => item.id === sentenceId);
    if (!sentence) return;
    state.loopActive = true;
    state.loopSentenceId = sentenceId;
    renderSentences();
    const repeat = () => {
      if (!state.loopActive || state.loopSentenceId !== sentenceId) return;
      setActiveSentence(sentenceId);
      speak(sentence.ko, { onend: repeat });
    };
    repeat();
  }

  function toggleSentenceLoop(sentenceId) {
    if (state.loopActive && state.loopSentenceId === sentenceId) {
      stopSentenceLoop();
      return;
    }
    stopReading();
    startSentenceLoop(sentenceId);
  }

  function playStoryAudio() {
    completeTask("listen");
    if (state.preferences.silentMode) {
      if (els.voiceStatus) els.voiceStatus.textContent = "静音学习模式已开启，本项已作为可选音频记录。";
      return;
    }
    state.loopActive = false;
    state.loopSentenceId = null;
    if (!state.storyAudio) {
      speak(chapter.sentences.map((sentence) => sentence.ko).join(" "));
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    state.storyAudio.currentTime = 0;
    state.storyAudio.playbackRate = state.preferences.playbackRate;
    state.storyAudio.play().then(updatePlayPauseButton).catch(() => {
      els.voiceStatus.textContent = "原书音频无法播放，已切换为浏览器韩语朗读";
      els.voiceStatus.classList.add("warning");
      speak(chapter.sentences.map((sentence) => sentence.ko).join(" "));
      updatePlayPauseButton();
    });
  }

  function pauseReading() {
    if (state.storyAudio && !state.storyAudio.paused) {
      state.storyAudio.pause();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    updatePlayPauseButton();
  }

  function resumeReading() {
    if (state.storyAudio && state.storyAudio.currentTime > 0 && state.storyAudio.paused && state.storyAudio.currentTime < state.storyAudio.duration) {
      state.storyAudio.play().catch(() => {}).finally(updatePlayPauseButton);
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
    updatePlayPauseButton();
  }

  function togglePlayPause() {
    if (state.storyAudio && !state.storyAudio.paused) {
      pauseReading();
      return;
    }
    resumeReading();
  }

  function stopReading() {
    if (state.storyAudio) {
      state.storyAudio.pause();
      state.storyAudio.currentTime = 0;
      updateAudioProgress();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    state.loopActive = false;
    state.loopSentenceId = null;
    clearActiveSentence();
    renderSentences();
    updatePlayPauseButton();
  }

  function updatePlayPauseButton() {
    if (!els.playPauseBtn) return;
    const isPlaying = Boolean(state.storyAudio && !state.storyAudio.paused && !state.storyAudio.ended);
    els.playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
    els.playPauseBtn.setAttribute("aria-label", isPlaying ? "暂停播放" : "继续播放");
    els.playPauseBtn.setAttribute("title", isPlaying ? "暂停播放" : "继续播放");
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function updateAudioProgress() {
    if (!state.storyAudio || !els.audioSeek) {
      if (els.audioSeek) {
        els.audioSeek.value = 0;
        els.audioSeek.style.setProperty("--audio-progress", "0%");
      }
      if (els.audioCurrent) els.audioCurrent.textContent = "0:00";
      if (els.audioDuration) els.audioDuration.textContent = "0:00";
      return;
    }
    const duration = Number.isFinite(state.storyAudio.duration) ? state.storyAudio.duration : 0;
    const current = Number.isFinite(state.storyAudio.currentTime) ? state.storyAudio.currentTime : 0;
    els.audioSeek.max = duration || 100;
    els.audioSeek.value = current;
    els.audioCurrent.textContent = formatTime(current);
    els.audioDuration.textContent = formatTime(duration);
    const percent = duration ? `${(current / duration) * 100}%` : "0%";
    els.audioSeek.style.setProperty("--audio-progress", percent);
    updateActiveSentenceFromAudio();
    updatePlayPauseButton();
  }

  function bindAudioProgress() {
    if (!els.audioSeek) return;
    if (state.storyAudio) {
      state.storyAudio.addEventListener("loadedmetadata", updateAudioProgress);
      state.storyAudio.addEventListener("timeupdate", updateAudioProgress);
      state.storyAudio.addEventListener("ended", updateAudioProgress);
      state.storyAudio.addEventListener("play", updatePlayPauseButton);
      state.storyAudio.addEventListener("pause", updatePlayPauseButton);
    }
    if (!state.audioInputBound) {
      els.audioSeek.addEventListener("input", () => {
        const nextTime = Number(els.audioSeek.value);
        if (state.storyAudio && Number.isFinite(nextTime)) {
          state.storyAudio.currentTime = nextTime;
          updateAudioProgress();
        }
      });
      state.audioInputBound = true;
    }
    updateAudioProgress();
  }

  function syncRateButtons() {
    document.querySelectorAll("[data-rate]").forEach((button) => {
      const rate = Number(button.dataset.rate);
      button.classList.toggle("isActive", rate === state.preferences.playbackRate);
      button.setAttribute("aria-pressed", String(rate === state.preferences.playbackRate));
    });
  }

  function setPlaybackRate(rate) {
    if (!Number.isFinite(rate)) return;
    state.preferences.playbackRate = rate;
    savePreferences();
    if (state.storyAudio) {
      state.storyAudio.playbackRate = rate;
    }
    syncRateButtons();
  }

  function applySilentMode() {
    document.body.classList.toggle("isSilentMode", Boolean(state.preferences.silentMode));
    if (els.silentModeToggle) els.silentModeToggle.checked = Boolean(state.preferences.silentMode);
    if (els.voiceStatus && state.preferences.silentMode) {
      els.voiceStatus.textContent = "静音学习模式：朗读和发音作为可选练习";
      els.voiceStatus.classList.remove("warning");
    }
  }

  function setSilentMode(enabled) {
    state.preferences.silentMode = Boolean(enabled);
    savePreferences();
    if (enabled) stopReading();
    applySilentMode();
  }

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    if (state.preferences.silentMode) {
      applySilentMode();
      return;
    }
    state.voices = window.speechSynthesis.getVoices();
    state.koreanVoice = state.voices.find((voice) => voice.lang.toLowerCase().startsWith("ko"));
    if (state.koreanVoice) {
      els.voiceStatus.textContent = state.storyAudio
        ? `全文：${chapter.audio.label}；单句：${state.koreanVoice.name}`
        : `韩语语音：${state.koreanVoice.name}`;
      els.voiceStatus.classList.remove("warning");
    } else {
      els.voiceStatus.textContent = state.storyAudio
        ? `全文：${chapter.audio.label}；单句：默认语音`
        : "未检测到韩语语音，将使用默认语音";
      els.voiceStatus.classList.add("warning");
    }
  }

  function renderChapterSelect() {
    if (!els.chapterSelect) return;
    els.chapterSelect.innerHTML = chapters
      .map((item) => `
        <option value="${escapeHtml(item.id)}" ${item.id === chapter.id ? "selected" : ""}>
          ${escapeHtml(item.id)} ${escapeHtml(item.titleKo)} ${escapeHtml(item.titleEn)}
        </option>
      `)
      .join("");
  }

  function renderChapterMeta() {
    els.chapterNumber.textContent = chapter.id;
    els.chapterTitleKo.textContent = chapter.titleKo;
    els.chapterTitleEn.textContent = chapter.titleEn;
    document.title = `韩语阅读自学工作台 - ${chapter.titleKo} ${chapter.titleEn}`;
    if (els.heroLead) {
      els.heroLead.textContent = "用韩语读懂";
    }
    if (els.heroTopic) {
      els.heroTopic.textContent = chapter.titleKo;
    }
    renderLessonFocus();
    if (els.chapterHeroImage) {
      const image = chapter.image || {};
      els.chapterHeroImage.src = image.src || "assets/images/chapter01-cooking-book.jpeg";
      els.chapterHeroImage.alt = `第${chapter.id}章 ${chapter.titleKo} 主题插画，用于辅助理解本章阅读场景`;
    }
    els.cultureText.textContent = chapter.cultureZh || "本章暂无拓展说明。";
    renderChapterSelect();
  }

  function renderSentences() {
    els.sentenceList.innerHTML = chapter.sentences
      .map((sentence, index) => {
        const checked = state.mastered.has(sentence.id) ? "checked" : "";
        const loopActive = state.loopActive && state.loopSentenceId === sentence.id;
        const meaningLinks = getSentenceMeaningLinks(sentence);
        const expanded = state.expandedSentenceId === sentence.id;
        const reviewLabel = reviewButtonLabel("sentence", sentence.id);
        const grammarTags = sentence.grammarIds
          .map((id) => chapter.grammar.find((item) => item.id === id))
          .filter(Boolean)
          .map((item) => `
            <span class="grammarTag" tabindex="0" data-grammar-note data-grammar-id="${escapeHtml(item.id)}" title="点击查看语法解释" aria-label="查看 ${escapeHtml(item.pattern)} 的语法解释">
              ${escapeHtml(item.pattern)}
              ${grammarPopup(item)}
            </span>
          `)
          .join("");
        return `
          <article class="sentenceCard" data-sentence-id="${sentence.id}">
            <div class="sentenceMeta">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <div class="tagList">${grammarTags}</div>
            </div>
            <p class="koText">${renderKoreanSentence(sentence)}</p>
            <p class="enText">${renderMeaningLine(sentence.en, meaningLinks?.en)}</p>
            <p class="zhTranslation">${renderMeaningLine(sentence.zh, meaningLinks?.zh)}</p>
            <p class="zhText">${escapeHtml(sentence.zhNote)}</p>
            ${expanded ? renderSentenceDeepCard(sentence) : ""}
            <div class="cardActions">
              <button class="iconButton" type="button" data-read-sentence="${sentence.id}" aria-label="朗读第${index + 1}句" title="朗读第${index + 1}句">${speakerIcon()}</button>
              <button class="iconButton loopButton ${loopActive ? "isActive" : ""}" type="button" data-loop-sentence="${sentence.id}" aria-label="${loopActive ? "停止循环" : "循环朗读"}第${index + 1}句" title="${loopActive ? "停止循环" : "循环朗读"}" aria-pressed="${loopActive ? "true" : "false"}">↻</button>
              <button type="button" data-open-sentence="${sentence.id}" aria-expanded="${expanded ? "true" : "false"}">${expanded ? "收起精读" : "查看句子精读"}</button>
              <button type="button" data-review-sentence="${sentence.id}">${reviewLabel}</button>
              <label class="checkLine">
                <input type="checkbox" data-mastered="${sentence.id}" ${checked}>
                <span>已掌握</span>
              </label>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderSentenceDeepCard(sentence) {
    const breakdown = sentence.breakdown || sentence.tokens || [];
    const grammarPoints = sentence.grammarPoints || (sentence.grammarIds || [])
      .map((id) => chapter.grammar.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({ title: item.pattern, explanation: item.meaningZh || item.usage }));
    const substitutions = sentence.substitutions || [];
    const reviewLabel = reviewButtonLabel("sentence", sentence.id);
    return `
      <div class="sentenceDeepCard">
        <h4>句子精读卡</h4>
        <p><strong>原句：</strong>${escapeHtml(sentence.ko)}</p>
        <p><strong>自然翻译：</strong>${escapeHtml(sentence.zh)}</p>
        <p><strong>句子结构：</strong>${escapeHtml(sentence.structure || "按原文词序观察：先找主题/主语，再找助词和句末动词。")}</p>
        ${renderStructureParts(sentence)}
        <p><strong>自学提示：</strong>${escapeHtml(sentence.selfStudyNote || sentence.zhNote || "先把整句意思读顺，再回到每个助词和词尾。")}</p>
        <div class="deepGrid">
          <div>
            <strong>逐词拆解</strong>
            <ul>${breakdown.map((item) => `<li><b>${escapeHtml(item.token || item.text)}</b>：${escapeHtml(item.meaning || "")}${item.grammar ? `；${escapeHtml(item.grammar)}` : ""}</li>`).join("")}</ul>
          </div>
          <div>
            <strong>关键语法</strong>
            <ul>${grammarPoints.map((item) => `<li><b>${escapeHtml(item.title)}</b>：${escapeHtml(item.explanation)}</li>`).join("") || "<li>本句暂无额外语法说明。</li>"}</ul>
          </div>
        </div>
        <div>
          <strong>${sentence.substitutionLabel || "可替换表达"}</strong>
          <ul>${substitutions.map((item) => `<li>${escapeHtml(item.korean)} <span>${escapeHtml(item.chinese)}</span></li>`).join("") || "<li>可先替换名词，再保留原句式造句。</li>"}</ul>
        </div>
        <div class="deepActions">
          <button type="button" data-understand-sentence="${escapeHtml(sentence.id)}">我懂了</button>
          <button type="button" data-review-sentence="${escapeHtml(sentence.id)}">${reviewLabel}</button>
          <button type="button" data-use-challenge="${escapeHtml(sentence.id)}">用这句话练习重组</button>
          <button type="button" data-local-similar="${escapeHtml(sentence.id)}">查看类似句</button>
        </div>
      </div>
    `;
  }

  function renderStructureParts(sentence) {
    const parts = sentence.structureParts || [];
    if (!parts.length) return "";
    return `
      <div class="structureParts" aria-label="句子结构对应标注">
        ${parts.map((part) => `
          <div class="structurePart">
            <span>${escapeHtml(part.label)}</span>
            <strong>${escapeHtml(part.korean)}</strong>
            <p>${escapeHtml(part.note || "")}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderPosFilter() {
    if (!els.posFilter) return;
    const current = els.posFilter.value;
    const options = Array.from(new Set(chapter.vocabulary.map((word) => word.pos).filter(Boolean))).sort();
    els.posFilter.innerHTML = `<option value="">全部</option>` + options
      .map((pos) => `<option value="${escapeHtml(pos)}" ${pos === current ? "selected" : ""}>${escapeHtml(pos)}</option>`)
      .join("");
  }

  function renderVocabulary(filter = "", posFilter = "") {
    const normalized = filter.trim().toLowerCase();
    const words = chapter.vocabulary.filter((word) => {
      const haystack = `${word.ko} ${word.meaningEn} ${word.meaningZh} ${word.pos}`.toLowerCase();
      const matchesText = haystack.includes(normalized);
      const matchesPos = !posFilter || word.pos === posFilter;
      return matchesText && matchesPos;
    });
    if (!words.length) {
      els.vocabGrid.innerHTML = `<p class="emptyState">未找到匹配单词。</p>`;
      return;
    }
    els.vocabGrid.innerHTML = words
      .map((word) => `
        <article class="wordCard">
          <div>
            <h3>${escapeHtml(word.ko)}</h3>
            <p class="wordPos">${escapeHtml(word.pos)}</p>
          </div>
          <p><strong>英文：</strong>${escapeHtml(word.meaningEn)}</p>
          <p><strong>中文：</strong>${escapeHtml(word.meaningZh)}</p>
          <button class="exampleToggle" type="button" data-example-toggle data-word-ko="${escapeHtml(word.ko)}" aria-expanded="false">
            <span class="exampleLabel">例句</span>
            <span>${escapeHtml(word.example)}</span>
          </button>
          <p class="exampleZh" hidden>${escapeHtml(word.exampleZh || "暂无中文解释。")}</p>
          <button class="iconButton" type="button" data-read-word="${escapeHtml(word.ko)}" aria-label="朗读单词 ${escapeHtml(word.ko)}" title="朗读单词">${speakerIcon()}</button>
          <button type="button" data-open-word="${escapeHtml(word.ko)}">查看深度卡</button>
        </article>
      `)
      .join("");
  }

  function showWordDeepCard(word) {
    if (!word || !window.KRComponents) return;
    markVocabViewed(word.ko);
    const collocations = word.collocations || [];
    const confusingWords = word.confusingWords || [];
    const examples = word.examples || [{ korean: word.example || word.ko, chinese: word.exampleZh || word.meaningZh }];
    const reviewId = word.id || word.ko;
    const reviewLabel = reviewButtonLabel("word", reviewId);
    const masteryLabel = wordMasteryLabel(word.ko);
    window.KRComponents.showReadingAssistantPanel({
      title: `${word.ko} 深度单词学习卡`,
      html: `
        <div class="studyDrawerContent">
          <section>
            <h3>基础信息</h3>
            <p><strong>中文：</strong>${escapeHtml(word.meaningZh || "")}</p>
            <p><strong>English：</strong>${escapeHtml(word.meaningEn || "")}</p>
            <p><strong>词性：</strong>${escapeHtml(word.pos || "未标注")}</p>
            <p><strong>发音/罗马音：</strong>${escapeHtml(word.pronunciation || word.ko)}</p>
            <p><strong>词源/构词：</strong>${escapeHtml(normalizeOriginType(word.originType, word.ko))}${word.hanja ? `；汉字：${escapeHtml(word.hanja)}` : ""}</p>
          </section>
          <section>
            <h3>本课语境</h3>
            <p><strong>本课原句：</strong>${escapeHtml(word.lessonSentence || word.example || "")}</p>
            <p>${escapeHtml(word.roleInSentence || "结合原句理解这个词的句中作用。")}</p>
          </section>
          <section>
            <h3>常见搭配</h3>
            <ul>${collocations.map((item) => `<li>${escapeHtml(item.korean)} <span>${escapeHtml(item.chinese)}</span></li>`).join("")}</ul>
          </section>
          <section>
            <h3>易混词对比</h3>
            <ul>${confusingWords.map((item) => `<li><b>${escapeHtml(item.word)}</b>：${escapeHtml(item.difference)}</li>`).join("")}</ul>
          </section>
          <section>
            <h3>例句扩展</h3>
            <ul>${examples.map((item) => `<li>${escapeHtml(item.korean)} <span>${escapeHtml(item.chinese)}</span></li>`).join("")}</ul>
          </section>
          <section>
            <h3>掌握等级</h3>
            <p><strong>${escapeHtml(word.masteryLevel || "建议掌握")}</strong>：${escapeHtml(word.note || "先达到能在原文中识别并理解的程度。")}</p>
          </section>
          <div class="deepActions">
            <button type="button" data-review-word="${escapeHtml(word.ko)}">${reviewLabel}</button>
            <button type="button" data-master-word="${escapeHtml(word.ko)}">${masteryLabel}</button>
            <button type="button" data-snooze-word="${escapeHtml(word.ko)}">下次复习</button>
            <button type="button" data-unfamiliar-word="${escapeHtml(word.ko)}">我还不熟</button>
          </div>
        </div>
      `
    });
  }

  function reviewQuestionId(type, id) {
    return `${chapter.id}-${type}-${id}`;
  }

  function isInReview(type, id) {
    const questionId = reviewQuestionId(type, id);
    return loadMemoryBox().some((memory) => (memory.questionId || memory.id) === questionId);
  }

  function reviewButtonLabel(type, id) {
    return isInReview(type, id) ? "移出复习" : "加入复习";
  }

  function addReviewItem(type, id, payload = {}) {
    const questionId = reviewQuestionId(type, id);
    const items = loadMemoryBox();
    const existing = items.find((memory) => (memory.questionId || memory.id) === questionId);
    const item = {
      id: questionId,
      questionId,
      chapterId: chapter.id,
      title: `${chapter.id} ${chapter.titleKo}`,
      questionText: payload.questionText || payload.prompt || id,
      correctAnswer: payload.correctAnswer || payload.answer || "",
      userAnswer: payload.userAnswer || "加入复习",
      quizIndex: -1,
      type,
      options: [],
      accepted: [],
      prompt: payload.prompt || payload.questionText || id,
      answer: payload.answer || payload.correctAnswer || "",
      hint: payload.hint || "回到本章原文，结合句子和助词重新理解。",
      dueAt: payload.dueAt || Date.now(),
      streak: 0
    };
    if (existing) Object.assign(existing, item);
    else items.unshift(item);
    if (window.KRSrs) {
      window.KRSrs.upsertMemory({
        id: questionId,
        type,
        sourceLessonId: chapter.id,
        sourceItemId: id,
        chapterId: chapter.id,
        prompt: item.prompt,
        answer: item.answer,
        explanation: item.hint,
        status: "due"
      });
    }
    saveMemoryBox(items.slice(0, 60));
    if (window.KRComponents) window.KRComponents.toast("已加入复习。");
  }

  function removeReviewItem(type, id) {
    const questionId = reviewQuestionId(type, id);
    const nextItems = loadMemoryBox().filter((memory) => (memory.questionId || memory.id) !== questionId);
    saveMemoryBox(nextItems);
    if (window.KRComponents) window.KRComponents.toast("已移出复习。");
  }

  function toggleReviewItem(type, id, payload = {}) {
    if (isInReview(type, id)) {
      removeReviewItem(type, id);
      return false;
    }
    addReviewItem(type, id, payload);
    return true;
  }

  function reviewWord(ko, dueDelay = 0) {
    const word = chapter.vocabulary.find((item) => item.ko === ko);
    if (!word) return;
    toggleReviewItem("word", word.id || word.ko, {
      prompt: word.ko,
      answer: word.meaningZh,
      hint: word.roleInSentence || word.note,
      dueAt: Date.now() + dueDelay
    });
  }

  function reviewSentence(sentenceId) {
    const sentence = chapter.sentences.find((item) => item.id === sentenceId);
    if (!sentence) return;
    toggleReviewItem("sentence", sentence.id, {
      prompt: sentence.ko,
      answer: sentence.zh,
      hint: sentence.selfStudyNote || sentence.zhNote
    });
  }

  function renderGrammar() {
    els.grammarList.innerHTML = chapter.grammar
      .map((item) => `
        <article class="grammarItem" id="grammar-${escapeHtml(item.id)}" tabindex="0" data-grammar-card="${escapeHtml(item.id)}">
          <div class="grammarPattern">${escapeHtml(item.pattern)}</div>
          <div>
            <h3>${escapeHtml(item.meaningZh)}</h3>
            <p>${escapeHtml(item.usage)}</p>
            <ul class="grammarExamples">
              ${item.examples.map((example) => `<li>${renderGrammarExample(example, item)}</li>`).join("")}
            </ul>
            <button type="button" data-understand-grammar="${escapeHtml(item.id)}">我理解了</button>
            <button type="button" data-reading-assistant-grammar="${escapeHtml(item.id)}">查看解释</button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderPronunciation() {
    els.pronunciationList.innerHTML = chapter.pronunciation
      .map((item) => `
        <article class="pronunciationItem">
          <button class="iconButton" type="button" data-read-pron="${escapeHtml(item.written)}" aria-label="朗读 ${escapeHtml(item.written)}" title="朗读">${speakerIcon()}</button>
          <div class="pronText">
            <span class="written">${escapeHtml(item.written)}</span>
            <span class="arrow">→</span>
            <span class="spoken">${escapeHtml(item.spoken)}</span>
          </div>
          <p>${escapeHtml(item.noteZh)}</p>
        </article>
      `)
      .join("");
  }

  function challengeSentence() {
    const selected = chapter.sentences.find((sentence) => sentence.id === state.challengeSentenceId);
    if (selected) return selected;
    return chapter.sentences.find((sentence) => sentence.tokens && sentence.tokens.length >= 3 && sentence.tokens.length <= 9)
      || chapter.sentences[0];
  }

  function sentenceParts(sentence) {
    return (sentence.tokens || sentence.ko.split(/\s+/).map((text) => ({ text }))).map((token) => token.text);
  }

  function shuffledTokens(sentence) {
    const tokens = sentenceParts(sentence);
    return tokens
      .map((text, index) => ({ text, sort: (index * 7 + chapter.id.charCodeAt(1)) % tokens.length }))
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.text);
  }

  function challengeData() {
    // Learning system: derive challenge data from sentence tokens instead of duplicating book-data.js.
    const sentence = challengeSentence();
    const correctOrder = sentenceParts(sentence);
    return {
      id: `${chapter.id}-${sentence.id}`,
      sentence,
      sentenceParts: shuffledTokens(sentence),
      correctOrder
    };
  }

  function renderChallenge() {
    if (!els.sentenceChallenge) return;
    const challenge = challengeData();
    const sentence = challenge.sentence;
    const selected = state.challengeAnswer;
    const shuffled = challenge.sentenceParts;
    const usedByToken = selected.reduce((counts, token) => {
      counts[token] = (counts[token] || 0) + 1;
      return counts;
    }, {});
    const bank = shuffled.filter((token) => {
      const used = usedByToken[token] || 0;
      if (used > 0) {
        usedByToken[token] = used - 1;
        return false;
      }
      return true;
    });
    els.sentenceChallenge.innerHTML = `
      <div class="challengePrompt">
        <strong>目标中文</strong>
        <p>${escapeHtml(sentence.zh)}</p>
      </div>
      <p class="challengeInstruction">点击下方单词/短语，按正确语序排列。点击已选词组可撤销。</p>
      <div class="challengeAnswer" role="group" aria-label="已选择词块，点击词块可移除">
        ${selected.length ? selected.map((token, index) => `
          <button type="button" class="wordChip isSelected ${state.challengeChecked && token !== challenge.correctOrder[index] ? "isWrongPlace" : ""}" data-remove-token="${index}" aria-label="移除 ${escapeHtml(token)}">${escapeHtml(token)}</button>
        `).join("") : `<span>点击下方词块完成句子</span>`}
      </div>
      <div class="challengeBank" role="listbox" aria-label="可选词块">
        ${bank.map((token, index) => `
          <button type="button" class="wordChip" role="option" data-add-token="${index}" data-token="${escapeHtml(token)}">${escapeHtml(token)}</button>
        `).join("")}
      </div>
      <div class="challengeActions">
        <button type="button" class="primaryButton" data-check-challenge>检查重组</button>
        <button type="button" data-show-challenge-answer>显示答案</button>
        <p id="challengeFeedback" class="challengeFeedback"></p>
      </div>
    `;
    if (taskDone("challenge")) {
      const feedback = document.getElementById("challengeFeedback");
      if (feedback) feedback.textContent = "句子练习已完成。";
    }
  }

  function resetChallenge() {
    state.challengeAnswer = [];
    state.challengeChecked = false;
    state.challengeSentenceId = null;
    renderChallenge();
  }

  function checkChallenge() {
    const challenge = challengeData();
    const answer = state.challengeAnswer.join(" ");
    const correct = challenge.correctOrder.join(" ");
    const feedback = document.getElementById("challengeFeedback");
    state.challengeChecked = true;
    renderChallenge();
    const nextFeedback = document.getElementById("challengeFeedback");
    if (answer === correct) {
      state.taskState.challengeScore = 100;
      completeTask("challenge");
      if (nextFeedback || feedback) (nextFeedback || feedback).textContent = "句子顺序正确，句子练习已完成。";
      return;
    }
    const wrongCount = challenge.correctOrder.filter((token, index) => state.challengeAnswer[index] !== token).length;
    state.taskState.challengeScore = Math.max(0, Math.round(((challenge.correctOrder.length - wrongCount) / challenge.correctOrder.length) * 100));
    saveTaskState();
    if (nextFeedback || feedback) (nextFeedback || feedback).textContent = `顺序还不对，当前约 ${state.taskState.challengeScore} 分；${wrongCount} 个位置需要调整。先找句末表达，再看助词连接。`;
  }

  function showChallengeAnswer() {
    state.challengeAnswer = challengeData().correctOrder.slice();
    state.challengeChecked = false;
    renderChallenge();
  }

  function addMemoryItem(index, item, userAnswer) {
    // Learning system: persist quiz mistakes in a chapter-scoped Memory Box.
    const items = loadMemoryBox();
    const questionId = `${chapter.id}-quiz-${index}`;
    const existing = items.find((memory) => (memory.questionId || memory.id) === questionId);
    const payload = {
      id: questionId,
      questionId,
      chapterId: chapter.id,
      title: `${chapter.id} ${chapter.titleKo}`,
      questionText: item.prompt,
      correctAnswer: item.answer,
      userAnswer: userAnswer || "未作答",
      quizIndex: index,
      type: item.type,
      options: item.options || [],
      accepted: item.accepted || [],
      prompt: item.prompt,
      answer: item.answer,
      hint: feedbackForQuiz(item),
      dueAt: Date.now() + 24 * 60 * 60 * 1000,
      streak: 0
    };
    if (existing) Object.assign(existing, payload);
    else items.unshift(payload);
    if (window.KRSrs) {
      window.KRSrs.upsertMemory({
        id: questionId,
        type: "question",
        sourceLessonId: chapter.id,
        sourceItemId: questionId,
        chapterId: chapter.id,
        prompt: item.prompt,
        answer: item.answer,
        explanation: feedbackForQuiz(item),
        status: "due"
      });
    }
    saveMemoryBox(items.slice(0, 40));
  }

  function markMemoryCorrect(index) {
    const questionId = `${chapter.id}-quiz-${index}`;
    const items = loadMemoryBox();
    const item = items.find((memory) => (memory.questionId || memory.id) === questionId);
    if (!item) return;
    item.streak += 1;
    item.dueAt = Date.now() + 24 * 60 * 60 * 1000;
    saveMemoryBox(items.filter((memory) => (memory.questionId || memory.id) !== questionId || memory.streak < 3));
  }

  function feedbackForQuiz(item) {
    if (item.type === "choice") return "回到词汇卡，看韩文、中文和例句是否能对应起来。";
    return "回到原文句子，先确认词形，再输入完整答案。";
  }

  function renderMemoryBox() {
    if (!els.memoryBoxList) return;
    const items = loadMemoryBox().filter((item) => item.chapterId === chapter.id);
    if (!items.length) {
      els.memoryBoxList.innerHTML = `<p class="emptyMemory">本章暂无错题。</p>`;
      return;
    }
    els.memoryBoxList.innerHTML = items
      .map((item) => {
        const due = item.dueAt <= Date.now();
        return `
          <article class="memoryItem ${due ? "isDue" : ""}">
            <strong>${escapeHtml(item.questionText || item.prompt)}</strong>
            <p>你的答案：${escapeHtml(item.userAnswer)}</p>
            <p>正确答案：${escapeHtml(item.correctAnswer || item.answer)}</p>
            <p>${escapeHtml(item.hint)}</p>
            <span>${due ? "现在复习" : "24小时后复习"} · 连续正确 ${item.streak || 0} / 3</span>
            <button type="button" data-practice-memory="${escapeHtml(item.questionId || item.id)}">再次练习</button>
            <button type="button" data-reading-assistant-mistake="${escapeHtml(item.questionId || item.id)}">为什么错？</button>
          </article>
        `;
      })
      .join("");
  }

  function clearChapterMemory() {
    saveMemoryBox(loadMemoryBox().filter((item) => item.chapterId !== chapter.id));
    if (els.memoryPractice) {
      els.memoryPractice.hidden = true;
      els.memoryPractice.innerHTML = "";
    }
  }

  function practiceMemory(questionId) {
    const item = loadMemoryBox().find((memory) => (memory.questionId || memory.id) === questionId);
    if (!item || !els.memoryPractice) return;
    const quizItem = chapter.quiz[item.quizIndex] || {
      type: item.type || "text",
      prompt: item.questionText || item.prompt,
      answer: item.correctAnswer || item.answer,
      options: item.options || [],
      accepted: item.accepted || [item.correctAnswer || item.answer]
    };
    els.memoryPractice.hidden = false;
    if (quizItem.type === "choice") {
      const options = quizItem.options.length ? quizItem.options : [quizItem.answer, item.userAnswer].filter(Boolean);
      els.memoryPractice.innerHTML = `
        <strong>错题再练</strong>
        <p>${escapeHtml(quizItem.prompt)}</p>
        <div class="choiceGrid">
          ${options.map((option) => `<label><input type="radio" name="memoryPractice" value="${escapeHtml(option)}"><span>${escapeHtml(option)}</span></label>`).join("")}
        </div>
        <button type="button" data-check-memory-practice="${escapeHtml(item.questionId || item.id)}">检查再练</button>
        <p class="practiceFeedback" aria-live="polite"></p>
      `;
    } else {
      els.memoryPractice.innerHTML = `
        <strong>错题再练</strong>
        <p>${escapeHtml(quizItem.prompt)}</p>
        <input type="text" name="memoryPracticeText" autocomplete="off" aria-label="输入错题再练答案">
        <button type="button" data-check-memory-practice="${escapeHtml(item.questionId || item.id)}">检查再练</button>
        <p class="practiceFeedback" aria-live="polite"></p>
      `;
    }
    els.quizPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function checkMemoryPractice(questionId) {
    const item = loadMemoryBox().find((memory) => (memory.questionId || memory.id) === questionId);
    if (!item || !els.memoryPractice) return;
    const answer = item.correctAnswer || item.answer;
    const feedback = els.memoryPractice.querySelector(".practiceFeedback");
    const checked = els.memoryPractice.querySelector("input[type='radio']:checked");
    const textInput = els.memoryPractice.querySelector("input[type='text']");
    const userAnswer = checked ? checked.value : (textInput ? textInput.value.trim() : "");
    const accepted = item.accepted && item.accepted.length ? item.accepted : [answer];
    const isCorrect = accepted.includes(userAnswer) || userAnswer === answer;
    if (feedback) feedback.textContent = isCorrect ? "答对了，已计入连续正确。" : `还不对，正确答案是：${answer}`;
    if (isCorrect) {
      const quizIndex = Number((item.questionId || item.id).split("-quiz-")[1]);
      markMemoryCorrect(quizIndex);
    }
  }

  function renderQuiz() {
    els.quizForm.innerHTML = chapter.quiz
      .map((item, index) => {
        if (item.type === "choice") {
          const choices = item.options
            .map((option) => `
              <label>
                <input type="radio" name="q${index}" value="${escapeHtml(option)}">
                <span>${escapeHtml(option)}</span>
              </label>
            `)
            .join("");
          return `
            <fieldset class="quizItem" data-quiz-index="${index}" data-answer="${escapeHtml(item.answer)}" data-type="choice">
              <legend>${index + 1}. ${escapeHtml(item.prompt)}</legend>
              <div class="choiceGrid">${choices}</div>
              <p class="quizExplanation" aria-live="polite"></p>
            </fieldset>
          `;
        }
        return `
          <label class="quizItem textQuiz" data-quiz-index="${index}" data-answer="${escapeHtml(item.answer)}" data-accepted="${escapeHtml((item.accepted || []).join("|"))}" data-type="text">
            <span>${index + 1}. ${escapeHtml(item.prompt)}</span>
            <input type="text" name="q${index}" autocomplete="off">
            <span class="quizExplanation" aria-live="polite"></span>
          </label>
        `;
      })
      .join("");
  }

  function bossData() {
    const firstSentence = chapter.sentences[0];
    const challenge = challengeData();
    const choiceOptions = [firstSentence.zh]
      .concat(chapter.sentences.slice(1, 4).map((sentence) => sentence.zh))
      .filter(Boolean)
      .slice(0, 4);
    const translationOptions = uniqueOptions([
      challenge.sentence.zh,
      ...chapter.sentences.map((sentence) => sentence.zh)
    ]).slice(0, 4);
    return {
      title: `${chapter.titleKo} 场景挑战`,
      scene: `你进入「${chapter.titleKo}」主题情境，需要听懂一句话、确认意思，并完成句子重组。`,
      steps: [
        {
          type: "listen-choice",
          prompt: firstSentence.ko,
          question: "这句话的意思是？",
          options: choiceOptions,
          answer: firstSentence.zh,
          explanation: "先抓关键词，再对应中文意思。"
        },
        {
          type: "sentence-build",
          prompt: challenge.sentence.zh,
          chunks: challenge.sentenceParts,
          answer: challenge.correctOrder,
          explanation: "按韩语语序排列词块。"
        },
        {
          type: "translation-confirm",
          prompt: challenge.sentence.ko,
          question: "确认这句中文翻译：",
          options: translationOptions,
          answer: challenge.sentence.zh,
          explanation: "完成确认后即可通关。"
        }
      ]
    };
  }

  function uniqueOptions(options) {
    return Array.from(new Set(options.filter(Boolean)));
  }

  function renderBoss() {
    if (!els.bossChallenge) return;
    const boss = bossData();
    const step = boss.steps[state.bossStep] || boss.steps[boss.steps.length - 1];
    const done = taskDone("boss");
    const stepMarkup = step.type === "sentence-build"
      ? `
        <p>${escapeHtml(step.prompt)}</p>
        <div class="challengeBank" role="listbox" aria-label="综合挑战句子词块">
          ${step.chunks.map((chunk) => `<button type="button" class="wordChip" data-integrated-challenge-chunk="${escapeHtml(chunk)}">${escapeHtml(chunk)}</button>`).join("")}
        </div>
        <div id="integratedChallengeAnswer" class="challengeAnswer" role="group" aria-label="综合挑战已选词块"></div>
      `
      : `
        <p>${escapeHtml(step.question || step.prompt)}</p>
        <div class="choiceGrid">
          ${step.options.map((option) => `<label><input type="radio" name="integratedChallengeChoice" value="${escapeHtml(option)}"><span>${escapeHtml(option)}</span></label>`).join("")}
        </div>
      `;
    els.bossChallenge.innerHTML = `
      <div class="integratedChallengeScene">
        <strong>${escapeHtml(boss.title)}</strong>
        <p>${escapeHtml(boss.scene)}</p>
      </div>
      <div class="integratedChallengeMeta">
        <span>步骤 ${Math.min(state.bossStep + 1, boss.steps.length)} / ${boss.steps.length}</span>
        <span>得分 ${state.bossScore}</span>
      </div>
      <div class="integratedChallengeDialog">
        <span class="integratedChallengeAvatar">读</span>
        <p>${escapeHtml(step.prompt)}</p>
      </div>
      <div class="integratedChallengeTask">${done ? `<p class="integratedChallengePassed">已完成：${bossRank(state.bossScore)}</p>` : stepMarkup}</div>
      <div class="challengeActions">
        <button type="button" class="primaryButton" data-check-integrated-challenge ${done ? "disabled" : ""}>提交本步</button>
        <button type="button" data-reading-assistant-challenge>查看提示</button>
        <p id="bossFeedback" class="challengeFeedback" aria-live="polite">${done ? "综合挑战已完成，奖励已结算。" : ""}</p>
      </div>
    `;
  }

  function bossRank(score) {
    if (score >= 95) return "完美通关";
    if (score >= 80) return "优秀";
    if (score >= 60) return "通过";
    return "未通关";
  }

  function checkBoss() {
    const boss = bossData();
    const step = boss.steps[state.bossStep];
    const feedback = document.getElementById("bossFeedback");
    let correct = false;
    if (step.type === "sentence-build") {
      const answer = Array.from(document.querySelectorAll("#integratedChallengeAnswer .wordChip")).map((item) => item.textContent.trim());
      correct = answer.join(" ") === step.answer.join(" ");
    } else {
      const checked = document.querySelector("input[name='integratedChallengeChoice']:checked");
      correct = Boolean(checked && checked.value === step.answer);
    }
    if (!correct) {
      state.bossScore = Math.max(0, state.bossScore - 10);
      state.taskState.bossScore = state.bossScore;
      saveTaskState();
      if (feedback) feedback.textContent = `还不对：${step.explanation}`;
      return;
    }
    state.bossStep += 1;
    if (state.bossStep >= boss.steps.length) {
      state.taskState.bossScore = state.bossScore;
      if (state.bossScore >= 80) {
        state.bossDone = true;
        completeTask("boss");
        if (userState && window.KRRewards) {
          window.KRRewards.badge(userState, `badge-boss-${chapter.id}`);
          window.KRState.save(userState);
        }
      }
      saveTaskState();
      renderBoss();
      renderDashboard();
      return;
    }
    renderBoss();
  }

  function resetBoss() {
    state.bossStep = 0;
    state.bossScore = 100;
    state.bossDone = taskDone("boss");
    renderBoss();
  }

  function checkQuiz() {
    const items = Array.from(els.quizForm.querySelectorAll(".quizItem"));
    let score = 0;
    items.forEach((item) => {
      item.classList.remove("correct", "wrong");
      const type = item.dataset.type;
      const answer = item.dataset.answer;
      const quizIndex = Number(item.dataset.quizIndex);
      let userAnswer = "";
      if (type === "choice") {
        const checked = item.querySelector("input:checked");
        userAnswer = checked ? checked.value : "";
      } else {
        const input = item.querySelector("input");
        userAnswer = input.value.trim();
      }
      const accepted = (item.dataset.accepted || answer).split("|").filter(Boolean);
      const isCorrect = accepted.includes(userAnswer) || userAnswer === answer;
      item.classList.add(isCorrect ? "correct" : "wrong");
      const explanation = item.querySelector(".quizExplanation");
      if (explanation) {
        explanation.textContent = isCorrect
          ? "正确。"
          : `正确答案是：${answer}。${feedbackForQuiz(chapter.quiz[quizIndex])}`;
      }
      if (isCorrect) {
        score += 1;
        markMemoryCorrect(quizIndex);
      } else {
        addMemoryItem(quizIndex, chapter.quiz[quizIndex], userAnswer);
      }
    });
    const percent = items.length ? Math.round((score / items.length) * 100) : 0;
    state.taskState.quizScore = percent;
    if (percent >= 80 && items.length) {
      completeTask("quiz");
      els.quizResult.textContent = `得分：${score} / ${items.length}（${percent}）。理解检测已通过。`;
    } else {
      saveTaskState();
      els.quizResult.textContent = `得分：${score} / ${items.length}（${percent}）。错题已进入记忆盒，建议回看词语精读和句式理解。`;
    }
    renderMemoryBox();
  }

  function resetQuiz() {
    els.quizForm.reset();
    els.quizForm.querySelectorAll(".quizItem").forEach((item) => item.classList.remove("correct", "wrong"));
    els.quizForm.querySelectorAll(".quizExplanation").forEach((item) => {
      item.textContent = "";
    });
    els.quizResult.textContent = "";
  }

  function renderChapter() {
    renderChapterMeta();
    renderProgress();
    renderSentences();
    renderPosFilter();
    renderVocabulary(els.wordSearch ? els.wordSearch.value : "", els.posFilter ? els.posFilter.value : "");
    renderGrammar();
    renderPronunciation();
    renderChallenge();
    renderQuiz();
    resetQuiz();
    renderMemoryBox();
    renderBoss();
    renderDashboard();
    syncRateButtons();
    applySilentMode();
    bindAudioProgress();
    loadVoices();
  }

  function setChapter(chapterId) {
    const nextChapter = chapters.find((item) => item.id === chapterId);
    if (!nextChapter || nextChapter.id === chapter.id) return;
    stopReading();
    chapter = nextChapter;
    localStorage.setItem("korean-reading-current-chapter", chapter.id);
    history.replaceState(null, "", `#chapter=${chapter.id}`);
    state.mastered = new Set(loadProgress(chapter.id));
    state.taskState = loadTaskState(chapter.id);
    state.challengeAnswer = [];
    state.challengeChecked = false;
    state.challengeSentenceId = null;
    state.bossStep = 0;
    state.bossScore = 100;
    state.bossDone = false;
    state.loopActive = false;
    state.loopSentenceId = null;
    clearActiveSentence();
    state.storyAudio = createStoryAudio(chapter, state.preferences.playbackRate);
    if (els.wordSearch) {
      els.wordSearch.value = "";
    }
    if (els.posFilter) {
      els.posFilter.value = "";
    }
    renderChapter();
  }

  function seekAudioBy(seconds) {
    if (!state.storyAudio) return;
    const duration = Number.isFinite(state.storyAudio.duration) ? state.storyAudio.duration : 0;
    const next = clamp(state.storyAudio.currentTime + seconds, 0, duration || state.storyAudio.currentTime + seconds);
    state.storyAudio.currentTime = next;
    updateAudioProgress();
  }

  function toggleReading() {
    if (state.storyAudio && !state.storyAudio.paused) {
      pauseReading();
      return;
    }
    resumeReading();
  }

  function handleShortcuts(event) {
    const tagName = event.target?.tagName?.toLowerCase();
    if (["input", "select", "textarea", "button"].includes(tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggleReading();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekAudioBy(-5);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekAudioBy(5);
    }
  }

  function bindEvents() {
    if (els.chapterSelect) {
      els.chapterSelect.addEventListener("change", (event) => setChapter(event.target.value));
    }
    document.getElementById("readAllBtn").addEventListener("click", () => {
      playStoryAudio();
    });
    if (els.playPauseBtn) els.playPauseBtn.addEventListener("click", togglePlayPause);
    document.getElementById("stopBtn").addEventListener("click", stopReading);
    document.getElementById("checkQuizBtn").addEventListener("click", checkQuiz);
    document.getElementById("resetQuizBtn").addEventListener("click", resetQuiz);
    if (els.resetChallengeBtn) {
      els.resetChallengeBtn.addEventListener("click", resetChallenge);
    }
    if (els.markReadingBtn) {
      els.markReadingBtn.addEventListener("click", () => {
        completeTask("reading");
        if (window.KRComponents) window.KRComponents.toast("已记录：原文读过。");
      });
    }
    if (els.silentModeToggle) {
      els.silentModeToggle.checked = Boolean(state.preferences.silentMode);
      els.silentModeToggle.addEventListener("change", (event) => setSilentMode(event.target.checked));
    }

    document.body.addEventListener("click", (event) => {
      if (event.target && event.target.id === "readingAssistantPanel" && window.KRComponents) {
        window.KRComponents.closeReadingAssistantPanel();
        return;
      }
      const sentenceButton = event.target.closest("[data-read-sentence]");
      const loopButton = event.target.closest("[data-loop-sentence]");
      const wordButton = event.target.closest("[data-read-word]");
      const pronButton = event.target.closest("[data-read-pron]");
      const exampleButton = event.target.closest("[data-example-toggle]");
      const grammarNote = event.target.closest("[data-grammar-note]");
      const grammarCard = event.target.closest("[data-grammar-card]");
      const tokenNote = event.target.closest("[data-token-note]");
      const addTokenButton = event.target.closest("[data-add-token]");
      const removeTokenButton = event.target.closest("[data-remove-token]");
      const checkChallengeButton = event.target.closest("[data-check-challenge]");
      const showChallengeButton = event.target.closest("[data-show-challenge-answer]");
      const rateButton = event.target.closest("[data-rate]");
      const memoryPracticeButton = event.target.closest("[data-practice-memory]");
      const memoryPracticeCheck = event.target.closest("[data-check-memory-practice]");
      const bossChunk = event.target.closest("[data-integrated-challenge-chunk]");
      const checkBossButton = event.target.closest("[data-check-integrated-challenge]");
      const aiBossButton = event.target.closest("[data-reading-assistant-challenge]");
      const closeAiButton = event.target.closest("[data-close-reading-assistant]");
      const openSentenceButton = event.target.closest("[data-open-sentence]");
      const reviewSentenceButton = event.target.closest("[data-review-sentence]");
      const understandSentenceButton = event.target.closest("[data-understand-sentence]");
      const useChallengeButton = event.target.closest("[data-use-challenge]");
      const localSimilarButton = event.target.closest("[data-local-similar]");
      const openWordButton = event.target.closest("[data-open-word]");
      const reviewWordButton = event.target.closest("[data-review-word]");
      const masterWordButton = event.target.closest("[data-master-word]");
      const snoozeWordButton = event.target.closest("[data-snooze-word]");
      const unfamiliarWordButton = event.target.closest("[data-unfamiliar-word]");
      const understandGrammarButton = event.target.closest("[data-understand-grammar]");
      const aiGrammarButton = event.target.closest("[data-reading-assistant-grammar]");
      const aiMistakeButton = event.target.closest("[data-reading-assistant-mistake]");
      if (closeAiButton && window.KRComponents) {
        window.KRComponents.closeReadingAssistantPanel();
        return;
      }
      if (bossChunk) {
        const answer = document.getElementById("integratedChallengeAnswer");
        if (answer) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "wordChip isSelected";
          chip.textContent = bossChunk.dataset.integratedChallengeChunk;
          chip.addEventListener("click", () => chip.remove());
          answer.appendChild(chip);
        }
        return;
      }
      if (checkBossButton) {
        checkBoss();
        return;
      }
      if (aiBossButton && window.KRReadingAssistant && window.KRComponents) {
        const boss = bossData();
        const step = boss.steps[state.bossStep] || boss.steps[0];
        window.KRComponents.showReadingAssistantPanel(window.KRReadingAssistant.generateSimilarExamples({ answer: step.answer, correctAnswer: Array.isArray(step.answer) ? step.answer.join(" ") : step.answer }));
        return;
      }
      if (openSentenceButton) {
        state.expandedSentenceId = state.expandedSentenceId === openSentenceButton.dataset.openSentence ? null : openSentenceButton.dataset.openSentence;
        renderSentences();
        return;
      }
      if (reviewSentenceButton) {
        reviewSentence(reviewSentenceButton.dataset.reviewSentence);
        renderSentences();
        return;
      }
      if (understandSentenceButton) {
        state.mastered.add(understandSentenceButton.dataset.understandSentence);
        saveProgress();
        renderSentences();
        return;
      }
      if (useChallengeButton) {
        const sentence = chapter.sentences.find((item) => item.id === useChallengeButton.dataset.useChallenge);
        if (sentence) {
          state.challengeSentenceId = sentence.id;
          state.challengeAnswer = [];
          state.challengeChecked = false;
          renderChallenge();
        }
        els.challengeSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (localSimilarButton && window.KRReadingAssistant && window.KRComponents) {
        const sentence = chapter.sentences.find((item) => item.id === localSimilarButton.dataset.localSimilar);
        if (sentence) window.KRComponents.showReadingAssistantPanel(window.KRReadingAssistant.generateSimilarExamples({ answer: sentence.substitutions?.[0]?.korean || sentence.ko }));
        return;
      }
      if (openWordButton) {
        const word = chapter.vocabulary.find((item) => item.ko === openWordButton.dataset.openWord);
        if (word) showWordDeepCard(word);
        return;
      }
      if (reviewWordButton) {
        const word = chapter.vocabulary.find((item) => item.ko === reviewWordButton.dataset.reviewWord);
        reviewWord(reviewWordButton.dataset.reviewWord);
        if (word) showWordDeepCard(word);
        renderMemoryBox();
        return;
      }
      if (masterWordButton) {
        const ko = masterWordButton.dataset.masterWord;
        const word = chapter.vocabulary.find((item) => item.ko === ko);
        const mastered = toggleVocabMastery(ko);
        if (window.KRComponents) window.KRComponents.toast(mastered ? "已标记为掌握。" : "已移除掌握标记。");
        if (word) showWordDeepCard(word);
        renderTaskProgress();
        return;
      }
      if (snoozeWordButton) {
        reviewWord(snoozeWordButton.dataset.snoozeWord, 24 * 60 * 60 * 1000);
        return;
      }
      if (unfamiliarWordButton) {
        reviewWord(unfamiliarWordButton.dataset.unfamiliarWord);
        return;
      }
      if (understandGrammarButton) {
        trackGrammar(understandGrammarButton.dataset.understandGrammar);
        if (window.KRComponents) window.KRComponents.toast("已记录语法理解。");
        return;
      }
      if (aiGrammarButton && window.KRReadingAssistant && window.KRComponents) {
        const grammar = chapter.grammar.find((item) => item.id === aiGrammarButton.dataset.readingAssistantGrammar);
        if (grammar) window.KRComponents.showReadingAssistantPanel(window.KRReadingAssistant.explainGrammar(grammar));
        return;
      }
      if (aiMistakeButton && window.KRReadingAssistant && window.KRComponents) {
        const memory = loadMemoryBox().find((item) => (item.questionId || item.id) === aiMistakeButton.dataset.readingAssistantMistake);
        if (memory) {
          window.KRComponents.showReadingAssistantPanel(window.KRReadingAssistant.explainMistake({
            question: memory.questionText || memory.prompt,
            userAnswer: memory.userAnswer,
            correctAnswer: memory.correctAnswer || memory.answer
          }));
        }
        return;
      }
      if (rateButton) {
        setPlaybackRate(Number(rateButton.dataset.rate));
        return;
      }
      if (memoryPracticeButton) {
        practiceMemory(memoryPracticeButton.dataset.practiceMemory);
        return;
      }
      if (memoryPracticeCheck) {
        checkMemoryPractice(memoryPracticeCheck.dataset.checkMemoryPractice);
        return;
      }
      if (addTokenButton) {
        state.challengeAnswer.push(addTokenButton.dataset.token);
        state.challengeChecked = false;
        renderChallenge();
        return;
      }
      if (removeTokenButton) {
        state.challengeAnswer.splice(Number(removeTokenButton.dataset.removeToken), 1);
        state.challengeChecked = false;
        renderChallenge();
        return;
      }
      if (checkChallengeButton) {
        checkChallenge();
        return;
      }
      if (showChallengeButton) {
        showChallengeAnswer();
        return;
      }
      if (grammarNote) {
        document.querySelectorAll(".grammarTag.isOpen").forEach((item) => {
          if (item !== grammarNote) item.classList.remove("isOpen");
        });
        document.querySelectorAll(".koToken.isOpen").forEach((item) => item.classList.remove("isOpen"));
        grammarNote.classList.add("isOpen");
        trackGrammar(grammarNote.dataset.grammarId);
        return;
      }
      if (grammarCard) {
        trackGrammar(grammarCard.dataset.grammarCard);
      }
      if (tokenNote) {
        document.querySelectorAll(".koToken.isOpen, .grammarExampleToken.isOpen").forEach((item) => {
          if (item !== tokenNote) item.classList.remove("isOpen");
        });
        document.querySelectorAll(".grammarTag.isOpen").forEach((item) => item.classList.remove("isOpen"));
        tokenNote.classList.add("isOpen");
        return;
      }
      document.querySelectorAll(".koToken.isOpen, .grammarExampleToken.isOpen").forEach((item) => item.classList.remove("isOpen"));
      document.querySelectorAll(".grammarTag.isOpen").forEach((item) => item.classList.remove("isOpen"));
      if (sentenceButton) {
        const sentence = chapter.sentences.find((item) => item.id === sentenceButton.dataset.readSentence);
        if (sentence) {
          state.loopActive = false;
          state.loopSentenceId = null;
          setActiveSentence(sentence.id);
          speak(sentence.ko, { onend: clearActiveSentence });
        }
      }
      if (loopButton) toggleSentenceLoop(loopButton.dataset.loopSentence);
      if (wordButton) speak(wordButton.dataset.readWord);
      if (pronButton) speak(pronButton.dataset.readPron);
      if (exampleButton) {
        markVocabViewed(exampleButton.dataset.wordKo);
        const explanation = exampleButton.nextElementSibling;
        const isOpen = exampleButton.getAttribute("aria-expanded") === "true";
        exampleButton.setAttribute("aria-expanded", String(!isOpen));
        if (explanation) {
          explanation.hidden = isOpen;
        }
      }
    });

    document.body.addEventListener("pointerout", (event) => {
      const tokenNote = event.target.closest("[data-token-note]");
      const grammarNote = event.target.closest("[data-grammar-note]");
      if (tokenNote) {
        if (event.relatedTarget && tokenNote.contains(event.relatedTarget)) return;
        tokenNote.classList.remove("isOpen");
        tokenNote.blur();
      }
      if (grammarNote) {
        if (event.relatedTarget && grammarNote.contains(event.relatedTarget)) return;
        grammarNote.classList.remove("isOpen");
        grammarNote.blur();
      }
    });

    document.body.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-mastered]");
      if (!checkbox) return;
      if (checkbox.checked) {
        state.mastered.add(checkbox.dataset.mastered);
      } else {
        state.mastered.delete(checkbox.dataset.mastered);
      }
      saveProgress();
    });

    if (els.clearMemoryBtn) {
      els.clearMemoryBtn.addEventListener("click", clearChapterMemory);
    }
    if (els.resetBossBtn) {
      els.resetBossBtn.addEventListener("click", resetBoss);
    }
    if (els.continueStudyBtn) {
      els.continueStudyBtn.addEventListener("click", () => {
        const nextTask = lessonTasks.find((task) => !taskDone(task.id));
        const target = nextTask?.id === "vocab" ? els.vocabSection
          : nextTask?.id === "grammar" ? els.grammarSection
          : nextTask?.id === "challenge" ? els.challengeSection
          : nextTask?.id === "quiz" ? els.quizPanel
          : nextTask?.id === "boss" ? els.bossSection
          : els.sentenceList;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (els.wordSearch) {
      els.wordSearch.addEventListener("input", (event) => {
        clearTimeout(state.wordSearchTimer);
        state.wordSearchTimer = setTimeout(() => {
          renderVocabulary(event.target.value, els.posFilter ? els.posFilter.value : "");
        }, 300);
      });
    }
    if (els.posFilter) {
      els.posFilter.addEventListener("change", () => {
        renderVocabulary(els.wordSearch ? els.wordSearch.value : "", els.posFilter.value);
      });
    }
    document.addEventListener("keydown", handleShortcuts);
  }

  function init() {
    mountProgressWidget();
    saveUserState();
    renderChapter();
    bindEvents();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  init();
})();
