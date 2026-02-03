import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Subscriber } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { Bell, CheckCircle, Mail, Trash2, X } from "lucide-react"

interface SubscribersTabProps {
  subscribers: Subscriber[]
  onToggleActive: (subscriber: Subscriber, next: boolean) => void
  onDelete: (id: string) => void
}

export function SubscribersTab({ subscribers, onToggleActive, onDelete }: SubscribersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Email подписчики</h2>
        <Badge variant="outline">{subscribers.length} подписчиков</Badge>
      </div>

      <div className="space-y-4">
        {subscribers.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Подписчиков пока нет</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="divide-y">
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <Checkbox
                    checked={sub.is_active}
                    onCheckedChange={(checked) => onToggleActive(sub, Boolean(checked))}
                    className="h-5 w-5"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className={`font-medium ${!sub.is_active ? "text-muted-foreground line-through" : ""}`}>
                        {sub.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">{formatDate(sub.created_at)}</p>
                        {sub.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Активен
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            <X className="h-3 w-3 mr-1" />
                            Отключен
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(sub.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default SubscribersTab


