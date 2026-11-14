'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

test('SQLite persistence, draft publishing, instructor editing and learner account security', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'unlos-v2-'));
  const dbFile = path.join(folder, 'unlos.sqlite');
  const start = async () => {
    const server = createApp({ dbFile, adminEmail: 'teacher@example.com', adminPassword: 'unique-admin-secret-password' });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    return { server, base: 'http://127.0.0.1:' + server.address().port };
  };
  let { server, base } = await start();
  t.after(async () => { if (server.listening) await new Promise(ok => server.close(ok)); fs.rmSync(folder, { recursive: true, force: true }); });
  const jars = { student: '', admin: '' };
  const req = async (who, uri, method = 'GET', payload) => {
    const res = await fetch(base + uri, { method, headers: { ...(payload ? { 'content-type': 'application/json' } : {}), ...(jars[who] ? { cookie: jars[who] } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) jars[who] = set.split(';')[0];
    return { status: res.status, json: await res.json() };
  };
  assert.equal((await req('student','/api/auth/register','POST',{ name:'Test Learner',email:'learner@example.com',password:'new-student-password' })).status,201);
  assert.equal((await req('student','/api/admin/overview')).status,403);
  assert.equal((await req('admin','/api/auth/login','POST',{email:'teacher@example.com',password:'unique-admin-secret-password'})).status,200);
  assert.equal((await req('admin','/api/admin/overview')).json.stats.courses,4);
  const made = await req('admin','/api/admin/courses','POST',{title:'Intro to Networks',description:'A concise introduction to network engineering.'});
  assert.equal(made.status,201);
  const slug = made.json.course.slug;
  assert.equal(made.json.course.published,false);
  assert.equal((await req('student','/api/courses')).json.courses.length,4);
  assert.equal((await req('student','/api/courses/'+slug)).status,404);
  assert.equal((await req('admin','/api/admin/courses/'+slug,'PATCH',{published:true})).status,400);
  const created = await req('admin','/api/admin/courses/'+slug+'/lessons','POST',{
    title:'Routing basics', content:'Routing selects a path across connected networks using routing tables and forwarding rules.',
    quiz:{question:'What determines where a packet travels?',options:['Routing table','Wallpaper'],answer:0,explanation:'Routers use forwarding tables.'}
  });
  assert.equal(created.status,201);
  assert.equal((await req('admin','/api/admin/courses/'+slug,'PATCH',{published:true})).status,200);
  assert.equal((await req('student','/api/courses')).json.courses.length,5);
  const course = (await req('student','/api/courses/'+slug)).json.course;
  assert.equal('answer' in course.lessons[0].quiz,false);
  assert.equal((await req('student','/api/courses/'+slug+'/enroll','POST')).status,200);
  assert.equal((await req('student','/api/lessons/'+course.lessons[0].id+'/quiz','POST',{answer:0})).json.correct,true);
  assert.equal((await req('student','/api/account/profile','PATCH',{name:'Updated Learner'})).json.user.name,'Updated Learner');
  assert.equal((await req('student','/api/account/password','POST',{currentPassword:'wrong',newPassword:'another-great-password'})).status,403);
  assert.equal((await req('student','/api/account/password','POST',{currentPassword:'new-student-password',newPassword:'another-great-password'})).status,200);
  await new Promise(ok=>server.close(ok));
  ({ server, base } = await start());
  assert.equal((await req('student','/api/me')).json.user.name,'Updated Learner');
  assert.equal((await req('student','/api/dashboard')).json.stats.enrolledCourses,1);
  assert.equal((await req('student','/api/dashboard')).json.stats.passedQuizzes,1);
  assert.equal((await req('student','/api/auth/logout','POST')).status,200);
  assert.equal((await req('student','/api/auth/login','POST',{email:'learner@example.com',password:'new-student-password'})).status,401);
  assert.equal((await req('student','/api/auth/login','POST',{email:'learner@example.com',password:'another-great-password'})).status,200);
  assert.equal((await req('admin','/api/admin/lessons/'+course.lessons[0].id,'PATCH',{title:'Routing and forwarding'})).status,200);
  assert.equal((await req('admin','/api/admin/courses/'+slug,'PATCH',{published:false})).status,200);
  assert.equal((await req('student','/api/courses/'+slug)).status,404);
  assert.equal((await req('admin','/api/admin/courses/'+slug,'DELETE')).status,200);
  assert.equal((await req('admin','/api/admin/overview')).json.stats.courses,4);
});
