import { AdminLoginForm } from "@/components/admin/admin-login-form"

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <AdminLoginForm initialError={params.error} />
    </div>
  )
}
