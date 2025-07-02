import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DetectionCardProps {
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'completed' | 'failed';
  details?: string;
}

export default function DetectionCard({ title, description, icon, status, details }: DetectionCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      status === 'completed' ? 'border-green-200' : 
      status === 'failed' ? 'border-red-200' : 'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{icon}</span>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mb-2">
          {description}
        </p>
        {details && (
          <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600">
            {details}
          </div>
        )}
      </CardContent>
    </Card>
  );
}