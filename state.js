(function () {
  const storage = window.KRStorage;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function defaultState() {
    return {
      xp: 0,
      coins: 0,
      streak: 0,
      lastStudyDate: null,
      badges: [],
      lessons: {},
      rewardsClaimed: {},
      stats: {
        completedLessons: 0,
        masteredWords: 0,
        masteredGrammar: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        totalStudySeconds: 0
      }
    };
  }

  function load() {
    return { ...defaultState(), ...storage.get("userState", defaultState()) };
  }

  function save(userState) {
    return storage.set("userState", userState);
  }

  function ensureLesson(userState, lessonId) {
    if (!userState.lessons[lessonId]) {
      userState.lessons[lessonId] = {
        completed: false,
        completedTasks: [],
        currentTaskId: "listen",
        score: 0,
        accuracy: 0,
        startedAt: new Date().toISOString(),
        completedAt: "",
        totalStudySeconds: 0
      };
    }
    return userState.lessons[lessonId];
  }

  function markStudyDay(userState) {
    const today = todayKey();
    if (userState.lastStudyDate === today) return userState;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    userState.streak = userState.lastStudyDate === yesterday ? userState.streak + 1 : 1;
    userState.lastStudyDate = today;
    return userState;
  }

  window.KRState = { load, save, ensureLesson, markStudyDay, todayKey };
})();
