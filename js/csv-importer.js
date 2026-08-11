/**
 * ระบบดูแลช่วยเหลือนักเรียน - CSV Importer & Exporter Module
 * Parses CSV student records (ม.1-ม.6, ปวช.1-ปวช.3) and exports templates
 */

class CSVImporter {
    constructor() {
        this.sampleTemplateHeaders = "เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น,ห้อง,ครูที่ปรึกษา\n";
    }

    /**
     * Download Sample CSV Template file for Students
     */
    downloadSampleTemplate() {
        const content = "\uFEFF" + 
            "เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น,ห้อง,ครูที่ปรึกษา\n" +
            "1,09513,ด.ช.กิตติพงษ์ เรื่องสุขสุด,ม.1,1,นายบรรจง ทองกระจาย\n" +
            "2,09514,ด.ช.จิรายุ บาครี,ม.1,1,นายบรรจง ทองกระจาย\n" +
            "1,09536,ด.ช.กิตติวิน โล่ห์กนก,ม.1,2,นายณัฐพงษ์ อาจารย์ที\n" +
            "2,09537,ด.ช.เขมศักดิ์ ศรีโพนทอง,ม.1,2,นายณัฐพงษ์ อาจารย์ที\n" +
            "1,09601,นางสาวพิมพ์มาดา รักดี,ม.2,1,นางสมศรี ใจดี\n";

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ตัวอย่างไฟล์นำเข้านักเรียน.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    normalizeGrade(g) {
        if (!g) return 'ม.1';
        const str = String(g).trim().replace(/["']/g, '');
        if (str.includes('ม.1') || str.includes('มัธยมศึกษาปีที่ 1') || str === '1') return 'ม.1';
        if (str.includes('ม.2') || str.includes('มัธยมศึกษาปีที่ 2') || str === '2') return 'ม.2';
        if (str.includes('ม.3') || str.includes('มัธยมศึกษาปีที่ 3') || str === '3') return 'ม.3';
        if (str.includes('ม.4') || str.includes('มัธยมศึกษาปีที่ 4') || str === '4') return 'ม.4';
        if (str.includes('ม.5') || str.includes('มัธยมศึกษาปีที่ 5') || str === '5') return 'ม.5';
        if (str.includes('ม.6') || str.includes('มัธยมศึกษาปีที่ 6') || str === '6') return 'ม.6';
        if (str.includes('ปวช.1')) return 'ปวช.1';
        if (str.includes('ปวช.2')) return 'ปวช.2';
        if (str.includes('ปวช.3')) return 'ปวช.3';
        return str.startsWith('ม.') ? str : `ม.${str}`;
    }

    normalizeRoomNumber(val) {
        if (!val) return '1';
        const str = String(val).trim().replace(/["']/g, '');
        const digits = str.replace(/\D/g, '');
        return digits || str || '1';
    }

    parseGradeAndRoom(str) {
        if (!str) return { grade: 'ม.1', room: '1' };
        const clean = String(str).trim().replace(/^\uFEFF/, '');
        const nums = clean.match(/\d+/g) || [];
        let grade = 'ม.1';
        let room = '1';

        if (nums.length >= 2) {
            grade = `ม.${nums[0]}`;
            room = nums[1];
        } else if (nums.length === 1) {
            const num = parseInt(nums[0], 10);
            if (num >= 101 && num <= 699) {
                const g = Math.floor(num / 100);
                const r = num % 100;
                grade = `ม.${g}`;
                room = String(r);
            } else {
                grade = `ม.${nums[0]}`;
                room = '1';
            }
        } else {
            grade = clean || 'ม.1';
            room = '1';
        }

        return { grade, room };
    }

    parseStudentRow(cols, lineIdx) {
        let number = '';
        let studentId = '';
        let fullName = '';
        let grade = 'ม.1';
        let room = '1';
        let advisors = '';

        const cleanedCols = cols.map(c => (c || '').trim().replace(/^"|"$/g, ''));

        if (cleanedCols.length >= 6) {
            number = cleanedCols[0];
            studentId = cleanedCols[1];
            fullName = cleanedCols[2];
            grade = this.normalizeGrade(cleanedCols[3]);
            room = this.normalizeRoomNumber(cleanedCols[4]);
            advisors = cleanedCols[5];
        } else if (cleanedCols.length === 5) {
            number = cleanedCols[0];
            studentId = cleanedCols[1];
            fullName = cleanedCols[2];
            const col3 = cleanedCols[3];
            const col4 = cleanedCols[4];

            const isCol4Teacher = /[ก-ฮa-zA-Z]/.test(col4) && !/^\d+$/.test(col4);

            if (col3.includes('/') || col3.includes('ห้อง') || isCol4Teacher) {
                const parsedGR = this.parseGradeAndRoom(col3);
                grade = parsedGR.grade;
                room = parsedGR.room;
                advisors = col4;
            } else {
                grade = this.normalizeGrade(col3);
                room = this.normalizeRoomNumber(col4);
                advisors = '';
            }
        } else if (cleanedCols.length === 4) {
            number = cleanedCols[0];
            studentId = cleanedCols[1];
            fullName = cleanedCols[2];
            const parsedGR = this.parseGradeAndRoom(cleanedCols[3]);
            grade = parsedGR.grade;
            room = parsedGR.room;
        } else if (cleanedCols.length === 3) {
            studentId = cleanedCols[0];
            fullName = cleanedCols[1];
            const parsedGR = this.parseGradeAndRoom(cleanedCols[2]);
            grade = parsedGR.grade;
            room = parsedGR.room;
            number = lineIdx.toString();
        } else if (cleanedCols.length === 2) {
            fullName = cleanedCols[0];
            const parsedGR = this.parseGradeAndRoom(cleanedCols[1]);
            grade = parsedGR.grade;
            room = parsedGR.room;
            number = lineIdx.toString();
            studentId = `STD_${Date.now()}_${lineIdx}`;
        }

        if (!room || room.trim() === '') room = '1';
        if (!grade || grade.trim() === '') grade = 'ม.1';

        return {
            id: 'STD_' + Date.now() + '_' + lineIdx + '_' + Math.random().toString(36).substr(2, 4),
            studentId: studentId || `STD_${lineIdx}`,
            fullName: fullName,
            grade: grade,
            room: room,
            number: number,
            phone: '',
            advisors: advisors,
            status: 'active',
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Parse CSV File input for Students
     * @param {File} file 
     * @returns {Promise<Array<Object>>}
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

                    if (lines.length <= 1) {
                        reject(new Error("ไฟล์ CSV ไม่มีข้อมูลนักเรียน"));
                        return;
                    }

                    const parsedStudents = [];
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim().replace(/^\uFEFF/, '');
                        if (!line) continue;

                        const cols = this.parseCSVLine(line);
                        if (cols.length >= 2 && cols.some(c => (c || '').trim().length > 0)) {
                            const student = this.parseStudentRow(cols, i);
                            if (student.fullName || student.studentId) {
                                parsedStudents.push(student);
                            }
                        }
                    }

                    resolve(parsedStudents);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ CSV นักเรียนได้"));
            reader.readAsText(file, "UTF-8");
        });
    }

    parseCSVLine(text) {
        const results = [];
        let entry = '';
        let inQuotes = false;

        let delimiter = ',';
        if (text.includes('\t')) {
            delimiter = '\t';
        } else if (text.includes(';') && !text.includes(',')) {
            delimiter = ';';
        }

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                results.push(entry.trim().replace(/^"|"$/g, ''));
                entry = '';
            } else {
                entry += char;
            }
        }
        results.push(entry.trim().replace(/^"|"$/g, ''));
        return results;
    }

    /**
     * Export all students list to CSV File
     * @param {Array<Object>} students 
     */
    exportStudentsToCSV(students) {
        if (!students || students.length === 0) {
            alert('ไม่มีข้อมูลนักเรียนสำหรับส่งออก');
            return;
        }

        let csvContent = "\uFEFF" + "เลขที่,รหัสประจำตัว,คำนำหน้า,ชื่อ-สกุล,ระดับชั้น,ห้อง,เบอร์โทรศัพท์,ครูที่ปรึกษา\n";
        students.forEach(s => {
            const row = [
                `"${s.number || ''}"`,
                `"${s.studentId || ''}"`,
                `"${s.prefix || ''}"`,
                `"${s.fullName || ''}"`,
                `"${s.grade || ''}"`,
                `"${s.room || ''}"`,
                `"${s.phone || ''}"`,
                `"${s.advisors || s.advisorTeachers || s.guardian || ''}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `รายชื่อนักเรียนทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Download Sample Teacher CSV Template
     */
    downloadTeacherSampleTemplate() {
        const headers = "คำนำหน้า,ชื่อ-นามสกุล,ตำแหน่ง,ห้องเรียนที่รับผิดชอบ,เบอร์โทรศัพท์\n";
        const rows = [
            "นาย,สมศักดิ์ รักเรียน,ครูกิจการนักเรียน,ม.1/1,081-222-3333\n",
            "นาง,สมศรี ใจดี,ครูประจำชั้น,ม.1/1,082-333-4444\n",
            "นาย,วิเชียร ดีเลิศ,ครูแนะแนว,ม.2/1,083-444-5555\n"
        ];
        const content = "\uFEFF" + headers + rows.join("");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ตัวอย่างไฟล์นำเข้าข้อมูลครู_พนมดงรักวิทยา.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Parse Teacher CSV File input
     * @param {File} file 
     * @returns {Promise<Array<Object>>}
     */
    parseTeacherCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

                    if (lines.length <= 1) {
                        reject(new Error("ไฟล์ CSV ไม่มีข้อมูลครู"));
                        return;
                    }

                    const parsedTeachers = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = this.parseCSVLine(lines[i]);
                        if (cols.length >= 1 && cols[0].trim().length > 0) {
                            let fullName = (cols[0] || '').trim();
                            let position = (cols[1] || 'ครู').trim();
                            let responsibleRoom = (cols[2] || '').trim();
                            let phone = (cols[3] || '').trim();

                            if (cols.length >= 5 && (['นาย','นาง','นางสาว','ดร.'].includes(cols[0].trim()) || (cols[1] || '').trim().length > 0)) {
                                const title = (cols[0] || '').trim();
                                const name = (cols[1] || '').trim();
                                fullName = title && !name.startsWith(title) ? `${title}${name}` : name;
                                position = (cols[2] || 'ครู').trim();
                                responsibleRoom = (cols[3] || '').trim();
                                phone = (cols[4] || '').trim();
                            }

                            if (fullName) {
                                parsedTeachers.push({
                                    id: 'TCH_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
                                    fullName: fullName,
                                    position: position || 'ครู',
                                    responsibleRoom: responsibleRoom,
                                    phone: phone,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        }
                    }
                    resolve(parsedTeachers);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ CSV ครูได้"));
            reader.readAsText(file, "UTF-8");
        });
    }

    /**
     * Export all teachers to CSV
     * @param {Array<Object>} teachers 
     */
    exportTeachersToCSV(teachers) {
        if (!teachers || teachers.length === 0) {
            alert('ไม่มีข้อมูลครูสำหรับส่งออก');
            return;
        }

        const headers = "คำนำหน้า,ชื่อ-นามสกุล,ตำแหน่ง,ห้องเรียนที่รับผิดชอบ,เบอร์โทรศัพท์\n";
        let csvContent = "\uFEFF" + headers;
        teachers.forEach(t => {
            const row = [
                `"${t.prefix || ''}"`,
                `"${t.fullName || ''}"`,
                `"${t.position || ''}"`,
                `"${t.responsibleRoom || t.responsibleGrade || ''}"`,
                `"${t.phone || ''}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `รายชื่อครูทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

const csvImporter = new CSVImporter();
