import { createAdminClient } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

export default async function FixPasswordPage() {
  async function resetPassword() {
    "use server"

    const PASSWORD = "123"

    // Generate a FRESH bcrypt hash
    const newHash = await bcrypt.hash(PASSWORD, 10)

    // Update database
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("admin_users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("username", "admin")

    if (error) {
      throw new Error(`Database update failed: ${error.message}`)
    }

    // Verify the new hash works
    const { data: user } = await supabase.from("admin_users").select("password_hash").eq("username", "admin").single()

    if (!user) {
      throw new Error("User not found after update")
    }

    const isValid = await bcrypt.compare(PASSWORD, user.password_hash)

    if (!isValid) {
      throw new Error("New hash validation failed!")
    }

    // Success! Redirect to login
    redirect("/admin/login?reset=success")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Сброс пароля администратора</h1>
          <p className="text-muted-foreground">
            Эта служебная страница сгенерирует новый bcrypt хеш для пароля "123" и обновит базу данных.
          </p>
        </div>

        <form action={resetPassword}>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Сбросить пароль на "123"
          </button>
        </form>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Логин:</strong> admin
          </p>
          <p>
            <strong>Пароль:</strong> 123
          </p>
        </div>
      </div>
    </div>
  )
}
