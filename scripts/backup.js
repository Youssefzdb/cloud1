#!/usr/bin/env node

/**
 * نص النسخ الاحتياطي المتقدم
 * Advanced Backup Script for Cloud Mining Platform
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '..', 'backups');
        this.dbPath = path.join(__dirname, '..', 'database.sqlite');
        this.maxBackups = 30; // Keep 30 days of backups
    }

    // إنشاء مجلد النسخ الاحتياطية
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('✅ تم إنشاء مجلد النسخ الاحتياطية');
        }
    }

    // إنشاء نسخة احتياطية
    createBackup() {
        this.ensureBackupDirectory();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup_${timestamp}.sqlite`;
        const backupPath = path.join(this.backupDir, backupFileName);

        try {
            // نسخ ملف قاعدة البيانات
            fs.copyFileSync(this.dbPath, backupPath);

            // إنشاء معلومات النسخة الاحتياطية
            const backupInfo = {
                filename: backupFileName,
                timestamp: new Date().toISOString(),
                size: fs.statSync(backupPath).size,
                checksum: this.calculateChecksum(backupPath),
                version: '1.0.0'
            };

            // حفظ معلومات النسخة الاحتياطية
            const infoPath = path.join(this.backupDir, `${backupFileName}.info.json`);
            fs.writeFileSync(infoPath, JSON.stringify(backupInfo, null, 2));

            console.log(`✅ تم إنشاء نسخة احتياطية بنجاح: ${backupFileName}`);
            console.log(`📊 حجم الملف: ${(backupInfo.size / 1024).toFixed(2)} KB`);
            console.log(`🔐 المجموع التحققي: ${backupInfo.checksum}`);

            return backupInfo;
        } catch (error) {
            console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error.message);
            throw error;
        }
    }

    // حساب المجموع التحققي للملف
    calculateChecksum(filePath) {
        const data = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // تنظيف النسخ الاحتياطية القديمة
    cleanupOldBackups() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.sqlite'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    mtime: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (backupFiles.length > this.maxBackups) {
                const filesToDelete = backupFiles.slice(this.maxBackups);
                
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                        
                        // حذف ملف المعلومات المقترن
                        const infoFile = `${file.path}.info.json`;
                        if (fs.existsSync(infoFile)) {
                            fs.unlinkSync(infoFile);
                        }
                        
                        console.log(`🗑️ تم حذف النسخة الاحتياطية القديمة: ${file.name}`);
                    } catch (deleteError) {
                        console.error(`❌ خطأ في حذف ${file.name}:`, deleteError.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ خطأ في تنظيف النسخ الاحتياطية:', error.message);
        }
    }
}

// تشغيل النص
if (require.main === module) {
    const backupManager = new BackupManager();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            console.log('🔄 بدء إنشاء نسخة احتياطية...');
            backupManager.createBackup();
            backupManager.cleanupOldBackups();
            break;
            
        default:
            console.log('📖 استخدام نص النسخ الاحتياطي:');
            console.log('  node scripts/backup.js create    - إنشاء نسخة احتياطية جديدة');
            break;
    }
}

module.exports = BackupManager;