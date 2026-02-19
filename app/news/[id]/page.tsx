import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewsDetailRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/blog/${id}`)
}
