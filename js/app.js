/**
 * ระบบดูแลช่วยเหลือนักเรียน - Main Application Controller
 * Handles Navigation, Charts, Modals, Event Handlers, and Seed Data
 */

class Application {
    constructor() {
        this.charts = {};
        this.currentView = 'dashboard';
        this.selectedOffenseProofFile = null;

        // Initialize App on DOM Ready
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    async init() {
        console.log('[App] Initializing Student Care & Assistance System...');

        // 1. Load Seed Data if database empty
        this.checkAndLoadSeedData();
        this.checkAndLoadTeacherSeedData();
        this.checkAndLoadUserSeedData();

        // 2. Setup Page Routing & Navigation
        this.setupNavigation();

        // 3. Setup Global Event Listeners & Modals
        this.setupEventListeners();

        // 4. Check Auth Status & Apply Permissions
        authManager.applyUIPermissions();

        // 5. Render Initial Dashboard Views & Charts
        this.startLiveClock();
        this.renderDashboard();
        this.renderStudentList();
        this.renderTeacherList();
        this.renderUserList();
        this.renderScreenings();
        this.renderMerits();
        this.renderOffenses();
        this.renderReferrals();

        // 6. Realtime Listeners for Data Updates
        window.addEventListener('studentsUpdated', () => {
            this.renderDashboard();
            this.renderStudentList();
            this.updateStudentDropdowns();
        });
        window.addEventListener('teachersUpdated', () => {
            this.renderTeacherList();
        });
        window.addEventListener('usersUpdated', () => {
            this.renderUserList();
        });
        window.addEventListener('screeningsUpdated', () => {
            this.renderDashboard();
            this.renderScreenings();
        });
        window.addEventListener('meritsUpdated', () => {
            this.renderDashboard();
            this.renderMerits();
        });
        window.addEventListener('offensesUpdated', () => {
            this.renderDashboard();
            this.renderOffenses();
        });
        window.addEventListener('referralsUpdated', () => {
            this.renderDashboard();
            this.renderReferrals();
        });
        window.addEventListener('activitiesUpdated', () => {
            this.renderActivitiesList();
        });
        window.addEventListener('authStateChanged', () => {
            authManager.applyUIPermissions();
            this.renderDashboard();
        });

        // Initialize Student Select Options
        this.updateStudentDropdowns();
    }

    // --- Seed Data Loader ---
    checkAndLoadSeedData() {
        const students = firebaseService.getStudents();
        if (!students || students.length === 0) {
            console.log('[App] Loading default sample Thai student data (ม.1-ม.6, ปวช.1-ปวช.3)...');
            const sampleStudents = [
                { studentId: '66001', prefix: 'นาย', fullName: 'สมชาย สายชล', grade: 'ม.1', room: '1', number: '1', phone: '081-234-5678', advisors: 'ครูสมศักดิ์ รักเรียน, ครูสมศรี ใจดี' },
                { studentId: '66002', prefix: 'นางสาว', fullName: 'สมหญิง สุขใจ', grade: 'ม.2', room: '1', number: '2', phone: '089-876-5432', advisors: 'ครูวิเชียร ดีเลิศ' },
                { studentId: '66003', prefix: 'นาย', fullName: 'วิชัย ดีเลิศ', grade: 'ม.3', room: '2', number: '5', phone: '082-111-2233', advisors: 'ครูอนันต์ ชัยชนะ, ครูพิมพ์ใจ รักดี' },
                { studentId: '66004', prefix: 'นาย', fullName: 'อนันต์ ชัยชนะ', grade: 'ม.4', room: '1', number: '8', phone: '084-555-6677', advisors: 'ครูธนา มุ่งมั่น' },
                { studentId: '66005', prefix: 'นางสาว', fullName: 'พิมพ์มาดา รักดี', grade: 'ม.5', room: '2', number: '12', phone: '086-777-8899', advisors: 'ครูเกรียงศักดิ์ ช่างกล' },
                { studentId: '66006', prefix: 'นาย', fullName: 'ธนากร มุ่งมั่น', grade: 'ม.6', room: '1', number: '3', phone: '083-444-5566', advisors: 'ครูนพรัตน์ ฝีมือดี' },
                { studentId: '66007', prefix: 'นาย', fullName: 'เกียรติศักดิ์ ช่างกล', grade: 'ปวช.1', room: '1', number: '4', phone: '085-111-9988', advisors: 'ครูสุภาพ สร้างสรรค์' },
                { studentId: '66008', prefix: 'นาย', fullName: 'นพดล ฝีมือดี', grade: 'ปวช.2', room: '2', number: '10', phone: '087-333-2211', advisors: 'ครูกิตติ มั่นคง' },
                { studentId: '66009', prefix: 'นางสาว', fullName: 'สุพรรษา สร้างสรรค์', grade: 'ปวช.3', room: '1', number: '7', phone: '089-000-1122', advisors: 'ครูกานดา สวยงาม' }
            ];
            firebaseService.saveStudentsBatch(sampleStudents);
        }

        const offenses = firebaseService.getOffenses();
        if (!offenses || offenses.length === 0) {
            const sampleOffenses = [
                {
                    id: 'OFF_SAMPLE_1',
                    studentId: '66001',
                    studentName: 'นายสมชาย สายชล',
                    gradeRoom: 'ม.1/1',
                    studentNumber: '1',
                    level: 'minor',
                    category: 'เข้าเรียนสาย/หนีเรียน',
                    description: 'มาโรงเรียนสายเกิน 3 ครั้งในสัปดาห์เดียว',
                    location: 'ประตูโรงเรียนด้านหน้า',
                    incidentDate: new Date().toISOString().slice(0, 10),
                    actionTaken: 'ว่ากล่าวตักเตือน และให้ทำกิจกรรมบำเพ็ญประโยชน์ 1 ชั่วโมง',
                    recordedBy: 'ครูกิจการนักเรียน',
                    referralType: 'internal'
                },
                {
                    id: 'OFF_SAMPLE_2',
                    studentId: '66007',
                    studentName: 'นายเกียรติศักดิ์ ช่างกล',
                    gradeRoom: 'ปวช.1/1',
                    studentNumber: '4',
                    level: 'moderate',
                    category: 'พฤติกรรมความก้าวร้าว',
                    description: 'มีปากเสียงทะเลาะวิวาทกับเพื่อนต่างวิทยาลัยบริเวณหน้าโรงเรียน',
                    location: 'หน้าวิทยาลัย',
                    incidentDate: new Date().toISOString().slice(0, 10),
                    actionTaken: 'เชิญผู้ปกครองมารับทราบพฤติกรรม และทำทักท้วงลายทัศน์',
                    recordedBy: 'หัวหน้างานปกครอง',
                    referralType: 'external'
                }
            ];
            sampleOffenses.forEach(o => firebaseService.saveOffense(o));
        }
    }

    checkAndLoadTeacherSeedData() {
        const teachers = firebaseService.getTeachers();
        if (!teachers || teachers.length === 0) {
            console.log('[App] Loading default sample Teacher data...');
            const sampleTeachers = [
                { prefix: 'นาย', fullName: 'สมศักดิ์ รักเรียน', position: 'ครูกิจการนักเรียน', responsibleRoom: 'ม.1/1', phone: '081-222-3333' },
                { prefix: 'นาง', fullName: 'สมศรี ใจดี', position: 'ครูประจำชั้น', responsibleRoom: 'ม.1/1', phone: '082-333-4444' },
                { prefix: 'นาย', fullName: 'วิเชียร ดีเลิศ', position: 'ครูแนะแนว', responsibleRoom: 'ม.2/1', phone: '083-444-5555' },
                { prefix: 'นาย', fullName: 'อนันต์ ชัยชนะ', position: 'หัวหน้างานปกครอง', responsibleRoom: 'ม.3/1', phone: '084-555-6666' },
                { prefix: 'นางสาว', fullName: 'พิมพ์มาดา รักดี', position: 'ครูผู้สอน', responsibleRoom: 'ม.4/1', phone: '085-666-7777' }
            ];
            firebaseService.saveTeachersBatch(sampleTeachers);
        }
    }

    // --- Navigation Router ---
    setupNavigation() {
        const navLinks = document.querySelectorAll('#sidebar .nav-item a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');
                if (targetPage) {
                    this.switchPage(targetPage);
                }
            });
        });

        // Mobile Toggle Button
        const mobileBtn = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    }

    switchPage(pageId) {
        this.currentView = pageId;

        // Update active nav link
        document.querySelectorAll('#sidebar .nav-item').forEach(item => {
            const link = item.querySelector('a');
            if (link && link.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update page visibility
        document.querySelectorAll('.content-page').forEach(page => {
            if (page.id === `page-${pageId}`) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });

        // Close sidebar on mobile
        document.getElementById('sidebar')?.classList.remove('mobile-open');

        // Re-render chart if switching to dashboard
        if (pageId === 'dashboard') {
            this.renderDashboardCharts();
        }
    }

    // --- Global Event Handlers & Modal Setup ---
    setupEventListeners() {
        // Standalone Modern Login Screen Controls
        document.getElementById('btn-open-login')?.addEventListener('click', () => {
            const loginScreenView = document.getElementById('login-screen-view');
            if (loginScreenView) {
                loginScreenView.classList.remove('hidden');
            } else {
                this.openModal('modal-login');
            }
        });

        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            const confirmed = await this.confirmDialog({
                title: 'ยืนยันการออกจากระบบ',
                message: 'คุณต้องการออกจากระบบดูแลช่วยเหลือนักเรียนใช่หรือไม่?',
                type: 'warning',
                confirmText: 'ออกจากระบบ',
                cancelText: 'ยกเลิก'
            });
            if (confirmed) {
                authManager.logout();
                this.switchPage('dashboard');
            }
        });

        // Form Standalone Login Submit
        document.getElementById('standalone-login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = document.getElementById('page-login-role').value;
            const username = document.getElementById('page-login-user').value;
            const password = document.getElementById('page-login-pass').value;

            const success = await authManager.login(role, username, password);
            if (success) {
                document.getElementById('login-screen-view')?.classList.add('hidden');
                console.log(`[App] Logged in successfully as ${role}`);
            }
        });

        // Modal Login Submit (Fallback)
        document.getElementById('form-login')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = document.getElementById('login-role').value;
            const username = document.getElementById('login-username').value;
            const success = await authManager.login(role, username, '');
            if (success) {
                this.closeModal('modal-login');
                alert(`เข้าสู่ระบบสำเร็จในฐานะ: ${CONFIG.ROLE_NAMES_TH[role]}`);
            }
        });

        // Student Modal & Actions
        document.getElementById('btn-add-student')?.addEventListener('click', () => {
            document.getElementById('form-student').reset();
            document.getElementById('student-id-input').value = '';
            this.openModal('modal-student');
        });

        document.getElementById('form-student')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student = {
                id: document.getElementById('student-id-input').value || undefined,
                studentId: document.getElementById('std-code').value.trim(),
                prefix: document.getElementById('std-prefix').value,
                fullName: document.getElementById('std-fullname').value.trim(),
                grade: document.getElementById('std-grade').value,
                room: document.getElementById('std-room').value.trim(),
                number: document.getElementById('std-number').value.trim(),
                phone: document.getElementById('std-phone').value.trim(),
                advisors: document.getElementById('std-advisors').value.trim()
            };
            await firebaseService.saveStudent(student);
            this.closeModal('modal-student');
            alert('บันทึกข้อมูลนักเรียนเรียบร้อย');
        });

        // Teacher Modal & Actions
        document.getElementById('btn-add-teacher')?.addEventListener('click', () => {
            document.getElementById('form-teacher').reset();
            document.getElementById('teacher-id-input').value = '';
            this.openModal('modal-teacher');
        });

        document.getElementById('form-teacher')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const teacher = {
                id: document.getElementById('teacher-id-input').value || undefined,
                prefix: document.getElementById('tch-prefix').value,
                fullName: document.getElementById('tch-fullname').value.trim(),
                position: document.getElementById('tch-position').value,
                responsibleRoom: document.getElementById('tch-room').value.trim(),
                phone: document.getElementById('tch-phone').value.trim()
            };
            await firebaseService.saveTeacher(teacher);
            this.closeModal('modal-teacher');
            alert('บันทึกข้อมูลครูเรียบร้อย');
        });

        // CSV Teacher Import Controls
        document.getElementById('btn-import-teacher-csv')?.addEventListener('click', () => this.openModal('modal-teacher-csv-import'));
        document.getElementById('btn-download-teacher-csv-template')?.addEventListener('click', () => csvImporter.downloadTeacherSampleTemplate());
        document.getElementById('btn-export-teachers-csv')?.addEventListener('click', () => {
            const teachers = firebaseService.getTeachers();
            csvImporter.exportTeachersToCSV(teachers);
        });

        document.getElementById('form-teacher-csv-import')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('teacher-csv-file-input');
            if (fileInput.files.length === 0) {
                alert('กรุณาเลือกไฟล์ CSV สำหรับนำเข้าข้อมูลครู');
                return;
            }
            try {
                const parsed = await csvImporter.parseTeacherCSV(fileInput.files[0]);
                await firebaseService.saveTeachersBatch(parsed);
                this.closeModal('modal-teacher-csv-import');
                alert(`นำเข้าข้อมูลครูสำเร็จจำนวน ${parsed.length} คน`);
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV ครู: ' + err.message);
            }
        });

        document.getElementById('teacher-search-input')?.addEventListener('input', () => this.renderTeacherList());
        document.getElementById('teacher-position-filter')?.addEventListener('change', () => this.renderTeacherList());

        // User Account Management Events
        document.getElementById('btn-add-user-account')?.addEventListener('click', () => {
            document.getElementById('form-user-account').reset();
            document.getElementById('usr-id-input').value = '';
            this.openModal('modal-user-account');
        });

        document.getElementById('form-user-account')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('usr-id-input').value;
            const username = document.getElementById('usr-username').value.trim();
            const fullName = document.getElementById('usr-fullname').value.trim();
            const role = document.getElementById('usr-role').value;
            const password = document.getElementById('usr-password').value.trim();

            const user = { id: id || undefined, username, fullName, role, password };
            await firebaseService.saveUser(user);
            this.closeModal('modal-user-account');
            alert('บันทึกข้อมูลชื่อผู้ใช้และรหัสผ่านเรียบร้อยแล้ว');
        });

        // Backup & Cache Handlers
        document.getElementById('btn-backup-json')?.addEventListener('click', () => {
            this.exportBackupJSON();
        });

        document.getElementById('btn-clear-cache')?.addEventListener('click', () => {
            this.clearCache();
        });

        // CSV Import Controls
        document.getElementById('btn-import-csv')?.addEventListener('click', () => this.openModal('modal-csv-import'));
        document.getElementById('btn-download-csv-template')?.addEventListener('click', () => csvImporter.downloadSampleTemplate());
        document.getElementById('btn-export-students-csv')?.addEventListener('click', () => {
            const students = firebaseService.getStudents();
            csvImporter.exportStudentsToCSV(students);
        });

        document.getElementById('form-csv-import')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('csv-file-input');
            if (fileInput.files.length === 0) {
                alert('กรุณาเลือกไฟล์ CSV สำหรับนำเข้า');
                return;
            }
            try {
                const parsed = await csvImporter.parseCSV(fileInput.files[0]);
                await firebaseService.saveStudentsBatch(parsed);
                this.closeModal('modal-csv-import');
                alert(`นำเข้าข้อมูลนักเรียนสำเร็จจำนวน ${parsed.length} คน`);
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: ' + err.message);
            }
        });

        // Screening Form Submit
        document.getElementById('form-screening')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('screening-student-select').value;
            const scoreAcademic = parseInt(document.getElementById('scr-academic').value || 0);
            const scoreBehavior = parseInt(document.getElementById('scr-behavior').value || 0);
            const scoreSubstance = parseInt(document.getElementById('scr-substance').value || 0);
            const scoreEconomic = parseInt(document.getElementById('scr-economic').value || 0);

            const totalScore = scoreAcademic + scoreBehavior + scoreSubstance + scoreEconomic;
            let resultLevel = 'normal';
            if (totalScore >= 5 || scoreBehavior >= 2) resultLevel = 'problem';
            else if (totalScore >= 2) resultLevel = 'risk';

            const screening = {
                studentId,
                totalScore,
                resultLevel,
                scores: { academic: scoreAcademic, behavior: scoreBehavior, substance: scoreSubstance, economic: scoreEconomic },
                assessor: authManager.getCurrentUser()?.name || 'ครูผู้ประเมิน',
                assessedAt: new Date().toISOString()
            };
            await firebaseService.saveScreening(screening);
            this.closeModal('modal-screening');
            alert(`บันทึกผลการคัดกรองเรียบร้อย! ผลการประเมิน: ${CONFIG.SCREENING_LEVELS[resultLevel.toUpperCase()].label}`);
        });
        document.getElementById('btn-open-screening')?.addEventListener('click', () => {
            const user = authManager.getCurrentUser();
            const select = document.getElementById('screening-student-select');
            if (select) {
                if (user && user.role === 'student') {
                    select.value = user.studentId;
                    select.disabled = true; // ล็อกไม่ให้เลือกนักเรียนคนอื่นเมื่อประเมินตนเอง
                } else {
                    select.disabled = false;
                }
            }
            this.openModal('modal-screening');
        });

        document.getElementById('btn-open-merit')?.addEventListener('click', () => {
            const user = authManager.getCurrentUser();
            const select = document.getElementById('merit-student-select');
            if (select) {
                if (user && user.role === 'student') {
                    select.value = user.studentId;
                    select.disabled = true;
                } else {
                    select.disabled = false;
                }
            }
            this.openModal('modal-merit');
        });

        // Offense Form & Image Drop Setup
        document.getElementById('btn-open-offense')?.addEventListener('click', () => {
            document.getElementById('form-offense').reset();
            document.getElementById('offense-image-preview').style.display = 'none';
            this.selectedOffenseProofFile = null;
            this.openModal('modal-offense');
        });

        const dropZone = document.getElementById('offense-drop-zone');
        const fileInput = document.getElementById('offense-file-input');
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleOffenseImageSelect(e.target.files[0]);
                }
            });
        }

        document.getElementById('form-offense')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('offense-student-select').value;
            const students = firebaseService.getStudents();
            const student = students.find(s => s.id === studentId || s.studentId === studentId);

            let imageUrl = '';
            if (this.selectedOffenseProofFile) {
                try {
                    const uploadResult = await cloudinaryService.uploadImage(this.selectedOffenseProofFile);
                    imageUrl = uploadResult.url;
                } catch (err) {
                    console.warn('Image upload failed, continuing without photo:', err);
                }
            }

            const offense = {
                studentId: student ? student.studentId : studentId,
                studentName: student ? `${student.prefix || ''}${student.fullName}` : 'ไม่ระบุชื่อ',
                gradeRoom: student ? `${student.grade}/${student.room}` : '-',
                studentNumber: student ? student.number : '-',
                level: document.getElementById('offense-level').value,
                category: document.getElementById('offense-category').value,
                location: document.getElementById('offense-location').value.trim(),
                incidentDate: document.getElementById('offense-date').value || new Date().toISOString().slice(0, 10),
                description: document.getElementById('offense-desc').value.trim(),
                actionTaken: document.getElementById('offense-action').value.trim(),
                referralType: document.getElementById('offense-referral').value,
                imageUrl: imageUrl,
                recordedBy: authManager.getCurrentUser()?.name || 'ครูกิจการนักเรียน'
            };

            await firebaseService.saveOffense(offense);

            // If referral selected, create referral record automatically
            if (offense.referralType !== 'none') {
                await firebaseService.saveReferral({
                    studentId: offense.studentId,
                    studentName: offense.studentName,
                    type: offense.referralType,
                    reason: `กระทำความผิดระดับ ${offense.level}: ${offense.category}`,
                    status: 'pending',
                    targetAgency: offense.referralType === 'internal' ? 'ครูแนะแนว/ฝ่ายปกครอง' : 'สถานีตำรวจ/สาธารณสุข'
                });
            }

            this.closeModal('modal-offense');
            alert('บันทึกข้อมูลการกระทำผิดของนักเรียนเรียบร้อย');
        });

        // Merit Activity Submit
        document.getElementById('btn-open-merit')?.addEventListener('click', () => this.openModal('modal-merit'));
        document.getElementById('form-merit')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('merit-student-select').value;
            const activityId = document.getElementById('merit-activity-select').value;
            const activities = firebaseService.getActivities();
            const activity = activities.find(a => a.id === activityId);

            const merit = {
                studentId,
                activityName: activity ? activity.name : 'กิจกรรมสาธารณประโยชน์',
                points: activity ? activity.points : 10,
                details: document.getElementById('merit-details').value.trim(),
                recordedDate: new Date().toISOString().slice(0, 10)
            };
            await firebaseService.saveMerit(merit);
            this.closeModal('modal-merit');
            alert('บันทึกการทำความดีสำเร็จ!');
        });

        // Referral Form Submit
        document.getElementById('btn-open-referral')?.addEventListener('click', () => this.openModal('modal-referral'));
        document.getElementById('form-referral')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('ref-student-select').value;
            const students = firebaseService.getStudents();
            const student = students.find(s => s.studentId === studentId || s.id === studentId);

            const referral = {
                studentId: student ? student.studentId : studentId,
                studentName: student ? student.fullName : 'นักเรียน',
                type: document.getElementById('ref-type').value,
                targetAgency: document.getElementById('ref-agency').value.trim(),
                reason: document.getElementById('ref-reason').value.trim(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            await firebaseService.saveReferral(referral);
            this.closeModal('modal-referral');
            alert('บันทึกการส่งต่อนักเรียนเรียบร้อย');
        });

        // Search & Filter Triggers
        document.getElementById('student-search-input')?.addEventListener('input', () => this.renderStudentList());
        document.getElementById('student-grade-filter')?.addEventListener('change', () => this.renderStudentList());
    }

    handleOffenseImageSelect(file) {
        this.selectedOffenseProofFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('offense-image-preview');
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    // Modal Helpers
    openModal(id) {
        document.getElementById(id)?.classList.add('active');
    }
    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }

    updateStudentDropdowns() {
        const students = firebaseService.getStudents();
        const dropdowns = ['screening-student-select', 'offense-student-select', 'merit-student-select', 'ref-student-select'];

        dropdowns.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<option value="">-- เลือนักเรียน --</option>';
                students.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.studentId || s.id;
                    opt.textContent = `[${s.grade}/${s.room}] ${s.prefix || ''}${s.fullName} (รหัส ${s.studentId})`;
                    el.appendChild(opt);
                });
            }
        });
    }

    // --- Render Dashboard Analytics & Futuristic Charts ---
    renderDashboard() {
        const students = firebaseService.getStudents();
        const screenings = firebaseService.getScreenings();
        const merits = firebaseService.getMerits();
        const offenses = firebaseService.getOffenses();
        const referrals = firebaseService.getReferrals();

        // Update Stat Live Counter Displays
        document.getElementById('stat-total-students').textContent = students.length;
        
        const problemScreenings = screenings.filter(s => s.resultLevel === 'problem').length;
        const riskScreenings = screenings.filter(s => s.resultLevel === 'risk').length;
        document.getElementById('stat-risk-count').textContent = riskScreenings + problemScreenings;

        document.getElementById('stat-merit-count').textContent = merits.length;
        document.getElementById('stat-offense-count').textContent = offenses.length;
        document.getElementById('stat-referral-count').textContent = referrals.length;

        // Render Charts & Activity Feed
        this.renderDashboardCharts();
        this.renderDashboardActivityFeed();
    }

    startLiveClock() {
        const updateClock = () => {
            const el = document.getElementById('clock-time-display');
            if (el) {
                const now = new Date();
                el.textContent = now.toLocaleTimeString('th-TH', { hour12: false });
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    renderDashboardActivityFeed() {
        const feedContainer = document.getElementById('dashboard-activity-feed');
        if (!feedContainer) return;

        const merits = firebaseService.getMerits().map(m => ({ ...m, type: 'merit', time: m.createdAt }));
        const offenses = firebaseService.getOffenses().map(o => ({ ...o, type: 'offense', time: o.createdAt }));
        const screenings = firebaseService.getScreenings().map(s => ({ ...s, type: 'screening', time: s.createdAt }));

        const allActivities = [...merits, ...offenses, ...screenings]
            .filter(a => a.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);

        feedContainer.innerHTML = '';
        if (allActivities.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center; padding: 16px; color: #64748b;">ยังไม่มีรายการกิจกรรมการดูแลช่วยเหลือล่าสุด</div>';
            return;
        }

        allActivities.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';

            let iconClass = 'screening';
            let iconMarkup = '<i class="ri-heart-pulse-line"></i>';
            let title = '';
            let subtitle = '';

            if (item.type === 'merit') {
                iconClass = 'merit';
                iconMarkup = '<i class="ri-award-line"></i>';
                title = `บันทึกความดี: ${item.studentName || 'นักเรียน'}`;
                subtitle = `${item.activityName || item.category || 'จิตอาสาบำเพ็ญประโยชน์'} (+${item.points || 10} คะแนน)`;
            } else if (item.type === 'offense') {
                iconClass = 'offense';
                iconMarkup = '<i class="ri-error-warning-line"></i>';
                title = `รายงานพฤติกรรม: ${item.studentName || 'นักเรียน'}`;
                subtitle = `หมวด: ${item.category} (ระดับ: ${item.level === 'severe' ? 'ร้ายแรง' : item.level === 'moderate' ? 'ปานกลาง' : 'เบา'})`;
            } else {
                iconClass = 'screening';
                iconMarkup = '<i class="ri-shield-user-line"></i>';
                title = `การคัดกรอง: ${item.studentName || 'นักเรียน'}`;
                subtitle = `ผลการประเมิน: ${item.resultLevel === 'problem' ? 'มีปัญหา' : item.resultLevel === 'risk' ? 'กลุ่มเสี่ยง' : 'ปกติ'}`;
            }

            const dateStr = item.time ? new Date(item.time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

            div.innerHTML = `
                <div class="activity-left">
                    <div class="activity-icon ${iconClass}">${iconMarkup}</div>
                    <div>
                        <div class="activity-title">${title}</div>
                        <div class="activity-sub">${subtitle}</div>
                    </div>
                </div>
                <div class="activity-time"><i class="ri-time-line"></i> ${dateStr}</div>
            `;
            feedContainer.appendChild(div);
        });
    }

    renderDashboardCharts() {
        if (!window.Chart) return;

        const screenings = firebaseService.getScreenings();
        const offenses = firebaseService.getOffenses();

        // 1. Calculate Screening Metrics & Percentages
        const totalScreened = screenings.length || 1;
        const normalCount = screenings.filter(s => s.resultLevel === 'normal').length;
        const riskCount = screenings.filter(s => s.resultLevel === 'risk').length;
        const problemCount = screenings.filter(s => s.resultLevel === 'problem').length;

        const normalPct = Math.round((normalCount / totalScreened) * 100);
        const riskPct = Math.round((riskCount / totalScreened) * 100);
        const problemPct = Math.round((problemCount / totalScreened) * 100);

        // Update Breakdown UI Elements
        const elNormCnt = document.getElementById('dash-cnt-normal');
        const elNormPct = document.getElementById('dash-pct-normal');
        const elNormBar = document.getElementById('dash-bar-normal');
        if (elNormCnt) elNormCnt.textContent = `${normalCount} คน`;
        if (elNormPct) elNormPct.textContent = `${normalPct}%`;
        if (elNormBar) elNormBar.style.width = `${normalPct}%`;

        const elRiskCnt = document.getElementById('dash-cnt-risk');
        const elRiskPct = document.getElementById('dash-pct-risk');
        const elRiskBar = document.getElementById('dash-bar-risk');
        if (elRiskCnt) elRiskCnt.textContent = `${riskCount} คน`;
        if (elRiskPct) elRiskPct.textContent = `${riskPct}%`;
        if (elRiskBar) elRiskBar.style.width = `${riskPct}%`;

        const elProbCnt = document.getElementById('dash-cnt-problem');
        const elProbPct = document.getElementById('dash-pct-problem');
        const elProbBar = document.getElementById('dash-bar-problem');
        if (elProbCnt) elProbCnt.textContent = `${problemCount} คน`;
        if (elProbPct) elProbPct.textContent = `${problemPct}%`;
        if (elProbBar) elProbBar.style.width = `${problemPct}%`;

        // Chart 1: Risk Level Distribution (Modern Doughnut)
        const ctxRisk = document.getElementById('chart-risk-distribution')?.getContext('2d');
        if (ctxRisk) {
            if (this.charts.risk) this.charts.risk.destroy();
            this.charts.risk = new Chart(ctxRisk, {
                type: 'doughnut',
                data: {
                    labels: ['กลุ่มปกติ', 'กลุ่มเสี่ยง', 'กลุ่มมีปัญหา'],
                    datasets: [{
                        data: [normalCount || 1, riskCount, problemCount],
                        backgroundColor: ['#059669', '#d97706', '#e11d48'],
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: '#0f172a',
                                font: { family: 'Prompt', size: 12, weight: '600' },
                                padding: 14,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }

        // 2. Calculate Offense Metrics
        const totalOffenses = offenses.length || 1;
        const minor = offenses.filter(o => o.level === 'minor').length;
        const moderate = offenses.filter(o => o.level === 'moderate').length;
        const severe = offenses.filter(o => o.level === 'severe').length;

        const minorPct = Math.round((minor / totalOffenses) * 100);
        const modPct = Math.round((moderate / totalOffenses) * 100);
        const sevPct = Math.round((severe / totalOffenses) * 100);

        const elMinCnt = document.getElementById('dash-cnt-offense-minor');
        const elMinBar = document.getElementById('dash-bar-offense-minor');
        if (elMinCnt) elMinCnt.textContent = `${minor} เคส`;
        if (elMinBar) elMinBar.style.width = `${offenses.length ? minorPct : 0}%`;

        const elModCnt = document.getElementById('dash-cnt-offense-moderate');
        const elModBar = document.getElementById('dash-bar-offense-moderate');
        if (elModCnt) elModCnt.textContent = `${moderate} เคส`;
        if (elModBar) elModBar.style.width = `${offenses.length ? modPct : 0}%`;

        const elSevCnt = document.getElementById('dash-cnt-offense-severe');
        const elSevBar = document.getElementById('dash-bar-offense-severe');
        if (elSevCnt) elSevCnt.textContent = `${severe} เคส`;
        if (elSevBar) elSevBar.style.width = `${offenses.length ? sevPct : 0}%`;

        // Chart 2: Offense Severity Breakdown (Bar)
        const ctxOffense = document.getElementById('chart-offense-summary')?.getContext('2d');
        if (ctxOffense) {
            if (this.charts.offense) this.charts.offense.destroy();
            this.charts.offense = new Chart(ctxOffense, {
                type: 'bar',
                data: {
                    labels: ['ความผิดเบา', 'ปานกลาง', 'ร้ายแรง'],
                    datasets: [{
                        label: 'จำนวนเคสพฤติกรรม',
                        data: [minor, moderate, severe],
                        backgroundColor: ['#0284c7', '#d97706', '#e11d48'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#334155', font: { family: 'Prompt', weight: '600' } }, grid: { color: '#e2e8f0' } },
                        x: { ticks: { color: '#0f172a', font: { family: 'Prompt', weight: '600' } }, grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }

    // --- Render Data Views ---

    renderStudentList() {
        const tbody = document.getElementById('table-students-body');
        if (!tbody) return;

        let students = firebaseService.getStudents();
        const search = document.getElementById('student-search-input')?.value.toLowerCase() || '';
        const gradeFilter = document.getElementById('student-grade-filter')?.value || '';

        if (search) {
            students = students.filter(s => 
                s.fullName.toLowerCase().includes(search) || 
                s.studentId.includes(search)
            );
        }
        if (gradeFilter) {
            students = students.filter(s => s.grade === gradeFilter);
        }

        tbody.innerHTML = '';
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">ไม่พบข้อมูลนักเรียน</td></tr>';
            return;
        }

        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color:#38bdf8;">${s.studentId}</strong></td>
                <td>${s.prefix || ''}${s.fullName}</td>
                <td><span class="badge badge-normal">${s.grade}/${s.room}</span></td>
                <td>${s.number}</td>
                <td>${s.phone || '-'}</td>
                <td>${s.advisors || s.advisorTeachers || s.guardian || '-'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm teacher-only" onclick="app.editStudent('${s.id}')"><i class="ri-edit-line"></i> แก้ไข</button>
                    <button class="btn btn-danger btn-sm teacher-only" onclick="app.deleteStudent('${s.id}')"><i class="ri-delete-bin-line"></i> ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        authManager.applyUIPermissions();
    }

    async deleteStudent(id) {
        const confirmed = await this.confirmDialog({
            title: 'ยืนยันการลบข้อมูลนักเรียน',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนักเรียนรายนี้ออกจากระบบ? ข้อมูลประวัติและการประเมินทั้งหมดจะถูกลบ',
            type: 'danger',
            confirmText: 'ลบข้อมูลนักเรียน'
        });
        if (confirmed) {
            await firebaseService.deleteStudent(id);
            alert('ลบข้อมูลนักเรียนสำเร็จ');
        }
    }

    renderTeacherList() {
        const tbody = document.getElementById('table-teachers-body');
        if (!tbody) return;

        let teachers = firebaseService.getTeachers();
        const search = document.getElementById('teacher-search-input')?.value.toLowerCase() || '';
        const positionFilter = document.getElementById('teacher-position-filter')?.value || '';

        if (search) {
            teachers = teachers.filter(t => 
                t.fullName.toLowerCase().includes(search) || 
                (t.responsibleRoom && t.responsibleRoom.toLowerCase().includes(search)) ||
                (t.phone && t.phone.includes(search))
            );
        }
        if (positionFilter) {
            teachers = teachers.filter(t => t.position === positionFilter);
        }

        tbody.innerHTML = '';
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">ไม่พบข้อมูลครู/บุคลากร</td></tr>';
            return;
        }

        teachers.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color:#0f172a;">${t.prefix || ''}${t.fullName}</strong></td>
                <td><span class="badge badge-minor">${t.position}</span></td>
                <td><span class="badge badge-normal">${t.responsibleRoom || t.responsibleGrade || '-'}</span></td>
                <td>${t.phone || '-'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm teacher-only" onclick="app.editTeacher('${t.id}')"><i class="ri-edit-line"></i> แก้ไข</button>
                    <button class="btn btn-danger btn-sm teacher-only" onclick="app.deleteTeacher('${t.id}')"><i class="ri-delete-bin-line"></i> ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        authManager.applyUIPermissions();
    }

    async deleteTeacher(id) {
        const confirmed = await this.confirmDialog({
            title: 'ยืนยันการลบข้อมูลครู/บุคลากร',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลครู/บุคลากรท่านนี้ออกจากระบบ?',
            type: 'danger',
            confirmText: 'ลบข้อมูลครู'
        });
        if (confirmed) {
            await firebaseService.deleteTeacher(id);
            alert('ลบข้อมูลครูเรียบร้อย');
        }
    }

    editTeacher(id) {
        const teachers = firebaseService.getTeachers();
        const t = teachers.find(item => item.id === id);
        if (t) {
            document.getElementById('teacher-id-input').value = t.id;
            document.getElementById('tch-prefix').value = t.prefix || 'นาย';
            document.getElementById('tch-fullname').value = t.fullName;
            document.getElementById('tch-position').value = t.position;
            document.getElementById('tch-room').value = t.responsibleRoom || t.responsibleGrade || '';
            document.getElementById('tch-phone').value = t.phone || '';
            this.openModal('modal-teacher');
        }
    }

    editStudent(id) {
        const students = firebaseService.getStudents();
        const s = students.find(item => item.id === id);
        if (s) {
            document.getElementById('student-id-input').value = s.id;
            document.getElementById('std-code').value = s.studentId;
            document.getElementById('std-prefix').value = s.prefix || 'นาย';
            document.getElementById('std-fullname').value = s.fullName;
            document.getElementById('std-grade').value = s.grade;
            document.getElementById('std-room').value = s.room;
            document.getElementById('std-number').value = s.number;
            document.getElementById('std-phone').value = s.phone || '';
            document.getElementById('std-advisors').value = s.advisors || s.advisorTeachers || s.guardian || '';
            this.openModal('modal-student');
        }
    }

    renderScreenings() {
        const tbody = document.getElementById('table-screenings-body');
        if (!tbody) return;
        let screenings = firebaseService.getScreenings();
        const students = firebaseService.getStudents();
        const user = authManager.getCurrentUser();

        // If Student role, filter to student's own screening records
        if (user && user.role === 'student') {
            screenings = screenings.filter(s => s.studentId === user.studentId || s.studentId === user.id);
        }

        tbody.innerHTML = '';
        if (screenings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">ยังไม่มีผลการคัดกรองพฤติกรรม</td></tr>';
            return;
        }

        screenings.forEach(scr => {
            const student = students.find(s => s.studentId === scr.studentId || s.id === scr.studentId);
            const levelInfo = CONFIG.SCREENING_LEVELS[scr.resultLevel.toUpperCase()] || CONFIG.SCREENING_LEVELS.NORMAL;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student ? `${student.prefix || ''}${student.fullName} (${student.grade}/${student.room})` : (user && user.role === 'student' ? user.name : scr.studentId)}</td>
                <td><span class="badge" style="background:${levelInfo.bg}; color:${levelInfo.color}; border:1px solid ${levelInfo.color};">${levelInfo.label}</span></td>
                <td>${scr.totalScore} คะแนน</td>
                <td>${scr.assessor}</td>
                <td>${new Date(scr.assessedAt).toLocaleDateString('th-TH')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderMerits() {
        const tbody = document.getElementById('table-merits-body');
        if (!tbody) return;
        let merits = firebaseService.getMerits();
        const students = firebaseService.getStudents();
        const user = authManager.getCurrentUser();

        // If Student role, filter to student's own merit records
        if (user && user.role === 'student') {
            merits = merits.filter(m => m.studentId === user.studentId || m.studentId === user.id);
        }

        tbody.innerHTML = '';
        if (merits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">ยังไม่มีรายการทำความดี</td></tr>';
            return;
        }

        merits.forEach(m => {
            const student = students.find(s => s.studentId === m.studentId || s.id === m.studentId);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student ? `${student.prefix || ''}${student.fullName} (${student.grade}/${student.room})` : (user && user.role === 'student' ? user.name : m.studentId)}</td>
                <td><strong style="color:#34d399;">${m.activityName}</strong></td>
                <td>+${m.points} คะแนน</td>
                <td>${m.details || '-'}</td>
                <td>${m.recordedDate}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderOffenses() {
        const tbody = document.getElementById('table-offenses-body');
        if (!tbody) return;
        const offenses = firebaseService.getOffenses();

        tbody.innerHTML = '';
        if (offenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">ไม่มีประวัติการกระทำความผิด</td></tr>';
            return;
        }

        offenses.forEach(off => {
            const levelBadgeClass = `badge-${off.level}`;
            const levelLabel = off.level === 'severe' ? 'ร้ายแรง' : (off.level === 'moderate' ? 'ปานกลาง' : 'เบา');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${off.studentName}</strong> <br><small style="color:#64748b;">${off.gradeRoom}</small></td>
                <td><span class="badge ${levelBadgeClass}">${levelLabel}</span></td>
                <td>${off.category}</td>
                <td>${off.incidentDate}</td>
                <td>${off.imageUrl ? '<i class="ri-image-line" style="color:#38bdf8;"></i> มีรูปหลักฐาน' : 'ไม่มีรูป'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="app.downloadOffensePDF('${off.id}')"><i class="ri-file-pdf-line"></i> รายงาน PDF</button>
                    <button class="btn btn-danger btn-sm teacher-only" onclick="app.deleteOffense('${off.id}')"><i class="ri-delete-bin-line"></i> ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        authManager.applyUIPermissions();
    }

    async deleteOffense(id) {
        const confirmed = await this.confirmDialog({
            title: 'ยืนยันการลบรายการพฤติกรรม',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการกระทำผิดนี้ออกจากระบบ?',
            type: 'danger',
            confirmText: 'ลบรายการ'
        });
        if (confirmed) {
            await firebaseService.deleteOffense(id);
            alert('ลบรายการสำเร็จ');
        }
    }

    async downloadOffensePDF(id) {
        const offenses = firebaseService.getOffenses();
        const offense = offenses.find(o => o.id === id);
        if (offense) {
            const students = firebaseService.getStudents();
            const student = students.find(s => s.studentId === offense.studentId || s.id === offense.studentId);
            await pdfGenerator.generateOffenseReport(offense, student);
        }
    }

    renderReferrals() {
        const tbody = document.getElementById('table-referrals-body');
        if (!tbody) return;
        const referrals = firebaseService.getReferrals();

        tbody.innerHTML = '';
        if (referrals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">ไม่มีรายการส่งต่อ</td></tr>';
            return;
        }

        referrals.forEach(ref => {
            const typeLabel = ref.type === 'internal' ? 'ส่งต่อภายใน' : 'ส่งต่อภายนอก';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${ref.studentName}</strong></td>
                <td><span class="badge badge-minor">${typeLabel}</span></td>
                <td>${ref.targetAgency || '-'}</td>
                <td>${ref.reason}</td>
                <td><span class="badge badge-risk">${ref.status === 'pending' ? 'รอการดำเนินการ' : 'เสร็จสิ้น'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderActivitiesList() {
        const listEl = document.getElementById('activities-catalog-list');
        if (!listEl) return;
        const activities = firebaseService.getActivities();
        listEl.innerHTML = '';
        activities.forEach(a => {
            const div = document.createElement('div');
            div.className = 'glass-panel';
            div.style.marginBottom = '12px';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#38bdf8; font-size:1.1rem;">${a.name}</strong>
                        <div style="font-size:0.85rem; color:#94a3b8;">หมวดหมู่: ${a.category}</div>
                    </div>
                    <span class="badge badge-normal">+${a.points} คะแนน</span>
                </div>
            `;
            listEl.appendChild(div);
        });
    }

    // --- Standalone Login Helpers ---
    setLoginRole(role) {
        document.getElementById('page-login-role').value = role;
        const pills = {
            teacher: document.getElementById('role-pill-teacher'),
            student: document.getElementById('role-pill-student'),
            admin: document.getElementById('role-pill-admin')
        };

        Object.keys(pills).forEach(r => {
            if (pills[r]) {
                if (r === role) pills[r].classList.add('active');
                else pills[r].classList.remove('active');
            }
        });

        const usernameInput = document.getElementById('page-login-user');
        if (usernameInput) {
            if (role === 'teacher') usernameInput.value = 'ครูสมศักดิ์ รักเรียน';
            else if (role === 'student') usernameInput.value = '66001';
            else if (role === 'admin') usernameInput.value = 'ผู้ดูแลระบบ';
        }
    }

    togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<i class="ri-eye-off-line"></i>';
        } else {
            input.type = 'password';
            btn.innerHTML = '<i class="ri-eye-line"></i>';
        }
    }
    // --- User Accounts Seed Data & Methods ---
    checkAndLoadUserSeedData() {
        const users = firebaseService.getUsers();
        if (!users || users.length === 0) {
            console.log('[App] Seeding initial User Accounts with Passwords...');
            const defaultUsers = [
                { id: 'USR_ADMIN_01', username: 'admin', fullName: 'ผู้ดูแลระบบ (Admin)', role: 'admin', password: 'admin123', createdAt: new Date().toISOString() },
                { id: 'USR_TEACHER_01', username: 'teacher1', fullName: 'ครูสมศักดิ์ รักเรียน', role: 'teacher', password: 'teacher123', createdAt: new Date().toISOString() },
                { id: 'USR_STUDENT_01', username: '66001', fullName: 'นายสมชาย สายชล', role: 'student', password: '123456', createdAt: new Date().toISOString() }
            ];
            firebaseService.saveUsersBatch(defaultUsers);
        }
    }

    renderUserList() {
        const tbody = document.getElementById('table-users-body');
        if (!tbody) return;

        const users = firebaseService.getUsers();
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">ไม่มีข้อมูลผู้ใช้งานระบบ</td></tr>';
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            let roleBadge = 'badge-normal';
            let roleTitle = 'ครู / บุคลากร';

            if (u.role === 'admin') {
                roleBadge = 'badge-risk';
                roleTitle = '🛡️ ผู้ดูแลระบบ';
            } else if (u.role === 'student') {
                roleBadge = 'badge-minor';
                roleTitle = '🎓 นักเรียน';
            } else {
                roleBadge = 'badge-normal';
                roleTitle = '👨‍🏫 ครู / บุคลากร';
            }

            tr.innerHTML = `
                <td><strong style="color:#0284c7;">${u.username}</strong></td>
                <td>${u.fullName}</td>
                <td><span class="badge ${roleBadge}">${roleTitle}</span></td>
                <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-weight:700; color:#e11d48;">${u.password || '******'}</code></td>
                <td><span class="badge badge-normal"><i class="ri-checkbox-circle-line"></i> ใช้งานอยู่</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="app.editUser('${u.id}')"><i class="ri-edit-line"></i> แก้ไข</button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteUser('${u.id}')"><i class="ri-delete-bin-line"></i> ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        authManager.applyUIPermissions();
    }

    editUser(id) {
        const users = firebaseService.getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            document.getElementById('usr-id-input').value = user.id;
            document.getElementById('usr-username').value = user.username || '';
            document.getElementById('usr-fullname').value = user.fullName || '';
            document.getElementById('usr-role').value = user.role || 'teacher';
            document.getElementById('usr-password').value = user.password || '';
            this.openModal('modal-user-account');
        }
    }

    async deleteUser(id) {
        const confirmed = await this.confirmDialog({
            title: 'ยืนยันการลบบัญชีผู้ใช้งาน',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้และรหัสผ่านนี้ออกจากระบบ?',
            type: 'danger',
            confirmText: 'ลบบัญชีผู้ใช้'
        });
        if (confirmed) {
            await firebaseService.deleteUser(id);
            alert('ลบบัญชีผู้ใช้เรียบร้อยแล้ว');
        }
    }

    exportBackupJSON() {
        const backupData = {
            exportDate: new Date().toISOString(),
            system: 'งานกิจการนักเรียนโรงเรียนพนมดงรักวิทยา',
            version: '2026.1.0',
            students: firebaseService.getStudents(),
            teachers: firebaseService.getTeachers(),
            users: firebaseService.getUsers(),
            screenings: firebaseService.getScreenings(),
            merits: firebaseService.getMerits(),
            offenses: firebaseService.getOffenses(),
            referrals: firebaseService.getReferrals()
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_prcare_system_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
    }

    async clearCache() {
        const confirmed = await this.confirmDialog({
            title: 'ยืนยันการล้างแคชระบบ',
            message: 'คุณต้องการล้างแคชเครื่อง LocalStorage ทั้งหมดใช่หรือไม่? (ระบบจะซิงค์ข้อมูลใหม่จากคลาวด์)',
            type: 'warning',
            confirmText: 'ล้างแคชเครื่อง'
        });
        if (confirmed) {
            localStorage.clear();
            alert('ล้างแคชเครื่องเรียบร้อยแล้ว ระบบกำลังโหลดข้อมูลใหม่...');
            window.location.reload();
        }
    }

    // --- Custom Confirmation Dialog Helper ---
    confirmDialog({ title, message, type = 'danger', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก' }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-confirm-dialog');
            const iconWrapper = document.getElementById('confirm-dialog-icon');
            const iconI = document.getElementById('confirm-dialog-icon-i');
            const titleEl = document.getElementById('confirm-dialog-title');
            const msgEl = document.getElementById('confirm-dialog-message');
            const btnCancel = document.getElementById('confirm-dialog-btn-cancel');
            const btnOk = document.getElementById('confirm-dialog-btn-ok');

            if (!modal) {
                resolve(confirm(message));
                return;
            }

            if (titleEl) titleEl.textContent = title || 'ยืนยันการทำรายการ';
            if (msgEl) msgEl.textContent = message || 'คุณต้องการดำเนินการนี้ใช่หรือไม่?';

            if (iconWrapper) iconWrapper.className = `confirm-icon-wrapper ${type}`;
            if (iconI) {
                if (type === 'danger') iconI.className = 'ri-error-warning-line';
                else if (type === 'warning') iconI.className = 'ri-alert-line';
                else iconI.className = 'ri-question-line';
            }

            if (btnOk) {
                btnOk.className = `btn btn-${type === 'info' ? 'primary' : type === 'warning' ? 'warning' : 'danger'}`;
                btnOk.innerHTML = `<i class="ri-checkbox-circle-line"></i> ${confirmText}`;
            }

            if (btnCancel) {
                btnCancel.innerHTML = `<i class="ri-close-line"></i> ${cancelText}`;
            }

            this.openModal('modal-confirm-dialog');

            const handleOk = (e) => {
                e.preventDefault();
                cleanup();
                this.closeModal('modal-confirm-dialog');
                resolve(true);
            };

            const handleCancel = (e) => {
                e.preventDefault();
                cleanup();
                this.closeModal('modal-confirm-dialog');
                resolve(false);
            };

            const cleanup = () => {
                btnOk?.removeEventListener('click', handleOk);
                btnCancel?.removeEventListener('click', handleCancel);
            };

            btnOk?.addEventListener('click', handleOk);
            btnCancel?.addEventListener('click', handleCancel);
        });
    }
}

const app = new Application();
