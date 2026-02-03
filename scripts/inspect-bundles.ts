
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('land_plots')
        .select('id, title, price, bundle_id, is_bundle_primary, ownership_type, cadastral_number')
        .not('bundle_id', 'is', null)
        .limit(5);

    if (error) {
        console.error('Error fetching bundles:', error);
    } else {
        console.log('Bundled plots sample:', JSON.stringify(data, null, 2));
    }
}

main();
