const xlsx = require("xlsx");
const path = require('path');
const fs = require('fs').promises;
const databaseManager = require('../config/DatabaseManager');

const calculateProgressivePit = (taxableIncome) => {
    if (taxableIncome <= 0) return 0;
    const TAX_BRACKETS = [
        {limit: 5000000, rate: 0.05},
        {limit: 10000000, rate: 0.1},
        {limit: 18000000, rate: 0.15},
        {limit: 32000000, rate: 0.2},
        {limit: 52000000, rate: 0.25},
        {limit: 80000000, rate: 0.3},
        {limit: Infinity, rate: 0.35},
    ];
    let totalTax = 0;
    let previousLimit = 0;
    for (const bracket of TAX_BRACKETS) {
        if (taxableIncome > previousLimit) {
            const taxableInBracket = Math.min(
                taxableIncome - previousLimit,
                bracket.limit - previousLimit
            );
            totalTax += taxableInBracket * bracket.rate;
            previousLimit = bracket.limit;
        } else break;
    }
    return Math.round(totalTax);
};

const parseBonusFile = (buffer) => {
    const bonusMap = new Map();
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const rows = xlsx.utils
            .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                header: 1,
            })
            .slice(1);
        const toNumber = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return val;
            const cleaned = val.toString().replace(/[\s,]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        };
        const normName = (name) => name
            .toString()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim()
            .toLowerCase();
        for (const row of rows) {
            const name = row[1];
            const amount = toNumber(row[2] || 0);
            if (name && amount > 0) {
                bonusMap.set(normName(name), { name: row[1], amount });
            }
        }
    } catch (e) {
        console.error("Lỗi file thưởng:", e);
    }
    return {bonusMap};
};

const parseMultiSheetBonusFile = (buffer) => {
    const bonuses = [];
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const toNumber = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return val;
            const cleaned = val.toString().replace(/[\s,]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        };
        const normName = (name) => name
            .toString()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim()
            .toLowerCase();
        for (const sheetName of workbook.SheetNames) {
            const rows = xlsx.utils
                .sheet_to_json(workbook.Sheets[sheetName], {header: 1})
                .slice(1);
            const bonusMap = new Map();
            for (const row of rows) {
                const name = row[1];
                const amount = toNumber(row[2] || 0);
                if (name && amount > 0) {
                    bonusMap.set(normName(name), { name: row[1], amount });
                }
            }
            const title = (sheetName || "Thưởng").toString().replace(/_/g, " ").trim();
            bonuses.push({title, bonusMap});
        }
    } catch (e) {
        console.error("Lỗi đọc file thưởng nhiều sheet:", e);
    }
    return bonuses;
};

const parseDependentsFile = (buffer) => {
    const dependentsMap = new Map();
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const rows = xlsx.utils
            .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                header: 1,
            })
            .slice(1);
        for (const row of rows) {
            const name = row[1];
            const count = parseInt(row[2] || 0, 10);
            if (name) {
                const key = name
                    .toString()
                    .normalize('NFD')
                    .replace(/\p{Diacritic}/gu, '')
                    .trim()
                    .toLowerCase();
                dependentsMap.set(key, { name, count });
            }
        }
    } catch (e) {
        console.error("Lỗi file NPT:", e);
    }
    return dependentsMap;
};

const parseTruylinhFile = (buffer) => {
    const truylinhMap = new Map();
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const allRows = xlsx.utils
            .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                header: 1,
            });

        const toNumber = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return val;
            const cleaned = val.toString().replace(/[\s,]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        };

        const startIndex = 11;
        for (let i = startIndex; i < allRows.length; i++) {
            const row = allRows[i] || [];
            const stt = row[0];

            if (stt !== undefined && stt !== null && stt !== '') {
                const name = row[1];
                const columnJ = row[9];
                const columnK = row[10];
                const columnL = row[11];
                const columnM = row[12];

                const numJ = toNumber(columnJ);
                const numK = toNumber(columnK);
                const numL = toNumber(columnL);
                const numM = toNumber(columnM);

                if (name && typeof name === 'string' && name.trim().length > 0) {
                    const normalizedName = name
                        .toString()
                        .normalize('NFD')
                        .replace(/\p{Diacritic}/gu, '')
                        .trim()
                        .toLowerCase();
                    const totalInsurance = numK + numL + numM;

                    truylinhMap.set(normalizedName, {
                        name,
                        thuNhapChiuThue: numJ,
                        bhxhBhytBhtn: totalInsurance,
                    });
                }
            }
        }
    } catch (e) {
        console.error("Lỗi file truy lĩnh:", e);
    }
    return truylinhMap;
};


