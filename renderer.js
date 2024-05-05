// Electronとsqlite3モジュールを読み込み
const { ipcRenderer } = require('electron');
const sqlite3 = require('sqlite3').verbose();

// データベースファイルを開く、なければ新規作成
let db = new sqlite3.Database('./diary.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database', err.message); // データベース開けなかった場合のエラー表示
    } else {
        console.log('Connected to the diary database.');
        // エントリを保存するためのテーブルを作成（すでに存在している場合は作成しない）
        db.run('CREATE TABLE IF NOT EXISTS entries (date TEXT PRIMARY KEY, entry TEXT)', (err) => {
            if (err) {
                console.error('Error creating table', err.message); // テーブル作成エラーの表示
            } else {
                console.log('Table created or already exists.'); // テーブル作成成功、または既に存在していることの確認
            }
        });
    }
});

let dp;
let selectedDate = new Date(); // 現在の日付を選択日として初期化

// DOMがロードされた後に実行
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('calendar'); // カレンダーのコンテナを取得
    const options = {
        autohide: true, // 日付選択後に自動でカレンダーを隠す
        format: 'yyyy-mm-dd', // 日付の表示形式
        todayHighlight: true, // 今日の日付をハイライト
        clearBtn: true // クリアボタンの表示
    };

    dp = new Datepicker(container, options); // Datepickerの初期化
    dp.setDate(selectedDate); // 選択された日付を設定
    dp.update(); // カレンダーの更新

    // 日付が変更されたときのイベントリスナー
    container.addEventListener('changeDate', function (event) {
        const date = new Date(event.detail.date); // 選択された日付を取得
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`; // 日付をYYYY-MM-DD形式に整形
        loadEntry(formattedDate); // 選択された日付のエントリをロード
    });

    // 月が変更された際のイベントハンドラ
    container.addEventListener('changeMonth', function(event) {
        loadCalendarHighlights(); // カレンダーハイライトを再読込
    });

    loadCalendarHighlights(); // カレンダーのハイライトをロード
});

// タブを入力させる
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('entry-box');

    textarea.addEventListener('keydown', function(event) {
        if (event.key === 'Tab') { // タブキーが押された場合
            event.preventDefault(); // デフォルトの挙動（フォーカスの移動）を防止
            const start = this.selectionStart; // タブを挿入する開始位置
            const end = this.selectionEnd; // タブを挿入する終了位置
            const tab = "  ";
            // テキストエリアの値を更新して、タブ文字を挿入
            this.value = this.value.substring(0, start) + tab + this.value.substring(end);

            // カーソル位置をタブの後ろに移動
            this.selectionStart = this.selectionEnd = start + 2;
        }
    });
});


// カレンダーハイライトをロードする関数
function loadCalendarHighlights() {
    if (!dp) {
        console.error("Datepicker is not initialized yet."); // Datepickerが初期化されていない場合のエラー
        return;
    }

    dp.update(); // カレンダーの表示をクリア
    clearCalendarExistsMarks(); // データ存在マーカー削除
    db.all("SELECT date FROM entries", [], (err, rows) => {
        if (err) {
            console.error('Error loading dates:', err.message); // 日付ロード時のエラー表示
            return;
        }
        rows.forEach(row => {
            const storedDate = new Date(row.date); // データベースから取得した日付をDateオブジェクトに変換
            const normalizedDate = stripTime(storedDate).getTime(); // UTCの日付に変換してからUnixタイムスタンプに
            // appendSystemMessage(storedDate + " (" + normalizedDate + ")"); // システムメッセージとして日付情報を表示

            const dayElements = document.querySelectorAll(`.datepicker [data-date="${normalizedDate}"]`);
            dayElements.forEach(dayElement => {
                dayElement.classList.add('date-set'); // アンダーラインを追加
            });
        });
    });
}

function clearCalendarExistsMarks() {
    const cells = document.querySelectorAll('.datepicker [data-date]'); // data-date属性を持つすべてのカレンダーセルを選択
    cells.forEach(cell => {
       cell.classList.remove('date-set');
    });
}

// カレンダーの各セルからデータを抽出し、日付変換を行う関数
function extractAndConvertCellData() {
    const cells = document.querySelectorAll('.datepicker [data-date]'); // data-date属性を持つすべてのカレンダーセルを選択
    const cellData = [];

    cells.forEach(cell => {
        const unixTimestamp = parseInt(cell.dataset.date); // セルのdata-date属性からUnixタイムスタンプを取得

        if (!Number.isFinite(unixTimestamp)) { // 取得したUnixタイムスタンプが有効な数値でなければエラーを記録
            console.error("Invalid Unix timestamp:", cell.textContent.trim());
            return; // このセルをスキップ
        }

        const { utcDateString, jstDateString } = convertTimestampToDate(unixTimestamp); // タイムスタンプをUTCとJSTの日付に変換
        cellData.push({
            dataDate: cell.getAttribute('data-date'), // セルのdata-date属性
            unixTimestamp, // Unixタイムスタンプ
            utcDateString, // UTC日付文字列
            jstDateString // JST日付文字列
        });
    });

    return cellData; // 抽出したデータを返す
}

// UnixタイムスタンプをUTCとJSTの日付に変換する関数
function convertTimestampToDate(unixTimestamp) {
    if (!Number.isFinite(unixTimestamp)) { // 有効な数値でない場合はエラーメッセージを返す
        console.error("Invalid timestamp:", unixTimestamp);
        return { utcDateString: "Invalid date", jstDateString: "Invalid date" };
    }

    const utcDate = new Date(unixTimestamp); // UnixタイムスタンプからUTCのDateオブジェクトを生成

    if (isNaN(utcDate.getTime())) { // Dateオブジェクトが無効な日付であればエラーを返す
        console.error("Failed to convert timestamp to Date:", unixTimestamp);
        return { utcDateString: "Invalid date", jstDateString: "Invalid date" };
    }

    const utcDateString = utcDate.toISOString().split('T')[0]; // UTCの日付文字列
    const jstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000)); // UTCからJSTに変換
    const jstDateString = jstDate.toISOString().split('T')[0]; // JSTの日付文字列

    return { utcDateString, jstDateString };
}

// 時分秒を取り除いて日付のみを取得する関数
function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 年、月、日のみのDateオブジェクトを生成
}

// 指定された日付のエントリをロードする関数
function loadEntry(date) {
    db.get("SELECT entry FROM entries WHERE date = ?", [date], (err, row) => {
        if (err) { // エントリのロード中にエラーが発生した場合
            console.error('Error loading entry:', err.message);
            return;
        }
        document.getElementById('entry-box').value = row ? row.entry : ''; // テキストエリアにエントリを設定
        document.getElementById('entry-box').dataset.date = date; // テキストエリアのdata-date属性を更新
    });
}

// エントリをデータベースに保存または削除する関数
function saveEntry() {
    const entryText = document.getElementById('entry-box').value.trim(); // テキストエリアからテキストを取得し、空白をトリム
    const date = document.getElementById('entry-box').dataset.date; // テキストエリアのdata-date属性から日付を取得

    if (entryText === "") {
        // エントリテキストが空の場合、データベースからその日付のレコードを削除
        db.run("DELETE FROM entries WHERE date = ?", [date], (err) => {
            if (err) { // レコードの削除中にエラーが発生した場合
                console.error('Error deleting entry:', err.message);
                appendSystemMessage('Failed to delete entry.'); // ユーザーに削除失敗を通知
            } else {
                console.log(`Entry deleted for date ${date}`); // 削除成功をコンソールに表示
                appendSystemMessage('Entry deleted successfully.'); // ユーザーに削除成功を通知
                loadCalendarHighlights(); // カレンダーのハイライトを更新
            }
        });
    } else {
        // エントリテキストが空でない場合、データベースにエントリを保存または更新
        db.run("REPLACE INTO entries (date, entry) VALUES (?, ?)", [date, entryText], (err) => {
            if (err) { // エントリの保存中にエラーが発生した場合
                console.error('Error saving entry:', err.message);
                appendSystemMessage('Failed to save entry.'); // ユーザーに保存失敗を通知
            } else {
                console.log(`Entry saved for date ${date}`); // 保存成功をコンソールに表示
                appendSystemMessage('Entry saved successfully.'); // ユーザーに保存成功を通知
                loadCalendarHighlights(); // カレンダーを更新して新しいエントリをハイライト
            }
        });
    }
}

// システムメッセージを画面に表示する関数
function appendSystemMessage(message) {
    const messageDiv = document.getElementById('system-messages'); // メッセージを表示するdiv要素を取得
    const messageP = document.createElement('p'); // 新しい<p>要素を作成
    messageP.style.margin = '0'; // マージンを0に設定
    messageP.textContent = message; // メッセージのテキストを設定
    messageDiv.appendChild(messageP); // 作成した<p>要素をdivに追加
}

// システムメッセージをクリアする
function clearSystemMessage() {
    const messageDiv = document.getElementById('system-messages');
    while (messageDiv.firstChild) {
        messageDiv.removeChild(messageDiv.firstChild);
    }
}