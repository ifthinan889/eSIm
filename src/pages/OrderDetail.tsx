import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, QrCode, Copy, RefreshCw, Smartphone, Calendar, Signal, DollarSign } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

interface OrderDetails {
  id: string;
  order_reference: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  total_amount: number;
  created_at: string;
  payment_id: string;
  esim_packages: {
    name: string;
    description: string;
    country_code: string;
    region: string;
    data_amount_mb: number;
    validity_days: number;
    package_type: string;
  };
  esims: Array<{
    id: string;
    esim_token: string;
    iccid: string;
    qr_code_url: string;
    activation_code: string;
    status: string;
    data_used_mb: number;
    expires_at: string;
    activated_at: string;
  }>;
}

const OrderDetail = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (orderId && user) {
      loadOrderDetails();
    }
  }, [orderId, user]);

  const loadOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          esim_packages (*),
          esims (*)
        `)
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshESIM = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('query-esim', {
        body: { orderNo: order.payment_id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "eSIM status updated successfully",
      });

      loadOrderDetails();
    } catch (error) {
      console.error('Error refreshing eSIM:', error);
      toast({
        title: "Error",
        description: "Failed to refresh eSIM status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'revoked':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDataAmount = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <Link to="/orders">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/orders">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{order.order_reference}</h1>
              <p className="text-muted-foreground">Order placed on {new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Package Details</h4>
                <p className="text-lg font-medium">{order.esim_packages.name}</p>
                <p className="text-sm text-muted-foreground">{order.esim_packages.description}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{order.esim_packages.country_code} {order.esim_packages.region && `- ${order.esim_packages.region}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Amount</p>
                    <p className="font-medium">{formatDataAmount(order.esim_packages.data_amount_mb)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validity</p>
                    <p className="font-medium">{order.esim_packages.validity_days} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="font-medium text-lg">${order.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Customer Information</h4>
                <p className="text-sm">Email: {order.customer_email}</p>
                {order.customer_phone && <p className="text-sm">Phone: {order.customer_phone}</p>}
              </div>

              <Button onClick={refreshESIM} disabled={loading} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh eSIM Status
              </Button>
            </CardContent>
          </Card>

          {/* eSIM Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                eSIM Details
              </CardTitle>
              <CardDescription>
                {order.esims.length === 0 
                  ? "eSIM is being prepared. This may take up to 30 seconds."
                  : "Your eSIM is ready for installation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.esims.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Preparing your eSIM...</p>
                  <p className="text-sm text-muted-foreground mt-2">This usually takes 10-30 seconds</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {order.esims.map((esim) => (
                    <div key={esim.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">eSIM Profile</h4>
                        <Badge className={getStatusColor(esim.status)}>
                          {esim.status.charAt(0).toUpperCase() + esim.status.slice(1)}
                        </Badge>
                      </div>

                      {esim.qr_code_url && (
                        <div className="text-center">
                          <img 
                            src={esim.qr_code_url} 
                            alt="QR Code" 
                            className="w-48 h-48 mx-auto border rounded-lg"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Scan this QR code to install the eSIM
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">ICCID</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(esim.iccid, "ICCID")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-mono text-sm">{esim.iccid}</p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Activation Code</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(esim.activation_code, "Activation Code")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-mono text-xs break-all">{esim.activation_code}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">Data Used</p>
                            <p className="font-medium">{formatDataAmount(esim.data_used_mb)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="font-medium">
                              {esim.expires_at ? new Date(esim.expires_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;