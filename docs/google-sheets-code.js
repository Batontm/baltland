// ============================================================
// БалтикЗемля — Google Sheets ↔ API Синхронизация
// ============================================================
//
// Полный скрипт для Apps Script. Включает:
// - Меню синхронизации
// - Импорт из БД (одноразовый)
// - Автоматическую синхронизацию изменений (onEdit + таймер)
// - Полную синхронизацию вручную
//
// НАСТРОЙКА:
// ⚙️ Настройки проекта → Свойства скрипта:
//   API_URL     = https://baltland.ru/api/sheets/sync
//   API_SECRET  = sk_sheets_...
//   EXPORT_URL  = https://baltland.ru/api/sheets/export
// ============================================================

var SHEET_NAME = 'Участки';
var LOG_SHEET_NAME = 'Лог';
var HEADER_ROW = 1;
var SYNC_COL = 29;   // AC
var ERROR_COL = 30;  // AD
var ID_COL = 1;      // A
var CADASTRAL_COL = 3; // C
var TOTAL_COLS = 30;

// ─── МЕНЮ ─────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Синхронизация')
    .addItem('📥 Импорт из БД (одноразовый)', 'importFromDB')
    .addSeparator()
    .addItem('🔄 Синхронизировать всё', 'fullSync')
    .addItem('⚡ Синхронизировать изменённые', 'syncDirtyRows')
    .addToUi();
}

// ─── КОНФИГ ───────────────────────────────────────────────

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiUrl: props.getProperty('API_URL') || '',
    apiSecret: props.getProperty('API_SECRET') || '',
    exportUrl: props.getProperty('EXPORT_URL') || '',
  };
}

// ─── ON EDIT — пометить строку как dirty ──────────────────

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    var row = e.range.getRow();
    if (row <= HEADER_ROW) return;

    var col = e.range.getColumn();
    // Не реагировать на изменения в служебных столбцах
    if (col === SYNC_COL || col === ERROR_COL || col === ID_COL) return;

    sheet.getRange(row, SYNC_COL).setValue('⏳ Ожидает sync');
    sheet.getRange(row, ERROR_COL).setValue('');
  } catch (err) {
    // onEdit не должен падать
    console.log('onEdit error: ' + err.message);
  }
}

// ─── СБОРКА СТРОКИ В ОБЪЕКТ ──────────────────────────────

function rowToObject(sheet, row) {
  var values = sheet.getRange(row, 1, 1, TOTAL_COLS).getValues()[0];
  return {
    row_number: row,
    id: values[0] || null,
    int_id: values[1] || null,
    cadastral_number: String(values[2] || '').trim(),
    title: String(values[3] || '').trim(),
    description: String(values[4] || '').trim(),
    price: Number(values[5]) || 0,
    area_sotok: Number(values[6]) || 0,
    district: String(values[7] || '').trim(),
    location: String(values[8] || '').trim(),
    distance_to_sea: values[9] !== '' && values[9] !== null ? Number(values[9]) : null,
    land_status: String(values[10] || '').trim(),
    has_gas: !!values[11],
    has_electricity: !!values[12],
    has_water: !!values[13],
    has_installment: !!values[14],
    status: String(values[15] || 'Черновик').trim(),
    is_featured: !!values[16],
    ownership_type: String(values[17] || '').trim(),
    lease_from: values[18] || null,
    lease_to: values[19] || null,
    vri_id: String(values[20] || '').trim(),
    bundle_id: String(values[21] || '').trim() || null,
    bundle_title: String(values[22] || '').trim(),
    is_bundle_primary: !!values[23],
    image_url: String(values[24] || '').trim(),
    youtube_video_url: String(values[25] || '').trim(),
    rutube_video_url: String(values[26] || '').trim(),
    additional_cadastral_numbers: String(values[27] || '').trim(),
  };
}

// ─── ОТПРАВКА НА API ─────────────────────────────────────

