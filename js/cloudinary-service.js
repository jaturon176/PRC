/**
 * ระบบดูแลช่วยเหลือนักเรียน - Cloudinary CDN & Data URL Service
 * Upload images to Cloudinary (Cloud Name: eseojbyy) + Automatic Base64 Fallback
 */

class CloudinaryService {
    constructor() {
        this.cloudName = CONFIG.CLOUDINARY.CLOUD_NAME;
        this.uploadUrl = CONFIG.CLOUDINARY.UPLOAD_URL;
        this.preset = CONFIG.CLOUDINARY.UPLOAD_PRESET;
    }

    /**
     * Upload Image file to Cloudinary with Base64 Data URL fallback
     * @param {File} file 
     * @returns {Promise<{url: string, isCloud: boolean}>}
     */
    async uploadImage(file) {
        if (!file) return { url: '', isCloud: false };

        // Check size limit (e.g. 5MB)
        if (file.size > CONFIG.CLOUDINARY.MAX_FILE_SIZE_MB * 1024 * 1024) {
            throw new Error(`ไฟล์ภาพมีขนาดใหญ่เกินไป (ไม่เกิน ${CONFIG.CLOUDINARY.MAX_FILE_SIZE_MB}MB)`);
        }

        // Try Cloudinary CDN Unsigned Upload first if Online
        if (navigator.onLine) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', this.preset);
                formData.append('folder', 'student_offenses_proof');

                const response = await fetch(this.uploadUrl, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.secure_url) {
                        console.log('[CloudinaryService] Image uploaded to Cloudinary:', result.secure_url);
                        return { url: result.secure_url, isCloud: true };
                    }
                }
            } catch (error) {
                console.warn('[CloudinaryService] Cloudinary upload failed, falling back to compressed Data URL:', error);
            }
        }

        // Fallback: Convert to Client Compressed Base64 Data URL
        const dataUrl = await this.compressAndConvertToDataURL(file);
        return { url: dataUrl, isCloud: false };
    }

    /**
     * Compress image on canvas and return Base64 Data URL
     * @param {File} file 
     * @returns {Promise<string>}
     */
    compressAndConvertToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round((width * MAX_HEIGHT) / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress JPEG quality 0.75
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(compressedDataUrl);
                };
                img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ภาพได้'));
                img.src = e.target.result;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }
}

const cloudinaryService = new CloudinaryService();
