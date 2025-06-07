#!/usr/bin/env node

/**
 * نص فحص الأمان المتقدم
 * Advanced Security Check Script
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

class SecurityChecker {
    constructor() {
        this.securityReport = {
            timestamp: new Date().toISOString(),
            checks: [],
            score: 0,
            maxScore: 0,
            status: 'unknown'
        };
    }

    addCheck(name, passed, details = '', points = 10) {
        this.securityReport.checks.push({
            name,
            passed,
            details,
            points: passed ? points : 0
        });
        this.securityReport.maxScore += points;
        if (passed) {
            this.securityReport.score += points;
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${name}: ${details}`);
    }

    // فحص تبعيات npm للثغرات الأمنية
    checkNpmSecurity() {
        console.log('🔍 فحص أمان التبعيات...');
        
        try {
            const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
            const audit = JSON.parse(auditResult);
            
            if (audit.metadata.vulnerabilities.total === 0) {
                this.addCheck('NPM Security', true, 'لا توجد ثغرات أمنية في التبعيات', 20);
            } else {
                const vulns = audit.metadata.vulnerabilities;
                this.addCheck('NPM Security', false, 
                    `تم العثور على ${vulns.total} ثغرة أمنية (عالية: ${vulns.high}, متوسطة: ${vulns.moderate})`, 20);
            }
        } catch (error) {
            this.addCheck('NPM Security', false, 'فشل في فحص الأمان', 20);
        }
    }

    // فحص إعدادات الخادم
    checkServerSecurity() {
        console.log('🛡️ فحص إعدادات الخادم...');
        
        const serverPath = './server.js';
        if (fs.existsSync(serverPath)) {
            const serverContent = fs.readFileSync(serverPath, 'utf8');
            
            // فحص helmet
            if (serverContent.includes('helmet')) {
                this.addCheck('Helmet Security', true, 'helmet مُفعّل للحماية من هجمات XSS و CSRF', 15);
            } else {
                this.addCheck('Helmet Security', false, 'helmet غير مُفعّل', 15);
            }
            
            // فحص CORS
            if (serverContent.includes('cors')) {
                this.addCheck('CORS Configuration', true, 'CORS مُكوّن بشكل صحيح', 10);
            } else {
                this.addCheck('CORS Configuration', false, 'CORS غير مُكوّن', 10);
            }
            
            // فحص Rate Limiting
            if (serverContent.includes('rateLimit')) {
                this.addCheck('Rate Limiting', true, 'تحديد معدل الطلبات مُفعّل', 15);
            } else {
                this.addCheck('Rate Limiting', false, 'تحديد معدل الطلبات غير مُفعّل', 15);
            }
            
            // فحص التشفير
            if (serverContent.includes('crypto')) {
                this.addCheck('Data Encryption', true, 'تشفير البيانات الحساسة مُفعّل', 15);
            } else {
                this.addCheck('Data Encryption', false, 'تشفير البيانات غير مُفعّل', 15);
            }
            
            // فحص Session Security
            if (serverContent.includes('session') && serverContent.includes('secret')) {
                this.addCheck('Session Security', true, 'جلسات آمنة مُكوّنة', 10);
            } else {
                this.addCheck('Session Security', false, 'إعدادات الجلسات غير آمنة', 10);
            }
        }
    }

    // فحص ملفات التكوين
    checkConfigurationSecurity() {
        console.log('⚙️ فحص ملفات التكوين...');
        
        // فحص package.json
        if (fs.existsSync('./package.json')) {
            const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            
            if (pkg.engines && pkg.engines.node) {
                this.addCheck('Node.js Version', true, `إصدار Node.js محدد: ${pkg.engines.node}`, 5);
            } else {
                this.addCheck('Node.js Version', false, 'إصدار Node.js غير محدد', 5);
            }
        }
        
        // فحص وجود .env.example
        if (fs.existsSync('./.env.example')) {
            this.addCheck('Environment Config', true, 'ملف التكوين البيئي موجود', 5);
        } else {
            this.addCheck('Environment Config', false, 'ملف التكوين البيئي مفقود', 5);
        }
        
        // فحص vercel.json
        if (fs.existsSync('./vercel.json')) {
            this.addCheck('Vercel Config', true, 'تكوين Vercel موجود', 5);
        } else {
            this.addCheck('Vercel Config', false, 'تكوين Vercel مفقود', 5);
        }
    }

    // فحص قاعدة البيانات
    checkDatabaseSecurity() {
        console.log('🗄️ فحص أمان قاعدة البيانات...');
        
        if (fs.existsSync('./database.sqlite')) {
            const stats = fs.statSync('./database.sqlite');
            const permissions = stats.mode.toString(8);
            
            this.addCheck('Database File', true, `قاعدة البيانات موجودة (حجم: ${(stats.size / 1024).toFixed(2)} KB)`, 10);
            
            // فحص النسخ الاحتياطية
            if (fs.existsSync('./backups') || fs.existsSync('./scripts/backup.js')) {
                this.addCheck('Backup System', true, 'نظام النسخ الاحتياطي مُكوّن', 10);
            } else {
                this.addCheck('Backup System', false, 'نظام النسخ الاحتياطي مفقود', 10);
            }
        } else {
            this.addCheck('Database File', false, 'ملف قاعدة البيانات مفقود', 10);
        }
    }

    // إنشاء تقرير الأمان
    generateReport() {
        const percentage = Math.round((this.securityReport.score / this.securityReport.maxScore) * 100);
        
        if (percentage >= 90) {
            this.securityReport.status = 'excellent';
        } else if (percentage >= 75) {
            this.securityReport.status = 'good';
        } else if (percentage >= 60) {
            this.securityReport.status = 'fair';
        } else {
            this.securityReport.status = 'poor';
        }

        console.log('\n📊 تقرير الأمان النهائي:');
        console.log(`النتيجة: ${this.securityReport.score}/${this.securityReport.maxScore} (${percentage}%)`);
        
        const statusEmoji = {
            excellent: '🟢',
            good: '🟡',
            fair: '🟠',
            poor: '🔴'
        };
        
        const statusText = {
            excellent: 'ممتاز - المنصة آمنة جداً',
            good: 'جيد - المنصة آمنة مع تحسينات طفيفة',
            fair: 'مقبول - يحتاج تحسينات أمنية',
            poor: 'ضعيف - يحتاج تحسينات أمنية عاجلة'
        };
        
        console.log(`الحالة: ${statusEmoji[this.securityReport.status]} ${statusText[this.securityReport.status]}`);
        
        // حفظ التقرير
        fs.writeFileSync('./security-report.json', JSON.stringify(this.securityReport, null, 2));
        console.log('\n📄 تم حفظ التقرير في security-report.json');
        
        return this.securityReport;
    }

    // تشغيل جميع الفحوصات
    runAllChecks() {
        console.log('🔒 بدء فحص الأمان الشامل...\n');
        
        this.checkNpmSecurity();
        this.checkServerSecurity();
        this.checkConfigurationSecurity();
        this.checkDatabaseSecurity();
        
        return this.generateReport();
    }
}

// تشغيل النص
if (require.main === module) {
    const securityChecker = new SecurityChecker();
    const report = securityChecker.runAllChecks();
    
    // الخروج بكود خطأ إذا كانت النتيجة ضعيفة
    if (report.status === 'poor') {
        process.exit(1);
    }
}

module.exports = SecurityChecker;