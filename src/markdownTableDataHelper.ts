import { workspace } from "vscode";
import MarkdownTableData from './markdownTableData';
import * as Utility from './markdownTableUtility';


/**
* テーブルを表すマークダウンテキストを MarkdownTableData に変換する
* @param tableText テーブルを表すマークダウンテキスト
*/
export function stringToTableData(tableText: string): MarkdownTableData {
    const lines = tableText.split(/\r\n|\n|\r/);

    let getIndent = (linestr: string) => {
        if (linestr.trim().startsWith('|')) {
            let linedatas = linestr.split('|');
            return linedatas[0];
        }
        else {
            return '';
        }
    };

    // 1行目
    const columns = Utility.splitline(lines[0], 0);
    const columnNum = columns.length;
    const indent = getIndent(lines[0]);

    // 2行目の寄せ記号
    let aligns: [string, string][] = new Array();
    let alignTexts: string[] = new Array();
    const aligndatas = Utility.splitline(lines[1], columnNum, '---');
    for (let i = 0; i < columnNum; i++) {
        alignTexts[i] = aligndatas[i];
        let celldata = aligndatas[i].trim();
        aligns[i] = [celldata[0], celldata.slice(-1)];
    }

    // セルの値を取得
    const cells: string[][] = new Array();
    const leftovers: string[] = new Array();
    let cellrow = -1;
    for (let row = 2; row < lines.length; row++) {
        cellrow++;

        const linedatas = Utility.splitline(lines[row], columnNum);
        cells[cellrow] = linedatas.slice(0, columnNum);

        // あまりデータを収集する
        leftovers[cellrow] = '';
        if (linedatas.length > columnNum) {
            const leftoverdatas = linedatas.slice(columnNum, linedatas.length);
            leftovers[cellrow] = leftoverdatas.join('|');
        }
    }

    return new MarkdownTableData(tableText, aligns, alignTexts, columns, cells, leftovers, indent);
}

function CreateMarkdownTableData(_text: string, _aligns: [string, string][], _columns: string[], _cells: string[][], _leftovers: string[], _indent: string): MarkdownTableData {
    let alignTexts: string[] = new Array();
    for (let column = 0; column < _aligns.length; column++) {
        alignTexts[column] = _aligns[column][0] + '-' + _aligns[column][1];
    }
    return new MarkdownTableData(_text, _aligns, alignTexts, _columns, _cells, _leftovers, _indent);
}

function convertSeparatedValuesToTableData(text: string, separater: string): MarkdownTableData {
    // 入力データを行ごとに分割する
    let lines = text.split(/\r\n|\n|\r/);
    // カラムデータ
    let columns: string[] = new Array();
    let columntexts = lines[0].split(separater);
    // カラム数
    let columnCount = columntexts.length;

    for (let i = 0; i < columnCount; i++) {
        columns[i] = columntexts[i].trim();
    }

    // 入力データから改行とタブで分割した2次元配列を生成する
    let cells: string[][] = new Array();
    // カラム数よりもはみ出たデータ
    let leftovers: string[] = new Array();
    for (let row = 1; row < lines.length; row++) {
        // 各セルの値
        cells[row - 1] = new Array();
        // 行内のデータが足りない場合に備えて空白文字で埋める
        for (let column = 0; column < columnCount; column++) {
            cells[row - 1][column] = ' ';
        }

        // 余りデータを初期化
        leftovers[row - 1] = '';

        // 行データをタブで分割
        let lineValues = lines[row].split(separater);

        // 実際の値に置き換える
        for (let column = 0; column < lineValues.length; column++) {
            if (column >= columnCount) {
                // カラムヘッダーよりも多い場合ははみ出しデータ配列に保存
                leftovers[row - 1] += separater + lineValues[column];
                continue;
            }
            cells[row - 1][column] = lineValues[column].trim();
        }
    }

    // 表の寄せ記号
    let aligns: [string, string][] = new Array();
    for (let column = 0; column < columnCount; column++) {
        // 全部左寄せ
        aligns[column] = [':', '-'];
    }

    const table = CreateMarkdownTableData("", aligns, columns, cells, leftovers, '');
    return CreateMarkdownTableData(toFormatTableStr(table), aligns, columns, cells, leftovers, '');
}

/**
* タブ区切りテキスト（TSV）を MarkdownTableData に変換する
* @param tableText タブ区切りテキスト
*/
export function tsvToTableData(tsvText: string): MarkdownTableData {
    return convertSeparatedValuesToTableData(tsvText, '\t');
}

/**
* カンマ区切りテキスト（CSV）を MarkdownTableData に変換する
* @param tableText タブ区切りテキスト
*/
export function csvToTableData(csvText: string): MarkdownTableData {
    return convertSeparatedValuesToTableData(csvText, ',');
}

