'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { courses: seedCourses } = require('./lib/courses');
const { createStore } = require('./lib/store');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const ttl = 30 * 24 * 60 * 60 * 1000;
const id = () => crypto.randomUUID();
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const safeText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65);
const cleanEmail = value => safeText(value, 254).toLowerCase();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, encoded) {
  try {
    const [salt, hash] = encoded.split(':');
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function publicCourse(course, user, db, detailed = false) {
  const completionIds = new Set(db.completions.filter(x => user && x.userId === user.id).map(x => x.lessonId));
  const enrolled = !!(user && db.enrollments.some(x => x.userId === user.id && x.courseId === course.id));
  const count = course.lessons.filter(x => completionIds.has(x.id)).length;
  const total = course.lessons.length;
  const result = {
    id: course.id, slug: course.slug, title: course.title, description: course.description,
    published: course.published !== false,
    category: course.category, level: course.level, duration: course.duration,
    icon: course.icon, accent: course.accent, outcomes: course.outcomes || [],
    lessonCount: total, completedCount: count, enrolled,
    progress: total ? Math.round(100 * count / total) : 0
  };
  if (detailed) result.lessons = course.lessons.map(l => ({
    id: l.id, title: l.title, minutes: l.minutes, lead: l.lead,
    sections: l.sections, completed: completionIds.has(l.id),
    quiz: l.quiz ? { question: l.quiz.question, options: l.quiz.options } : null,
    passed: !!(user && db.quizAttempts.some(x => x.userId === user.id && x.lessonId === l.id && x.correct))
  }));
  return result;
}

function validatedQuiz(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const question = safeText(raw.question, 300);
  const options = Array.isArray(raw.options) ? raw.options.map(v => safeText(v, 160)) : [];
  const explanation = safeText(raw.explanation, 500);
  if (question.length < 8 || options.length < 2 || options.length > 6 ||
      options.some(o => o.length < 1) ||
      !Number.isInteger(raw.answer) || raw.answer < 0 || raw.answer >= options.length) return null;
  return { question, options, answer: raw.answer, explanation };
}

function createApp(opts = {}) {
  const store = createStore({ ...opts, seedCourses });
  let db = store.data || { users: [], sessions: [], enrollments: [], completions: [], quizAttempts: [], courses: structuredClone(seedCourses) };

  async function save() {
    return await store.save(db);
  }

  const adminEmail = cleanEmail(opts.adminEmail || process.env.ADMIN_EMAIL || '');
  const adminPassword = opts.adminPassword || process.env.ADMIN_PASSWORD || '';

  // Synchronous seed for SQLite store
  if (store.type === 'sqlite') {
    if (adminEmail && adminPassword.length >= 12 && !db.users.some(u => u.email === adminEmail)) {
      db.users.push({ id: id(), name: 'Instructor', email: adminEmail, password: hashPassword(adminPassword), role: 'admin', joinedAt: new Date().toISOString() });
      save();
    }
  }

  let readyPromise = null;
  async function ensureReady() {
    if (store.init) {
      if (!readyPromise) {
        readyPromise = (async () => {
          try {
            await store.init();
            db = store.data;
            if (adminEmail && adminPassword.length >= 12 && !db.users.some(u => u.email === adminEmail)) {
              db.users.push({ id: id(), name: 'Instructor', email: adminEmail, password: hashPassword(adminPassword), role: 'admin', joinedAt: new Date().toISOString() });
              await save();
            }
          } catch (err) {
            readyPromise = null;
            throw err;
          }
        })();
      }
      await readyPromise;
    }
    if (store.sync && readyPromise) {
      await store.sync();
      db = store.data;
    }
  }

  const attempts = new Map();
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const fail = (res, status, message) => json(res, status, { error: message });
  const cookie = req => {
    const match = (req.headers.cookie || '').match(/(?:^|;\s*)unlos_session=([^;]+)/);
    return match ? match[1] : '';
  };
  const currentUser = req => {
    const token = cookie(req);
    if (!token) return null;
    const session = db.sessions.find(s => s.tokenHash === sha(token) && s.expiresAt > Date.now());
    return session ? db.users.find(u => u.id === session.userId) || null : null;
  };
  const profile = u => u ? { id: u.id, name: u.name, email: u.email, role: u.role, joinedAt: u.joinedAt } : null;
  const authenticated = (res, user) => !!user || (fail(res, 401, 'Please sign in to continue.'), false);
  const instructor = (res, user) => authenticated(res, user) && (user.role === 'admin' || (fail(res, 403, 'Instructor access required.'), false));

  const makeSession = async (res, user, req) => {
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions.push({ userId: user.id, tokenHash: sha(token), expiresAt: Date.now() + ttl });
    await save();
    const isHttps = process.env.NODE_ENV === 'production' || (req && req.headers['x-forwarded-proto'] === 'https');
    const secure = isHttps ? '; Secure' : '';
    res.setHeader('Set-Cookie', `unlos_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl / 1000}${secure}`);
  };

  /**
   * Universal body parser:
   * Handles pre-parsed req.body from Vercel serverless environment,
   * buffers/strings, and streaming req for standalone Node.js.
   */
  async function body(req) {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
      if (typeof req.body === 'string') {
        if (req.body.length > 64 * 1024) { const err = new Error('Request is too large.'); err.status = 413; throw err; }
        try { return JSON.parse(req.body || '{}'); }
        catch { const err = new Error('Invalid JSON body.'); err.status = 400; throw err; }
      }
      if (Buffer.isBuffer(req.body)) {
        if (req.body.length > 64 * 1024) { const err = new Error('Request is too large.'); err.status = 413; throw err; }
        try { return JSON.parse(req.body.toString('utf8') || '{}'); }
        catch { const err = new Error('Invalid JSON body.'); err.status = 400; throw err; }
      }
    }

    const pieces = []; let count = 0;
    for await (const part of req) {
      count += part.length;
      if (count > 64 * 1024) { const err = new Error('Request is too large.'); err.status = 413; throw err; }
      pieces.push(part);
    }
    try { return JSON.parse(Buffer.concat(pieces).toString('utf8') || '{}'); }
    catch { const err = new Error('Invalid JSON body.'); err.status = 400; throw err; }
  }

  async function api(req, res, pathname) {
    const user = currentUser(req), method = req.method;
    if (pathname === '/api/health' || pathname === '/api' || pathname === '/api/') return method === 'GET'
      ? json(res, 200, { ok: true, service: 'UNLOS', version: '2.0.0', storage: store.type || 'sqlite' })
      : fail(res, 405, 'Method not allowed.');

    if (pathname === '/api/me' && method === 'GET') return json(res, 200, { user: profile(user) });

    if (pathname === '/api/auth/register' && method === 'POST') {
      const data = await body(req);
      const name = safeText(data.name, 80), email = cleanEmail(data.email), password = data.password;
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 200) {
        return fail(res, 400, 'Enter a name, valid email and password of at least 8 characters.');
      }
      if (db.users.some(u => u.email === email)) return fail(res, 409, 'An account already exists with this email.');
      const fresh = { id: id(), name, email, password: hashPassword(password), role: 'student', joinedAt: new Date().toISOString() };
      db.users.push(fresh);
      await makeSession(res, fresh, req);
      return json(res, 201, { user: profile(fresh) });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'unknown';
      const now = Date.now();
      const state = attempts.get(ip) || { count: 0, start: now };
      if (now - state.start > 15 * 60 * 1000) { state.count = 0; state.start = now; }
      if (state.count >= 15) return fail(res, 429, 'Too many attempts. Please try again later.');

      const data = await body(req); const email = cleanEmail(data.email);
      const match = db.users.find(u => u.email === email);
      if (!match || typeof data.password !== 'string' || !verifyPassword(data.password, match.password)) {
        state.count++; attempts.set(ip, state);
        return fail(res, 401, 'Invalid email or password.');
      }
      attempts.delete(ip);
      await makeSession(res, match, req);
      return json(res, 200, { user: profile(match) });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      db.sessions = db.sessions.filter(s => s.tokenHash !== sha(cookie(req)));
      await save();
      res.setHeader('Set-Cookie', 'unlos_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/courses' && method === 'GET') {
      return json(res, 200, { courses: db.courses.filter(c => c.published !== false || user?.role === 'admin').map(c => publicCourse(c, user, db)) });
    }

    const single = pathname.match(/^\/api\/courses\/([a-z0-9-]+)$/);
    if (single && method === 'GET') {
      const course = db.courses.find(c => c.slug === single[1]);
      return course && (course.published !== false || user?.role === 'admin') ? json(res, 200, { course: publicCourse(course, user, db, true) }) : fail(res, 404, 'Course not found.');
    }

    const enroll = pathname.match(/^\/api\/courses\/([a-z0-9-]+)\/enroll$/);
    if (enroll && method === 'POST') {
      if (!authenticated(res, user)) return;
      const course = db.courses.find(c => c.slug === enroll[1]);
      if (!course || course.published === false) return fail(res, 404, 'Course not found.');
      if (!db.enrollments.some(e => e.userId === user.id && e.courseId === course.id)) {
        db.enrollments.push({ userId: user.id, courseId: course.id, joinedAt: new Date().toISOString() });
        await save();
      }
      return json(res, 200, { course: publicCourse(course, user, db, true) });
    }

    if (pathname === '/api/dashboard' && method === 'GET') {
      if (!authenticated(res, user)) return;
      const courses = db.courses.filter(c => c.published !== false && db.enrollments.some(e => e.userId === user.id && e.courseId === c.id)).map(c => publicCourse(c, user, db));
      const completedLessons = db.completions.filter(c => c.userId === user.id).length;
      const passedQuizzes = new Set(db.quizAttempts.filter(q => q.userId === user.id && q.correct).map(q => q.lessonId)).size;
      return json(res, 200, { courses, stats: { enrolledCourses: courses.length, completedLessons, passedQuizzes, finishedCourses: courses.filter(c => c.lessonCount && c.progress === 100).length }, user: profile(user) });
    }

    const complete = pathname.match(/^\/api\/lessons\/([a-zA-Z0-9-]+)\/complete$/);
    if (complete && method === 'POST') {
      if (!authenticated(res, user)) return;
      const course = db.courses.find(c => c.lessons.some(l => l.id === complete[1]));
      if (!course) return fail(res, 404, 'Lesson not found.');
      if (!db.enrollments.some(e => e.userId === user.id && e.courseId === course.id)) return fail(res, 403, 'Enroll in the course first.');
      if (!db.completions.some(c => c.userId === user.id && c.lessonId === complete[1])) {
        db.completions.push({ userId: user.id, lessonId: complete[1], completedAt: new Date().toISOString() });
        await save();
      }
      return json(res, 200, { course: publicCourse(course, user, db, true) });
    }

    const quizRoute = pathname.match(/^\/api\/lessons\/([a-zA-Z0-9-]+)\/quiz$/);
    if (quizRoute && method === 'POST') {
      if (!authenticated(res, user)) return;
      const course = db.courses.find(c => c.lessons.some(l => l.id === quizRoute[1]));
      if (!course) return fail(res, 404, 'Lesson not found.');
      if (!db.enrollments.some(e => e.userId === user.id && e.courseId === course.id)) return fail(res, 403, 'Enroll in the course first.');
      const lesson = course.lessons.find(l => l.id === quizRoute[1]);
      if (!lesson.quiz) return fail(res, 404, 'Quiz not found.');
      const data = await body(req);
      if (!Number.isInteger(data.answer) || data.answer < 0 || data.answer >= lesson.quiz.options.length) return fail(res, 400, 'Select a valid answer.');
      const correct = data.answer === lesson.quiz.answer;
      db.quizAttempts.push({ userId: user.id, lessonId: lesson.id, correct, attemptedAt: new Date().toISOString() });
      await save();
      return json(res, 200, { correct, answer: lesson.quiz.answer, explanation: lesson.quiz.explanation });
    }

    if (pathname === '/api/admin/courses' && method === 'POST') {
      if (!instructor(res, user)) return;
      const data = await body(req), title = safeText(data.title, 100), description = safeText(data.description, 400);
      const category = safeText(data.category, 40) || 'General', level = safeText(data.level, 30) || 'Beginner';
      const baseSlug = slugify(title);
      if (title.length < 4 || description.length < 20 || !baseSlug) return fail(res, 400, 'Give the course a title and a description of at least 20 characters.');
      let slug = baseSlug, n = 2;
      while (db.courses.some(c => c.slug === slug)) slug = `${baseSlug}-${n++}`;
      const course = { id: id(), slug, title, description, category, level, published: false, duration: 'Self-paced', icon: 'book', accent: ['violet', 'blue', 'peach', 'mint'][db.courses.length % 4], outcomes: [], lessons: [] };
      db.courses.push(course);
      await save();
      return json(res, 201, { course: publicCourse(course, user, db, true) });
    }

    const addLesson = pathname.match(/^\/api\/admin\/courses\/([a-z0-9-]+)\/lessons$/);
    if (addLesson && method === 'POST') {
      if (!instructor(res, user)) return;
      const course = db.courses.find(c => c.slug === addLesson[1]);
      if (!course) return fail(res, 404, 'Course not found.');
      const data = await body(req), title = safeText(data.title, 100), content = safeText(data.content, 8000), lead = safeText(data.lead, 250);
      if (title.length < 3 || content.length < 30) return fail(res, 400, 'The lesson needs a title and at least 30 characters of content.');
      const entry = { id: id(), title, minutes: Math.min(180, Math.max(1, Number(data.minutes) || 15)), lead: lead || 'Read the lesson and mark it complete.', sections: [{ heading: title, body: content, bullets: [] }], quiz: data.quiz ? validatedQuiz(data.quiz) : null };
      if (data.quiz && !entry.quiz) return fail(res, 400, 'Provide a question, 2 to 6 options and a valid answer index.');
      course.lessons.push(entry);
      await save();
      return json(res, 201, { course: publicCourse(course, user, db, true) });
    }

    if (pathname === '/api/account/profile' && method === 'PATCH') {
      if (!authenticated(res, user)) return;
      const data = await body(req);
      const name = safeText(data.name, 80);
      if (name.length < 2) return fail(res, 400, 'Name must contain at least two characters.');
      user.name = name;
      await save();
      return json(res, 200, { user: profile(user) });
    }

    if (pathname === '/api/account/password' && method === 'POST') {
      if (!authenticated(res, user)) return;
      const data = await body(req);
      if (typeof data.currentPassword !== 'string' || !verifyPassword(data.currentPassword, user.password)) return fail(res, 403, 'Current password is incorrect.');
      if (typeof data.newPassword !== 'string' || data.newPassword.length < 10 || data.newPassword.length > 200) return fail(res, 400, 'New password must be 10 to 200 characters.');
      if (data.currentPassword === data.newPassword) return fail(res, 400, 'Choose a different password.');
      user.password = hashPassword(data.newPassword);
      db.sessions = db.sessions.filter(session => session.userId !== user.id || session.tokenHash === sha(cookie(req)));
      await save();
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/admin/overview' && method === 'GET') {
      if (!instructor(res, user)) return;
      return json(res, 200, { stats: {
        students: db.users.filter(u => u.role === 'student').length,
        courses: db.courses.length,
        publishedCourses: db.courses.filter(c => c.published !== false).length,
        enrollments: db.enrollments.length,
        completedLessons: db.completions.length,
        quizAttempts: db.quizAttempts.length
      } });
    }

    const manageCourse = pathname.match(/^\/api\/admin\/courses\/([a-z0-9-]+)$/);
    if (manageCourse && (method === 'PATCH' || method === 'DELETE')) {
      if (!instructor(res, user)) return;
      const course = db.courses.find(c => c.slug === manageCourse[1]);
      if (!course) return fail(res, 404, 'Course not found.');
      if (method === 'DELETE') {
        const lessonIds = new Set(course.lessons.map(l => l.id));
        db.courses = db.courses.filter(c => c.id !== course.id);
        db.enrollments = db.enrollments.filter(e => e.courseId !== course.id);
        db.completions = db.completions.filter(c => !lessonIds.has(c.lessonId));
        db.quizAttempts = db.quizAttempts.filter(a => !lessonIds.has(a.lessonId));
        await save();
        return json(res, 200, { ok: true });
      }
      const data = await body(req);
      if (data.title !== undefined) {
        const title = safeText(data.title, 100);
        if (title.length < 4) return fail(res, 400, 'Course title must contain at least four characters.');
        course.title = title;
      }
      if (data.description !== undefined) {
        const description = safeText(data.description, 400);
        if (description.length < 20) return fail(res, 400, 'Description must contain at least 20 characters.');
        course.description = description;
      }
      if (data.category !== undefined) course.category = safeText(data.category, 40) || 'General';
      if (data.level !== undefined) course.level = safeText(data.level, 30) || 'Beginner';
      if (data.duration !== undefined) course.duration = safeText(data.duration, 40) || 'Self-paced';
      if (data.outcomes !== undefined) {
        if (!Array.isArray(data.outcomes) || data.outcomes.length > 10) return fail(res, 400, 'Outcomes must be a list of no more than ten items.');
        course.outcomes = data.outcomes.map(o => safeText(o, 160)).filter(Boolean);
      }
      if (data.published !== undefined) {
        if (typeof data.published !== 'boolean') return fail(res, 400, 'Published must be true or false.');
        if (data.published && !course.lessons.length) return fail(res, 400, 'Add at least one lesson before publishing.');
        course.published = data.published;
      }
      await save();
      return json(res, 200, { course: publicCourse(course, user, db, true) });
    }

    const manageLesson = pathname.match(/^\/api\/admin\/lessons\/([a-zA-Z0-9-]+)$/);
    if (manageLesson && (method === 'PATCH' || method === 'DELETE')) {
      if (!instructor(res, user)) return;
      const course = db.courses.find(c => c.lessons.some(l => l.id === manageLesson[1]));
      if (!course) return fail(res, 404, 'Lesson not found.');
      const lesson = course.lessons.find(l => l.id === manageLesson[1]);
      if (method === 'DELETE') {
        course.lessons = course.lessons.filter(l => l.id !== lesson.id);
        db.completions = db.completions.filter(c => c.lessonId !== lesson.id);
        db.quizAttempts = db.quizAttempts.filter(a => a.lessonId !== lesson.id);
        if (!course.lessons.length) course.published = false;
        await save();
        return json(res, 200, { ok: true });
      }
      const data = await body(req);
      if (data.title !== undefined) {
        const title = safeText(data.title, 100);
        if (title.length < 3) return fail(res, 400, 'Lesson title must contain at least three characters.');
        lesson.title = title;
      }
      if (data.lead !== undefined) lesson.lead = safeText(data.lead, 250);
      if (data.minutes !== undefined) {
        const n = Number(data.minutes);
        if (!Number.isInteger(n) || n < 1 || n > 180) return fail(res, 400, 'Reading time must be between 1 and 180 minutes.');
        lesson.minutes = n;
      }
      if (data.content !== undefined) {
        const content = safeText(data.content, 8000);
        if (content.length < 30) return fail(res, 400, 'Lesson content must contain at least 30 characters.');
        lesson.sections = [{ heading: lesson.title, body: content, bullets: [] }];
      }
      if (data.quiz !== undefined) {
        if (data.quiz === null) lesson.quiz = null;
        else {
          const quiz = validatedQuiz(data.quiz);
          if (!quiz) return fail(res, 400, 'Quiz must include a question, answer options and correct index.');
          lesson.quiz = quiz;
          db.quizAttempts = db.quizAttempts.filter(a => a.lessonId !== lesson.id);
        }
      }
      await save();
      return json(res, 200, { course: publicCourse(course, user, db, true) });
    }

    return fail(res, 404, 'API route not found.');
  }

  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");

    // Support Vercel rewrite paths or standard URLs
    const matchedPath = req.headers['x-matched-path'];
    const rawUrl = (matchedPath && matchedPath.startsWith('/api/')) ? matchedPath : (req.url || '/');
    const pathname = new URL(rawUrl, 'http://localhost').pathname;

    try {
      // Ensure database is connected and initialized (e.g. for Turso or async store)
      await ensureReady();

      if (pathname.startsWith('/api/') || pathname === '/api') {
        if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return fail(res, 405, 'Method not allowed.');
        if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
          if (req.headers['sec-fetch-site'] === 'cross-site') return fail(res, 403, 'Cross-origin request rejected.');
          const origin = req.headers.origin;
          if (origin) {
            let valid = false;
            try {
              const originHost = new URL(origin).host;
              const reqHost = req.headers.host;
              const forwardedHost = req.headers['x-forwarded-host'];
              const firstForwardedHost = typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : null;
              valid = originHost === reqHost || (firstForwardedHost && originHost === firstForwardedHost);
            } catch { /* invalid origin */ }
            if (!valid) return fail(res, 403, 'Cross-origin request rejected.');
          }
          if (req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json')) return fail(res, 415, 'Use application/json.');
        }
        return await api(req, res, pathname);
      }

      if (!['GET', 'HEAD'].includes(req.method)) return fail(res, 405, 'Method not allowed.');
      const target = pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = path.resolve(PUBLIC_DIR, target);
      if (file !== path.join(PUBLIC_DIR, 'index.html') && !file.startsWith(PUBLIC_DIR + path.sep)) return fail(res, 403, 'Access denied.');
      const extension = path.extname(file);
      if (!MIME[extension]) return fail(res, 404, 'Not found.');
      let stat;
      try { stat = fs.statSync(file); } catch { return fail(res, 404, 'Not found.'); }
      if (!stat.isFile()) return fail(res, 404, 'Not found.');
      res.writeHead(200, { 'Content-Type': MIME[extension], 'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      if (!res.headersSent) return fail(res, e.status || 500, e.status ? e.message : 'Unexpected server error.');
      res.end();
    }
  }

  const server = http.createServer(handle);
  server.handle = handle;
  server.on('close', () => store.close());
  return server;
}

function createHandler(opts = {}) {
  const server = createApp(opts);
  return server.handle;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '0.0.0.0', () => console.log(`UNLOS running at http://localhost:${port}`));
}

let defaultHandler = null;
function serverlessHandler(req, res) {
  if (!defaultHandler) {
    defaultHandler = createHandler();
  }
  return defaultHandler(req, res);
}

serverlessHandler.createApp = createApp;
serverlessHandler.createHandler = createHandler;

module.exports = serverlessHandler;
module.exports.createApp = createApp;
module.exports.createHandler = createHandler;
module.exports.default = serverlessHandler;
