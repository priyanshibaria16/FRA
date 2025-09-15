import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import Shadcn components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

// Import Lucide icons
import { 
  MapPin, Shield, Users, BarChart3, FileText, 
  Upload, Eye, CheckCircle, XCircle, Clock,
  Menu, X, LogOut, User, Home, Map,
  TrendingUp, AlertTriangle, Leaf, Globe
} from 'lucide-react';

// Leaflet imports
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Configure axios
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;
axios.defaults.baseURL = API_BASE_URL;

// Auth context
const AuthContext = React.createContext();

// Auth provider component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Landing Page Component
function LandingPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-emerald-800">FRA Atlas & DSS</h1>
            </div>
            <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Login / Register
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <AuthForm onClose={() => setShowAuthDialog(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            AI-Powered FRA Atlas & DSS
          </h1>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed">
            Empowering communities through AI, GIS, and transparency in Forest Rights Act implementation
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6">
                  <Map className="w-5 h-5 mr-2" />
                  Explore Atlas
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-lg px-8 py-6">
                  <FileText className="w-5 h-5 mr-2" />
                  Submit FRA Claim
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Transforming Forest Rights Management
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-emerald-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle className="text-emerald-800">Social Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Empowering tribal communities with secure land rights and digital inclusion
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-teal-600" />
                </div>
                <CardTitle className="text-teal-800">Economic Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Sustainable livelihoods through forest-based enterprises and resource management
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle className="text-emerald-800">Operational Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  AI-driven insights for faster claim processing and better decision making
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-teal-600" />
                </div>
                <CardTitle className="text-teal-800">Environmental Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Balanced conservation through community-based forest management
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Comprehensive FRA Management Platform
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <MapPin className="w-8 h-8 text-emerald-600 mb-2" />
                <CardTitle>Interactive Atlas</CardTitle>
                <CardDescription>
                  Real-time mapping of FRA claims with satellite data integration and AI-powered hotspot analysis
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="w-8 h-8 text-teal-600 mb-2" />
                <CardTitle>AI Document Processing</CardTitle>
                <CardDescription>
                  Automated document analysis, OCR extraction, and intelligent form auto-filling
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-emerald-600 mb-2" />
                <CardTitle>Decision Support System</CardTitle>
                <CardDescription>
                  Data-driven insights for policy makers with fraud detection and trend analysis
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-emerald-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Get Started Today</h2>
          <p className="text-xl mb-8 text-emerald-100">
            Join thousands of communities already using our platform to secure their forest rights
          </p>
          <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="bg-white text-emerald-800 hover:bg-gray-100">
                Start Your Journey
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </section>
    </div>
  );
}

// Auth Form Component
function AuthForm({ onClose }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Community User',
    phone: '',
    address: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isLogin 
      ? await login(formData.email, formData.password)
      : await register(formData);
    
    if (success) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isLogin ? 'Login' : 'Register'}</DialogTitle>
        <DialogDescription>
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        {!isLogin && (
          <>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Community User">Community User</SelectItem>
                  <SelectItem value="NGO">NGO</SelectItem>
                  <SelectItem value="District Officer">District Officer</SelectItem>
                  <SelectItem value="Ministry">Ministry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
          </>
        )}

        <div className="flex gap-4">
          <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            {isLogin ? 'Login' : 'Register'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Login'}
          </Button>
        </div>
      </form>
    </>
  );
}

