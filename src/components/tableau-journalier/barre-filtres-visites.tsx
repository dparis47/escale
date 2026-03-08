'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ARBRE_DEMARCHES, feuillesTheme } from '@/lib/demarches'

interface Props {
  recherche: string
  onRechercheChange: (val: string) => void
  themeFiltre: string | null
  onThemeFiltreChange: (val: string | null) => void
  champFiltre: string | null
  onChampFiltreChange: (val: string | null) => void
  nbVisitesMin: number | null
  onNbVisitesMinChange: (val: number | null) => void
  totalVisites: number
  totalFiltrees: number
}

export function BarreFiltresVisites({
  recherche,
  onRechercheChange,
  themeFiltre,
  onThemeFiltreChange,
  champFiltre,
  onChampFiltreChange,
  nbVisitesMin,
  onNbVisitesMinChange,
  totalVisites,
  totalFiltrees,
}: Props) {
  const [inputLocal, setInputLocal] = useState(recherche)

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => onRechercheChange(inputLocal), 300)
    return () => clearTimeout(timer)
  }, [inputLocal, onRechercheChange])

  // Sync si le parent réinitialise
  useEffect(() => {
    setInputLocal(recherche)
  }, [recherche])

  const feuilles = themeFiltre ? feuillesTheme(themeFiltre) : []
  const filtresActifs = recherche.length >= 2 || themeFiltre !== null || nbVisitesMin !== null

  function reset() {
    setInputLocal('')
    onRechercheChange('')
    onThemeFiltreChange(null)
    onChampFiltreChange(null)
    onNbVisitesMinChange(null)
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche par nom */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom…"
            value={inputLocal}
            onChange={(e) => setInputLocal(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {inputLocal && (
            <button
              onClick={() => { setInputLocal(''); onRechercheChange('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtre par thème */}
        <Select
          value={themeFiltre ?? '__tous__'}
          onValueChange={(val) => {
            const newTheme = val === '__tous__' ? null : val
            onThemeFiltreChange(newTheme)
            onChampFiltreChange(null)
          }}
        >
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="Tous les thèmes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__tous__">Tous les thèmes</SelectItem>
            {ARBRE_DEMARCHES.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par démarche précise */}
        <Select
          value={champFiltre ?? '__toutes__'}
          onValueChange={(val) => onChampFiltreChange(val === '__toutes__' ? null : val)}
          disabled={!themeFiltre}
        >
          <SelectTrigger size="sm" className="w-60">
            <SelectValue placeholder="Toutes les démarches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__toutes__">Toutes les démarches</SelectItem>
            {feuilles.map((f) => (
              <SelectItem key={f.champ} value={f.champ}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par nombre de visites */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            placeholder="Nb visites min."
            value={nbVisitesMin ?? ''}
            onChange={(e) => {
              const val = e.target.value
              onNbVisitesMinChange(val === '' ? null : Math.max(1, parseInt(val) || 1))
            }}
            className="h-8 w-36 text-sm"
          />
          {nbVisitesMin !== null && (
            <button
              onClick={() => onNbVisitesMinChange(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Reset */}
        {filtresActifs && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Compteur filtré */}
      {filtresActifs && (
        <p className="text-sm text-muted-foreground">
          {totalFiltrees} visite{totalFiltrees > 1 ? 's' : ''} sur {totalVisites}
        </p>
      )}
    </div>
  )
}
