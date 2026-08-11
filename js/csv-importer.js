/**
 * ระบบดูแลช่วยเหลือนักเรียน - CSV Importer & Exporter Module v6.0
 * รองรับการนำเข้าข้อมูลรายชื่อนักเรียน หลายไฟล์ หลายห้อง หลายชั้น
 * พร้อมระบบตรวจสอบข้อผิดพลาดครบถ้วน
 */

class CSVImporter {
    constructor() {
        this.GRADES = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6','ปวช.1','ปวช.2','ปวช.3'];
        this.HEADER_NAMES = {
            number:    ['เลขที่', 'ลำดับ', 'no', 'number', '#'],
            studentId: ['รหัสประจำตัว', 'รหัสนักเรียน', 'เลขประจำตัว', 'id', 'studentid', 'รหัส'],
            fullName:  ['ชื่อ-สกุล', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล', 'ชื่อ', 'name', 'fullname'],
            grade:     ['ระดับชั้น', 'ชั้น', 'grade', 'ระดับ'],
            room:      ['ห้อง', 'ห้องเรียน', 'room', 'class'],
            advisors:  ['ครูที่ปรึกษา', 'ครูประจำชั้น', 'ที่ปรึกษา', 'advisor', 'teacher']
        };
    }

    // ====================================================================
    // GRADE / ROOM NORMALIZERS
    // ====================================================================

    normalizeGrade(g) {
        if (!g) return null;
        const str = String(g).trim().replace(/["'＂]/g, '').replace(/^\uFEFF/, '');
        if (!str) return null;
        if (str.includes('ม.1') || str.includes('มัธยมศึกษาปีที่ 1')) return 'ม.1';
        if (str.includes('ม.2') || str.includes('มัธยมศึกษาปีที่ 2')) return 'ม.2';
        if (str.includes('ม.3') || str.includes('มัธยมศึกษาปีที่ 3')) return 'ม.3';
        if (str.includes('ม.4') || str.includes('มัธยมศึกษาปีที่ 4')) return 'ม.4';
        if (str.includes('ม.5') || str.includes('มัธยมศึกษาปีที่ 5')) return 'ม.5';
        if (str.includes('ม.6') || str.includes('มัธยมศึกษาปีที่ 6')) return 'ม.6';
        if (str.includes('ปวช.1') || str.includes('ปวช1')) return 'ปวช.1';
        if (str.includes('ปวช.2') || str.includes('ปวช2')) return 'ปวช.2';
        if (str.includes('ปวช.3') || str.includes('ปวช3')) return 'ปวช.3';
        if (str.startsWith('ม.')) return str;
        return null;
    }

    normalizeRoom(r) {
        if (!r) return null;
        const str = String(r).trim().replace(/["'＂]/g, '');
        const digits = str.replace(/\D/g, '');
        const num = parseInt(digits, 10);
        if (!isNaN(num) && num > 0 && num <= 99) return String(num);
        return null;
    }

    // Parses combined grade/room strings like "ม.1/2", "ม.1 ห้อง 2", "102", "1/2"
    parseGradeAndRoom(str) {
        if (!str) return { grade: null, room: null };
        const clean = String(str).trim().replace(/^\uFEFF/, '');

        // Pattern "ม.1/2" or "ม.1 ห้อง 2" or "1/2"
        const slashMatch = clean.match(/[ม.]*(\d)\s*[\/ห้อง\s]+(\d+)/);
        if (slashMatch) {
            return { grade: `ม.${slashMatch[1]}`, room: String(parseInt(slashMatch[2], 10)) };
        }

        const nums = clean.match(/\d+/g) || [];
        if (nums.length >= 2) {
            return { grade: `ม.${nums[0]}`, room: String(parseInt(nums[1], 10)) };
        }
        if (nums.length === 1) {
            const num = parseInt(nums[0], 10);
            if (num >= 101 && num <= 699) {
                return { grade: `ม.${Math.floor(num / 100)}`, room: String(num % 100) };
            }
        }
        return { grade: clean.startsWith('ม.') ? clean : null, room: null };
    }

    // ====================================================================
    // HEADER DETECTION (Automatic Column Mapping)
    // ====================================================================

    detectHeaderMap(headerLine) {
        const cols = this.parseCSVLine(headerLine);
        const map = { number: -1, studentId: -1, fullName: -1, grade: -1, room: -1, advisors: -1 };

        cols.forEach((col, idx) => {
            const colLower = (col || '').trim().toLowerCase().replace(/\s+/g, '');
            for (const [field, aliases] of Object.entries(this.HEADER_NAMES)) {
                if (map[field] === -1 && aliases.some(a => colLower.includes(a.toLowerCase().replace(/\s+/g, '')))) {
                    map[field] = idx;
                }
            }
        });
        return { map, totalCols: cols.length };
    }

    // Check if a line looks like a data header (not student data)
    isHeaderLine(line) {
        const cols = this.parseCSVLine(line);
        const firstCol = (cols[0] || '').trim().toLowerCase();
        return ['เลขที่', 'ลำดับ', 'รหัส', 'ชื่อ', 'no', '#', 'number', 'id'].some(k => firstCol.includes(k));
    }

    // ====================================================================
    // ROW PARSER (Smart, handles missing columns)
    // ====================================================================

    parseStudentRow(cols, headerMap, lineIdx, defaultGrade, defaultRoom) {
        const get = (idx) => idx >= 0 && idx < cols.length ? (cols[idx] || '').trim().replace(/^"|"$/g, '') : '';

        // Use header-detected positions
        let number    = headerMap.number    >= 0 ? get(headerMap.number)    : (cols[0] || '').trim();
        let studentId = headerMap.studentId >= 0 ? get(headerMap.studentId) : '';
        let fullName  = headerMap.fullName  >= 0 ? get(headerMap.fullName)  : '';
        let gradeRaw  = headerMap.grade     >= 0 ? get(headerMap.grade)     : '';
        let roomRaw   = headerMap.room      >= 0 ? get(headerMap.room)      : '';
        let advisors  = headerMap.advisors  >= 0 ? get(headerMap.advisors)  : '';

        // If header map didn't detect both grade and room, smart positional detection
        if (headerMap.grade < 0 || headerMap.room < 0) {
            const cleaned = cols.map(c => (c || '').trim().replace(/^"|"$/g, ''));

            // Fallback for number/studentId/fullName if not mapped
            if (headerMap.studentId < 0 && headerMap.fullName < 0) {
                number    = cleaned[0] || '';
                studentId = cleaned[1] || '';
                fullName  = cleaned[2] || '';
            }

            // Inspect trailing columns after fullName (index 3 onwards)
            const nameIdx = headerMap.fullName >= 0 ? headerMap.fullName : 2;
            const trailing = cleaned.slice(nameIdx + 1).filter(v => v !== '');

            if (trailing.length >= 3) {
                const gNorm = this.normalizeGrade(trailing[0]);
                if (gNorm) {
                    gradeRaw = trailing[0];
                    roomRaw = trailing[1];
                    advisors = trailing[2];
                } else {
                    roomRaw = trailing[0];
                    advisors = trailing[1];
                }
            } else if (trailing.length === 2) {
                const v0 = trailing[0];
                const v1 = trailing[1];
                const gNorm = this.normalizeGrade(v0);

                if (gNorm) {
                    gradeRaw = v0;
                    roomRaw = v1;
                } else if (v0.includes('/') || v0.includes('ห้อง')) {
                    const parsed = this.parseGradeAndRoom(v0);
                    gradeRaw = parsed.grade || '';
                    roomRaw = parsed.room || '';
                    advisors = v1;
                } else {
                    // Col 4 is room (e.g., '1', '2'), Col 5 is teacher/advisor
                    roomRaw = v0;
                    advisors = v1;
                }
            } else if (trailing.length === 1) {
                const v0 = trailing[0];
                const gNorm = this.normalizeGrade(v0);
                if (gNorm) {
                    gradeRaw = v0;
                } else {
                    const parsed = this.parseGradeAndRoom(v0);
                    if (parsed.grade) gradeRaw = parsed.grade;
                    if (parsed.room) roomRaw = parsed.room;
                    if (!parsed.grade && !parsed.room && /^\d+$/.test(v0)) {
                        roomRaw = v0;
                    }
                }
            }
        }

        // Normalize grade and room
        let grade = this.normalizeGrade(gradeRaw);
        let room  = this.normalizeRoom(roomRaw);

        // If grade contains combined value like "ม.1/2"
        if (!room && gradeRaw && (gradeRaw.includes('/') || gradeRaw.includes('ห้อง'))) {
            const parsed = this.parseGradeAndRoom(gradeRaw);
            grade = this.normalizeGrade(parsed.grade) || grade;
            room  = this.normalizeRoom(parsed.room)   || room;
        }

        // Apply defaults from file-level setting
        if (!grade) grade = defaultGrade || 'ม.1';
        if (!room)  room  = defaultRoom  || '1';

        // Clean student name
        fullName = fullName.replace(/\s+/g, ' ').trim();

        return {
            id:        'STD_' + Date.now() + '_' + lineIdx + '_' + Math.random().toString(36).substr(2, 5),
            studentId: studentId || `AUTO_${lineIdx}`,
            fullName:  fullName,
            grade:     grade,
            room:      room,
            number:    number,
            phone:     '',
            advisors:  advisors,
            status:    'active',
            createdAt: new Date().toISOString()
        };
    }

    // ====================================================================
    // VALIDATION
    // ====================================================================

    validateStudents(students) {
        const errors = [];
        const warnings = [];
        const seenIds = new Map();

        students.forEach((s, idx) => {
            const lineNo = idx + 2; // +2 because line 1 = header

            if (!s.fullName || s.fullName.trim().length < 2) {
                errors.push(`บรรทัด ${lineNo}: ชื่อ-นามสกุลว่างเปล่าหรือสั้นเกินไป`);
            }
            if (!this.GRADES.includes(s.grade)) {
                warnings.push(`บรรทัด ${lineNo} (${s.fullName}): ระดับชั้น "${s.grade}" อาจไม่ถูกต้อง`);
            }
            if (!s.room || isNaN(parseInt(s.room))) {
                warnings.push(`บรรทัด ${lineNo} (${s.fullName}): เลขห้อง "${s.room}" อาจไม่ถูกต้อง`);
            }
            if (s.studentId && !s.studentId.startsWith('AUTO_')) {
                const existing = seenIds.get(s.studentId);
                if (existing !== undefined) {
                    warnings.push(`บรรทัด ${lineNo}: รหัสประจำตัว "${s.studentId}" ซ้ำกับบรรทัด ${existing + 2}`);
                } else {
                    seenIds.set(s.studentId, idx);
                }
            }
        });

        return { errors, warnings, valid: errors.length === 0 };
    }

    // ====================================================================
    // CSV LINE PARSER (RFC-4180 compliant)
    // ====================================================================

    parseCSVLine(text) {
        if (!text) return [];
        const results = [];
        let entry = '';
        let inQuotes = false;

        // Auto-detect delimiter
        let delimiter = ',';
        const tabCount  = (text.match(/\t/g)  || []).length;
        const commaCount = (text.match(/,/g)  || []).length;
        const semiCount  = (text.match(/;/g)  || []).length;
        if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
        else if (semiCount > commaCount) delimiter = ';';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') { entry += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                results.push(entry.trim());
                entry = '';
            } else {
                entry += char;
            }
        }
        results.push(entry.trim());
        return results;
    }

    // ====================================================================
    // MAIN PARSE FUNCTION
    // ====================================================================

    /**
     * Parse a CSV file into student objects
     * @param {File} file
     * @param {{ defaultGrade?: string, defaultRoom?: string }} options
     * @returns {Promise<{ students: Array, errors: string[], warnings: string[], summary: Object }>}
     */
    parseCSV(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ CSV ได้'));

            reader.onload = (e) => {
                try {
                    // Try UTF-8 first, then TIS-620 fallback
                    let text = e.target.result;
                    text = text.replace(/^\uFEFF/, ''); // Strip BOM

                    const allLines = text.split(/\r\n|\n|\r/);
                    const nonEmpty = allLines.filter(l => l.trim().length > 0);

                    if (nonEmpty.length === 0) {
                        reject(new Error('ไฟล์ว่างเปล่า'));
                        return;
                    }

                    // Find header line
                    let headerIdx = 0;
                    for (let i = 0; i < Math.min(5, nonEmpty.length); i++) {
                        if (this.isHeaderLine(nonEmpty[i])) { headerIdx = i; break; }
                    }

                    const headerLine = nonEmpty[headerIdx];
                    const { map: headerMap } = this.detectHeaderMap(headerLine);
                    const dataLines = nonEmpty.slice(headerIdx + 1);

                    if (dataLines.length === 0) {
                        reject(new Error('ไม่พบข้อมูลนักเรียนในไฟล์ (มีเพียงหัวตาราง)'));
                        return;
                    }

                    const students = [];
                    const parseErrors = [];

                    dataLines.forEach((line, idx) => {
                        const clean = line.trim().replace(/^\uFEFF/, '');
                        if (!clean) return;

                        const cols = this.parseCSVLine(clean);
                        const allEmpty = cols.every(c => !(c || '').trim());
                        if (allEmpty) return;

                        try {
                            const student = this.parseStudentRow(
                                cols, headerMap, idx,
                                options.defaultGrade || null,
                                options.defaultRoom  || null
                            );
                            // Skip rows that have no meaningful data
                            if (!student.fullName || student.fullName.trim().length < 2) {
                                if (!student.studentId || student.studentId.startsWith('AUTO_')) return;
                            }
                            students.push(student);
                        } catch (rowErr) {
                            parseErrors.push(`บรรทัด ${idx + 2}: ${rowErr.message}`);
                        }
                    });

                    const validation = this.validateStudents(students);
                    const allErrors   = [...parseErrors, ...validation.errors];
                    const allWarnings = validation.warnings;

                    // Build summary
                    const summary = {};
                    students.forEach(s => {
                        const key = `${s.grade}/${s.room}`;
                        if (!summary[key]) summary[key] = { grade: s.grade, room: s.room, count: 0 };
                        summary[key].count++;
                    });

                    resolve({
                        students,
                        errors:   allErrors,
                        warnings: allWarnings,
                        valid:    allErrors.length === 0,
                        summary:  Object.values(summary).sort((a, b) => a.grade.localeCompare(b.grade) || a.room.localeCompare(b.room, undefined, { numeric: true })),
                        headerMap
                    });
                } catch (err) {
                    reject(err);
                }
            };

            reader.readAsText(file, 'UTF-8');
        });
    }

    // ====================================================================
    // MULTI-FILE MERGE
    // ====================================================================

    /**
     * Parse and merge multiple CSV files
     * @param {FileList|Array<File>} files
     * @param {Function} onFileProgress - callback(fileName, result)
     * @returns {Promise<{ allStudents, allErrors, allWarnings, fileSummaries }>}
     */
    async parseMultipleCSV(files, onFileProgress) {
        const allStudents  = [];
        const allErrors    = [];
        const allWarnings  = [];
        const fileSummaries = [];

        for (const file of Array.from(files)) {
            try {
                const result = await this.parseCSV(file);
                allStudents.push(...result.students);
                if (result.errors.length)   allErrors.push(...result.errors.map(e => `[${file.name}] ${e}`));
                if (result.warnings.length) allWarnings.push(...result.warnings.map(w => `[${file.name}] ${w}`));

                fileSummaries.push({
                    fileName: file.name,
                    count:    result.students.length,
                    summary:  result.summary,
                    errors:   result.errors,
                    warnings: result.warnings
                });

                if (onFileProgress) onFileProgress(file.name, result);
            } catch (err) {
                allErrors.push(`[${file.name}] ไม่สามารถอ่านไฟล์ได้: ${err.message}`);
                fileSummaries.push({ fileName: file.name, count: 0, errors: [err.message] });
            }
        }

        // Deduplicate by studentId across all files
        const seen = new Map();
        const deduped = [];
        const dupWarnings = [];
        allStudents.forEach(s => {
            const key = s.studentId && !s.studentId.startsWith('AUTO_') ? s.studentId : null;
            if (key && seen.has(key)) {
                dupWarnings.push(`รหัส ${key} (${s.fullName}) มีซ้ำข้ามไฟล์ - ใช้รายการแรก`);
            } else {
                if (key) seen.set(key, true);
                deduped.push(s);
            }
        });

        return {
            allStudents: deduped,
            allErrors,
            allWarnings: [...allWarnings, ...dupWarnings],
            fileSummaries
        };
    }

    // ====================================================================
    // EXPORT FUNCTIONS
    // ====================================================================

    downloadSampleTemplate() {
        const content = '\uFEFF' +
            'เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น,ห้อง,ครูที่ปรึกษา\n' +
            '1,09513,ด.ช.กิตติพงษ์ เรื่องสุขสุด,ม.1,1,นายบรรจง ทองกระจาย\n' +
            '2,09514,ด.ช.จิรายุ บาครี,ม.1,1,นายบรรจง ทองกระจาย\n' +
            '3,09515,ด.ญ.สมหญิง ใจดี,ม.1,1,นายบรรจง ทองกระจาย\n' +
            '1,09536,ด.ช.กิตติวิน โล่ห์กนก,ม.1,2,นายณัฐพงษ์ อาจารย์ที\n' +
            '2,09537,ด.ช.เขมศักดิ์ ศรีโพนทอง,ม.1,2,นายณัฐพงษ์ อาจารย์ที\n' +
            '1,09601,นางสาวพิมพ์มาดา รักดี,ม.2,1,นางสมศรี ใจดี\n' +
            '2,09602,นายวิชัย ดีเลิศ,ม.2,1,นางสมศรี ใจดี\n';
        this._triggerDownload(content, 'ตัวอย่างไฟล์นำเข้านักเรียน.csv');
    }

    exportStudentsToCSV(students) {
        if (!students || students.length === 0) { alert('ไม่มีข้อมูลสำหรับส่งออก'); return; }
        let csv = '\uFEFF' + 'เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น,ห้อง,เบอร์โทรศัพท์,ครูที่ปรึกษา\n';
        students.forEach(s => {
            csv += [`"${s.number||''}"`,`"${s.studentId||''}"`,`"${s.fullName||''}"`,`"${s.grade||''}"`,`"${s.room||''}"`,`"${s.phone||''}"`,`"${s.advisors||''}"`].join(',') + '\n';
        });
        this._triggerDownload(csv, `รายชื่อนักเรียน_${new Date().toISOString().slice(0,10)}.csv`);
    }

    downloadTeacherSampleTemplate() {
        const content = '\uFEFF' +
            'คำนำหน้า,ชื่อ-นามสกุล,ตำแหน่ง,ห้องเรียนที่รับผิดชอบ,เบอร์โทรศัพท์\n' +
            'นาย,บรรจง ทองกระจาย,ครูที่ปรึกษา,ม.1/1,081-222-3333\n' +
            'นางสาว,สมศรี ใจดี,ครูที่ปรึกษา,ม.2/1,082-333-4444\n';
        this._triggerDownload(content, 'ตัวอย่างไฟล์นำเข้าครู.csv');
    }

    exportTeachersToCSV(teachers) {
        if (!teachers || teachers.length === 0) { alert('ไม่มีข้อมูลสำหรับส่งออก'); return; }
        let csv = '\uFEFF' + 'คำนำหน้า,ชื่อ-นามสกุล,ตำแหน่ง,ห้องเรียนที่รับผิดชอบ,เบอร์โทรศัพท์\n';
        teachers.forEach(t => {
            csv += [`"${t.prefix||''}"`,`"${t.fullName||''}"`,`"${t.position||''}"`,`"${t.responsibleRoom||''}"`,`"${t.phone||''}"`].join(',') + '\n';
        });
        this._triggerDownload(csv, `รายชื่อครู_${new Date().toISOString().slice(0,10)}.csv`);
    }

    parseTeacherCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ CSV ครูได้'));
            reader.onload = (e) => {
                try {
                    const text = e.target.result.replace(/^\uFEFF/, '');
                    const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim());
                    if (lines.length <= 1) { reject(new Error('ไม่มีข้อมูลครูในไฟล์')); return; }

                    const teachers = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = this.parseCSVLine(lines[i]);
                        if (!cols.length || !cols[0].trim()) continue;

                        let fullName = cols[0].trim(), position = (cols[1]||'ครู').trim();
                        let responsibleRoom = (cols[2]||'').trim(), phone = (cols[3]||'').trim();

                        if (cols.length >= 5 && ['นาย','นาง','นางสาว','ดร.'].includes(cols[0].trim())) {
                            const name = cols[1].trim();
                            fullName = `${cols[0].trim()}${name}`;
                            position = (cols[2]||'ครู').trim();
                            responsibleRoom = (cols[3]||'').trim();
                            phone = (cols[4]||'').trim();
                        }
                        if (fullName) {
                            teachers.push({ id: 'TCH_'+Date.now()+'_'+i+'_'+Math.random().toString(36).substr(2,4), fullName, position: position||'ครู', responsibleRoom, phone, createdAt: new Date().toISOString() });
                        }
                    }
                    resolve(teachers);
                } catch (err) { reject(err); }
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    _triggerDownload(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

const csvImporter = new CSVImporter();
