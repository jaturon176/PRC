/**
 * ระบบดูแลช่วยเหลือนักเรียน - CSV Importer & Exporter Module
 * Parses CSV student records (ม.1-ม.6, ปวช.1-ปวช.3) and exports templates
 */

class CSVImporter {
    constructor() {
        this.sampleTemplateHeaders = "เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น/ห้อง\n";
        this.sampleRows = [
            "1,66001,นายสมชาย สายชล,ม.1/1\n",
            "2,66002,นางสาวสมหญิง สุขใจ,ม.1/1\n",
            "1,66003,นายวิชัย ดีเลิศ,ม.1/2\n",
            "2,66004,นายอนันต์ ชัยชนะ,ม.1/2\n",
            "1,66005,นางสาวพิมพ์มาดา รักดี,ม.2/1\n"
        ];
    }

    /**
     * Download Sample CSV Template file for Students
     */
    downloadSampleTemplate() {
        const content = "\uFEFF" + this.sampleTemplateHeaders + this.sampleRows.join("");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ตัวอย่างไฟล์นำเข้านักเรียน.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Parse CSV File input for Students
     * Headers: เลขที่,รหัสประจำตัว,ชื่อ-สกุล,ระดับชั้น/ห้อง
     * @param {File} file 
     * @param {Array<Object>} existingTeachers 
     * @returns {Promise<Array<Object>>}
     */
    parseCSV(file, existingTeachers = []) {
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
                        const cols = this.parseCSVLine(lines[i]);
                        if (cols.length >= 2 && cols.some(c => c.trim().length > 0)) {
                            let number = '';
                            let studentId = '';
                            let fullName = '';
                            let grade = 'ม.1';
                            let room = '1';
                            let advisors = '';

                            // Format A: เลขที่(0), รหัสประจำตัว(1), ชื่อ-สกุล(2), ระดับชั้น/ห้อง(3)
                            if (cols.length >= 4 && !isNaN(parseInt(cols[0].trim(), 10))) {
                                number = cols[0].trim();
                                studentId = cols[1].trim();
                                fullName = cols[2].trim();
                                const gradeRoomStr = cols[3].trim();
                                const parts = gradeRoomStr.split('/');
                                grade = parts[0] ? parts[0].trim() : 'ม.1';
                                room = parts[1] ? parts[1].trim() : '1';
                            } 
                            // Format B: รหัสประจำตัว(0), ชื่อ-สกุล(1), ระดับชั้น/ห้อง(2)
                            else if (cols.length === 3 || (cols.length >= 3 && cols[2].includes('/'))) {
                                studentId = cols[0].trim();
                                fullName = cols[1].trim();
                                const gradeRoomStr = cols[2].trim();
                                const parts = gradeRoomStr.split('/');
                                grade = parts[0] ? parts[0].trim() : 'ม.1';
                                room = parts[1] ? parts[1].trim() : '1';
                                number = i.toString();
                            }
                            // Format C: Legacy multi-column (รหัสประจำตัว, คำนำหน้า, ชื่อ-สกุล, ระดับชั้น, ห้อง...)
                            else {
                                studentId = cols[0] || `STD_${Date.now()}_${i}`;
                                const title = cols[1] || '';
                                const name = cols[2] || '';
                                fullName = title && !name.startsWith(title) ? `${title}${name}` : name;
                                grade = cols[3] || 'ม.1';
                                room = cols[4] || '1';
                                number = cols[5] || i.toString();
                                advisors = cols[7] || '';
                            }

                            // Auto-match advisor teachers from existing system data
                            if (!advisors && existingTeachers && existingTeachers.length > 0) {
                                const targetRoomKey = `${grade}/${room}`; // e.g. "ม.1/1"
                                const matchedTeachers = existingTeachers.filter(t => {
                                    if (!t.responsibleRoom) return false;
                                    const tRoom = String(t.responsibleRoom).trim();
                                    return tRoom === targetRoomKey || tRoom.includes(targetRoomKey);
                                });
                                if (matchedTeachers.length > 0) {
                                    advisors = matchedTeachers.map(t => t.fullName).join(', ');
                                }
                            }

                            if (fullName || studentId) {
                                parsedStudents.push({
                                    id: 'STD_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
                                    studentId: studentId || `STD_${i}`,
                                    fullName: fullName,
                                    grade: grade,
                                    room: room,
                                    number: number,
                                    phone: '',
                                    advisors: advisors,
                                    status: 'active',
                                    createdAt: new Date().toISOString()
                                });
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

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
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

        let csvContent = "\uFEFF" + this.sampleTemplateHeaders;
        students.forEach(s => {
            const row = [
                `"${s.studentId || ''}"`,
                `"${s.prefix || ''}"`,
                `"${s.fullName || ''}"`,
                `"${s.grade || ''}"`,
                `"${s.room || ''}"`,
                `"${s.number || ''}"`,
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

                            // Handle 5-column format if present (คำนำหน้า, ชื่อ-นามสกุล, ตำแหน่ง, ห้องเรียน, เบอร์โทร)
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
