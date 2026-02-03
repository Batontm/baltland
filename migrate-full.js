const Database = require('better-sqlite3');
const db = new Database('land.db', { verbose: console.log });

console.log('🚀 Начинаем миграцию базы данных на SQLite...');

// 1. Таблица участков (Land Plots)
db.exec(`
  CREATE TABLE IF NOT EXISTS land_plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    area_sotok REAL NOT NULL,
    district TEXT NOT NULL,
    location TEXT,
    distance_to_sea REAL,
    land_status TEXT DEFAULT 'ИЖС',
    has_gas INTEGER DEFAULT 0,
    has_electricity INTEGER DEFAULT 0,
    has_water INTEGER DEFAULT 0,
    has_installment INTEGER DEFAULT 0,
    image_url TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    cadastral_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Таблица подписчиков (Subscribers)
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 3. Таблица заявок (Leads)
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    wishes TEXT,
    status TEXT DEFAULT 'new',
    manager_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 4. Таблица пользователей (Users)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'manager',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 5. Создаем индексы (для скорости)
try {
  db.exec(`
      CREATE INDEX IF NOT EXISTS idx_land_plots_district ON land_plots(district);
      CREATE INDEX IF NOT EXISTS idx_land_plots_price ON land_plots(price);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
} catch (e) {
  console.log('⚠️ Индексы уже существуют или ошибка:', e.message);
}

// 6. Заполняем тестовыми данными (Только если таблицы пустые)

// --- УЧАСТКИ ---
const plotsCount = db.prepare('SELECT count(*) as count FROM land_plots').get().count;
if (plotsCount === 0) {
  console.log('🌱 Заполняем участки...');
  const insertPlot = db.prepare(`
        INSERT INTO land_plots (title, description, price, area_sotok, district, location, distance_to_sea, land_status, has_gas, has_electricity, has_water, has_installment, is_featured, image_url) 
        VALUES (@title, @description, @price, @area_sotok, @district, @location, @distance_to_sea, @land_status, @has_gas, @has_electricity, @has_water, @has_installment, @is_featured, @image_url)
    `);

  const plots = [
    { title: 'Участок у леса', description: 'Красивый участок с видом на сосновый лес', price: 1850000, area_sotok: 8.5, district: 'Зеленоградский район', location: 'пос. Сокольники', distance_to_sea: 3.5, land_status: 'ИЖС', has_gas: 1, has_electricity: 1, has_water: 0, has_installment: 1, is_featured: 1, image_url: null },
    { title: 'Видовой участок', description: 'Участок с панорамным видом на море', price: 3200000, area_sotok: 10, district: 'Светлогорский городской округ', location: 'Светлогорск', distance_to_sea: 1.2, land_status: 'ИЖС', has_gas: 1, has_electricity: 1, has_water: 1, has_installment: 0, is_featured: 1, image_url: null },
    { title: 'Участок в СНТ', description: 'Уютный участок в садовом товариществе', price: 980000, area_sotok: 6, district: 'Гурьевский городской округ', location: 'СНТ Рассвет', distance_to_sea: 12, land_status: 'СНТ', has_gas: 0, has_electricity: 1, has_water: 0, has_installment: 1, is_featured: 0, image_url: null },
    // ... можно добавить остальные
  ];

  const insertMany = db.transaction((data) => {
    for (const item of data) insertPlot.run(item);
  });
  insertMany(plots);
}

// --- АДМИН ---
const usersCount = db.prepare('SELECT count(*) as count FROM users').get().count;
if (usersCount === 0) {
  console.log('👤 Создаем админа...');
  // Пароль: admin123 (захеширован bcrypt)
  db.prepare(`
        INSERT INTO users (email, password_hash, name, role) 
        VALUES (?, ?, ?, ?)
    `).run('admin@baltikzemlya.ru', '$2a$10$rQnM1bLqPvHzRzKAq8MzXOVdQhB5WzR5HfGqVNnUOZ5CtQ3F5Jy3O', 'Администратор', 'admin');
}

console.log('✅ Миграция завершена! Файл land.db обновлен.');
