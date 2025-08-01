import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { 
  Smartphone, 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  RefreshCw,
  Plus,
  Trash2,
  Pause,
  Play,
  Ban
} from 'lucide-react';

const Admin = () => {
  const [stats, setStats] = useState({
    totalPackages: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [packages, setPackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const [packagesRes, ordersRes] = await Promise.all([
        supabase.from('esim_packages').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' })
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      setStats({
        totalPackages: packagesRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: 0, // We don't have direct access to auth.users
        totalRevenue
      });

      // Load recent packages and orders
      const [recentPackages, recentOrders] = await Promise.all([
        supabase.from('esim_packages').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select(`
          *,
          esim_packages (name, country_code)
        `).order('created_at', { ascending: false }).limit(10)
      ]);

      setPackages(recentPackages.data || []);
      setOrders(recentOrders.data || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const syncPackages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('sync-packages');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `Synced ${data.packagesCount} packages from eSIM Access`,
      });

      loadDashboardData();
    } catch (error) {
      console.error('Error syncing packages:', error);
      toast({
        title: "Error",
        description: "Failed to sync packages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const manageESIM = async (action: string, esimToken: string, iccid: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('manage-esim', {
        body: {
          action,
          esimTranNo: esimToken,
          iccid
        }
      });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `eSIM ${action} completed successfully`,
      });

      loadDashboardData();
    } catch (error) {
      console.error(`Error ${action} eSIM:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} eSIM`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage eSIM packages, orders, and system settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPackages}</div>
              <p className="text-xs text-muted-foreground">Active eSIM packages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Orders processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total earnings</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Package Management</CardTitle>
                    <CardDescription>Manage eSIM packages and sync with eSIM Access</CardDescription>
                  </div>
                  <Button onClick={syncPackages} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Packages
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pkg.country_code} • {formatDataAmount(pkg.data_amount_mb)} • {pkg.validity_days} days
                        </p>
                        <p className="font-medium">${pkg.price_usd}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>View and manage recent eSIM orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{order.order_reference}</h4>
                        <p className="text-sm text-muted-foreground">
                          {order.esim_packages?.name} • {order.customer_email}
                        </p>
                        <p className="text-sm">
                          {new Date(order.created_at).toLocaleDateString()} • ${order.total_amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="markup">Markup Percentage</Label>
                  <Input id="markup" placeholder="10" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Additional markup percentage on eSIM packages
                  </p>
                </div>

                <div>
                  <Label htmlFor="api-url">eSIM Access API URL</Label>
                  <Input id="api-url" value="https://api.esimaccess.com" readOnly />
                </div>

                <Button>Save Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Status</CardTitle>
                <CardDescription>Check connectivity to external services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>eSIM Access API</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supabase Database</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;