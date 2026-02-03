const Database = require('better-sqlite3');
const db = new Database('land.db', { verbose: console.log });

// Создаем таблицу
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

// Вставляем тестовые данные
const insert = db.prepare(`
  INSERT INTO land_plots (title, description, price, area_sotok, district, location, distance_to_sea, land_status, has_gas, has_electricity, has_water, has_installment, is_featured, image_url)
  VALUES (@title, @description, @price, @area_sotok, @district, @location, @distance_to_sea, @land_status, @has_gas, @has_electricity, @has_water, @has_installment, @is_featured, @image_url)
`);

const sampleData = [
  { title: 'Участок у леса', description: 'Красивый участок с видом на сосновый лес', price: 1850000, area_sotok: 8.5, district: 'Зеленоградский район', location: 'пос. Сокольники', distance_to_sea: 3.5, land_status: 'ИЖС', has_gas: 1, has_electricity: 1, has_water: 0, has_installment: 1, is_featured: 1, image_url: null },
  { title: 'Видовой участок', description: 'Участок с панорамным видом на море', price: 3200000, area_sotok: 10, district: 'Светлогорский городской округ', location: 'Светлогорск', distance_to_sea: 1.2, land_status: 'ИЖС', has_gas: 1, has_electricity: 1, has_water: 1, has_installment: 0, is_featured: 1, image_url: null },
  // ...остальные данные (можно добавить позже)
];

// Запускаем вставку
const insertMany = db.transaction((plots) => {
  for (const plot of plots) insert.run(plot);
});

try {
  insertMany(sampleData);
  console.log('База данных успешно создана: land.db');
} catch (err) {
  console.log('Данные уже есть или ошибка:', err.message);
}
