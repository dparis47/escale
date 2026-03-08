'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Props {
  q?: string
}

export function BoutonExportPersonnes({ q }: Props) {
  const [enCours, setEnCours] = useState(false)

  async function telecharger() {
    setEnCours(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      const qs = params.toString()
      const res = await fetch(`/api/personnes/export${qs ? `?${qs}` : ''}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = q ? 'personnes-recherche.xlsx' : 'personnes.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={telecharger}
      disabled={enCours}
      title="Exporter Excel"
      className="h-8 w-8 text-blue-700 hover:text-blue-900"
    >
      <Download className={`h-5 w-5 ${enCours ? 'animate-pulse' : ''}`} />
    </Button>
  )
}
