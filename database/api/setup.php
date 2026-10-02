<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Database Setup Script
// Run once: http://localhost/agrivision/api/setup.php
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');

try {
    // Connect without database first
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    echo "✅ Connected to MySQL\n\n";

    // Create database
    $pdo->exec('CREATE DATABASE IF NOT EXISTS `agrivision` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `agrivision`');
    echo "✅ Database 'agrivision' ready\n\n";

    // Helper to execute SQL script safely
    $runSqlFile = function($filePath) use ($pdo) {
        if (!file_exists($filePath)) return;
        $sql = file_get_contents($filePath);
        // Remove CREATE DATABASE and USE statements
        $sql = preg_replace('/CREATE DATABASE.*?;\s*/i', '', $sql);
        $sql = preg_replace('/USE.*?;\s*/i', '', $sql);
        // Remove comments
        $sql = preg_replace('/--.*$/m', '', $sql);
        $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);

        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $stmt) {
            if (!empty($stmt)) {
                // For MySQL 8.0 compatibility: if ADD COLUMN IF NOT EXISTS fails, try without IF NOT EXISTS
                try {
                    $pdo->exec($stmt);
                } catch (Exception $e) {
                    if (stripos($stmt, 'ADD COLUMN IF NOT EXISTS') !== false) {
                        try {
                            $stmtClean = str_ireplace('ADD COLUMN IF NOT EXISTS', 'ADD COLUMN', $stmt);
                            $pdo->exec($stmtClean);
                        } catch (Exception $e2) {
                            // Column might already exist, ignore
                        }
                    } else if (stripos($stmt, 'ADD COLUMN') !== false) {
                        // Already exists, ignore
                    } else {
                        throw $e;
                    }
                }
            }
        }
    };

    // Execute schema
    $runSqlFile(__DIR__ . '/schema.sql');
    echo "✅ Schema tables created\n\n";

    // Execute extended schema (field-centric tables)
    $runSqlFile(__DIR__ . '/schema_extend.sql');
    echo "✅ Extended schema (field-centric) applied\n\n";

    // Execute schema v2 (activities, metrics, snapshots)
    $runSqlFile(__DIR__ . '/schema_v2.sql');
    echo "✅ Schema V2 applied\n\n";

    // Check if seed data exists
    $count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count == 0) {
        $runSqlFile(__DIR__ . '/seed.sql');
        echo "✅ Seed data inserted\n\n";
    } else {
        echo "ℹ️ Seed data already exists ($count users)\n\n";
    }

    // List tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Tables in 'agrivision':\n";
    foreach ($tables as $t) {
        $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        echo "   • $t ($count rows)\n";
    }

    echo "\n🎉 Setup complete! Your database is ready.\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nMake sure:\n";
    echo "1. XAMPP MySQL is running\n";
    echo "2. User 'root' with no password can connect\n";
    echo "3. Port 3306 is accessible\n";
}
