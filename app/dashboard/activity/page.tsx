'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogIn, Lock, Mail, Shield, Download, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface ActivityEvent {
  id: string
  type: 'login' | 'failed_login' | 'password_change' | 'email_change' | '2fa' | 'file_download' | 'api_access'
  title: string
  description: string
  timestamp: string
  device: string
  location: string
  status: 'success' | 'failed'
  icon: React.ReactNode
}

const mockActivity: ActivityEvent[] = [
  {
    id: '1',
    type: 'login',
    title: 'Successful login',
    description: 'Signed in from Desktop - Chrome',
    timestamp: '2 minutes ago',
    device: 'Chrome 126.0 • Windows 11',
    location: 'New York, United States',
    status: 'success',
    icon: <LogIn className="w-5 h-5" />,
  },
  {
    id: '2',
    type: 'file_download',
    title: 'File downloaded',
    description: 'Downloaded case_2024_001.pdf',
    timestamp: '1 hour ago',
    device: 'Chrome 126.0 • Windows 11',
    location: 'New York, United States',
    status: 'success',
    icon: <Download className="w-5 h-5" />,
  },
  {
    id: '3',
    type: '2fa',
    title: '2FA verification',
    description: 'Verified using authenticator app',
    timestamp: '3 hours ago',
    device: 'Chrome 126.0 • Windows 11',
    location: 'New York, United States',
    status: 'success',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: '4',
    type: 'failed_login',
    title: 'Failed login attempt',
    description: 'Invalid password provided',
    timestamp: 'Yesterday at 10:30 PM',
    device: 'Safari • iOS 17.5',
    location: 'Boston, United States',
    status: 'failed',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  {
    id: '5',
    type: 'password_change',
    title: 'Password changed',
    description: 'Account password was updated',
    timestamp: '3 days ago',
    device: 'Chrome 126.0 • Windows 11',
    location: 'New York, United States',
    status: 'success',
    icon: <Lock className="w-5 h-5" />,
  },
  {
    id: '6',
    type: 'email_change',
    title: 'Email address updated',
    description: 'Email changed to new@example.com',
    timestamp: '1 week ago',
    device: 'Safari • macOS 14.5',
    location: 'Toronto, Canada',
    status: 'success',
    icon: <Mail className="w-5 h-5" />,
  },
]

const typeColors = {
  login: 'bg-primary/10 text-primary',
  failed_login: 'bg-destructive/10 text-destructive',
  password_change: 'bg-yellow-500/10 text-yellow-500',
  email_change: 'bg-blue-500/10 text-blue-500',
  '2fa': 'bg-primary/10 text-primary',
  file_download: 'bg-green-500/10 text-green-500',
  api_access: 'bg-purple-500/10 text-purple-500',
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<string>('all')
  const [events, setEvents] = useState(mockActivity)

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter || (filter === 'alerts' && e.status === 'failed'))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
        <p className="text-muted-foreground mt-1">View security and access events on your account</p>
      </div>

      {/* Filter */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filter Events</CardTitle>
              <CardDescription>
                Show only specific types of activity
              </CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
                <SelectItem value="password_change">Password changes</SelectItem>
                <SelectItem value="2fa">2FA events</SelectItem>
                <SelectItem value="file_download">File downloads</SelectItem>
                <SelectItem value="alerts">Alerts & failures</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Activity Timeline */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <div key={event.id}>
                <div className="flex items-start gap-4 pb-4">
                  {/* Timeline dot and line */}
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[event.type as keyof typeof typeColors]}`}>
                      {event.icon}
                    </div>
                    {index !== filteredEvents.length - 1 && (
                      <div className="w-1 h-12 bg-border/30 mt-2" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        {event.status === 'failed' && (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        )}
                        {event.status === 'success' && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Success</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted/50 rounded">{event.device}</span>
                      <span className="px-2 py-1 bg-muted/50 rounded flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-semibold">Activity logs are kept for 90 days</p>
              <p className="text-muted-foreground">Older events are automatically archived. If you notice suspicious activity, please contact support immediately.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