const classifyFiles = (files) => {
    let payrollFile = null;
    let dependentsFile = null;
    let truylinhFile = null;
    const bonusFiles = [];

    console.log("Classifying files:");
    const norm = (s) => (s || "")
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
    const includesAny = (s, arr) => {
        const ns = norm(s);
        return arr.some(k => ns.includes(norm(k)));
    };

    for (const file of files) {
        const name = file.originalname;
        console.log(`  File: ${file.originalname}`);

        if (includesAny(name, [
            'luong v1', 'lương v1'])) {
            payrollFile = file;
            console.log("    -> PAYROLL");
        } else if (includesAny(name, [
            'npt', 'phu_thuoc', 'phụ thuộc', 'phuthuoc', 'nguoi_phu_thuoc', 'nguoiphuthuoc', 'dependents', 'dependent'
        ])) {
            dependentsFile = file;
            console.log("    -> DEPENDENTS");
        } else if (includesAny(name, ['truylinh', 'truy linh', 'truy_linh'])) {
            truylinhFile = file;
            console.log("    -> TRUYLINH");
        } else {
            bonusFiles.push(file);
            console.log("    -> BONUS");
        }
    }

    if (!payrollFile)
        throw new Error(
            "Bắt buộc phải có file lương (tên file phải chứa chữ 'luong')."
        );
    return {payrollFile, dependentsFile, bonusFiles, truylinhFile};
};

