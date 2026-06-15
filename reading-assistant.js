(function () {
  function explainWord(word) {
    return {
      title: `词语解释：${word.ko}`,
      body: [
        `${word.ko} 的中文意思是「${word.meaningZh || word.zh}」。`,
        `词性：${word.pos || "未标注"}。可以先把它和例句「${word.example || word.exampleKo || ""}」一起记。`,
        "自学时：先读韩文，再判断它在句子里表示人、物、动作还是程度。",
        "练习方式：遮住中文，用这个词复述原句，或替换一个生活场景。"
      ]
    };
  }

  function explainGrammar(grammar) {
    return {
      title: `语法解释：${grammar.pattern || grammar.title}`,
      body: [
        grammar.meaningZh || grammar.explanationZh || "这是本章重点句式。",
        grammar.usage || "先观察它在原文中的位置，再模仿例句造句。",
        `类似例句：${(grammar.examples || []).map((item) => item.ko || item).filter(Boolean)[0] || "请回到原文查看。"}`,
        "自学提醒：不要只背中文意思，要回到原句里指出这个结构连接了哪些词或动作。"
      ]
    };
  }

  function explainMistake({ question, userAnswer, correctAnswer }) {
    return {
      title: "错题解析",
      body: [
        `你选择/填写的是：${userAnswer || "未作答"}。`,
        `正确答案是：${correctAnswer}。`,
        `建议：回到题目「${question}」，先找关键词，再对应原文句子。`,
        "纠错顺序：先确认题干问什么，再定位原文依据，最后复述为什么这个答案对。",
        "再练一题：把正确答案遮住，自己重新说出中文或韩文。"
      ]
    };
  }

  function generateSimilarExamples(item) {
    const base = item.correctAnswer || item.answer || item.ko || "";
    return {
      title: "查看类似句",
      body: [
        `模板：先保留句型，再替换一个名词或动词。`,
        `参考：${base}`,
        "练习：请用同一个结构再造一个和自己生活有关的句子。"
      ]
    };
  }

  window.KRReadingAssistant = { explainWord, explainGrammar, explainMistake, generateSimilarExamples };
})();
