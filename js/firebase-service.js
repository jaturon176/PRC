/**
 * ระบบดูแลช่วยเหลือนักเรียน - Firebase Realtime DB & LocalStorage Sync Service
 * Fast Startup Cache (0ms) + Real-time Cloud Synchronization (~0.1s)
 */

class FirebaseService {
    constructor() {
        this.baseUrl = CONFIG.FIREBASE.DATABASE_URL;
        this.listeners = new Map();
        this.isOnline = navigator.onLine;
        this.syncInterval = null;

        // Register Online/Offline Event Listeners
        window.addEventListener('online', () => this.handleOnlineState(true));
        window.addEventListener('offline', () => this.handleOnlineState(false));

        // Start Periodic Real-time Polling/Sync
        this.initSync();
    }

    handleOnlineState(online) {
        this.isOnline = online;
        console.log(`[FirebaseService] Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
        const statusEl = document.getElementById('network-status');
        if (statusEl) {
            statusEl.className = online ? 'status-indicator online' : 'status-indicator offline';
            statusEl.title = online ? 'ซิงค์ข้อมูลเรียลไทม์กับ Firebase เรียบร้อย' : 'ทำงานในโหมดแคช ออฟไลน์ (LocalStorage)';
            statusEl.querySelector('.status-text').textContent = online ? 'Online (Firebase Sync)' : 'Offline (Local Cache)';
        }
        if (online) {
            this.syncAllFromCloud();
        }
    }

    initSync() {
        // Initial Fetch from Cloud when online
        if (this.isOnline) {
            this.syncAllFromCloud();
        }
        // Poll Firebase REST endpoint every 3 seconds for zero-delay multi-device live sync
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.syncAllFromCloud();
            }
        }, 3000);
    }

    // --- Helper: LocalStorage Fast Cache (0ms) ---
    getCache(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`[FirebaseService] Error reading cache ${key}:`, e);
            return null;
        }
    }

    setCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`[FirebaseService] Error setting cache ${key}:`, e);
        }
    }

    // --- Core Generic REST API Callers ---
    async cloudGet(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}.json`, {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            const data = await response.json();
            return data || {};
        } catch (error) {
            console.warn(`[FirebaseService] Cloud GET ${endpoint} failed:`, error.message);
            return null;
        }
    }

    async cloudPut(endpoint, data) {
        if (!this.isOnline) return false;
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            console.error(`[FirebaseService] Cloud PUT ${endpoint} failed:`, error);
            return false;
        }
    }

