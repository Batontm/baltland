import { redirect } from "next/navigation"

export default async function NewsRedirectPage() {
    redirect("/blog")
}
