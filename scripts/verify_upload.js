require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Listing files in contracts bucket, folder templates...');
    const { data, error } = await supabase.storage
        .from('contracts')
        .list('templates');

    if (error) {
        console.error('Error listing:', error);
    } else {
        // console.log('Files in templates folder:', data);

        const foundContract = data.find(f => f.name === 'ContratoTemplate.docx');
        if (foundContract) {
            console.log('✅ ContratoTemplate.docx found! Size:', foundContract.metadata.size);
        } else {
            console.log('❌ ContratoTemplate.docx NOT found.');
        }

        const foundHours = data.find(f => f.name === 'HorasTemplate.docx');
        if (foundHours) {
            console.log('✅ HorasTemplate.docx found! Size:', foundHours.metadata.size);
        } else {
            console.log('❌ HorasTemplate.docx NOT found.');
        }
    }
}

verify();