/**
 * MarkdownTableData に行を追加
 * @param tableData 
 * @param insertAt 
 * @returns 
 */
export function insertRow(tableData: MarkdownTableData, insertAt: number): MarkdownTableData {
    const columns = tableData.columns;
    const aligns = tableData.aligns;
    const cells = tableData.cells;
    const leftovers = tableData.leftovers;
    const column_num = tableData.columns.length;
    const indent = tableData.indent;

    cells.splice(insertAt, 0, Array.from({ length: column_num }, () => '  '));
    leftovers.splice(insertAt, 0, '');

    const text = tableData.originalText + '\n' + tableData.indent + '|' + '  |'.repeat(tableData.columns.length);

    return CreateMarkdownTableData(text, aligns, columns, cells, leftovers, indent);
}

export function insertColumn(tableData: MarkdownTableData, insertAt: number): MarkdownTableData {
    let columns = tableData.columns;
    let aligns = tableData.aligns;
    let cells = tableData.cells;
    let leftovers = tableData.leftovers;
    let column_num = tableData.columns.length;
    let indent = tableData.indent;

    columns.splice(insertAt, 0, '');
    aligns.splice(insertAt, 0, ['-', '-']);
    for (let i = 0; i < cells.length; i++) {
        cells[i].splice(insertAt, 0, '');
    }

    const table = CreateMarkdownTableData("", aligns, columns, cells, leftovers, indent);
    return CreateMarkdownTableData(toFormatTableStr(table), aligns, columns, cells, leftovers, indent);
}

/**
 * 各列の最大文字数を調べる
 * @param tableData テーブルデータ
 * @returns 
 */
export function getColumnMaxWidths(tableData: MarkdownTableData): number[] {
    let columnNum = tableData.columns.length;

    // 各列の最大文字数を調べる
    let maxWidths: number[] = new Array();
    // コラムヘッダーの各項目の文字数
    for (let i = 0; i < tableData.columns.length; i++) {
        let cellLength = Utility.getLen(tableData.columns[i].trim());
        // 表の寄せ記号行は最短で半角3文字なので、各セル最低でも半角3文字
        maxWidths[i] = (3 > cellLength) ? 3 : cellLength;
    }

    for (let row = 0; row < tableData.cells.length; row++) {
        let cells = tableData.cells[row];
        for (let i = 0; i < cells.length; i++) {
            if (i > columnNum) { break; }
            let cellLength = Utility.getLen(cells[i].trim());
            maxWidths[i] = (maxWidths[i] > cellLength) ? maxWidths[i] : cellLength;
        }
    }

    return maxWidths;
}

