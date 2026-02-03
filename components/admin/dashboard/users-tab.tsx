import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User } from "@/lib/types"
import { USER_ROLE_OPTIONS } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { CheckCircle, Eye, EyeOff, Shield, ShieldCheck, Trash2, Users, X, Edit, Plus } from "lucide-react"

interface UsersTabProps {
  users: User[]
  userFormData: { username: string; email: string; password?: string; name: string; role: "admin" | "manager" }
  isCreatingUser: boolean
  editingUser: User | null
  showPassword: boolean
  loading: boolean
  onCreate: () => void
  onCancel: () => void
  onSave: () => void
  onEdit: (user: User) => void
  onDelete: (id: string) => void
  onToggleShowPassword: () => void
  onChangeForm: (patch: Partial<UsersTabProps["userFormData"]>) => void
}

export function UsersTab({
  users,
  userFormData,
  isCreatingUser,
  editingUser,
  showPassword,
  loading,
  onCreate,
  onCancel,
  onSave,
  onEdit,
  onDelete,
  onToggleShowPassword,
  onChangeForm,
}: UsersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Управление пользователями</h2>
        <Button onClick={onCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Добавить пользователя
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {(isCreatingUser || editingUser) && (
          <Card className="lg:col-span-1 rounded-2xl h-fit sticky top-24">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {isCreatingUser ? "Новый пользователь" : "Редактирование"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input
                  value={userFormData.name}
                  onChange={(e) => onChangeForm({ name: e.target.value })}
                  placeholder="Иван Петров"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Имя пользователя</Label>
                <Input
                  value={userFormData.username}
                  onChange={(e) => onChangeForm({ username: e.target.value })}
                  placeholder="admin"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => onChangeForm({ email: e.target.value })}
                  placeholder="ivan@example.com"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {isCreatingUser ? "Пароль" : "Новый пароль (оставьте пустым для сохранения текущего)"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={userFormData.password || ""}
                    onChange={(e) => onChangeForm({ password: e.target.value })}
                    placeholder={isCreatingUser ? "Введите пароль" : "••••••••"}
                    className="rounded-xl pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={onToggleShowPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Роль</Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value) => onChangeForm({ role: value as "admin" | "manager" })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={onSave} disabled={loading} className="flex-1 rounded-xl">
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button variant="outline" onClick={onCancel} className="rounded-xl bg-transparent">
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`space-y-4 ${isCreatingUser || editingUser ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {users.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Пользователей пока нет. Добавьте первого!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl overflow-hidden">
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${user.role === "admin" ? "bg-red-100" : "bg-blue-100"}`}>
                        {user.role === "admin" ? (
                          <ShieldCheck className="h-5 w-5 text-red-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.name}</p>
                          <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                            {user.role === "admin" ? "Админ" : "Менеджер"}
                          </Badge>
                        </div>
                        {user.username && <p className="text-sm text-muted-foreground">{user.username}</p>}
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Создан: {formatDate(user.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(user)}
                        className="rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user.id)}
                        className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default UsersTab


