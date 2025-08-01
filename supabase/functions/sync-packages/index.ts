import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const esimAccessCode = Deno.env.get("ESIM_ACCESS_CODE");
    if (!esimAccessCode) {
      throw new Error("eSIM Access API key not configured");
    }

    console.log("Fetching packages from eSIM Access API...");

    // Fetch packages from eSIM Access API
    const response = await fetch("https://api.esimaccess.com/api/v1/open/package/list", {
      method: "POST",
      headers: {
        "RT-AccessCode": esimAccessCode,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationCode: "",
        type: "BASE"
      }),
    });

    if (!response.ok) {
      throw new Error(`eSIM Access API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`eSIM Access API error: ${data.errorMessage || data.errorCode}`);
    }

    // Connect to Supabase with service role to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`Processing ${data.obj.packageList.length} packages...`);

    // Get settings for exchange rate and markup tiers
    const { data: settings } = await supabaseService
      .from('app_settings')
      .select('key, value')
      .in('key', ['exchange_rate_usd_to_idr', 'markup_tiers']);

    const exchangeRate = settings?.find(s => s.key === 'exchange_rate_usd_to_idr')?.value?.value || 17000;
    const markupTiers = settings?.find(s => s.key === 'markup_tiers')?.value || {
      tier1: { min_price: 0, max_price: 50, markup_percentage: 20 },
      tier2: { min_price: 50, max_price: 100, markup_percentage: 15 },
      tier3: { min_price: 100, max_price: 999999, markup_percentage: 10 }
    };

    // Process packages and insert/update them in the database
    for (const pkg of data.obj.packageList) {
      // Calculate price with markup
      const basePrice = pkg.price / 10000; // Convert from cents to USD
      const priceInIDR = basePrice * exchangeRate;
      
      // Determine markup tier
      let markupPercentage = 10; // default
      if (priceInIDR <= markupTiers.tier1.max_price) {
        markupPercentage = markupTiers.tier1.markup_percentage;
      } else if (priceInIDR <= markupTiers.tier2.max_price) {
        markupPercentage = markupTiers.tier2.markup_percentage;
      } else {
        markupPercentage = markupTiers.tier3.markup_percentage;
      }
      
      const finalPrice = priceInIDR * (1 + markupPercentage / 100);

      const packageData = {
        package_id: pkg.packageCode,
        name: pkg.name,
        description: pkg.description,
        country_code: pkg.location.split(',')[0], // Take first country for simplicity
        region: pkg.location.includes(',') ? pkg.location : null,
        data_amount_mb: Math.round(pkg.volume / (1024 * 1024)), // Convert bytes to MB
        validity_days: pkg.duration,
        price_usd: finalPrice / exchangeRate, // Store in USD equivalent for consistency
        package_type: pkg.dataType === 1 ? 'data' : 'combo',
        is_active: true,
      };

      // Upsert package (insert or update if exists)
      const { error } = await supabaseService
        .from('esim_packages')
        .upsert(packageData, { 
          onConflict: 'package_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error syncing package ${pkg.packageCode}:`, error);
      }
    }

    console.log("Package sync completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${data.obj.packageList.length} packages`,
        packagesCount: data.obj.packageList.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in sync-packages function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});