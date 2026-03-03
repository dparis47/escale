'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type TypeBilan = 'france-travail' | 'cpam-ars' | 'cpam' | 'ars' | 'conseil-departemental' | 'fse'

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
    <Button variant="outline" size="sm" onClick={telecharger} disabled={enCours}>
      {enCours ? 'Génération…' : 'Exporter Excel'}
    </Button>
  )
}
