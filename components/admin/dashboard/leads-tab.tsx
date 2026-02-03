import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LEAD_STATUS_OPTIONS, PROPOSAL_STATUS_OPTIONS, type CommercialProposalWithDetails, type Lead } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { Badge as IconsBadge, Calendar, Edit2, FileText, HelpCircle, MapPin, MessageSquare, Phone, Trash2, X } from "lucide-react"

interface LeadsTabProps {
  leads: Lead[]
  leadFormData: Partial<Lead>
  editingLead: Lead | null
  loading: boolean
  leadProposals: Record<string, CommercialProposalWithDetails[]>
  onEditLead: (lead: Lead) => void
  onCancelEdit: () => void
  onUpdateLeadForm: (patch: Partial<Lead>) => void
  onSaveLead: () => void
  onDeleteLead: (id: string) => void
  onOpenProposalDialog: (lead: Lead) => void
  onViewProposal: (proposalId: string) => void
}

export function LeadsTab({
  leads,
  leadFormData,
  editingLead,
  loading,
  leadProposals,
  onEditLead,
  onCancelEdit,
  onUpdateLeadForm,
  onSaveLead,
  onDeleteLead,
  onOpenProposalDialog,
  onViewProposal,
}: LeadsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Заявки</h2>
        <Badge variant="outline">{leads.length} заявок</Badge>
      </div>

      {editingLead && (
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Редактирование заявки</CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Пожелания клиента</Label>
              <Textarea
                value={leadFormData.wishes || ""}
                onChange={(e) => onUpdateLeadForm({ wishes: e.target.value })}
                placeholder="Например: участок 10-15 соток, рядом с лесом, до 2 млн рублей..."
                className="rounded-xl min-h-[100px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={leadFormData.status || "new"} onValueChange={(value) => onUpdateLeadForm({ status: value as Lead["status"] })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Заметки менеджера</Label>
                <Textarea
                  value={leadFormData.manager_comment || ""}
                  onChange={(e) => onUpdateLeadForm({ manager_comment: e.target.value })}
                  placeholder="Внутренние заметки для команды..."
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onSaveLead} disabled={loading} className="rounded-xl">
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </Button>
              <Button variant="outline" onClick={onCancelEdit} className="rounded-xl">
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {leads.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Заявок пока нет</p>
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{lead.name}</h3>
                      <Badge className={LEAD_STATUS_OPTIONS.find((s) => s.value === lead.status)?.color}>
                        {LEAD_STATUS_OPTIONS.find((s) => s.value === lead.status)?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(lead.created_at)}
                      </span>
                    </div>

                    {lead.lead_type === "faq" && (
                      <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100 font-sans">
                        <div className="text-sm font-bold text-purple-900 mb-1 flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Поступил вопрос из FAQ
                        </div>
                        {lead.wishes && (
                          <div className="text-sm text-purple-800 italic">
                            «{lead.wishes}»
                          </div>
                        )}
                        <div className="text-[10px] text-purple-400 mt-2 uppercase tracking-tight">Пользователь ждет ответа по телефону или в мессенджере</div>
                      </div>
                    )}
                    {lead.lead_type === "viewing" && (
                      <div className="mt-2 p-3 bg-secondary/40 rounded-lg font-sans">
                        <div className="text-sm font-bold mb-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Запись на просмотр
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {lead.plot_location || "(локация не указана)"}
                            {lead.plot_cadastral_number ? ` • КН: ${lead.plot_cadastral_number}` : ""}
                            {typeof lead.plot_area_sotok === "number" ? ` • ${lead.plot_area_sotok} соток` : ""}
                            {typeof lead.plot_price === "number" ? ` • ${new Intl.NumberFormat("ru-RU").format(lead.plot_price)} ₽` : ""}
                          </span>
                        </div>
                        {(lead.messenger_whatsapp || lead.messenger_telegram) && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {lead.messenger_whatsapp ? "WhatsApp" : ""}
                            {lead.messenger_whatsapp && lead.messenger_telegram ? " / " : ""}
                            {lead.messenger_telegram ? "Telegram" : ""}
                          </div>
                        )}
                      </div>
                    )}
                    {lead.wishes && lead.lead_type !== "faq" && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Пожелания клиента:</p>
                        <p className="text-sm">{lead.wishes}</p>
                      </div>
                    )}
                    {lead.manager_comment && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm font-medium mb-1 text-blue-900">Заметки менеджера:</p>
                        <p className="text-sm text-blue-700">{lead.manager_comment}</p>
                      </div>
                    )}
                    {leadProposals[lead.id] && leadProposals[lead.id].length > 0 && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm font-medium mb-2 text-green-900">
                          Коммерческие предложения ({leadProposals[lead.id].length}):
                        </p>
                        <div className="space-y-1">
                          {leadProposals[lead.id].map((proposal) => (
                            <div key={proposal.id} className="text-sm text-green-700 flex items-center justify-between gap-2">
                              <button onClick={() => onViewProposal(proposal.id)} className="text-left hover:underline flex-1">
                                {proposal.title} - {proposal.commercial_proposal_plots?.length || 0} участков
                              </button>
                              <Badge className={PROPOSAL_STATUS_OPTIONS.find((s) => s.value === proposal.status)?.color}>
                                {PROPOSAL_STATUS_OPTIONS.find((s) => s.value === proposal.status)?.label}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onOpenProposalDialog(lead)}
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Создать КП
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditLead(lead)}
                      className="rounded-xl"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteLead(lead.id)}
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default LeadsTab