function sendToApi(rows, deletedCadastrals) {
  var config = getConfig();
  if (!config.apiUrl || !config.apiSecret) {
    throw new Error('API_URL или API_SECRET не настроены. Перейдите в ⚙️ → Свойства скрипта.');
  }

  var payload = {
    rows: rows,
    deleted_cadastrals: deletedCadastrals || [],
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + config.apiSecret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(config.apiUrl, options);
  var code = response.getResponseCode();
  var body;

  try {
    body = JSON.parse(response.getContentText());
  } catch (e) {
    throw new Error('Сервер вернул невалидный ответ (код ' + code + '): ' + response.getContentText().substring(0, 200));
  }

  if (code !== 200) {
    throw new Error('Ошибка сервера ' + code + ': ' + (body.error || JSON.stringify(body)));
  }

  return body;
}

// ─── СИНХРОНИЗАЦИЯ DIRTY СТРОК ───────────────────────────

function syncDirtyRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) return;

  var numDataRows = lastRow - HEADER_ROW;
  var syncValues = sheet.getRange(HEADER_ROW + 1, SYNC_COL, numDataRows, 1).getValues();
  var cadastralValues = sheet.getRange(HEADER_ROW + 1, CADASTRAL_COL, numDataRows, 1).getValues();

  var dirtyRows = [];
  for (var i = 0; i < numDataRows; i++) {
    var syncVal = String(syncValues[i][0]);
    var cadastral = String(cadastralValues[i][0]).trim();

    if ((syncVal.indexOf('⏳') !== -1 || syncVal === '') && cadastral !== '') {
      var row = i + HEADER_ROW + 1;
      var obj = rowToObject(sheet, row);
      if (obj.cadastral_number) {
        dirtyRows.push(obj);
      }
    }
  }

  if (dirtyRows.length === 0) {
    console.log('Нет строк для синхронизации');
    return;
  }

  console.log('Синхронизация ' + dirtyRows.length + ' строк...');

  try {
    var result = sendToApi(dirtyRows, []);
    applyResults(sheet, result.results);
    writeLog('sync', dirtyRows.length + ' строк', 'ok',
      '+' + result.summary.added + ' ~' + result.summary.updated + ' ✗' + result.summary.errors);
  } catch (e) {
    writeLog('sync', dirtyRows.length + ' строк', 'error', e.message);
    // Не показываем alert при автоматическом sync (триггер по времени)
    try {
      SpreadsheetApp.getUi().alert('❌ Ошибка: ' + e.message);
    } catch (uiErr) {
      // UI недоступен из time-trigger — просто логируем
      console.log('Sync error: ' + e.message);
    }
  }
}

// ─── ПОЛНАЯ СИНХРОНИЗАЦИЯ ─────────────────────────────────

function fullSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert('Нет данных для синхронизации');
    return;
  }

  // Пометить все строки как dirty
  var numDataRows = lastRow - HEADER_ROW;
  var dirtyValues = [];
  for (var i = 0; i < numDataRows; i++) {
    dirtyValues.push(['⏳ Ожидает sync']);
  }
  sheet.getRange(HEADER_ROW + 1, SYNC_COL, numDataRows, 1).setValues(dirtyValues);

  // Очистить ошибки
  var emptyValues = [];
  for (var j = 0; j < numDataRows; j++) {
    emptyValues.push(['']);
  }
  sheet.getRange(HEADER_ROW + 1, ERROR_COL, numDataRows, 1).setValues(emptyValues);

  syncDirtyRows();
}

// ─── ЗАПИСАТЬ РЕЗУЛЬТАТЫ В ТАБЛИЦУ ──────────────────────

