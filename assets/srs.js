(function () {
  const storage = window.KRStorage;

  function loadQueue() {
    return storage.get("srsQueue", []);
  }

  function saveQueue(queue) {
    storage.set("srsQueue", queue);
    return queue;
  }

  function nextInterval(item, quality) {
    if (quality < 3) return { interval: 1, repetitions: 0, easeFactor: Math.max(1.3, item.easeFactor - 0.2) };
    const repetitions = (item.repetitions || 0) + 1;
    const easeFactor = Math.max(1.3, (item.easeFactor || 2.5) + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    const interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round((item.interval || 3) * easeFactor);
    return { interval, repetitions, easeFactor };
  }

  function upsertMemory(item) {
    const queue = loadQueue();
    const existing = queue.find((entry) => entry.id === item.id);
    const payload = {
      mastery: 0,
      reviewCount: 0,
      wrongCount: 0,
      correctStreak: 0,
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      lastReviewDate: null,
      nextReviewDate: new Date().toISOString(),
      status: "due",
      ...item
    };
    if (existing) Object.assign(existing, payload);
    else queue.unshift(payload);
    return saveQueue(queue);
  }

  function review(id, quality) {
    const queue = loadQueue();
    const item = queue.find((entry) => entry.id === id);
    if (!item) return null;
    const now = new Date();
    item.reviewCount += 1;
    item.lastReviewDate = now.toISOString();
    if (quality < 3) {
      item.wrongCount += 1;
      item.correctStreak = 0;
      item.mastery = Math.max(0, item.mastery - 10);
      item.status = "due";
      item.nextReviewDate = now.toISOString();
    } else {
      const next = nextInterval(item, quality);
      Object.assign(item, next);
      item.correctStreak += 1;
      item.mastery = Math.min(100, item.mastery + 25);
      item.status = item.correctStreak >= 3 ? "mastered" : "learning";
      item.nextReviewDate = new Date(now.getTime() + next.interval * 24 * 60 * 60 * 1000).toISOString();
    }
    saveQueue(queue);
    return item;
  }

  function dueItems() {
    const now = Date.now();
    return loadQueue().filter((item) => item.status !== "mastered" && (!item.nextReviewDate || Date.parse(item.nextReviewDate) <= now));
  }

  window.KRSrs = { loadQueue, saveQueue, upsertMemory, review, dueItems };
})();
