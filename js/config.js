/**
 * ระบบดูแลช่วยเหลือนักเรียน - Configuration File
 * Firebase Realtime Database & Cloudinary CDN Configuration
 */

const CONFIG = {
    SYSTEM_VERSION: "1.0",

    // 1. Firebase Realtime Database Configuration
    FIREBASE: {
        DATABASE_URL: "https://prcare-2f41d-default-rtdb.asia-southeast1.firebasedatabase.app/",
        PROJECT_ID: "prcare-2f41d",
        ENDPOINTS: {
            STUDENTS: "students",
            TEACHERS: "teachers",
            SCREENINGS: "screenings",
            MERITS: "merits",
            OFFENSES: "offenses",
            REFERRALS: "referrals",
            ACTIVITIES: "activities",
            USERS: "users",
            SYSTEM_LOGS: "system_logs"
        }
    },

    // 2. Cloudinary CDN Configuration
    CLOUDINARY: {
        CLOUD_NAME: "eseojbyy",
        UPLOAD_PRESET: "ml_default", // Unsigned upload preset
        UPLOAD_URL: "https://api.cloudinary.com/v1_1/eseojbyy/image/upload",
        MAX_FILE_SIZE_MB: 5
    },

    // 3. LocalStorage Cache Keys (Fast Startup 0ms)
    STORAGE_KEYS: {
        STUDENTS: "prcare_students_cache",
        TEACHERS: "prcare_teachers_cache",
        SCREENINGS: "prcare_screenings_cache",
        MERITS: "prcare_merits_cache",
        OFFENSES: "prcare_offenses_cache",
        REFERRALS: "prcare_referrals_cache",
        ACTIVITIES: "prcare_activities_cache",
        AUTH_USER: "prcare_auth_user",
        LAST_SYNC: "prcare_last_sync_timestamp"
    },

    // 4. Academic Levels & System Constants
    GRADE_LEVELS: [
        "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6",
        "ปวช.1", "ปวช.2", "ปวช.3"
    ],

    ROLES: {
        STUDENT: "student",
        TEACHER: "teacher",
        ADMIN: "admin"
    },

    ROLE_NAMES_TH: {
        student: "🎓 นักเรียน",
        teacher: "👨‍🏫 ครู / ครูกิจการนักเรียน",
        admin: "🛡️ ผู้ดูแลระบบ (Administrator)"
    },

    SCREENING_LEVELS: {
        NORMAL: { code: "normal", label: "ปกติ", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
        RISK: { code: "risk", label: "เสี่ยง", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
        PROBLEM: { code: "problem", label: "มีปัญหา/กระทำผิด", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" }
    },

    OFFENSE_LEVELS: {
        MINOR: { code: "minor", label: "เบา", color: "#3b82f6" },
        MODERATE: { code: "moderate", label: "ปานกลาง", color: "#f59e0b" },
        SEVERE: { code: "severe", label: "ร้ายแรง", color: "#ef4444" }
    },

    REFERRAL_TYPES: {
        INTERNAL: { code: "internal", label: "ส่งต่อภายใน", icon: "arrow-down-left" },
        EXTERNAL: { code: "external", label: "ส่งต่อภายนอก", icon: "arrow-up-right" }
    },

    VERSION: "2026.1.0"
};

// Freeze Config
Object.freeze(CONFIG);
