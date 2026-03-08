'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  id: number
  nom: string
  prenom: string
}

export function BoutonExportPDF({ id, nom, prenom }: Props) {
  const [enCours, setEnCours] = useState(false)

  async function telecharger() {
    setEnCours(true)
    try {
      const res = await fetch(`/api/personnes/${id}/pdf`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `dossier-${nom.toLowerCase()}-${prenom.toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={telecharger} disabled={enCours}>
      {enCours ? 'Génération…' : 'Exporter PDF'}
    </Button>
  )
}
