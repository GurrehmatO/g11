import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('matches').select('id, name, status, cricbuzz_id').limit(15);
  console.log(data);
  const { data: cData } = await supabase.from('matches').select('id, name, status, cricbuzz_id').not('cricbuzz_id', 'is', null);
  console.log("Matches with cricbuzz_id:", cData?.length || 0);
  console.log("Completed matches:", data?.filter(m => m.status === 'completed').length || 0);
}

run();