const processPayrollWithBonuses = (
    payrollBuffer,
    bonusData = [],
    dependentsMap = new Map(),
    truylinhMap = new Map()
) => {
    const workbook = xlsx.read(payrollBuffer, {type: "buffer"});
    const rows = xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1})
        .slice(6);
    const initialResults = [];
    const payrollNames = new Set();

    for (const row of rows) {
        const markerCol = (row[1] || '').toString().toLowerCase();
        if (markerCol.includes('tổng cộng')) {
            break;
        }
        const cellValue = row[0];
        if (!cellValue && row[1]) {
            initialResults.push({
                STT: "",
                "HỌ VÀ TÊN": row[1] || "",
                "CHỨC VỤ": "",
            });
        } else if (typeof cellValue === "number") {
            const hoVaTen = row[1] || "";
            const normalizedName = hoVaTen
                .toString()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .trim()
                .toLowerCase();
            payrollNames.add(normalizedName);

            const soNguoiPhuThuoc = (dependentsMap.get(normalizedName) || {}).count || 0;
            const truylinhData = truylinhMap.get(normalizedName) || { thuNhapChiuThue: 0, bhxhBhytBhtn: 0 };

            let totalBonus = 0;
            const employeeBonuses = {};
            for (const bonus of bonusData) {
                const amount = (bonus.bonusMap.get(normalizedName) || {}).amount || 0;
                employeeBonuses[bonus.title] = amount;
                totalBonus += amount;
            }
            const luongV1 = parseFloat(row[12] || 0) + parseFloat(row[13] || 0) + parseFloat(row[14] || 0);
            const docHaiKhoQuy = parseFloat(row[15] || 0);
            const tongBaoHiem = Math.round(
                parseFloat(row[16] || 0) +
                parseFloat(row[17] || 0) +
                parseFloat(row[18] || 0)
            );

            const tongThuNhapChiuThue = Math.round(luongV1 + totalBonus + truylinhData.thuNhapChiuThue) - docHaiKhoQuy;
            const giamTruCaNhan = 11000000;
            const giamTruNguoiPhuThuoc = soNguoiPhuThuoc * 4400000;
            const tongGiamTru = Math.round(
                giamTruCaNhan + giamTruNguoiPhuThuoc + tongBaoHiem + truylinhData.bhxhBhytBhtn
            );
            const thuNhapTinhThue = Math.round(
                Math.max(0, tongThuNhapChiuThue - tongGiamTru)
            );
            const tongThueTNCN = calculateProgressivePit(thuNhapTinhThue);

            initialResults.push({
                STT: cellValue,
                "HỌ VÀ TÊN": hoVaTen,
                "CHỨC VỤ": row[2] || "",
                "LƯƠNG V1": luongV1,
                "ĐHKQ": docHaiKhoQuy,
                ...employeeBonuses,
                "TỔNG THU NHẬP CHỊU THUẾ": tongThuNhapChiuThue,
                "BHXH, BHYT, BHTN": tongBaoHiem,
                "BHXH, BHYT, BHTN TRUY LĨNH": truylinhData.bhxhBhytBhtn,
                "NGƯỜỜI PHỤ THUỘC SL": soNguoiPhuThuoc,
                "SỐ TIỀN GIẢM TRỪ": giamTruNguoiPhuThuoc,
                "GIẢM TRỪ BẢN THÂN": giamTruCaNhan,
                "TỔNG SỐ TIỀN GIẢM TRỪ": tongGiamTru,
                "THU NHẬP TÍNH THUẾ": thuNhapTinhThue,
                "TỔNG THUẾ TNCN TẠM TÍNH": tongThueTNCN,
            });
        }
    }

    let accumulators = {};
    const firstEmployee = initialResults.find(
        (r) => typeof r["STT"] === "number"
    );
    const colsToSum = firstEmployee
        ? Object.keys(firstEmployee).filter(
            (k) =>
                !["STT", "HỌ VÀ TÊN", "CHỨC VỤ"].includes(k) &&
                typeof firstEmployee[k] === "number"
        )
        : [];

    for (const row of initialResults) {
        if (typeof row["STT"] === "number") {
            for (const col of colsToSum) {
                accumulators[col] = (accumulators[col] || 0) + (row[col] || 0);
            }
        } else if (row["HỌ VÀ TÊN"]) {
            for (const [col, total] of Object.entries(accumulators)) {
                row[col] = Math.round(total);
            }
            accumulators = {};
        }
    }

    const departmentSubtotalRows = initialResults.filter(
        (r) => typeof r["STT"] !== "number" && r["HỌ VÀ TÊN"]
    );
    const lastSttValue = initialResults.reduce((last, r) => {
        return typeof r["STT"] === "number" ? r["STT"] : last;
    }, 0);
    const grandTotals = {};
    for (const row of departmentSubtotalRows) {
        for (const col of colsToSum) {
            grandTotals[col] = (grandTotals[col] || 0) + (row[col] || 0);
        }
    }
    const grandTotalRow = {
        STT: "",
        "HỌ VÀ TÊN": "Tổng có HĐ lao động",
        "CHỨC VỤ": lastSttValue,
    };
    for (const col of colsToSum) {
        grandTotalRow[col] = Math.round(grandTotals[col] || 0);
    }
    initialResults.push(grandTotalRow);

    const noContractEmployees = new Map();
    const collectNonPayrollName = (normalizedName, originalName) => {
        if (originalName && !/^\d/.test(originalName.toString().trim()) && !payrollNames.has(normalizedName) && !noContractEmployees.has(normalizedName)) {
            noContractEmployees.set(normalizedName, { name: originalName });
        }
    };
    bonusData.forEach(bonus => {
        bonus.bonusMap.forEach((data, normName) => collectNonPayrollName(normName, data.name));
    });
    dependentsMap.forEach((data, normName) => collectNonPayrollName(normName, data.name));
    truylinhMap.forEach((data, normName) => collectNonPayrollName(normName, data.name));

    let noContractTotalRow = {}; // Define this to be accessible later

    if (noContractEmployees.size > 0) {
        // initialResults.push({ STT: "", "HỌ VÀ TÊN": "Không có HĐ lao động", "CHỨC VỤ": "" });

        const noContractResults = [];
        let sttCounter = 1;
        noContractEmployees.forEach(({ name }, normalizedName) => {
            const soNguoiPhuThuoc = (dependentsMap.get(normalizedName) || {}).count || 0;
            const truylinhData = truylinhMap.get(normalizedName) || { thuNhapChiuThue: 0, bhxhBhytBhtn: 0 };

            let totalBonus = 0;
            const employeeBonuses = {};
            for (const bonus of bonusData) {
                const amount = (bonus.bonusMap.get(normalizedName) || {}).amount || 0;
                employeeBonuses[bonus.title] = amount;
                totalBonus += amount;
            }

            const tongThuNhapChiuThue = Math.round(totalBonus + truylinhData.thuNhapChiuThue);
            const giamTruCaNhan = 0;
            const giamTruNguoiPhuThuoc = soNguoiPhuThuoc * 0;
            const tongGiamTru = Math.round(giamTruCaNhan + giamTruNguoiPhuThuoc + truylinhData.bhxhBhytBhtn);
            const thuNhapTinhThue = Math.round(Math.max(0, tongThuNhapChiuThue - tongGiamTru));
            const tongThueTNCN = Math.round(thuNhapTinhThue * 0.1);

            noContractResults.push({
                STT: sttCounter++,
                "HỌ VÀ TÊN": name,
                "CHỨC VỤ": "",
                "LƯƠNG V1": 0,
                "ĐHKQ": 0,
                ...employeeBonuses,
                "TỔNG THU NHẬP CHỊU THUẾ": tongThuNhapChiuThue,
                "BHXH, BHYT, BHTN": 0,
                "BHXH, BHYT, BHTN TRUY LĨNH": truylinhData.bhxhBhytBhtn,
                "NGƯỜI PHỤ THUỘC SL": soNguoiPhuThuoc,
                "SỐ TIỀN GIẢM TRỪ": giamTruNguoiPhuThuoc,
                "GIẢM TRỪ BẢN THÂN": giamTruCaNhan,
                "TỔNG SỐ TIỀN GIẢM TRỪ": tongGiamTru,
                "THU NHẬP TÍNH THUẾ": thuNhapTinhThue,
                "TỔNG THUẾ TNCN TẠM TÍNH": tongThueTNCN,
            });
        });

        initialResults.push(...noContractResults);

        const noContractTotals = {};
        for (const row of noContractResults) {
            for (const col of colsToSum) {
                noContractTotals[col] = (noContractTotals[col] || 0) + (row[col] || 0);
            }
        }

        noContractTotalRow = {
            STT: "",
            "HỌ VÀ TÊN": "Tổng không có HĐ lao động",
            "CHỨC VỤ": noContractResults.length,
        };
        for (const col of colsToSum) {
            noContractTotalRow[col] = Math.round(noContractTotals[col] || 0);
        }
        initialResults.push(noContractTotalRow);
    }

    // **NEW LOGIC**: Add the final "Tổng cộng" row
    const finalGrandTotalRow = {
        STT: "",
        "HỌ VÀ TÊN": "Tổng cộng",
        "CHỨC VỤ": (grandTotalRow["CHỨC VỤ"] || 0) + (noContractTotalRow["CHỨC VỤ"] || 0),
    };
    for (const col of colsToSum) {
        finalGrandTotalRow[col] = Math.round((grandTotalRow[col] || 0) + (noContractTotalRow[col] || 0));
    }
    initialResults.push(finalGrandTotalRow);

    return initialResults;
};


