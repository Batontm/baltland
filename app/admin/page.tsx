import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { getLeads, getSubscribers, getUsers, getAdminStats, getNews, getFaqItems, getLegalContent, getAdminLandPlots } from "@/app/actions"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect("/admin/login")
  }

  const supabase = createAdminClient()

  const [plots, leads, subscribers, users, stats, news, faqItems, legalContent] = await Promise.all([
    getAdminLandPlots(),
    getLeads(),
    getSubscribers(),
    getUsers(),
    getAdminStats(),
    getNews(),
    getFaqItems(),
    getLegalContent(),
  ])


  return (
    <AdminDashboard
      initialPlots={plots}
      initialLeads={leads}
      initialSubscribers={subscribers}
      initialUsers={users}
      initialNews={news}
      initialFaqItems={faqItems}
      initialLegalContent={legalContent}
      initialStats={stats}
      isAuthenticated={true}
    />

  )
}
