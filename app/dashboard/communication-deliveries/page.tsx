import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import WhatsAppDeliveryQueue from "@/components/admin/WhatsAppDeliveryQueue"

export default async function CommunicationDeliveriesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!isAdminRole(user.role)) redirect("/dashboard")
  return <main className="space-y-6"><header className="border-b border-[#143b28] pb-6"><p className="font-mono text-xs uppercase text-[#20dc73]">Communications</p><h1 className="mt-2 text-3xl font-bold text-white">WhatsApp delivery queue</h1><p className="mt-2 max-w-2xl text-sm text-white/55">Review prepared transactional alerts and send them through the operator’s WhatsApp Business application.</p></header><WhatsAppDeliveryQueue /></main>
}
