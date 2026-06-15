(function () {
  const thresholds = [0, 100, 250, 450, 700];
  const taskRewards = {
    reading: { xp: 15, coins: 3 },
    listen: { xp: 10, coins: 2 },
    vocab: { xp: 25, coins: 6 },
    grammar: { xp: 25, coins: 6 },
    challenge: { xp: 30, coins: 8 },
    quiz: { xp: 30, coins: 8 },
    boss: { xp: 80, coins: 20 }
  };

  function levelForXp(xp) {
    for (let index = thresholds.length - 1; index >= 0; index -= 1) {
      if (xp >= thresholds[index]) return index + 1;
    }
    return 1;
  }

  function xpForNextLevel(xp) {
    const level = levelForXp(xp);
    return thresholds[level] || thresholds[thresholds.length - 1] + (level - thresholds.length + 1) * 300;
  }

  function claimTask(userState, lessonId, taskId) {
    const reward = taskRewards[taskId] || { xp: 5, coins: 1 };
    const key = `${lessonId}:${taskId}`;
    if (userState.rewardsClaimed[key]) return { awarded: false, reward };
    const oldLevel = levelForXp(userState.xp);
    userState.xp += reward.xp;
    userState.coins += reward.coins;
    userState.rewardsClaimed[key] = true;
    const newLevel = levelForXp(userState.xp);
    return { awarded: true, reward, leveledUp: newLevel > oldLevel, level: newLevel };
  }

  function badge(userState, badgeId) {
    if (!userState.badges.includes(badgeId)) {
      userState.badges.push(badgeId);
      return true;
    }
    return false;
  }

  window.KRRewards = { claimTask, levelForXp, xpForNextLevel, badge, taskRewards };
})();
