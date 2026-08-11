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

        // Auto Cache Bust & Purge Sample Data on Version Bump (v1.3)
        const currentVersion = CONFIG.SYSTEM_VERSION || '1.3';
        const savedVersion = localStorage.getItem('prcare_app_ver');
        if (savedVersion !== currentVersion) {
            console.log(`[App] Version bump detected (${savedVersion} -> ${currentVersion}). Purging sample dummy data...`);
            localStorage.setItem('prcare_app_ver', currentVersion);

            // Filter out legacy sample teachers
            const sampleNames = ['นายมนัส เทศทอง', 'นายอนันต์ ชัยชนะ', 'นางสมศรี ใจดี', 'นางสาวพะลินี ลาภไธสง', 'นายธนบดี สอนตระกูล', 'นางสาวกนกพร สุขินดี', 'นายยศศวรรษ พิมพ์เก่า', 'นายรัชชวิจินันท์ ไทรคีพะเนาว์', 'นายธนบิต ดวงจาซี', 'นายชัชวาล สุขดี', 'นายสมศักดิ์ รักเรียน', 'นายวิเชียร ดีเลิศ', 'นางสาวพิมพ์มาดา รักดี'];
            let teachers = firebaseService.getTeachers() || [];
            teachers = teachers.filter(t => !sampleNames.includes(t.fullName));
            firebaseService.setCache(CONFIG.STORAGE_KEYS.TEACHERS, teachers);

            let students = firebaseService.getStudents() || [];
            const sampleStdIds = ['66001', '66002', '66003', '66004', '66005', '66006', '66007', '66008', '66009'];
            students = students.filter(s => !sampleStdIds.includes(s.studentId));
            firebaseService.setCache(CONFIG.STORAGE_KEYS.STUDENTS, students);
        }

        // 1. Load Seed Data if database empty
        this.checkAndLoadSeedData();
        this.checkAndLoadTeacherSeedData();
        this.checkAndLoadUserSeedData();

        // 2. Setup Page Routing & Navigation
        this.setupNavigation();

        // Override window.alert to use custom beautiful white card popup
        window.alert = (msg) => {
            this.alertDialog({ title: 'แจ้งเตือนระบบ', message: msg, type: 'info' });
        };

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
            if (this._skipStudentListRefresh) return; // skip if CSV import is in progress
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

    // --- Seed Data Loader (Disabled Sample Data Auto-Loader) ---
    checkAndLoadSeedData() {
        // Disabled sample student seed data as requested
    }

    checkAndLoadTeacherSeedData() {
        // Disabled sample teacher seed data as requested
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
                const loginView = document.getElementById('login-screen-view');
                if (loginView) {
                    loginView.classList.remove('hidden');
                    loginView.style.display = 'flex';
                    loginView.style.opacity = '1';
                    loginView.style.visibility = 'visible';
                    loginView.style.pointerEvents = 'auto';
                }
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
                advisors: document.getElementById('std-advisors').value.trim()
            };
            await firebaseService.saveStudent(student);
            this.closeModal('modal-student');
            await this.alertDialog({ title: 'บันทึกข้อมูลสำเร็จ', message: 'บันทึกข้อมูลนักเรียนเรียบร้อยแล้ว', type: 'success' });
        });

        // Batch Delete Students Modal & Event Listeners
        document.getElementById('btn-batch-delete-students')?.addEventListener('click', () => {
            this.updateBatchDeleteCountPreview();
            this.openModal('modal-batch-delete-students');
        });

        document.getElementById('batch-delete-grade-select')?.addEventListener('change', () => this.updateBatchDeleteCountPreview());
        document.getElementById('batch-delete-room-select')?.addEventListener('change', () => this.updateBatchDeleteCountPreview());

        document.getElementById('form-batch-delete-students')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const grade = document.getElementById('batch-delete-grade-select').value;
            const room = document.getElementById('batch-delete-room-select').value;

            const students = firebaseService.getStudents();
            const matching = students.filter(s => {
                const matchGrade = (grade === 'ALL' || !grade) ? true : (s.grade === grade);
                const matchRoom = (room === 'ALL' || !room) ? true : (String(s.room) === String(room));
                return matchGrade && matchRoom;
            });

            if (matching.length === 0) {
                await this.alertDialog({
                    title: 'ไม่พบข้อมูลนักเรียน',
                    message: 'ไม่พบรายชื่อนักเรียนตรงตามระดับชั้นและห้องที่เลือก',
                    type: 'warning'
                });
                return;
            }

            const gradeText = grade === 'ALL' ? 'ทุกระดับชั้น' : grade;
            const roomText = room === 'ALL' ? 'ทุกห้อง' : `ห้อง ${room}`;

            const confirmed = await this.confirmDialog({
                title: 'ยืนยันลบข้อมูลนักเรียนยกชุด',
                message: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนักเรียนกลุ่ม (${gradeText} ${roomText}) จำนวนรวมทั้งหมด ${matching.length} ราย ออกจากระบบ?`,
                type: 'danger',
                confirmText: 'ลบข้อมูลกลุ่มนี้'
            });

            if (confirmed) {
                const deletedCount = await firebaseService.deleteStudentsBatch(grade, room);
                this.closeModal('modal-batch-delete-students');
                this.renderStudentList();
                this.renderDashboard();
                await this.alertDialog({
                    title: 'ลบข้อมูลสำเร็จ',
                    message: `ระบบได้ทำการลบข้อมูลนักเรียนกลุ่ม ${gradeText} ${roomText} จำนวน ${deletedCount} ราย ออกจากระบบเรียบร้อยแล้ว`,
                    type: 'success'
                });
            }
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
                fullName: document.getElementById('tch-fullname').value.trim(),
                position: document.getElementById('tch-position').value,
                responsibleRoom: document.getElementById('tch-room').value.trim(),
                phone: document.getElementById('tch-phone').value.trim()
            };
            await firebaseService.saveTeacher(teacher);
            this.closeModal('modal-teacher');
            await this.alertDialog({ title: 'บันทึกข้อมูลสำเร็จ', message: 'บันทึกข้อมูลครู/บุคลากรเรียบร้อยแล้ว', type: 'success' });
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
        document.getElementById('btn-import-csv')?.addEventListener('click', () => {
            this._resetCSVImportModal();
            this.openModal('modal-csv-import');
        });
        document.getElementById('btn-download-csv-template')?.addEventListener('click', () => csvImporter.downloadSampleTemplate());
        document.getElementById('btn-export-students-csv')?.addEventListener('click', () => {
            const students = firebaseService.getStudents();
            csvImporter.exportStudentsToCSV(students);
        });

        // CSV File Select - Multi-file Live Preview Handler (v6.0)
        document.getElementById('csv-file-input')?.addEventListener('change', async (e) => {
            await this._processCSVFiles(e.target.files);
        });

        // CSV Import Form Submit (v6.0)
        document.getElementById('form-csv-import')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._submitCSVImport();
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
        document.getElementById('student-room-filter')?.addEventListener('change', () => this.renderStudentList());
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

    // --- CSV Import v6.0 Helpers ---

    _resetCSVImportModal() {
        this._stagedCSVStudents = [];
        const ids = ['csv-file-list','csv-validation-errors','csv-validation-warnings','csv-summary-cards','csv-preview-container'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const btnSubmit = document.getElementById('btn-submit-csv-import');
        if (btnSubmit) btnSubmit.disabled = true;
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) fileInput.value = '';
        const previewTbody = document.getElementById('csv-preview-tbody');
        if (previewTbody) previewTbody.innerHTML = '';
    }

    handleCSVDrop(event) {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const fileInput = document.getElementById('csv-file-input');
            if (fileInput) {
                // Can't directly assign FileList, so process directly
                this._processCSVFiles(files);
            }
        }
    }

    async _processCSVFiles(fileList) {
        if (!fileList || fileList.length === 0) return;

        // Show loading state
        const btnSubmit = document.getElementById('btn-submit-csv-import');
        const btnLabel  = document.getElementById('btn-submit-csv-label');
        if (btnSubmit) btnSubmit.disabled = true;
        if (btnLabel)  btnLabel.textContent = 'กำลังอ่านไฟล์...';

        // Reset UI
        ['csv-validation-errors','csv-validation-warnings','csv-summary-cards','csv-preview-container','csv-file-list'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        try {
            // Show file list cards
            const fileListEl   = document.getElementById('csv-file-list');
            const fileItemsEl  = document.getElementById('csv-file-list-items');
            if (fileListEl && fileItemsEl) {
                fileItemsEl.innerHTML = Array.from(fileList).map(f =>
                    `<div style="display:inline-flex;align-items:center;gap:8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;margin:4px;font-size:0.83rem;">
                        <i class="ri-file-text-line" style="color:#6366f1;"></i>
                        <span>${f.name}</span>
                        <span style="color:#9ca3af;">(${(f.size/1024).toFixed(1)} KB)</span>
                    </div>`
                ).join('');
                fileListEl.style.display = 'block';
            }

            // Parse all files
            const result = await csvImporter.parseMultipleCSV(fileList);
            this._stagedCSVStudents = result.allStudents;

            // Show errors
            const errContainer = document.getElementById('csv-validation-errors');
            const errList      = document.getElementById('csv-error-list');
            if (result.allErrors.length > 0 && errContainer && errList) {
                errList.innerHTML = result.allErrors.slice(0, 10).map(e => `<li>${e}</li>`).join('');
                if (result.allErrors.length > 10) {
                    errList.innerHTML += `<li>...และข้อผิดพลาดอื่นอีก ${result.allErrors.length - 10} รายการ</li>`;
                }
                errContainer.style.display = 'block';
            }

            // Show warnings
            const warnContainer = document.getElementById('csv-validation-warnings');
            const warnList      = document.getElementById('csv-warning-list');
            if (result.allWarnings.length > 0 && warnContainer && warnList) {
                warnList.innerHTML = result.allWarnings.slice(0, 10).map(w => `<li>${w}</li>`).join('');
                if (result.allWarnings.length > 10) {
                    warnList.innerHTML += `<li>...และคำเตือนอื่นอีก ${result.allWarnings.length - 10} รายการ</li>`;
                }
                warnContainer.style.display = 'block';
            }

            if (!this._stagedCSVStudents || this._stagedCSVStudents.length === 0) {
                if (btnLabel) btnLabel.textContent = 'ยืนยันการนำเข้า';
                await this.alertDialog({ title: 'ไม่พบข้อมูล', message: 'ไม่พบข้อมูลนักเรียนในไฟล์ที่เลือก กรุณาตรวจสอบรูปแบบไฟล์', type: 'warning' });
                return;
            }

            // Build room/grade summary cards
            const summaryCardsEl   = document.getElementById('csv-summary-cards');
            const summaryInnerEl   = document.getElementById('csv-summary-cards-inner');
            const totalLabelEl     = document.getElementById('csv-total-label');
            if (summaryCardsEl && summaryInnerEl) {
                // Aggregate by grade/room
                const roomMap = {};
                this._stagedCSVStudents.forEach(s => {
                    const key = `${s.grade}/${s.room}`;
                    if (!roomMap[key]) roomMap[key] = { grade: s.grade, room: s.room, count: 0 };
                    roomMap[key].count++;
                });

                const sortedRooms = Object.values(roomMap).sort((a, b) =>
                    a.grade.localeCompare(b.grade) || parseInt(a.room) - parseInt(b.room)
                );

                const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
                summaryInnerEl.innerHTML = sortedRooms.map((r, i) => {
                    const c = colors[i % colors.length];
                    return `<div style="
                        background: ${c}15; border: 1.5px solid ${c}40;
                        border-radius: 10px; padding: 8px 14px; min-width: 90px; text-align: center;
                    ">
                        <div style="font-weight: 700; color: ${c}; font-size: 0.9rem;">${r.grade}/${r.room}</div>
                        <div style="font-size: 0.82rem; color: #374151; margin-top: 2px;">${r.count} คน</div>
                    </div>`;
                }).join('');

                if (totalLabelEl) {
                    const totalRooms = sortedRooms.length;
                    const uniqueGrades = [...new Set(sortedRooms.map(r => r.grade))].length;
                    totalLabelEl.textContent = `รวมทั้งหมด ${this._stagedCSVStudents.length} คน จาก ${totalRooms} ห้องเรียน ${uniqueGrades} ระดับชั้น`;
                }
                summaryCardsEl.style.display = 'block';
            }

            // Render preview table (first 5 rows)
            const previewContainer = document.getElementById('csv-preview-container');
            const previewTbody     = document.getElementById('csv-preview-tbody');
            const summaryBadge     = document.getElementById('csv-summary-badge');

            if (previewTbody) {
                previewTbody.innerHTML = this._stagedCSVStudents.slice(0, 5).map(s => `
                    <tr>
                        <td>${s.number || '-'}</td>
                        <td><strong>${s.studentId && !s.studentId.startsWith('AUTO_') ? s.studentId : '-'}</strong></td>
                        <td>${s.fullName || '-'}</td>
                        <td><span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:6px;font-size:0.78rem;">${s.grade}/${s.room}</span></td>
                        <td>${s.advisors || '-'}</td>
                    </tr>
                `).join('');
            }

            if (summaryBadge) {
                summaryBadge.textContent = `แสดง 5 จาก ${this._stagedCSVStudents.length} รายการ`;
            }
            if (previewContainer) previewContainer.style.display = 'block';

            // Enable submit
            if (btnSubmit) btnSubmit.disabled = result.allErrors.length > 0;
            if (btnLabel) {
                if (result.allErrors.length > 0) {
                    btnLabel.textContent = 'มีข้อผิดพลาด - ไม่สามารถนำเข้าได้';
                } else {
                    btnLabel.textContent = `ยืนยันนำเข้า ${this._stagedCSVStudents.length} คน`;
                }
            }

        } catch (err) {
            console.error('[App] CSV Process error:', err);
            if (btnLabel) btnLabel.textContent = 'ยืนยันการนำเข้า';
            await this.alertDialog({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message, type: 'danger' });
        }
    }

    async _submitCSVImport() {
        const parsed = this._stagedCSVStudents;
        if (!parsed || parsed.length === 0) {
            await this.alertDialog({ title: 'คำเตือน', message: 'กรุณาเลือกไฟล์ CSV ก่อนนำเข้า', type: 'warning' });
            return;
        }

        const btnSubmit = document.getElementById('btn-submit-csv-import');
        const btnLabel  = document.getElementById('btn-submit-csv-label');
        if (btnSubmit) btnSubmit.disabled = true;
        if (btnLabel)  btnLabel.textContent = 'กำลังบันทึก...';

        try {
            // Assign guaranteed unique IDs before saving
            const now = Date.now();
            const readyStudents = parsed.map((s, idx) => ({
                ...s,
                id: s.id || ('STD_' + now + '_' + idx + '_' + Math.random().toString(36).substr(2, 5))
            }));

            this._skipStudentListRefresh = true;
            const merged = await firebaseService.saveStudentsBatch(readyStudents);
            this._skipStudentListRefresh = false;

            // Build room list for success message
            const roomSet = new Set(readyStudents.map(s => `${s.grade}/${s.room}`));
            const roomList = [...roomSet].sort().join(', ');

            this.closeModal('modal-csv-import');

            // Set grade filter to imported grade (e.g., ม.1) and reset room filter to show all rooms
            const targetGrade = readyStudents[0]?.grade || '';
            const gradeSelect = document.getElementById('student-grade-filter');
            if (gradeSelect && targetGrade) {
                let matched = false;
                for (let opt of gradeSelect.options) {
                    if (this.normalizeGrade(opt.value) === this.normalizeGrade(targetGrade)) {
                        gradeSelect.value = opt.value;
                        matched = true;
                        break;
                    }
                }
                if (!matched) gradeSelect.value = '';
            } else if (gradeSelect) {
                gradeSelect.value = '';
            }

            const roomSelect = document.getElementById('student-room-filter');
            if (roomSelect) roomSelect.value = '';

            this.updateRoomFilterDropdown();
            this.renderStudentList();
            this.renderDashboard();
            this.updateStudentDropdowns();

            await this.alertDialog({
                title: '✅ นำเข้าข้อมูลสำเร็จ',
                message: `นำเข้านักเรียน ${parsed.length} คน จากห้อง ${roomList} เรียบร้อยแล้ว (รวมทั้งระบบ ${merged.length} คน)`,
                type: 'success'
            });

            // Re-render after modal dialog closes to ensure UI is fresh
            this.updateRoomFilterDropdown();
            this.renderStudentList();

        } catch (err) {
            this._skipStudentListRefresh = false;
            if (btnSubmit) btnSubmit.disabled = false;
            if (btnLabel)  btnLabel.textContent = `ยืนยันนำเข้า ${parsed.length} คน`;
            console.error('[App] CSV submit error:', err);
            await this.alertDialog({ title: 'เกิดข้อผิดพลาด', message: 'บันทึกข้อมูลไม่สำเร็จ: ' + err.message, type: 'danger' });
        }
    }

    // --- Render Data Views ---

    normalizeGrade(g) {
        if (!g) return '';
        const str = String(g).trim().replace(/["']/g, '');
        if (str.includes('ม.1') || str.includes('มัธยมศึกษาปีที่ 1')) return 'ม.1';
        if (str.includes('ม.2') || str.includes('มัธยมศึกษาปีที่ 2')) return 'ม.2';
        if (str.includes('ม.3') || str.includes('มัธยมศึกษาปีที่ 3')) return 'ม.3';
        if (str.includes('ม.4') || str.includes('มัธยมศึกษาปีที่ 4')) return 'ม.4';
        if (str.includes('ม.5') || str.includes('มัธยมศึกษาปีที่ 5')) return 'ม.5';
        if (str.includes('ม.6') || str.includes('มัธยมศึกษาปีที่ 6')) return 'ม.6';
        if (str.includes('ปวช.1')) return 'ปวช.1';
        if (str.includes('ปวช.2')) return 'ปวช.2';
        if (str.includes('ปวช.3')) return 'ปวช.3';
        return str;
    }

    normalizeRoom(r) {
        if (!r) return '';
        const str = String(r).trim().replace(/["']/g, '');
        const nums = str.match(/\d+/g) || [];
        if (nums.length >= 2) {
            return nums[nums.length - 1];
        }
        if (nums.length === 1) {
            const num = parseInt(nums[0], 10);
            if (num >= 101 && num <= 699) {
                return String(num % 100);
            }
            return nums[0];
        }
        return str;
    }

    updateRoomFilterDropdown() {
        const roomSelect = document.getElementById('student-room-filter');
        if (!roomSelect) return;

        const selectedGradeRaw = document.getElementById('student-grade-filter')?.value || '';
        const selectedGrade = this.normalizeGrade(selectedGradeRaw);
        const currentSelectedRoom = this.normalizeRoom(roomSelect.value);
        const students = firebaseService.getStudents() || [];

        const roomsSet = new Set();

        students.forEach(s => {
            const sGradeNorm = this.normalizeGrade(s.grade);
            const isGradeMatch = !selectedGrade || sGradeNorm === selectedGrade || 
                                 String(s.grade || '').includes(selectedGrade) || 
                                 `${sGradeNorm}/${s.room}`.includes(selectedGrade);
            if (isGradeMatch) {
                const rNorm = this.normalizeRoom(s.room);
                if (rNorm) {
                    roomsSet.add(rNorm);
                }
            }
        });

        // Fallback: if no rooms match strict grade, include all available rooms from student data
        if (roomsSet.size === 0) {
            students.forEach(s => {
                const rNorm = this.normalizeRoom(s.room);
                if (rNorm) roomsSet.add(rNorm);
            });
        }

        const sortedRooms = Array.from(roomsSet).sort((a, b) => {
            return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
        });

        roomSelect.innerHTML = '<option value="">-- เลือกห้องทั้งหมด --</option>';
        sortedRooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = `ห้อง ${room}`;
            if (room === currentSelectedRoom) {
                option.selected = true;
            }
            roomSelect.appendChild(option);
        });
    }

    renderRoomPills() {
        const container = document.getElementById('student-room-pills-container');
        if (!container) return;

        const allStudents = firebaseService.getStudents() || [];
        if (allStudents.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const roomMap = {};
        allStudents.forEach(s => {
            const g = this.normalizeGrade(s.grade) || 'ม.1';
            const r = this.normalizeRoom(s.room) || '1';
            const key = `${g}/${r}`;
            if (!roomMap[key]) roomMap[key] = { grade: g, room: r, count: 0 };
            roomMap[key].count++;
        });

        const sortedRooms = Object.values(roomMap).sort((a, b) => {
            const gOrder = (g) => {
                if (g.includes('ม.1')) return 1; if (g.includes('ม.2')) return 2;
                if (g.includes('ม.3')) return 3; if (g.includes('ม.4')) return 4;
                if (g.includes('ม.5')) return 5; if (g.includes('ม.6')) return 6;
                return 7;
            };
            const diffG = gOrder(a.grade) - gOrder(b.grade);
            if (diffG !== 0) return diffG;
            return (parseInt(a.room, 10) || 0) - (parseInt(b.room, 10) || 0);
        });

        const activeGrade = this.normalizeGrade(document.getElementById('student-grade-filter')?.value || '');
        const activeRoom = this.normalizeRoom(document.getElementById('student-room-filter')?.value || '');

        let html = `
            <button type="button" class="btn btn-sm ${!activeGrade && !activeRoom ? 'btn-primary' : 'btn-secondary'}"
                    style="border-radius: 20px; padding: 4px 14px; font-weight: 600; font-size: 0.82rem;"
                    onclick="app.selectRoomPill('','')">
                <i class="ri-apps-2-line"></i> ทั้งหมด (${allStudents.length})
            </button>
        `;

        sortedRooms.forEach(r => {
            const isActive = activeGrade === r.grade && activeRoom === r.room;
            html += `
                <button type="button" class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}"
                        style="border-radius: 20px; padding: 4px 14px; font-weight: 600; font-size: 0.82rem; ${isActive ? 'background:#4f46e5;border-color:#4f46e5;color:#fff;' : ''}"
                        onclick="app.selectRoomPill('${r.grade}','${r.room}')">
                    ${r.grade}/${r.room} <span style="opacity: 0.85; font-size: 0.76rem;">(${r.count})</span>
                </button>
            `;
        });

        container.innerHTML = html;
        container.style.display = 'flex';
    }

    selectRoomPill(grade, room) {
        const gradeSelect = document.getElementById('student-grade-filter');
        const roomSelect  = document.getElementById('student-room-filter');

        if (gradeSelect) gradeSelect.value = grade;
        this.updateRoomFilterDropdown();
        if (roomSelect)  roomSelect.value = room;

        this.renderStudentList();
    }

    renderStudentList() {
        const tbody = document.getElementById('table-students-body');
        if (!tbody) return;

        // Populate Room Pills and room filter dropdown
        this.renderRoomPills();
        this.updateRoomFilterDropdown();

        let students = firebaseService.getStudents();
        const search = document.getElementById('student-search-input')?.value.toLowerCase() || '';
        const gradeFilter = document.getElementById('student-grade-filter')?.value || '';
        const roomFilter = document.getElementById('student-room-filter')?.value || '';

        if (search) {
            students = students.filter(s => 
                (s.fullName && s.fullName.toLowerCase().includes(search)) || 
                (s.studentId && String(s.studentId).includes(search))
            );
        }
        if (gradeFilter) {
            const normGrade = this.normalizeGrade(gradeFilter);
            students = students.filter(s => {
                const sGradeNorm = this.normalizeGrade(s.grade);
                return !normGrade || sGradeNorm === normGrade || 
                       String(s.grade || '').includes(normGrade);
            });
        }
        if (roomFilter) {
            const normRoomFilter = this.normalizeRoom(roomFilter);
            students = students.filter(s => {
                const sRoomNorm = this.normalizeRoom(s.room);
                return sRoomNorm === normRoomFilter || 
                       String(s.room).trim() === String(roomFilter).trim();
            });
        }

        // Sort students NUMERICALLY: Grade level -> Room number -> Student Number (1, 2, 3...)
        const getGradeOrder = (g) => {
            if (!g) return 99;
            const str = String(g).trim();
            if (str.includes('ม.1')) return 1;
            if (str.includes('ม.2')) return 2;
            if (str.includes('ม.3')) return 3;
            if (str.includes('ม.4')) return 4;
            if (str.includes('ม.5')) return 5;
            if (str.includes('ม.6')) return 6;
            if (str.includes('ปวช.1')) return 7;
            if (str.includes('ปวช.2')) return 8;
            if (str.includes('ปวช.3')) return 9;
            return 10;
        };

        students.sort((a, b) => {
            const gA = getGradeOrder(a.grade);
            const gB = getGradeOrder(b.grade);
            if (gA !== gB) return gA - gB;

            const rA = parseInt(String(a.room || '').replace(/\D/g, ''), 10) || 0;
            const rB = parseInt(String(b.room || '').replace(/\D/g, ''), 10) || 0;
            if (rA !== rB) return rA - rB;

            const numA = parseInt(String(a.number || '0').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(b.number || '0').replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

        tbody.innerHTML = '';
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">ไม่พบข้อมูลนักเรียน</td></tr>';
            return;
        }

        students.forEach(s => {
            const tr = document.createElement('tr');
            const displayName = s.fullName ? (s.prefix && !s.fullName.startsWith(s.prefix) ? `${s.prefix}${s.fullName}` : s.fullName) : '-';
            tr.innerHTML = `
                <td><span style="font-weight: 600; color: #475569;">${s.number || '-'}</span></td>
                <td><strong style="color:#0284c7;">${s.studentId && !s.studentId.startsWith('AUTO_') ? s.studentId : '-'}</strong></td>
                <td><strong style="color:#1e293b;">${displayName}</strong></td>
                <td><span class="badge badge-normal" style="background:#e0e7ff;color:#3730a3;font-weight:600;">${s.grade}/${s.room}</span></td>
                <td>${s.advisors || s.advisorTeachers || s.guardian || '-'}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm teacher-only" onclick="app.editStudent('${s.id}')" title="แก้ไข"><i class="ri-edit-line"></i></button>
                    <button class="btn btn-danger btn-sm teacher-only" onclick="app.deleteStudent('${s.id}')" title="ลบ"><i class="ri-delete-bin-line"></i></button>
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
            await this.alertDialog({
                title: 'ลบข้อมูลสำเร็จ',
                message: 'ระบบได้ทำการลบข้อมูลนักเรียนออกจากระบบเรียบร้อยแล้ว',
                type: 'success'
            });
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

        // Sort Teachers: Position Priority (ผอ. -> รอง ผอ. -> ครูที่ปรึกษา -> ครู) & Grade/Room (ม.1/1, ม.1/2, ...)
        const getPositionRank = (pos) => {
            if (!pos) return 99;
            const p = String(pos).trim();
            if (p.includes('ผู้อำนวยการ') && !p.includes('รอง')) return 1;
            if (p.includes('รองผู้อำนวยการ')) return 2;
            if (p.includes('ครูที่ปรึกษา') || p.includes('ครูประจำชั้น')) return 3;
            if (p.includes('ครู')) return 4;
            return 5;
        };

        const parseGradeRoomSortKey = (roomStr) => {
            if (!roomStr) return { levelOrder: 999, roomNum: 999 };
            const cleanStr = String(roomStr).trim();
            const levelMap = [
                { key: 'ม.1', order: 1 },
                { key: 'ม.2', order: 2 },
                { key: 'ม.3', order: 3 },
                { key: 'ม.4', order: 4 },
                { key: 'ม.5', order: 5 },
                { key: 'ม.6', order: 6 },
                { key: 'ปวช.1', order: 7 },
                { key: 'ปวช.2', order: 8 },
                { key: 'ปวช.3', order: 9 }
            ];

            let levelOrder = 99;
            let roomNum = 99;

            for (const item of levelMap) {
                if (cleanStr.includes(item.key)) {
                    levelOrder = item.order;
                    break;
                }
            }

            const parts = cleanStr.split('/');
            if (parts.length > 1) {
                const num = parseInt(parts[1].replace(/\D/g, ''), 10);
                if (!isNaN(num)) roomNum = num;
            }

            return { levelOrder, roomNum };
        };

        teachers.sort((a, b) => {
            const rankA = getPositionRank(a.position);
            const rankB = getPositionRank(b.position);
            if (rankA !== rankB) return rankA - rankB;

            const roomA = parseGradeRoomSortKey(a.responsibleRoom || a.responsibleGrade);
            const roomB = parseGradeRoomSortKey(b.responsibleRoom || b.responsibleGrade);

            if (roomA.levelOrder !== roomB.levelOrder) {
                return roomA.levelOrder - roomB.levelOrder;
            }
            if (roomA.roomNum !== roomB.roomNum) {
                return roomA.roomNum - roomB.roomNum;
            }

            return (a.fullName || '').localeCompare(b.fullName || '', 'th');
        });

        tbody.innerHTML = '';
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">ไม่พบข้อมูลครู/บุคลากร</td></tr>';
            return;
        }

        teachers.forEach(t => {
            const tr = document.createElement('tr');
            const displayName = t.fullName ? (t.prefix && !t.fullName.startsWith(t.prefix) ? `${t.prefix}${t.fullName}` : t.fullName) : '-';
            tr.innerHTML = `
                <td><strong style="color:#0f172a;">${displayName}</strong></td>
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
            await this.alertDialog({
                title: 'ลบข้อมูลสำเร็จ',
                message: 'ระบบได้ทำการลบข้อมูลครู/บุคลากรออกจากระบบเรียบร้อยแล้ว',
                type: 'success'
            });
        }
    }

    editTeacher(id) {
        const teachers = firebaseService.getTeachers();
        const t = teachers.find(item => item.id === id);
        if (t) {
            document.getElementById('teacher-id-input').value = t.id;
            const fullNameWithPrefix = t.fullName ? (t.prefix && !t.fullName.startsWith(t.prefix) ? `${t.prefix}${t.fullName}` : t.fullName) : '';
            document.getElementById('tch-fullname').value = fullNameWithPrefix;
            document.getElementById('tch-position').value = t.position || 'ครู';
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
            document.getElementById('std-code').value = s.studentId || '';
            document.getElementById('std-prefix').value = s.prefix || 'นาย';
            document.getElementById('std-fullname').value = s.fullName || '';
            document.getElementById('std-grade').value = s.grade || 'ม.1';
            document.getElementById('std-room').value = s.room || '1';
            document.getElementById('std-number').value = s.number || '1';
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
            await this.alertDialog({
                title: 'ลบข้อมูลสำเร็จ',
                message: 'ระบบได้ทำการลบรายการพฤติกรรมออกจากระบบเรียบร้อยแล้ว',
                type: 'success'
            });
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
            await this.alertDialog({
                title: 'ลบข้อมูลสำเร็จ',
                message: 'ระบบได้ทำการลบบัญชีผู้ใช้งานออกจากระบบเรียบร้อยแล้ว',
                type: 'success'
            });
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

    // --- Custom Alert / Notification Dialog Helper (White Card Pop-up) ---
    alertDialog({ title = 'ดำเนินการสำเร็จ', message = 'ระบบบันทึกข้อมูลเรียบร้อยแล้ว', type = 'success', confirmText = 'ตกลง' }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-alert-dialog');
            const iconWrapper = document.getElementById('alert-dialog-icon');
            const iconI = document.getElementById('alert-dialog-icon-i');
            const titleEl = document.getElementById('alert-dialog-title');
            const msgEl = document.getElementById('alert-dialog-message');
            const btnOk = document.getElementById('alert-dialog-btn-ok');
            const card = document.getElementById('alert-dialog-card');

            if (!modal) {
                alert(message);
                resolve(true);
                return;
            }

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;

            let borderTopColor = '#10b981';
            let iconClass = 'ri-checkbox-circle-fill';
            let iconWrapperClass = 'confirm-icon-wrapper success';
            let btnClass = 'btn-success';

            if (type === 'danger' || type === 'error') {
                borderTopColor = '#e11d48';
                iconClass = 'ri-close-circle-fill';
                iconWrapperClass = 'confirm-icon-wrapper danger';
                btnClass = 'btn-danger';
            } else if (type === 'warning') {
                borderTopColor = '#f59e0b';
                iconClass = 'ri-error-warning-fill';
                iconWrapperClass = 'confirm-icon-wrapper warning';
                btnClass = 'btn-warning';
            } else if (type === 'info') {
                borderTopColor = '#0284c7';
                iconClass = 'ri-information-fill';
                iconWrapperClass = 'confirm-icon-wrapper info';
                btnClass = 'btn-primary';
            }

            if (card) card.style.borderTop = `5px solid ${borderTopColor}`;
            if (iconWrapper) iconWrapper.className = iconWrapperClass;
            if (iconI) iconI.className = iconClass;
            if (btnOk) {
                btnOk.className = `btn ${btnClass}`;
                btnOk.innerHTML = `<i class="ri-check-line"></i> ${confirmText}`;
            }

            this.openModal('modal-alert-dialog');

            const handleOk = (e) => {
                if (e) e.preventDefault();
                cleanup();
                this.closeModal('modal-alert-dialog');
                resolve(true);
            };

            const cleanup = () => {
                btnOk?.removeEventListener('click', handleOk);
            };

            btnOk?.addEventListener('click', handleOk);
        });
    }

    updateBatchDeleteCountPreview() {
        const gradeEl = document.getElementById('batch-delete-grade-select');
        const roomEl = document.getElementById('batch-delete-room-select');
        const previewEl = document.getElementById('batch-delete-count-preview');
        if (!gradeEl || !roomEl || !previewEl) return;

        const grade = gradeEl.value;
        const room = roomEl.value;
        const students = firebaseService.getStudents();
        const matching = students.filter(s => {
            const matchGrade = (grade === 'ALL' || !grade) ? true : (s.grade === grade);
            const matchRoom = (room === 'ALL' || !room) ? true : (String(s.room) === String(room));
            return matchGrade && matchRoom;
        });

        previewEl.textContent = `พบ ${matching.length} ราย`;
    }
}

const app = new Application();