const processUploadedFiles = (files) => {
    try {
        const {payrollFile, dependentsFile, bonusFiles, truylinhFile} = classifyFiles(files);
        const dependentsMap = dependentsFile
            ? parseDependentsFile(dependentsFile.buffer)
            : new Map();
        const truylinhMap = truylinhFile
            ? parseTruylinhFile(truylinhFile.buffer)
            : new Map();
        let bonusData = [];
        for (const file of bonusFiles) {
            const parsedSheets = parseMultiSheetBonusFile(file.buffer);
            if (parsedSheets.length > 0) {
                bonusData.push(...parsedSheets);
            } else {
                const {bonusMap} = parseBonusFile(file.buffer);
                const title = file.originalname.split(".")[0].replace(/_/g, " ").trim();
                bonusData.push({title, bonusMap});
            }
        }
        const data = processPayrollWithBonuses(
            payrollFile.buffer,
            bonusData,
            dependentsMap,
            truylinhMap
        );

        const employeesWithTruylinh = data.filter(row =>
            typeof row['STT'] === 'number' && row['BHXH, BHYT, BHTN TRUY LĨNH'] > 0
        );
        console.log(`[SUMMARY] Found ${employeesWithTruylinh.length} employees with truylinh data:`);
        employeesWithTruylinh.forEach(emp => {
            console.log(`  ${emp['HỌ VÀ TÊN']}: ${emp['BHXH, BHYT, BHTN TRUY LĨNH']}`);
        });

        return {data, bonusTitles: bonusData.map((b) => b.title)};
    } catch (error) {
        return {error: error.message};
    }
};