// Dashboard Component
function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [map, setMap] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchClaims();
    fetchMapData();
  }, []);

  useEffect(() => {
    if (activeTab === 'atlas' && !map) {
      initializeMap();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    }
  };

  const fetchClaims = async () => {
    try {
      const response = await axios.get('/api/claims');
      setClaims(response.data);
    } catch (error) {
      toast.error('Failed to fetch claims');
    }
  };

  const fetchMapData = async () => {
    try {
      const response = await axios.get('/api/dashboard/map-data');
      setMapData(response.data);
    } catch (error) {
      toast.error('Failed to fetch map data');
    }
  };

  const initializeMap = () => {
    setTimeout(() => {
      const mapElement = document.getElementById('map');
      if (mapElement && !map) {
        const newMap = L.map('map').setView([20.5937, 78.9629], 5); // Center on India
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(newMap);

        // Add markers for claims
        mapData.forEach(claim => {
          if (claim.location && claim.location.lat && claim.location.lng) {
            const color = claim.status === 'approved' ? 'green' : 
                         claim.status === 'rejected' ? 'red' : 'orange';
            
            const marker = L.circleMarker([claim.location.lat, claim.location.lng], {
              color: color,
              fillColor: color,
              fillOpacity: 0.6,
              radius: 8
            }).addTo(newMap);
            
            marker.bindPopup(`
              <strong>${claim.title}</strong><br>
              Status: ${claim.status}<br>
              Location: ${claim.location.address}
            `);
          }
        });

        setMap(newMap);
      }
    }, 100);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { variant: 'default', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { variant: 'destructive', className: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { variant: 'secondary', className: 'bg-orange-100 text-orange-800', icon: Clock },
      under_review: { variant: 'outline', className: 'bg-blue-100 text-blue-800', icon: Eye }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">FRA Atlas & DSS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.full_name}</span>
              <Badge variant="outline">{user?.role}</Badge>
              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="atlas">
              <Map className="w-4 h-4 mr-2" />
              Atlas
            </TabsTrigger>
            <TabsTrigger value="claims">
              <FileText className="w-4 h-4 mr-2" />
              Claims
            </TabsTrigger>
            <TabsTrigger value="submit">
              <Upload className="w-4 h-4 mr-2" />
              Submit Claim
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.statistics?.total_claims || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.statistics?.approved_claims || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats?.statistics?.pending_claims || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.statistics?.approval_rate?.toFixed(1) || 0}%</div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            {stats?.ai_insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                    AI-Generated Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {stats.ai_insights.ai_insights}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Atlas Tab */}
          <TabsContent value="atlas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive FRA Atlas</CardTitle>
                <CardDescription>
                  Explore FRA claims across regions with real-time status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div id="map" style={{ height: '500px', width: '100%' }}></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>FRA Claims Management</CardTitle>
                <CardDescription>
                  View and manage FRA claims based on your role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <Card key={claim._id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{claim.title}</h3>
                          <p className="text-sm text-gray-600">{claim.description}</p>
                          <p className="text-xs text-gray-500">
                            Location: {claim.location?.address || 'Not specified'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(claim.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(claim.status)}
                          {(user?.role === 'District Officer' || user?.role === 'Ministry') && (
                            <ClaimStatusUpdate claim={claim} onUpdate={fetchClaims} />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Claim Tab */}
          <TabsContent value="submit" className="space-y-6">
            <ClaimSubmissionForm onSubmit={fetchClaims} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claim Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Approved</span>
                      <span className="text-sm font-medium">{stats?.statistics?.approved_claims || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <span className="text-sm font-medium">{stats?.statistics?.pending_claims || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rejected</span>
                      <span className="text-sm font-medium">{stats?.statistics?.rejected_claims || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Users</span>
                      <span className="text-sm font-medium">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Processing Time</span>
                      <span className="text-sm font-medium">Optimized</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Analysis</span>
                      <span className="text-sm font-medium text-green-600">Running</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Claim Submission Form Component
function ClaimSubmissionForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: {
      lat: '',
      lng: '',
      address: '',
      state: '',
      district: '',
      village: ''
    },
    area_hectares: '',
    forest_type: '',
    community_details: ''
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      await axios.post('/api/claims', formData);
      toast.success('Claim submitted successfully!');
      onSubmit();
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: {
          lat: '',
          lng: '',
          address: '',
          state: '',
          district: '',
          village: ''
        },
        area_hectares: '',
        forest_type: '',
        community_details: ''
      });
    } catch (error) {
      toast.error('Failed to submit claim');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData({
        ...formData,
        location: { ...formData.location, [locationField]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New FRA Claim</CardTitle>
        <CardDescription>
          Fill out the form below to submit your Forest Rights Act claim
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Claim Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief title for your claim"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="area_hectares">Area (Hectares)</Label>
              <Input
                id="area_hectares"
                name="area_hectares"
                type="number"
                step="0.01"
                value={formData.area_hectares}
                onChange={handleInputChange}
                placeholder="Area in hectares"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of your claim"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location.state">State</Label>
              <Input
                id="location.state"
                name="location.state"
                value={formData.location.state}
                onChange={handleInputChange}
                placeholder="State"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="location.district">District</Label>
              <Input
                id="location.district"
                name="location.district"
                value={formData.location.district}
                onChange={handleInputChange}
                placeholder="District"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="location.village">Village</Label>
              <Input
                id="location.village"
                name="location.village"
                value={formData.location.village}
                onChange={handleInputChange}
                placeholder="Village"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location.address">Full Address</Label>
            <Textarea
              id="location.address"
              name="location.address"
              value={formData.location.address}
              onChange={handleInputChange}
              placeholder="Complete address including landmarks"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="forest_type">Forest Type</Label>
              <Input
                id="forest_type"
                name="forest_type"
                value={formData.forest_type}
                onChange={handleInputChange}
                placeholder="e.g., Dense forest, Open forest"
              />
            </div>
            
            <div>
              <Label htmlFor="community_details">Community Details</Label>
              <Input
                id="community_details"
                name="community_details"
                value={formData.community_details}
                onChange={handleInputChange}
                placeholder="Community information"
              />
            </div>
          </div>

          <Button type="submit" disabled={uploading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {uploading ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Claim Status Update Component
function ClaimStatusUpdate({ claim, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [notes, setNotes] = useState('');

  const handleUpdate = async () => {
    try {
      await axios.put(`/api/claims/${claim._id}/status`, {
        status,
        officer_notes: notes
      });
      toast.success('Claim status updated successfully');
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update claim status');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Claim Status</DialogTitle>
          <DialogDescription>
            Update the status and add officer notes for this claim
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Officer Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status update"
              rows={3}
            />
          </div>
          
          <Button onClick={handleUpdate} className="w-full">
            Update Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;