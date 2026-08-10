/**
 * ระบบดูแลช่วยเหลือนักเรียน - CSV Importer & Exporter Module
 * Parses CSV student records (ม.1-ม.6, ปวช.1-ปวช.3) and exports templates
 */

class CSVImporter {
    constructor() {
        this.sampleTemplateHeaders = "เลขประจำตัว,คำนำหน้า,ชื่อ-นามสกุล,ระดับชั้น,ห้อง,เลขที่,เบอร์โทรศัพท์,ครูที่ปรึกษา\n";
        this.sampleRows = [
            "66001,นาย,สมชาย สายชล,ม.1,1,1,0812345678,\"ครูสมศักดิ์ รักเรียน, ครูสมศรี ใจดี\"\n",
            "66002,นางสาว,สมหญิง สุขใจ,ม.3,2,15,0898765432,ครูวิเชียร ดีเลิศ\n",
            "66003,นาย,วิชัย ดีเลิศ,ปวช.1,1,5,0821112233,\"ครูอนันต์ ชัยชนะ, ครูพิมพ์ใจ รักดี\"\n",
            "66004,นาย,อนันต์ ชัยชนะ,ม.5,3,8,0845556677,ครูธนา มุ่งมั่น\n"
        ];
    }

    /**
     * Download Sample CSV Template file for Teachers
     */
    downloadSampleTemplate() {
        const content = "\uFEFF" + this.sampleTemplateHeaders + this.sampleRows.join("");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ตัวอย่างไฟล์นำเข้านักเรียน_ม.1-ม.6_ปวช.1-ปวช.3.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Parse CSV File input
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

                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
                    const parsedStudents = [];

                    for (let i = 1; i < lines.length; i++) {
                        const cols = this.parseCSVLine(lines[i]);
                        if (cols.length >= 3) {
                            const studentId = cols[0] || `STD_${Date.now()}_${i}`;
                            const prefix = cols[1] || '';
                            const fullName = cols[2] || '';
                            const grade = cols[3] || 'ม.1';
                            const room = cols[4] || '1';
                            const number = cols[5] || i.toString();
                            const phone = cols[6] || '';
                            const advisors = cols[7] || '';

                            parsedStudents.push({
                                studentId: studentId.trim(),
                                prefix: prefix.trim(),
                                fullName: fullName.trim(),
                                grade: grade.trim(),
                                room: room.trim(),
                                number: number.trim(),
                                phone: phone.trim(),
                                advisors: advisors.trim(),
                                status: 'active',
                                createdAt: new Date().toISOString()
                            });
                        }
                    }

                    resolve(parsedStudents);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ CSV ได้"));
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
                        if (cols.length >= 2) {
                            // Format: คำนำหน้า, ชื่อ-นามสกุล, ตำแหน่ง, ห้องเรียนที่รับผิดชอบ, เบอร์โทรศัพท์
                            // OR Format: ชื่อ-นามสกุล, ตำแหน่ง, ห้องเรียนที่รับผิดชอบ, เบอร์โทรศัพท์
                            let prefix = 'ครู';
                            let fullName = cols[0] || '';
                            let position = cols[1] || 'ครูผู้สอน';
                            let responsibleRoom = cols[2] || '';
                            let phone = cols[3] || '';

                            if (cols.length >= 5 || ['นาย', 'นาง', 'นางสาว', 'ดร.'].includes((cols[0] || '').trim())) {
                                prefix = (cols[0] || 'นาย').trim();
                                fullName = (cols[1] || '').trim();
                                position = (cols[2] || 'ครูผู้สอน').trim();
                                responsibleRoom = (cols[3] || '').trim();
                                phone = (cols[4] || '').trim();
                            }

                            parsedTeachers.push({
                                prefix: prefix,
                                fullName: fullName,
                                position: position,
                                responsibleRoom: responsibleRoom,
                                phone: phone,
                                createdAt: new Date().toISOString()
                            });
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
