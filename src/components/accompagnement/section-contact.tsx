'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useModeEdition, useRegistrerSauvegarde } from '@/contexts/sauvegarde-accompagnement'

interface Props {
  personId:  number
  adresse:   string | null
  telephone: string | null
  mobile:    string | null
  email:     string | null
}

export function SectionContact({ personId, adresse, telephone, mobile, email }: Props) {
  const modeEdition = useModeEdition()
  const [vals, setVals] = useState({
    adresse:   adresse   ?? '',
    telephone: telephone ?? '',
    mobile:    mobile    ?? '',
    email:     email     ?? '',
  })

  async function sauvegarder() {
    const res = await fetch(`/api/personnes/${personId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        adresse:   vals.adresse   || null,
        telephone: vals.telephone || null,
        mobile:    vals.mobile    || null,
        email:     vals.email     || '',
      }),
    })
    if (!res.ok) throw new Error('Erreur sauvegarde contact')
  }

  useRegistrerSauvegarde('contact', sauvegarder)

  const champsSimples: Array<{ label: string; key: keyof typeof vals }> = [
    { label: 'Téléphone', key: 'telephone' },
    { label: 'Mobile',    key: 'mobile'    },
    { label: 'Email',     key: 'email'     },
  ]

  return (
    <div>
      {/* Adresse (multilignes) */}
      <div className="flex gap-2 py-0.5 text-sm">
        <span className="w-52 shrink-0 text-muted-foreground">Adresse</span>
        {modeEdition ? (
          <Textarea
            className="text-sm resize-y"
            rows={2}
            value={vals.adresse}
            onChange={(e) => setVals((prev) => ({ ...prev, adresse: e.target.value }))}
          />
        ) : (
          <span className="whitespace-pre-line">{vals.adresse || '—'}</span>
        )}
      </div>
      {champsSimples.map(({ label, key }) => (
        <div key={key} className="flex items-center gap-2 py-0.5 text-sm">
          <span className="w-52 shrink-0 text-muted-foreground">{label}</span>
          {modeEdition ? (
            <Input
              className="h-7 text-sm"
              value={vals[key]}
              onChange={(e) => setVals((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          ) : (
            <span>{vals[key] || '—'}</span>
          )}
        </div>
      ))}
    </div>
  )
}
