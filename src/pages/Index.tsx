import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Wifi, Shield, Settings, BarChart3 } from "lucide-react";

const Index = () => {
  const [selectedRegion, setSelectedRegion] = useState("global");

  // Mock data for eSIM packages
  const packages = [
    {
      id: 1,
      title: "Global 5GB",
      description: "Works in 150+ countries",
      price: 29.99,
      data: "5GB",
      validity: "30 days",
      countries: 150,
      region: "global"
    },
    {
      id: 2,
      title: "Europe 10GB",
      description: "Perfect for European travels",
      price: 24.99,
      data: "10GB",
      validity: "30 days",
      countries: 35,
      region: "europe"
    },
    {
      id: 3,
      title: "Asia Pacific 8GB",
      description: "Explore Asia with unlimited connectivity",
      price: 19.99,
      data: "8GB",
      validity: "15 days",
      countries: 20,
      region: "asia"
    }
  ];

  const regions = [
    { id: "global", name: "Global", icon: Globe },
    { id: "europe", name: "Europe", icon: Wifi },
    { id: "asia", name: "Asia Pacific", icon: Shield }
  ];

  const filteredPackages = selectedRegion === "global" 
    ? packages 
    : packages.filter(pkg => pkg.region === selectedRegion);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">eSIM Access</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Stay Connected Anywhere</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Get instant mobile data with our global eSIM packages
          </p>
        </div>

        {/* Region Tabs */}
        <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            {regions.map((region) => {
              const Icon = region.icon;
              return (
                <TabsTrigger key={region.id} value={region.id} className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span>{region.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Package Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{pkg.title}</CardTitle>
                    <Badge variant="secondary">{pkg.region}</Badge>
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-3xl font-bold text-primary">${pkg.price}</span>
                      <div className="text-right">
                        <div className="font-semibold">{pkg.data}</div>
                        <div className="text-sm text-muted-foreground">{pkg.validity}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{pkg.countries}+ countries</span>
                      <span>Instant activation</span>
                    </div>
                    
                    <Button className="w-full" size="lg">
                      Purchase eSIM
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Tabs>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Wifi className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Instant Activation</h3>
            <p className="text-muted-foreground">Get connected in minutes with QR code activation</p>
          </div>
          
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Global Coverage</h3>
            <p className="text-muted-foreground">Access networks in 150+ countries worldwide</p>
          </div>
          
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-muted-foreground">Enterprise-grade security with 99.9% uptime</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
