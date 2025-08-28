// Filename: server/src/services/payroll.service.js
const xlsx = require("xlsx");
const path = require('path');
const fs = require('fs').promises;
const databaseManager = require('../core/DatabaseManager');

function calculateProgressivePit(taxableIncome) {
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
}

function parseBonusFile(buffer) {
    const bonusMap = new Map();
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const rows = xlsx.utils
            .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                header: 1,
            })
            .slice(1);
        // robust number parser (handles spaces/commas)
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
                bonusMap.set(normName(name), amount);
            }
        }
    } catch (e) {
        console.error("Lỗi file thưởng:", e);
    }
    return {bonusMap};
}

// New: parse a single Excel file containing many sheets, where each sheet represents a bonus type
function parseMultiSheetBonusFile(buffer) {
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
                    bonusMap.set(normName(name), amount);
                }
            }
            const title = (sheetName || "Thưởng").toString().replace(/_/g, " ").trim();
            bonuses.push({title, bonusMap});
        }
    } catch (e) {
        console.error("Lỗi đọc file thưởng nhiều sheet:", e);
    }
    return bonuses;
}

function parseDependentsFile(buffer) {
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
                dependentsMap.set(key, count);
            }
        }
    } catch (e) {
        console.error("Lỗi file NPT:", e);
    }
    return dependentsMap;
}

function parseTruylinhFile(buffer) {
    const truylinhMap = new Map();
    try {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        const allRows = xlsx.utils
            .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                header: 1,
            });

        console.log("=== TRUYLINH FILE ANALYSIS ===");
        console.log("Total rows in file:", allRows.length);
        console.log("Sheet name:", workbook.SheetNames[0]);

        // Log first 15 rows to see the structure
        console.log("=== FIRST 15 ROWS CONTENT ===");
        for (let i = 0; i < Math.min(15, allRows.length); i++) {
            const row = allRows[i] || [];
            console.log(`Row ${i + 1} (${row.length} columns):`, JSON.stringify(row));
        }

        // Log header area around row 7-11 to see column headers
        console.log("=== HEADER AREA (rows 7-11) ===");
        for (let i = 6; i < Math.min(11, allRows.length); i++) {
            const row = allRows[i] || [];
            console.log(`Header Row ${i + 1}:`, JSON.stringify(row));
        }

        // Helper to parse numbers that may contain thousand separators
        const toNumber = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return val;
            const cleaned = val.toString().replace(/[\s,]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        };

        // Start from row 12 (index 11) based on the image structure
        const startIndex = 11;
        console.log("=== DATA PARSING (starting from row 12) ===");
        console.log("Start index:", startIndex, "Total rows:", allRows.length);

        let processedCount = 0;
        let skippedCount = 0;

        for (let i = startIndex; i < allRows.length; i++) {
            const row = allRows[i] || [];
            const stt = row[0]; // Column A - STT

            console.log(`\n--- Processing Row ${i + 1} ---`);
            console.log("Full row content:", JSON.stringify(row));
            console.log("STT (col A):", stt, "Type:", typeof stt);

            // Only process valid data rows (skip blanks/headers)
            if (stt !== undefined && stt !== null && stt !== '') {
                // Based on the image structure:
                const name = row[1]; // Column B (index 1) - Họ và tên
                const columnJ = row[9];  // Column J (index 9) - Raw value
                const columnK = row[10]; // Column K (index 10) - Raw value
                const columnL = row[11]; // Column L (index 11) - Raw value
                const columnM = row[12]; // Column M (index 12) - Raw value

                console.log("Raw values:");
                console.log("  Name (col B):", name, "Type:", typeof name);
                console.log("  Col J (idx 9):", columnJ, "Type:", typeof columnJ);
                console.log("  Col K (idx 10):", columnK, "Type:", typeof columnK);
                console.log("  Col L (idx 11):", columnL, "Type:", typeof columnL);
                console.log("  Col M (idx 12):", columnM, "Type:", typeof columnM);

                // Convert to numbers
                const numJ = toNumber(columnJ);
                const numK = toNumber(columnK);
                const numL = toNumber(columnL);
                const numM = toNumber(columnM);

                console.log("Converted numbers:");
                console.log("  J:", numJ, "K:", numK, "L:", numL, "M:", numM);

                if (name && typeof name === 'string' && name.trim().length > 0) {
                    const normalizedName = name
                        .toString()
                        .normalize('NFD')
                        .replace(/\p{Diacritic}/gu, '')
                        .trim()
                        .toLowerCase();
                    const totalInsurance = numK + numL + numM;

                    truylinhMap.set(normalizedName, {
                        thuNhapChiuThue: numJ,
                        bhxhBhytBhtn: totalInsurance,
                    });

                    console.log(`✓ ADDED: "${name}" -> normalized: "${normalizedName}"`);
                    console.log(`  Thu nhập chịu thuế: ${numJ}`);
                    console.log(`  BHXH+BHYT+BHTN: ${totalInsurance} (${numK}+${numL}+${numM})`);
                    processedCount++;
                } else {
                    console.log(`✗ SKIPPED: Invalid name - "${name}"`);
                    skippedCount++;
                }
            } else {
                console.log(`✗ SKIPPED: Empty STT - "${stt}"`);
                skippedCount++;
            }
        }

        console.log("=== PARSING SUMMARY ===");
        console.log("Processed employees:", processedCount);
        console.log("Skipped rows:", skippedCount);
        console.log("Final map size:", truylinhMap.size);

        // Log all entries in the map
        console.log("=== FINAL TRUYLINH MAP ENTRIES ===");
        for (const [name, data] of truylinhMap) {
            console.log(`"${name}": thuNhap=${data.thuNhapChiuThue}, bhxhBhytBhtn=${data.bhxhBhytBhtn}`);
        }

    } catch (e) {
        console.error("Lỗi file truy lĩnh:", e);
        console.error("Stack trace:", e.stack);
    }
    return truylinhMap;
}

