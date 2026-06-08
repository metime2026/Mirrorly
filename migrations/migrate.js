const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function runMigration(filePath, client) {
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    for (let stmt of statements) {
        console.log(`执行: ${stmt.substring(0, 60)}...`);
        await client.query(stmt);
    }
    console.log(`✅ ${path.basename(filePath)} 完成`);
}

async function main() {
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        databaseUrl = await askQuestion('请输入 Neon 数据库连接字符串 (DATABASE_URL): ');
    }
    if (!databaseUrl) {
        console.error('❌ 未提供数据库连接字符串');
        process.exit(1);
    }

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    console.log('✅ 已连接到数据库');

    try {
        await runMigration(path.join(__dirname, 'migrations', '001_initial.sql'), client);
        await runMigration(path.join(__dirname, 'migrations', '002_owner_user.sql'), client);
        console.log('🎉 所有迁移执行成功！');
    } catch (err) {
        console.error('❌ 执行失败:', err.message);
    } finally {
        await client.end();
        rl.close();
    }
}

main();