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

    // Get authenticated user (optional for anonymous purchases)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (!authError && authUser) {
        user = authUser;
      }
    }

    const { packageId, customerEmail, customerPhone } = await req.json();

    if (!packageId || !customerEmail) {
      throw new Error("Package ID and customer email are required");
    }

    // Connect to Supabase with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get package details
    const { data: packageData, error: packageError } = await supabaseService
      .from('esim_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError || !packageData) {
      throw new Error("Package not found");
    }

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orderReference = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Creating eSIM order for package ${packageData.package_id}...`);

    // Create order in eSIM Access API
    const esimResponse = await fetch("https://api.esimaccess.com/api/v1/open/esim/order", {
      method: "POST",
      headers: {
        "RT-AccessCode": esimAccessCode,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionId: transactionId,
        amount: packageData.price_usd * 10000, // Convert to cents
        packageInfoList: [{
          packageCode: packageData.package_id,
          count: 1,
          price: packageData.price_usd * 10000
        }]
      }),
    });

    if (!esimResponse.ok) {
      throw new Error(`eSIM Access API error: ${esimResponse.status}`);
    }

    const esimData = await esimResponse.json();
    
    if (!esimData.success) {
      throw new Error(`eSIM order failed: ${esimData.errorMessage || esimData.errorCode}`);
    }

    // Create order in our database
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user?.id || null,
        package_id: packageId,
        order_reference: orderReference,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: 'pending',
        total_amount: packageData.price_usd,
        payment_id: esimData.obj.orderNo
      })
      .select()
      .single();

    if (orderError) {
      console.error("Database order creation error:", orderError);
      throw new Error("Failed to create order in database");
    }

    console.log(`Order created successfully: ${orderReference}`);

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderReference: orderReference,
          esimOrderNo: esimData.obj.orderNo,
          transactionId: transactionId,
          status: 'pending'
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in create-esim-order function:", error);
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