const processUpdate = (existingReportBuffer, newBonusBuffer, newBonusTitle) => {
    const {bonusMap: newBonusMap} = parseBonusFile(newBonusBuffer);
    const existingData = xlsx.utils.sheet_to_json(
        xlsx.read(existingReportBuffer).Sheets[
            xlsx.read(existingReportBuffer).SheetNames[0]
            ]
    );
    const updatedResults = [];
    const firstRow = existingData.find((r) => typeof r["STT"] === "number");
    const defaultCols = [
        "STT",
        "HỌ VÀ TÊN",
        "CHỨC VỤ",
        "LƯƠNG V1",
        "TỔNG THU NHẬP CHỊU THUẾ",
        "BHXH, BHYT, BHTN",
        "NGƯỜI PHỤ THUỘC SL",
        "SỐ TIỀN GIẢM TRỪ",
        "GIẢM TRỪ BẢN THÂN",
        "TỔNG SỐ TIỀN GIẢM TRỪ",
        "THU NHẬP TÍNH THUẾ",
        "TỔNG THUẾ TNCN TẠM TÍNH",
    ];
    const existingBonusTitles = firstRow
        ? Object.keys(firstRow).filter((k) => !defaultCols.includes(k))
        : [];

    for (const row of existingData) {
        if (typeof row["STT"] === "number") {
            const normalizedName = (row["HỌ VÀ TÊN"] || "")
                .toString()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .trim()
                .toLowerCase();
            let oldTotalBonus = 0;
            const oldBonuses = {};
            for (const title of existingBonusTitles) {
                const amount = parseFloat(row[title] || 0);
                oldBonuses[title] = amount;
                oldTotalBonus += amount;
            }
            const newBonusAmount = newBonusMap.get(normalizedName) || 0;
            const luongV1 = parseFloat(row["LƯƠNG V1"] || 0);
            const soNguoiPhuThuoc = parseInt(
                row["NGƯỜI PHỤ THUỘC SL"] || 0,
                10
            );
            const tongBaoHiem = parseFloat(row["BHXH, BHYT, BHTN"] || 0);
            const tongThuNhapChiuThue = Math.round(
                luongV1 + oldTotalBonus + newBonusAmount
            );
            const giamTruNguoiPhuThuoc = soNguoiPhuThuoc * 4400000;
            const tongGiamTru = Math.round(
                11000000 + giamTruNguoiPhuThuoc + tongBaoHiem
            );
            const thuNhapTinhThue = Math.round(
                Math.max(0, tongThuNhapChiuThue - tongGiamTru)
            );
            updatedResults.push({
                ...row,
                ...oldBonuses,
                [newBonusTitle]: newBonusAmount,
                "TỔNG THU NHẬP CHỊU THUẾ": tongThuNhapChiuThue,
                "TỔNG SỐ TIỀN GIẢM TRỪ": tongGiamTru,
                "THU NHẬP TÍNH THUẾ": thuNhapTinhThue,
                "TỔNG THUẾ TNCN TẠM TÍNH":
                    calculateProgressivePit(thuNhapTinhThue),
            });
        } else {
            updatedResults.push(row);
        }
    }

    return {
        data: updatedResults,
        bonusTitles: [...existingBonusTitles, newBonusTitle],
    };
};

class ServiceError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ServiceError';
        this.status = status;
    }
}

const getFileType = (filename) => {
    const name = (filename || '').toLowerCase();
    if (name.includes('luong v1') || name.includes('salary')) return 'salary';
    if (name.includes('thuong') || name.includes('bonus')) return 'bonus';
    if (name.includes('phuthuoc') || name.includes('dependent')) return 'dependent';
    return 'salary';
};

