/**
 * ระบบดูแลช่วยเหลือนักเรียน - Authentication & Role Manager
 * Controls access for 3 User Roles: Student / Teacher / Administrator
 */

class AuthManager {
    constructor() {
        this.currentUser = this.loadSavedSession();
    }

    /**
     * Load current session from LocalStorage
     */
    loadSavedSession() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[AuthManager] Session load error:', e);
        }
        // Default to Demo Teacher account if not logged in
        return null;
    }

    /**
     * Authenticate User with Role
     * @param {string} role 'student' | 'teacher' | 'admin'
     * @param {string} username 
     * @param {string} password 
     */
    async login(role, username, password) {
        let userProfile = null;
        const users = firebaseService.getUsers();

        // 1. Search in Registered Users Manager Database
        const matchedUser = users.find(u => 
            u.username && u.username.toLowerCase() === (username || '').toLowerCase() && 
            (!password || u.password === password)
        );

        if (matchedUser) {
            userProfile = {
                id: matchedUser.id,
                username: matchedUser.username,
                name: matchedUser.fullName,
                role: matchedUser.role,
                roleTitle: CONFIG.ROLE_NAMES_TH[matchedUser.role] || matchedUser.role,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${matchedUser.role}_${matchedUser.username}`
            };
        } else if (role === CONFIG.ROLES.STUDENT) {
            const students = firebaseService.getStudents();
            const studentMatch = students.find(s => s.studentId === username || s.fullName.includes(username));
            
            userProfile = {
                id: studentMatch ? studentMatch.id : 'STD_DEMO',
                studentId: studentMatch ? studentMatch.studentId : (username || '66001'),
                name: studentMatch ? studentMatch.fullName : (username || 'นายสมชาย สายชล (นักเรียน)'),
                grade: studentMatch ? studentMatch.grade : 'ม.1',
                room: studentMatch ? studentMatch.room : '1',
                role: CONFIG.ROLES.STUDENT,
                roleTitle: CONFIG.ROLE_NAMES_TH.student,
                avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=student'
            };
        } else if (role === CONFIG.ROLES.TEACHER) {
            userProfile = {
                id: 'TCH_01',
                name: username || 'ครูสมศักดิ์ รักเรียน (ครูกิจการนักเรียน)',
                role: CONFIG.ROLES.TEACHER,
                roleTitle: CONFIG.ROLE_NAMES_TH.teacher,
                avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=teacher'
            };
        } else if (role === CONFIG.ROLES.ADMIN) {
            userProfile = {
                id: 'ADM_01',
                name: username || 'ผู้ดูแลระบบ (Admin)',
                role: CONFIG.ROLES.ADMIN,
                roleTitle: CONFIG.ROLE_NAMES_TH.admin,
                avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
            };
        }

        if (userProfile) {
            this.currentUser = userProfile;
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(userProfile));
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userProfile }));
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    hasRole(role) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === CONFIG.ROLES.ADMIN) return true; // Admin has all rights
        return this.currentUser.role === role;
    }

    canEditData() {
        if (!this.currentUser) return false;
        return this.currentUser.role === CONFIG.ROLES.TEACHER || this.currentUser.role === CONFIG.ROLES.ADMIN;
    }

    canManageAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.role === CONFIG.ROLES.ADMIN;
    }

    /**
     * Apply UI Visibility Rules based on active user role
     */
    applyUIPermissions() {
        const user = this.getCurrentUser();
        const role = user ? user.role : 'guest';

        document.body.setAttribute('data-user-role', role);

        // Update Top Navigation User Info
        const userProfileNameEl = document.getElementById('user-profile-name');
        const userRoleBadgeEl = document.getElementById('user-role-badge');
        const userAvatarEl = document.getElementById('user-avatar');

        // Toggle Standalone Login View visibility
        const loginScreenView = document.getElementById('login-screen-view');
        if (loginScreenView) {
            if (user) {
                loginScreenView.classList.add('hidden');
            } else {
                loginScreenView.classList.remove('hidden');
            }
        }

        if (user) {
            if (userProfileNameEl) userProfileNameEl.textContent = user.name;
            if (userRoleBadgeEl) userRoleBadgeEl.textContent = user.roleTitle;
            if (userAvatarEl && user.avatar) userAvatarEl.src = user.avatar;
        } else {
            if (userProfileNameEl) userProfileNameEl.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
            if (userRoleBadgeEl) userRoleBadgeEl.textContent = 'กรุณาล็อกอิน';
        }

        // Show/Hide Role-restricted Elements
        document.querySelectorAll('[data-require-role]').forEach(el => {
            const requiredRoles = el.getAttribute('data-require-role').split(',');
            if (user && requiredRoles.includes(user.role)) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });

        // Hide Edit Buttons for Students (keep student-allowed visible)
        document.querySelectorAll('.teacher-only, .admin-only').forEach(el => {
            if (role === 'student' && !el.classList.contains('student-allowed')) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
    }
}

const authManager = new AuthManager();
