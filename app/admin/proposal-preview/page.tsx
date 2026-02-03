import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { getOrganizationSettings } from "@/app/actions"
import ProposalPreviewPageClient from "./client"

export default async function ProposalPreviewPage() {
    const session = await getAdminSession()

    if (!session) {
        redirect("/admin/login")
    }

    const settings = await getOrganizationSettings()

    return <ProposalPreviewPageClient settings={settings} />
}
