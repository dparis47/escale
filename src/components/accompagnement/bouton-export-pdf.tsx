'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useModeEdition } from '@/contexts/sauvegarde-accompagnement'

interface Props {
  id: number
  type: 'fse' | 'asid'
  nom: string
  prenom: string
}

export function BoutonExportPDFAccompagnement({ id, type, nom, prenom }: Props) {
  const [enCours, setEnCours] = useState(false)
  const modeEdition = useModeEdition()

  if (modeEdition) return null

  async function telecharger() {
    setEnCours(true)
    try {
      const res = await fetch(`/api/accompagnement/${id}/pdf`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `accompagnement-${type}-${nom.toLowerCase()}-${prenom.toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={telecharger} disabled={enCours}>
          {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Exporter PDF</TooltipContent>
    </Tooltip>
  )
}
