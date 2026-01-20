require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
});

async function uploadTemplate() {
    const localFileName = 'HorasTemplate .docx'; // Note the space
    const targetFileName = 'HorasTemplate.docx'; // Sanitized name for Supabase
    const localPath = path.join(process.cwd(), 'public', 'templates', 'contracts', localFileName);
    const targetPath = `templates/${targetFileName}`;

    console.log(`Checking file: ${localPath}`);
    if (!fs.existsSync(localPath)) {
        console.error('Error: Local template file not found.');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(localPath);
    console.log(`Read ${fileContent.length} bytes.`);

    console.log(`Uploading to bucket 'contracts', path '${targetPath}'...`);

    const { data, error } = await supabase.storage
        .from('contracts')
        .upload(targetPath, fileContent, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true
        });

    if (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }

    console.log('Upload successful!');
    console.log('Path:', data.path);

    // Verify by getting public URL
    const { data: publicUrlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(targetPath);

    console.log('Public URL:', publicUrlData.publicUrl);
}

uploadTemplate();
