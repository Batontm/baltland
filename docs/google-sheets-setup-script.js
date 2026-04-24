// ============================================================
// БалтикЗемля — Автоматическое создание таблицы участков
// ============================================================
// 
// КАК ИСПОЛЬЗОВАТЬ:
// 1. Создайте пустую Google Таблицу: https://sheets.google.com
// 2. Расширения → Apps Script
// 3. Вставьте весь этот код в Code.gs
// 4. Нажмите ▶ (Выполнить) — функция setupSheet
// 5. Google попросит разрешение — нажмите «Разрешить»
// 6. Готово! Таблица полностью настроена.
// ============================================================

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('БалтикЗемля — Участки');

  // ─── 1. ЛИСТ «Участки» ───────────────────────────────────
  let plotsSheet = ss.getSheetByName('Лист1') || ss.getSheets()[0];
  plotsSheet.setName('Участки');

  const headers = [
    'ID',                       // A
    'INT_ID',                   // B
    'Кадастровый номер',        // C
    'Название',                 // D
    'Описание',                 // E
    'Цена (руб)',               // F
    'Площадь (сот)',            // G
    'Район',                    // H
    'Населённый пункт',         // I
    'Расстояние до моря (км)',  // J
    'Категория земли',          // K
    'Газ',                      // L
    'Электричество',            // M
    'Вода',                     // N
    'Рассрочка',                // O
    'Статус',                   // P
    'Избранное',                // Q
    'Тип собственности',        // R
    'Аренда с',                 // S
    'Аренда по',                // T
    'ВРИ',                      // U
    'Лот (группа)',             // V
    'Название лота',            // W
    'Главный в лоте',           // X
    'Фото (URL)',               // Y
    'YouTube',                  // Z
    'RuTube',                   // AA
    'Доп. кадастровые',         // AB
    'Sync',                     // AC
    'Ошибка sync',              // AD
  ];

  // Записать заголовки
  const headerRange = plotsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8eaed');
  headerRange.setHorizontalAlignment('center');
  headerRange.setWrap(true);

  // Закрепить строку 1
  plotsSheet.setFrozenRows(1);

  // Ширина столбцов
  const colWidths = {
    1: 280, // A: ID (uuid)
    2: 60,  // B: INT_ID
    3: 180, // C: Кадастровый
    4: 250, // D: Название
    5: 300, // E: Описание
    6: 120, // F: Цена
    7: 100, // G: Площадь
    8: 180, // H: Район
    9: 180, // I: Населённый пункт
    10: 100, // J: Расстояние
    11: 120, // K: Категория
    12: 50,  // L: Газ
    13: 50,  // M: Электричество
    14: 50,  // N: Вода
    15: 50,  // O: Рассрочка
    16: 130, // P: Статус
    17: 50,  // Q: Избранное
    18: 130, // R: Тип собственности
    19: 110, // S: Аренда с
    20: 110, // T: Аренда по
    21: 80,  // U: ВРИ
    22: 120, // V: Лот
    23: 150, // W: Название лота
    24: 50,  // X: Главный в лоте
    25: 250, // Y: Фото URL
    26: 250, // Z: YouTube
    27: 250, // AA: RuTube
    28: 250, // AB: Доп. кадастровые
    29: 180, // AC: Sync
    30: 200, // AD: Ошибка sync
  };
  for (const [col, width] of Object.entries(colWidths)) {
    plotsSheet.setColumnWidth(Number(col), width);
  }

  // Количество строк для валидации (достаточно большое)
  const maxRows = 1000;

  // ─── ВАЛИДАЦИЯ ДАННЫХ ───────────────────────────────────

  // K: Категория земли — выпадающий список
  const landStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ИЖС', 'СНТ', 'ДНП', 'ЛПХ'], true)
    .setHelpText('Выберите категорию: ИЖС, СНТ, ДНП, ЛПХ')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 11, maxRows, 1).setDataValidation(landStatusRule);

  // P: Статус — выпадающий список
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Доступен', 'Забронирован', 'Продан', 'Черновик'], true)
    .setHelpText('Статус участка')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 16, maxRows, 1).setDataValidation(statusRule);

  // R: Тип собственности — выпадающий список
  const ownershipRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ownership', 'lease'], true)
    .setHelpText('ownership = собственность, lease = аренда')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 18, maxRows, 1).setDataValidation(ownershipRule);

  // F: Цена — число > 0
  const priceRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThan(0)
    .setHelpText('Цена должна быть положительным числом')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 6, maxRows, 1).setDataValidation(priceRule);

  // G: Площадь — число > 0
  const areaRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThan(0)
    .setHelpText('Площадь должна быть > 0')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 7, maxRows, 1).setDataValidation(areaRule);

  // J: Расстояние до моря — число >= 0
  const distanceRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setHelpText('Расстояние в км (число >= 0)')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 10, maxRows, 1).setDataValidation(distanceRule);

  // L, M, N, O, Q, X: Флажки (чекбоксы)
  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build();
  [12, 13, 14, 15, 17, 24].forEach(function(col) {
    plotsSheet.getRange(2, col, maxRows, 1).setDataValidation(checkboxRule);
    // Установить FALSE по умолчанию
    plotsSheet.getRange(2, col, maxRows, 1).setValue(false);
  });
  // Очистить значения (оставить только валидацию, без заполнения)
  [12, 13, 14, 15, 17, 24].forEach(function(col) {
    plotsSheet.getRange(2, col, maxRows, 1).clearContent();
  });

  // S, T: Даты
  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setHelpText('Введите дату в формате ДД.ММ.ГГГГ')
    .setAllowInvalid(false)
    .build();
  plotsSheet.getRange(2, 19, maxRows, 1).setDataValidation(dateRule);
  plotsSheet.getRange(2, 20, maxRows, 1).setDataValidation(dateRule);

  // Формат числа для цены
  plotsSheet.getRange(2, 6, maxRows, 1).setNumberFormat('#,##0');

  // Формат числа для площади
  plotsSheet.getRange(2, 7, maxRows, 1).setNumberFormat('0.0');

  // ─── УСЛОВНОЕ ФОРМАТИРОВАНИЕ ───────────────────────────

  // Статус: Доступен = зелёный
  const statusRange = plotsSheet.getRange('P2:P' + (maxRows + 1));

  const rules = plotsSheet.getConditionalFormatRules();

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Доступен')
    .setBackground('#d9ead3')
    .setFontColor('#274e13')
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Забронирован')
    .setBackground('#fff2cc')
    .setFontColor('#7f6000')
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Продан')
    .setBackground('#d9d9d9')
    .setFontColor('#666666')
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Черновик')
    .setBackground('#cfe2f3')
    .setFontColor('#1155cc')
    .setRanges([statusRange])
    .build());

  // Sync: ✅ = зелёный, ❌ = красный, ⏳ = жёлтый
  const syncRange = plotsSheet.getRange('AC2:AC' + (maxRows + 1));

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('✅')
    .setBackground('#d9ead3')
    .setRanges([syncRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('❌')
    .setBackground('#f4c7c3')
    .setRanges([syncRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('⏳')
    .setBackground('#fff2cc')
    .setRanges([syncRange])
    .build());

  plotsSheet.setConditionalFormatRules(rules);

  // ─── ЗАЩИТА СЛУЖЕБНЫХ СТОЛБЦОВ ─────────────────────────

  const protectedCols = [
    { col: 'A', name: 'ID (автозаполнение)' },
    { col: 'B', name: 'INT_ID (автозаполнение)' },
    { col: 'AC', name: 'Sync (автозаполнение)' },
    { col: 'AD', name: 'Ошибка sync (автозаполнение)' },
  ];

  protectedCols.forEach(function(item) {
    const protection = plotsSheet.getRange(item.col + '2:' + item.col + (maxRows + 1))
      .protect()
      .setDescription(item.name);
    protection.setWarningOnly(true); // Предупреждение, но не блокирует
  });

  // Серый фон для служебных столбцов
  plotsSheet.getRange('A2:B' + (maxRows + 1)).setBackground('#f3f3f3');
  plotsSheet.getRange('AC2:AD' + (maxRows + 1)).setBackground('#f3f3f3');

  // ─── 2. ЛИСТ «Настройки» ─────────────────────────────────
  let settingsSheet = ss.getSheetByName('Настройки');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Настройки');
  }

  settingsSheet.getRange('A1').setValue('https://baltland.ru/api/sheets/sync');
  settingsSheet.getRange('B1').setValue('URL API');
  settingsSheet.getRange('A2').setValue('');
  settingsSheet.getRange('B2').setValue('API Secret (заполнить после настройки сервера)');
  settingsSheet.getRange('A3').setValue('auto');
  settingsSheet.getRange('B3').setValue('Режим (auto / manual)');
  settingsSheet.getRange('A4').setValue('5');
  settingsSheet.getRange('B4').setValue('Интервал sync (мин)');

  settingsSheet.getRange('B1:B4').setFontColor('#999999');
  settingsSheet.setColumnWidth(1, 400);
  settingsSheet.setColumnWidth(2, 350);

  // Заголовок
  settingsSheet.getRange('A1:B1').setFontWeight('bold');

  // ─── 3. ЛИСТ «Лог» ───────────────────────────────────────
  let logSheet = ss.getSheetByName('Лог');
  if (!logSheet) {
    logSheet = ss.insertSheet('Лог');
  }

  const logHeaders = ['Дата', 'Действие', 'Кадастровый номер', 'Результат', 'Детали'];
  logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
  logSheet.getRange(1, 1, 1, logHeaders.length).setFontWeight('bold').setBackground('#e8eaed');
  logSheet.setFrozenRows(1);
  logSheet.setColumnWidth(1, 180);
  logSheet.setColumnWidth(2, 120);
  logSheet.setColumnWidth(3, 200);
  logSheet.setColumnWidth(4, 100);
  logSheet.setColumnWidth(5, 400);

  // ─── 4. УДАЛИТЬ ЛИШНИЕ ЛИСТЫ ─────────────────────────────
  ss.getSheets().forEach(function(sheet) {
    const name = sheet.getName();
    if (name !== 'Участки' && name !== 'Настройки' && name !== 'Лог') {
      // Не удаляем, если это единственный лист
      if (ss.getSheets().length > 3) {
        ss.deleteSheet(sheet);
      }
    }
  });

  // Активировать лист «Участки»
  ss.setActiveSheet(plotsSheet);

  // ─── ГОТОВО ───────────────────────────────────────────────
  SpreadsheetApp.getUi().alert(
    '✅ Таблица настроена!\n\n' +
    '• Лист «Участки» — 30 столбцов с валидацией\n' +
    '• Лист «Настройки» — URL и ключ API\n' +
    '• Лист «Лог» — журнал синхронизации\n\n' +
    'Следующий шаг: заполните API Secret на листе «Настройки» и настройте триггеры.'
  );
}
