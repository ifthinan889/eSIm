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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, esimTranNo, iccid, packageCode } = await req.json();

    if (!action || (!esimTranNo && !iccid)) {
      throw new Error("Action and eSIM identifier (esimTranNo or iccid) are required");
    }

    const validActions = ['cancel', 'suspend', 'unsuspend', 'revoke', 'topup'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    console.log(`Performing ${action} action on eSIM...`);

    let endpoint = "";
    let requestBody: any = {};

    // Set up the appropriate endpoint and request body
    switch (action) {
      case 'cancel':
        endpoint = "https://api.esimaccess.com/api/v1/open/esim/cancel";
        requestBody = esimTranNo ? { esimTranNo } : { iccid };
        break;
      case 'suspend':
        endpoint = "https://api.esimaccess.com/api/v1/open/esim/suspend";
        requestBody = esimTranNo ? { esimTranNo } : { iccid };
        break;
      case 'unsuspend':
        endpoint = "https://api.esimaccess.com/api/v1/open/esim/unsuspend";
        requestBody = esimTranNo ? { esimTranNo } : { iccid };
        break;
      case 'revoke':
        endpoint = "https://api.esimaccess.com/api/v1/open/esim/revoke";
        requestBody = esimTranNo ? { esimTranNo } : { iccid };
        break;
      case 'topup':
        if (!packageCode) {
          throw new Error("Package code is required for top-up");
        }
        endpoint = "https://api.esimaccess.com/api/v1/open/esim/topup";
        requestBody = {
          iccid: iccid,
          packageCode: packageCode
        };
        break;
    }

    // Make API call to eSIM Access
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "RT-AccessCode": esimAccessCode,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`eSIM Access API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`eSIM ${action} failed: ${data.errorMessage || data.errorCode}`);
    }

    // Update eSIM status in our database if needed
    if (['cancel', 'suspend', 'revoke'].includes(action)) {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      let newStatus = 'active';
      switch (action) {
        case 'cancel':
          newStatus = 'cancelled';
          break;
        case 'suspend':
          newStatus = 'suspended';
          break;
        case 'revoke':
          newStatus = 'revoked';
          break;
      }

      const identifier = esimTranNo ? 'esim_token' : 'iccid';
      const value = esimTranNo || iccid;

      await supabaseService
        .from('esims')
        .update({ status: newStatus })
        .eq(identifier, value);
    }

    // For top-up, create a new order record
    if (action === 'topup' && data.success) {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Find the original eSIM and its order by ICCID
      const { data: esim } = await supabaseService
        .from('esims')
        .select(`
          order_id,
          orders (id, user_id, customer_email, payment_id)
        `)
        .eq('iccid', iccid)
        .single();

      if (esim?.orders && packageCode) {
        const originalOrder = esim.orders;
        
        // Find the package
        const { data: pkg } = await supabaseService
          .from('esim_packages')
          .select('id, price_usd')
          .eq('package_id', packageCode)
          .single();

        if (pkg) {
          // Create topup order
          const topupReference = `TOPUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await supabaseService
            .from('orders')
            .insert({
              user_id: originalOrder.user_id,
              package_id: pkg.id,
              order_reference: topupReference,
              customer_email: originalOrder.customer_email,
              status: 'completed',
              total_amount: pkg.price_usd,
              payment_id: `TOPUP-${Date.now()}`,
              order_type: 'TOPUP',
              parent_order_id: originalOrder.id
            });
        }
      }
    }

    console.log(`${action} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        message: `eSIM ${action} completed successfully`,
        data: data.obj || {}
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`Error in manage-esim function:`, error);
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