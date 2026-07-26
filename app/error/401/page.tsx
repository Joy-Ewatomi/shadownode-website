import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
          <div className="p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-destructive">401</h1>
              <p className="text-xl font-semibold text-foreground">Unauthorized</p>
              <p className="text-sm text-muted-foreground">
                You need to be logged in to access this page.
              </p>
            </div>

            <div className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/login">
                  Sign in to continue
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  Back to home
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
