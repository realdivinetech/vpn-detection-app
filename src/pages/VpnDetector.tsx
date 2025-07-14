import React, { useState, useEffect, Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Play, Loader2, Settings } from 'lucide-react';
import { DetectionEngine } from '@/lib/detectionEngine';
import { DetectionResult as IDetectionResult } from '@/types/detection';
import DetectionCard from '@/components/DetectionCard';
import DetectionResultComponent from '@/components/DetectionResult';
import AdminPanel from '@/components/AdminPanel';
import AdminLogin from '@/components/AdminLogin';
import MapView from '@/components/MapView';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-600 font-bold p-4">Something went wrong while rendering this section.</div>;
    }

    return this.props.children;
  }
}

export default function VpnDetector() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<IDetectionResult | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [detectionEngine] = useState(() => new DetectionEngine());
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error getting browser location:', error);
          setBrowserLocation(null);
        }
      );
    }
  }, []);

  const startDetection = async () => {
    try {
      console.log('Starting detection...');
      setIsScanning(true);
      setProgress(0);
      setResult(null);
      setCurrentStep('Initializing...');

      // Simulate progress updates
      const steps = [
        'Analyzing IP address...',
        'Checking WebRTC leaks...',
        'Generating browser fingerprint...',
        'Checking location consistency...',
        'Running bot detection...',
        'Finalizing results...'
      ];

      for (let i = 0; i < steps.length; i++) {
        console.log('Step:', steps[i]);
        setCurrentStep(steps[i]);
        setProgress((i + 1) * 16.67);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const detectionResult = await detectionEngine.runFullDetection();
      console.log('Detection result:', detectionResult);
      setResult(detectionResult);
      setProgress(100);
    } catch (error) {
      console.error('Detection failed:', error);
      setCurrentStep('Detection failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAdminLogin = (credentials: { username: string; password: string }) => {
    // Simple authentication - in production, this should be handled by backend
    if (credentials.username === 'admin' && credentials.password === 'admin') {
      setIsAdminAuthenticated(true);
      setAdminLoginError('');
    } else {
      setAdminLoginError('Invalid username or password');
    }
  };

  const handleAdminToggle = (enabled: boolean) => {
    setShowAdminPanel(enabled);
    if (!enabled) {
      setIsAdminAuthenticated(false);
      setAdminLoginError('');
    }
  };

  // Show admin login if admin panel is enabled but not authenticated
  if (showAdminPanel && !isAdminAuthenticated) {
    return <AdminLogin onLogin={handleAdminLogin} error={adminLoginError} />;
  }

  // Show admin panel if authenticated
  if (showAdminPanel && isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button 
              variant="outline" 
              onClick={() => handleAdminToggle(false)}
            >
              Back to Detection
            </Button>
          </div>
          <AdminPanel />
        </div>
      </div>
    );
  }

  return (
<main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-12 px-2 sm:pt-16 sm:px-4 md:pt-20 md:px-6" role="main" aria-label="VPN Proxy Detection System">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="text-center space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" aria-hidden="true" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              VPN/Proxy Detection System
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced multi-layer detection system to identify VPN, proxy, and anonymization services
          </p>
          <div className="text-xs sm:text-sm text-muted-foreground">
            By <strong>Defi Xpert and Divine Tech</strong> (realdivinetech)
          </div>
        </header>

        {/* Admin Panel Toggle - Disabled */}
        {/* <Card className="border-blue-200 bg-blue-50 opacity-50 pointer-events-none">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <Label htmlFor="admin-toggle" className="text-base font-medium text-blue-900">
                    Admin Dashboard (Disabled)
                  </Label>
                  <p className="text-xs sm:text-sm text-blue-700">Admin panel access is currently disabled For Security Reasons</p>
                </div>
              </div>
              <Switch
                id="admin-toggle"
                checked={showAdminPanel}
                onCheckedChange={handleAdminToggle}
                className="data-[state=checked]:bg-blue-600"
                disabled
              />
            </div>
          </CardContent>
        </Card> */}

        {/* Main Detection Interface */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Detection Control Panel
            </CardTitle>
            <CardDescription>
              Start a comprehensive scan to detect VPN, proxy, and other anonymization services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <Button 
                onClick={startDetection} 
                disabled={isScanning}
                size="lg"
                className="px-6 py-2 sm:px-8 sm:py-3 text-base sm:text-lg"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Start VPN Detection'
                )}
              </Button>
            </div>

            {isScanning && (
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{currentStep}</p>
                  <Progress value={progress} className="w-full max-w-xs sm:max-w-md mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% Complete</p>
                </div>
              </div>
            )}

            {/* Detection Methods Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <DetectionCard
                title="IP Analysis"
                description="ASN, geolocation, and hosting detection"
                icon="🌐"
                status={result?.results?.ipAnalysis ? 'completed' : 'pending'}
              />
              <DetectionCard
                title="WebRTC Leak"
                description="Local IP leak detection"
                icon="🔗"
                status={result?.results?.webrtcLeak ? 'completed' : 'pending'}
              />
              <DetectionCard
                title="Fingerprinting"
                description="Browser and device analysis"
                icon="🖼️"
                status={result?.results?.fingerprint ? 'completed' : 'pending'}
              />
              <DetectionCard
                title="Location Check"
                description="GPS vs IP location comparison"
                icon="📍"
                status={result?.results?.locationMismatch ? 'completed' : 'pending'}
              />
              <DetectionCard
                title="Bot Detection"
                description="Automated browser detection"
                icon="🤖"
                status={result?.results?.botDetection ? 'completed' : 'pending'}
              />
              <DetectionCard
                title="Behavior Analysis"
                description="User interaction patterns"
                icon="🎯"
                status={result ? 'completed' : 'pending'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Detection Results */}
      {result && (
        <>
          {console.log('Rendering DetectionResultComponent with result:', result)}
          <div className="space-y-4 sm:space-y-6">
            <ErrorBoundary>
              <DetectionResultComponent result={result} />
            </ErrorBoundary>
          </div>
        </>
      )}
      </div>

      {/* Map Views */}
      {result && (
        <>
          {console.log('Rendering MapView components with result:', result, 'browserLocation:', browserLocation)}
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 mt-8">
            <h2 className="text-2xl font-semibold text-center mb-4">Location Maps</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {result?.results?.ipAnalysis?.latitude && result?.results?.ipAnalysis?.longitude && (
              <ErrorBoundary>
                <MapView
                  lat={result.results.ipAnalysis.latitude}
                  lng={result.results.ipAnalysis.longitude}
                  label="IP Location"
                  title="IP Location"
                  height="300px"
                  width="100%"
                />
              </ErrorBoundary>
            )}
            {browserLocation && (
              <ErrorBoundary>
                <MapView
                  lat={browserLocation.lat}
                  lng={browserLocation.lng}
                  label="Browser GPS Location"
                  title="Browser GPS Location"
                  height="300px"
                  width="100%"
                />
              </ErrorBoundary>
            )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
