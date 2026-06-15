(function () {
  const prefix = "koreanQuestV4:";

  function key(name) {
    return `${prefix}${name}`;
  }

  function get(name, fallback) {
    try {
      const raw = localStorage.getItem(key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      localStorage.removeItem(key(name));
      return fallback;
    }
  }

  function set(name, value) {
    localStorage.setItem(key(name), JSON.stringify(value));
    return value;
  }

  function remove(name) {
    localStorage.removeItem(key(name));
  }

  window.KRStorage = { key, get, set, remove };
})();
