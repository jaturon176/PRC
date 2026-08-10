/**
 * ระบบดูแลช่วยเหลือนักเรียน - PDF Report Generator
 * Generates official Thai discipline & offense reports using jsPDF
 */

class PDFGenerator {
    constructor() {
        // Uses jsPDF standard library from CDN
    }

    /**
     * Download or Print Offense Incident PDF Report
     * @param {Object} offense 
     * @param {Object} student 
     */
    async generateOffenseReport(offense, student) {
        if (!window.jspdf) {
            alert('กำลังโหลดคลังพัฒนา PDF กรุณาลองใหม่อีกครั้งใน 2 วินาที');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const studentName = student ? `${student.prefix || ''}${student.fullName}` : offense.studentName;
        const studentId = student ? student.studentId : offense.studentId;
        const gradeRoom = student ? `${student.grade}/${student.room}` : offense.gradeRoom;
        const numberStr = student ? student.number : (offense.studentNumber || '-');

        // Document Colors
        const primaryColor = [15, 23, 42]; // Slate 900
        const accentColor = [225, 29, 72]; // Rose 600

        // --- Header ---
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 24, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('แบบบันทึกพฤติกรรมและการกระทำความผิดของนักเรียน', 105, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.text('งานกิจการนักเรียน โรงเรียนพนมดงรักวิทยา - ระบบดูแลช่วยเหลือนักเรียน', 105, 18, { align: 'center' });

        // --- Section 1: Student Information Box ---
        doc.setLineWidth(0.5);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 30, 180, 32, 2, 2, 'FD');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.text('ข้อมูลนักเรียนผู้กระทำความผิด', 20, 38);

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`ชื่อ-นามสกุล: ${studentName}`, 20, 46);
        doc.text(`เลขประจำตัว: ${studentId}`, 115, 46);
        doc.text(`ระดับชั้น/ห้อง: ${gradeRoom}`, 20, 54);
        doc.text(`เลขที่: ${numberStr}`, 115, 54);

        // --- Section 2: Offense Incident Details ---
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('รายละเอียดการกระทำความผิด', 15, 70);

        const offenseLevelTH = offense.level === 'severe' ? 'ร้ายแรง' : (offense.level === 'moderate' ? 'ปานกลาง' : 'เบา');
        const formattedDate = offense.incidentDate ? new Date(offense.incidentDate).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        }) : '-';

        const incidentData = [
            ['วันที่เกิดเหตุ:', formattedDate, 'ระดับความผิด:', offenseLevelTH],
            ['สถานที่เกิดเหตุ:', offense.location || 'ภายในโรงเรียน', 'ครูผู้บันทึก:', offense.recordedBy || 'ครูกิจการนักเรียน'],
            ['หมวดหมู่ความผิด:', offense.category || 'พฤติกรรมไม่พึงประสงค์', 'สถานะการส่งต่อ:', offense.referralType ? (offense.referralType === 'internal' ? 'ส่งต่อภายใน' : 'ส่งต่อภายนอก') : 'ไม่มี']
        ];

        if (doc.autoTable) {
            doc.autoTable({
                startY: 73,
                margin: { left: 15, right: 15 },
                body: incidentData,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
                columnStyles: {
                    0: { fontStyle: 'bold', width: 30 },
                    1: { width: 60 },
                    2: { fontStyle: 'bold', width: 30 },
                    3: { width: 60 }
                }
            });
        }

        let currentY = doc.lastAutoTable ? doc.lastAutoTable.previous.finalY + 6 : 100;

        // Details Text Block
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, currentY, 180, 24, 1, 1, 'D');

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('พฤติกรรม/ข้อเท็จจริงการกระทำผิด:', 18, currentY + 6);

        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        const splitDescription = doc.splitTextToSize(offense.description || 'ไม่มีรายละเอียดเพิ่มเติม', 170);
        doc.text(splitDescription, 18, currentY + 12);

        currentY += 30;

        // Corrective Action / Disciplinary Measures
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('มาตรการแก้ไข/การปรับปรุงพฤติกรรม:', 15, currentY);
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        const splitPenalty = doc.splitTextToSize(offense.actionTaken || 'ว่ากล่าวตักเตือน และบันทึกประวัติพฤติกรรม', 15, currentY + 6);
        doc.text(splitPenalty, 15, currentY + 6);

        currentY += 18;

        // --- Section 3: Photo Evidence (if available) ---
        if (offense.imageUrl) {
            try {
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text('รูปภาพหลักฐานการกระทำผิด (Evidence Photo):', 15, currentY);
                
                // Draw Image Frame
                doc.setDrawColor(203, 213, 225);
                doc.rect(15, currentY + 3, 70, 45, 'D');
                
                // Embed Base64 or Loaded Image
                doc.addImage(offense.imageUrl, 'JPEG', 16, currentY + 4, 68, 43);
                currentY += 52;
            } catch (err) {
                console.warn('[PDFGenerator] Could not render image in PDF:', err);
                currentY += 8;
            }
        } else {
            currentY += 5;
        }

        // --- Section 4: Signature Blocks ---
        if (currentY > 230) {
            doc.addPage();
            currentY = 25;
        }

        doc.setLineWidth(0.3);
        doc.setDrawColor(148, 163, 184);

        // Signature 1: Recording Teacher
        doc.line(20, currentY + 25, 75, currentY + 25);
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('(......................................................)', 47.5, currentY + 30, { align: 'center' });
        doc.text('ตำแหน่ง ครูผู้บันทึก / ครูกิจการนักเรียน', 47.5, currentY + 35, { align: 'center' });

        // Signature 2: Student
        doc.line(135, currentY + 25, 190, currentY + 25);
        doc.text('(......................................................)', 162.5, currentY + 30, { align: 'center' });
        doc.text('ลายมือชื่อ นักเรียนผู้กระทำความผิด', 162.5, currentY + 35, { align: 'center' });

        // Signature 3: Head of Student Affairs / Principal
        currentY += 45;
        doc.line(77.5, currentY + 15, 132.5, currentY + 15);
        doc.text('(......................................................)', 105, currentY + 20, { align: 'center' });
        doc.text('หัวหน้าฝ่ายกิจการนักเรียน / ผู้อำนวยการ', 105, currentY + 25, { align: 'center' });

        // Save PDF file
        const safeName = (studentName || 'student').replace(/[^a-zA-Z0-9ก-๙]/g, '_');
        doc.save(`รายงานพฤติกรรม_${safeName}_${studentId}.pdf`);
    }
}

const pdfGenerator = new PDFGenerator();
