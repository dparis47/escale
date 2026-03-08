'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface Props {
  annee: number
  mois?: string
  themeFiltre: string | null
  champFiltre: string | null
  recherche: string | null
  showImport?: boolean
}

export function BoutonsImportExportVisites({ annee, mois, themeFiltre, champFiltre, recherche, showImport = true }: Props) {
  const [exportEnCours, setExportEnCours] = useState(false)

  async function handleExport() {
    setExportEnCours(true)
    try {
      const params = new URLSearchParams()
      params.set('annee', String(annee))
      if (mois) params.set('mois', mois)
      if (themeFiltre) params.set('theme', themeFiltre)
      if (champFiltre) params.set('demarche', champFiltre)
      if (recherche && recherche.length >= 2) params.set('q', recherche)
      const res = await fetch(`/api/visites/export?${params.toString()}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visites-${mois ?? annee}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportEnCours(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleExport}
            disabled={exportEnCours}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{exportEnCours ? 'Export en cours…' : 'Exporter Excel'}</TooltipContent>
      </Tooltip>
      {showImport && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/import/visites">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-600"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Importer Excel</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