function classifyFiles(files) {
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
    // If truylinh file wasn't identified by name, try content-based detection
    if (!truylinhFile) {
        const looksLikeTruylinh = (buffer) => {
            try {
                const wb = xlsx.read(buffer, { type: 'buffer' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
                // Check a short window starting at row index 11 (row 12)
                let score = 0;
                for (let i = 11; i < Math.min(18, rows.length); i++) {
                    const r = rows[i] || [];
                    const stt = r[0];
                    const name = r[1]; // Column B for name in truylinh structure
                    const j = r[9], k = r[10], l = r[11], m = r[12];
                    const hasName = typeof name === 'string' && name.trim().length > 0;
                    const nums = [j, k, l, m].filter(v => v !== undefined && v !== null && v !== '' && !isNaN(parseFloat((v + '').replace(/[\s,]/g, ''))));
                    if ((typeof stt === 'number' || /^\d+$/.test(String(stt || ''))) && hasName && nums.length >= 2) {
                        score++;
                    }
                }
                return score >= 2; // at least 2 rows matching pattern
            } catch (e) {
                return false;
            }
        };
        for (const f of bonusFiles) {
            if (looksLikeTruylinh(f.buffer)) {
                truylinhFile = f;
                console.log("[DETECT] Content-based TRUYLINH detected:", f.originalname);
                // remove from bonusFiles
                const idx = bonusFiles.indexOf(f);
                if (idx >= 0) bonusFiles.splice(idx, 1);
                break;
            }
        }
    }

    // If payroll file wasn't identified by name, try content-based detection
    if (!payrollFile) {
        const looksLikePayroll = (buffer) => {
            try {
                const wb = xlsx.read(buffer, { type: 'buffer' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
                let score = 0;
                for (let i = 6; i < Math.min(30, rows.length); i++) {
                    const r = rows[i] || [];
                    const stt = r[0];
                    const name = r[1];
                    const numeric12to18 = [12,13,14,15,16,17,18].reduce((cnt, idx) => {
                        const v = r[idx];
                        if (v === undefined || v === null || v === '') return cnt;
                        const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[\s,]/g, ''));
                        return (!isNaN(num) && Math.abs(num) >= 0) ? cnt + 1 : cnt;
                    }, 0);
                    const looksRow = (typeof stt === 'number' || /^\d+$/.test(String(stt || '')))
                        && typeof name === 'string' && name.trim().length > 0
                        && numeric12to18 >= 2; // at least a couple of numeric pay columns
                    if (looksRow) score++;
                }
                return score >= 5; // enough rows that look like payroll lines
            } catch (e) {
                return false;
            }
        };
        for (const f of [...bonusFiles]) {
            if (looksLikePayroll(f.buffer)) {
                payrollFile = f;
                console.log("[DETECT] Content-based PAYROLL detected:", f.originalname);
                const idx = bonusFiles.indexOf(f);
                if (idx >= 0) bonusFiles.splice(idx, 1);
                break;
            }
        }
    }

    console.log(`Classified: payroll=${payrollFile?.originalname}, dependents=${dependentsFile?.originalname}, truylinh=${truylinhFile?.originalname}, bonus=${bonusFiles.length} files`);
    
    if (!payrollFile)
        throw new Error(
            "Bắt buộc phải có file lương (tên file phải chứa chữ 'luong')."
        );
    return {payrollFile, dependentsFile, bonusFiles, truylinhFile};
}

function processPayrollWithBonuses(
    payrollBuffer,
    bonusData = [],
    dependentsMap = new Map(),
    truylinhMap = new Map()
) {
    const workbook = xlsx.read(payrollBuffer, {type: "buffer"});
    //
    const rows = xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1})
        .slice(6);
    const initialResults = [];

    for (const row of rows) {
        const markerCol = (row[1] || '').toString().toLowerCase();
        if (markerCol.includes('tổng cộng')) {
            break; // Stop reading further rows when reaching end markers
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
            const soNguoiPhuThuoc = dependentsMap.get(normalizedName) || 0;
            
            // Get truylinh data for this employee
            const truylinhData = truylinhMap.get(normalizedName) || { thuNhapChiuThue: 0, bhxhBhytBhtn: 0 };
            
            // Debug truylinh matching
            if (truylinhData.bhxhBhytBhtn > 0) {
                console.log(`[MATCH] Found truylinh data for ${hoVaTen} (${normalizedName}):`, truylinhData);
            }
            
            let totalBonus = 0;
            const employeeBonuses = {};
            for (const bonus of bonusData) {
                const amount = bonus.bonusMap.get(normalizedName) || 0;
                employeeBonuses[bonus.title] = amount;
                totalBonus += amount;
            }
            const luongV1 = parseFloat(row[12] || 0) + parseFloat(row[13] || 0) + parseFloat(row[14] || 0) + parseFloat(row[15] || 0);
            const docHaiKhoQuy = parseFloat(row[15] || 0);
            const tongBaoHiem = Math.round(
                parseFloat(row[16] || 0) +
                parseFloat(row[17] || 0) +
                parseFloat(row[18] || 0)
            );
            
            // Add truylinh thu nhập chịu thuế to the total
            const tongThuNhapChiuThue = Math.round(luongV1 + totalBonus + truylinhData.thuNhapChiuThue) - docHaiKhoQuy;
            
            const giamTruCaNhan = 11000000;
            const giamTruNguoiPhuThuoc = soNguoiPhuThuoc * 4400000;
            
            // Add truylinh BHXH, BHYT, BHTN to the total deductions
            const tongGiamTru = Math.round(
                giamTruCaNhan + giamTruNguoiPhuThuoc + tongBaoHiem + truylinhData.bhxhBhytBhtn
            );
            
            // Log calculation details for employees with truylinh data
            if (truylinhData.bhxhBhytBhtn > 0) {
                console.log(`[CALC] ${hoVaTen}: luongV1=${luongV1}, totalBonus=${totalBonus}, truylinhThuNhap=${truylinhData.thuNhapChiuThue}, tongThuNhapChiuThue=${tongThuNhapChiuThue}`);
                console.log(`[CALC] ${hoVaTen}: tongBaoHiem=${tongBaoHiem}, truylinhBHXH=${truylinhData.bhxhBhytBhtn}, tongGiamTru=${tongGiamTru}`);
            }
            
            const thuNhapTinhThue = Math.round(
                Math.max(0, tongThuNhapChiuThue - tongGiamTru)
            );
            const tongThueTNCN = calculateProgressivePit(thuNhapTinhThue);
            
            const employeeResult = {
                STT: cellValue,
                "HỌ VÀ TÊN": hoVaTen,
                "CHỨC VỤ": row[2] || "",
                "LƯƠNG V1": luongV1,
                "ĐHKQ": docHaiKhoQuy,
                ...employeeBonuses,
                "TỔNG THU NHẬP CHỊU THUẾ": tongThuNhapChiuThue,
                "BHXH, BHYT, BHTN": tongBaoHiem,
                "BHXH, BHYT, BHTN TRUY LĨNH": truylinhData.bhxhBhytBhtn,
                "NGƯỜI PHỤ THUỘC SL": soNguoiPhuThuoc,
                "SỐ TIỀN GIẢM TRỪ": giamTruNguoiPhuThuoc,
                "GIẢM TRỪ BẢN THÂN": giamTruCaNhan,
                "TỔNG SỐ TIỀN GIẢM TRỪ": tongGiamTru,
                "THU NHẬP TÍNH THUẾ": thuNhapTinhThue,
                "TỔNG THUẾ TNCN TẠM TÍNH": tongThueTNCN,
            };
            
            // Log final result for employees with truylinh data
            if (truylinhData.bhxhBhytBhtn > 0) {
                console.log(`[RESULT] ${hoVaTen}: BHXH_BHYT_BHTN_TRUY_LINH = ${employeeResult["BHXH, BHYT, BHTN TRUY LĨNH"]}`);
            }
            
            initialResults.push(employeeResult);
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
    // After computing department subtotals, append a final grand-total row:
    // - Column B ("HỌ VÀ TÊN"): label 'Tổng có HĐ lao động'
    // - Column C ("CHỨC VỤ"): the last numeric value in 'STT' column (interpreted as employee count)
    // - From Column D onward: sum across all department subtotal rows
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
    return initialResults;
}

function processUploadedFiles(files) {
    try {
        const {payrollFile, dependentsFile, bonusFiles, truylinhFile} = classifyFiles(files);
        const dependentsMap = dependentsFile
            ? parseDependentsFile(dependentsFile.buffer)
            : new Map();
        const truylinhMap = truylinhFile
            ? parseTruylinhFile(truylinhFile.buffer)
            : new Map();
        // Support: either many individual bonus files (legacy) or ONE bonus file with MANY sheets (new flow)
        let bonusData = [];
        for (const file of bonusFiles) {
            const parsedSheets = parseMultiSheetBonusFile(file.buffer);
            if (parsedSheets.length > 0) {
                bonusData.push(...parsedSheets);
            } else {
                // fallback to legacy single-sheet parsing
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
        
        // Log summary of truylinh data in final results
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
}

function processUpdate(existingReportBuffer, newBonusBuffer, newBonusTitle) {
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
    // Logic tính tổng lại cho file cập nhật
    // ...
    return {
        data: updatedResults,
        bonusTitles: [...existingBonusTitles, newBonusTitle],
    };
}

// Orchestration service errors
class ServiceError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ServiceError';
        this.status = status;
    }
}

function getFileType(filename) {
    const name = (filename || '').toLowerCase();
    if (name.includes('luong v1') || name.includes('salary')) return 'salary';
    if (name.includes('thuong') || name.includes('bonus')) return 'bonus';
    if (name.includes('phuthuoc') || name.includes('dependent')) return 'dependent';
    return 'salary'; // default
}

function buildWorksheetBufferFromData(data, bonusTitles, sheetName = 'Kết quả tính thuế') {
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
}

async function generatePayrollFileForSession(sessionId, files) {
    if (!files || files.length === 0) {
        throw new ServiceError(400, 'Vui lòng tải lên ít nhất một file.');
    }

    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findById(parseInt(sessionId));
    if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import.');

    await repositories.importSessions.updateStatus(parseInt(sessionId), 'processing');

    // Save file info
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
}

async function previewPayrollForSession(sessionId, files) {
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
}

function updatePayrollReport(existingReportBuffer, newBonusBuffer, newBonusTitle = 'Thưởng bổ sung') {
    const result = processUpdate(existingReportBuffer, newBonusBuffer, newBonusTitle);
    const { data, bonusTitles } = result;
    const buffer = buildWorksheetBufferFromData(data, bonusTitles, 'Kết quả tính thuế');
    const filename = 'Bang_luong_cap_nhat.xlsx';
    return { buffer, filename };
}

function calculatePayrollToBuffer(files) {
    const result = processUploadedFiles(files);
    if (result.error) {
        throw new ServiceError(400, result.error);
    }
    const { buffer, filename, bonusTitles } = result;
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { buffer, filename, contentType };
}

module.exports = {processUploadedFiles, processUpdate, ServiceError, generatePayrollFileForSession, previewPayrollForSession, updatePayrollReport, calculatePayrollToBuffer};