const buildWorksheetBufferFromData = (data, bonusTitles, sheetName = 'Kết quả tính thuế') => {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const headers = Object.keys(data[0] || {});
    const range = xlsx.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const rowData = data[R - 1] || {};
        const isDeptRow = typeof rowData['STT'] !== 'number';

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = xlsx.utils.encode_cell({ r: R, c: C });
            let cell = worksheet[cell_address];
            if (!cell) { cell = worksheet[cell_address] = { t: 's', v: '' }; }

            if (isDeptRow) {
                if (!cell.s) cell.s = {};
                if (!cell.s.font) cell.s.font = {};
                cell.s.font.bold = true;
            }

            const currencyFormat = '#,##0';
            const currencyColumns = [
                'LƯƠNG V1', 'ĐHKQ', 'TỔNG THU NHẬP CHỊU THUẾ', 'BHXH, BHYT, BHTN',
                'SỐ TIỀN GIẢM TRỪ', 'GIẢM TRỪ BẢN THÂN', 'TỔNG SỐ TIỀN GIẢM TRỪ',
                'THU NHẬP TÍNH THUẾ', 'TỔNG THUẾ TNCN TẠM TÍNH',
                ...(bonusTitles || [])
            ];
            const header = headers[C];
            if (currencyColumns.includes(header) && cell.t === 'n') {
                cell.z = currencyFormat;
            }
        }
    }

    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
    const buffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
};

const generatePayrollFileForSession = async (sessionId, files) => {
    if (!files || files.length === 0) {
        throw new ServiceError(400, 'Vui lòng tải lên ít nhất một file.');
    }

    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findById(parseInt(sessionId));
    if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import.');

    await repositories.importSessions.updateStatus(parseInt(sessionId), 'processing');

    for (const file of files) {
        await repositories.importedFiles.create({
            session_id: parseInt(sessionId),
            original_filename: file.originalname,
            file_type: getFileType(file.originalname),
            file_size: file.size,
        });
    }

    await repositories.importSessions.updateById(parseInt(sessionId), { file_count: files.length });

    const result = processUploadedFiles(files);
    if (result.error) {
        await repositories.importSessions.updateStatus(parseInt(sessionId), 'failed');
        throw new ServiceError(400, result.error);
    }

    const { data, bonusTitles } = result;
    const buffer = buildWorksheetBufferFromData(data, bonusTitles, 'Kết quả tính thuế');

    const resultsDir = path.join(__dirname, '../../results');
    await fs.mkdir(resultsDir, { recursive: true });
    const filename = `Bang_luong_${session.month}.xlsx`;
    const filePath = path.join(resultsDir, filename);
    const relativePath = `results/${filename}`;
    await fs.writeFile(filePath, buffer);

    await repositories.importSessions.setResultFile(parseInt(sessionId), relativePath);

    return { buffer, filename, relativePath };
};

const previewPayrollForSession = async (sessionId, files) => {
    if (!files || files.length === 0) {
        throw new ServiceError(400, 'Vui lòng tải lên ít nhất một file.');
    }

    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findById(parseInt(sessionId));
    if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import.');

    const result = processUploadedFiles(files);
    if (result.error) throw new ServiceError(400, result.error);

    const { data, bonusTitles } = result;
    const employeeRows = data.filter(row => typeof row['STT'] === 'number');
    const departmentRows = data.filter(row => typeof row['STT'] !== 'number' && row['HỌ VÀ TÊN']);

    return {
        sessionId,
        month: session.month,
        totalRows: data.length,
        data,
        bonusTitles,
        summary: {
            totalEmployees: employeeRows.length,
            totalDepartments: departmentRows.length - 1,
            totalTax: data.reduce((sum, row) => sum + (row['TỔNG THUẾ TNCN TẠM TÍNH'] || 0), 0),
            totalSalary: data.reduce((sum, row) => sum + (row['LƯƠNG V1'] || 0), 0),
            totalIncome: data.reduce((sum, row) => sum + (row['TỔNG THU NHẬP CHỊU THUẾ'] || 0), 0),
        },
        columns: data.length > 0 ? Object.keys(data[0]) : [],
    };
};

const updatePayrollReport = (existingReportBuffer, newBonusBuffer, newBonusTitle = 'Thưởng bổ sung') => {
    const result = processUpdate(existingReportBuffer, newBonusBuffer, newBonusTitle);
    const { data, bonusTitles } = result;
    const buffer = buildWorksheetBufferFromData(data, bonusTitles, 'Kết quả tính thuế');
    const filename = 'Bang_luong_cap_nhat.xlsx';
    return { buffer, filename };
};

const calculatePayrollToBuffer = (files) => {
    const result = processUploadedFiles(files);
    if (result.error) {
        throw new ServiceError(400, result.error);
    }
    const { buffer, filename, bonusTitles } = result;
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { buffer, filename, contentType };
};

module.exports = {processUploadedFiles, processUpdate, ServiceError, generatePayrollFileForSession, previewPayrollForSession, updatePayrollReport, calculatePayrollToBuffer};