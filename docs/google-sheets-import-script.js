// ============================================================
// БалтикЗемля — Импорт участков из БД в Google Таблицу
// ============================================================
//
// КАК ИСПОЛЬЗОВАТЬ:
// 1. Откройте вашу Google Таблицу (созданную через setupSheet)
// 2. Расширения → Apps Script
// 3. Создайте новый файл: Import.gs
// 4. Вставьте этот код
// 5. Запустите функцию importFromDB()
// 6. Все участки из базы данных появятся в таблице
//
// ВАЖНО: Перед запуском настройте свойства скрипта:
//   ⚙️ Настройки проекта → Свойства скрипта:
//   - EXPORT_URL = https://baltland.ru/api/sheets/export
//   - EXPORT_SECRET = (ваш SHEETS_SYNC_SECRET с сервера)
// ============================================================

/**
 * Импорт всех участков из БД сайта в таблицу.
 * Запускается вручную, один раз при первоначальном заполнении.
 */
function importFromDB() {
  const props = PropertiesService.getScriptProperties();
  const exportUrl = props.getProperty('EXPORT_URL') || 'https://baltland.ru/api/sheets/export';
  const exportSecret = props.getProperty('EXPORT_SECRET') || '';

  if (!exportSecret) {
    SpreadsheetApp.getUi().alert(
      '❌ Ошибка: EXPORT_SECRET не настроен!\n\n' +
      'Перейдите в ⚙️ Настройки проекта → Свойства скрипта\n' +
      'и добавьте EXPORT_SECRET = ваш секретный ключ с сервера.'
    );
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Импорт участков из БД',
    'Все существующие данные на листе «Участки» будут ЗАМЕНЕНЫ данными из базы.\n\nПродолжить?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  // Запрос к API
  const url = exportUrl + '?secret=' + encodeURIComponent(exportSecret);

  let response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' },
    });
  } catch (e) {
    ui.alert('❌ Ошибка подключения: ' + e.message);
    return;
  }

  const code = response.getResponseCode();
  if (code !== 200) {
    ui.alert('❌ Сервер вернул ошибку ' + code + ':\n' + response.getContentText());
    return;
  }

  let data;
  try {
    data = JSON.parse(response.getContentText());
  } catch (e) {
    ui.alert('❌ Не удалось разобрать ответ сервера: ' + e.message);
    return;
  }

  if (!data.rows || data.rows.length === 0) {
    ui.alert('ℹ️ В базе данных нет участков для импорта.');
    return;
  }

  // Записать данные в таблицу
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Участки');
  if (!sheet) {
    ui.alert('❌ Лист «Участки» не найден! Сначала запустите setupSheet().');
    return;
  }

  // Очистить старые данные (со 2-й строки, заголовки не трогаем)
  const lastRow = sheet.getLastRow();
  const maxRows = Math.max(lastRow, 1001);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 30).clearContent();
  }

  // Снять валидацию перед записью (иначе пустые поля вызывают ошибку)
  sheet.getRange(2, 1, maxRows, 30).clearDataValidations();

  // Записать новые данные
  const rows = data.rows;
  const numRows = rows.length;
  const numCols = rows[0].length;

  sheet.getRange(2, 1, numRows, numCols).setValues(rows);

  // Восстановить валидацию после записи
  reapplyValidation(sheet, numRows);

  // Применить чекбоксы к столбцам L, M, N, O, Q, X (после записи данных)
  const checkboxCols = [12, 13, 14, 15, 17, 24]; // L, M, N, O, Q, X
  checkboxCols.forEach(function(col) {
    const range = sheet.getRange(2, col, numRows, 1);
    const values = range.getValues();
    // Конвертировать в boolean
    const boolValues = values.map(function(row) {
      return [row[0] === true || row[0] === 'TRUE' || row[0] === 'true' || row[0] === 1];
    });
    range.setValues(boolValues);
  });

  ui.alert(
    '✅ Импорт завершён!\n\n' +
    'Загружено участков: ' + numRows + '\n\n' +
    'Все данные из базы успешно перенесены в таблицу.'
  );
}

/**
 * Восстановить валидацию после импорта данных.
 * Применяет те же правила, что и setupSheet, но на numRows строк.
 */
function reapplyValidation(sheet, numRows) {
  const n = Math.max(numRows, 1000);

  // K: Категория земли
  sheet.getRange(2, 11, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ИЖС', 'СНТ', 'ДНП', 'ЛПХ'], true)
      .setAllowInvalid(true) // Предупреждение, не блокировка
      .build()
  );

  // P: Статус
  sheet.getRange(2, 16, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Доступен', 'Забронирован', 'Продан', 'Черновик'], true)
      .setAllowInvalid(true)
      .build()
  );

  // R: Тип собственности
  sheet.getRange(2, 18, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ownership', 'lease'], true)
      .setAllowInvalid(true) // Разрешить пустое
      .build()
  );

  // F: Цена > 0
  sheet.getRange(2, 6, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThan(0)
      .setAllowInvalid(true)
      .build()
  );

  // G: Площадь > 0
  sheet.getRange(2, 7, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThan(0)
      .setAllowInvalid(true)
      .build()
  );

  // J: Расстояние >= 0
  sheet.getRange(2, 10, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0)
      .setAllowInvalid(true)
      .build()
  );

  // L, M, N, O, Q, X: Чекбоксы
  var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  [12, 13, 14, 15, 17, 24].forEach(function(col) {
    sheet.getRange(2, col, n, 1).setDataValidation(checkboxRule);
  });

  // S, T: Даты
  var dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 19, n, 1).setDataValidation(dateRule);
  sheet.getRange(2, 20, n, 1).setDataValidation(dateRule);
}

/**
 * Добавляет пункт «Импорт из БД» в меню таблицы.
 * Вызывается автоматически при открытии таблицы.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Синхронизация')
    .addItem('📥 Импорт из БД (одноразовый)', 'importFromDB')
    .addSeparator()
    .addItem('Синхронизировать все', 'fullSync')
    .addItem('Синхронизировать изменённые', 'syncDirtyRows')
    .addToUi();
}
