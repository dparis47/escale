'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  annee: number
  themeFiltre: string | null
  champFiltre: string | null
  recherche: string | null
  nbVisitesMin: number | null
}

export function FiltresAnnee({ annee, themeFiltre, champFiltre, recherche, nbVisitesMin }: Props) {
  const router = useRouter()
  const [inputLocal, setInputLocal] = useState(recherche ?? '')

  const feuilles = themeFiltre ? feuillesTheme(themeFiltre) : []
  const filtresActifs = themeFiltre !== null || (recherche !== null && recherche.length >= 2) || nbVisitesMin !== null

  // Sync si le parent réinitialise
  useEffect(() => {
    setInputLocal(recherche ?? '')
  }, [recherche])

  // Debounce 500ms pour la recherche (server-side = rechargement)
  useEffect(() => {
    const timer = setTimeout(() => {
      const val = inputLocal.trim()
      if (val === (recherche ?? '')) return
      if (val.length >= 2 || val.length === 0) {
        navigateWithSearch(themeFiltre, champFiltre, val || null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [inputLocal]) // eslint-disable-line react-hooks/exhaustive-deps

  function navigateWithSearch(theme: string | null, champ: string | null, q: string | null, minVisites: number | null = nbVisitesMin) {
    const params = new URLSearchParams()
    if (annee !== new Date().getUTCFullYear()) params.set('annee', String(annee))
    if (theme) params.set('theme', theme)
    if (champ) params.set('demarche', champ)
    if (q && q.length >= 2) params.set('q', q)
    if (minVisites !== null) params.set('nbVisitesMin', String(minVisites))
    const qs = params.toString()
    router.push(`/annee${qs ? `?${qs}` : ''}`)
  }

  function handleThemeChange(val: string) {
    const newTheme = val === '__tous__' ? null : val
    navigateWithSearch(newTheme, null, recherche)
  }

  function handleChampChange(val: string) {
    const newChamp = val === '__toutes__' ? null : val
    navigateWithSearch(themeFiltre, newChamp, recherche)
  }

  function reset() {
    setInputLocal('')
    const params = new URLSearchParams()
    if (annee !== new Date().getUTCFullYear()) params.set('annee', String(annee))
    const qs = params.toString()
    router.push(`/annee${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Recherche par nom */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom…"
          value={inputLocal}
          onChange={(e) => setInputLocal(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
        {inputLocal && (
          <button
            onClick={() => { setInputLocal(''); navigateWithSearch(themeFiltre, champFiltre, null) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filtre par thème */}
      <Select value={themeFiltre ?? '__tous__'} onValueChange={handleThemeChange}>
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
        onValueChange={handleChampChange}
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
            const n = val === '' ? null : Math.max(1, parseInt(val) || 1)
            navigateWithSearch(themeFiltre, champFiltre, recherche, n)
          }}
          className="h-8 w-36 text-sm"
        />
        {nbVisitesMin !== null && (
          <button
            onClick={() => navigateWithSearch(themeFiltre, champFiltre, recherche, null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Reset */}
      {filtresActifs && (
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <X className="h-3.5 w-3.5 mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
