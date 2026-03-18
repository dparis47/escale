'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface Props {
  annee: number
}

export function BoutonExportPartenaires({ annee }: Props) {
  const [enCours, setEnCours] = useState(false)

  async function telecharger() {
    setEnCours(true)
    try {
      const res = await fetch(`/api/partenaires/export?annee=${annee}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `partenaires-${annee}.xlsx`
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
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      <Upload className={`h-5 w-5 ${enCours ? 'animate-pulse' : ''}`} />
    </Button>
  )
}
