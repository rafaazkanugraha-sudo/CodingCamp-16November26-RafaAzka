(function () {
  'use strict';

  // ── Storage helpers (Requirement 6.13) ──────────────────────────────────────
  var storage = {

    /**
     * Retrieves the value stored under `key` from localStorage.
     * Returns the parsed value, or null if the key is absent or the stored
     * string cannot be parsed as JSON.
     *
     * @param {string} key
     * @returns {*} parsed value or null
     */
    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    /**
     * Serialises `value` to JSON and stores it under `key` in localStorage.
     * Returns true on success, false if localStorage is unavailable or the
     * value cannot be serialised (e.g. quota exceeded).
     *
     * @param {string} key
     * @param {*} value
     * @returns {boolean}
     */
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Removes the item stored under `key` from localStorage.
     *
     * @param {string} key
     */
    remove: function (key) {
      localStorage.removeItem(key);
    }
  };

  // ── Theme helpers (Requirements 8.1 – 8.5) ─────────────────────────────────

  /**
   * Applies `theme` to the document and updates the toggle button label to
   * show the *next* theme (the one that will be applied on the next click).
   *
   * @param {string} theme  "light" or "dark"
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      if (theme === 'dark') {
        btn.textContent = 'Switch to Light Mode';
        btn.setAttribute('aria-label', 'Switch to Light Mode');
      } else {
        btn.textContent = 'Switch to Dark Mode';
        btn.setAttribute('aria-label', 'Switch to Dark Mode');
      }
    }
  }

  /**
   * Reads the persisted theme from storage (defaults to "light") and applies
   * it via applyTheme.  Must be called as the very first statement in the IIFE
   * so the data-theme attribute is set before any paint (Requirement 8.4).
   */
  function loadTheme() {
    var saved = storage.get('theme');
    var theme = (saved === 'dark') ? 'dark' : 'light';
    applyTheme(theme);
  }

  /**
   * Flips the current theme, persists it to storage, and re-applies it.
   * Reads the current theme directly from the <html> element so this function
   * always reflects the live DOM state (Requirement 8.1 – 8.3).
   */
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = (current === 'dark') ? 'light' : 'dark';
    storage.set('theme', next);
    applyTheme(next);
  }

  // Apply persisted (or default) theme immediately — before any other paint.
  loadTheme();

  // ── Greeting_Widget helpers (Requirements 1.1, 1.2, 2.1–2.3, 3.2, 3.5) ────

  /**
   * Formats a Date object as a 12-hour time string with zero-padded minutes.
   * Examples: "10:05 AM", "12:00 PM", "12:00 AM" (midnight).
   *
   * @param {Date} date
   * @returns {string}  "HH:MM AM/PM"
   */
  function formatTime(date) {
    var hours24 = date.getHours();
    var minutes = date.getMinutes();
    var period = hours24 < 12 ? 'AM' : 'PM';
    var hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    var mm = minutes < 10 ? '0' + minutes : '' + minutes;
    return hours12 + ':' + mm + ' ' + period;
  }

  /**
   * Formats a Date object as "Weekday, DD Month YYYY".
   * Example: "Thursday, 20 November 2026"
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    var weekdays = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    var weekday = weekdays[date.getDay()];
    var day = date.getDate();
    var month = months[date.getMonth()];
    var year = date.getFullYear();
    return weekday + ', ' + day + ' ' + month + ' ' + year;
  }

  /**
   * Returns the appropriate time-of-day greeting prefix for the given hour.
   *
   * - 05–11 → "Good Morning"
   * - 12–17 → "Good Afternoon"
   * - 18–23 and 0–4 → "Good Evening"
   *
   * @param {number} hour  integer in [0, 23]
   * @returns {string}
   */
  function getGreetingPrefix(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * Builds the full greeting string from a prefix and an optional name.
   * Returns "prefix, name" when name is non-empty after trimming;
   * returns "prefix" alone when name is empty or whitespace-only.
   *
   * @param {string} prefix  e.g. "Good Morning"
   * @param {string} name    raw name string (may contain surrounding whitespace)
   * @returns {string}
   */
  function buildGreeting(prefix, name) {
    var trimmed = name ? name.trim() : '';
    if (trimmed.length > 0) {
      return prefix + ', ' + trimmed;
    }
    return prefix;
  }

  /**
   * Reads the current date/time and writes the formatted values to the DOM:
   *   #clock    ← formatTime result
   *   #date     ← formatDate result
   *   #greeting ← buildGreeting(prefix, storedName) result
   *
   * Called once immediately and then every second via setInterval.
   */
  function updateClockDisplay() {
    var now = new Date();

    var clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = formatTime(now);

    var dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = formatDate(now);

    var greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      var prefix = getGreetingPrefix(now.getHours());
      var storedName = storage.get('userName') || '';
      greetingEl.textContent = buildGreeting(prefix, storedName);
    }
  }


  /**
   * Reads the persisted userName from storage and, if present, populates the
   * #name-input field with it.  Then calls updateClockDisplay() so the
   * greeting reflects any stored name immediately on page load.
   * (Requirements 3.3, 3.4)
   */
  function loadGreeting() {
    var name = storage.get('userName');
    if (name) {
      var input = document.getElementById('name-input');
      if (input) input.value = name;
    }
    updateClockDisplay();
  }

  /**
   * Persists the given name to storage under the key "userName" and
   * immediately refreshes the clock/greeting display.
   * (Requirements 3.3, 3.5)
   *
   * @param {string} name
   */
  function saveUserName(name) {
    storage.set('userName', name);
    updateClockDisplay();
  }

  // ── Timer module state (Requirements 4.1, 5.4) ─────────────────────────────
  var timerDuration = 25;               // minutes (integer 1–120)
  var remainingMs   = 25 * 60 * 1000;  // milliseconds remaining
  var timerInterval = null;             // setInterval handle | null
  var timerRunning  = false;            // boolean

  // ── Timer module helpers (Requirements 4.1, 5.4) ───────────────────────────

  /**
   * Converts a total-seconds value to a zero-padded "MM:SS" string.
   * Both MM and SS are always at least two digits.
   * Input must be an integer in [0, 7200].
   *
   * Examples:
   *   formatMMSS(0)    → "00:00"
   *   formatMMSS(90)   → "01:30"
   *   formatMMSS(3600) → "60:00"
   *
   * @param {number} totalSeconds  integer in [0, 7200]
   * @returns {string}  "MM:SS"
   */
  function formatMMSS(totalSeconds) {
    var mm = Math.floor(totalSeconds / 60);
    var ss = totalSeconds % 60;
    var mmStr = mm < 10 ? '0' + mm : '' + mm;
    var ssStr = ss < 10 ? '0' + ss : '' + ss;
    return mmStr + ':' + ssStr;
  }

  /**
   * Removes the hidden class from #timer-alert to show the completion alert.
   * (Requirement 4.6)
   */
  function showTimerAlert() {
    var alert = document.getElementById('timer-alert');
    if (alert) alert.classList.remove('hidden');
  }

  /**
   * Called by the interval every second.  Decrements remainingMs by 1000 ms,
   * writes the new MM:SS value to #timer-display, and fires showTimerAlert()
   * plus clears the interval when the countdown reaches zero.
   * (Requirements 4.3, 4.4, 4.6)
   */
  function tickTimer() {
    remainingMs -= 1000;

    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatMMSS(Math.round(remainingMs / 1000));
    }

    if (remainingMs <= 0) {
      showTimerAlert();
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
    }

    updateTimerButtons();
  }

  /**
   * Starts the countdown.  Guards against double-start: if timerRunning is
   * already true, returns immediately.
   * (Requirements 4.2, 4.3)
   */
  function startTimer() {
    if (timerRunning) return;
    timerInterval = setInterval(tickTimer, 1000);
    timerRunning = true;
    updateTimerButtons();
  }

  /**
   * Pauses the countdown without resetting remainingMs.
   * (Requirements 4.4, 4.5)
   */
  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    updateTimerButtons();
  }

  /**
   * Stops the timer, restores remainingMs to the full timerDuration,
   * hides the alert, and resets the display.
   * (Requirements 4.5, 4.7)
   */
  function resetTimer() {
    stopTimer();
    remainingMs = timerDuration * 60 * 1000;
    var alert = document.getElementById('timer-alert');
    if (alert) alert.classList.add('hidden');
    var display = document.getElementById('timer-display');
    if (display) display.textContent = formatMMSS(timerDuration * 60);
    updateTimerButtons();
  }

  /**
   * Applies enabled/disabled state to the Start, Stop, and Reset buttons
   * based on whether the timer is currently running.
   *
   * Running  → Start disabled, Stop enabled,  Reset enabled
   * Stopped  → Start enabled,  Stop disabled, Reset enabled
   * (Requirements 4.2, 4.4, 4.5)
   */
  function updateTimerButtons() {
    var startBtn = document.getElementById('timer-start');
    var stopBtn  = document.getElementById('timer-stop');
    var resetBtn = document.getElementById('timer-reset');

    if (timerRunning) {
      if (startBtn) startBtn.disabled = true;
      if (stopBtn)  stopBtn.disabled  = false;
      if (resetBtn) resetBtn.disabled = false;
    } else {
      if (startBtn) startBtn.disabled = false;
      if (stopBtn)  stopBtn.disabled  = true;
      if (resetBtn) resetBtn.disabled = false;
    }
  }

  /**
   * Validates and applies a new timer duration entered by the user.
   *
   * Parses `value` as a number.  Rejects it if:
   *   - not finite
   *   - not an integer (n !== Math.floor(n))
   *   - outside the range [1, 120]
   *
   * On failure: writes an error message to #duration-error and returns.
   * On success: updates timerDuration, persists it to storage, calls
   *             resetTimer(), and clears #duration-error.
   *
   * (Requirements 5.1, 5.2, 5.3, 5.5)
   *
   * @param {string|number} value  raw input from the duration field
   */
  function applyDuration(value) {
    var n = Number(value);
    var errorEl = document.getElementById('duration-error');

    if (!isFinite(n) || n !== Math.floor(n) || n < 1 || n > 120) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a whole number between 1 and 120.';
      }
      return;
    }

    timerDuration = n;
    storage.set('timerDuration', n);
    resetTimer();

    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  /**
   * Reads the persisted timerDuration from storage (defaults to 25 if null),
   * sets `timerDuration` and `remainingMs` accordingly, renders the initial
   * display to #timer-display, and calls updateTimerButtons().
   * (Requirements 4.1, 5.4)
   */
  function loadTimer() {
    var saved = storage.get('timerDuration');
    timerDuration = (saved !== null) ? saved : 25;
    remainingMs   = timerDuration * 60 * 1000;

    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatMMSS(timerDuration * 60);
    }

    updateTimerButtons();
  }

  // ── Todo_List module state (Requirements 6.1 – 6.10) ──────────────────────
  var tasks = [];

  // ── Todo_List module helpers ────────────────────────────────────────────────

  /**
   * Displays `msg` in the #task-storage-error element.
   * (Requirement 6.13)
   *
   * @param {string} msg
   */
  function showStorageError(msg) {
    var errorEl = document.getElementById('task-storage-error');
    if (errorEl) {
      errorEl.textContent = msg;
    }
  }

  /**
   * Persists the current `tasks` array to localStorage under the key "tasks".
   * Shows an inline error via showStorageError() if the write fails.
   * (Requirements 6.3, 6.5, 6.7, 6.9, 6.13)
   */
  function persistTasks() {
    var ok = storage.set('tasks', tasks);
    if (!ok) {
      showStorageError('Could not save tasks. Storage may be full or unavailable.');
    }
  }

  /**
   * Removes the task with the given `id` from the `tasks` array and from the
   * DOM, then persists the updated list.
   * (Requirements 6.8, 6.9)
   *
   * @param {string} id  task id
   */
  function deleteTask(id) {
    var index = -1;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { index = i; break; }
    }
    if (index !== -1) {
      tasks.splice(index, 1);
    }

    var list = document.getElementById('task-list');
    if (list) {
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (li) li.parentNode.removeChild(li);
    }

    persistTasks();
  }

  /**
   * Flips the `done` state of the task with the given `id`, updates the
   * corresponding <span class="task-text"> and checkbox in the DOM, then
   * persists the updated list.
   * (Requirements 6.6, 6.7)
   *
   * @param {string} id  task id
   */
  function toggleTask(id) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { task = tasks[i]; break; }
    }
    if (task) {
      task.done = !task.done;
    }

    var list = document.getElementById('task-list');
    if (list) {
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (li) {
        var span = li.querySelector('span.task-text');
        if (span) {
          if (task && task.done) {
            span.classList.add('done');
          } else {
            span.classList.remove('done');
          }
        }
        var checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox && task) {
          checkbox.checked = task.done;
        }
      }
    }

    persistTasks();
  }

  /**
   * Puts the task identified by `id` into edit mode.
   * Finds the <li data-id="id"> in #task-list, then replaces its
   * <span class="task-text"> with an <input class="task-edit-input"> that
   * is pre-populated with the task's current text.
   * Enter → commitEditTask(id, input.value)
   * Escape → cancelEditTask(id)
   * (Requirements 6.4, 6.5, 6.12)
   *
   * @param {string} id  task id
   */
  function beginEditTask(id) {
    var list = document.getElementById('task-list');
    if (!list) return;

    var li = list.querySelector('li[data-id="' + id + '"]');
    if (!li) return;

    var span = li.querySelector('span.task-text');
    if (!span) return;

    var currentText = span.textContent;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.maxLength = 200;
    input.value = currentText;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        commitEditTask(id, input.value);
      } else if (e.key === 'Escape') {
        cancelEditTask(id);
      }
    });

    li.replaceChild(input, span);
    input.focus();
  }

  /**
   * Finalises an in-progress edit.
   * If trimmed newText is empty, delegates to cancelEditTask.
   * Otherwise updates task.text in the array, replaces the edit input with a
   * refreshed <span class="task-text">, and persists via persistTasks().
   * (Requirements 6.5, 6.12)
   *
   * @param {string} id       task id
   * @param {string} newText  raw value from the edit input
   */
  function commitEditTask(id, newText) {
    var trimmed = newText ? newText.trim() : '';
    if (trimmed.length === 0) {
      cancelEditTask(id);
      return;
    }

    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { task = tasks[i]; break; }
    }
    if (task) {
      task.text = trimmed;
    }

    var list = document.getElementById('task-list');
    if (list) {
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (li) {
        var input = li.querySelector('input.task-edit-input');
        if (input) {
          var span = document.createElement('span');
          span.className = 'task-text';
          span.textContent = trimmed;
          if (task && task.done) {
            span.classList.add('done');
          }
          li.replaceChild(span, input);
        }
      }
    }

    persistTasks();
  }

  /**
   * Cancels an in-progress edit without saving.
   * Replaces the edit input with the original <span class="task-text">
   * containing the unmodified task.text.  Does NOT call persistTasks().
   * (Requirement 6.12)
   *
   * @param {string} id  task id
   */
  function cancelEditTask(id) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { task = tasks[i]; break; }
    }

    var list = document.getElementById('task-list');
    if (list) {
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (li) {
        var input = li.querySelector('input.task-edit-input');
        if (input) {
          var span = document.createElement('span');
          span.className = 'task-text';
          span.textContent = task ? task.text : '';
          if (task && task.done) {
            span.classList.add('done');
          }
          li.replaceChild(span, input);
        }
      }
    }
  }

  /**
   * Creates a `<li>` element for the given task object and appends it to
   * `#task-list`.  The element contains:
   *   - A checkbox whose `checked` state mirrors `task.done`
   *   - A `<span class="task-text">` with the task text; also gets class
   *     "done" when `task.done` is true (Requirement 6.6)
   *   - An "Edit" button
   *   - A "Delete" button
   * Sets `data-id` on the `<li>` to allow later look-up by task ID.
   * (Requirements 6.2, 6.4, 6.6, 6.8)
   *
   * @param {{ id: string, text: string, done: boolean, createdAt: number }} task
   */
  function renderTask(task) {
    var li = document.createElement('li');
    li.setAttribute('data-id', task.id);

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;

    var span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;
    if (task.done) {
      span.classList.add('done');
    }

    var editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';

    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    (function (taskId) {
      editBtn.addEventListener('click', function () {
        beginEditTask(taskId);
      });
      deleteBtn.addEventListener('click', function () {
        deleteTask(taskId);
      });
      checkbox.addEventListener('change', function () {
        toggleTask(taskId);
      });
    }(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    var list = document.getElementById('task-list');
    if (list) list.appendChild(li);
  }

  /**
   * Trims `description`; if the result is empty, returns without action.
   * Otherwise creates a new Task object, pushes it to the `tasks` array,
   * calls `renderTask`, and persists via `persistTasks`.
   * (Requirements 6.1, 6.2, 6.3, 6.11)
   *
   * Task object shape:
   * {
   *   id:        "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
   *   text:      trimmed description string,
   *   done:      false,
   *   createdAt: Date.now()
   * }
   *
   * @param {string} description  raw user input from the task input field
   */
  function addTask(description) {
    var text = description ? description.trim() : '';
    if (text.length === 0) return;

    var task = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: text,
      done: false,
      createdAt: Date.now()
    };

    tasks.push(task);
    renderTask(task);
    persistTasks();
  }

  /**
   * Reads the saved tasks array from storage.  If a non-null value is found,
   * replaces the in-memory `tasks` array and renders each task.  If storage
   * returns null, `tasks` remains an empty array.
   * (Requirement 6.10)
   */
  function loadTasks() {
    var saved = storage.get('tasks');
    if (saved !== null) {
      tasks = saved;
      tasks.forEach(function (task) {
        renderTask(task);
      });
    }
  }

  // ── Quick_Links module state (Requirements 7.1 – 7.9) ────────────────────
  var quickLinks = [];

  // ── Quick_Links module helpers ─────────────────────────────────────────────

  /**
   * Returns true if `url` starts with "http://" or "https://" (case-sensitive);
   * false otherwise.
   * (Requirements 7.2, 7.8)
   *
   * @param {string} url
   * @returns {boolean}
   */
  function validateLinkUrl(url) {
    return typeof url === 'string' &&
      (url.indexOf('http://') === 0 || url.indexOf('https://') === 0);
  }

  /**
   * Persists the current `quickLinks` array to localStorage under the key
   * "quickLinks".
   * (Requirements 7.3, 7.6)
   */
  function persistLinks() {
    storage.set('quickLinks', quickLinks);
  }

  /**
   * Removes the link with the given `id` from the `quickLinks` array and from
   * the DOM, then persists the updated list.
   * (Requirements 7.5, 7.6)
   *
   * @param {string} id  link id
   */
  function deleteLink(id) {
    var index = -1;
    for (var i = 0; i < quickLinks.length; i++) {
      if (quickLinks[i].id === id) { index = i; break; }
    }
    if (index !== -1) {
      quickLinks.splice(index, 1);
    }

    var container = document.getElementById('links-container');
    if (container) {
      var div = container.querySelector('div[data-id="' + id + '"]');
      if (div) div.parentNode.removeChild(div);
    }

    persistLinks();
  }

  /**
   * Creates a container `<div data-id="link.id">` containing:
   *   - `<a href="link.url" target="_blank" rel="noopener noreferrer">` with
   *     textContent = link.label (Requirement 7.4)
   *   - `<button>Delete</button>` whose click handler calls deleteLink(link.id)
   * Appends the container to `#links-container`.
   * (Requirements 7.2, 7.4, 7.5)
   *
   * @param {{ id: string, label: string, url: string, createdAt: number }} link
   */
  function renderLink(link) {
    var div = document.createElement('div');
    div.setAttribute('data-id', link.id);

    var a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;

    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    (function (linkId) {
      deleteBtn.addEventListener('click', function () {
        deleteLink(linkId);
      });
    }(link.id));

    div.appendChild(a);
    div.appendChild(deleteBtn);

    var container = document.getElementById('links-container');
    if (container) container.appendChild(div);
  }

  /**
   * Validates the label and URL inputs, then creates and renders a new Link.
   *
   * Trims label; validates:
   *   - label is non-empty (writes to #link-label-error on failure)
   *   - URL passes validateLinkUrl (writes to #link-url-error on failure)
   *   - quickLinks.length < 50 (writes to #link-max-error on failure)
   *
   * On success: creates a Link object, pushes to quickLinks, calls renderLink
   * and persistLinks(), and clears all error spans.
   * (Requirements 7.1, 7.2, 7.3, 7.8, 7.9)
   *
   * @param {string} label  raw label input
   * @param {string} url    raw URL input
   */
  function addLink(label, url) {
    var trimmedLabel = label ? label.trim() : '';
    var labelErrorEl = document.getElementById('link-label-error');
    var urlErrorEl   = document.getElementById('link-url-error');
    var maxErrorEl   = document.getElementById('link-max-error');

    var valid = true;

    if (trimmedLabel.length === 0) {
      if (labelErrorEl) labelErrorEl.textContent = 'Label must not be empty.';
      valid = false;
    } else {
      if (labelErrorEl) labelErrorEl.textContent = '';
    }

    if (!validateLinkUrl(url)) {
      if (urlErrorEl) urlErrorEl.textContent = 'URL must begin with http:// or https://';
      valid = false;
    } else {
      if (urlErrorEl) urlErrorEl.textContent = '';
    }

    if (quickLinks.length >= 50) {
      if (maxErrorEl) maxErrorEl.textContent = 'Maximum of 50 links reached.';
      valid = false;
    } else {
      if (maxErrorEl) maxErrorEl.textContent = '';
    }

    if (!valid) return;

    var link = {
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      label: trimmedLabel,
      url: url,
      createdAt: Date.now()
    };

    quickLinks.push(link);
    renderLink(link);
    persistLinks();

    if (labelErrorEl) labelErrorEl.textContent = '';
    if (urlErrorEl)   urlErrorEl.textContent   = '';
    if (maxErrorEl)   maxErrorEl.textContent   = '';
  }

  /**
   * Reads the saved quickLinks array from storage.  If a non-null value is
   * found, replaces the in-memory `quickLinks` array and renders each link.
   * If storage returns null, `quickLinks` remains an empty array.
   * (Requirement 7.7)
   */
  function loadQuickLinks() {
    var saved = storage.get('quickLinks');
    if (saved !== null) {
      quickLinks = saved;
      quickLinks.forEach(function (link) {
        renderLink(link);
      });
    }
  }

  // ── Event wiring (Requirements 4.2, 4.4, 4.5, 6.1, 7.1, 8.1) ───────────────

  /**
   * Attaches all UI event listeners exactly once.
   * Called once at the end of initialisation, after all load* calls.
   *
   * Covered controls:
   *   #name-save      click       → saveUserName
   *   #name-input     keydown     → saveUserName on Enter
   *   #theme-toggle   click       → toggleTheme
   *   #timer-start    click       → startTimer
   *   #timer-stop     click       → stopTimer
   *   #timer-reset    click       → resetTimer
   *   #duration-save  click       → applyDuration
   *   #duration-input keydown     → applyDuration on Enter
   *   #task-add       click       → addTask, clear input on non-empty
   *   #task-input     keydown     → addTask on Enter, clear input on non-empty
   *   #link-add       click       → addLink, clear inputs on success
   *   #links-container delegated  → Delete buttons (each handled in renderLink;
   *                                 delegation here is a safety net)
   */
  function wireEvents() {
    // ── Greeting / Name ─────────────────────────────────────────────────────
    var nameSaveBtn = document.getElementById('name-save');
    if (nameSaveBtn) {
      nameSaveBtn.addEventListener('click', function () {
        var input = document.getElementById('name-input');
        if (input) saveUserName(input.value);
      });
    }

    var nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveUserName(nameInput.value);
      });
    }

    // ── Theme toggle (Requirement 8.1 – 8.3) ────────────────────────────────
    var themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // ── Timer controls (Requirements 4.2, 4.4, 4.5) ─────────────────────────
    var timerStartBtn = document.getElementById('timer-start');
    if (timerStartBtn) timerStartBtn.addEventListener('click', startTimer);

    var timerStopBtn = document.getElementById('timer-stop');
    if (timerStopBtn) timerStopBtn.addEventListener('click', stopTimer);

    var timerResetBtn = document.getElementById('timer-reset');
    if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);

    var durationSaveBtn = document.getElementById('duration-save');
    if (durationSaveBtn) {
      durationSaveBtn.addEventListener('click', function () {
        var input = document.getElementById('duration-input');
        if (input) applyDuration(input.value);
      });
    }

    var durationInput = document.getElementById('duration-input');
    if (durationInput) {
      durationInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') applyDuration(durationInput.value);
      });
    }

    // ── Todo list (Requirement 6.1) ──────────────────────────────────────────
    var taskAddBtn = document.getElementById('task-add');
    if (taskAddBtn) {
      taskAddBtn.addEventListener('click', function () {
        var input = document.getElementById('task-input');
        if (input && input.value.trim().length > 0) {
          addTask(input.value);
          input.value = '';
        }
      });
    }

    var taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && taskInput.value.trim().length > 0) {
          addTask(taskInput.value);
          taskInput.value = '';
        }
      });
    }

    // ── Quick Links (Requirement 7.1) ────────────────────────────────────────
    var linkAddBtn = document.getElementById('link-add');
    if (linkAddBtn) {
      linkAddBtn.addEventListener('click', function () {
        var labelInput = document.getElementById('link-label-input');
        var urlInput   = document.getElementById('link-url-input');
        if (labelInput && urlInput) {
          addLink(labelInput.value, urlInput.value);
          // Clear inputs only on a successful add: addLink empties all error
          // spans on success and sets them on failure, so check those spans.
          var labelError = document.getElementById('link-label-error');
          var urlError   = document.getElementById('link-url-error');
          var maxError   = document.getElementById('link-max-error');
          if (
            (!labelError || labelError.textContent === '') &&
            (!urlError   || urlError.textContent   === '') &&
            (!maxError   || maxError.textContent   === '')
          ) {
            labelInput.value = '';
            urlInput.value   = '';
          }
        }
      });
    }

    // ── Quick Links — delegated delete (safety net; per-link handlers are
    //   attached in renderLink; this catches any button not yet covered) ──────
    var linksContainer = document.getElementById('links-container');
    if (linksContainer) {
      linksContainer.addEventListener('click', function (e) {
        var btn = e.target;
        if (btn.tagName === 'BUTTON' && btn.textContent === 'Delete') {
          var div = btn.parentNode;
          if (div && div.hasAttribute('data-id')) {
            deleteLink(div.getAttribute('data-id'));
          }
        }
      });
    }
  }

  // ── Initialisation ──────────────────────────────────────────────────────────
  // loadTheme() already ran above to prevent flash-of-wrong-theme.
  // Now populate the greeting/name input and start the clock ticker.
  loadGreeting();                              // Requirement 1.3 — initial render
  setInterval(updateClockDisplay, 1000);       // Requirement 2.4 — 1-second tick
  loadTimer();                                 // Requirements 4.1, 5.4 — timer init
  loadTasks();                                 // Requirement 6.10 — restore saved tasks
  loadQuickLinks();                            // Requirement 7.7 — restore saved links
  wireEvents();                                // Requirements 4.2, 4.4, 4.5, 6.1, 7.1, 8.1

})();