function applyResults(sheet, results) {
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (r.row_number < 2) continue; // skip delete results

    var now = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');

    if (r.error) {
      sheet.getRange(r.row_number, SYNC_COL).setValue('❌ ' + now);
      sheet.getRange(r.row_number, ERROR_COL).setValue(r.error);
    } else {
      sheet.getRange(r.row_number, SYNC_COL).setValue('✅ ' + now);
      sheet.getRange(r.row_number, ERROR_COL).setValue('');
      // Записать ID из БД
      if (r.id) {
        sheet.getRange(r.row_number, ID_COL).setValue(r.id);
      }
    }
  }
}

// ─── ИМПОРТ ИЗ БД ────────────────────────────────────────

function importFromDB() {
  var config = getConfig();
  var exportUrl = config.exportUrl;
  var exportSecret = config.apiSecret; // Используем тот же секрет

  if (!exportUrl) {
    SpreadsheetApp.getUi().alert(
      '❌ EXPORT_URL не настроен!\n\n' +
      '⚙️ → Свойства скрипта → EXPORT_URL = https://baltland.ru/api/sheets/export'
    );
    return;
  }
  if (!exportSecret) {
    SpreadsheetApp.getUi().alert(
      '❌ API_SECRET не настроен!\n\n' +
      '⚙️ → Свойства скрипта → API_SECRET'
    );
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Импорт участков из БД',
    'Все данные на листе «Участки» будут ЗАМЕНЕНЫ.\nПродолжить?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var url = exportUrl + '?secret=' + encodeURIComponent(exportSecret);
  var response;
  try {
    response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  } catch (e) {
    ui.alert('❌ Ошибка подключения: ' + e.message);
    return;
  }

  if (response.getResponseCode() !== 200) {
    ui.alert('❌ Сервер: ' + response.getResponseCode() + '\n' + response.getContentText().substring(0, 300));
    return;
  }

  var data;
  try {
    data = JSON.parse(response.getContentText());
  } catch (e) {
    ui.alert('❌ Невалидный ответ: ' + e.message);
    return;
  }

  if (!data.rows || data.rows.length === 0) {
    ui.alert('ℹ️ Нет участков для импорта.');
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    ui.alert('❌ Лист «Участки» не найден!');
    return;
  }

  // Очистить
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).clearContent();
  }

  // Снять валидацию перед записью
  sheet.getRange(2, 1, Math.max(lastRow, 1001), TOTAL_COLS).clearDataValidations();

  // Записать
  var rows = data.rows;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Восстановить валидацию
  reapplyValidation(sheet, rows.length);

  // Конвертировать чекбоксы
  var checkboxCols = [12, 13, 14, 15, 17, 24];
  checkboxCols.forEach(function(col) {
    var range = sheet.getRange(2, col, rows.length, 1);
    var values = range.getValues();
    var boolValues = values.map(function(r) {
      return [r[0] === true || r[0] === 'TRUE' || r[0] === 'true' || r[0] === 1];
    });
    range.setValues(boolValues);
  });

  ui.alert('✅ Загружено участков: ' + rows.length);
}

// ─── ВОССТАНОВЛЕНИЕ ВАЛИДАЦИИ ────────────────────────────

function reapplyValidation(sheet, numRows) {
  var n = Math.max(numRows, 1000);

  // K: Категория земли
  sheet.getRange(2, 11, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ИЖС', 'СНТ', 'ДНП', 'ЛПХ'], true)
      .setAllowInvalid(true)
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
      .setAllowInvalid(true)
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

  // L, M, N, O, Q, X: Чекбоксы
  var cbRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  [12, 13, 14, 15, 17, 24].forEach(function(col) {
    sheet.getRange(2, col, n, 1).setDataValidation(cbRule);
  });
}

// ─── ЛОГИРОВАНИЕ ─────────────────────────────────────────

function writeLog(action, cadastral, result, details) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    logSheet.getRange(1, 1, 1, 5).setValues([['Дата', 'Действие', 'Кадастровый номер', 'Результат', 'Детали']]);
  }

  var now = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm:ss');
  logSheet.appendRow([now, action, cadastral, result, details]);
}
