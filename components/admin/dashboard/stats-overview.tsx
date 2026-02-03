import { Card, CardContent } from "@/components/ui/card"
import { Bell, MessageSquare, TreePine, TrendingUp } from "lucide-react"

type Stats = {
  newLeadsToday: number
  newLeadsWeek: number
  activePlots: number
  totalSubscribers: number
}

interface StatsOverviewProps {
  initialStats: Stats
}

export function StatsOverview({ initialStats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{initialStats.newLeadsToday}</p>
              <p className="text-sm text-muted-foreground">Заявок сегодня</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{initialStats.newLeadsWeek}</p>
              <p className="text-sm text-muted-foreground">За неделю</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <TreePine className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{initialStats.activePlots}</p>
              <p className="text-sm text-muted-foreground">Активных участков</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{initialStats.totalSubscribers}</p>
              <p className="text-sm text-muted-foreground">Подписчиков</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StatsOverview

