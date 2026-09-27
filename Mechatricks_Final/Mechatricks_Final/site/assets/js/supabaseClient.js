import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración del proyecto de Supabase
const URL_SUPABASE = "https://wuspgeerjumonekrphau.supabase.co";
const CLAVE_ANONIMA_SUPABASE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1c3BnZWVyanVtb25la3JwaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzk4MTIsImV4cCI6MjA5Mzg1NTgxMn0.EP-Ind1LR2ZmCRjbYjsP3_fphjOvf2jVux0My1sO_AY";

export const supabase = createClient(URL_SUPABASE, CLAVE_ANONIMA_SUPABASE);

