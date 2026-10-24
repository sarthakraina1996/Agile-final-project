import { hashPassword } from '../database.js';
import { today, addDays } from './utils.js';
export function seedDemo(db) {
  const now = today();
  db.exec('BEGIN IMMEDIATE');
  try {
    const props = [
      ['p1', 'GPR', 'Grand Palace Resort', 'Udaipur'],
      ['p2', 'OCE', 'Ocean Crest Hotel', 'Goa'],
      ['p3', 'CTC', 'City Central Suites', 'Mumbai'],
      ['p4', 'MTR', 'Mountain Retreat', 'Manali'],
      ['p5', 'APT', 'Airport Grand', 'New Delhi'],
    ];
    for (const [id, code, name, city] of props)
      db.prepare(
        'INSERT INTO properties(id,code,name,legal_entity,city,country,currency,timezone) VALUES(?,?,?,?,?,?,?,?)',
      ).run(id, code, name, name + ' Hospitality Pvt. Ltd.', city, 'India', 'INR', 'Asia/Kolkata');
    for (const [id] of props) {
      db.prepare('INSERT INTO rate_plans VALUES(?,?,?,?,?,?)').run(
        id + 'bar',
        id,
        'Best available rate',
        10000,
        1,
        0,
      );
      db.prepare('INSERT INTO rate_plans VALUES(?,?,?,?,?,?)').run(
        id + 'breakfast',
        id,
        'Bed & breakfast',
        11200,
        1,
        1,
      );
    }
    const amenities = [
      'Wi-Fi',
      'Smart TV',
      'Air conditioning',
      'Minibar',
      'In-room safe',
      'Coffee machine',
      'Workspace',
      'Hair dryer',
      'Bath amenities',
    ];
    const roomInsert = db.prepare(
      'INSERT INTO rooms(id,property_id,type_id,building_id,floor_id,number,view,cleaning,maintenance) VALUES(?,?,?,?,?,?,?,?,?)',
    );
    for (const [pi, p] of props.entries()) {
      for (let b = 0; b < 2; b++)
        db.prepare('INSERT INTO buildings VALUES(?,?,?)').run(
          `${p[0]}b${b}`,
          p[0],
          b ? 'Garden Wing' : 'Main Building',
        );
      for (let f = 0; f < 4; f++)
        db.prepare('INSERT INTO floors VALUES(?,?,?,?,?)').run(
          `${p[0]}f${f}`,
          p[0],
          `${p[0]}b${f < 2 ? 0 : 1}`,
          f + 1,
          `Floor ${f + 1}`,
        );
      for (const [ti, name] of [
        'Deluxe King',
        'Premium Twin',
        'Palace Suite',
        'Garden Villa',
      ].entries())
        db.prepare('INSERT INTO room_types VALUES(?,?,?,?,?,?,?,?,?)').run(
          `${p[0]}t${ti}`,
          p[0],
          name,
          ([6800, 8200, 14500, 21000][ti] + pi * 350) * 100,
          ti > 1 ? 3 : 2,
          2,
          [32, 38, 64, 95][ti],
          ti === 1 ? 'Twin beds' : 'King bed',
          JSON.stringify([...amenities, ...(ti > 1 ? ['Private balcony', 'Lounge area'] : [])]),
        );
      for (let i = 0; i < 40; i++) {
        const f = Math.floor(i / 10),
          type = i < 16 ? 0 : i < 28 ? 1 : i < 36 ? 2 : 3;
        roomInsert.run(
          `${p[0]}r${i}`,
          p[0],
          `${p[0]}t${type}`,
          `${p[0]}b${f < 2 ? 0 : 1}`,
          `${p[0]}f${f}`,
          String((f + 1) * 100 + (i % 10) + 1),
          i % 2 ? 'City skyline' : 'Garden view',
          'Inspected',
          'Good',
        );
      }
    }
    const first = [
      'Rahul',
      'Sarah',
      'Arjun',
      'Emma',
      'Priya',
      'Daniel',
      'Aarav',
      'Olivia',
      'Rohan',
      'Sophie',
      'Kabir',
      'Maya',
      'Vikram',
      'Anika',
      'Dev',
      'Isabella',
    ];
    const last = [
      'Mehta',
      'Johnson',
      'Sharma',
      'Wilson',
      'Patel',
      'Lee',
      'Kapoor',
      'Martin',
      'Nair',
      'Brown',
      'Singh',
      'Rao',
      'Joshi',
      'Thomas',
      'Malhotra',
      'Williams',
    ];
    for (let g = 0; g < 240; g++) {
      const name = first[g % 16] + ' ' + last[(g * 7 + Math.floor(g / 16)) % 16];
      db.prepare('INSERT INTO guests VALUES(?,?,?,?,?,?,?,?)').run(
        `g${g}`,
        name,
        `guest${g + 1}@example.com`,
        '+91 90000 ' + String(10000 + g),
        'India',
        g % 17 === 0 ? 1 : 0,
        g % 6 === 0 ? 'Prefers a quiet room; vegetarian meals.' : '',
        1,
      );
    }
    for (const [id, name, email, role, ids] of [
      ['ho', 'Sarthak Raina', 'owner@brainadz.com', 'owner', props.map((p) => p[0])],
      ['hg', 'Ananya Sharma', 'manager@brainadz.com', 'gm', ['p1']],
      ['hd', 'Riya Kapoor', 'frontdesk@brainadz.com', 'frontdesk', ['p1']],
      ['hh', 'Anita Singh', 'housekeeping@brainadz.com', 'housekeeping', ['p1']],
      ['hf', 'Vikram Joshi', 'finance@brainadz.com', 'finance', ['p1', 'p2']],
    ])
      db.prepare('INSERT INTO hotel_users VALUES(?,?,?,?,?,?)').run(
        id,
        name,
        email,
        hashPassword('Brainadz@123'),
        role,
        JSON.stringify(ids),
      );
    const ins = db.prepare(
      'INSERT INTO reservations(id,property_id,guest_id,room_id,type_id,arrival,departure,adults,children,rate,tax_rate,status,source,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    const post = db.prepare(
      'INSERT INTO folio_entries(id,property_id,reservation_id,business_date,description,department,kind,debit,credit,net,tax,method,actor) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    let seq = 1,
      entry = 1;
    for (const [pi, p] of props.entries())
      for (let ri = 0; ri < 40; ri++)
        for (let off = -366 + (ri % 4); off < 22; off += 4) {
          if ((ri + Math.floor((off + 366) / 4) + pi) % 5 === 0) continue;
          const arrival = addDays(now, off),
            departure = addDays(arrival, ri % 3 === 0 ? 2 : 3),
            status =
              departure <= now
                ? 'Checked out'
                : arrival < now || (arrival === now && ri % 2 === 1)
                  ? 'In house'
                  : 'Confirmed';
          if (pi === 0 && ri === 39 && arrival < addDays(now, 4) && departure > now) continue;
          const type = ri < 16 ? 0 : ri < 28 ? 1 : ri < 36 ? 2 : 3;
          const base = ([6800, 8200, 14500, 21000][type] + pi * 350) * 100,
            rate = Math.round(base * (0.92 + ((ri + seq) % 7) * 0.025));
          const rid = 'RES-' + String(seq).padStart(6, '0');
          ins.run(
            rid,
            p[0],
            `g${seq % 240}`,
            `${p[0]}r${ri}`,
            `${p[0]}t${type}`,
            arrival,
            departure,
            2,
            ri % 7 === 0 ? 1 : 0,
            rate,
            1200,
            status,
            ['Direct', 'Booking.com', 'Corporate', 'Expedia', 'Travel agent'][seq % 5],
            'Fictional demonstration stay',
          );
          let balance = 0;
          if (status !== 'Confirmed') {
            for (let d = arrival; d < departure && d <= now; d = addDays(d, 1)) {
              const tax = Math.round(rate * 0.12);
              post.run(
                'F' + entry++,
                p[0],
                rid,
                d,
                'Room charge · ' + String((Math.floor(ri / 10) + 1) * 100 + (ri % 10) + 1),
                'Rooms',
                'charge',
                rate + tax,
                0,
                rate,
                tax,
                null,
                'demo-seed',
              );
              balance += rate + tax;
            }
            if (seq % 4 !== 0) {
              const net = (3500 + (seq % 2500)) * 100,
                tax = Math.round(net * 0.05);
              post.run(
                'F' + entry++,
                p[0],
                rid,
                arrival,
                'The Terrace · dining',
                'F&B',
                'charge',
                net + tax,
                0,
                net,
                tax,
                null,
                'demo-seed',
              );
              balance += net + tax;
            }
            if (seq % 11 === 0) {
              const net = 280000,
                tax = 50400;
              post.run(
                'F' + entry++,
                p[0],
                rid,
                arrival,
                'Wellness treatment',
                'Spa',
                'charge',
                net + tax,
                0,
                net,
                tax,
                null,
                'demo-seed',
              );
              balance += net + tax;
            }
            if (status === 'Checked out')
              post.run(
                'F' + entry++,
                p[0],
                rid,
                addDays(departure, -1),
                'Stay settlement',
                'Front office',
                'payment',
                0,
                balance,
                0,
                0,
                'Recorded external payment',
                'demo-seed',
              );
          }
          if (status === 'In house')
            db.prepare('UPDATE rooms SET cleaning=? WHERE id=?').run(
              ri % 5 === 0 ? 'Dirty' : 'Clean',
              `${p[0]}r${ri}`,
            );
          seq++;
        }
    for (const p of props) {
      for (const ri of [1, 8, 19]) {
        db.prepare("UPDATE rooms SET cleaning='Dirty' WHERE id=?").run(`${p[0]}r${ri}`);
        db.prepare(
          'INSERT INTO housekeeping_tasks(id,property_id,room_id,title,attendant,priority) VALUES(?,?,?,?,?,?)',
        ).run(
          `task-${p[0]}-${ri}`,
          p[0],
          `${p[0]}r${ri}`,
          'Room refresh & readiness',
          ri % 2 ? 'Anita Singh' : 'Raj Kumar',
          ri === 1 ? 'High' : 'Normal',
        );
      }
    }
    db.prepare('INSERT INTO room_blocks VALUES(?,?,?,?,?,?)').run(
      'block1',
      'p1',
      'p1r39',
      now,
      addDays(now, 4),
      'Scheduled AC servicing',
    );
    db.prepare("UPDATE rooms SET maintenance='Out of order' WHERE id='p1r39'").run();
    db.prepare('INSERT INTO audit_events(property_id,actor,action,entity_id) VALUES(?,?,?,?)').run(
      null,
      'System',
      'Created fictional hospitality demonstration portfolio',
      'demo-seed',
    );
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
