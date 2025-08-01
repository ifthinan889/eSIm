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

    const { orderNo, esimTranNo, iccid } = await req.json();

    if (!orderNo && !esimTranNo && !iccid) {
      throw new Error("Order number, eSIM transaction number, or ICCID is required");
    }

    console.log("Querying eSIM from eSIM Access API...");

    // Query eSIM from eSIM Access API
    const queryBody: any = {
      pager: {
        pageNum: 1,
        pageSize: 50
      }
    };

    if (orderNo) queryBody.orderNo = orderNo;
    if (esimTranNo) queryBody.esimTranNo = esimTranNo;
    if (iccid) queryBody.iccid = iccid;

    const response = await fetch("https://api.esimaccess.com/api/v1/open/esim/query", {
      method: "POST",
      headers: {
        "RT-AccessCode": esimAccessCode,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryBody),
    });

    if (!response.ok) {
      throw new Error(`eSIM Access API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`eSIM query failed: ${data.errorMessage || data.errorCode}`);
    }

    // Connect to Supabase with service role to update eSIM data
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const esims = [];

    // Process each eSIM from the response
    for (const esim of data.obj.esimList) {
      // Find the corresponding order in our database
      const { data: order } = await supabaseService
        .from('orders')
        .select('*')
        .eq('payment_id', esim.orderNo)
        .single();

      if (order) {
        // Update or create eSIM record
        const esimData = {
          order_id: order.id,
          esim_token: esim.esimTranNo,
          iccid: esim.iccid,
          qr_code_url: esim.qrCodeUrl,
          activation_code: esim.ac,
          status: mapESIMStatus(esim.esimStatus),
          data_used_mb: Math.round(esim.orderUsage / (1024 * 1024)),
          expires_at: esim.expiredTime,
          activated_at: esim.activateTime,
        };

        const { error } = await supabaseService
          .from('esims')
          .upsert(esimData, { 
            onConflict: 'esim_token',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`Error updating eSIM ${esim.esimTranNo}:`, error);
        }

        // Update order status if needed
        await supabaseService
          .from('orders')
          .update({ 
            status: mapOrderStatus(esim.esimStatus)
          })
          .eq('id', order.id);
      }

      esims.push({
        esimTranNo: esim.esimTranNo,
        orderNo: esim.orderNo,
        iccid: esim.iccid,
        qrCodeUrl: esim.qrCodeUrl,
        activationCode: esim.ac,
        status: esim.esimStatus,
        smdpStatus: esim.smdpStatus,
        dataUsed: esim.orderUsage,
        totalData: esim.totalVolume,
        expiresAt: esim.expiredTime,
        packageList: esim.packageList
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        esims: esims,
        total: data.obj.pager.total
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in query-esim function:", error);
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

function mapESIMStatus(esimStatus: string): string {
  switch (esimStatus) {
    case 'GOT_RESOURCE':
    case 'IN_USE':
      return 'active';
    case 'SUSPENDED':
      return 'suspended';
    case 'CANCEL':
      return 'cancelled';
    case 'REVOKE':
      return 'revoked';
    default:
      return 'active';
  }
}

function mapOrderStatus(esimStatus: string): string {
  switch (esimStatus) {
    case 'GOT_RESOURCE':
    case 'IN_USE':
      return 'completed';
    case 'CANCEL':
      return 'cancelled';
    case 'CREATE':
    case 'PAYING':
      return 'pending';
    default:
      return 'completed';
  }
}