    async cloudPost(endpoint, item) {
        if (!this.isOnline) return false;
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (response.ok) {
                const result = await response.json();
                return result.name; // Firebase Generated Push ID
            }
            return false;
        } catch (error) {
            console.error(`[FirebaseService] Cloud POST ${endpoint} failed:`, error);
            return false;
        }
    }

    async cloudDelete(endpoint) {
        if (!this.isOnline) return false;
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}.json`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error(`[FirebaseService] Cloud DELETE ${endpoint} failed:`, error);
            return false;
        }
    }

    // --- Comprehensive Cloud Sync & Realtime Dispatch ---
    async syncAllFromCloud() {
        const collections = [
            { key: CONFIG.STORAGE_KEYS.STUDENTS, endpoint: CONFIG.FIREBASE.ENDPOINTS.STUDENTS, event: 'studentsUpdated' },
            { key: CONFIG.STORAGE_KEYS.TEACHERS, endpoint: CONFIG.FIREBASE.ENDPOINTS.TEACHERS, event: 'teachersUpdated' },
            { key: CONFIG.STORAGE_KEYS.USERS, endpoint: CONFIG.FIREBASE.ENDPOINTS.USERS, event: 'usersUpdated' },
            { key: CONFIG.STORAGE_KEYS.SCREENINGS, endpoint: CONFIG.FIREBASE.ENDPOINTS.SCREENINGS, event: 'screeningsUpdated' },
            { key: CONFIG.STORAGE_KEYS.MERITS, endpoint: CONFIG.FIREBASE.ENDPOINTS.MERITS, event: 'meritsUpdated' },
            { key: CONFIG.STORAGE_KEYS.OFFENSES, endpoint: CONFIG.FIREBASE.ENDPOINTS.OFFENSES, event: 'offensesUpdated' },
            { key: CONFIG.STORAGE_KEYS.REFERRALS, endpoint: CONFIG.FIREBASE.ENDPOINTS.REFERRALS, event: 'referralsUpdated' },
            { key: CONFIG.STORAGE_KEYS.ACTIVITIES, endpoint: CONFIG.FIREBASE.ENDPOINTS.ACTIVITIES, event: 'activitiesUpdated' }
        ];

        for (const item of collections) {
            const cloudData = await this.cloudGet(item.endpoint);
            if (cloudData !== null) {
                let itemsList = [];
                if (typeof cloudData === 'object' && !Array.isArray(cloudData)) {
                    itemsList = Object.keys(cloudData).map(id => ({
                        id,
                        ...cloudData[id]
                    }));
                } else if (Array.isArray(cloudData)) {
                    itemsList = cloudData.filter(Boolean);
                }

                // Check if local cache differs
                const currentCache = this.getCache(item.key) || [];
                if (JSON.stringify(currentCache) !== JSON.stringify(itemsList)) {
                    this.setCache(item.key, itemsList);
                    window.dispatchEvent(new CustomEvent(item.event, { detail: itemsList }));
                }
            }
        }
    }

    // --- Entity CRUD Operations ---

    // 1. Students
    getStudents() {
        return this.getCache(CONFIG.STORAGE_KEYS.STUDENTS) || [];
    }

    async saveStudent(student) {
        const students = this.getStudents();
        let updatedStudents;
        if (!student.id) {
            student.id = 'STD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            student.createdAt = new Date().toISOString();
        }
        student.updatedAt = new Date().toISOString();

        const index = students.findIndex(s => s.id === student.id || s.studentId === student.studentId);
        if (index >= 0) {
            students[index] = { ...students[index], ...student };
        } else {
            students.unshift(student);
        }

        this.setCache(CONFIG.STORAGE_KEYS.STUDENTS, students);
        window.dispatchEvent(new CustomEvent('studentsUpdated', { detail: students }));

        // Cloud Sync
        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.STUDENTS}/${student.id}`, student);
        }
        return student;
    }

    async saveStudentsBatch(newStudentsList) {
        const students = this.getStudents();
        const map = new Map();
        students.forEach(s => map.set(s.studentId, s));

        newStudentsList.forEach(s => {
            if (!s.id) s.id = 'STD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            s.updatedAt = new Date().toISOString();
            map.set(s.studentId, s);
        });

        const merged = Array.from(map.values());
        this.setCache(CONFIG.STORAGE_KEYS.STUDENTS, merged);
        window.dispatchEvent(new CustomEvent('studentsUpdated', { detail: merged }));

        if (this.isOnline) {
            // Push full object map to Firebase
            const cloudObject = {};
            merged.forEach(s => { cloudObject[s.id] = s; });
            await this.cloudPut(CONFIG.FIREBASE.ENDPOINTS.STUDENTS, cloudObject);
        }
        return merged;
    }

    async deleteStudent(studentId) {
        let students = this.getStudents();
        const target = students.find(s => s.id === studentId || s.studentId === studentId);
        const realId = target ? target.id : studentId;
        students = students.filter(s => s.id !== realId && s.studentId !== realId);

        this.setCache(CONFIG.STORAGE_KEYS.STUDENTS, students);
        window.dispatchEvent(new CustomEvent('studentsUpdated', { detail: students }));

        if (this.isOnline) {
            await this.cloudDelete(`${CONFIG.FIREBASE.ENDPOINTS.STUDENTS}/${realId}`);
        }
        return true;
    }

    // 1.5 Teachers
    getTeachers() {
        return this.getCache(CONFIG.STORAGE_KEYS.TEACHERS) || [];
    }

    async saveTeacher(teacher) {
        const teachers = this.getTeachers();
        if (!teacher.id) {
            teacher.id = 'TCH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            teacher.createdAt = new Date().toISOString();
        }
        teacher.updatedAt = new Date().toISOString();

        const index = teachers.findIndex(t => t.id === teacher.id || (t.teacherId && t.teacherId === teacher.teacherId));
        if (index >= 0) {
            teachers[index] = { ...teachers[index], ...teacher };
        } else {
            teachers.unshift(teacher);
        }

        this.setCache(CONFIG.STORAGE_KEYS.TEACHERS, teachers);
        window.dispatchEvent(new CustomEvent('teachersUpdated', { detail: teachers }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.TEACHERS}/${teacher.id}`, teacher);
        }
        return teacher;
    }

    async saveTeachersBatch(newTeachersList) {
        const teachers = this.getTeachers();
        const map = new Map();
        teachers.forEach(t => map.set(t.teacherId || t.id, t));

        newTeachersList.forEach(t => {
            if (!t.id) t.id = 'TCH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            t.updatedAt = new Date().toISOString();
            map.set(t.teacherId || t.id, t);
        });

        const merged = Array.from(map.values());
        this.setCache(CONFIG.STORAGE_KEYS.TEACHERS, merged);
        window.dispatchEvent(new CustomEvent('teachersUpdated', { detail: merged }));

        if (this.isOnline) {
            const cloudObject = {};
            merged.forEach(t => { cloudObject[t.id] = t; });
            await this.cloudPut(CONFIG.FIREBASE.ENDPOINTS.TEACHERS, cloudObject);
        }
        return merged;
    }

    async deleteTeacher(teacherId) {
        let teachers = this.getTeachers();
        const target = teachers.find(t => t.id === teacherId || t.teacherId === teacherId);
        const realId = target ? target.id : teacherId;
        teachers = teachers.filter(t => t.id !== realId && t.teacherId !== realId);

        this.setCache(CONFIG.STORAGE_KEYS.TEACHERS, teachers);
        window.dispatchEvent(new CustomEvent('teachersUpdated', { detail: teachers }));

        if (this.isOnline) {
            await this.cloudDelete(`${CONFIG.FIREBASE.ENDPOINTS.TEACHERS}/${realId}`);
        }
        return true;
    }

    // 1.8 User Accounts & Passwords
    getUsers() {
        return this.getCache(CONFIG.STORAGE_KEYS.USERS) || [];
    }

    async saveUser(user) {
        const users = this.getUsers();
        if (!user.id) {
            user.id = 'USR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            user.createdAt = new Date().toISOString();
        }
        user.updatedAt = new Date().toISOString();

        const index = users.findIndex(u => u.id === user.id || (u.username && u.username === user.username));
        if (index >= 0) {
            users[index] = { ...users[index], ...user };
        } else {
            users.unshift(user);
        }

        this.setCache(CONFIG.STORAGE_KEYS.USERS, users);
        window.dispatchEvent(new CustomEvent('usersUpdated', { detail: users }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.USERS}/${user.id}`, user);
        }
        return user;
    }

    async saveUsersBatch(newUsersList) {
        const users = this.getUsers();
        const map = new Map();
        users.forEach(u => map.set(u.username || u.id, u));

        newUsersList.forEach(u => {
            if (!u.id) u.id = 'USR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            u.updatedAt = new Date().toISOString();
            map.set(u.username || u.id, u);
        });

        const merged = Array.from(map.values());
        this.setCache(CONFIG.STORAGE_KEYS.USERS, merged);
        window.dispatchEvent(new CustomEvent('usersUpdated', { detail: merged }));

        if (this.isOnline) {
            const cloudObject = {};
            merged.forEach(u => { cloudObject[u.id] = u; });
            await this.cloudPut(CONFIG.FIREBASE.ENDPOINTS.USERS, cloudObject);
        }
        return merged;
    }

    async deleteUser(userId) {
        let users = this.getUsers();
        const target = users.find(u => u.id === userId || u.username === userId);
        const realId = target ? target.id : userId;
        users = users.filter(u => u.id !== realId && u.username !== realId);

        this.setCache(CONFIG.STORAGE_KEYS.USERS, users);
        window.dispatchEvent(new CustomEvent('usersUpdated', { detail: users }));

        if (this.isOnline) {
            await this.cloudDelete(`${CONFIG.FIREBASE.ENDPOINTS.USERS}/${realId}`);
        }
        return true;
    }

    // 2. Screenings
    getScreenings() {
        return this.getCache(CONFIG.STORAGE_KEYS.SCREENINGS) || [];
    }

    async saveScreening(screening) {
        const screenings = this.getScreenings();
        if (!screening.id) {
            screening.id = 'SCR_' + Date.now();
            screening.createdAt = new Date().toISOString();
        }
        screening.updatedAt = new Date().toISOString();

        const index = screenings.findIndex(s => s.id === screening.id);
        if (index >= 0) screenings[index] = screening;
        else screenings.unshift(screening);

        this.setCache(CONFIG.STORAGE_KEYS.SCREENINGS, screenings);
        window.dispatchEvent(new CustomEvent('screeningsUpdated', { detail: screenings }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.SCREENINGS}/${screening.id}`, screening);
        }
        return screening;
    }

    // 3. Merits & Promotion
    getMerits() {
        return this.getCache(CONFIG.STORAGE_KEYS.MERITS) || [];
    }

    async saveMerit(merit) {
        const merits = this.getMerits();
        if (!merit.id) {
            merit.id = 'MRT_' + Date.now();
            merit.createdAt = new Date().toISOString();
        }
        merit.updatedAt = new Date().toISOString();

        const index = merits.findIndex(m => m.id === merit.id);
        if (index >= 0) merits[index] = merit;
        else merits.unshift(merit);

        this.setCache(CONFIG.STORAGE_KEYS.MERITS, merits);
        window.dispatchEvent(new CustomEvent('meritsUpdated', { detail: merits }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.MERITS}/${merit.id}`, merit);
        }
        return merit;
    }

    // 4. Offenses (Prevention & Problem Solving)
    getOffenses() {
        return this.getCache(CONFIG.STORAGE_KEYS.OFFENSES) || [];
    }

    async saveOffense(offense) {
        const offenses = this.getOffenses();
        if (!offense.id) {
            offense.id = 'OFF_' + Date.now();
            offense.createdAt = new Date().toISOString();
        }
        offense.updatedAt = new Date().toISOString();

        const index = offenses.findIndex(o => o.id === offense.id);
        if (index >= 0) offenses[index] = offense;
        else offenses.unshift(offense);

        this.setCache(CONFIG.STORAGE_KEYS.OFFENSES, offenses);
        window.dispatchEvent(new CustomEvent('offensesUpdated', { detail: offenses }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.OFFENSES}/${offense.id}`, offense);
        }
        return offense;
    }

    async deleteOffense(offenseId) {
        let offenses = this.getOffenses();
        offenses = offenses.filter(o => o.id !== offenseId);

        this.setCache(CONFIG.STORAGE_KEYS.OFFENSES, offenses);
        window.dispatchEvent(new CustomEvent('offensesUpdated', { detail: offenses }));

        if (this.isOnline) {
            await this.cloudDelete(`${CONFIG.FIREBASE.ENDPOINTS.OFFENSES}/${offenseId}`);
        }
        return true;
    }

    // 5. Referrals
    getReferrals() {
        return this.getCache(CONFIG.STORAGE_KEYS.REFERRALS) || [];
    }

    async saveReferral(referral) {
        const referrals = this.getReferrals();
        if (!referral.id) {
            referral.id = 'REF_' + Date.now();
            referral.createdAt = new Date().toISOString();
        }
        referral.updatedAt = new Date().toISOString();

        const index = referrals.findIndex(r => r.id === referral.id);
        if (index >= 0) referrals[index] = referral;
        else referrals.unshift(referral);

        this.setCache(CONFIG.STORAGE_KEYS.REFERRALS, referrals);
        window.dispatchEvent(new CustomEvent('referralsUpdated', { detail: referrals }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.REFERRALS}/${referral.id}`, referral);
        }
        return referral;
    }

    // 6. Activities Catalogue
    getActivities() {
        return this.getCache(CONFIG.STORAGE_KEYS.ACTIVITIES) || [
            { id: 'ACT_1', name: 'จิตอาสาพัฒนาโรงเรียน', points: 10, category: 'สาธารณประโยชน์' },
            { id: 'ACT_2', name: 'สวดมนต์ไหว้พระประจำสัปดาห์', points: 5, category: 'คุณธรรมจริยธรรม' },
            { id: 'ACT_3', name: 'ช่วยงานห้องพยาบาล/ห้องสภานักเรียน', points: 15, category: 'บำเพ็ญประโยชน์' },
            { id: 'ACT_4', name: 'ร่วมกิจกรรมต่อต้านยาเสพติด', points: 10, category: 'รณรงค์และส่งเสริม' }
        ];
    }

    async saveActivity(activity) {
        const activities = this.getActivities();
        if (!activity.id) {
            activity.id = 'ACT_' + Date.now();
        }
        const index = activities.findIndex(a => a.id === activity.id);
        if (index >= 0) activities[index] = activity;
        else activities.unshift(activity);

        this.setCache(CONFIG.STORAGE_KEYS.ACTIVITIES, activities);
        window.dispatchEvent(new CustomEvent('activitiesUpdated', { detail: activities }));

        if (this.isOnline) {
            await this.cloudPut(`${CONFIG.FIREBASE.ENDPOINTS.ACTIVITIES}/${activity.id}`, activity);
        }
        return activity;
    }
}

// Global Singleton Instance
const firebaseService = new FirebaseService();
