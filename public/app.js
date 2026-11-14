'use strict';

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cap: '<path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c4 3 8 3 12 0v-5"/><path d="M22 10v6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 3 2 5-7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/>',
  code: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16"/>',
  terminal: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 1h5"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17" cy="13" r="1"/><path d="M12 21a3 3 0 0 1-2-5 2 2 0 0 0-2-3"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  spark: '<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  trophy: '<path d="M7 3h10v8a5 5 0 0 1-10 0zM7 6H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 16v4m-4 1h8"/>',
  shield: '<path d="m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="m8.5 13-2 9 5.5-3 5.5 3-2-9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
const icon = (name, size) => `<svg class="icon" ${size ? `style="width:${size}px;height:${size}px"` : ''} viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.book}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
const app = document.querySelector('#app');
const state = { user: null, courses: [], category: 'All courses', search: '', quiz: {}, returnTo: null, menu: false };
const categories = ['All courses', 'Development', 'Programming', 'Design', 'Career', 'General'];
const percentBar = n => `<div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,Math.min(n,100))}%"></div></div>`;
const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;
const initials = name => String(name || 'G').trim().slice(0, 1).toUpperCase();
const page = () => (window.location.hash.replace(/^#\/?/, '') || '').split('/');
const navigate = to => { window.location.hash = to.startsWith('#') ? to : '#/' + to.replace(/^\//, ''); if (window.location.hash === to) render(); };

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  let data;
  try { data = await response.json(); } catch { throw new Error('The server returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
const post = (url, object = {}) => request(url, { method: 'POST', body: JSON.stringify(object) });
const patch = (url, object = {}) => request(url, { method: 'PATCH', body: JSON.stringify(object) });
const remove = url => request(url, { method: 'DELETE' });
const quizFields = values => {
  const question = (values.question || '').trim();
  if (!question) return undefined;
  return { question, options: (values.options || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean),
    answer: Number(values.answer) - 1, explanation: (values.explanation || '').trim() };
};
const refreshCourses = async () => { state.courses = (await request('/api/courses')).courses; };
const showToast = (message, error = false) => {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const node = document.createElement('div'); node.className = `toast${error ? ' error' : ''}`; node.textContent = message; document.body.appendChild(node);
  setTimeout(() => node.remove(), 3500);
};
const guard = (returnTo = '#/dashboard') => {
  if (state.user) return true;
  state.returnTo = returnTo; navigate('#/signin'); showToast('Sign in to save your learning progress.'); return false;
};
const footer = () => `<footer class="footer"><span>© ${new Date().getFullYear()} UNLOS Learning. Built for curious minds.</span><span>Learn something new, one lesson at a time.</span></footer>`;

function sidebar(route) {
  const active = (key) => route === key ? ' active' : '';
  return `<div class="overlay${state.menu ? ' visible' : ''}" data-close-menu></div><aside class="sidebar${state.menu ? ' open' : ''}">
    <a class="brand" href="#/" aria-label="UNLOS Home"><span class="brand-mark">U</span><span>UNLOS<span class="brand-dot">.</span></span></a>
    <div class="side-label">LEARN</div>
    <a class="side-link${active('home')}" href="#/">${icon('home')} Home</a>
    <a class="side-link${active('courses')}" href="#/courses">${icon('grid')} Explore courses</a>
    <a class="side-link${active('dashboard')}" href="#/dashboard">${icon('chart')} My learning</a>
    <div class="side-label">CATEGORIES</div>
    ${categories.slice(1).map(cat => `<a href="#/courses" class="side-link" data-category="${esc(cat)}">${icon(cat === 'Development' ? 'code' : cat === 'Programming' ? 'terminal' : cat === 'Design' ? 'palette' : 'briefcase')} ${esc(cat)}</a>`).join('')}
    ${state.user ? `<div class="side-label">ACCOUNT</div><a href="#/profile" class="side-link${active('profile')}">${icon('user')} My profile</a>` : ''}
    ${state.user?.role === 'admin' ? `<div class="side-label">INSTRUCTOR</div><a href="#/admin" class="side-link${active('admin')}">${icon('plus')} Course management</a>` : ''}
    <div class="sidebar-bottom"><div class="help-card"><div class="help-title">Make time to learn ${icon('spark', 14)}</div><p>Even 15 minutes a day can move you forward.</p><a class="small-link" href="#/courses">Find a course ${icon('arrow', 13)}</a></div>
      <div class="side-account"><span class="avatar">${initials(state.user?.name)}</span><div><div class="person-name">${esc(state.user?.name || 'Guest learner')}</div><div class="person-role">${state.user ? (state.user.role === 'admin' ? 'Instructor' : 'Student account') : 'Explore for free'}</div></div></div>
    </div></aside>`;
}
function topbar(route) {
  const labels = { home: 'Home', courses: 'Explore courses', course: 'Course overview', lesson: 'Lesson reader', dashboard: 'My learning', signin: 'Sign in', signup: 'Create account', admin: 'Manage courses' };
  return `<header class="topbar"><div class="topbar-left"><button class="icon-action mobile-menu" data-mobile aria-label="Open navigation">${icon('menu')}</button><div><div class="page-eyebrow">UNLOS LEARNING</div><div class="page-path">${esc(labels[route] || 'Home')}</div></div></div>
    <div class="topbar-right"><label class="search-top">${icon('search', 18)}<input type="search" id="global-search" placeholder="Search for courses..." aria-label="Search courses"></label>
      ${state.user ? `<a href="#/dashboard" class="account-top"><span class="top-name">${esc(state.user.name)}</span><span class="top-avatar">${initials(state.user.name)}</span></a><button class="icon-action" data-logout title="Sign out" aria-label="Sign out">${icon('logout', 17)}</button>` : `<a href="#/signin" class="btn line small-btn">Log in</a><a href="#/signup" class="btn primary small-btn">Join free</a>`}
    </div></header>`;
}
function intro(title, desc) { return `<div><h1 class="intro-title">${esc(title)}</h1><p class="intro-sub">${esc(desc)}</p></div>`; }
function stat(number, label, kind, symbol) { return `<div class="mini-stat"><div class="stat-icon ${kind || ''}">${icon(symbol)}</div><div><div class="stat-value">${number}</div><div class="stat-caption">${esc(label)}</div></div></div>`; }
function courseCard(c) {
  const action = c.enrolled ? `Continue ${icon('arrow', 14)}` : `View course ${icon('arrow', 14)}`;
  return `<article class="course-card"><a href="#/course/${encodeURIComponent(c.slug)}" aria-label="View ${esc(c.title)}"><div class="course-art ${esc(c.accent)}"><span class="course-art-icon">${icon(c.icon)}</span></div></a><div class="course-info"><div class="course-topline"><span class="pill">${esc(c.category)}</span><span class="pill subtle">${esc(c.level)}</span></div><h3><a href="#/course/${encodeURIComponent(c.slug)}">${esc(c.title)}</a></h3><p>${esc(c.description)}</p>${c.enrolled ? `<div class="progress-label"><span>Your progress</span><strong>${c.progress}%</strong></div>${percentBar(c.progress)}<div class="divider-space"></div>` : ''}<div class="meta-row"><span>${icon('book')} ${plural(c.lessonCount, 'lesson')}</span><span>${icon('clock')} ${esc(c.duration)}</span><a href="#/course/${encodeURIComponent(c.slug)}" class="course-link">${action}</a></div></div></article>`;
}
const findCourse = id => state.courses.find(c => c.slug === id);
function home() {
  const enrolled = state.courses.filter(c => c.enrolled);
  const finished = enrolled.filter(c => c.lessonCount && c.progress === 100).length;
  const completed = enrolled.reduce((total, c) => total + c.completedCount, 0);
  const name = state.user ? `, ${esc(state.user.name.split(' ')[0])}` : '';
  return `${intro(`Welcome${name}!`, 'Your place to discover new skills and keep learning.')}
  <section class="hero"><div class="hero-copy"><div class="hero-label">${icon('spark', 14)} YOUR LEARNING STARTS HERE</div><h2>Small lessons. Big possibilities.</h2><p>Explore useful courses, learn at your own pace, and see how far you have come.</p><a class="btn light" href="#/courses">Explore courses ${icon('arrow', 16)}</a></div><div class="hero-art"><div class="hero-ring"></div><div class="hero-ring two"></div><div class="hero-board"><div class="hero-board-inner"><div class="hero-bar"></div><div class="hero-bar short"></div><div class="hero-graph"><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="hero-float">${icon('cap')}</div></div></section>
  <div class="feature-stats">${stat(state.courses.length, 'Available courses', '', 'book')}${stat(completed, 'Lessons completed', 'blue', 'check')}${stat(finished, 'Courses finished', 'orange', 'trophy')}</div>
  <div class="section-head"><div><h2 class="section-title">Browse by interest</h2><p class="section-description">Pick a topic you want to explore.</p></div></div>
  <div class="categories">${categories.slice(1).map(cat => `<a href="#/courses" data-category="${esc(cat)}" class="category">${icon(cat === 'Development' ? 'code' : cat === 'Programming' ? 'terminal' : cat === 'Design' ? 'palette' : 'briefcase', 17)} ${esc(cat)}</a>`).join('')}</div>
  <div class="section-head"><div><h2 class="section-title">Popular starting points</h2><p class="section-description">Beginner-friendly courses selected for this demo.</p></div><a class="view-all" href="#/courses">View all ${icon('arrow', 16)}</a></div>
  <div class="course-grid">${state.courses.slice(0, 3).map(courseCard).join('')}</div>
  <div class="section-head"><div><h2 class="section-title">Keep moving forward</h2><p class="section-description">A little progress each day adds up.</p></div></div>
  <div class="bottom-grid"><div class="surface"><h3 class="panel-heading">${enrolled.length ? 'Continue learning' : 'Your learning journey'}</h3>${enrolled.length ? enrolled.slice(0, 3).map(c => `<div class="continue-item"><div class="tiny-icon ${esc(c.accent)}">${icon(c.icon)}</div><div style="flex:1;min-width:0"><div class="continue-title">${esc(c.title)}</div><div class="continue-sub">${c.completedCount} of ${c.lessonCount} lessons finished</div></div><a class="btn ghost small-btn" href="#/course/${esc(c.slug)}">Continue</a></div>`).join('') : `<div class="empty-state"><div>${icon('cap')}</div><h3>Start with a course</h3><p>Your enrolled courses will show up here.</p><a href="#/courses" class="btn primary">Browse courses</a></div>`}</div><div class="surface"><div class="tip-banner"><span class="tip-icon">${icon('sun')}</span><h4>Build a learning habit</h4><p>Choose one lesson, take notes, and check your understanding with a short quiz.</p><a class="small-link" href="#/courses">Find your next lesson ${icon('arrow', 13)}</a></div></div></div>`;
}
function filtered() {
  return state.courses.filter(c => (state.category === 'All courses' || c.category === state.category) && (!state.search || `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(state.search.toLowerCase())));
}
function catalog() {
  const list = filtered();
  return `${intro('Explore courses', 'Browse practical lessons and choose what you want to learn next.')}
    <div class="catalog-tools"><div class="categories">${categories.map(cat => `<button class="category${state.category === cat ? ' selected' : ''}" data-category="${esc(cat)}">${esc(cat)}</button>`).join('')}</div><label class="catalog-search">${icon('search', 17)} <input id="catalog-search" type="search" placeholder="Find a course..." aria-label="Find a course" value="${esc(state.search)}"></label></div>
    <p class="catalog-count" id="catalog-count">Showing ${plural(list.length, 'course')}</p><div class="course-grid" id="catalog-grid">${list.length ? list.map(courseCard).join('') : emptyCourses()}</div>`;
}
function emptyCourses() { return `<div class="empty-state"><div>${icon('search')}</div><h3>No matching courses</h3><p>Try a different keyword or category.</p><button class="btn ghost" data-clear-filters>Clear filters</button></div>`; }
function coursePage(course) {
  if (!course) return notFound();
  const next = course.lessons.find(l => !l.completed) || course.lessons[0];
  const canRead = course.enrolled || state.user?.role === 'admin';
  return `<div class="breadcrumbs"><a href="#/courses">Explore courses</a>${icon('chevron', 13)}<span>${esc(course.title)}</span></div>
    <section class="course-detail-banner ${esc(course.accent)}"><div><span class="hero-label">${icon('book', 14)} ${esc(course.category)} · ${esc(course.level)}</span><h1>${esc(course.title)}</h1><p>${esc(course.description)}</p><div class="quick-stats"><span style="color:#fff">${icon('list')} ${plural(course.lessonCount, 'lesson')}</span><span style="color:#fff">${icon('clock')} ${esc(course.duration)}</span></div></div><div class="detail-art">${icon(course.icon)}</div></section>
    <div class="detail-columns"><div><section class="surface"><h2 class="panel-heading">What you'll learn</h2><ul class="outcome-list">${(course.outcomes.length ? course.outcomes : ['Build knowledge one lesson at a time.']).map(o => `<li>${icon('check', 17)} ${esc(o)}</li>`).join('')}</ul></section><section class="surface" style="margin-top:22px"><h2 class="panel-heading">Course content</h2><p class="muted small">${plural(course.lessonCount, 'lesson')} · Go at your own pace</p>${course.lessons.length ? course.lessons.map((l, i) => `<a class="lesson-row" href="${canRead ? `#/lesson/${esc(course.slug)}/${esc(l.id)}` : '#/signin'}" ${!canRead ? `data-requires-enroll="${esc(course.slug)}"` : ''}><div class="lesson-num${l.completed ? ' done' : ''}">${l.completed ? icon('check', 19) : String(i + 1).padStart(2, '0')}</div><div><div class="lesson-title">${esc(l.title)}</div><div class="lesson-summary">${l.minutes} min · ${esc(l.lead)}</div></div>${icon(l.completed ? 'check' : 'chevron', 18)}</a>`).join('') : `<p class="muted small">The instructor has not added lessons yet.</p>`}</section></div>
    <aside class="sticky-card"><div class="detail-enroll"><h3>${course.enrolled ? 'Your learning progress' : 'Ready to begin?'}</h3><p>${course.enrolled ? `You have finished ${course.completedCount} of ${course.lessonCount} lessons. Keep it going.` : 'Enroll for free to save progress and take quizzes.'}</p>${course.enrolled ? `<div class="progress-label"><span>Course completion</span><strong>${course.progress}%</strong></div>${percentBar(course.progress)}<div class="divider-space"></div>` : ''}${next ? (course.enrolled ? `<a class="btn primary full" href="#/lesson/${esc(course.slug)}/${esc(next.id)}">${course.progress === 100 ? 'Review lessons' : 'Continue learning'} ${icon('arrow', 16)}</a>` : `<button class="btn primary full" data-enroll="${esc(course.slug)}">Enroll in course ${icon('arrow', 16)}</button>`) : `<button class="btn line full" disabled>Lessons coming soon</button>`}<div class="quick-stats" style="margin-top:16px"><span>${icon('check')} Self-paced learning</span><span>${icon('shield')} Progress saved to your account</span></div></div></aside></div>`;
}
function quizBox(lesson) {
  if (!lesson.quiz) return '';
  const feedback = state.quiz[lesson.id];
  return `<div class="quiz-card"><div class="lesson-kicker">KNOWLEDGE CHECK</div><h3>Quick quiz</h3><p>${esc(lesson.quiz.question)}</p><form id="quiz-form" data-lesson="${esc(lesson.id)}">${lesson.quiz.options.map((o, i) => `<label class="choice"><input type="radio" name="answer" value="${i}" required> ${esc(o)}</label>`).join('')}<button class="btn primary" type="submit">Check answer ${icon('arrow', 16)}</button></form>${feedback ? `<div class="quiz-feedback ${feedback.correct ? 'correct' : 'wrong'}"><strong>${feedback.correct ? 'Correct answer!' : 'Not quite. Try again.'}</strong><div>${esc(feedback.explanation)}</div></div>` : ''}</div>`;
}
function reader(course, lessonId) {
  if (!course) return notFound();
  const lesson = course.lessons.find(l => l.id === lessonId);
  if (!lesson) return notFound();
  if (!state.user) return `<div class="empty-state"><h3>Sign in to start learning</h3><p>You need a free account to read lessons and save progress.</p><a class="btn primary" href="#/signin">Sign in</a></div>`;
  if (!course.enrolled && state.user?.role !== 'admin') return `<div class="empty-state"><h3>Enroll in this course first</h3><p>You can start with a free enrollment.</p><button class="btn primary" data-enroll="${esc(course.slug)}">Enroll now</button></div>`;
  const current = course.lessons.findIndex(l => l.id === lessonId);
  const next = course.lessons[current + 1];
  return `<div class="breadcrumbs"><a href="#/courses">Explore courses</a>${icon('chevron', 13)}<a href="#/course/${esc(course.slug)}">${esc(course.title)}</a>${icon('chevron', 13)}<span>Lesson ${current + 1}</span></div><div class="lesson-layout"><main class="surface reader"><div class="lesson-kicker">LESSON ${current + 1} OF ${course.lessonCount} · ${lesson.minutes} MIN READ</div><h1>${esc(lesson.title)}</h1><p class="reader-lead">${esc(lesson.lead)}</p>${lesson.sections.map(sec => `<section class="reader-section"><h2>${esc(sec.heading)}</h2><p>${esc(sec.body)}</p>${sec.bullets?.length ? `<ul>${sec.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</section>`).join('')}${quizBox(lesson)}<div class="reader-footer"><button class="btn ${lesson.completed ? 'ghost' : 'primary'}" data-complete="${esc(lesson.id)}">${icon('check')} ${lesson.completed ? 'Lesson completed' : 'Mark lesson complete'}</button>${next ? `<a href="#/lesson/${esc(course.slug)}/${esc(next.id)}" class="btn line">Next lesson ${icon('arrow', 16)}</a>` : `<a href="#/course/${esc(course.slug)}" class="btn line">Course overview ${icon('arrow', 16)}</a>`}</div></main><aside class="surface syllabus"><h3>In this course</h3>${course.lessons.map((l, i) => `<a href="#/lesson/${esc(course.slug)}/${esc(l.id)}" class="${l.id === lesson.id ? 'active' : ''}">${icon(l.completed ? 'check' : 'book', 15)}<span>${i + 1}. ${esc(l.title)}</span></a>`).join('')}<div class="progress-label"><span>Course progress</span><strong>${course.progress}%</strong></div>${percentBar(course.progress)}</aside></div>`;
}
async function dashboard() {
  if (!state.user) return `<div class="empty-state"><h3>Your dashboard is waiting</h3><p>Sign in to view enrolled courses and your learning progress.</p><a class="btn primary" href="#/signin">Sign in to continue</a></div>`;
  const { courses, stats } = await request('/api/dashboard');
  return `${intro('My learning', 'A clear view of what you have started and completed.')}<div class="dashboard-hero"><div><h2>Keep up the good work, ${esc(state.user.name.split(' ')[0])}.</h2><p>Your progress is saved whenever you complete a lesson.</p></div>${icon('trophy', 52)}</div>
    <div class="feature-stats">${stat(stats.enrolledCourses, 'Enrolled courses', '', 'book')}${stat(stats.completedLessons, 'Completed lessons', 'blue', 'check')}${stat(stats.passedQuizzes, 'Quizzes passed', 'orange', 'trophy')}</div>
    <div class="section-head"><div><h2 class="section-title">My courses</h2><p class="section-description">Pick up where you left off.</p></div><a href="#/courses" class="view-all">Explore more ${icon('arrow', 16)}</a></div>
    <div class="surface">${courses.length ? courses.map(c => `<div class="progress-course"><span class="tiny-icon ${esc(c.accent)}">${icon(c.icon)}</span><div class="info"><h4><a href="#/course/${esc(c.slug)}">${esc(c.title)}</a></h4><div class="muted small">${c.completedCount} of ${c.lessonCount} lessons completed</div>${percentBar(c.progress)}</div><span class="progress-num">${c.progress}%</span><a href="#/course/${esc(c.slug)}" class="btn ghost small-btn">View</a></div>`).join('') : `<div class="empty-state"><div>${icon('book')}</div><h3>No courses yet</h3><p>Enroll in a course and it will appear here.</p><a href="#/courses" class="btn primary">Explore courses</a></div>`}</div>
    ${stats.finishedCourses ? `<div class="section-head"><h2 class="section-title">Milestones</h2></div><div class="finished-banner">${icon('award', 42)}<h2>${plural(stats.finishedCourses, 'course')} finished</h2><p>You've completed every lesson in ${plural(stats.finishedCourses, 'course')}. Keep going!</p></div>` : ''}`;
}
function auth(kind) {
  const signup = kind === 'signup';
  return `<div class="auth-wrap"><div class="auth-card"><div class="auth-icon">${icon(signup ? 'cap' : 'user', 27)}</div><h1 class="auth-title">${signup ? 'Start learning with UNLOS' : 'Welcome back'}</h1><p class="auth-desc">${signup ? 'Create your free account to save courses, lessons and quiz progress.' : 'Log in to continue learning at your own pace.'}</p>
    <form id="auth-form" data-kind="${kind}"><div id="auth-error"></div>${signup ? `<div class="form-group"><label for="auth-name">Full name</label><input class="input" id="auth-name" name="name" autocomplete="name" minlength="2" required placeholder="Your name"></div>` : ''}<div class="form-group"><label for="auth-email">Email address</label><input class="input" id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div class="form-group"><label for="auth-password">Password</label><input class="input" id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="${signup ? 8 : 1}" required placeholder="${signup ? 'At least 8 characters' : 'Enter your password'}"></div><button class="btn primary full" type="submit">${signup ? 'Create free account' : 'Log in'} ${icon('arrow', 17)}</button></form><div class="auth-footer">${signup ? 'Already have an account?' : 'New to UNLOS?'} <a href="#/${signup ? 'signin' : 'signup'}">${signup ? 'Log in' : 'Create an account'}</a></div></div></div>`;
}

function profilePage() {
  if (!state.user) return '<div class="empty-state"><h3>Please sign in</h3><a class="btn primary" href="#/signin">Sign in</a></div>';
  return `${intro('My profile', 'Manage your account details and password.')}
    <div class="admin-forms account-forms">
      <form class="surface" id="account-profile"><h3>Personal details</h3>
        <div class="form-group"><label for="profile-name">Full name</label><input class="input" id="profile-name" name="name" minlength="2" maxlength="80" value="${esc(state.user.name)}" required></div>
        <div class="form-group"><label>Email address</label><input class="input" value="${esc(state.user.email)}" disabled></div>
        <button class="btn primary" type="submit">Save changes</button></form>
      <form class="surface" id="account-password"><h3>Change password</h3><p>Use a unique password with at least 10 characters.</p>
        <div class="form-group"><label>Current password</label><input class="input" name="currentPassword" type="password" autocomplete="current-password" required></div>
        <div class="form-group"><label>New password</label><input class="input" name="newPassword" type="password" minlength="10" maxlength="200" autocomplete="new-password" required></div>
        <button class="btn primary" type="submit">Update password</button></form>
    </div>`;
}
function courseManageItem(course) {
  const published = course.published !== false;
  return `<article class="manage-course">
      <div class="manage-head"><div><div class="manage-top"><h3>${esc(course.title)}</h3><span class="manage-pill ${published ? 'live' : 'draft'}">${published ? 'Published' : 'Draft'}</span></div>
      <p class="muted small">${esc(course.category)} · ${plural(course.lessonCount, 'lesson')} · ${esc(course.level)}</p></div>
      <div class="manage-actions"><button class="btn ${published ? 'line' : 'primary'} small-btn" data-publish-course="${esc(course.slug)}" data-next-published="${published ? 'false' : 'true'}">${published ? 'Unpublish' : 'Publish'}</button><button class="btn line small-btn danger-text" data-delete-course="${esc(course.slug)}">Delete</button></div></div>
      <details class="manage-details"><summary>Edit course information</summary>
      <form class="manage-edit-form" id="edit-course" data-slug="${esc(course.slug)}">
        <div class="form-group"><label>Title</label><input class="input" name="title" maxlength="100" minlength="4" value="${esc(course.title)}" required></div>
        <div class="form-group"><label>Description</label><textarea class="input" name="description" minlength="20" maxlength="400" required>${esc(course.description)}</textarea></div>
        <div class="admin-mini-grid"><div class="form-group"><label>Category</label><input class="input" name="category" maxlength="40" value="${esc(course.category)}"></div><div class="form-group"><label>Level</label><input class="input" name="level" maxlength="30" value="${esc(course.level)}"></div></div>
        <div class="form-group"><label>Duration</label><input class="input" name="duration" maxlength="40" value="${esc(course.duration)}"></div>
        <button class="btn primary small-btn" type="submit">Save course</button>
      </form></details>
      <details class="manage-details"><summary>Manage lessons (${course.lessonCount})</summary>
      ${course.lessons.map((lesson, i) => `<div class="manage-lesson"><div class="manage-lesson-header"><strong>${i + 1}. ${esc(lesson.title)}</strong><button class="btn line small-btn danger-text" data-delete-lesson="${esc(lesson.id)}">Delete lesson</button></div>
        <form id="edit-lesson" data-id="${esc(lesson.id)}">
          <div class="form-group"><label>Lesson title</label><input class="input" name="title" value="${esc(lesson.title)}" minlength="3" maxlength="100" required></div>
          <div class="form-group"><label>Summary</label><input class="input" name="lead" value="${esc(lesson.lead)}" maxlength="250"></div>
          <div class="form-group"><label>Minutes</label><input class="input" name="minutes" type="number" min="1" max="180" value="${lesson.minutes}"></div>
          <div class="form-group"><label>Lesson text</label><textarea class="input" name="content" minlength="30" maxlength="8000" required>${esc(lesson.sections.map(s => s.body).join('\n\n'))}</textarea></div>
          <details class="quiz-editor"><summary>${lesson.quiz ? 'Replace existing quiz' : 'Add an optional quiz'}</summary>
            <p class="muted small">Leave the question empty to keep the current quiz. Each option goes on its own line.</p>
            <div class="form-group"><label>Question</label><input class="input" name="question" maxlength="300" placeholder="e.g. Which protocol assigns IP addresses?"></div>
            <div class="form-group"><label>Answer options</label><textarea class="input" name="options" placeholder="Option one&#10;Option two&#10;Option three"></textarea></div>
            <div class="form-group"><label>Correct option number (1–6)</label><input class="input" name="answer" type="number" min="1" max="6" value="1"></div>
            <div class="form-group"><label>Explanation</label><input class="input" name="explanation" maxlength="500"></div>
          </details>
          <button class="btn primary small-btn" type="submit">Save lesson</button>
        </form></div>`).join('') || '<p class="muted small">No lessons yet. Add one below.</p>'}
      </details>
    </article>`;
}
async function admin() {
  if (state.user?.role !== 'admin') return '<div class="empty-state"><h3>Instructor access only</h3><p>Sign in as an instructor to manage content.</p><a href="#/" class="btn primary">Back to home</a></div>';
  const [{ stats }, courses] = await Promise.all([
    request('/api/admin/overview'),
    Promise.all(state.courses.map(c => request('/api/courses/' + encodeURIComponent(c.slug)).then(x => x.course)))
  ]);
  return `${intro('Instructor studio', 'Build courses, manage lessons and publish when ready.')}
    <div class="feature-stats admin-stats">
      ${stat(stats.students, 'Students', '', 'user')}
      ${stat(stats.publishedCourses, 'Published courses', 'blue', 'book')}
      ${stat(stats.enrollments, 'Total enrollments', 'orange', 'chart')}
    </div>
    <div class="section-head"><div><h2 class="section-title">Your courses</h2><p class="section-description">New courses start as drafts and can be published after adding lessons.</p></div></div>
    <section class="surface manage-list">${courses.map(courseManageItem).join('') || '<p>No courses created yet.</p>'}</section>
    <div class="section-head"><h2 class="section-title">Create learning content</h2></div>
    <div class="admin-forms">
      <form id="new-course"><h3>New course</h3><p>Set up the course details. It will remain private until published.</p>
        <div class="form-group"><label>Course title</label><input class="input" name="title" minlength="4" maxlength="100" required placeholder="e.g. Introduction to Computer Networks"></div>
        <div class="form-group"><label>Short description</label><textarea class="input" name="description" minlength="20" maxlength="400" required placeholder="What will students learn?"></textarea></div>
        <div class="form-group"><label>Category</label><select class="input" name="category"><option>Development</option><option>Programming</option><option>Design</option><option>Career</option><option>General</option></select></div>
        <div class="form-group"><label>Level</label><select class="input" name="level"><option>Beginner</option><option>Intermediate</option><option>All levels</option></select></div>
        <button class="btn primary" type="submit">${icon('plus', 16)} Create draft course</button>
      </form>
      <form id="new-lesson"><h3>New lesson</h3><p>Add readable content and an optional graded knowledge check.</p>
        <div class="form-group"><label>Course</label><select class="input" name="slug" required>${state.courses.map(c => `<option value="${esc(c.slug)}">${esc(c.title)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Lesson title</label><input class="input" name="title" minlength="3" maxlength="100" required></div>
        <div class="form-group"><label>Short summary</label><input class="input" name="lead" maxlength="250"></div>
        <div class="form-group"><label>Reading time (minutes)</label><input class="input" name="minutes" type="number" min="1" max="180" value="15"></div>
        <div class="form-group"><label>Lesson content</label><textarea class="input" name="content" minlength="30" maxlength="8000" required></textarea></div>
        <details class="quiz-editor"><summary>Optional quiz</summary><div class="form-group"><label>Question</label><input class="input" name="question" maxlength="300"></div>
          <div class="form-group"><label>Answer options (one per line)</label><textarea class="input" name="options"></textarea></div>
          <div class="form-group"><label>Correct option number</label><input class="input" name="answer" type="number" min="1" max="6" value="1"></div>
          <div class="form-group"><label>Explanation</label><input class="input" name="explanation" maxlength="500"></div></details>
        <button class="btn primary" type="submit">${icon('plus', 16)} Add lesson</button>
      </form>
    </div>`;
}
function notFound() { return `<div class="empty-state"><h3>Page not found</h3><p>This address does not match a course or page.</p><a href="#/" class="btn primary">Back to home</a></div>`; }

let renderVersion = 0;
async function render() {
  state.menu = false;
  const version = ++renderVersion;
  const parts = page(), route = parts[0] || 'home';
  document.title = `${route === 'home' ? 'Learn at your own pace' : route === 'courses' ? 'Explore courses' : route === 'dashboard' ? 'My learning' : route === 'course' ? 'Course overview' : route === 'lesson' ? 'Lesson reader' : route === 'admin' ? 'Course management' : 'Account'} | UNLOS`;
  let content = '';
  try {
    if (route === 'home') content = home();
    else if (route === 'courses') content = catalog();
    else if (route === 'course' || route === 'lesson') {
      const { course } = await request(`/api/courses/${encodeURIComponent(parts[1] || '')}`);
      if (version !== renderVersion) return;
      content = route === 'course' ? coursePage(course) : reader(course, parts[2]);
    }
    else if (route === 'dashboard') content = await dashboard();
    else if (route === 'signup' || route === 'signin') content = auth(route);
    else if (route === 'admin') content = await admin();
    else if (route === 'profile') content = profilePage();
    else content = notFound();
  } catch (e) { content = `<div class="empty-state"><h3>Unable to load this page</h3><p>${esc(e.message)}</p><a href="#/" class="btn primary">Back to home</a></div>`; }
  if (version !== renderVersion) return;
  app.innerHTML = `<div class="layout">${sidebar(route)}<div class="main-shell">${topbar(route)}<div class="content">${content}${footer()}</div></div></div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', render);
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-mobile],[data-close-menu],[data-category],[data-enroll],[data-logout],[data-complete],[data-clear-filters],[data-requires-enroll],[data-publish-course],[data-delete-course],[data-delete-lesson]');
  if (!button) return;
  if (button.matches('[data-mobile]')) { state.menu = !state.menu; app.querySelector('.sidebar')?.classList.toggle('open', state.menu); app.querySelector('.overlay')?.classList.toggle('visible', state.menu); return; }
  if (button.matches('[data-close-menu]')) { state.menu = false; app.querySelector('.sidebar')?.classList.remove('open'); app.querySelector('.overlay')?.classList.remove('visible'); return; }
  if (button.matches('[data-category]')) {
    state.category = button.dataset.category; state.search = '';
    if (page()[0] === 'courses') { event.preventDefault(); render(); }
    return;
  }
  if (button.matches('[data-clear-filters]')) { state.category = 'All courses'; state.search = ''; render(); return; }
  if (button.matches('[data-requires-enroll]')) { event.preventDefault(); if (guard(`#/course/${button.dataset.requiresEnroll}`)) showToast('Enroll in this course to open its lessons.'); return; }
  if (button.matches('[data-enroll]')) {
    const slug = button.dataset.enroll;
    if (!guard(`#/course/${slug}`)) return;
    button.disabled = true;
    try { await post(`/api/courses/${slug}/enroll`); await refreshCourses(); showToast('You are enrolled!'); await render(); }
    catch (e) { showToast(e.message, true); button.disabled = false; }
    return;
  }
  if (button.matches('[data-complete]')) {
    button.disabled = true;
    try { await post(`/api/lessons/${button.dataset.complete}/complete`); await refreshCourses(); showToast('Lesson completed. Nice work!'); render(); }
    catch (e) { showToast(e.message, true); button.disabled = false; }
    return;
  }

  if (button.matches('[data-publish-course]')) {
    button.disabled = true;
    try {
      await patch('/api/admin/courses/' + encodeURIComponent(button.dataset.publishCourse),
        { published: button.dataset.nextPublished === 'true' });
      await refreshCourses(); showToast('Course visibility updated.'); render();
    } catch(e) { showToast(e.message, true); button.disabled = false; }
    return;
  }
  if (button.matches('[data-delete-course]')) {
    if (!window.confirm('Delete this course, all its lessons and student progress? This cannot be undone.')) return;
    try { await remove('/api/admin/courses/' + encodeURIComponent(button.dataset.deleteCourse));
      await refreshCourses(); showToast('Course deleted.'); render(); }
    catch(e) { showToast(e.message, true); }
    return;
  }
  if (button.matches('[data-delete-lesson]')) {
    if (!window.confirm('Delete this lesson and its quiz results?')) return;
    try { await remove('/api/admin/lessons/' + encodeURIComponent(button.dataset.deleteLesson));
      await refreshCourses(); showToast('Lesson deleted.'); render(); }
    catch(e) { showToast(e.message, true); }
    return;
  }
  if (button.matches('[data-logout]')) {
    try { await post('/api/auth/logout'); state.user = null; await refreshCourses(); navigate('#/'); render(); showToast('Signed out successfully.'); }
    catch (e) { showToast(e.message, true); }
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'catalog-search') {
    state.search = event.target.value;
    const list = filtered(); const grid = document.querySelector('#catalog-grid');
    if (grid) grid.innerHTML = list.length ? list.map(courseCard).join('') : emptyCourses();
    const label = document.querySelector('#catalog-count'); if (label) label.textContent = `Showing ${plural(list.length, 'course')}`;
  }
  if (event.target.id === 'global-search') { state.category = 'All courses'; state.search = event.target.value; if (page()[0] !== 'courses') navigate('#/courses'); else { const list = filtered(); const grid = document.querySelector('#catalog-grid'); if (grid) grid.innerHTML = list.length ? list.map(courseCard).join('') : emptyCourses(); const label = document.querySelector('#catalog-count'); if (label) label.textContent = `Showing ${plural(list.length, 'course')}`; } }
});
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['auth-form', 'quiz-form', 'new-course', 'new-lesson', 'edit-course', 'edit-lesson', 'account-profile', 'account-password'].includes(form.id)) return;
  event.preventDefault(); const submit = form.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
  try {
    if (form.id === 'auth-form') {
      const values = Object.fromEntries(new FormData(form));
      const response = await post(form.dataset.kind === 'signup' ? '/api/auth/register' : '/api/auth/login', values);
      state.user = response.user; await refreshCourses();
      const redirect = state.returnTo || '#/dashboard'; state.returnTo = null; navigate(redirect); render(); showToast(`Welcome${state.user.name ? `, ${state.user.name.split(' ')[0]}` : ''}!`);
    } else if (form.id === 'quiz-form') {
      const selected = form.querySelector('input[name="answer"]:checked');
      if (!selected) throw new Error('Please select an answer.');
      state.quiz[form.dataset.lesson] = await post(`/api/lessons/${form.dataset.lesson}/quiz`, { answer: Number(selected.value) });
      render();
    } else if (form.id === 'new-course') {
      const result = await post('/api/admin/courses', Object.fromEntries(new FormData(form))); await refreshCourses();
      showToast(`Course "${result.course.title}" created.`); render();
    } else if (form.id === 'new-lesson') {
      const data = Object.fromEntries(new FormData(form)); const slug = data.slug; delete data.slug;
      const quiz = quizFields(data);
      for (const key of ['question', 'options', 'answer', 'explanation']) delete data[key];
      if (quiz) data.quiz = quiz;
      await post(`/api/admin/courses/${encodeURIComponent(slug)}/lessons`, data);
      await refreshCourses(); showToast('New lesson added.'); render();

    } else if (form.id === 'edit-course') {
      await patch('/api/admin/courses/' + encodeURIComponent(form.dataset.slug), Object.fromEntries(new FormData(form)));
      await refreshCourses(); showToast('Course updated.'); render();
    } else if (form.id === 'edit-lesson') {
      const data = Object.fromEntries(new FormData(form));
      const quiz = quizFields(data);
      for (const key of ['question', 'options', 'answer', 'explanation']) delete data[key];
      if (quiz) data.quiz = quiz;
      await patch('/api/admin/lessons/' + encodeURIComponent(form.dataset.id), data);
      showToast('Lesson updated.'); render();
    } else if (form.id === 'account-profile') {
      state.user = (await patch('/api/account/profile', Object.fromEntries(new FormData(form)))).user;
      showToast('Profile saved.'); render();
    } else if (form.id === 'account-password') {
      await post('/api/account/password', Object.fromEntries(new FormData(form)));
      showToast('Password updated.'); form.reset();
      if (submit) submit.disabled = false;
    }
  } catch (e) {
    if (form.id === 'auth-form') { const el = document.querySelector('#auth-error'); if (el) el.innerHTML = `<div class="error-message">${esc(e.message)}</div>`; }
    else showToast(e.message, true);
    if (submit) submit.disabled = false;
  }
});
(async () => {
  try { state.user = (await request('/api/me')).user; await refreshCourses(); }
  catch (e) { showToast('Unable to connect to the UNLOS server.', true); }
  render();
})();
