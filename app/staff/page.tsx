import { redirect } from "next/navigation"

export default function StaffPage() {
  // Immediate redirect to admin login
  redirect("/admin/login")
}