export function toFormatTableStr(tableData: MarkdownTableData): string {
    const alignData = <boolean>workspace.getConfiguration('markdowntable').get('alignData');
    const alignHeader = <boolean>workspace.getConfiguration('markdowntable').get('alignColumnHeader');
    const paddedDelimiterRowPipes = <boolean>workspace.getConfiguration('markdowntable').get('paddedDelimiterRowPipes');

    // 各列の最大文字数を調べる
    const maxWidths = getColumnMaxWidths(tableData);



    const columnNum = tableData.columns.length;
    const formatted: string[] = new Array();

    // 列幅をそろえていく
    for (let row = 0; row < tableData.cells.length; row++) {
        formatted[row] = '';
        formatted[row] += tableData.indent;
        const cells = tableData.cells[row];
        for (let i = 0; i < columnNum; i++) {
            let celldata = '';
            if (i < cells.length) {
                celldata = cells[i].trim();
            }
            const celldata_length = Utility.getLen(celldata);

            // | の後にスペースを入れる
            formatted[row] += '| ';
            if (alignData) {
                let [front, end] = tableData.aligns[i];
                if (front === ':' && end === ':') {
                    // 中央ぞろえ
                    for (let n = 0; n < (maxWidths[i] - celldata_length) / 2 - 0.5; n++) {
                        formatted[row] += ' ';
                    }
                    formatted[row] += celldata;
                    for (let n = 0; n < (maxWidths[i] - celldata_length) / 2; n++) {
                        formatted[row] += ' ';
                    }
                }
                else if (front === '-' && end === ':') {
                    // 右揃え
                    for (let n = 0; n < maxWidths[i] - celldata_length; n++) {
                        formatted[row] += ' ';
                    }
                    formatted[row] += celldata;
                }
                else {
                    // 左揃え
                    formatted[row] += celldata;
                    for (let n = 0; n < maxWidths[i] - celldata_length; n++) {
                        formatted[row] += ' ';
                    }
                }
            }
            else {
                // データ
                formatted[row] += celldata;
                // 余白を半角スペースで埋める
                for (let n = celldata_length; n < maxWidths[i]; n++) {
                    formatted[row] += ' ';
                }
            }
            // | の前にスペースを入れる
            formatted[row] += ' ';
        }
        formatted[row] += '|';

        // あまりデータを末尾に着ける
        if (tableData.leftovers[row].length > 0) {
            formatted[row] += tableData.leftovers[row];
        }
    }

    // 1行目を成形する
    let columnHeader = '';
    columnHeader += tableData.indent;
    for (let i = 0; i < columnNum; i++) {
        const columnText = tableData.columns[i].trim();
        const columnHeader_length = Utility.getLen(columnText);

        columnHeader += '| ';
        if (alignHeader) {
            const [front, end] = tableData.aligns[i];
            if (front === ':' && end === ':') {
                // 中央ぞろえ
                for (let n = 0; n < (maxWidths[i] - columnHeader_length) / 2 - 0.5; n++) {
                    columnHeader += ' ';
                }
                columnHeader += columnText;
                for (let n = 0; n < (maxWidths[i] - columnHeader_length) / 2; n++) {
                    columnHeader += ' ';
                }
            }
            else if (front === '-' && end === ':') {
                // 右揃え
                for (let n = 0; n < maxWidths[i] - columnHeader_length; n++) {
                    columnHeader += ' ';
                }
                columnHeader += columnText;
            }
            else {
                // 左揃え
                columnHeader += columnText;
                for (let n = 0; n < maxWidths[i] - columnHeader_length; n++) {
                    columnHeader += ' ';
                }
            }

        }
        else {
            columnHeader += columnText;
            // 余白を-で埋める
            for (let n = columnHeader_length; n < maxWidths[i]; n++) {
                columnHeader += ' ';
            }
        }
        columnHeader += ' ';
    }
    columnHeader += '|';


    // 2行目を成形する
    for (let i = 0; i < columnNum; i++) {
        const [front, end] = tableData.aligns[i];
        if (paddedDelimiterRowPipes) {
            tableData.alignTexts[i] = ' ' + front;
        } else {
            tableData.alignTexts[i] = front + '-';
        }
        // 余白を-で埋める
        for (let n = 1; n < maxWidths[i] - 1; n++) {
            tableData.alignTexts[i] += '-';
        }
        if (paddedDelimiterRowPipes) {
            tableData.alignTexts[i] += end + ' ';
        } else {
            tableData.alignTexts[i] += '-' + end;
        }
    }
    let tablemark = '';
    tablemark += tableData.indent;
    for (let i = 0; i < tableData.alignTexts.length; i++) {
        const alignText = tableData.alignTexts[i];
        tablemark += '|' + alignText;
    }
    tablemark += '|';

    formatted.splice(0, 0, columnHeader);
    formatted.splice(1, 0, tablemark);

    return formatted.join('\r\n');
}



// return [line, character]
export function getPositionOfCell(tableData: MarkdownTableData, cellRow: number, cellColumn: number): [number, number] {
    const line = (cellRow <= 0) ? 0 : cellRow;

    const lines = tableData.originalText.split(/\r\n|\n|\r/);
    const linestr = lines[cellRow];

    const cells = Utility.splitline(linestr, tableData.columns.length);

    let character = 0;
    character += tableData.indent.length;
    character += 1;
    for (let i = 0; i < cellColumn; i++) {
        character += cells[i].length;
        character += 1;
    }

    return [line, character];
}

// return [row, column]
export function getCellAtPosition(tableData: MarkdownTableData, line: number, character: number): [number, number] {
    const row = (line <= 0) ? 0 : line;

    const lines = tableData.originalText.split(/\r\n|\n|\r/);
    const linestr = lines[row];

    const cells = Utility.splitline(linestr, tableData.columns.length);

    let column = -1;
    let cell_end = tableData.indent.length;
    for (let cell of cells) {
        column++;
        cell_end += 1 + cell.length;

        if (character <= cell_end) {
            break;
        }
    }

    return [row, column];
}

export function getCellData(tableData: MarkdownTableData, cellRow: number, cellColumn: number): string {
    if (cellRow === 0) {
        return (tableData.columns.length > cellColumn) ? tableData.columns[cellColumn] : "";
    }
    if (cellRow === 1) {
        return (tableData.alignTexts.length > cellColumn) ? tableData.alignTexts[cellColumn] : "";
    }
    if (cellRow >= tableData.cells.length + 2) {
        return "";
    }

    return tableData.cells[cellRow - 2][cellColumn];
}

