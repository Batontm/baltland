"use client"

import type { CommercialProposalWithDetails, OrganizationSettings } from "@/lib/types"

interface ProposalPDFViewProps {
  proposal: CommercialProposalWithDetails
  settings: OrganizationSettings | null
}

export function ProposalPDFView({ proposal, settings }: ProposalPDFViewProps) {
  const plots = proposal.commercial_proposal_plots?.map((pp) => pp.plot) || []

  return (
    <div className="pdf-root">
      {/* Header */}
      <div className="pdf-header">
        <div className="pdf-header-left">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="pdf-logo" />
          )}
          <h1 className="pdf-org-name">{settings?.organization_name || "БалтикЗемля"}</h1>
          <p className="pdf-proposal-title">{proposal.title}</p>
        </div>
        <div className="pdf-header-right">
          {settings && (
            <>
              <p>{settings.phone}</p>
              <p>{settings.email}</p>
              <p className="pdf-muted">{settings.address}</p>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {proposal.description && (
        <div className="pdf-description">
          <p className="pdf-text-sm">{proposal.description}</p>
        </div>
      )}

      {/* Plots */}
      <div className="pdf-section">
        <h2 className="pdf-h2">Подобранные участки ({plots.length})</h2>

        <div className="pdf-cards">
          {plots.map((plot) => {
            const settlement = plot.location || "(поселок не указан)"
            const cadastralNumbers = [
              ...(plot.cadastral_number ? [plot.cadastral_number] : []),
              ...(plot.additional_cadastral_numbers || []),
            ]
            const uniqueCadastrals = Array.from(new Set(cadastralNumbers.filter(Boolean)))
            const isBundle = uniqueCadastrals.length > 1

            return (
              <div key={plot.id} className="pdf-card">
                <div className="pdf-card-row">
                  {/* Image */}
                  {settings?.show_image !== false && plot.image_url && (
                    <div className="pdf-image-wrap">
                      <img
                        src={plot.image_url}
                        alt={settlement}
                        className="pdf-image"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="pdf-card-body">
                    <h3 className="pdf-h3">{plot.title || settlement}</h3>
                    <p className="pdf-text-sm pdf-muted">{plot.district || "Район не указан"} • {settlement}</p>
                    {plot.description && (
                      <p className="pdf-text-sm pdf-muted pdf-pre">{plot.description}</p>
                    )}

                    <div className="pdf-text-sm">
                      <div className="pdf-muted pdf-mb-2">Кадастровые номера ({uniqueCadastrals.length})</div>
                      {settings?.show_cadastral_number !== false ? (
                        uniqueCadastrals.length > 0 ? (
                          <div className="pdf-cn-grid">
                            {uniqueCadastrals.map((cn) => (
                              <div key={cn}>{cn}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="pdf-muted">Кадастровые номера не указаны</div>
                        )
                      ) : (
                        <div className="pdf-muted">Кадастровые номера скрыты настройками</div>
                      )}
                      {isBundle && (
                        <div className="pdf-bundle-note">
                          Участок в составе лота: кадастровые номера продаются вместе.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pdf-footer">
        <p>Коммерческое предложение действительно на момент формирования</p>
        <p className="mt-2">
          Свяжитесь с нами: {settings?.phone} • {settings?.email}
        </p>
      </div>

      <style data-pdf-safe>{`
        .pdf-root {
          background: #ffffff;
          color: #000000;
          padding: 32px;
          display: block;
          font-family: Arial, Helvetica, sans-serif;
        }
        .pdf-muted {
          color: #4b5563;
        }
        .pdf-pre {
          white-space: pre-line;
        }
        .pdf-text-sm {
          font-size: 13px;
          line-height: 1.4;
        }
        .pdf-mb-2 {
          margin-bottom: 8px;
        }
        .pdf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 24px;
          gap: 24px;
        }
        .pdf-logo {
          height: 48px;
          margin-bottom: 16px;
          display: block;
        }
        .pdf-org-name {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }
        .pdf-proposal-title {
          margin-top: 8px;
          color: #4b5563;
          font-size: 14px;
        }
        .pdf-header-right {
          text-align: right;
          font-size: 12px;
          line-height: 1.4;
        }
        .pdf-description {
          margin-top: 24px;
          background: #f9fafb;
          padding: 16px;
          border-radius: 10px;
        }
        .pdf-section {
          margin-top: 24px;
        }
        .pdf-h2 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 16px;
        }
        .pdf-cards {
          display: grid;
          gap: 16px;
        }
        .pdf-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          break-inside: avoid;
        }
        .pdf-card-row {
          display: flex;
          gap: 16px;
        }
        .pdf-image-wrap {
          width: 180px;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          background: #f3f4f6;
          flex: 0 0 auto;
        }
        .pdf-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pdf-card-body {
          flex: 1 1 auto;
        }
        .pdf-h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .pdf-cn-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 24px;
          row-gap: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          line-height: 1.3;
        }
        .pdf-footer {
          margin-top: 24px;
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        .pdf-bundle-note {
          margin-top: 8px;
          color: #92400e;
          font-size: 12px;
          font-weight: 600;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}

export default ProposalPDFView
