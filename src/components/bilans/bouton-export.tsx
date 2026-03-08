'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

type TypeBilan = 'france-travail' | 'cpam-ars' | 'cpam' | 'ars' | 'conseil-departemental' | 'fse' | 'asid'

interface Props {
  type:  TypeBilan
  annee: number
}

export function BoutonExport({ type, annee }: Props) {
  const [enCours, setEnCours] = useState(false)

  async function telecharger() {
    setEnCours(true)
    try {
      const res = await fetch(`/api/bilans/${type}/export?annee=${annee}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `bilan-${type}-${annee}.xlsx`
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
