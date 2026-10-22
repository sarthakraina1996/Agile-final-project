import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
export const dateKey = (delta = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};
export function openDatabase(path, demo = true) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec(`CREATE TABLE IF NOT EXISTS employees(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, title TEXT, division TEXT, department TEXT, location TEXT, employment TEXT, joined TEXT, salary INTEGER, manager TEXT, status TEXT DEFAULT 'Active');
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, employeeId TEXT, email TEXT UNIQUE, hash TEXT, role TEXT, FOREIGN KEY(employeeId) REFERENCES employees(id));
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER,FOREIGN KEY(userId) REFERENCES users(id));
 CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,employeeId TEXT,data TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);`);
  const addRecord = db.prepare('INSERT INTO records(id,kind,employeeId,data) VALUES(?,?,?,?)');
  if (!db.prepare('SELECT id FROM settings').get())
    db.prepare('INSERT INTO settings VALUES(1,?)').run(
      JSON.stringify({
        company: 'BrainADZ',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        leaveDays: 24,
        workWeek: 'Monday – Friday',
      }),
    );
  if (demo && !db.prepare('SELECT id FROM employees LIMIT 1').get()) {
    const people = [
      [
        'BA001',
        'Ananya Sharma',
        'ananya@brainadz.com',
        'Head of People & Culture',
        'Marketing',
        'People & Culture',
        'Mumbai',
        'Full-time',
        '2022-03-14',
        125000,
        'Leadership',
      ],
      [
        'BA002',
        'Rohan Mehta',
        'rohan@brainadz.com',
        'Creative Director',
        'Marketing',
        'Creative & Design',
        'Mumbai',
        'Full-time',
        '2023-01-09',
        110000,
        'Ananya Sharma',
      ],
      [
        'BA003',
        'Priya Nair',
        'priya@brainadz.com',
        'Senior Exhibition Designer',
        'Exhibits',
        'Design & Production',
        'Delhi',
        'Full-time',
        '2023-04-12',
        82000,
        'Ananya Sharma',
      ],
      [
        'BA004',
        'Arjun Kapoor',
        'arjun@brainadz.com',
        'Solutions Engineer',
        'Live',
        'Technology',
        'Dubai',
        'Full-time',
        '2024-02-19',
        95000,
        'Ananya Sharma',
      ],
      [
        'BA005',
        'Sneha Patel',
        'sneha@brainadz.com',
        'Account Manager',
        'Marketing',
        'Client Services',
        'Mumbai',
        'Full-time',
        '2024-06-03',
        68000,
        'Rohan Mehta',
      ],
      [
        'BA006',
        'Kabir Singh',
        'kabir@brainadz.com',
        'Production Manager',
        'Exhibits',
        'Design & Production',
        'Delhi',
        'Full-time',
        '2023-09-11',
        76000,
        'Priya Nair',
      ],
      [
        'BA007',
        'Ishita Rao',
        'ishita@brainadz.com',
        'Digital Experience Designer',
        'Live',
        'Creative & Design',
        'Mumbai',
        'Full-time',
        '2024-08-26',
        72000,
        'Arjun Kapoor',
      ],
      [
        'BA008',
        'Vikram Joshi',
        'vikram@brainadz.com',
        'Finance Executive',
        'Marketing',
        'Finance',
        'Mumbai',
        'Full-time',
        '2023-11-06',
        62000,
        'Ananya Sharma',
      ],
      [
        'BA009',
        'Aisha Khan',
        'aisha@brainadz.com',
        'Brand Strategist',
        'Marketing',
        'Strategy',
        'Dubai',
        'Full-time',
        '2025-01-13',
        88000,
        'Rohan Mehta',
      ],
      [
        'BA010',
        'Dev Malhotra',
        'dev@brainadz.com',
        'Project Coordinator',
        'Exhibits',
        'Operations',
        'Delhi',
        'Full-time',
        dateKey(-10),
        52000,
        'Kabir Singh',
      ],
      [
        'BA011',
        'Meera Iyer',
        'meera@brainadz.com',
        'Content Specialist',
        'Marketing',
        'Creative & Design',
        'Mumbai',
        'Full-time',
        dateKey(-20),
        58000,
        'Rohan Mehta',
      ],
      [
        'BA012',
        'Aditya Shah',
        'aditya@brainadz.com',
        'Software Developer',
        'Live',
        'Technology',
        'Mumbai',
        'Full-time',
        '2025-04-07',
        84000,
        'Arjun Kapoor',
      ],
    ];
    const insert = db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
    people.forEach((p) => insert.run(...p, 'Active'));
    for (const [id, employeeId, email, role] of [
      ['u1', 'BA001', 'admin@brainadz.com', 'admin'],
      ['u2', 'BA001', 'hr@brainadz.com', 'hr'],
      ['u3', 'BA002', 'employee@brainadz.com', 'employee'],
    ])
      db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
        id,
        employeeId,
        email,
        hashPassword('Brainadz@123'),
        role,
      );
    for (const [i, p] of people.entries())
      if (i !== 4 && i !== 8)
        addRecord.run(
          `at${i}`,
          'attendance',
          p[0],
          JSON.stringify({
            date: dateKey(),
            checkIn: i % 3 ? '09:12' : '09:00',
            checkOut: null,
            status: i % 4 ? 'Present' : 'Remote',
          }),
        );
    [
      ['lv1', 'BA005', 'Annual leave', dateKey(2), dateKey(3), 'Family time', 'Pending'],
      ['lv2', 'BA003', 'Sick leave', dateKey(), dateKey(), 'Recovery and rest', 'Pending'],
      ['lv3', 'BA009', 'Annual leave', dateKey(), dateKey(2), 'Personal travel', 'Approved'],
      [
        'lv4',
        'BA002',
        'Annual leave',
        dateKey(-12),
        dateKey(-11),
        'Personal commitments',
        'Approved',
      ],
    ].forEach(([id, emp, type, start, end, reason, status]) =>
      addRecord.run(id, 'leave', emp, JSON.stringify({ type, start, end, reason, status })),
    );
    [
      ['j1', 'Senior Graphic Designer', 'Marketing', 'Mumbai', 'Creative & Design', 12],
      ['j2', 'Exhibition Project Manager', 'Exhibits', 'Delhi', 'Operations', 8],
      ['j3', 'Frontend Developer', 'Live', 'Mumbai', 'Technology', 16],
      ['j4', 'Client Servicing Executive', 'Marketing', 'Dubai', 'Client Services', 6],
    ].forEach(([id, title, division, location, department, applicants]) =>
      addRecord.run(
        id,
        'job',
        null,
        JSON.stringify({
          title,
          division,
          location,
          department,
          applicants,
          status: 'Open',
          employment: 'Full-time',
        }),
      ),
    );
    [
      ['c1', 'Tanya Verma', 'Senior Graphic Designer', 'Marketing', 'Interview'],
      ['c2', 'Nikhil Sethi', 'Frontend Developer', 'Live', 'Screening'],
      ['c3', 'Sara Thomas', 'Exhibition Project Manager', 'Exhibits', 'Offer'],
    ].forEach(([id, name, position, division, stage]) =>
      addRecord.run(
        id,
        'candidate',
        null,
        JSON.stringify({
          name,
          position,
          division,
          stage,
          email: name.toLowerCase().replace(' ', '.') + '@example.com',
        }),
      ),
    );
    [
      ['ev1', 'Brand & beyond: team town hall', dateKey(3), '15:00', 'All divisions', 'Town hall'],
      ['ev2', 'Design thinking workshop', dateKey(5), '11:00', 'Marketing', 'Learning'],
      ['ev3', 'New joiner welcome', dateKey(7), '10:00', 'All divisions', 'Onboarding'],
    ].forEach(([id, title, date, time, division, type]) =>
      addRecord.run(id, 'event', null, JSON.stringify({ title, date, time, division, type })),
    );
    [
      ['ex1', 'BA006', 'Site visit · Delhi', 'Travel', 4800, 'Pending'],
      ['ex2', 'BA002', 'Creative software subscription', 'Software', 2499, 'Pending'],
      ['ex3', 'BA004', 'Client meeting', 'Meals', 1850, 'Approved'],
    ].forEach(([id, emp, title, category, amount, status]) =>
      addRecord.run(
        id,
        'expense',
        emp,
        JSON.stringify({ title, category, amount, status, date: dateKey(-2) }),
      ),
    );
    [
      ['pf1', 'BA002', 'Launch the new brand playbook', 75, 'Q4 2026'],
      ['pf2', 'BA003', 'Deliver sustainable exhibition concepts', 60, 'Q4 2026'],
      ['pf3', 'BA004', 'Improve digital signage uptime', 92, 'Q4 2026'],
    ].forEach(([id, emp, title, progress, cycle]) =>
      addRecord.run(
        id,
        'goal',
        emp,
        JSON.stringify({ title, progress, cycle, status: 'On track' }),
      ),
    );
    [
      ['as1', 'BA002', 'MacBook Pro 14″', 'Laptop', 'BA-MBP-002', 'Assigned'],
      ['as2', 'BA003', 'Dell UltraSharp 27″', 'Monitor', 'BA-MON-003', 'Assigned'],
      ['as3', 'BA004', 'iPad Air', 'Tablet', 'BA-IPD-004', 'Assigned'],
    ].forEach(([id, emp, name, category, serial, status]) =>
      addRecord.run(id, 'asset', emp, JSON.stringify({ name, category, serial, status })),
    );
    [
      ['ob1', 'BA010', 'Welcome to BrainADZ', 'Onboarding', 40],
      ['ob2', 'BA011', 'First 30 days', 'Onboarding', 80],
    ].forEach(([id, emp, title, type, progress]) =>
      addRecord.run(
        id,
        'journey',
        emp,
        JSON.stringify({
          title,
          type,
          progress,
          tasks: [
            { title: 'Complete personal details', done: true },
            { title: 'Submit identity documents', done: true },
            { title: 'Collect equipment', done: progress === 80 },
            { title: 'Meet your team', done: progress === 80 },
            { title: 'Complete policy orientation', done: false },
          ],
        }),
      ),
    );
    [
      [
        'an1',
        'A little recognition goes a long way ✨',
        'A big shoutout to our Exhibits team for a brilliant week of bringing bold ideas to life. Proud of what we create together.',
        'People & Culture',
        'Celebrating our people',
      ],
      [
        'an2',
        'Your wellbeing comes first',
        'Our employee assistance program is available to everyone across Marketing, Exhibits and Live. Contact the People team for a confidential conversation.',
        'People & Culture',
        'Wellbeing',
      ],
    ].forEach(([id, title, body, author, tag]) =>
      addRecord.run(
        id,
        'announcement',
        null,
        JSON.stringify({ title, body, author, tag, date: dateKey(-1) }),
      ),
    );
    [
      [
        'd1',
        'Employee handbook',
        'Policy',
        'An introduction to BrainADZ, our values, respectful conduct, working hours and employee support. Contact People & Culture for policy questions.',
      ],
      [
        'd2',
        'Leave & attendance policy',
        'Policy',
        'Employees have 24 days of annual leave per calendar year in this demonstration policy. Submit a leave request for HR approval. Local employment rules and your contract take precedence.',
      ],
      [
        'd3',
        'Information security guidelines',
        'Policy',
        'Use unique passwords and approved company devices. Never share credentials. Report suspected incidents to the IT team immediately.',
      ],
      [
        'd4',
        'Expense reimbursement guide',
        'Finance',
        'Submit business expenses with a description, amount and category. Retain your receipts and contact Finance for the official reimbursement process.',
      ],
    ].forEach(([id, title, category, content]) =>
      addRecord.run(
        id,
        'document',
        null,
        JSON.stringify({ title, category, content, version: '1.0', date: dateKey(-30) }),
      ),
    );
    db.prepare('INSERT INTO audit(actor,action) VALUES(?,?)').run(
      'System',
      'Demonstration workspace created',
    );
  }
  if (demo && !db.prepare("SELECT id FROM records WHERE id='course1'").get()) {
    [
      [
        'course1',
        'Designing for a sustainable future',
        'Exhibits',
        '45 min',
        'Build sustainability into every exhibition concept.',
        'Read the sustainability principles: reduce material use, design reusable structures, select responsible suppliers, and plan for end-of-life recovery. Write down three ways to reduce waste in your next project.',
      ],
      [
        'course2',
        'Ideas that move brands',
        'Marketing',
        '30 min',
        'Find the human insight behind a compelling brand story.',
        'Start with your audience. Identify a real need, define a clear brand promise, and express it consistently across channels. Draft a one-sentence proposition for a brand you admire.',
      ],
      [
        'course3',
        'Digital experiences, thoughtfully built',
        'Live',
        '40 min',
        'Create accessible, reliable experiences on every screen.',
        'Use readable typography, keyboard navigation, meaningful feedback and accessible contrast. Plan for offline states and test with real users. Review one experience and identify an accessibility improvement.',
      ],
      [
        'course4',
        'A respectful, inclusive workplace',
        'All divisions',
        '20 min',
        'Help every colleague feel safe, valued and heard.',
        'Respect boundaries and different perspectives. Challenge bias, keep sensitive information confidential, and speak to HR about concerns. This learning note is introductory; company-approved compliance training must be completed separately.',
      ],
    ].forEach(([id, title, division, duration, description, content]) =>
      addRecord.run(
        id,
        'course',
        null,
        JSON.stringify({
          title,
          division,
          duration,
          description,
          content,
          category: 'Self-paced learning',
        }),
      ),
    );
    [
      [
        'benefit1',
        'Health & wellbeing',
        'Care for you, and peace of mind.',
        'Explore the sample group health and wellbeing plan with the People team. Eligibility and coverage must be confirmed with your insurer.',
        'Wellbeing',
      ],
      [
        'benefit2',
        'Learning & development',
        'Stay curious. Keep growing.',
        'Request access to our sample professional development allowance. HR will verify eligibility and budget before approval.',
        'Growth',
      ],
      [
        'benefit3',
        'Flexible working',
        'Great work, wherever you are.',
        'Request a conversation about flexible working arrangements. Approval depends on your role, local policy and team needs.',
        'Work-life balance',
      ],
    ].forEach(([id, title, subtitle, description, category]) =>
      addRecord.run(
        id,
        'benefit',
        null,
        JSON.stringify({ title, subtitle, description, category }),
      ),
    );
    addRecord.run(
      'ticket1',
      'ticket',
      'BA002',
      JSON.stringify({
        title: 'Update emergency contact details',
        category: 'Employee records',
        priority: 'Normal',
        description: 'Please help me update my emergency contact in my employee record.',
        status: 'Open',
        date: dateKey(),
        response: '',
      }),
    );
  }
  return db;
}
