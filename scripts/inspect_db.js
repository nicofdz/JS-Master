
const { Client } = require('pg');
const connectionString = 'postgresql://postgres.yypydgzcavbeubppzsvh:Niggaisaac25$@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Check columns of worker_payment_history
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'worker_payment_history';
    `);
        console.log('Columns:', res.rows.map(r => r.column_name));

        // Check distinct contract_types in worker_payment_history
        const resTypes = await client.query(`
      SELECT DISTINCT contract_type FROM worker_payment_history;
    `);
        console.log('Contract Types in worker_payment_history:', resTypes.rows);

        // Check count of records in payment_history vs worker_payment_history
        const resCount1 = await client.query('SELECT COUNT(*) FROM payment_history');
        console.log('Count payment_history:', resCount1.rows[0].count);

        const resCount2 = await client.query('SELECT COUNT(*) FROM worker_payment_history');
        console.log('Count worker_payment_history:', resCount2.rows[0].count);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
