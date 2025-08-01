import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Smartphone, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ESIMPackage {
  id: string;
  package_id: string;
  name: string;
  description: string;
  country_code: string;
  region: string;
  data_amount_mb: number;
  validity_days: number;
  price_usd: number;
  package_type: string;
}

const Packages = () => {
  const [packages, setPackages] = useState<ESIMPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('esim_packages')
        .select('*')
        .eq('is_active', true)
        .order('price_usd', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Generate order reference
      const orderReference = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const selectedPackage = packages.find(p => p.id === packageId);
      if (!selectedPackage) return;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          package_id: packageId,
          order_reference: orderReference,
          customer_email: user.email,
          total_amount: selectedPackage.price_usd,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Order Created",
        description: `Order ${orderReference} has been created successfully!`,
      });

      navigate(`/orders/${data.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive"
      });
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">eSIM Packages</h1>
          <p className="text-muted-foreground">Choose the perfect package for your travel needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">eSIM Packages</h1>
        <p className="text-muted-foreground">Choose the perfect package for your travel needs</p>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No packages available</h3>
            <p className="text-muted-foreground">Check back later for new eSIM packages.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <Badge variant="secondary">{pkg.package_type}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {pkg.country_code} {pkg.region && `- ${pkg.region}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDataAmount(pkg.data_amount_mb)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{pkg.validity_days} days</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">${pkg.price_usd}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase(pkg.id)}
                  >
                    {user ? 'Purchase Now' : 'Sign In to Purchase'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Packages;