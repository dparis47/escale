'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useModeEdition } from '@/contexts/sauvegarde-accompagnement'

interface CvSimple { id: number; nom: string }

interface Props {
  accompagnementId: number
  cvs:              CvSimple[]
}

export function SectionCVLM({ accompagnementId, cvs: cvsInit }: Props) {
  const modeEdition = useModeEdition()

  const [cvs,       setCvs]       = useState<CvSimple[]>(cvsInit)
  const [cvEnCours, setCvEnCours] = useState(false)
  const [cvErreur,  setCvErreur]  = useState<string | null>(null)

  const cvInputRef = useRef<HTMLInputElement>(null)

  async function telechargerCv(cid: number, nom: string) {
    const res = await fetch(`/api/accompagnement/${accompagnementId}/cvs/${cid}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nom
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploaderCv(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setCvErreur(null)
    setCvEnCours(true)
    const form = new FormData()
    form.append('fichier', fichier)
    const res = await fetch(`/api/accompagnement/${accompagnementId}/cvs`, { method: 'POST', body: form })
    setCvEnCours(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setCvErreur((data as { erreur?: string }).erreur ?? "Erreur lors de l'envoi")
    } else {
      const nouveau = await res.json() as CvSimple
      setCvs((prev) => [...prev, nouveau])
    }
    if (cvInputRef.current) cvInputRef.current.value = ''
  }

  async function supprimerCv(cid: number, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    setCvEnCours(true)
    await fetch(`/api/accompagnement/${accompagnementId}/cvs/${cid}`, { method: 'DELETE' })
    setCvEnCours(false)
    setCvs((prev) => prev.filter((c) => c.id !== cid))
  }

  return (
    <div className="space-y-1">
      <input
        ref={cvInputRef}
        type="file"
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={uploaderCv}
      />
      {cvs.length === 0 && !modeEdition && (
        <p className="text-sm text-muted-foreground">Aucun CV ou LM enregistré.</p>
      )}
      {cvs.map((cv) => (
        <div key={cv.id} className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => telechargerCv(cv.id, cv.nom)} disabled={cvEnCours}>
            ↓ {cv.nom}
          </Button>
          {modeEdition && (
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => supprimerCv(cv.id, cv.nom)}
              disabled={cvEnCours}
            >
              Supprimer
            </Button>
          )}
        </div>
      ))}
      {modeEdition && (
        <Button variant="outline" size="sm" onClick={() => cvInputRef.current?.click()} disabled={cvEnCours}>
          + Joindre un CV / LM (PDF ou Word)
        </Button>
      )}
      {cvErreur && <p className="text-xs text-destructive">{cvErreur}</p>}
    </div>
  )
}
